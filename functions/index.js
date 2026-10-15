import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import { officialUrl, extractProduct } from "./extract.js";
initializeApp();
export const importProduct = onCall(
  {
    region: "asia-southeast1",
    timeoutSeconds: 60,
    memory: "256MiB",
    maxInstances: 2,
    cors: ["https://kunio2910.github.io", /^http:\/\/localhost(:\d+)?$/],
  },
  async (request) => {
    if (!request.auth)
      throw new HttpsError("unauthenticated", "Hãy đăng nhập quản trị.");
    const db = getFirestore();
    if (
      request.auth.uid !== "n1tjRh8G6SSr3rSj3mQmV0Mxw8k2" &&
      !(await db.doc(`admins/${request.auth.uid}`).get()).exists
    )
      throw new HttpsError(
        "permission-denied",
        "Tài khoản không có quyền quản trị.",
      );
    const rate = db.doc(`importLimits/${request.auth.uid}`);
    await db.runTransaction(async (tx) => {
      const previous = (await tx.get(rate)).data();
      const now = Date.now();
      if (previous?.at && now - previous.at < 10000)
        throw new HttpsError(
          "resource-exhausted",
          "Vui lòng chờ 10 giây giữa các lần lấy thông tin.",
        );
      tx.set(rate, { at: now });
    });
    try {
      let { url } = officialUrl(String(request.data?.url ?? ""));
      const type = request.data?.type;
      if (!["Mainboard", "CPU", "RAM", "SSD", "GPU", "PSU"].includes(type))
        throw new Error("Loại linh kiện không hợp lệ.");
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 25000);
      try {
        for (let redirects = 0; redirects < 5; redirects++) {
          const response = await fetch(url, {
            redirect: "manual",
            signal: controller.signal,
            headers: {
              "User-Agent": "TechExplorerProductImporter/1.0",
              Accept: "text/html",
            },
          });
          if ([301, 302, 303, 307, 308].includes(response.status)) {
            url = officialUrl(
              new URL(response.headers.get("location") || "", url).href,
            ).url;
            await response.body?.cancel();
            continue;
          }
          if (
            !response.ok ||
            !response.headers.get("content-type")?.includes("text/html")
          )
            throw new Error(
              "Nguồn không trả về trang sản phẩm HTML. Trang có thể chặn truy cập tự động.",
            );
          const reader = response.body.getReader();
          const chunks = [];
          let size = 0;
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            size += value.length;
            if (size > 3_000_000) {
              await reader.cancel();
              throw new Error("Trang quá lớn để xử lý.");
            }
            chunks.push(Buffer.from(value));
          }
          return extractProduct(
            Buffer.concat(chunks).toString("utf8"),
            url.href,
            type,
          );
        }
        throw new Error("Nguồn chuyển hướng quá nhiều lần.");
      } finally {
        clearTimeout(timer);
      }
    } catch (error) {
      throw new HttpsError(
        "failed-precondition",
        error.name === "AbortError"
          ? "Nguồn phản hồi quá chậm. Hãy thử lại."
          : error.message,
      );
    }
  },
);
