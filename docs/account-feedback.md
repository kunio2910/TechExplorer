# Tài khoản cấu hình và phản hồi dữ liệu

Trang dựng cấu hình cho phép dùng bản nháp trên máy không đăng nhập. Mở “Tài khoản và cấu hình đám mây” để đăng ký/đăng nhập Email/Password, lưu từng cấu hình lên tài khoản và nhập bản sao về máy khác. Đăng ký người dùng không cấp quyền quản trị.

Firebase Authentication cần bật Email/Password. Triển khai quyền trước khi dùng tính năng mới:

```powershell
npx firebase-tools login --reauth
npx firebase-tools deploy --only firestore:rules --project techexplorer-38d83
```

Phản hồi gửi vào `dataReports`. Quản trị vào Cài đặt → Phản hồi dữ liệu để xem, mở thiết bị và chuyển trạng thái. Khách chỉ được tạo báo cáo với nội dung giới hạn; không được đọc báo cáo của người khác. Collection nhận báo cáo công khai cần được theo dõi lượng ghi và có thể bổ sung App Check/giới hạn tốc độ khi mở rộng lưu lượng.

Cấu hình lưu tại `users/{uid}/builds/{id}`. Chỉ chủ tài khoản được đọc/ghi. Giao diện không tự ghi đè danh sách cấu hình trên máy khi đăng nhập; nhập bản sao giữ lại bản hiện tại.

Nếu Rules chưa triển khai, thao tác gửi/lưu sẽ báo thất bại và không thông báo đã đồng bộ thành công.
