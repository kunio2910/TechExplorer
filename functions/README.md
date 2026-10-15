# Nhập thông tin từ link chính hãng

**Luồng hiện tại:** website nhập file JSON/CSV ngay trong trình duyệt. Đọc
[hướng dẫn nhập file và công cụ local](../docs/product-import.md); không cần
deploy backend hay nâng Blaze cho luồng này. Nội dung dưới đây dành cho
backend Cloud Function tùy chọn đã được giữ lại để tham khảo.

Backend `importProduct` dùng Firebase Callable Functions tại `asia-southeast1`.
Không dùng AI và không cần API key bên thứ ba. Website GitHub Pages gọi backend
bằng phiên Firebase Authentication hiện tại. Chỉ UID quản trị có sẵn hoặc tài
khoản có document `admins/{uid}` được sử dụng.

## Cài đặt và triển khai

Chạy terminal tại thư mục gốc TechExplorer:

```powershell
npm install --prefix functions
npm test --prefix functions
npx firebase-tools login
npx firebase-tools deploy --only functions:product-import:importProduct --project techexplorer-38d83
```

`product-import` là tên codebase trong `firebase.json`; khi triển khai riêng
function `importProduct`, Firebase CLI cần nhận đủ dạng
`functions:<codebase>:<function>`. Có thể triển khai toàn bộ codebase bằng
`npx firebase-tools deploy --only functions:product-import --project techexplorer-38d83`.

Project phải được chủ tài khoản bật gói Blaze trước khi deploy Cloud Functions.
Không có thao tác tự nâng gói hoặc thêm thanh toán trong mã nguồn.

## Sử dụng

1. Trong quản trị chọn đúng tab và thiết bị cần sửa hoặc thêm thiết bị mới.
2. Chọn **Tự động điền**, nhập link HTTPS trang sản phẩm/trang thông số.
3. Chọn **Lấy thông tin**, xem các trường hiện tại và trường trích xuất.
4. Chọn trường và ảnh cần áp dụng. Mặc định chỉ điền ô trống. Bỏ chọn chế độ
   này nếu muốn thay tên, thương hiệu hoặc thông số đang có, kể cả tên mẫu mới.
5. Áp dụng vào bản nháp, kiểm tra rồi bấm **Lưu lên Firestore**.

Nguồn và thời điểm lấy được lưu cùng thiết bị trong `importSource`.
Không tự đổi trạng thái xuất bản, ID, slug, liên kết linh kiện hoặc hotspot.
Mô tả giữ ngôn ngữ của nguồn; giai đoạn này không dịch tự động.

## Khả năng đọc dữ liệu

Cho phép các domain chính hãng được liệt kê trong `extract.js`, xác minh lại
từng redirect. Bộ đọc trích xuất JSON-LD Product/additionalProperty, bảng
hai cột, danh sách dt/dd và một số dòng thông số có label/value riêng.
Đây không phải bộ đọc bao phủ mọi mẫu trang của các hãng. Trang dựng nội dung
bằng JavaScript, chống bot hoặc label khác quy tắc có thể chỉ trả thông tin
cơ bản; UI báo những trường còn thiếu để bổ sung thủ công. Không suy ra M.2
SATA chỉ từ số khe M.2. Các URL ảnh do nguồn cung cấp có thể hết hạn hoặc
không cho hiển thị ngoài trang hãng.

Giới hạn 3 MB/trang, 25 giây, tối đa 4 redirect, một yêu cầu mỗi 10 giây/admin,
tối đa 2 instance. `importLimits` chỉ backend truy cập qua Admin SDK;
Firestore Rules mặc định từ chối truy cập collection này từ trình duyệt.

Kiểm thử bằng fixture HTML trong `extract.test.js`; kiểm thử UI dùng adapter
Firebase giả lập trong `tests/admin-ui.cjs`, không ghi dữ liệu production.
