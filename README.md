# Tech Explorer

Interactive motherboard explorer built from the supplied Tech Explorer implementation specification. Next.js App Router, React, strict TypeScript, SVG overlays and Prisma/PostgreSQL. No real 3D engine is used.

## Run locally

Requires Node.js 20.9+.

```sh
npm install
npm run dev
```

Open http://localhost:3000. Without DATABASE_URL, the app uses seeded data and persists edits in `data/products.json`. This local mode is for development on a single server, not a production database. Published models also have `/explore/mainboard/<slug>` URLs. Product search covers names, category and specifications.

## PostgreSQL

Copy `.env.example` to `.env`, set a strong `ADMIN_TOKEN`, then:

```sh
docker compose up -d
npm run db:push
npm run db:seed
npm run dev
```

`db:push` provisions a development schema. An initial SQL migration is included. Use `npx prisma migrate deploy` on an empty production database; create later changes with `npx prisma migrate dev`. When DATABASE_URL is set, connection errors are surfaced rather than silently falling back to local storage.

## Content studio

Visit `/admin`, enter the token from ADMIN_TOKEN and click **Tải danh sách sản phẩm**. Create or select a product, fill in specifications, upload media by role, and select Top or Rear I/O editor view. Click the image to create percentage-based hotspots; click a node to edit its title, subtitle, type and explanation. Preview the panel, save a draft, then publish. Publication requires a top image, CPU socket, memory type and at least five hotspots. Drafts require authenticated API access. Never place the admin secret in NEXT_PUBLIC variables.

The local upload adapter saves to `public/uploads` (8 MB limit, raster formats only). Use a persistent writable volume on a self-hosted deployment. Replace `app/api/media/route.ts` with your Cloudinary or S3 adapter before deploying to ephemeral/serverless infrastructure. Production should also add individual admin accounts and a rate limit; the current content API uses a single server-side bearer secret.

### Firestore administration

The static `/admin/` page uses Firebase Authentication and Firestore. Create an Email/Password user in Firebase Authentication, then create an `admins/{uid}` document in Firestore for each administrator. Deploy the included rules with `firebase deploy --only firestore:rules` after selecting project `techexplorer-38d83`. Sign in to `/admin/` and click **Đồng bộ dữ liệu mẫu** once to copy the bundled mainboard and component seed data into Firestore. Firestore public reads require a query constrained to `status == "published"`; draft documents remain visible only to administrators.

## Features

- Sci-fi three-column Explorer, responsive tablet navigation and mobile detail sheet.
- Five accurate relative hotspots on a local WebP product image; click selection from either marker or callout, long connector lines, zoom/reset/90-degree rotate/fullscreen, SVG signal paths and reduced-motion support.
- Data-driven overview/specification panels, CPU socket and RAM type checks with explanations and BIOS/QVL warning.
- Product CRUD, media roles, upload, visual hotspot editing, draft/publish workflow and associated component records for CPU, RAM, GPU, storage, PSU, cooling and case parts.
- Unavailable rear I/O, X-ray and exploded assets show disabled Coming soon cards. Add these media roles to enable them. 360° and real 3D are outside this MVP.
- Light/dark toggle, loading, error and empty states.

## Verification

```sh
npm run typecheck
npm test
npm run build
npm start
```

Core tests cover compatibility, publication validation and admin authentication. Browser smoke tests live in `tests/browser.cjs`. Run a local server with `ADMIN_TOKEN=browser-test-token`, install Chromium with `npx playwright install chromium`, then run `node tests/browser.cjs`. Optionally set `PLAYWRIGHT_BROWSER_EXECUTABLE` to a Chromium executable. Tests create and delete a temporary product and leave local upload/data artifacts. No Lighthouse score is claimed without a measured audit.

## Architecture

`app/api` exposes products and image upload. `lib/store.ts` is the persistence adapter; `lib/types.ts` defines product/media/hotspot contracts. `lib/compatibility.ts` contains the rule evaluator. Prisma stores common product fields and category-specific JSON specifications. Explorer rendering components contain no product specifications. `prisma/seed.ts` provisions the sample product.

## Sources and asset attribution

The supplied concept is visual direction, not a screenshot used as the application. The motherboard image is from the official ASUS ROG B850-F product page:
https://rog.asus.com/motherboards/rog-strix/rog-strix-b850-f-gaming-wifi/

Source image: https://dlcdnwebimgs.asus.com/files/media/8e23bd7f-41d6-4ca8-bf39-de8fa4eafbe8/v1/img/kv/pd.png

Specifications checked against ASUS on 2026-10-08:
https://rog.asus.com/us/motherboards/rog-strix/rog-strix-b850-f-gaming-wifi/spec/

The current manufacturer lists 256 GB RAM, 4 M.2 slots and 2 SATA ports, differing from the illustrative values in the concept. Brand names and product imagery belong to their respective owners. The demo includes one verified mainboard, without fictional model specifications. CPU socket/memory checks do not guarantee complete PC compatibility.

## GitHub Pages deployment

The Pages workflow builds and deploys a static Explorer to https://kunio2910.github.io/TechExplorer/. Repository Settings → Pages → Source must be **GitHub Actions**. It uses `/TechExplorer` as the base path for routes, JavaScript, fonts and images. `npm run build:pages` writes the deployable files to `pages-out` without modifying the server application.

GitHub Pages cannot run the Node.js API or PostgreSQL. The static version includes the seeded products, hotspots, search, comparison and compatibility checks. Trang `/admin/` dùng Firebase Authentication để đăng nhập quản trị và lưu mainboard, CPU, RAM, SSD, ảnh URL và hotspot vào Firestore; Explorer đọc các sản phẩm `published` từ Firestore rồi dùng dữ liệu seed làm dự phòng khi Firestore chưa có quyền đọc. Hãy triển khai `firestore.rules` trước khi dùng production. Bản Next.js server vẫn cung cấp quản trị API và PostgreSQL độc lập. Change seed data and push to update the static catalog.
