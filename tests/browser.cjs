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
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("http://localhost:3000");
  await page
    .getByRole("heading", { name: "Khám phá công nghệ", exact: true })
    .waitFor();
  assert.equal(await page.locator(".home-hero-image").count(), 1);
  await page.getByRole("button", { name: "Components", exact: true }).click();
  await page.getByRole("heading", { name: "Explore Mainboard" }).waitFor();
  await page
    .getByRole("button", { name: "Open ASUS ROG STRIX B850-F GAMING WIFI" })
    .first()
    .click();
  await page
    .getByRole("heading", { name: "ASUS ROG STRIX B850-F GAMING WIFI" })
    .waitFor();
  assert.equal(await page.locator(".hotspot").count(), 5);
  await page.screenshot({ path: "test-results/overview.png", fullPage: true });
  await page
    .getByRole("button", { name: "Explore CPU Socket", exact: true })
    .click();
  await page
    .getByRole("heading", { name: "CPU Socket", exact: true })
    .waitFor();
  await page.getByRole("button", { name: "Close component detail" }).click();
  await page.locator(".callout").filter({ hasText: "CPU Socket" }).click();
  await page
    .getByRole("heading", { name: "CPU Socket", exact: true })
    .waitFor();
  const beforeRotation = await page
    .locator(".image-stage")
    .getAttribute("style");
  await page.getByRole("button", { name: "Rotate view", exact: true }).click();
  const afterRotation = await page
    .locator(".image-stage")
    .getAttribute("style");
  assert.notEqual(afterRotation, beforeRotation);
  await page
    .getByRole("button", { name: "Compatibility", exact: true })
    .click();
  await page.locator(".compatibility select").first().selectOption("AM4");
  assert.equal(
    await page.getByText("× Not compatible", { exact: true }).count(),
    1,
  );
  await page
    .getByRole("button", { name: "Specifications", exact: true })
    .click();
  assert.ok(
    await page
      .locator(".detail-panel")
      .getByText("256 GB", { exact: true })
      .isVisible(),
  );
  await page
    .getByRole("button", { name: "Signal Flow Follow the data pathways." })
    .click();
  assert.equal(await page.locator(".signal-paths").count(), 1);
  await page.getByRole("button", { name: "Zoom in", exact: true }).click();
  await page.screenshot({ path: "test-results/desktop.png", fullPage: true });
  await page.getByRole("button", { name: "Components", exact: true }).click();
  await page.getByRole("heading", { name: "Explore Mainboard" }).waitFor();
  assert.ok((await page.locator(".device-card").count()) >= 1);
  await page
    .getByRole("button", { name: "Open ASUS ROG STRIX B850-F GAMING WIFI" })
    .first()
    .click();
  await page
    .getByRole("heading", { name: "ASUS ROG STRIX B850-F GAMING WIFI" })
    .waitFor();
  await page
    .getByRole("textbox", { name: "Search products" })
    .fill("does-not-exist");
  assert.ok(await page.getByText(/No models match/).isVisible());
  await page.setViewportSize({ width: 390, height: 844 });
  await page
    .getByRole("button", { name: "Explore Memory (RAM)", exact: true })
    .click();
  assert.ok(await page.locator(".component-detail").isVisible());
  assert.equal(await page.locator(".component-canvas .hotspot").count(), 0);
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  await page.screenshot({ path: "test-results/mobile.png", fullPage: true });
  await page.goto("http://localhost:3000/admin");
  await page
    .getByRole("heading", { name: "Quản lý mainboard và hotspot" })
    .waitFor();
  await page.getByRole("button", { name: "+ Thêm mainboard" }).click();
  await page.getByRole("button", { name: "Xuất bản", exact: true }).click();
  await page.getByText("Admin token required.").waitFor();
  assert.deepEqual(errors, []);
  await page.setViewportSize({ width: 1440, height: 1050 });
  await page
    .getByRole("textbox", { name: "Admin token" })
    .fill("browser-test-token");
  await page.getByRole("button", { name: "Tải danh sách sản phẩm" }).click();
  await page
    .getByRole("combobox", { name: "Select product" })
    .selectOption("mb_asus_b850f");
  assert.equal(await page.locator(".associated-component").count(), 3);
  await page.getByRole("button", { name: "+ Thêm linh kiện đi kèm" }).click();
  assert.equal(await page.locator(".associated-component").count(), 4);
  await page.locator(".editor-board").click({ position: { x: 50, y: 250 } });
  assert.equal(await page.locator(".editor-node").count(), 6);
  await page.getByText("Vị trí:", { exact: false }).waitFor();
  await page.screenshot({ path: "test-results/admin.png", fullPage: true });
  const api = page.request;
  const headers = { Authorization: "Bearer browser-test-token" };
  const original = (
    await (await api.get("http://localhost:3000/api/products")).json()
  )[0];
  const draft = {
    ...original,
    id: "browser-test-product",
    slug: "browser-test-product",
    name: "Browser test mainboard",
    status: "draft",
  };
  try {
    let response = await api.post("http://localhost:3000/api/products", {
      headers,
      data: draft,
    });
    assert.equal(response.status(), 200);
    let publicProducts = await (
      await api.get("http://localhost:3000/api/products")
    ).json();
    assert.equal(
      publicProducts.some((p) => p.id === draft.id),
      false,
    );
    let privateProducts = await (
      await api.get("http://localhost:3000/api/products", { headers })
    ).json();
    assert.equal(
      privateProducts.some((p) => p.id === draft.id),
      true,
    );
    const upload = await api.post("http://localhost:3000/api/media", {
      headers,
      multipart: {
        file: {
          name: "mainboard.webp",
          mimeType: "image/webp",
          buffer: require("node:fs").readFileSync(
            "public/media/mainboard.webp",
          ),
        },
      },
    });
    assert.equal(upload.status(), 200);
    const { url } = await upload.json();
    assert.equal((await api.get("http://localhost:3000" + url)).status(), 200);
    draft.media.top = url;
    draft.status = "published";
    response = await api.post("http://localhost:3000/api/products", {
      headers,
      data: draft,
    });
    assert.equal(response.status(), 200);
    await page.goto(
      "http://localhost:3000/explore/mainboard/browser-test-product",
    );
    await page
      .getByRole("heading", { name: "Browser test mainboard" })
      .waitFor();
    assert.equal(await page.locator(".hotspot").count(), 5);
  } finally {
    await api.delete("http://localhost:3000/api/products", {
      headers,
      data: { id: draft.id },
    });
  }
  await browser.close();
  console.log(
    "Browser smoke passed: hotspots, specs, compatibility, signal, zoom, search, mobile sheet, admin auth.",
  );
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
