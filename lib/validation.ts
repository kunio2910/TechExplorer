import { Product, mediaRoles } from "./types";
export function validateProduct(value: unknown): Product {
  const p = value as Product;
  if (
    !p ||
    typeof p !== "object" ||
    !p.id ||
    typeof p.id !== "string" ||
    !p.name ||
    typeof p.name !== "string" ||
    !p.brand ||
    typeof p.brand !== "string" ||
    p.category !== "Mainboard" ||
    typeof p.description !== "string" ||
    !["draft", "published"].includes(p.status) ||
    typeof p.slug !== "string" ||
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(p.slug)
  )
    throw Error("Invalid product fields or slug.");
  if (
    !p.spec ||
    typeof p.spec !== "object" ||
    Array.isArray(p.spec) ||
    Object.values(p.spec).some((v) => typeof v !== "string")
  )
    throw Error("Specifications must contain text values.");
  if (
    !p.media ||
    Object.entries(p.media).some(
      ([k, v]) =>
        !mediaRoles.includes(k as (typeof mediaRoles)[number]) ||
        typeof v !== "string" ||
        (!v.startsWith("/media/") &&
          !v.startsWith("/uploads/") &&
          !v.startsWith("/api/media/") &&
          !v.startsWith("https://")),
    )
  )
    throw Error("Invalid media role or URL.");
  if (
    !Array.isArray(p.hotspots) ||
    p.hotspots.some(
      (h) =>
        !h.id ||
        typeof h.title !== "string" ||
        typeof h.subtitle !== "string" ||
        typeof h.description !== "string" ||
        typeof h.type !== "string" ||
        typeof h.view !== "string" ||
        !Number.isFinite(h.x) ||
        !Number.isFinite(h.y) ||
        h.x < 0 ||
        h.x > 100 ||
        h.y < 0 ||
        h.y > 100,
    )
  )
    throw Error("Invalid hotspot coordinates.");
  if (new Set(p.hotspots.map((h) => h.id)).size !== p.hotspots.length)
    throw Error("Hotspot IDs must be unique.");
  if (
    p.status === "published" &&
    (!p.media.top ||
      !p.spec.Socket ||
      !p.spec["Memory type"] ||
      p.hotspots.length < 5)
  )
    throw Error(
      "Publish requires a top image, socket, memory type and at least 5 hotspots.",
    );
  if (
    p.sourceUrl &&
    (typeof p.sourceUrl !== "string" || !p.sourceUrl.startsWith("https://"))
  )
    throw Error("Source URL must use HTTPS.");
  return p;
}
