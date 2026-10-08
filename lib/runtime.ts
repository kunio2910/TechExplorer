export const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
export function assetUrl(url: string | undefined) {
  return url?.startsWith("/") ? basePath + url : url;
}
