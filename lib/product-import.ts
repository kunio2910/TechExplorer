export type ImportPreview = {
  sourceUrl: string;
  fetchedAt: string;
  fields: { key: string; value: string }[];
  images: string[];
  missing: string[];
  warnings: string[];
};
function csvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [],
    value = "",
    quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (quoted && text[i + 1] === '"') {
        value += '"';
        i++;
      } else if (quoted || !value) quoted = !quoted;
      else throw new Error("Dấu nháy CSV không hợp lệ.");
    } else if (!quoted && (c === "," || c === "\n" || c === "\r")) {
      row.push(value);
      value = "";
      if (c !== ",") {
        if (row.some((v) => v.trim())) rows.push(row);
        row = [];
        if (c === "\r" && text[i + 1] === "\n") i++;
      }
    } else value += c;
  }
  if (quoted) throw new Error("CSV thiếu dấu nháy đóng.");
  row.push(value);
  if (row.some((v) => v.trim())) rows.push(row);
  return rows;
}
function safeImage(value: unknown): value is string {
  if (typeof value !== "string") return false;
  if (/^\/(?!\/)/.test(value)) return true;
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}
export function parseProductFile(
  text: string,
  filename: string,
  type: string,
): ImportPreview {
  if (text.length > 2_000_000) throw new Error("File tối đa 2 MB.");
  text = text.replace(/^\uFEFF/, "");
  let data: Record<string, unknown>;
  if (/\.csv$/i.test(filename)) {
    const rows = csvRows(text);
    if (rows.length !== 2)
      throw new Error(
        "CSV cần một dòng tiêu đề và một dòng sản phẩm. Nhập từng sản phẩm để xem trước.",
      );
    const headers = rows[0].map((v) => v.trim());
    if (
      new Set(headers).size !== headers.length ||
      headers.length !== rows[1].length
    )
      throw new Error("CSV có cột trùng hoặc số cột không khớp.");
    data = Object.fromEntries(headers.map((h, i) => [h, rows[1][i]]));
  } else if (/\.json$/i.test(filename)) {
    data = JSON.parse(text);
  } else throw new Error("Chọn file .json hoặc .csv.");
  if (!data || typeof data !== "object" || Array.isArray(data))
    throw new Error("JSON phải chứa một sản phẩm.");
  if (data.type && data.type !== type)
    throw new Error(
      `File thuộc loại ${String(data.type)}. Hãy chọn đúng tab quản trị.`,
    );
  const fields = new Map<string, string>();
  const add = (key: string, value: unknown) => {
    if (typeof value !== "string" && typeof value !== "number") return;
    if (
      !["name", "brand", "model", "description"].includes(key) &&
      !/^spec\.[\p{L}\p{N} ._()/+-]{1,80}$/u.test(key)
    )
      return;
    if (["__proto__", "constructor", "prototype"].includes(key.slice(5)))
      return;
    const cleaned = String(value).trim();
    if (cleaned) fields.set(key, cleaned.slice(0, 5000));
  };
  for (const [key, value] of Object.entries(data)) add(key, value);
  const specs = data.spec ?? data.specs;
  if (specs && typeof specs === "object" && !Array.isArray(specs))
    for (const [key, value] of Object.entries(specs)) add(`spec.${key}`, value);
  if (Array.isArray(data.fields))
    for (const field of data.fields) {
      if (field && typeof field.key === "string") add(field.key, field.value);
    }
  const rawImages = [
    ...(Array.isArray(data.images) ? data.images : []),
    ...(Array.isArray(data.gallery) ? data.gallery : []),
    data.imageUrl,
    ...(typeof data.images === "string" ? data.images.split("|") : []),
  ];
  const images = [...new Set(rawImages.filter(safeImage))].slice(0, 20);
  if (!fields.size && !images.length)
    throw new Error("File không có trường sản phẩm hoặc ảnh hợp lệ.");
  let sourceUrl = "";
  if (typeof data.sourceUrl === "string") {
    try {
      if (new URL(data.sourceUrl).protocol === "https:")
        sourceUrl = data.sourceUrl;
    } catch {}
  }
  const fetchedAt =
    typeof data.fetchedAt === "string" &&
    Number.isFinite(Date.parse(data.fetchedAt))
      ? new Date(data.fetchedAt).toISOString()
      : new Date().toISOString();
  return {
    sourceUrl,
    fetchedAt,
    fields: [...fields].map(([key, value]) => ({ key, value })),
    images,
    missing: [],
    warnings: [
      "Kiểm tra thông số và nguồn trước khi lưu. File chỉ cập nhật bản nháp sản phẩm đang chọn.",
    ],
  };
}
