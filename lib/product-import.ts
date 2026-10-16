export type ImportPreview = {
  sourceUrl: string;
  fetchedAt: string;
  fields: { key: string; value: string }[];
  images: string[];
  missing: string[];
  warnings: string[];
  detectedBrand?: string;
  detectedLine?: string;
  parser?: string;
  completeness?: { found: number; total: number };
  attempts?: {
    url: string;
    method: string;
    status: string;
    message?: string;
  }[];
};

const pastedFields: Record<string, string> = {
  "tên sản phẩm": "name",
  "product name": "name",
  name: "name",
  "thương hiệu": "brand",
  brand: "brand",
  model: "model",
  socket: "spec.Socket",
  "socket cpu": "spec.Socket",
  "cpu socket": "spec.Socket",
  chipset: "spec.Chipset",
  "loại ram": "spec.Memory type",
  "memory type": "spec.Memory type",
  memory: "spec.Memory type",
  "ram tối đa": "spec.Max memory",
  "max memory": "spec.Max memory",
  "maximum memory capacity": "spec.Max memory",
  "memory slots": "spec.Memory slots",
  "dimm slots": "spec.Memory slots",
  "m.2 slots": "spec.M.2 slots",
  sata: "spec.SATA",
  "sata ports": "spec.SATA",
  "loại ssd": "spec.SSD type",
  "ssd type": "spec.SSD type",
  "form factor": "spec.Form factor",
  capacity: "spec.Capacity",
  "dung lượng": "spec.Capacity",
  speed: "spec.Speed",
  interface: "spec.Interface",
  "read speed": "spec.Read speed",
  "write speed": "spec.Write speed",
  cores: "spec.Cores",
  threads: "spec.Threads",
  "boost clock": "spec.Boost clock",
  tdp: "spec.TDP",
  vram: "spec.VRAM",
  wattage: "spec.Wattage",
  efficiency: "spec.Efficiency",
  modular: "spec.Modular",
  modules: "spec.Modules",
  "recommended psu": "spec.Recommended PSU",
};

export function parsePastedSpecs(text: string, type: string): ImportPreview {
  if (text.length > 100000) throw new Error("Nội dung tối đa 100.000 ký tự.");
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const fields = new Map<string, string>();
  const unknown: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const parts = lines[i].split(/\t+|\s*\|\s*|\s*[:：]\s*/, 2);
    const key = pastedFields[parts[0].toLowerCase()];
    if (key) {
      const value =
        parts[1] ||
        (lines[i + 1] && !pastedFields[lines[i + 1].toLowerCase()]
          ? lines[++i]
          : "");
      if (value) fields.set(key, value);
    } else unknown.push(lines[i]);
  }
  if (!fields.size)
    throw new Error(
      "Chưa nhận diện được trường. Dùng mỗi dòng theo dạng Socket: AM5 hoặc Loại RAM: DDR5.",
    );
  const result = parseProductFile(
    JSON.stringify({
      type,
      fields: [...fields].map(([key, value]) => ({ key, value })),
    }),
    "paste.json",
    type,
  );
  result.parser = "pasted-specs";
  result.warnings = unknown.length
    ? [
        `Có ${unknown.length} dòng chưa ánh xạ. Hãy đối chiếu và bổ sung thủ công.`,
      ]
    : [];
  return result;
}
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
