---
description: Quy trình 7 bước phát triển Module Full-stack áp dụng cho MỌI DỰ ÁN
auto_execution_mode: 2
---

# 📋 QUY TẮC LÀM VIỆC THEO MODULE (Universal Framework)

Quy trình này áp dụng cho lộ trình phát triển của **bất kỳ dự án Web/App Full-stack nào**.
> **Nguyên tắc cốt lõi:** Hoàn thành logic từ dưới lên trên (Bottom-Up) và tuần tự theo từng module. Module sau chỉ bắt đầu khi module trước đã hoàn thành.

---

## 📌 Tổng quan Quy trình 7 Bước
Mỗi chức năng (module) phải trải qua 7 bước dưới đây. **Tuyệt đối không nhảy bước.** Mọi chi tiết về tiến độ đều phải được cập nhật vào báo cáo (`report.md`) của module đó.

```
┌─────────────────────────────────────────────────────────────┐
│  Step 0   plan_implement.md (Lập kế hoạch & Thiết kế)       │
│  Step 1   Tạo Database (Schema + Migration + Seed)          │
│  Step 2   Mapping Data (Foreign Keys & Reference)           │
│  Step 3   Backend API (Routes → Controller → Usecase/Repo)  │
│  Step 4   Test Endpoint (Unit + Integration - BẮT BUỘC)     │
│  Step 5   Xây dựng Frontend (CHỈ khi Step 4 FULL PASS ✅)   │
│  Step 6   Test Userflow (E2E + Manual testing)              │
│  Step 7   Final Check → Review lại báo cáo report.md        │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔎 Chi tiết từng bước

### Step 0 — Khởi tạo Kế hoạch (`plan_implement.md`)
- **Mục tiêu:** Định hình scope, data model, và API endpoint trước khi viết bất kỳ dòng code logic nào.
- **Nội dung bắt buộc:**
  1. Mô tả nghiệp vụ module.
  2. Các Entities/Bảng Data model cần thiết.
  3. Liệt kê các Dependencies (Module nào phải xong trước thì module này mới hoạt động?).
  4. Danh sách các API Endpoints.
  5. Business rules & Acceptance Criteria.

### Step 1 — Tạo Database & Seed
- Cập nhật Schema Database (Ví dụ: schema.prisma, DDL,...).
- Tạo Migration.
- Tạo dữ liệu mẫu (Seed Data) đủ các trạng thái để test.
- Đảm bảo Soft Delete (`deletedAt`) nếu dự án yêu cầu, và Indexing các cột thường xuyên query.

### Step 2 — Mapping Data & Relational Constraints
- Kiểm tra các liên kết Khóa ngoại (Foreign Keys) với các module khác.
- Tạo hoặc kiểm tra Data Mapper / DTO layer.
- Đảm bảo việc query cross-module có thể thực hiện chính xác và hiệu quả.

### Step 3 — Triển khai Backend API
- Build luồng API chuẩn hóa: `Routes` → `Controller` → `Usecase / Service` → `Repository`.
- **Nguyên tắc:** 
  - Controller không chứa logic xử lý (Chỉ nhận Req và trả Res).
  - Business logic phải nằm ở Usecase / Service / Domain.
  - Queries/Ghi data vào Database chỉ nằm ở Repository layer.
- Xử lý Authorization (RBAC) và Error Handling ngay tại API.

### Step 4 — Kiểm thử Backend (Test Endpoints)
- Viết Unit Tests cho domain layer và Integration Tests cho API.
- Bắt buộc phải cover các cases:
  - ✅ Happy Path
  - ❌ Invalid input (400)
  - 🔒 Unauthorized / Forbidden (401, 403)
  - 🔍 Not Found (404)
- **GATE:** Bắt buộc 100% test API pass mới được chuyển sang làm Frontend (Step 5).

### Step 5 — Xây dựng Frontend
- Chỉ bắt đầu khi Backend đã sẵn sàng và test pass 100%.
- Tách biệt API Network layer với Component (tạo các API services / custom hooks).
- Mọi action (API call) đều phải có xử lý đủ 3 trạng thái của giao diện: **Loading, Error, Empty**.
- Chú ý validate form và Responsive design.

### Step 6 — Test Userflow (E2E & Flow testing)
- Xác nhận End-to-End flow từ UI xuống đến DB.
- Kiểm tra lại các tương tác CRUD qua giao diện: Create -> Read list -> Update -> Delete.
- Đảm bảo flow permission ở Client chặn/hiển thị nút tương tác chính xác dựa vào token profile.

### Step 7 — Final Check Báo cáo (`report.md`)
- **LƯU Ý:** Tại *mỗi cuối một Step từ 1 tới 6*, Dev Agent BẮT BUỘC phải tự động ghi log/update thông tin vào file `report.md`.
- Khi đến **Step 7**, công việc duy nhất là **Review (Kiểm tra lại toàn bộ file báo cáo)** để đảm bảo: 
  - Test coverage đã được ghi đủ.
  - Known issues / Bugs tồn đọng chưa sát sao.
  - Bảng API list & Entity list đã phản ánh đúng thực tế code hiện tại.

---

## ⚡ 5 Quy Tắc Vàng (Golden Rules)

1. **Không nhảy cóc:** Đặc biệt là việc code Frontend khi Backend API chưa xong (chưa qua test pass).
2. **Review DB Schema cẩn thận:** Design schema sai ở Step 1 sẽ khiến mọi step sau đổ vỡ. 
3. **Luôn có Seed Data:** Không có seed data, bạn không thể test được API hiệu quả tại BE, cũng như test UI tại FE.
4. **Không Cross-Domain trực tiếp dưới DB:** Khi muốn tương tác với dữ liệu của module A từ module B, hãy gọi Interface / Service của Module A, không trực tiếp chọc vào bảng/repository của DB Module A.
5. **Report là nguồn sự thật (Source of Truth):** Tiến độ duy nhất mà Project Manager hay Team xem là trạng thái nằm trong file `report.md`. Đừng quên update nó.
