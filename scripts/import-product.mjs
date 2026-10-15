import { writeFile } from "node:fs/promises";
import { officialUrl, extractProduct } from "../functions/extract.js";

const args = process.argv.slice(2);
const option = (name) => args[args.indexOf(name) + 1];
async function main() {
  if (!args.includes("--url") || !args.includes("--type"))
    throw new Error(
      'Cách dùng: npm run import-product -- --url "https://..." --type RAM --out product.json',
    );
  const type = option("--type");
  if (!["Mainboard", "CPU", "RAM", "SSD", "GPU", "PSU"].includes(type))
    throw new Error("--type phải là Mainboard, CPU, RAM, SSD, GPU hoặc PSU.");
  const output = args.includes("--out")
    ? option("--out")
    : "product-import.json";
  if (!output || !output.endsWith(".json"))
    throw new Error("--out phải là đường dẫn file .json.");
  let { url } = officialUrl(option("--url"));
  const signal = AbortSignal.timeout(25000);
  for (let redirects = 0; redirects < 5; redirects++) {
    const response = await fetch(url, {
      redirect: "manual",
      signal,
      headers: {
        "User-Agent": "TechExplorerProductImporter/1.0",
        Accept: "text/html",
      },
    });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("location");
      await response.body?.cancel();
      if (!location) throw new Error("Nguồn chuyển hướng thiếu địa chỉ.");
      url = officialUrl(new URL(location, url).href).url;
      continue;
    }
    if (
      !response.ok ||
      !response.headers.get("content-type")?.includes("text/html")
    ) {
      await response.body?.cancel();
      throw new Error(
        `Nguồn không trả HTML hợp lệ (HTTP ${response.status}). Trang có thể chặn truy cập tự động.`,
      );
    }
    const reader = response.body.getReader();
    const chunks = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 3_000_000) {
        await reader.cancel();
        throw new Error("Trang vượt quá 3 MB.");
      }
      chunks.push(Buffer.from(value));
    }
    const result = extractProduct(
      Buffer.concat(chunks).toString("utf8"),
      url.href,
      type,
    );
    // Do not overwrite an existing export accidentally.
    await writeFile(output, JSON.stringify(result, null, 2), { flag: "wx" });
    console.log(
      `Đã tạo ${output}: ${result.fields.length} trường, ${result.images.length} ảnh. Kiểm tra trước khi nhập vào quản trị.`,
    );
    return;
  }
  throw new Error("Nguồn chuyển hướng quá nhiều lần.");
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
