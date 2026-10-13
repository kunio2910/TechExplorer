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
    "@/lib/firebase-client": `export const auth={currentUser:{uid:'qa'}};`,
    "@/lib/firestore": `const q=()=>window.qa;const save=(list,item)=>{const i=list.findIndex(x=>x.id===item.id);if(i<0)list.push(structuredClone(item));else list[i]=structuredClone(item);};export const loadAllProducts=async()=>structuredClone(q().products);export const loadCatalogComponents=async()=>structuredClone(q().components);export const saveProduct=async item=>save(q().products,item);export const saveCatalogComponent=async item=>save(q().components,item);export const deleteProduct=async id=>{q().products=q().products.filter(x=>x.id!==id);};export const deleteCatalogComponent=async id=>{q().components=q().components.filter(x=>x.id!==id);};export const seedProductsToFirestore=async()=>({products:1,components:5});export const restoreCatalog=async b=>{b.products.forEach(saveProduct);b.components.forEach(saveCatalogComponent);};export const firestoreErrorMessage=(e)=>e.message;`,
  };
  mocks["@/lib/firestore"] +=
    `export const subscribeToPublishedProducts=(cb)=>{const timer=setTimeout(()=>cb(structuredClone(q().products.filter(p=>p.status==='published'&&!p.deletedAt))),0);return()=>clearTimeout(timer);};export const subscribeToPublishedComponents=(cb)=>{const timer=setTimeout(()=>cb(structuredClone(q().components.filter(p=>p.status==='published'&&!p.deletedAt))),0);return()=>clearTimeout(timer);};`;
  const output = await build({
    stdin: {
      contents: `import React from 'react';import{createRoot}from'react-dom/client';import Admin from './components/StaticAdmin';import Explorer from './components/Explorer';import{seedProducts}from'./lib/seed';const explorer=location.pathname==='/explorer';window.qa={products:structuredClone(seedProducts),components:['CPU','RAM','SSD','GPU','PSU'].map(type=>({id:type,type,category:type==='SSD'?'Storage':type,name:type+' QA',brand:'QA',model:'',imageUrl:'/media/mainboard.webp',gallery:[],description:'Fixture',spec:{Socket:'AM5'},status:explorer?'published':'draft',compatibility:'warning',notes:''}))};if(explorer){window.qa.products[0].gallery=['/media/explorer-home.svg'];window.qa.products.push({...structuredClone(seedProducts[0]),id:'second',slug:'second',name:'MSI QA',brand:'MSI',spec:{...seedProducts[0].spec,Socket:'AM4'}});}createRoot(document.getElementById('root')).render(explorer?<Explorer products={seedProducts}/>:<Admin initialProducts={seedProducts}/>);`,
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
                /^(next\/link|firebase\/auth|@\/lib\/(firebase-client|firestore))$/,
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
      if (req.url === "/" || req.url === "/explorer") {
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
    await page.getByRole("button", { name: "Open MSI QA" }).waitFor();
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
    await page
      .locator(".comparison-dialog")
      .getByRole("button", { name: "Đóng", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Open ASUS ROG STRIX B850-F GAMING WIFI" })
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
    await page.getByRole("button", { name: "← Quay lại danh sách" }).click();
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
    assert.deepEqual(errors, []);
    console.log(
      "UI passed: draft duplication, trash/restore, uploads, cover selection, history, filters, comparisons, lightbox, navigation and mobile.",
    );
  } finally {
    await browser?.close();
    await new Promise((resolve) => server.close(resolve));
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
