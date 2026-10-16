import { chromium } from "@playwright/test";
import { officialUrl } from "../functions/extract.js";

export async function renderProduct(url) {
  const original = officialUrl(url);
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({ serviceWorkers: "block" });
    await context.route("**/*", async (route) => {
      const request = route.request();
      try {
        const target = new URL(request.url());
        if (request.isNavigationRequest()) {
          if (officialUrl(target.href).brand !== original.brand)
            return route.abort();
        } else if (
          target.protocol !== "https:" ||
          !/\.[a-z]{2,}$/i.test(target.hostname) ||
          /(?:^|\.)(?:localhost|local|internal)$/i.test(target.hostname)
        )
          return route.abort();
        if (["image", "media", "font"].includes(request.resourceType()))
          return route.abort();
        return route.continue();
      } catch {
        return route.abort();
      }
    });
    const page = await context.newPage();
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 20000 });
    await page
      .locator("table, .spec-item, .specification-item, dt")
      .first()
      .waitFor({ timeout: 5000 })
      .catch(() => {});
    const html = await page.content();
    if (Buffer.byteLength(html) > 3_000_000)
      throw new Error("Trang sau khi render vượt quá 3 MB.");
    return { html, url: page.url() };
  } finally {
    await browser.close();
  }
}
