import type { Product, CatalogComponent } from "./types";

export type CatalogBackup = {
  products: Product[];
  components: CatalogComponent[];
};
const object = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);
const strings = (v: unknown) =>
  object(v) && Object.values(v).every((x) => typeof x === "string");
const text = (v: Record<string, unknown>, keys: string[]) =>
  keys.every((k) => typeof v[k] === "string");
function shared(v: unknown): v is Record<string, unknown> {
  return (
    object(v) &&
    text(v, ["id", "name", "brand", "description"]) &&
    !!v.id &&
    !!v.name &&
    ["draft", "published"].includes(String(v.status)) &&
    strings(v.spec) &&
    ["updatedAt", "updatedBy", "deletedAt"].every(
      (k) => v[k] === undefined || typeof v[k] === "string",
    ) &&
    (!v.deletedAt || v.status === "draft") &&
    (v.history === undefined ||
      (Array.isArray(v.history) &&
        v.history.length <= 20 &&
        v.history.every(
          (h) => object(h) && text(h, ["at", "by", "action"]),
        ))) &&
    (v.gallery === undefined ||
      (Array.isArray(v.gallery) &&
        v.gallery.every((x) => typeof x === "string")))
  );
}
export function parseBackup(input: unknown): CatalogBackup {
  if (
    !object(input) ||
    !Array.isArray(input.products) ||
    !Array.isArray(input.components)
  )
    throw new Error("File phải chứa danh sách products và components.");
  if (input.products.length + input.components.length > 450)
    throw new Error("Mỗi lần khôi phục tối đa 450 sản phẩm.");
  for (const p of input.products) {
    if (
      !shared(p) ||
      !text(p, ["slug", "category"]) ||
      !p.slug ||
      !strings(p.media) ||
      !Array.isArray(p.hotspots) ||
      !Array.isArray(p.components) ||
      !p.hotspots.every(
        (h) =>
          object(h) &&
          text(h, ["id", "type", "view", "title", "subtitle", "description"]) &&
          typeof h.x === "number" &&
          typeof h.y === "number" &&
          h.x >= 0 &&
          h.x <= 100 &&
          h.y >= 0 &&
          h.y <= 100,
      ) ||
      !p.components.every(
        (c) =>
          object(c) &&
          text(c, ["id", "category", "name", "model", "notes"]) &&
          ["compatible", "warning", "incompatible"].includes(
            String(c.compatibility),
          ),
      )
    )
      throw new Error("Thông tin mainboard trong file không hợp lệ.");
  }
  for (const c of input.components) {
    if (
      !shared(c) ||
      !text(c, ["model", "category", "notes"]) ||
      !["CPU", "RAM", "SSD", "GPU", "PSU"].includes(String(c.type)) ||
      !["compatible", "warning", "incompatible"].includes(
        String(c.compatibility),
      ) ||
      (c.imageUrl !== undefined && typeof c.imageUrl !== "string")
    )
      throw new Error("Thông tin linh kiện trong file không hợp lệ.");
  }
  for (const list of [input.products, input.components]) {
    const ids = list.map((x) => x.id);
    if (new Set(ids).size !== ids.length || ids.some((id) => id.includes("/")))
      throw new Error("ID bị trùng hoặc không hợp lệ.");
  }
  if (new Set(input.products.map((p) => p.slug)).size !== input.products.length)
    throw new Error("Slug mainboard bị trùng trong file.");
  return input as CatalogBackup;
}
