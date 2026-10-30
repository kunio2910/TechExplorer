// UI integration uses isolated in-memory Auth/Firestore adapters; never writes live data.
const { build } = require("esbuild");
const { chromium } = require("@playwright/test");
const http = require("node:http");
const fs = require("node:fs/promises");
const path = require("node:path");
const assert = require("node:assert/strict");
(async () => {
  const mocks = {
    "next/link": `import React from 'react';export default function Link({href,children,...props}){return React.createElement('a',{...props,href},children);}`,
    "firebase/auth": `export const onAuthStateChanged=(a,cb)=>{const t=setTimeout(()=>cb({email:'qa@example.test',uid:'qa'}),0);return()=>clearTimeout(t);};export const signInWithEmailAndPassword=async()=>{};export const signOut=async()=>{};`,
    "@/lib/firebase-client": `export const auth={currentUser:{uid:'qa'}};export const firebaseApp={};`,
    "@/lib/firestore": `const q=()=>window.qa;const save=(list,item)=>{const i=list.findIndex(x=>x.id===item.id);if(i<0)list.push(structuredClone(item));else list[i]=structuredClone(item);};export const loadAllProducts=async()=>structuredClone(q().products);export const loadCatalogComponents=async()=>structuredClone(q().components);export const saveProduct=async item=>save(q().products,item);export const saveCatalogComponent=async item=>save(q().components,item);export const deleteProduct=async id=>{q().products=q().products.filter(x=>x.id!==id);};export const deleteCatalogComponent=async id=>{q().components=q().components.filter(x=>x.id!==id);};export const seedProductsToFirestore=async()=>({products:1,components:5});export const restoreCatalog=async b=>{b.products.forEach(saveProduct);b.components.forEach(saveCatalogComponent);};export const firestoreErrorMessage=(e)=>e.message;`,
  };
  mocks["firebase/auth"] +=
    `export const createUserWithEmailAndPassword=async()=>{};`;
  mocks["@/lib/firebase-client"] += `export const firestore={};`;
  mocks["firebase/firestore"] =
    `export const collection=(...a)=>a;export const doc=(...a)=>a;export const serverTimestamp=()=>new Date().toISOString();export const addDoc=async()=>({id:'report-test'});export const updateDoc=async()=>{};export const setDoc=async()=>{};export const getDocs=async()=>({docs:[]});export const onSnapshot=(ref,cb)=>{const t=setTimeout(()=>cb({docs:[]}),0);return()=>clearTimeout(t);};`;
  mocks["@/lib/firestore"] +=
    `export const saveVersionedDevice=async(item,original)=>{window.qa.versions??=[];if(original)window.qa.versions.push({id:String(window.qa.versions.length),savedAt:original.updatedAt||new Date().toISOString(),by:'QA',snapshot:structuredClone(original)});window.qa.versions.push({id:String(window.qa.versions.length),savedAt:item.updatedAt||new Date().toISOString(),by:'QA',snapshot:structuredClone(item)});return 'media'in item?saveProduct(item):saveCatalogComponent(item);};export const loadDeviceVersions=async(group,id)=>(window.qa.versions||[]).filter(x=>x.snapshot.id===id);`;
  mocks["@/lib/firestore"] +=
    `export const subscribeToPublishedProducts=(cb)=>{const timer=setTimeout(()=>cb(structuredClone(q().products.filter(p=>p.status==='published'&&!p.deletedAt))),0);return()=>clearTimeout(timer);};export const subscribeToPublishedComponents=(cb)=>{const timer=setTimeout(()=>cb(structuredClone(q().components.filter(p=>p.status==='published'&&!p.deletedAt))),0);return()=>clearTimeout(timer);};`;
  const output = await build({
    stdin: {
      contents: `import React from 'react';import{createRoot}from'react-dom/client';import Admin from './components/StaticAdmin';import Explorer from './components/Explorer';import{seedProducts}from'./lib/seed';const explorer=location.pathname==='/explorer'||new URLSearchParams(location.search).has('screen');window.qa={products:structuredClone(seedProducts),components:['CPU','RAM','SSD','GPU','PSU'].map(type=>({id:type,type,category:type==='SSD'?'Storage':type,name:type+' QA',brand:'QA',model:'',imageUrl:'/media/mainboard.webp',gallery:[],description:'Fixture',spec:{Socket:'AM5'},status:explorer?'published':'draft',compatibility:'warning',notes:''}))};if(explorer){window.qa.products[0].gallery=['/media/explorer-home.svg'];window.qa.products.push({...structuredClone(seedProducts[0]),id:'second',slug:'second',name:'MSI QA',brand:'MSI',spec:{...seedProducts[0].spec,Socket:'AM4'}});}createRoot(document.getElementById('root')).render(explorer?<Explorer products={seedProducts}/>:<Admin initialProducts={seedProducts}/>);`,
      resolveDir: process.cwd(),
      loader: "tsx",
    },
    bundle: true,
    write: false,
    jsx: "automatic",
    define: {
      "process.env.NODE_ENV": '"development"',
      "process.env.NEXT_PUBLIC_BASE_PATH": '""',
    },
    plugins: [
      {
        name: "qa-adapters",
        setup(b) {
          b.onResolve(
            {
              filter:
                /^(next\/link|firebase\/(auth|functions|firestore)|@\/lib\/(firebase-client|firestore))$/,
            },
            (args) => ({ path: args.path, namespace: "mock" }),
          );
          b.onLoad({ filter: /.*/, namespace: "mock" }, (args) => ({
            contents: mocks[args.path],
            loader: "js",
            resolveDir: process.cwd(),
          }));
          b.onResolve({ filter: /^@\// }, (args) => ({
            path: path.resolve(args.path.replace(/^@\//, "")) + ".ts",
          }));
        },
      },
    ],
  });
  const css = (await fs.readFile("app/globals.css", "utf8")).replace(
    '@import "tailwindcss";',
    "",
  );
  const server = http.createServer(async (req, res) => {
    try {
      if (
        new URL(req.url, "http://127.0.0.1").pathname === "/" ||
        new URL(req.url, "http://127.0.0.1").pathname === "/explorer"
      ) {
        res.setHeader("Content-Type", "text/html");
        res.end(
          '<html><head><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/style.css"></head><body><div id="root"></div><script src="/qa.js"></script></body></html>',
        );
      } else if (req.url === "/qa.js") {
        res.setHeader("Content-Type", "text/javascript");
        res.end(output.outputFiles[0].contents);
      } else if (req.url === "/style.css") {
        res.setHeader("Content-Type", "text/css");
        res.end(css);
      } else if (req.url.startsWith("/media/")) {
        const file = path.resolve("public", "." + req.url);
        if (!file.startsWith(path.resolve("public") + path.sep))
          throw Error("path");
        res.setHeader(
          "Content-Type",
          req.url.endsWith(".svg") ? "image/svg+xml" : "image/webp",
        );
        res.end(await fs.readFile(file));
      } else {
        res.statusCode = 404;
        res.end();
      }
    } catch {
      res.statusCode = 404;
      res.end();
    }
  });
  await new Promise((resolve) => server.listen(4180, "127.0.0.1", resolve));
  let browser;
  try {
    browser = await chromium.launch({
      headless: true,
      executablePath: process.env.PLAYWRIGHT_BROWSER_EXECUTABLE,
    });
    const page = await browser.newPage({
      viewport: { width: 1440, height: 1050 },
    });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("dialog", (d) => d.accept());
    await page.addLocatorHandler(
      page.getByRole("dialog").filter({ hasText: "Có thay đổi chưa lưu" }),
      async () => {
        await page
          .getByRole("dialog")
          .getByRole("button", { name: "Xác nhận", exact: true })
          .click();
      },
    );
    await page.goto("http://127.0.0.1:4180");
    await page.getByRole("heading", { name: "Quản lý phần cứng" }).waitFor();
    await page.getByRole("button", { name: /Nhân đôi ASUS/ }).click();
    await page.getByRole("status").filter({ hasText: "Đã nhân đôi" }).waitFor();
    assert.equal(await page.evaluate(() => window.qa.products.length), 2);
    assert.equal(
      await page.evaluate(() => window.qa.products[1].status),
      "draft",
    );
    await page
      .getByRole("button", { name: /Xóa ASUS/ })
      .last()
      .click();
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Xác nhận", exact: true })
      .click();
    await page.getByText("Đã chuyển mainboard vào thùng rác.").waitFor();
    await page.getByRole("button", { name: /Thùng rác \(1\)/ }).click();
    await page.getByRole("button", { name: "Khôi phục", exact: true }).click();
    await page.getByText("Đã khôi phục thành bản nháp.").waitFor();
    assert.equal(
      await page.evaluate(
        () => window.qa.products.filter((p) => p.deletedAt).length,
      ),
      0,
    );
    await page.getByRole("button", { name: "Danh sách", exact: true }).click();
    await page
      .getByRole("heading", { name: "Danh sách sản phẩm", exact: true })
      .waitFor();
    assert.ok((await page.locator(".admin-product-card").count()) >= 1);
    await page.locator(".admin-search-field input").fill("ASUS");
    assert.ok((await page.locator(".admin-product-card").count()) >= 1);
    await page
      .locator(".admin-product-card")
      .first()
      .getByRole("button", { name: /Xem chi tiết/ })
      .click();
    await page
      .getByRole("heading", {
        name: "ASUS ROG STRIX B850-F GAMING WIFI",
        exact: true,
      })
      .waitFor();
    assert.ok(
      (await page.locator(".admin-detail-spec-table > div").count()) > 0,
    );
    await page.getByRole("button", { name: /Quay lại danh sách/ }).click();
    await page
      .getByRole("heading", { name: "Danh sách sản phẩm", exact: true })
      .waitFor();
    await page.getByRole("button", { name: /Về quản lý chính/ }).click();
    await page
      .getByRole("heading", { name: "Thông tin mainboard", exact: true })
      .waitFor();
    await page.getByRole("button", { name: "Danh sách", exact: true }).click();
    await page
      .getByRole("heading", { name: "Danh sách sản phẩm", exact: true })
      .waitFor();
    await page.getByRole("button", { name: "Mở cài đặt", exact: true }).click();
    await page
      .getByRole("heading", { name: "Cài đặt quản lý", exact: true })
      .waitFor();
    await page.getByRole("button", { name: /Về trình chỉnh sửa/ }).click();
    await page
      .getByRole("heading", { name: "Thông tin mainboard", exact: true })
      .waitFor();
    await page
      .locator(".admin-tabs")
      .getByRole("button", { name: "CPU", exact: true })
      .click();
    await page
      .locator(".media-dropzone input")
      .setInputFiles("public/media/mainboard.webp");
    await page.locator(".media-sort-card").nth(1).waitFor();
    await page
      .getByRole("button", { name: "Đặt đại diện", exact: true })
      .click();
    await page.getByRole("button", { name: "✓ Lưu lên Firestore" }).click();
    await page.getByText("Đã lưu CPU lên Firestore.").waitFor();
    assert.ok(
      (
        await page.evaluate(
          () => window.qa.components.find((c) => c.type === "CPU").imageUrl,
        )
      ).startsWith("data:image/webp"),
    );
    assert.equal(await page.locator(".admin-validation li").count(), 1);
    await page.screenshot({
      path: "test-results/admin-improved.png",
      fullPage: true,
    });
    await page.setViewportSize({ width: 390, height: 844 });
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    await page.screenshot({
      path: "test-results/admin-improved-mobile.png",
      fullPage: true,
    });
    await page.setViewportSize({ width: 1440, height: 1050 });
    await page.goto("http://127.0.0.1:4180/explorer");
    await page
      .locator(".header nav")
      .getByRole("button", { name: "Linh kiện", exact: true })
      .click();
    await page
      .getByRole("heading", { name: "Chọn linh kiện để bắt đầu", exact: true })
      .waitFor();
    await page
      .locator(".component-suggestion-card")
      .filter({ hasText: "Mainboard" })
      .first()
      .click();
    await page.getByRole("heading", { name: "Khám phá Mainboard" }).waitFor();
    await page.getByRole("button", { name: "Xem chi tiết MSI QA" }).waitFor();
    assert.equal(
      await page
        .getByRole("button", { name: "Đặt lại thu phóng", exact: true })
        .count(),
      0,
    );
    await page
      .locator(".sidebar")
      .getByLabel("Hãng", { exact: true })
      .selectOption("ASUS");
    assert.equal(await page.locator(".device-grid .device-card").count(), 1);
    await page
      .locator(".sidebar")
      .getByRole("button", { name: "Xóa bộ lọc" })
      .click();
    await page
      .getByRole("button", { name: "＋ Thêm vào so sánh", exact: true })
      .first()
      .click();
    await page
      .getByRole("button", { name: "＋ Thêm vào so sánh", exact: true })
      .first()
      .click();
    await page.getByRole("button", { name: "So sánh →", exact: true }).click();
    assert.ok(
      (await page.locator(".comparison-dialog .different").count()) > 0,
    );
    const comparisonBounds = await page
      .locator(".comparison-dialog")
      .boundingBox();
    assert.ok(comparisonBounds);
    assert.ok(Math.abs(comparisonBounds.width - 1440) <= 2);
    assert.ok(Math.abs(comparisonBounds.height - 1050) <= 2);
    await page
      .locator(".comparison-dialog")
      .getByRole("button", { name: "Đóng", exact: true })
      .click();
    await page
      .getByRole("button", {
        name: "Xem chi tiết ASUS ROG STRIX B850-F GAMING WIFI",
      })
      .click();
    assert.equal(await page.locator(".callout").first().isVisible(), false);
    await page
      .getByRole("button", { name: "Hiện chú thích", exact: true })
      .click();
    assert.ok(await page.locator(".callout").first().isVisible());
    await page.locator(".board-image").click();
    await page.keyboard.press("ArrowRight");
    assert.ok(
      (await page.locator(".image-lightbox img").getAttribute("src")).includes(
        "explorer-home.svg",
      ),
    );
    await page.keyboard.press("Escape");
    assert.equal(await page.locator(".image-lightbox").isVisible(), false);
    await page
      .locator(".explorer-main .breadcrumb")
      .getByRole("button", { name: "Mainboard", exact: true })
      .click();
    assert.equal(await page.locator(".device-grid .device-card").count(), 2);
    await page.screenshot({
      path: "test-results/explorer-improved-library.png",
      fullPage: true,
    });
    await page.setViewportSize({ width: 390, height: 844 });
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    await page.screenshot({
      path: "test-results/explorer-improved-mobile.png",
      fullPage: true,
    });
    // New workflows: favorites, history, state links, builder and knowledge.
    await page.setViewportSize({ width: 1440, height: 1050 });
    await page.locator(".favorite-card-action").first().click();
    await page
      .locator(".header nav")
      .getByRole("button", { name: "Đã lưu", exact: true })
      .click();
    await page.getByRole("heading", { name: "Thiết bị của bạn" }).waitFor();
    assert.equal(await page.locator(".device-card").count(), 1);
    await page
      .getByRole("button", { name: "Đã xem gần đây", exact: true })
      .click();
    assert.ok((await page.locator(".device-card").count()) >= 1);
    await page.locator(".device-card").first().click();
    await page.getByRole("button", { name: "Thông số", exact: true }).click();
    assert.equal(
      await page
        .getByRole("button", { name: "Chia sẻ màn hình", exact: true })
        .count(),
      0,
    );
    await page.reload();
    await page.getByRole("button", { name: "Thông số", exact: true }).waitFor();
    assert.equal(
      await page
        .getByRole("button", { name: "Thông số", exact: true })
        .getAttribute("aria-pressed"),
      "true",
    );
    await page
      .locator(".header nav")
      .getByRole("button", { name: "Xây dựng cấu hình", exact: true })
      .click();
    await page
      .getByRole("heading", { name: "Xây dựng cấu hình PC", exact: true })
      .waitFor();
    await page.goBack();
    await page.getByRole("button", { name: "Thông số", exact: true }).waitFor();
    assert.equal(
      await page
        .getByRole("button", { name: "Thông số", exact: true })
        .getAttribute("aria-pressed"),
      "true",
    );
    await page.goForward();
    await page
      .getByRole("heading", { name: "Xây dựng cấu hình PC", exact: true })
      .waitFor();
    const boardSlot = page.locator(".build-slot").first();
    await boardSlot
      .getByRole("button", { name: "＋ Chọn thiết bị", exact: true })
      .click();
    await page
      .locator(".build-options")
      .getByRole("button", { name: /ASUS ROG/ })
      .click();
    await page.getByLabel("Tên cấu hình", { exact: true }).fill("PC QA đã lưu");
    await page
      .getByRole("button", { name: "Lưu cấu hình", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Chia sẻ cấu hình", exact: true })
      .click();
    const buildLink = await page
      .getByLabel("Link cấu hình", { exact: true })
      .inputValue();
    const shared = await browser.newPage();
    await shared.goto(buildLink);
    await shared
      .getByRole("heading", { name: "Xây dựng cấu hình PC", exact: true })
      .waitFor();
    assert.equal(
      await shared.getByLabel("Tên cấu hình", { exact: true }).inputValue(),
      "PC QA đã lưu",
    );
    assert.ok(
      await shared
        .locator(".build-slot")
        .first()
        .getByText("ASUS ROG STRIX B850-F GAMING WIFI", { exact: true })
        .isVisible(),
    );
    await shared
      .locator(".build-slot")
      .first()
      .getByRole("button", { name: "Bỏ chọn", exact: true })
      .click();
    await shared
      .getByRole("button", { name: "Chia sẻ cấu hình", exact: true })
      .click();
    const emptyShared = new URL(
      await shared.getByLabel("Link cấu hình", { exact: true }).inputValue(),
    );
    assert.deepEqual(
      JSON.parse(emptyShared.searchParams.get("build")).parts,
      {},
    );
    await shared.close();
    await page.reload();
    await page
      .getByRole("heading", { name: "Xây dựng cấu hình PC", exact: true })
      .waitFor();
    assert.equal(
      await page.getByLabel("Tên cấu hình", { exact: true }).inputValue(),
      "PC QA đã lưu",
    );
    await page.setViewportSize({ width: 390, height: 844 });
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    await page.screenshot({
      path: "test-results/builder-mobile.png",
      fullPage: true,
    });
    await page
      .locator(".feature-mobile-nav")
      .getByRole("button", { name: "Kiến thức", exact: true })
      .click();
    await page.getByRole("heading", { name: "Trung tâm kiến thức" }).waitFor();
    await page.getByLabel("Tìm thuật ngữ hoặc chủ đề").fill("VRM");
    assert.equal(await page.locator(".knowledge-grid article").count(), 1);
    await page.setViewportSize({ width: 1440, height: 1050 });
    await page
      .locator(".header nav")
      .getByRole("button", { name: "Linh kiện", exact: true })
      .click();
    await page
      .locator(".component-suggestion-card")
      .filter({ hasText: "CPU" })
      .first()
      .click();
    await page
      .getByRole("button", { name: "Xem chi tiết CPU QA", exact: true })
      .click();
    await page.getByRole("button", { name: "Thông số", exact: true }).click();
    assert.ok(page.url().includes("component=CPU"));
    await page.reload();
    await page.getByRole("heading", { name: "CPU QA", exact: true }).waitFor();
    assert.equal(
      await page
        .getByRole("button", { name: "Thông số", exact: true })
        .getAttribute("aria-pressed"),
      "true",
    );
    // Independent admin session tests cloud versions and browser draft recovery.
    const admin = await browser.newPage({
      viewport: { width: 1440, height: 1050 },
    });
    admin.on("dialog", (d) => d.accept());
    await admin.addLocatorHandler(
      admin.getByRole("dialog").filter({ hasText: "Có thay đổi chưa lưu" }),
      async () => {
        await admin
          .getByRole("dialog")
          .getByRole("button", { name: "Xác nhận", exact: true })
          .click();
      },
    );
    admin.on("pageerror", (e) => errors.push(e.message));
    await admin.goto("http://127.0.0.1:4180/");
    await admin.getByRole("heading", { name: "Quản lý phần cứng" }).waitFor();
    await admin.getByText("Linh kiện đi kèm", { exact: true }).click();
    await admin
      .getByLabel("Thêm từ thư viện linh kiện", { exact: true })
      .selectOption("CPU");
    await admin
      .getByLabel("Tên sản phẩm", { exact: true })
      .fill("Mainboard QA liên kết");
    await admin
      .locator(".admin-form-grid select")
      .first()
      .selectOption("draft");
    await admin.getByRole("button", { name: /Lưu lên Firestore/ }).click();
    await admin
      .getByText("Đã lưu mainboard lên Firestore.", { exact: true })
      .waitFor();
    assert.equal(
      await admin.evaluate(
        () => window.qa.products[0].components.at(-1).catalogId,
      ),
      "CPU",
    );
    await admin
      .locator(".admin-versions")
      .getByRole("button", { name: "Xem phiên bản đã lưu", exact: true })
      .click();
    await admin.locator(".version-row").first().click();
    await admin
      .getByRole("button", {
        name: "Phục hồi phiên bản thành bản nháp",
        exact: true,
      })
      .click();
    assert.equal(
      await admin.getByLabel("Tên sản phẩm", { exact: true }).inputValue(),
      "ASUS ROG STRIX B850-F GAMING WIFI",
    );
    await admin
      .locator(".admin-tabs")
      .getByRole("button", { name: "RAM", exact: true })
      .click();
    await admin.getByText("Thông số RAM", { exact: true }).click();
    await admin.getByText(/^Bộ nhớ ·/).click();
    await admin
      .getByRole("button", { name: "Gợi ý Dung lượng (GB)", exact: true })
      .click();
    await admin.getByRole("option", { name: "32 GB", exact: true }).click();
    assert.equal(
      await admin.getByLabel("Dung lượng (GB)", { exact: true }).inputValue(),
      "32 GB",
    );
    await admin.getByLabel("Dung lượng (GB)", { exact: true }).fill("32gb");
    await admin.getByLabel("Dung lượng (GB)", { exact: true }).blur();
    assert.equal(
      await admin.getByLabel("Dung lượng (GB)", { exact: true }).inputValue(),
      "32 GB",
    );
    await admin
      .getByLabel("Tên linh kiện", { exact: true })
      .fill("RAM khôi phục QA");
    await admin
      .locator(".admin-recovery")
      .getByText("Đã tự lưu bản nháp trên trình duyệt.", { exact: true })
      .waitFor();
    await admin.reload();
    await admin
      .getByRole("button", { name: "Khôi phục bản nháp RAM", exact: true })
      .waitFor();
    await admin
      .getByRole("button", { name: "Khôi phục bản nháp RAM", exact: true })
      .click();
    assert.equal(
      await admin.getByLabel("Tên linh kiện", { exact: true }).inputValue(),
      "RAM khôi phục QA",
    );
    await admin
      .getByRole("button", { name: "Nhập JSON/CSV", exact: true })
      .click();
    await admin
      .getByRole("tab", { name: "Nhập file JSON/CSV", exact: true })
      .click();
    await admin
      .getByLabel("File dữ liệu sản phẩm", { exact: true })
      .setInputFiles({
        name: "ram.json",
        mimeType: "application/json",
        buffer: Buffer.from(
          JSON.stringify({
            type: "RAM",
            name: "RAM nhập QA",
            model: "Import model",
            spec: { Capacity: "64gb" },
          }),
        ),
      });
    await admin
      .getByRole("button", { name: "Áp dụng vào bản nháp", exact: true })
      .click();
    assert.equal(
      await admin.getByLabel("Tên linh kiện", { exact: true }).inputValue(),
      "RAM nhập QA",
    );
    assert.equal(
      await admin.getByLabel("Mã sản phẩm", { exact: true }).inputValue(),
      "Import model",
    );
    await admin
      .getByRole("button", { name: "Nhập JSON/CSV", exact: true })
      .click();
    await admin
      .getByRole("tab", { name: "Nhập file JSON/CSV", exact: true })
      .click();
    await admin
      .getByLabel("File dữ liệu sản phẩm", { exact: true })
      .setInputFiles({
        name: "ram.csv",
        mimeType: "text/csv",
        buffer: Buffer.from(
          "type,name,model,spec.Capacity\nRAM,RAM nhập QA,Import model,64gb",
        ),
      });
    assert.equal(
      await admin.getByLabel("Chỉ điền ô trống", { exact: false }).isChecked(),
      false,
    );
    await admin
      .getByRole("button", { name: "Áp dụng vào bản nháp", exact: true })
      .click();
    assert.equal(
      await admin.getByLabel("Tên linh kiện", { exact: true }).inputValue(),
      "RAM nhập QA",
    );
    assert.equal(
      await admin.getByLabel("Dung lượng (GB)", { exact: true }).inputValue(),
      "64 GB",
    );
    assert.equal(
      await admin.evaluate(
        () => window.qa.components.find((c) => c.type === "RAM").name,
      ),
      "RAM QA",
    );
    await admin.close();
    assert.deepEqual(errors, []);
    console.log(
      "UI passed: admin linking, draft recovery, version restore, normalized specs, personal library, shared state, PC builds, knowledge, history navigation and responsive layouts.",
    );
  } finally {
    await browser?.close();
    await new Promise((resolve) => server.close(resolve));
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
