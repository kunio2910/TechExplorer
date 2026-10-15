# Nhập dữ liệu không cần Cloud Functions

Trang quản trị hỗ trợ **Nhận diện từ URL** và **Nhập JSON/CSV** trên cả sáu tab
Mainboard, CPU, RAM, SSD, GPU và PSU. URL được gửi tới dịch vụ chạy trên máy
người quản trị; dịch vụ nhận diện hãng, dòng sản phẩm và cấu trúc thông số rồi
trả về bản xem trước. Dữ liệu không tự xuất bản sản phẩm.

## Nhận diện từ URL trên máy

Cài Node.js 22 hoặc mới hơn. Tại thư mục repository chạy:

```powershell
npm ci --prefix functions
npm run import-server
```

Giữ cửa sổ Terminal này mở, vào trang quản trị, chọn **Nhận diện từ URL**, nhập
link HTTPS chính hãng và bấm **Nhận diện và xem trước**. Dịch vụ chỉ lắng nghe
trên `127.0.0.1:8787`, không mở cổng ra mạng LAN và không cần Firebase, đăng nhập
Firebase hay gói Blaze. Trình đọc hiện nhận diện ASUS/ROG, MSI, GIGABYTE/AORUS,
ASRock, Intel, AMD, Corsair, Kingston, Crucial, Samsung, Seasonic và Cooler
Master; URL phải thuộc đúng domain chính hãng được hỗ trợ.

Trang chống bot, chỉ dựng thông số bằng JavaScript hoặc có cấu trúc riêng vẫn có
thể trả về ít trường. Khi đó kiểm tra cảnh báo và dùng file JSON/CSV để bổ sung
thông tin còn thiếu.

1. Chọn **Thêm** để tạo bản nháp hoặc chọn thẻ đang có.
2. Chọn **Nhận diện từ URL** để lấy dữ liệu từ dịch vụ trên máy, hoặc chọn
   **Nhập JSON/CSV** để tải file và xem trước từng trường, từng ảnh.
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

## Xuất file bằng dòng lệnh

Cài Node.js 22 hoặc mới hơn. Tại thư mục repository chạy:

```powershell
npm ci --prefix functions
npm run import-product -- --url "https://www.asus.com/link-san-pham/techspec/" --type Mainboard --out mainboard.json
```

Thay URL bằng trang sản phẩm thật. `--type` nhận Mainboard, CPU, RAM, SSD,
GPU hoặc PSU. File xuất ra có thể nhập trực tiếp trong quản trị.
Công cụ không yêu cầu Firebase CLI, đăng nhập Firebase hoặc bật Blaze;
không ghi lên Firestore. Nếu file đích đã tồn tại, chọn tên khác.

Các domain hỗ trợ và bộ nhận diện nằm trong `functions/extract.js`. Tái sử dụng
bộ đọc HTML, JSON-LD, bảng thông số và các mục heading phổ biến; trang chống
bot, chỉ dựng thông số bằng JavaScript hoặc có cấu trúc khác có thể không đọc
được đầy đủ. Không tự suy diễn thông số còn thiếu. Kiểm tra nguồn, ảnh và giá
trị trước khi lưu.

Backend Cloud Function cũ vẫn giữ trong repository để tham khảo. Dịch vụ local
được chọn để tránh yêu cầu gói Blaze; dữ liệu chỉ được ghi lên Firestore sau khi
người quản trị bấm lưu.
