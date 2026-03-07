---
trigger: manual
---

---
trigger: always_on
---

---
name: Fullstack Engineering Rules
description: Quy tắc kiến trúc và coding chuẩn cho môi trường NestJS / NodeJS / TypeScript / Frontend, dùng chung cho developer và AI assistant.
---

# Fullstack Engineering Rules

## 1. Mục tiêu

Thiết lập chuẩn làm việc thống nhất giữa developer và AI assistant để code sinh ra:
- đúng pattern hiện có của dự án
- dễ đọc, dễ test, dễ mở rộng
- không sinh file dư
- không để dead code
- có typing rõ ràng
- có cấu trúc sạch
- ưu tiên maintainability hơn cleverness

## 2. Nguyên tắc cốt lõi

- Luôn xem pattern hiện có trong dự án trước khi code tính năng mới.
- Đọc code ở các màn hình/module tương tự để hiểu cách hệ thống đang xử lý authentication, authorization, validation, error handling và data flow.
- Không tự sáng tạo nếu dự án đã có pattern chuẩn.
- Ưu tiên consistency hơn “viết lại cho đẹp”.
- Nghe feedback của developer và sửa theo feedback, không tranh luận dài dòng khi yêu cầu đã rõ.
- AI là cộng sự hỗ trợ triển khai, developer là người quyết định kiến trúc cuối cùng.

## 3. Tách lớp quy tắc

Hệ thống quy tắc được chia thành:
- Core Rules
- Backend Architecture Rules
- Frontend Architecture Rules
- AI Collaboration Rules

Nếu hiện tại chưa tách file, vẫn phải giữ tư duy tách concern trong cùng một file.

## 4. Coding Standards chung

### Naming Convention
- Biến: `camelCase`
- Hàm: `camelCase`
- Class / DTO / Entity / Interface / Enum: `PascalCase`
- Hằng số: `UPPER_SNAKE_CASE`
- Thư mục: `kebab-case`
- Route: `kebab-case`

### Naming Rules
- Đặt tên theo hành vi hoặc ý nghĩa nghiệp vụ.
- Tránh tên mơ hồ như `data`, `item`, `handleStuff`, `processData`.
- Tốt hơn:
  - `getUserProfile`
  - `validateAccessToken`
  - `buildCourseOverview`
- Kém hơn:
  - `getData`
  - `handleLogic`
  - `doProcess`

## 5. Clean Code Rules

### Function Rules
- Mỗi function chỉ làm một việc chính.
- Ưu tiên function ngắn, dễ đọc; 20 dòng là guideline, không phải luật cứng.
- Async/I/O phải có error handling phù hợp theo layer.
- Không dùng `any` nếu có thể định nghĩa type rõ.
- Trả về kiểu dữ liệu cụ thể.

### Class Rules
- Mỗi class có một trách nhiệm chính.
- Tránh class quá lớn; nếu vượt khoảng 300 dòng, phải xem xét tách logic.
- Không hardcode business rules trong nhiều nơi.
- Dùng dependency injection thay vì import trực tiếp implementation.

### Comment Rules
- Comment tại sao, không comment điều hiển nhiên.
- Với logic phức tạp, viết comment ngắn ở mức decision hoặc trade-off.
- Nếu tên hàm đã đủ rõ, không thêm comment thừa.

## 6. Không sinh code dư

- Không tạo file nếu chưa thực sự cần.
- Không tạo abstraction sớm khi hệ thống chưa cần.
- Không để dead code, unused imports, unused DTOs, unused services.
- Không tạo helper/general utils mơ hồ chỉ để “dọn code”.
- Mọi file mới phải có mục đích rõ ràng.

## 7. Backend Rules

### Backend stack mặc định
- NestJS
- Node.js
- TypeScript strict mode
- Dependency Injection
- Module-based architecture
- Clean Architecture khi phù hợp quy mô dự án

