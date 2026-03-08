# SWM Authentication & Access Control Module Specification

**Document version:** 1.0  
**Perspective:** Business Analyst (15 years experience)  
**Audience:** Product Owner, BA, Solution Architect, Backend Dev, Frontend Dev, QA, Dev Intern, Dev mới  
**System:** SWM – Warehouse Management System for Thoresen Vina Logistics  
**Module name:** Authentication & Access Control (Auth)

---

## 1. Mục tiêu tài liệu

Tài liệu này đặc tả đầy đủ module **Auth** của hệ thống SWM để team phát triển có thể hiểu rõ:

- Auth dùng để làm gì trong toàn hệ thống.
- Những thành phần nào thuộc phạm vi Auth, thành phần nào không thuộc Auth.
- Luồng đăng nhập, xác thực, phân quyền, chọn kho làm việc, quản lý phiên đăng nhập.
- Quy tắc bảo mật, ràng buộc nghiệp vụ và acceptance criteria.
- Cách Auth liên kết với các module 1 → 11 hiện có.

Tài liệu được viết theo hướng dễ hiểu, ưu tiên cho dev intern và dev mới vẫn có thể đọc và nắm được bức tranh tổng thể trước khi code.

---

## 2. Tóm tắt điều hành

Trong SWM, **Auth không chỉ là màn hình login**. Đây là module nền tảng chịu trách nhiệm xác định:

1. **Ai đang sử dụng hệ thống** – authentication.
2. **Người đó được làm gì** – authorization / permission.
3. **Người đó được nhìn thấy dữ liệu nào** – data scope.
4. **Người đó đang thao tác ở kho nào** – warehouse context.
5. **Phiên làm việc còn hợp lệ hay không** – session/token control.
6. **Khi user bị khóa, đổi quyền, nghỉ việc thì hệ thống phản ứng thế nào** – revocation.
7. **Mọi truy cập quan trọng có bị ghi audit không** – security auditability.

Nếu module Auth thiết kế sai, toàn bộ hệ thống có thể gặp các vấn đề nghiêm trọng:

- User xem sai dữ liệu của owner khác.
- User thực hiện action vượt quyền như manual weight, inventory adjustment, lock debit note.
- User nghỉ việc nhưng vẫn dùng token cũ để truy cập.
- Customer Viewer nhìn thấy dữ liệu không thuộc owner của mình.
- UI chặn nhưng API không chặn, dẫn đến bypass bằng Postman/mobile request.

Vì vậy, Auth là **module nền bắt buộc** và phải được thiết kế theo nguyên tắc: **backend là lớp kiểm quyền cuối cùng**.

---

## 3. Phạm vi module Auth

## 3.1 Bao gồm trong phạm vi

Module Auth của SWM bao gồm các năng lực sau:

1. Đăng nhập bằng username/password.
2. Quản lý mật khẩu và chính sách mật khẩu.
3. Phát hành access token / refresh token.
4. Đăng xuất thiết bị hiện tại hoặc tất cả thiết bị.
5. Chọn **warehouse context** sau khi đăng nhập nếu user được gán nhiều kho.
6. Xác thực request ở Web, Mobile và API.
7. Áp dụng role-based access control theo baseline role của hệ thống.
8. Áp dụng data scope theo warehouse / owner / channel.
9. Thu hồi phiên đăng nhập khi user bị deactivate hoặc bị thay đổi quyền.
10. Ghi security audit cho các sự kiện auth quan trọng.
11. Hỗ trợ nền tảng để sau này có thể mở rộng SSO / Active Directory.

## 3.2 Không bao gồm trong phạm vi

Những phần sau **có liên quan** nhưng không phải trách nhiệm chính của module Auth:

- Thiết kế chi tiết permission matrix cho từng action nghiệp vụ: thuộc governance của Module 1.
- Quản lý user master / role master / permission master ở góc độ admin UI: có thể nằm chung với Module 1.
- Audit reporting tổng hợp: thuộc Module 11.
- Business approval workflow: thuộc Module 1 và các module nghiệp vụ.
- Notification / OTP / email infrastructure nâng cao: có thể thuộc module platform hoặc phase sau.

---

## 4. Mối quan hệ với tài liệu hiện có

Module Auth được suy ra và bám sát các nguyên tắc đã xuất hiện trong bộ spec hiện tại:

- Hệ thống có **8 role baseline** như ADMIN, WH_MANAGER, WH_KEEPER, WB_OPERATOR, BILLING_OFC, OPS_SUPER, WH_ADMIN, CUST_VIEWER.
- Web và Mobile đều có màn hình **Login + Warehouse selector**.
- Permission phải được kiểm ở **backend**, không chỉ ở UI.
- Customer Viewer chỉ được thấy dữ liệu của **owner mình**.
- Khi **deactivate user**, mọi session phải bị revoke ngay.
- Hệ thống định hướng dùng **JWT + RBAC middleware**.
- Có định hướng mở rộng **SSO / Active Directory integration** trong tương lai.

Do đó, tài liệu này đặc tả Auth thành một module logic riêng để đội dev triển khai chuẩn và nhất quán.

---

## 5. Mục tiêu nghiệp vụ của module Auth

Module Auth phải đạt các mục tiêu nghiệp vụ sau:

1. Chỉ user hợp lệ mới vào được hệ thống.
2. Mỗi user chỉ được thao tác trong phạm vi role và scope được cấp.
3. Một user có thể được gán một hoặc nhiều kho, nhưng tại một thời điểm request phải có warehouse context rõ ràng.
4. Mọi thay đổi quyền phải có hiệu lực đủ nhanh để tránh dùng token cũ tiếp tục thao tác trái phép.
5. Hệ thống phải đủ an toàn cho cả user nội bộ lẫn customer viewer.
6. Dev có thể dùng chung cơ chế Auth cho Web, Mobile và API integration nội bộ.
7. QA có thể test được các case security và negative case một cách minh bạch.

---

## 6. Thuật ngữ

| Thuật ngữ | Giải thích |
|---|---|
| Authentication | Xác minh người dùng là ai |
| Authorization | Xác định người dùng được phép làm gì |
| Access Token | Token ngắn hạn dùng để gọi API |
| Refresh Token | Token dài hơn dùng để xin access token mới |
| Session | Phiên làm việc logic của user trên một thiết bị / app instance |
| Role | Vai trò vận hành, ví dụ WH_MANAGER |
| Permission | Quyền hành động cụ thể như create receipt, manual weight |
| Data Scope | Phạm vi dữ liệu được phép thấy, ví dụ theo warehouse hoặc owner |
| Warehouse Context | Kho đang được chọn để thao tác tại thời điểm hiện tại |
| Owner Scope | Phạm vi chủ hàng; đặc biệt quan trọng cho CUST_VIEWER |
| Revocation | Thu hồi hiệu lực token/session |
| Security Audit | Nhật ký bảo mật cho login, logout, failed login, revoke, denied access |

---

## 7. Vai trò của Auth trong kiến trúc tổng thể

Auth là module cắt ngang toàn hệ thống. Mọi module khác đều phụ thuộc vào Auth.

### 7.1 Auth đứng trước mọi request nghiệp vụ

Luồng tổng quát:

1. User mở Web hoặc Mobile.
2. User đăng nhập.
3. Hệ thống xác thực danh tính.
4. Hệ thống phát access token và refresh token.
5. User chọn kho nếu có nhiều warehouse scope.
6. User gọi API nghiệp vụ.
7. API gateway hoặc auth middleware xác thực token.
8. Hệ thống nạp role + permission + data scope.
9. Hệ thống cho phép hoặc từ chối request.
10. Nếu request hợp lệ mới đi tiếp vào service nghiệp vụ.

### 7.2 Auth khác với Module 1 như thế nào

- **Auth** tập trung vào: đăng nhập, phiên đăng nhập, token, xác thực user, gắn context kho, revoke phiên.
- **Module 1 – Foundation & Governance** tập trung vào: role catalog, permission matrix, approval boundary, audit baseline, policy nền.

Nói ngắn gọn:

- Module 1 trả lời: **quyền nào tồn tại**.
- Auth trả lời: **user hiện tại có quyền gì và request này có được đi tiếp không**.

---

## 8. Actor của module Auth

| Actor | Mô tả | Dùng Web | Dùng Mobile | Ghi chú |
|---|---|---|---|---|
| ADMIN | Quản trị hệ thống | Có | Có thể có | Quản lý user, reset password, khóa tài khoản |
| WH_MANAGER | Quản lý kho | Có | Có | Có quyền cao trong vận hành |
| WH_KEEPER | Thủ kho / vận hành | Có | Có | Chủ yếu dùng mobile cho execution |
| WB_OPERATOR | Nhân viên cân | Có | Có | Dùng cho weigh in/out và OCR |
| BILLING_OFC | Kế toán/billing | Có | Không bắt buộc | Dùng web chính |
| OPS_SUPER | Giám sát | Có | Có | Chủ yếu dashboard và approve work |
| WH_ADMIN | Admin kho | Có | Có thể có | Có thể được giữ hoặc gộp theo quyết định cuối |
| CUST_VIEWER | Khách hàng xem dữ liệu | Có | Không bắt buộc | Chỉ read-only theo owner scope |
| System Integration | Tác nhân hệ thống | Không | Không | Dùng service account/API credential phase sau |

---

## 9. Năng lực chức năng chính

Module Auth nên được chia thành 10 nhóm chức năng chính.

### 9.1 User Login

Cho phép user đăng nhập bằng username/password.

### 9.2 Token & Session Management

Phát hành token, làm mới token, revoke token, logout.

### 9.3 Warehouse Context Selection

Sau đăng nhập, user phải xác định đang thao tác ở kho nào nếu được gán nhiều kho.

### 9.4 Role & Permission Resolution

Xác định role chính, role bổ sung, permission hiệu lực tại thời điểm request.

### 9.5 Data Scope Enforcement

Lọc dữ liệu theo warehouse, owner, channel, customer boundary.

### 9.6 Password & Account Security

Đổi mật khẩu, reset mật khẩu, chính sách mạnh/yếu, số lần sai.

### 9.7 Session Revocation

Thu hồi hiệu lực session khi đổi quyền, khóa user, đổi mật khẩu hoặc logout all.

### 9.8 Auth Audit Logging

Ghi nhật ký cho login success/fail, logout, refresh, revoke, locked account, denied access.

### 9.9 Device / Channel Awareness

Phân biệt web, mobile, API integration để log và áp policy phù hợp.

### 9.10 Future-ready SSO Extension

Thiết kế schema và interface đủ mở để sau này kết nối Active Directory / SSO mà không phải phá kiến trúc hiện tại.

---

## 10. Các sub-module đề xuất

Để dev intern dễ hiểu, có thể hình dung Auth gồm 6 sub-module logic:

### 10.1 Sub-module A – Identity & Account

Quản lý định danh user, trạng thái tài khoản, thông tin đăng nhập, role chính.

### 10.2 Sub-module B – Credential Management

Quản lý password hash, password policy, password history, reset flow.

### 10.3 Sub-module C – Session & Token

Quản lý access token, refresh token, device session, revoke version.

### 10.4 Sub-module D – Access Context

Quản lý warehouse scope, owner scope, selected warehouse, channel policy.

### 10.5 Sub-module E – Authorization Bridge

Là lớp nối giữa Auth và Module 1 để lấy permission matrix hiệu lực cho user.

### 10.6 Sub-module F – Security Audit

Lưu lại các sự kiện bảo mật và truy cập bị từ chối.

---

## 11. Dữ liệu đầu vào và đầu ra của module

## 11.1 Input

| Input | Mô tả |
|---|---|
| User master | Danh sách tài khoản người dùng |
| Role assignment | User được gán role nào |
| Warehouse assignment | User được gán kho nào |
| Owner assignment | Scope owner cho CUST_VIEWER hoặc role đặc biệt |
| Permission matrix | Lấy từ Module 1 |
| Password policy | Chính sách bảo mật mật khẩu |
| Login request | username, password, device info, channel |
| Refresh request | refresh token còn hiệu lực |
| Account status | active / locked / disabled / force_change_password |

## 11.2 Output

| Output | Mô tả |
|---|---|
| Access token | Token ngắn hạn cho API |
| Refresh token | Token để renew session |
| User profile | Thông tin cơ bản user |
| Effective roles | Role đang có hiệu lực |
| Warehouse scope | Các kho user được quyền truy cập |
| Selected warehouse | Kho user đang thao tác |
| Owner scope | Owner được phép xem |
| Effective permissions | Danh sách quyền hiệu lực |
| Security audit log | Nhật ký bảo mật |
| Access denied response | Phản hồi 401/403 có chuẩn mã lỗi |

---

## 12. User story tổng quát

### US-AUTH-001 – Đăng nhập thành công

**Là** người dùng hợp lệ  
**Tôi muốn** đăng nhập vào hệ thống bằng tài khoản của mình  
**Để** truy cập các chức năng được phân quyền.

### US-AUTH-002 – Chọn kho làm việc

**Là** user được gán nhiều kho  
**Tôi muốn** chọn kho làm việc sau đăng nhập  
**Để** dữ liệu và thao tác chỉ diễn ra trong đúng warehouse context.

### US-AUTH-003 – Bị chặn khi sai mật khẩu nhiều lần

**Là** hệ thống  
**Tôi muốn** khóa hoặc tạm khóa tài khoản khi đăng nhập sai nhiều lần  
**Để** giảm rủi ro brute-force.

### US-AUTH-004 – Thu hồi session khi deactivate user

**Là** admin hoặc hệ thống  
**Tôi muốn** revoke mọi session của user ngay khi user bị deactive  
**Để** tránh truy cập trái phép.

### US-AUTH-005 – Customer Viewer chỉ xem dữ liệu owner của mình

**Là** CUST_VIEWER  
**Tôi muốn** chỉ xem dữ liệu thuộc owner được gán cho tài khoản  
**Để** bảo mật dữ liệu khách hàng.

### US-AUTH-006 – Đổi quyền phải có hiệu lực nhanh

**Là** admin  
**Tôi muốn** khi đổi role/permission của user thì request kế tiếp phải chịu quyền mới  
**Để** giảm rủi ro dùng token cũ tiếp tục thao tác.

---

## 13. Luồng nghiệp vụ chính

## 13.1 Luồng đăng nhập cơ bản

### Mục tiêu

Cho phép user vào hệ thống an toàn.

### Pre-condition

- User tồn tại.
- Tài khoản đang active.
- Password hợp lệ.
- User có ít nhất một role hợp lệ.
- User có warehouse scope nếu role đó cần warehouse context.

### Main flow

1. User mở ứng dụng Web hoặc Mobile.
2. User nhập username và password.
3. Client gửi request login kèm device info và channel.
4. Hệ thống tìm user theo username.
5. Nếu không tồn tại → trả lỗi đăng nhập thất bại.
6. Nếu tồn tại nhưng inactive / locked → trả lỗi phù hợp.
7. Hệ thống verify password hash.
8. Nếu sai password → tăng failed_attempt_count.
9. Nếu đúng password → reset failed_attempt_count.
10. Hệ thống nạp role assignment, warehouse assignment, owner scope.
11. Hệ thống kiểm tra force_change_password nếu có.
12. Hệ thống tạo session record.
13. Hệ thống phát access token và refresh token.
14. Nếu user có 1 warehouse hợp lệ và policy cho phép auto-select → hệ thống set selected warehouse mặc định.
15. Nếu user có nhiều warehouse → client yêu cầu user chọn warehouse.
16. Hệ thống trả về token, profile, warehouse scopes, flags cần thiết.

### Output

- Login success.
- Token hợp lệ.
- Session được tạo.
- Có hoặc chưa có selected warehouse.

### Post-condition

- User đã có phiên đăng nhập.
- Các request tiếp theo dùng access token.

---

## 13.2 Luồng đăng nhập thất bại nhiều lần

1. User nhập sai password.
2. Hệ thống tăng số lần sai.
3. Khi vượt ngưỡng quy định, tài khoản bị tạm khóa hoặc khóa theo policy.
4. Hệ thống ghi security log `LOGIN_FAILED` hoặc `ACCOUNT_LOCKED`.
5. User không thể tiếp tục đăng nhập cho tới khi hết thời gian lock hoặc được admin xử lý.

**Khuyến nghị policy P1:** khóa tạm 15 phút sau 5 lần sai liên tiếp.  
**Khuyến nghị policy P2:** admin có thể unlock thủ công.

---

## 13.3 Luồng refresh token

1. Access token hết hạn.
2. Client gửi refresh token.
3. Hệ thống kiểm tra refresh token có tồn tại, chưa revoke, chưa hết hạn, session còn active.
4. Hệ thống kiểm tra user vẫn active, role/version chưa bị revoke.
5. Nếu hợp lệ, cấp access token mới và có thể xoay refresh token mới.
6. Nếu không hợp lệ, trả `401` và yêu cầu login lại.

---

## 13.4 Luồng logout thiết bị hiện tại

1. User bấm logout.
2. Client gửi request logout.
3. Hệ thống revoke session hiện tại hoặc đánh dấu token không còn hợp lệ.
4. Hệ thống ghi audit `LOGOUT_SUCCESS`.
5. Client xóa token local.

---

## 13.5 Luồng logout tất cả thiết bị

1. User hoặc admin chọn logout all.
2. Hệ thống revoke toàn bộ session đang active của user.
3. Các thiết bị khác sẽ bị từ chối ở request kế tiếp hoặc refresh kế tiếp.
4. Hệ thống ghi audit `LOGOUT_ALL` / `SESSION_REVOKED`.

---

## 13.6 Luồng chọn kho làm việc

### Khi nào cần

- User được gán nhiều kho.
- Dữ liệu nghiệp vụ phụ thuộc warehouse context.

### Flow

1. User login thành công.
2. Hệ thống trả danh sách warehouse được gán.
3. User chọn một warehouse.
4. Hệ thống xác minh warehouse đó nằm trong scope của user.
5. Hệ thống cập nhật selected warehouse cho session hiện tại.
6. Từ các request sau, backend đọc warehouse context từ token/session/header theo chuẩn thiết kế.

### Quy tắc bắt buộc

- User không được chọn kho ngoài scope.
- Nếu chưa có warehouse context mà gọi API cần kho, backend phải từ chối.
- Không được chỉ dựa vào warehouse_id client gửi lên mà bỏ qua kiểm scope.

---

## 13.7 Luồng đổi mật khẩu

1. User đã login.
2. User nhập mật khẩu cũ, mật khẩu mới, xác nhận mật khẩu mới.
3. Hệ thống verify mật khẩu cũ.
4. Hệ thống kiểm tra policy của mật khẩu mới.
5. Hệ thống kiểm tra không trùng với password history gần nhất nếu policy bật.
6. Hệ thống cập nhật password hash mới.
7. Hệ thống tăng password_version hoặc revoke các session khác theo policy.
8. Hệ thống ghi audit `PASSWORD_CHANGED`.

---

## 13.8 Luồng reset mật khẩu bởi admin

1. ADMIN mở màn hình quản lý user.
2. ADMIN chọn reset password.
3. Hệ thống phát temporary password hoặc force_change_password flag.
4. User phải đổi mật khẩu ở lần login tiếp theo.
5. Hệ thống revoke session cũ nếu policy yêu cầu.
6. Audit bắt buộc ghi `PASSWORD_RESET_BY_ADMIN`.

---

## 13.9 Luồng deactivate user

1. Admin deactive tài khoản.
2. Hệ thống đổi account status thành `INACTIVE`.
3. Hệ thống revoke toàn bộ session active của user.
4. Từ request tiếp theo, mọi token/session cũ phải bị từ chối.
5. Dữ liệu lịch sử vẫn giữ nguyên theo audit trail.

Đây là yêu cầu nghiệp vụ rất quan trọng vì đã được định hướng rõ trong tài liệu hiện có.

---

## 13.10 Luồng thay đổi role hoặc scope của user

1. Admin đổi role, warehouse assignment hoặc owner assignment.
2. Hệ thống lưu assignment mới.
3. Hệ thống tăng `auth_version` hoặc cơ chế tương đương.
4. Token cũ không còn được coi là fully valid ở request tiếp theo khi authorize lại.
5. Hệ thống nạp lại effective permission theo cấu hình mới.
6. Audit log bắt buộc lưu before/after.

---

## 14. Quy tắc nghiệp vụ chi tiết

## 14.1 Quy tắc đăng nhập

1. Username là duy nhất trong hệ thống.
2. Hệ thống không trả thông tin quá chi tiết kiểu “username đúng nhưng password sai” để tránh lộ thông tin.
3. Login phải log được channel, device info, IP hoặc nguồn request nếu có.
4. User inactive hoặc locked không được login.
5. User không có role hiệu lực không được vào hệ thống nghiệp vụ.

## 14.2 Quy tắc mật khẩu

1. Password phải được lưu dưới dạng hash, không lưu plain text.
2. Không được trả password gốc qua API.
3. Chính sách tối thiểu khuyến nghị:
   - ít nhất 8 ký tự;
   - có chữ hoa, chữ thường, số;
   - không trùng username;
   - không trùng N mật khẩu gần nhất nếu bật history.
4. Temporary password phải hết hạn hoặc bắt buộc đổi ở lần đăng nhập đầu tiên.

## 14.3 Quy tắc session/token

1. Access token nên ngắn hạn.
2. Refresh token dài hơn nhưng phải quản lý được revoke.
3. Mỗi lần login phải tạo session record riêng.
4. Hệ thống phải biết token thuộc session nào, user nào, device nào, channel nào.
5. Khi user bị deactivate, mọi session phải mất hiệu lực.
6. Khi role/scope bị đổi, session phải chịu quyền mới đủ nhanh.

## 14.4 Quy tắc warehouse context

1. User chỉ được thao tác trong warehouse đã được gán.
2. Một request nghiệp vụ phải xác định được warehouse context.
3. Với role toàn cục như ADMIN, có thể được phép xem nhiều kho nhưng vẫn nên có selected warehouse cho các action thao tác.
4. Với CUST_VIEWER, warehouse context không được phá vỡ owner scope.

## 14.5 Quy tắc owner scope

1. `CUST_VIEWER` chỉ xem dữ liệu thuộc owner được gán.
2. Export, API, dashboard, report đều phải bị filter như nhau.
3. Không được dùng deep link hoặc sửa request để xem owner khác.
4. Nếu user nội bộ có quyền xem nhiều owner, phạm vi đó phải được cấu hình rõ.

## 14.6 Quy tắc authorization

1. UI có thể ẩn nút, nhưng backend mới là nơi quyết định cuối cùng.
2. Các action nhạy cảm như manual weight, inventory adjustment, lock debit note phải kiểm quyền ở backend.
3. `401 Unauthorized` dùng cho trường hợp chưa xác thực hoặc token không hợp lệ.
4. `403 Forbidden` dùng cho trường hợp đã xác thực nhưng không đủ quyền/scope.
5. Request bị từ chối cho action nhạy cảm phải ghi audit `ACCESS_DENIED`.

## 14.7 Quy tắc audit

Phải log tối thiểu các sự kiện:

- login success
- login failed
- account locked
- password changed
- password reset by admin
- refresh token success/fail
- logout
- logout all
- session revoked
- access denied
- warehouse context changed
- role/scope changed

---

## 15. Permission và role baseline áp dụng cho Auth

## 15.1 Danh sách role baseline

| Role Code | Tên vai trò | Mục đích chính |
|---|---|---|
| ADMIN | System Admin | Toàn quyền hệ thống, user management, cấu hình |
| WH_MANAGER | Warehouse Manager | Quản lý vận hành kho và ngoại lệ |
| WH_KEEPER | Warehouse Keeper | Tác nghiệp kho |
| WB_OPERATOR | Weighbridge Operator | Vận hành cân/OCR/re-weigh |
| BILLING_OFC | Billing Officer | Billing, rate card, debit note |
| OPS_SUPER | Operations Supervisor | Dashboard, supervise, approve work |
| WH_ADMIN | Warehouse Admin | Role quản trị kho, có thể giữ hoặc gộp tùy quyết định |
| CUST_VIEWER | Customer Viewer | Chỉ xem dữ liệu thuộc owner mình |

## 15.2 Permission logic của Auth

Auth không tự nghĩ ra permission business, nhưng Auth phải support các nhóm quyền sau:

1. **Login permission** – tài khoản có được đăng nhập không.
2. **Channel permission** – role nào được dùng web, role nào được dùng mobile.
3. **Warehouse scope permission** – user vào được kho nào.
4. **Owner scope permission** – user thấy owner nào.
5. **Action permission** – user có được execute action cụ thể không.
6. **Admin auth permission** – ai được reset password, lock user, unlock user, revoke session.

## 15.3 Ví dụ mapping quan trọng

| Action | Role cho phép baseline | Ghi chú |
|---|---|---|
| Login Web | Hầu hết role được cấu hình cho web | CUST_VIEWER chủ yếu web |
| Login Mobile | WH_MANAGER, WH_KEEPER, WB_OPERATOR, OPS_SUPER và role được phép | Phụ thuộc channel policy |
| Reset password người khác | ADMIN | Có thể mở rộng cho WH_ADMIN tùy policy |
| Manual weight | WH_MANAGER | Backend phải enforce |
| Lock debit note | BILLING_OFC | Backend phải enforce |
| View own owner data | CUST_VIEWER | Bắt buộc filter owner scope |
| View cross-owner internal data | Role nội bộ được cấp | Không áp cho customer viewer |

---

## 16. Ma trận trạng thái tài khoản

| Trạng thái | Ý nghĩa | Có login được không | Có refresh được không |
|---|---|---|---|
| ACTIVE | Đang hoạt động | Có | Có |
| LOCKED | Bị khóa tạm/thủ công | Không | Không |
| INACTIVE | Đã ngưng sử dụng | Không | Không |
| FORCE_CHANGE_PASSWORD | Được login có điều kiện | Có, nhưng phải đổi mật khẩu | Có thể giới hạn theo policy |
| PASSWORD_EXPIRED | Hết hạn mật khẩu | Có điều kiện hoặc không | Tùy policy |

Khuyến nghị triển khai thực tế: `FORCE_CHANGE_PASSWORD` và `PASSWORD_EXPIRED` nên là flag đi kèm với status gốc `ACTIVE` để dễ quản lý hơn.

---

## 17. Ma trận lỗi chuẩn

| Error Code | HTTP | Ý nghĩa | Khi nào dùng |
|---|---|---|---|
| AUTH-401-INVALID-CREDENTIALS | 401 | Sai thông tin đăng nhập | Username/password không hợp lệ |
| AUTH-401-TOKEN-INVALID | 401 | Token không hợp lệ | Sai chữ ký, malformed |
| AUTH-401-TOKEN-EXPIRED | 401 | Token hết hạn | Access/refresh hết hạn |
| AUTH-401-SESSION-REVOKED | 401 | Session đã bị thu hồi | Logout all, deactivate user |
| AUTH-401-ACCOUNT-INACTIVE | 401 | Tài khoản không hoạt động | User inactive |
| AUTH-401-ACCOUNT-LOCKED | 401 | Tài khoản bị khóa | Do sai nhiều lần hoặc admin lock |
| AUTH-403-NO-PERMISSION | 403 | Không đủ quyền action | Đã login nhưng không đủ role |
| AUTH-403-OUT-OF-WAREHOUSE-SCOPE | 403 | Ngoài phạm vi kho | Chọn/đi vào kho không được gán |
| AUTH-403-OUT-OF-OWNER-SCOPE | 403 | Ngoài phạm vi owner | CUST_VIEWER truy cập owner khác |
| AUTH-403-WAREHOUSE-CONTEXT-REQUIRED | 403 | Chưa chọn kho | API cần kho nhưng session chưa có |
| AUTH-409-PASSWORD-POLICY-VIOLATION | 409 | Vi phạm policy mật khẩu | Đổi/reset mật khẩu không hợp lệ |

---

## 18. Phi chức năng và bảo mật

## 18.1 Security requirements

1. Password hash phải dùng thuật toán mạnh như Argon2 hoặc BCrypt.
2. Refresh token phải được lưu an toàn và có thể revoke.
3. Không log password hoặc token raw vào application log.
4. Token secret/key phải nằm ở secret manager hoặc env an toàn.
5. Có rate limit cho login endpoint.
6. Có thể bổ sung CAPTCHA ở phase sau nếu bị brute-force.
7. Nên hỗ trợ rotation secret/key có kế hoạch.

## 18.2 Performance requirements

1. Login response nên nhanh và ổn định.
2. Authorization middleware không được quá nặng làm chậm toàn hệ thống.
3. Permission resolution nên có cache hợp lý nhưng không được làm stale quá mức khi đổi quyền.

## 18.3 Availability requirements

1. Auth là nền tảng; downtime của Auth gần như đồng nghĩa hệ thống không dùng được.
2. Cần logging và monitoring riêng cho login fail spike, revoke fail, refresh fail.

## 18.4 Auditability requirements

1. Mọi sự kiện auth quan trọng phải truy vết được ai, khi nào, từ đâu, thiết bị nào.
2. Audit phải phục vụ điều tra sự cố và đối chiếu go-live.

---

## 19. Thiết kế dữ liệu mức BA logical

Đây là mô hình dữ liệu logic, chưa phải DDL cuối cùng.

## 19.1 user_account

Lưu tài khoản người dùng.

| Field | Mô tả |
|---|---|
| id | UUID |
| username | Tên đăng nhập, unique |
| full_name | Họ tên |
| email | Email |
| phone | Số điện thoại |
| status | ACTIVE / LOCKED / INACTIVE |
| force_change_password | Cờ bắt buộc đổi mật khẩu |
| failed_login_count | Số lần login sai liên tiếp |
| locked_until | Thời điểm khóa tạm |
| last_login_at | Lần login thành công gần nhất |
| auth_version | Version auth để revoke logic khi đổi quyền |
| is_deleted | Soft delete flag nếu cần |
| created_at / created_by | Audit tạo |
| updated_at / updated_by | Audit cập nhật |

## 19.2 user_password

Tách khỏi bảng user để tăng bảo mật và dễ audit.

| Field | Mô tả |
|---|---|
| user_id | FK sang user_account |
| password_hash | Hash mật khẩu |
| password_algo | BCrypt / Argon2 |
| password_changed_at | Thời điểm đổi gần nhất |
| password_expires_at | Nếu có policy hết hạn |

## 19.3 user_password_history

| Field | Mô tả |
|---|---|
| id | UUID |
| user_id | FK |
| password_hash | Hash cũ |
| changed_at | Thời điểm đổi |

## 19.4 role

Danh mục vai trò baseline và mở rộng.

| Field | Mô tả |
|---|---|
| id | UUID |
| code | ADMIN, WH_MANAGER... |
| name | Tên hiển thị |
| is_active | Còn dùng không |

## 19.5 user_role_assignment

| Field | Mô tả |
|---|---|
| id | UUID |
| user_id | FK |
| role_id | FK |
| effective_from | Hiệu lực từ |
| effective_to | Hiệu lực đến |
| is_primary | Role chính hay không |

## 19.6 user_warehouse_assignment

| Field | Mô tả |
|---|---|
| id | UUID |
| user_id | FK |
| warehouse_id | FK |
| is_default | Kho mặc định |
| effective_from / effective_to | Thời hạn hiệu lực |

## 19.7 user_owner_scope

Đặc biệt quan trọng cho customer viewer.

| Field | Mô tả |
|---|---|
| id | UUID |
| user_id | FK |
| owner_id | FK |
| scope_type | VIEW / EXPORT / REPORT |

## 19.8 auth_session

Bảng session là trọng tâm của module.

| Field | Mô tả |
|---|---|
| id | UUID |
| user_id | FK |
| channel | WEB / MOBILE / API |
| device_id | Thiết bị hoặc app instance |
| device_name | Tên thiết bị nếu có |
| login_at | Thời điểm login |
| last_seen_at | Lần hoạt động gần nhất |
| selected_warehouse_id | Kho hiện tại của session |
| refresh_token_hash | Hash refresh token |
| refresh_expires_at | Hết hạn refresh |
| is_revoked | Đã revoke chưa |
| revoked_at | Thời điểm revoke |
| revoked_reason | LOGOUT / DEACTIVATE / ROLE_CHANGED / PASSWORD_CHANGED |
| auth_version_at_issue | auth_version tại lúc phát token |

## 19.9 security_audit_log

| Field | Mô tả |
|---|---|
| id | UUID |
| event_code | LOGIN_SUCCESS, ACCESS_DENIED... |
| user_id | Có thể null nếu login fail không tìm thấy user |
| username_input | Username user đã nhập |
| channel | WEB/MOBILE/API |
| ip_address | IP nếu có |
| user_agent | User agent |
| device_id | Thiết bị |
| occurred_at | Thời điểm |
| result | SUCCESS / FAILED / DENIED |
| reason_code | Mã lý do |
| metadata_json | Thông tin bổ sung |

---

## 20. Quy tắc dữ liệu và integrity

1. `username` phải unique.
2. Một user có thể có nhiều role, nhưng phải có ít nhất một role active để dùng hệ thống.
3. Một user có thể có nhiều warehouse assignment.
4. `selected_warehouse_id` của session phải nằm trong assignment của user.
5. `CUST_VIEWER` phải có ít nhất một `owner_scope` hợp lệ.
6. Khi user inactive, không xóa session cũ mà revoke để giữ lịch sử.
7. Security audit log là append-only, không được sửa trực tiếp.

---

## 21. API đặc tả mức BA

Dưới đây là danh sách API mức business contract. Tên endpoint có thể điều chỉnh ở giai đoạn tech design, nhưng ý nghĩa nghiệp vụ không nên thay đổi.

## 21.1 POST /api/v1/auth/login

### Mục đích

Đăng nhập bằng username/password.

### Request

```json
{
  "username": "keeper01",
  "password": "******",
  "channel": "WEB",
  "device_id": "web-browser-uuid",
  "device_name": "Chrome on Windows"
}
```

### Response success

```json
{
  "access_token": "...",
  "refresh_token": "...",
  "expires_in": 900,
  "user": {
    "id": "uuid",
    "username": "keeper01",
    "full_name": "Nguyen Van A"
  },
  "roles": ["WH_KEEPER"],
  "warehouse_scopes": [
    {"id": "WH-HCM", "name": "HCM Warehouse"}
  ],
  "selected_warehouse_id": "WH-HCM",
  "owner_scopes": [],
  "force_change_password": false
}
```

### Business validations

- Username tồn tại.
- Password đúng.
- Tài khoản active.
- Channel được phép.
- Role còn hiệu lực.

### Error cases

- Sai mật khẩu.
- Tài khoản locked/inactive.
- Không có role hoặc scope hợp lệ.

---

## 21.2 POST /api/v1/auth/refresh

### Mục đích

Xin access token mới bằng refresh token.

### Validation

- Refresh token hợp lệ.
- Session chưa revoke.
- User còn active.
- `auth_version` chưa bị thay đổi bất lợi.

---

## 21.3 POST /api/v1/auth/logout

### Mục đích

Đăng xuất session hiện tại.

### Kết quả

- Session hiện tại bị revoke.
- Refresh token session đó mất hiệu lực.

---

## 21.4 POST /api/v1/auth/logout-all

### Mục đích

Đăng xuất toàn bộ session của chính user hiện tại.

### Kết quả

- Tất cả session active của user bị revoke.

---

## 21.5 GET /api/v1/auth/me

### Mục đích

Lấy hồ sơ và context hiệu lực của user hiện tại.

### Response gợi ý

```json
{
  "user": {
    "id": "uuid",
    "username": "manager01",
    "full_name": "Tran B"
  },
  "roles": ["WH_MANAGER"],
  "permissions": ["INBOUND_MANUAL_WEIGHT", "INVENTORY_ADJUSTMENT_CREATE"],
  "warehouse_scopes": ["WH-HCM", "WH-DN"],
  "selected_warehouse_id": "WH-HCM",
  "owner_scopes": []
}
```

---

## 21.6 POST /api/v1/auth/select-warehouse

### Mục đích

Chọn warehouse context cho session hiện tại.

### Request

```json
{
  "warehouse_id": "WH-DN"
}
```

### Validation

- Warehouse phải nằm trong warehouse scope của user.

### Kết quả

- Session cập nhật selected warehouse.
- Có thể trả access token mới hoặc cập nhật context qua session store tùy thiết kế.

---

## 21.7 POST /api/v1/auth/change-password

### Mục đích

User tự đổi mật khẩu.

### Validation

- Mật khẩu cũ đúng.
- Mật khẩu mới đạt policy.
- Không trùng mật khẩu cũ theo history policy.

---

## 21.8 POST /api/v1/admin/users/{id}/reset-password

### Mục đích

Admin reset password cho user khác.

### Quyền

- Chỉ ADMIN hoặc role được phép.

### Hệ quả

- Force change password ở lần login tiếp theo.
- Có thể revoke session cũ.

---

## 21.9 POST /api/v1/admin/users/{id}/deactivate

### Mục đích

Ngưng hiệu lực user.

### Hệ quả

- User không login được.
- Mọi session bị revoke.

---

## 21.10 POST /api/v1/admin/users/{id}/unlock

### Mục đích

Mở khóa tài khoản bị locked.

---

## 21.11 GET /api/v1/auth/sessions

### Mục đích

Cho user xem các session đang active của chính mình.

### Lợi ích

- User biết đang đăng nhập ở đâu.
- Hỗ trợ logout thiết bị lạ.

---

## 21.12 DELETE /api/v1/auth/sessions/{sessionId}

### Mục đích

Thu hồi một session cụ thể của chính user hoặc do admin thao tác.

---

## 22. UI/UX đặc tả mức nghiệp vụ

## 22.1 Màn hình Login

### Thành phần tối thiểu

- Username
- Password
- Nút Login
- Thông báo lỗi chung
- Hiển thị version app/system nếu cần

### Hành vi

- Không lộ chi tiết quá mức khi login fail.
- Chống submit nhiều lần liên tục.
- Với mobile có thể nhớ username nhưng không nên lưu password thô.

## 22.2 Màn hình Chọn kho

Hiển thị khi user có nhiều warehouse scope.

### Thành phần

- Danh sách kho được gán
- Kho mặc định nếu có
- Nút xác nhận

### Hành vi

- Không hiển thị kho ngoài scope.
- Chỉ sau khi chọn kho mới vào home nghiệp vụ.

## 22.3 Màn hình Đổi mật khẩu

- Mật khẩu cũ
- Mật khẩu mới
- Xác nhận mật khẩu mới
- Gợi ý policy

## 22.4 Màn hình Quản lý phiên đăng nhập

Khuyến nghị phase phù hợp nếu có thời gian:

- Danh sách thiết bị đang đăng nhập
- Logout session bất kỳ
- Logout all

---

## 23. Tích hợp với các module SWM khác

## 23.1 Với Module 1 – Foundation & Governance

- Lấy role catalog.
- Lấy permission matrix.
- Ghi audit change role/permission.
- Enforce RBAC ở runtime.

## 23.2 Với Module 2 – Master Data

- User có thể cần warehouse, owner, location master để resolve scope.
- Các master data nhạy cảm phải đi qua kiểm quyền từ Auth.

## 23.3 Với Module 3 – Inventory Core Engine

- Inventory actions phải đọc `user_id`, `role`, `warehouse_context` từ Auth.
- Inventory adjustment, reverse, view cross-owner stock phải chịu Auth check.

## 23.4 Với Module 4 – Inbound Operations

- Receipt, putaway, cancel, manual weight đều cần authorize.
- WB operator và WH manager có boundary khác nhau.

## 23.5 Với Module 5 – Outbound Operations

- Pick, pack, ship, force approve, weigh related actions đều phụ thuộc role/scope.

## 23.6 Với Module 6 – Inventory Control

- Cycle count, move, status change, adjustment cần quyền và warehouse scope rất chặt.

## 23.7 Với Module 7 – Work Execution

- Mobile execution phụ thuộc login mobile, warehouse context, claim work permission.

## 23.8 Với Module 8 – Weighbridge Integration

- WB operator login, session theo thiết bị, quyền re-weigh và weigh action phải rõ.

## 23.9 Với Module 9 – VAS/Bagging

- Work order execution và approve completion cần authorize theo role.

## 23.10 Với Module 10 – Billing

- Billing officer cần quyền vào đúng phân hệ, lock debit note, xem dữ liệu billing đúng scope.

## 23.11 Với Module 11 – Reporting & Audit

- Security audit log và permission change log là nguồn dữ liệu quan trọng cho report/audit.

---

## 24. Kịch bản nghiệp vụ tiêu biểu

## Case A – Customer Viewer xem sai owner phải bị chặn

- **Input:** user role = `CUST_VIEWER`, owner scope = `CUST001`, request report của `CUST002`
- **Expected:** trả `403 AUTH-403-OUT-OF-OWNER-SCOPE`
- **Audit:** ghi `ACCESS_DENIED`

## Case B – Warehouse Keeper cố manual weight

- **Input:** role = `WH_KEEPER`, gọi API manual weight
- **Expected:** trả `403 AUTH-403-NO-PERMISSION`
- **Reason:** manual weight chỉ cho `WH_MANAGER`

## Case C – User bị deactivate khi vẫn đang login

- **Input:** user đang có 3 session active, admin deactive user
- **Expected:** 3 session bị revoke, request kế tiếp ở cả 3 thiết bị trả `401 AUTH-401-SESSION-REVOKED` hoặc `AUTH-401-ACCOUNT-INACTIVE`

## Case D – User có 2 kho nhưng chưa chọn kho

- **Input:** login success, chưa chọn warehouse, gọi API create receipt
- **Expected:** trả `403 AUTH-403-WAREHOUSE-CONTEXT-REQUIRED`

## Case E – User đổi quyền giữa phiên làm việc

- **Input:** trước đó là WH_MANAGER, sau đó bị đổi thành WH_KEEPER
- **Expected:** request manual weight kế tiếp phải bị chặn
- **Implementation hint:** kiểm `auth_version` hoặc session revalidation

---

## 25. Acceptance Criteria

### 25.1 Authentication

- **AC-AUTH-01:** User active với credential đúng phải đăng nhập thành công.
- **AC-AUTH-02:** Sai password phải bị từ chối và tăng failed login counter.
- **AC-AUTH-03:** Vượt ngưỡng login fail phải lock/tạm lock theo policy.
- **AC-AUTH-04:** User inactive không được login.

### 25.2 Session & Token

- **AC-AUTH-05:** Login thành công phải tạo session riêng.
- **AC-AUTH-06:** Logout phải revoke session hiện tại.
- **AC-AUTH-07:** Logout all phải revoke mọi session của user.
- **AC-AUTH-08:** Refresh token chỉ hoạt động khi session còn active và user còn hiệu lực.

### 25.3 Warehouse Context

- **AC-AUTH-09:** User có nhiều warehouse phải chọn kho trước khi dùng API cần warehouse context.
- **AC-AUTH-10:** Không được chọn warehouse ngoài scope được gán.

### 25.4 Authorization & Scope

- **AC-AUTH-11:** Backend phải trả `403` nếu user không đủ quyền action.
- **AC-AUTH-12:** `CUST_VIEWER` không được xem dữ liệu owner khác qua UI, export, API.
- **AC-AUTH-13:** `WH_KEEPER` không thể manual weight ở mọi kênh.
- **AC-AUTH-14:** Thay đổi role/scope của user phải có hiệu lực trong cơ chế authorize kế tiếp.

### 25.5 Security Audit

- **AC-AUTH-15:** Login success/fail, logout, revoke, access denied phải có audit log.
- **AC-AUTH-16:** Audit log phải lưu được thời gian, user hoặc username input, channel, kết quả và lý do.

### 25.6 Password

- **AC-AUTH-17:** Password không được lưu plain text.
- **AC-AUTH-18:** Đổi mật khẩu phải kiểm password policy.
- **AC-AUTH-19:** Reset password bởi admin phải ghi audit và buộc user đổi mật khẩu ở lần login kế tiếp nếu policy bật.

---

## 26. Test scenario gợi ý cho QA/dev intern

## 26.1 Positive cases

1. Login thành công với ADMIN.
2. Login thành công với WH_KEEPER trên mobile.
3. User có 1 kho được auto-select kho mặc định.
4. User có nhiều kho chọn kho thành công.
5. Refresh token thành công.
6. Logout thành công.
7. Change password thành công.

## 26.2 Negative cases

1. Sai password 1 lần.
2. Sai password liên tiếp đến khi account locked.
3. Token hết hạn.
4. Refresh token đã revoke.
5. User inactive nhưng cố refresh token cũ.
6. Chọn warehouse ngoài scope.
7. CUST_VIEWER gọi API owner khác.
8. WH_KEEPER gọi manual weight API.
9. BILLING_OFC gọi inventory adjustment API.
10. User không có selected warehouse nhưng gọi API create transaction.

## 26.3 Regression/security cases

1. UI ẩn nút manual weight nhưng gọi API trực tiếp vẫn phải bị chặn.
2. Đổi role user khi user đang online; request tiếp theo phải chịu quyền mới.
3. Deactivate user khi user còn online; token cũ phải vô hiệu.
4. Export data phải chịu owner scope giống màn hình.
5. Mobile và Web phải cùng dùng nguyên tắc authorize tương tự.

---

## 27. Rủi ro nếu làm thiếu

1. Chỉ kiểm quyền ở frontend sẽ bị bypass bằng API call trực tiếp.
2. Không có session table sẽ khó revoke token và khó điều tra sự cố.
3. Không tách warehouse context sẽ gây thao tác sai kho.
4. Không filter owner scope ở backend sẽ rò rỉ dữ liệu khách hàng.
5. Không có `auth_version` hoặc cơ chế tương đương sẽ khó áp quyền mới ngay khi role bị đổi.
6. Không audit login fail và access denied sẽ khó truy vết bảo mật.

---

## 28. Khuyến nghị triển khai theo phase

## Phase 1 – Bắt buộc go-live

- Username/password login
- JWT access token + refresh token
- Session table
- Logout / logout all
- Warehouse selector
- Backend authorization middleware
- Owner scope enforcement cho CUST_VIEWER
- Password change/reset cơ bản
- Security audit log cơ bản
- Revoke session khi deactivate user

## Phase 2 – Nâng cao

- Session management UI hoàn chỉnh
- Password expiry / history policy nâng cao
- IP restriction hoặc device trust nếu cần
- SSO / Active Directory integration
- MFA nếu doanh nghiệp yêu cầu

---

## 29. Các điểm cần chốt thêm

| # | Điểm cần chốt | Mức ưu tiên | Tác động |
|---|---|---|---|
| 1 | Có giữ `WH_ADMIN` là role riêng hay gộp | P1 | Ảnh hưởng role catalog và permission map |
| 2 | Access token expiry bao nhiêu phút | P1 | Ảnh hưởng UX và security |
| 3 | Refresh token expiry bao nhiêu ngày | P1 | Ảnh hưởng session policy |
| 4 | Có auto-select kho mặc định khi chỉ có 1 kho không | P2 | Ảnh hưởng UX |
| 5 | Có cho CUST_VIEWER login mobile không | P2 | Ảnh hưởng channel policy |
| 6 | Có áp password expiry định kỳ không | P3 | Ảnh hưởng policy và support |
| 7 | Có rollout SSO/AD ở phase nào | P3 | Ảnh hưởng architecture mở rộng |

---

## 30. Định nghĩa Done cho module Auth

Module Auth được xem là hoàn thành khi:

1. Web và Mobile đều đăng nhập được bằng cơ chế thống nhất.
2. Hệ thống phát hành và quản lý token/session đúng chuẩn đã chốt.
3. Warehouse context được enforce ở các API cần kho.
4. Role/permission/data scope được backend enforce.
5. CUST_VIEWER chỉ thấy dữ liệu owner của mình.
6. Deactivate user làm mọi session cũ mất hiệu lực.
7. Các sự kiện auth chính có security audit log.
8. QA pass đầy đủ positive, negative và regression cases cốt lõi.

---

## 31. Kết luận

Auth là nền móng bảo mật và kiểm soát truy cập của SWM. Dù người dùng thường chỉ nhìn thấy màn hình login, nhưng về bản chất module này phải xử lý đồng thời 5 lớp:

1. xác thực danh tính,
2. quản lý phiên,
3. phân quyền,
4. giới hạn phạm vi dữ liệu,
5. truy vết bảo mật.

Khi team dev hiểu đúng module Auth, việc build các module nghiệp vụ như inbound, outbound, inventory control, weighbridge, billing và reporting sẽ đồng nhất và an toàn hơn rất nhiều. Nếu làm tốt ngay từ đầu, hệ thống sẽ giảm mạnh lỗi phân quyền, giảm rò rỉ dữ liệu và giúp việc go-live ổn định hơn.

