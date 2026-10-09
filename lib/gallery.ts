import type { CatalogComponent, Product } from "./types";

function uniqueUrls(urls: Array<string | undefined>) {
  return [...new Set(urls.map((url) => url?.trim()).filter(Boolean))] as string[];
}

export function productGallery(product: Pick<Product, "media" | "gallery">) {
  return uniqueUrls([
    product.media.top,
    product.media.main,
    ...(product.gallery ?? []),
  ]);
}

export function componentGallery(
  component: Pick<CatalogComponent, "imageUrl" | "gallery">,
) {
  return uniqueUrls([component.imageUrl, ...(component.gallery ?? [])]);
}
