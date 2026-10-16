import { createServer } from "node:http";
import { pathToFileURL } from "node:url";
import { officialUrl, extractProduct } from "../functions/extract.js";
import {
  configuredCandidates,
  specificationLinks,
} from "./vendor-profiles.mjs";
import { renderProduct } from "./browser-extract.mjs";

const HOST = "127.0.0.1";
const PORT = Number(
  process.env.TECH_EXPLORER_IMPORT_PORT || process.env.PORT || 8787,
);
const MAX_REQUEST_BYTES = 32_000;
const MAX_HTML_BYTES = 3_000_000;
const FETCH_TIMEOUT_MS = 25_000;
const TYPES = new Set(["Mainboard", "CPU", "RAM", "SSD", "GPU", "PSU"]);
const ALLOWED_ORIGINS = new Set([
  "https://kunio2910.github.io",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:4173",
  "http://127.0.0.1:4173",
]);

function writeJson(response, status, value, origin) {
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    response.setHeader("Access-Control-Allow-Origin", origin);
    response.setHeader("Vary", "Origin");
  }
  response.setHeader("Access-Control-Allow-Private-Network", "true");
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.writeHead(status);
  response.end(JSON.stringify(value));
}

function cors(response, origin) {
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    response.setHeader("Access-Control-Allow-Origin", origin);
    response.setHeader("Vary", "Origin");
  }
  response.setHeader("Access-Control-Allow-Private-Network", "true");
  response.setHeader("Access-Control-Allow-Headers", "content-type");
  response.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
}

async function readRequest(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > MAX_REQUEST_BYTES)
      throw new Error("Dữ liệu yêu cầu vượt quá 32 KB.");
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new Error("Nội dung yêu cầu phải là JSON hợp lệ.");
  }
}

async function readHtml(response) {
  const contentType = response.headers.get("content-type") || "";
  if (!response.ok || !contentType.toLowerCase().includes("text/html")) {
    await response.body?.cancel();
    throw new Error(
      `Nguồn không trả HTML hợp lệ (HTTP ${response.status}). Trang có thể chặn truy cập tự động.`,
    );
  }
  const reader = response.body?.getReader();
  if (!reader) throw new Error("Không đọc được nội dung HTML từ nguồn.");
  const chunks = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_HTML_BYTES) {
      await reader.cancel();
      throw new Error("Trang vượt quá 3 MB.");
    }
    chunks.push(Buffer.from(value));
  }
  return Buffer.concat(chunks).toString("utf8");
}

export async function fetchProduct(urlInput, type, options = {}) {
  const original = officialUrl(urlInput).url;
  if (!TYPES.has(type)) throw new Error("Loại linh kiện không hợp lệ.");
  const candidates = sourceCandidates(original);
  let firstResult = null;
  let bestResult = null;
  let bestSpecCount = -1;
  const candidateImages = [];
  const mergedFields = new Map();
  const attempts = [];
  const deadline = Date.now() + 65000;
  let lastError;
  for (const candidate of candidates) {
    if (attempts.length >= 7 || Date.now() > deadline) break;
    let url = new URL(candidate);
    const signal = AbortSignal.timeout(
      candidate === original.href
        ? FETCH_TIMEOUT_MS
        : Math.min(12_000, FETCH_TIMEOUT_MS),
    );
    try {
      let html = "";
      for (let redirects = 0; redirects < 5; redirects++) {
        const response = await fetch(url, {
          redirect: "manual",
          signal,
          headers: {
            "User-Agent": "TechExplorerLocalImporter/1.0",
            Accept: "text/html,application/xhtml+xml",
          },
        });
        if ([301, 302, 303, 307, 308].includes(response.status)) {
          const location = response.headers.get("location");
          await response.body?.cancel();
          if (!location) throw new Error("Nguồn chuyển hướng thiếu địa chỉ.");
          url = officialUrl(new URL(location, url).href).url;
          continue;
        }
        html = await readHtml(response);
        break;
      }
      if (!html) throw new Error("Nguồn chuyển hướng quá nhiều lần.");
      const result = extractProduct(html, url.href, type);
      attempts.push({ url: url.href, method: "html", status: "ok" });
      const discovered = specificationLinks(html, url.href).filter(
        (link) => !candidates.includes(link),
      );
      candidates.splice(candidates.indexOf(candidate) + 1, 0, ...discovered);
      for (const field of result.fields)
        if (!mergedFields.has(field.key)) mergedFields.set(field.key, field);
      result.fields = [...mergedFields.values()];
      result.missing = result.missing.filter(
        (key) => !mergedFields.has(`spec.${key}`),
      );
      if (!firstResult) firstResult = result;
      candidateImages.push(...result.images);
      const specCount = result.fields.filter((field) =>
        field.key.startsWith("spec."),
      ).length;
      if (specCount > bestSpecCount) {
        bestResult = result;
        bestSpecCount = specCount;
      }
      const enoughSpecs = result.missing.length === 0;
      if (enoughSpecs) {
        result.images = [...new Set(candidateImages)].slice(0, 12);
        if (url.href !== original.href) {
          result.sourceUrl = original.href;
          const switchedHost = url.hostname !== original.hostname;
          result.warnings = [
            ...(result.warnings ?? []),
            switchedHost
              ? `Đã bổ sung từ trang chính hãng ${url.hostname}.`
              : "Đã tự tìm và đọc trang thông số của sản phẩm.",
          ];
        }
        return {
          ...result,
          attempts,
          completeness: {
            found: specCount,
            total: specCount + result.missing.length,
          },
        };
      }
    } catch (error) {
      lastError = error;
      attempts.push({
        url: candidate,
        method: "html",
        status: "error",
        message: error.message,
      });
    }
  }
  if (options.browser !== false && Date.now() < deadline) {
    const target =
      attempts.find((item) =>
        /specification|techspec|\/spec\b|#Specification/i.test(item.url),
      )?.url ?? original.href;
    try {
      const rendered = await renderProduct(target);
      const result = extractProduct(rendered.html, rendered.url, type);
      for (const field of result.fields)
        if (!mergedFields.has(field.key)) mergedFields.set(field.key, field);
      candidateImages.push(...result.images);
      if (!bestResult) bestResult = result;
      attempts.push({ url: rendered.url, method: "browser", status: "ok" });
    } catch (error) {
      attempts.push({
        url: target,
        method: "browser",
        status: "error",
        message: error.message,
      });
    }
  }
  if (bestResult ?? firstResult) {
    const result = bestResult ?? firstResult;
    result.fields = [...mergedFields.values()];
    result.missing = result.missing.filter(
      (key) => !mergedFields.has(`spec.${key}`),
    );
    result.attempts = attempts;
    const found = result.fields.filter((field) =>
      field.key.startsWith("spec."),
    ).length;
    result.completeness = { found, total: found + result.missing.length };
    result.images = [...new Set(candidateImages)].slice(0, 12);
    if (result.sourceUrl !== original.href) result.sourceUrl = original.href;
    result.warnings = [
      ...(result.warnings ?? []),
      ...(result.missing.length
        ? [
            "Một số thông số chưa được nguồn công bố hoặc chưa đọc được. Bạn có thể bổ sung bằng tab Dán thông số.",
          ]
        : []),
      ...(attempts.some(
        (item) => item.method === "browser" && item.status === "error",
      )
        ? [
            "Trình duyệt dự phòng không chạy được. Nếu chưa cài Chromium, chạy npx playwright install chromium trên máy chạy dịch vụ.",
          ]
        : []),
    ];
    return result;
  }
  throw lastError ?? new Error("Không thể đọc nguồn sản phẩm.");
}

export function sourceCandidates(original) {
  return configuredCandidates(original);
}

export function createImporterServer() {
  return createServer(async (request, response) => {
    const origin = request.headers.origin;
    cors(response, origin);
    if (request.method === "OPTIONS") {
      response.writeHead(204);
      response.end();
      return;
    }
    const path = new URL(request.url || "/", `http://${HOST}:${PORT}`).pathname;
    if (request.method === "GET" && path === "/health") {
      writeJson(
        response,
        200,
        { ok: true, service: "techexplorer-importer", version: 1 },
        origin,
      );
      return;
    }
    if (request.method !== "POST" || path !== "/extract") {
      writeJson(response, 404, { error: "Không tìm thấy endpoint." }, origin);
      return;
    }
    try {
      const body = await readRequest(request);
      if (!body || typeof body !== "object" || Array.isArray(body))
        throw new Error("Yêu cầu không hợp lệ.");
      const url = typeof body.url === "string" ? body.url.trim() : "";
      const type = typeof body.type === "string" ? body.type : "";
      if (!url) throw new Error("Hãy nhập URL trang sản phẩm.");
      if (!TYPES.has(type)) throw new Error("Loại linh kiện không hợp lệ.");
      const result = await fetchProduct(url, type);
      writeJson(response, 200, result, origin);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Không thể đọc nguồn sản phẩm.";
      writeJson(response, 400, { error: message }, origin);
    }
  });
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const server = createImporterServer();
  server.on("error", (error) => {
    if (error?.code === "EADDRINUSE") {
      console.error(
        `Cổng ${HOST}:${PORT} đang được sử dụng. Dịch vụ có thể đã chạy ở cửa sổ Terminal khác; hãy kiểm tra http://${HOST}:${PORT}/health trước khi khởi động lại.`,
      );
    } else {
      console.error(
        "Không thể khởi động dịch vụ nhập dữ liệu:",
        error?.message ?? error,
      );
    }
    process.exitCode = 1;
  });
  server.listen(PORT, HOST, () => {
    console.log(
      `TechExplorer local importer listening on http://${HOST}:${PORT}`,
    );
    console.log("Giữ cửa sổ này mở trong khi nhập URL tại trang quản trị.");
  });
  const close = () => server.close(() => process.exit(0));
  process.once("SIGINT", close);
  process.once("SIGTERM", close);
}
