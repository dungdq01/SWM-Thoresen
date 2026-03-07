**PROJECT CHARTER\
PHÁT TRIỂN HỆ THỐNG LOGTECH QUA VIBECODING AI**

**Phiên bản 1.1**

  -----------------------------------------------------------------------
  Tên dự án                           AI-First Logtech Transformation\
                                      (Vibecoding Initiative)
  ----------------------------------- -----------------------------------
  Sponsor                             

  Quản lý dự án (PM)                  

  Người triển khai (IMP)              Phat Vu

  Ngày bắt đầu                        02/03/2026

  Ngày cập nhật tài liệu              02/03/2026
  -----------------------------------------------------------------------

# 1. Kiểm soát tài liệu

## 1.1 Lịch sử phiên bản

  ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  Phiên bản      Ngày           Tác giả         Mô tả thay đổi                                                                                                        Ghi chú
  -------------- -------------- --------------- --------------------------------------------------------------------------------------------------------------------- ----------------------------
  1.0            02/03/2026     \[PM/IMP\]      Bản charter ban đầu (AI-first, roles, workflow, milestones, risks).                                                   Nguồn: PROJECT CHARTER.pdf

  1.1            02/03/2026     IMP (Phat Vu)   Bổ sung scope, deliverables, KPI, governance, AI governance, truyền thông, change control, risk register, timeline.   Bản quản trị chính thức
  ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

## 1.2 Phê duyệt

  ----------------------------------------------------------------------------
  Vai trò                Họ tên            Chữ ký            Ngày
  ---------------------- ----------------- ----------------- -----------------
  Sponsor                \[TBD\]                             

  Project Manager (PM)   \[TBD\]                             

  Tech Lead              \[TBD\]                             

  QA Lead                \[TBD\]                             
  ----------------------------------------------------------------------------

# 2. Tổng quan dự án

Dự án hướng tới chuyển đổi cách phát triển phần mềm Logtech theo mô hình AI-first (vibecoding): **DEV tập trung Prompts & Verify** và tăng tốc delivery, đồng thời đảm bảo chất lượng/độ tin cậy nghiệp vụ logistics thông qua review, test tự động và kiểm soát bảo mật.

## 2.1 Bối cảnh & lý do

-   Rút ngắn thời gian phát triển module WMS/TMS và giảm lỗi sau triển khai.

-   Tận dụng AI (ChatGPT/Claude/Cursor/GitHub Copilot) để tăng năng suất, chuẩn hoá tài liệu và tự động hoá kiểm thử.

-   Chuẩn hoá governance và chính sách dùng AI để giảm rủi ro (hallucination, bảo mật, lock-in).

# 3. Mục tiêu & KPI

## 3.1 Mục tiêu

-   Chuyển đổi quy trình phát triển sang AI-generated với nguyên tắc Prompts & Verify.

-   100% thành viên dự án sử dụng AI trong công việc (yêu cầu, thiết kế, code, test, tài liệu).

-   Xây dựng module WMS/TMS có cấu trúc chuẩn, dễ bảo trì và đạt chất lượng vận hành.

## 3.2 KPI/OKR (đo được)

Thiết lập baseline trong Tuần 1 để đối chiếu. Mục tiêu đề xuất:

  --------------------------------------------------------------------------------------------------------
  Nhóm KPI          Chỉ số                         Mục tiêu                  Cách đo
  ----------------- ------------------------------ ------------------------- -----------------------------
  Delivery          Cycle time (Story -\> merge)   Giảm \>= 50%              Tracker + Git/PR timestamps

  Quality           Defect leakage (UAT/Prod)      Giảm \>= 30%              Bug tracker theo phase

  Test              Automation regression          \>= 60% test case chính   Coverage theo suite CI

  Adoption          PR có prompt log + checklist   \>= 80% PR                Template PR + audit định kỳ

  Ops               MTTR triển khai                Giảm \>= 30%              Ticket timeline + runbook
  --------------------------------------------------------------------------------------------------------

# 4. Phạm vi dự án

## 4.1 In-scope

-   Thiết lập môi trường và công cụ AI cho team (account, guideline, prompt library).

-   Phân tích yêu cầu và chuẩn hoá PRD/User Stories cho các module Logtech mục tiêu.

-   Vibecoding phát triển module chính WMS/TMS theo PRD được phê duyệt.

-   Tự động hoá kiểm thử trọng yếu (unit/integration/regression) và tiêu chuẩn CI/CD.

-   Triển khai (Dockerize/Cloud), tích hợp, migration dữ liệu (nếu có) và bàn giao tài liệu/training.

## 4.2 Out-of-scope (tạm loại trừ)

-   Chức năng ngoài danh mục PRD đã phê duyệt (mọi change sẽ qua Change Control).

-   Tối ưu hạ tầng/chi phí cloud quy mô lớn (chỉ cấu hình đáp ứng go-live hiện tại).

-   Huấn luyện model/LLM nội bộ (chỉ cấu hình sử dụng công cụ sẵn có/enterprise khi cần).

## 4.3 Giả định & ràng buộc

-   Key users và Sponsor phản hồi đúng hạn theo lịch UAT.

-   Dữ liệu mẫu/mapping và quyền truy cập hệ thống liên quan được cung cấp kịp thời.

-   Chính sách bảo mật cho phép sử dụng công cụ AI theo mục 8.

-   Timeline baseline (mục 10) sẽ tinh chỉnh sau khi chốt PRD.

# 5. Deliverables

Deliverables bắt buộc theo phase:

  --------------------------------------------------------------------------------------------------------------------------------------------------
  Phase                   Deliverables                                                           Tiêu chí nghiệm thu
  ----------------------- ---------------------------------------------------------------------- ---------------------------------------------------
  M1 - Setup              Tài khoản AI; guideline; template PR; prompt library; baseline KPI.    Access OK; guideline ban hành; baseline ghi nhận.

  M2 - Spec               PRD; user stories; process flow; data dictionary (nếu có).             Sponsor/PO ký duyệt PRD; stories có AC.

  M3 - Build              Source code; ADR notes; API spec; migration scripts (nếu có).          CI pass; review đạt checklist; traceability.

  M4 - Test               Test cases; automation suite; test report; security scan report.       Regression pass; critical defects = 0.

  M5 - Go-live            Runbook; package (Docker); user manual; training; biên bản bàn giao.   Go-live ổn định; sign-off bàn giao.
  --------------------------------------------------------------------------------------------------------------------------------------------------

# 6. Tổ chức dự án & Governance

## 6.1 Cơ cấu

-   Sponsor: Ban lãnh đạo Smartlog (phê duyệt ưu tiên và go-live).

-   Steering (đề xuất): Sponsor + PM + Tech Lead + đại diện vận hành (Key user).

-   Project team: PM, BA, DEV, QA, IMP.

## 6.2 Nhịp họp & báo cáo

  ------------------------------------------------------------------------------------------------------------------------
  Cadence                 Mục đích                               Thành phần                   Output
  ----------------------- -------------------------------------- ---------------------------- ----------------------------
  Daily (15\')            Đồng bộ tiến độ/impediments            PM, BA, DEV, QA, IMP         Daily notes + action items

  Weekly                  Status, KPI, rủi ro, kế hoạch tuần     PM + leads + Sponsor (tuỳ)   Weekly status report

  Steering (2 tuần/lần)   Quyết định phạm vi/ưu tiên/issue lớn   Sponsor + Steering           Decision log

  UAT checkpoint          Chốt test, quyết định go/no-go         Sponsor/PO + PM + QA + IMP   UAT sign-off
  ------------------------------------------------------------------------------------------------------------------------

# 7. Vai trò & trách nhiệm

RACI cho các hoạt động chính (R=Responsible, A=Accountable, C=Consulted).

  --------------------------------------------------------------------------------------------
  Hoạt động                  Sponsor    PM         BA         DEV        QA         IMP
  -------------------------- ---------- ---------- ---------- ---------- ---------- ----------
  Phê duyệt scope/PRD        A          R          R          C          C          C

  Thiết kế kiến trúc/ADR     C          A          C          R          C          C

  Vibecoding & code review   C          A          C          R          C          C

  Test plan & automation     C          A          C          C          R          C

  Migration & deployment     C          A          C          C          C          R

  Training & handover        A          R          C          C          C          R
  --------------------------------------------------------------------------------------------

# 8. AI Governance & Tooling

## 8.1 Công cụ AI được dùng

-   ChatGPT/Claude: phân tích yêu cầu, sinh tài liệu, hỗ trợ thiết kế và review.

-   Cursor/GitHub Copilot: sinh code, refactor, tạo test scaffolding.

-   Transcribe AI: tóm tắt họp và chuyển voice-to-text (nếu dùng).

## 8.2 Chính sách dữ liệu & bảo mật

-   Không đưa secrets, access keys, dữ liệu nhạy cảm/PII vào prompt nếu dùng dịch vụ công cộng.

-   Ưu tiên account enterprise; bật chế độ không train theo chính sách nhà cung cấp (nếu có).

-   Mã nguồn: dùng repo nội bộ; bật secret scan và dependency scan trong CI.

-   Prompt log: lưu prompt/context tối thiểu (không chứa dữ liệu nhạy cảm) gắn với PR để truy vết.

## 8.3 Quy tắc Prompts & Verify

-   Mọi output AI (code/tài liệu) phải được verify trước khi merge/publish.

-   Checklist review cho code AI-generated: edge cases logistics, idempotency, transaction, concurrency, security.

-   Không merge nếu thiếu test tối thiểu cho logic quan trọng.

-   Template PR bắt buộc: Prompt log, Verification steps, Test evidence.

# 9. Quy trình làm việc (Vibecoding Workflow)

  ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  Bước               Mô tả                                             Input/Output                                                    Definition of Done
  ------------------ ------------------------------------------------- --------------------------------------------------------------- ---------------------------------------------------------
  1\. Requirement    BA dùng AI chuyển ý tưởng khách hàng thành PRD.   Input: yêu cầu/biên bản họp. Output: PRD + stories + AC.        PRD có scope rõ; AC đo được; Sponsor/PO duyệt.

  2\. Prompting      BA chuyển giao context chuẩn cho DEV.             Input: PRD/story. Output: context pack + link tài liệu.         Context pack có ví dụ/edge cases; sẵn sàng vibecoding.

  3\. Vibecoding     DEV dùng AI để generate module.                   Input: context pack. Output: code + tests sơ bộ + ADR/notes.    Build được; lint pass; unit test tối thiểu.

  4\. Verification   Review DEV + test suite QA.                       Input: code/tests. Output: review + automation + test report.   Checklist review đạt; regression pass; critical bugs=0.

  5\. Deployment     IMP dockerize, deploy cloud.                      Input: artifact. Output: docker image, config, runbook.         Deploy theo runbook; rollback plan; monitoring cơ bản.
  ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------

# 10. Kế hoạch tiến độ (baseline)

Baseline đề xuất 8 tuần kể từ 02/03/2026; sẽ điều chỉnh khi chốt PRD.

  ----------------------------------------------------------------------------------------------------------
  Tuần                    Khoảng thời gian        Nội dung/Mốc
  ----------------------- ----------------------- ----------------------------------------------------------
  W1                      02/03 - 06/03           Kick-off, M1 Setup AI, baseline KPI, chuẩn hoá template.

  W2                      09/03 - 13/03           Requirement/PRD, process map, chốt M2.

  W3                      16/03 - 20/03           Sprint 1 vibecoding.

  W4                      23/03 - 27/03           Sprint 2 vibecoding.

  W5                      30/03 - 03/04           Sprint 3: tích hợp, hardening, chốt M3.

  W6                      06/04 - 10/04           Regression + integration test + security scan.

  W7                      13/04 - 17/04           UAT + performance smoke + chuẩn bị go-live.

  W8                      20/04 - 24/04           Go-live (M5), training, handover.
  ----------------------------------------------------------------------------------------------------------

## 10.1 Milestones

  -------------------------------------------------------------------------------------------------------------------------
  Mốc               Mô tả                               Ngày mục tiêu     Tiêu chí exit
  ----------------- ----------------------------------- ----------------- -------------------------------------------------
  M1                Thiết lập môi trường & account AI   06/03/2026        Tool access OK; guideline; baseline KPI.

  M2                PRD/Spec hoàn tất và phê duyệt      13/03/2026        Sponsor/PO sign-off; backlog ưu tiên.

  M3                Module chính WMS/TMS MVP            03/04/2026        CI pass; traceability; demo end-to-end.

  M4                Verify & test tự động trọng yếu     17/04/2026        Regression pass; critical bugs=0; UAT sign-off.

  M5                Go-live & bàn giao                  24/04/2026        Go-live ổn định; handover hoàn tất.
  -------------------------------------------------------------------------------------------------------------------------

# 11. Kế hoạch truyền thông

-   Kênh: Teams/Slack, Jira/Linear, GitHub/GitLab, Drive/Confluence.

-   Báo cáo weekly: tiến độ milestone, KPI, rủi ro, quyết định cần Sponsor.

-   Escalation: issue ảnh hưởng scope/time/cost hoặc rủi ro bảo mật -\> PM báo Sponsor trong 24h.

# 12. Quản trị thay đổi (Change Control)

-   CR phải nêu rõ: mô tả, lý do, độ ưu tiên, deadline.

-   PM/Tech Lead/BA ước lượng impact (scope/time/risk) và đề xuất phương án.

-   Sponsor/Steering phê duyệt CR trước khi đưa vào sprint/backlog.

-   Ghi Decision Log cho thay đổi quan trọng.

# 13. Rủi ro & kế hoạch ứng phó

  -----------------------------------------------------------------------------------------------------------------------------------------------------------------------------
  Rủi ro                                       Mức độ (P/I)   Mitigation                                                   Owner           Trigger
  -------------------------------------------- -------------- ------------------------------------------------------------ --------------- ------------------------------------
  Hallucination: AI sinh sai logic nghiệp vụ   M/H            Verify + test edge + review checklist.                       Tech Lead       Bug logic lặp lại ở UAT

  Security: rò rỉ mã nguồn/dữ liệu             L-M/H          Policy dữ liệu; LLM enterprise/local khi cần; secret scan.   PM + Security   Phát hiện secrets trong prompt/log

  Scope creep                                  M/M-H          Change control; baseline scope; steering quyết định.         PM              CR tăng đột biến

  Data migration sai lệch                      M/H            Data profiling; dry-run; reconciliation; rollback.           IMP             Chênh lệch số liệu kiểm kê

  Hiệu năng/peak load                          M/H            Performance smoke; benchmark; tối ưu query/index; caching.   DEV             Timeout/latency vượt ngưỡng

  Adoption AI không đồng đều                   M/M            Training prompt; PR template bắt buộc; coaching.             PM              PR thiếu prompt log \> 20%
  -----------------------------------------------------------------------------------------------------------------------------------------------------------------------------

# 14. Tiêu chí thành công & nghiệm thu

-   Thời gian hoàn thành dự án giảm 30-50% so với phương pháp cũ (đối chiếu baseline).

-   Tỷ lệ lỗi sau deploy giảm nhờ test tự động và checklist verify.

-   Team làm chủ kỹ năng prompt engineering và quy trình Prompts & Verify.

-   Go-live ổn định, có runbook/monitoring tối thiểu và bàn giao đầy đủ tài liệu.

# 15. Phụ lục

## 15.1 Checklist PR (đề xuất)

-   Prompt log đính kèm (không chứa dữ liệu nhạy cảm).

-   Các bước verify đã thực hiện (review, test evidence).

-   Unit/Integration tests bổ sung cho logic quan trọng.

-   Security scan pass; không có secrets trong repo.

-   Link story/AC liên quan (traceability).

## 15.2 Glossary

Vibecoding: phát triển phần mềm dùng AI để sinh code nhanh, tập trung điều khiển bằng prompt và xác minh kết quả.

Context pack: gói ngữ cảnh BA cung cấp cho DEV gồm business rules, dữ liệu mẫu, constraints và edge cases.

DoD: điều kiện hoàn tất cho một bước/đầu ra.
