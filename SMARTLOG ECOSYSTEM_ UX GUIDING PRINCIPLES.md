# SMARTLOG ECOSYSTEM: UX GUIDING PRINCIPLES
[cite_start]**Phiên bản 2.3 (Nâng cấp toàn diện)** [cite: 4]  
[cite_start]**Tháng 3, 2026** [cite: 5]

---

## 1. Tầm nhìn và Triết lý thiết kế
### 1.1 Tuyên bố tầm nhìn
[cite_start]Hệ sinh thái Smartlog hướng tới mục tiêu người dùng có thể hiểu và vận hành hệ thống trong **10 phút đầu tiên**, ra quyết định nhanh hơn **30-50%**, và giảm **40-60%** nhu cầu hỗ trợ sau go-live[cite: 13]. [cite_start]Các con số này dựa trên nghiên cứu của Nielsen Norman Group (2023)[cite: 14].

### 1.2 Bài toán cốt lõi
[cite_start]Thách thức lớn nhất là người dùng không hiểu mô hình tư duy (mental model) của hệ thống[cite: 19]. [cite_start]Khoảng 70% dự án chuyển đổi số thất bại do thiếu sự thích nghi (adoption)[cite: 20].

| Nền tảng | Vai trò |
| :--- | :--- |
| **OMS** | [cite_start]Tiếp nhận và quản lý đơn hàng [cite: 18] |
| **SC Planning** | [cite_start]Lập kế hoạch demand, inventory, production [cite: 18] |
| **WMS** | [cite_start]Quản lý kho, inbound/outbound [cite: 18] |
| **TMS** | [cite_start]Vận tải, route, carrier [cite: 18] |
| **Marketplace** | [cite_start]Kết nối shipper, carrier, 3PL, seller [cite: 18] |
| **Control Tower** | [cite_start]Giám sát toàn chuỗi, dự báo, ra quyết định [cite: 18] |

### 1.3 Ba trụ cột thiết kế
* [cite_start]**Trụ cột 1:** Thiết kế theo cách con người vận hành (workflow), không phải theo cấu trúc database[cite: 22, 23].
* [cite_start]**Trụ cột 2:** Hệ thống gợi ý quyết định thay vì chỉ hiển thị dữ liệu[cite: 24, 25].
* [cite_start]**Trụ cột 3:** Nhất quán xuyên suốt hệ sinh thái về ngôn ngữ UX và logic điều hướng[cite: 26, 27].

---

## 2. Nền tảng lý thuyết & Nguyên lý bổ trợ
### 2.1 Systems Thinking trong UX
* [cite_start]**Emergence:** Trải nghiệm tổng thể phải như một dòng chảy liên tục giữa các hệ thống[cite: 31, 32].
* [cite_start]**Feedback Loops:** Mọi hành động phải có phản hồi rõ ràng (ví dụ: đổi route trong TMS phải ảnh hưởng đến lịch WMS)[cite: 33, 34].
* [cite_start]**Interconnectedness:** Cho phép drill-down dữ liệu gốc xuyên hệ thống mà không cần chuyển màn hình[cite: 35, 36].
* [cite_start]**Leverage Points:** Tập trung vào Planning Board, Exception Dashboard và Control Tower[cite: 37, 38].

### 2.2 Các định luật UX bổ trợ
* [cite_start]**Hick’s Law:** Giảm lựa chọn để tăng tốc quyết định[cite: 43].
* [cite_start]**Jakob’s Law:** Sử dụng các pattern quen thuộc như Cmd+K hoặc Kanban[cite: 44].
* [cite_start]**Fitts’s Law:** Nút hành động tối thiểu 44x44 px trên thiết bị di động[cite: 46].
* [cite_start]**Miller’s Law:** Chia nhỏ thông tin (chunking), không quá 7 cột dữ liệu chính trong bảng[cite: 47].

### 2.3 Accessibility & Performance UX
* [cite_start]**Accessibility First:** Tuân thủ WCAG 2.1 AA[cite: 49]. [cite_start]Mọi màu sắc phải có chỉ báo phụ (icon, text) cho người mù màu[cite: 51]. [cite_start]Độ tương phản tối thiểu 4.5:1[cite: 52].
* [cite_start]**Performance:** Thao tác đơn giản cần phản hồi dưới 200ms; load trang dưới 2 giây; báo cáo phức tạp cần Progress Bar[cite: 56].

---

## 3. 8 Nguyên lý UX cốt lõi
1.  [cite_start]**Workflow-First Navigation:** Điều hướng theo tiến trình nghiệp vụ thực tế[cite: 58].
2.  [cite_start]**Exception-First Dashboard:** Mặc định hiển thị vấn đề cần xử lý ngay[cite: 61].
3.  [cite_start]**One-Screen Operations:** Hoàn thành task cốt lõi trên một màn hình, dưới 3 click[cite: 62, 63].
4.  [cite_start]**Visual-First, Data-Second:** Sử dụng hệ thống màu trạng thái thống nhất (Grey: Draft, Blue: Planned, Orange: In Transit, Green: Completed, Red: Delayed/Error)[cite: 64, 66].
5.  [cite_start]**System-Suggest, Human-Approve:** AI đề xuất để người dùng duyệt hoặc điều chỉnh[cite: 68, 69].
6.  [cite_start]**Progressive Complexity:** Phân tầng tính năng từ cơ bản đến chuyên gia theo thời gian sử dụng[cite: 70, 71].
7.  [cite_start]**Cross-Platform Consistency:** Nhất quán về Sidebar, hệ thống màu, thư viện component và thuật ngữ[cite: 72, 73, 74, 76].
8.  [cite_start]**Error Recovery UX:** Cung cấp lựa chọn thử lại (retry), tự động lưu nháp và có chức năng Undo/Soft Delete cho hành động xóa[cite: 78, 80, 81].

---

## 4. Design Patterns & Onboarding
### 4.1 Các Pattern quan trọng
* [cite_start]**Bulk Operations:** Cho phép chọn tất cả trang (Select All Across Pages), xem trước ảnh hưởng và xử lý ngầm (background processing)[cite: 108, 109, 110, 111].
* [cite_start]**Mobile & Offline-First:** Tối ưu hóa cảm ứng và sử dụng Optimistic UI để hiển thị kết quả local trước khi server xác nhận[cite: 112, 115, 118].
* [cite_start]**Notification:** Phân loại cảnh báo để tránh gây mệt mỏi cho người dùng (Alert Fatigue)[cite: 120, 121, 122].

### 4.2 Onboarding (10-Minute First Success)
* [cite_start]Người dùng mới phải đạt thành công đầu tiên trong 10 phút[cite: 125, 126].
* [cite_start]Sử dụng **Sandbox Mode** với dữ liệu demo để người dùng hiểu hệ thống nhanh chóng[cite: 130, 131].
* [cite_start]Mục tiêu: Thời gian đào tạo dưới 4 giờ (giảm từ 2-3 ngày)[cite: 133].

---

## 5. AI Governance & Security
### 5.1 Quản trị AI (Risk-based)
* [cite_start]**Rủi ro thấp:** AI tự động áp dụng (ví dụ: điền form)[cite: 140].
* [cite_start]**Rủi ro trung bình:** AI đề xuất, người dùng xác nhận (ví dụ: lộ trình)[cite: 140].
* [cite_start]**Rủi ro cao:** AI chỉ cảnh báo, người dùng tự xử lý (ví dụ: chia tách lô hàng)[cite: 140].
* **Explainability (XAI):** Luôn có nút "Tại sao?" [cite_start]để giải thích logic của AI[cite: 141].

### 5.2 Security & Privacy UX
* [cite_start]**RBAC:** Ẩn hoàn toàn tính năng không có quyền truy cập[cite: 181].
* [cite_start]**Data Masking:** Che giấu thông tin nhạy cảm (giá cước, thông tin khách hàng) theo vai trò[cite: 182].
* [cite_start]**Audit Trail:** Ghi nhật ký mọi thay đổi dữ liệu quan trọng[cite: 184].

---

## 6. Đo lường & Best Practices 2024-2025
* [cite_start]**HEART Framework:** Đo lường Hạnh phúc (CSAT ≥ 4.0), Sự gắn kết (DAU ≥ 60%), và Sự chấp nhận (Adoption ≥ 40%)[cite: 190, 191].
* [cite_start]**Dark Mode:** Tự động chuyển đổi và đảm bảo độ tương phản cho các màu trạng thái[cite: 209, 210, 211].
* [cite_start]**Sustainability UX:** Hiển thị phát thải CO2 (GLEC Framework) và gắn nhãn "Green Choice" cho các lộ trình tối ưu[cite: 213, 214, 217].