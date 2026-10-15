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

Trang quản trị hỗ trợ **Nhập JSON/CSV** và công cụ lấy dữ liệu chạy trên máy,
không cần Cloud Functions hoặc gói Blaze. Xem [hướng dẫn nhập sản phẩm](docs/product-import.md).

Nếu trang quản trị báo `permission-denied`, phát hành Rules từ thư mục gốc
trên Cloud Shell hoặc Firebase CLI đã đăng nhập:

```sh
firebase deploy --only firestore:rules --project techexplorer-38d83
```

UID quản trị mặc định đã có trong `firestore.rules`. Chỉ cần tạo document
`admins/{UID}` khi dùng một tài khoản Firebase khác.

Trang quản trị cảnh báo khi chuyển thẻ/tab hoặc rời trang có thay đổi chưa lưu. Thanh lưu cố định hiển thị trạng thái tải, mất kết nối và lỗi đồng bộ. Bản sao thiết bị mặc định là bản nháp.

Nút **Khôi phục JSON** nhận file từ **Backup JSON**, kiểm tra dữ liệu và hiển thị danh sách trước khi xác nhận. Chế độ **Chỉ thêm ID mới** bỏ qua ID đã tồn tại; **Thêm mới và cập nhật** ghi đè toàn bộ bản ghi cùng ID. Mỗi lần nhập tối đa 450 bản ghi, file tối đa 10 MB; slug mainboard phải duy nhất. Thao tác ghi dùng một batch Firestore để toàn bộ lần nhập thành công hoặc thất bại cùng nhau.

Khi Firestore đọc thành công danh sách trống, Explorer hiển thị trạng thái trống. Dữ liệu mẫu chỉ được giữ trong lúc chưa kết nối hoặc khi đọc thất bại; sản phẩm đã xóa không được tự bổ sung trở lại sau lần đọc thành công.

The static `/admin/` page uses Firebase Authentication and Firestore. The current Rules include the project owner's administrator UID (`n1tjRh8G6SSr3rSj3mQmV0Mxw8k2`) and also support additional administrators through an `admins/{uid}` document (the document can contain a simple `role: "admin"` field). Deploy the included rules with `firebase deploy --only firestore:rules` after selecting project `techexplorer-38d83`. Sign in to `/admin/` and click **Đồng bộ dữ liệu mẫu** once to copy the bundled mainboard and component seed data into Firestore. CPU, RAM and SSD records support a published image URL for their component preview. Firestore public reads require a query constrained to `status == "published"`; draft documents remain visible only to administrators. Published product and component changes stream into the Explorer in real time. If the admin page reports `permission-denied`, the page now includes the exact UID path to create; deploy the rules before trying again.

## Features

### Improved discovery and administration

- Homepage category cards and six most recently updated published devices.
- Brand, socket, memory, capacity and PSU wattage filters; clear filters and return to the library without resetting selections.
- Select two to four devices of the same type for comparison, with differing specification rows highlighted.
- Mainboard hotspot labels appear on hover, focus or selection; a toggle shows all labels. Product images open a keyboard-accessible viewer (arrow keys and Escape).
- Admin cards show cover images, status and update dates. CPU/RAM/SSD/GPU/PSU have specification templates and publication checklists. Publication validates required information, unique slugs and image loading.
- Deleting a device moves it into the trash and removes it from the public catalog. Restore returns it as a draft; permanent deletion requires confirmation. Backups include trashed records.
- Upload/drop JPG, PNG or WebP images (up to 15 MB each), compress before saving, reorder by dragging or arrow buttons, and select the cover. Uploaded images are stored as compressed image data in Firestore; each upload operation supports a gallery of up to eight images. URL fields remain available. Records exceeding 900 KB are rejected before writing.
- The latest 20 save/trash/restore events record the editor and time. This is an activity log, not a version rollback system.
- Newly created Firestore mainboards use `/?device=<slug>` links on Pages so reload works without creating a new static route.

`node tests/admin-ui.cjs` runs admin and public UI integration against isolated in-memory authentication and Firestore adapters. It never modifies the live database.

- Sci-fi three-column Explorer, responsive tablet navigation and mobile detail sheet.
- Five accurate relative hotspots on a local WebP product image; click selection from either marker or callout, long connector lines, zoom/reset/90-degree rotate/fullscreen, SVG signal paths and reduced-motion support.
- Data-driven overview/specification panels, CPU socket and RAM type checks with explanations and BIOS/QVL warning.
- Product CRUD, media roles, upload, visual hotspot editing, draft/publish workflow and associated component records for CPU, RAM, GPU, storage, PSU, cooling and case parts.
- Unavailable rear I/O, X-ray and exploded assets show disabled Coming soon cards. Add these media roles to enable them. 360° and real 3D are outside this MVP.
- Light/dark toggle, loading, error and empty states.

## Verification

### Workspace khám phá và cấu hình PC

- Linh kiện đi kèm có thể tham chiếu `catalogId` tới thư viện. Explorer dùng tên/model mới nhất và ẩn liên kết đến linh kiện không còn xuất bản; các mục nhập riêng trước đây vẫn hoạt động.
- Chia sẻ trạng thái qua query parameters: thiết bị, danh mục, tab, hotspot, góc nhìn, từ khóa và bộ lọc. Back/Forward và reload khôi phục lựa chọn. Các link này hoạt động trên GitHub Pages, kể cả linh kiện tạo sau lần build.
- Workspace **Xây dựng cấu hình** chọn Mainboard/CPU/RAM/SSD/GPU/PSU từ catalog, số bộ RAM và số SSD. Hỗ trợ đặt tên, lưu nhiều cấu hình, bản nháp, nhân đôi, JSON và link chia sẻ. Cấu hình, yêu thích và lịch sử đã xem lưu trên trình duyệt, chưa đồng bộ giữa máy hoặc tài khoản.
- Kiểm tra socket, chuẩn RAM, tổng dung lượng/số khe, số cổng SSD và công suất nguồn tham khảo. Dữ liệu thiếu được ghi là cần kiểm tra; BIOS, QVL, kích thước vỏ/tản nhiệt và đầu cấp nguồn chưa được tự động xác minh.
- **Tìm hiểu** mở trung tâm kiến thức có tìm kiếm thuật ngữ. Mô tả seed và các nhãn đã được Việt hóa; bản seed tiếng Anh từng lưu trên Firestore được chuyển cách hiển thị qua bảng dịch chính xác, không dịch lại nội dung tự viết.
- Thông số dung lượng/công suất/xung/tốc độ được chuẩn hóa khi rời ô nhập và khi lưu. Ví dụ `32gb` → `32 GB`; chữ `Gb` trong tốc độ mạng không bị đổi thành `GB`.

### Khôi phục dữ liệu quản trị

- Bản nháp tự lưu trong IndexedDB theo UID và thiết bị sau 500 ms, giữ cả ảnh tải lên. Sau reload, chọn **Khôi phục bản nháp** để tiếp tục; bản nháp không tự xuất bản lên Firestore.
- **Lưu lên Firestore** dùng transaction để lưu bản ghi và bản chụp trong `products/{id}/versions` hoặc `components/{id}/versions`. Nếu dữ liệu đã thay đổi từ nơi khác, thao tác từ chối ghi đè và giữ bản nháp.
- Bảng phiên bản đọc 20 bản gần nhất khi được yêu cầu. Phục hồi đưa nội dung về form ở trạng thái draft, cần kiểm tra và lưu lại. Xóa vĩnh viễn thiết bị xóa cả subcollection phiên bản. Backup JSON hiện chứa catalog hiện tại và thùng rác, không chứa kho phiên bản hoặc bản nháp trên trình duyệt.
- **Phải deploy Rules mới trước khi phát hành website:** `npx firebase-tools deploy --only firestore:rules --project techexplorer-38d83`. Các phiên bản chỉ cho quản trị viên đọc/ghi. Nếu CLI chưa đăng nhập, chạy `npx firebase-tools login` bằng tài khoản có quyền project.

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
