import { writeFile } from "node:fs/promises";
import { fetchProduct } from "./import-server.mjs";

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
  const result = await fetchProduct(option("--url"), type);
  // Do not overwrite an existing export accidentally.
  await writeFile(output, JSON.stringify(result, null, 2), { flag: "wx" });
  console.log(
    `Đã tạo ${output}: ${result.fields.length} trường, ${result.images.length} ảnh. Kiểm tra trước khi nhập vào quản trị.`,
  );
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
