const { chromium } = require("@playwright/test");
const assert = require("node:assert/strict");
(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.PLAYWRIGHT_BROWSER_EXECUTABLE,
  });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1050 },
  });
  const url =
    process.env.PAGES_TEST_URL ?? "http://127.0.0.1:4173/TechExplorer/";
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const failures = [];
  page.on("response", (r) => {
    if (r.status() >= 400) failures.push(r.url());
  });
  await page.goto(url);
  await page
    .getByRole("heading", { name: "ASUS ROG STRIX B850-F GAMING WIFI" })
    .waitFor();
  assert.equal(await page.locator(".hotspot").count(), 5);
  await page.locator(".board-image").evaluate(async (img) => {
    if (!img.complete)
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });
    if (img.naturalWidth === 0) throw Error("Image missing");
  });
  await page
    .getByRole("button", { name: "Explore CPU Socket", exact: true })
    .click();
  await page
    .getByRole("heading", { name: "CPU Socket", exact: true })
    .waitFor();
  await page
    .getByRole("button", { name: "Compatibility", exact: true })
    .click();
  await page.locator(".compatibility select").first().selectOption("AM4");
  assert.ok(
    await page.getByText("× Not compatible", { exact: true }).isVisible(),
  );
  await page.getByRole("button", { name: "Overview", exact: true }).click();
  await page.screenshot({ path: "test-results/pages.png", fullPage: true });
  await page
    .getByRole("button", {
      name: "ASUS ROG STRIX B850-F GAMING WIFI ASUS · AM5",
    })
    .click();
  assert.ok(page.url().includes("/TechExplorer/explore/mainboard/"));
  await page.reload();
  await page
    .getByRole("heading", { name: "ASUS ROG STRIX B850-F GAMING WIFI" })
    .waitFor();
  await page.getByRole("link", { name: "Admin", exact: false }).click();
  await page.getByRole("heading", { name: "Đăng nhập quản trị" }).waitFor();
  await page
    .getByText("Đăng nhập bằng tài khoản Firebase", { exact: false })
    .waitFor();
  await page.getByRole("link", { name: "← Về trang Explorer" }).click();
  await page
    .getByRole("heading", { name: "ASUS ROG STRIX B850-F GAMING WIFI" })
    .waitFor();
  assert.deepEqual(errors, []);
  assert.deepEqual(failures, []);
  await browser.close();
  console.log(
    "Pages smoke passed: JS/CSS/image loading, hotspots, compatibility, nested route reload and Firebase admin login screen.",
  );
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
