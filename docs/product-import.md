# Nhập dữ liệu không cần Cloud Functions

Trang quản trị hỗ trợ **Nhập JSON/CSV** trên cả sáu tab Mainboard, CPU, RAM,
SSD, GPU và PSU. Mỗi file chứa một sản phẩm, tối đa 2 MB; chọn đúng tab và
thẻ cần cập nhật trước khi nhập. File không tự tạo hay xuất bản sản phẩm.

1. Chọn **Thêm** để tạo bản nháp hoặc chọn thẻ đang có.
2. Chọn **Nhập JSON/CSV**, tải file và xem trước từng trường, từng ảnh.
3. Mặc định chỉ điền ô trống; bỏ chọn nếu muốn thay thông tin đã có.
4. Chọn **Áp dụng vào bản nháp**, kiểm tra rồi chọn **Lưu lên Firestore**.

JSON mẫu (tên khóa thông số giữ theo schema hiện tại):

```json
{
  "type": "RAM",
  "name": "RAM mẫu",
  "brand": "Kingston",
  "model": "Mã model nếu có",
  "spec": { "Capacity": "32gb", "Memory type": "DDR5", "Speed": "6000" },
  "images": ["https://example.com/ram.png"],
  "sourceUrl": "https://www.kingston.com/"
}
```

CSV UTF-8 dùng dấu phẩy, dòng đầu là tên cột, dòng sau là một sản phẩm:

```csv
type,name,brand,spec.Capacity,spec.Memory type,images,sourceUrl
RAM,RAM mẫu,Kingston,32gb,DDR5,https://example.com/front.png|https://example.com/back.png,https://www.kingston.com/
```

Đặt giá trị chứa dấu phẩy hoặc xuống dòng trong dấu nháy kép; dấu nháy kép
bên trong giá trị viết thành hai dấu nháy. Các cột spec.Socket, spec.Chipset,
spec.Wattage… dùng tên khóa thông số của sản phẩm. ID, trạng thái, hotspot,
liên kết linh kiện không bị ghi đè bởi file. Đơn vị được chuẩn hóa khi áp dụng.

## Công cụ chạy trên máy

Cài Node.js 22 hoặc mới hơn. Tại thư mục repository chạy:

```powershell
npm ci --prefix functions
npm run import-product -- --url "https://www.asus.com/link-san-pham/techspec/" --type Mainboard --out mainboard.json
```

Thay URL bằng trang sản phẩm thật. `--type` nhận Mainboard, CPU, RAM, SSD,
GPU hoặc PSU. File xuất ra có thể nhập trực tiếp trong quản trị.
Công cụ không yêu cầu Firebase CLI, đăng nhập Firebase hoặc bật Blaze;
không ghi lên Firestore. Nếu file đích đã tồn tại, chọn tên khác.

Các domain hỗ trợ nằm trong `functions/extract.js`. Tái sử dụng bộ đọc HTML,
JSON-LD và bảng thông số hiện tại: trang chống bot, chỉ dựng thông số bằng
JavaScript hoặc có cấu trúc khác có thể không đọc được đầy đủ. Không tự suy
diễn thông số còn thiếu. Kiểm tra nguồn, ảnh và giá trị trước khi lưu.

Backend Cloud Function cũ vẫn giữ trong repository để tham khảo, nhưng nút nhập
trên website hiện đọc file ngay trong trình duyệt và không gọi backend đó.
