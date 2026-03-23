# Inventory Allocation / Hold – FULL BUSINESS + TECH GUIDE

---

# 1. Bức tranh tổng thể (Non-tech explanation)

Hãy tưởng tượng kho giống như cửa hàng bán gạo:

- `invent_trans` = sổ ghi chép tất cả nhập/xuất (sổ cái)
- `on_hand` = bảng treo tường ghi "còn bao nhiêu"
- `hold` = giữ hàng trước cho khách

❗ VẤN ĐỀ HIỆN TẠI:
Nhân viên đang nhìn vào bảng treo tường (`on_hand`) để quyết định còn hàng hay không.

👉 Nhưng bảng này có thể bị chậm cập nhật.

=> 2 người cùng thấy còn 10 bao  
=> mỗi người bán 10 bao  
=> thực tế bán 20 bao ❌

---

# 2. Mục tiêu hệ thống đúng

✔ Quyết định quan trọng phải dựa vào "sổ gốc" (`invent_trans`)  
✔ `on_hand` chỉ để xem nhanh  
✔ Mọi thay đổi phải có lịch sử  
✔ Không bao giờ oversell

---

# 3. Khái niệm dev cần hiểu

## 3.1 Ledger (invent_trans)

Đây là bảng QUAN TRỌNG NHẤT

Mỗi dòng là 1 sự kiện:
- nhập hàng
- xuất hàng
- allocate
- deallocate

❗ Không update, không delete

---

## 3.2 On_hand

Chỉ là bảng tổng hợp

❗ Không dùng để quyết định nghiệp vụ

---

## 3.3 Allocation / Hold

Là hành động:
👉 "giữ hàng trước cho 1 đơn"

---

# 4. Vấn đề hiện tại trong code

Sai ở chỗ:

- dùng on_hand để check available
- lock bằng SELECT FOR UPDATE on on_hand

=> gây race condition

---

# 5. Flow chuẩn cần implement

## STEP 1 – Lock đúng scope

Dùng advisory lock:

key = (tenant_id, item_id, invent_dim_id)

---

## STEP 2 – Tính tồn từ ledger

Query invent_trans:

physical = SUM(receipt - issue)
allocated = SUM(allocated - deallocated)

available = physical - allocated

---

## STEP 3 – Validate

IF available < qty:
    THROW error

---

## STEP 4 – Insert hold

INSERT inventory_hold

---

## STEP 5 – Post ledger

INSERT invent_trans:
- ISSUE
- ALLOCATED

---

## STEP 6 – Insert outbox

INSERT inventory_event_outbox

---

## STEP 7 – Commit

---

# 6. So sánh BEFORE vs AFTER

## BEFORE

- đọc on_hand
- lock on_hand
- allocate

❌ sai khi concurrent

---

## AFTER

- lock item
- đọc ledger
- allocate

✔ đúng tuyệt đối

---

# 7. Tại sao phải dùng advisory lock

Nếu không lock:

2 request chạy song song:
- cùng đọc available = 10
- cùng allocate

=> sai

Advisory lock giúp:
👉 chỉ 1 request xử lý tại 1 thời điểm

---

# 8. Tại sao KHÔNG dùng on_hand

on_hand:
- là dữ liệu tổng hợp
- có thể delay
- không đảm bảo chính xác realtime

=> không dùng để quyết định

---

# 9. Tại sao cần outbox

Để:
- không mất event
- retry khi lỗi
- xử lý async

> **Trạng thái hiện tại (Phase 1 — Monolith):**
> Hệ thống hiện tại là NestJS monolith, tất cả posting đều sync trong cùng Prisma `$transaction()`. Không có message queue (RabbitMQ/Kafka), không có microservice tách biệt. Do đó outbox **chưa cần** — data consistency đã đảm bảo 100% bởi database transaction.
>
> **Khi nào cần (Phase 2):**
> Outbox pattern cần khi hệ thống chuyển sang microservice hoặc dùng message queue để giao tiếp giữa các module. Lúc đó cần `inventory_event_outbox` table + worker process để đảm bảo event không mất khi network lỗi.

---

# 10. Edge cases dev phải handle

- concurrent request
- rollback transaction
- retry outbox
- deadlock

---

# 11. Checklist dev

- [x] Không dùng on_hand để allocate — ✅ `calculateAvailableFromLedger()` tính từ `invent_trans` + `inventory_hold`
- [x] Dùng advisory lock — ✅ `pg_advisory_xact_lock(hash(item_id|invent_dim_id))`
- [x] Tính từ invent_trans — ✅ physical từ SUM(invent_trans), allocated từ SUM(active holds)
- [x] Insert hold — ✅ `holdRepo.create()`
- [x] Insert ledger — ✅ `postingEngine.postInventory({ eventCode: 'ALLOCATION_CREATED' })`
- [ ] Insert outbox — 🔜 Phase 2 (chưa cần ở monolith, sync posting trong $transaction đảm bảo consistency. Cần khi chuyển microservice/message queue)
- [x] Transaction atomic — ✅ `prisma.$transaction()` + advisory lock auto-release on commit

---

# 12. Mức độ ưu tiên

🔥 CRITICAL

Nếu sai:
- oversell
- sai tồn
- fail shipment

---

# 13. TL;DR cho dev

KHÔNG BAO GIỜ:
- trust on_hand

LUÔN LUÔN:
- trust invent_trans
- lock trước khi allocate
