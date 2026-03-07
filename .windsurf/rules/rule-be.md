---
trigger: manual
---

# Backend Development Rules — SWM TVL (Single-Tenant, Phase 1)

> Tài liệu này là **working agreement bắt buộc** cho team backend của dự án SWM TVL.
> Mục tiêu là giữ codebase **sạch, dễ maintain, đúng kiến trúc đã thống nhất**, tránh sinh ra file rác, logic rải sai nơi, hoặc dependency chồng chéo làm hệ thống khó debug và khó mở rộng.

---

## 1. Mục tiêu của bộ rule

Bộ rule này được tạo ra để đảm bảo 5 điều:

1. **Đúng kiến trúc**: code bám đúng modular monolith single-tenant đã chốt.
2. **Không có file rác**: mỗi file được tạo ra phải có trách nhiệm rõ ràng.
3. **Không đặt sai folder**: file nằm đúng module, đúng layer, đúng naming.
4. **Không rò rỉ business rule**: controller, repository, integration adapter không được tự ôm nghiệp vụ sai chỗ.
5. **Dễ review / dễ maintain**: người mới vào team nhìn tên file là hiểu file đó có nhiệm vụ gì.

Tài liệu này là **chuẩn mặc định** cho mọi backend dev. Nếu có ngoại lệ, phải được thảo luận và thống nhất trước trong code review hoặc architecture review.

---

## 2. Architectural stance bắt buộc

Backend của SWM TVL được build theo định hướng:

- **single-tenant**
- **modular monolith**
- **domain-oriented modules**
- **Inventory Core là trung tâm của mọi inventory mutation**
- **Work tách riêng khỏi Inbound/Outbound**
- **Integration là adapter, không là business owner**

### 2.1 Không làm theo hướng multi-tenant

Không tạo hoặc giữ các khái niệm sau trong Phase 1 nếu chưa có quyết định kiến trúc mới:

- `tenant middleware`
- `tenant service`
- `tenant repository`
- `dynamic module registry theo tenant`
- `feature flag theo tenant`
- route dạng `/:tenantId/...`

Ở hệ thống hiện tại, scope vận hành đúng là:

- `warehouse`
- `owner`
- `user / role`

Không được platform hóa sớm theo kiểu SaaS nếu business hiện tại chưa cần.

### 2.2 Không tách microservice tự phát

Team không tự ý tách service riêng cho:

- inventory
- billing
- work
- integration
- reporting

trừ khi có quyết định kiến trúc mới được approve.

Ở giai đoạn hiện tại, toàn bộ backend phải đi theo **modular monolith với module boundaries chặt**.

---

## 3. Nguyên tắc cốt lõi bắt buộc

## 3.1 Inventory Core là nơi duy nhất được phép ghi ledger

Chỉ module `inventory-core` được phép:

- tạo `InventTrans`
- cập nhật `OnHand`
- resolve / tạo `InventDim`
- reverse inventory transaction
- chạy reconciliation inventory

### Cấm tuyệt đối

- `inbound` tự update `OnHand`
- `outbound` tự insert `InventTrans`
- `work` tự trừ tồn
- `billing` tự suy diễn tồn và ghi ngược vào inventory tables
- repository của module bất kỳ ghi trực tiếp ledger ngoài `inventory-core`

### Rule bắt buộc

Mọi inventory side effect phải đi qua:

- `inventory-core/application/postingEngine.js`
- hoặc `inventory-core/application/reversalEngine.js`

---

## 3.2 Work là execution layer, không phải stock owner

Module `work` chỉ quản:

- `WorkHeader`
- `WorkLine`
- claim / start / complete / skip / cancel work
- assignment / execution state

`work` **không được**:

- tự ý ghi ledger
- tự ý đổi state business của receipt/shipment ngoài use case được gọi chính thức
- tự quyết định tolerance weighbridge

Nếu `completeWorkLine` cần tạo inventory effect, file use case phải gọi sang `inventory-core` thông qua flow đã thiết kế.

---

## 3.3 Inbound và Outbound giữ state machine nghiệp vụ

### Inbound chịu trách nhiệm

- tạo receipt
- nhận weigh-in / weigh-out inbound
- confirm / reject / reweigh receipt
- sinh putaway work
- quản lý inbound state machine

### Outbound chịu trách nhiệm

- tạo shipment
- allocation / unallocation
- tạo pick work
- nhận outbound weight
- ship shipment
- quản lý outbound state machine

### Cấm tuyệt đối

- nhét logic move inventory vào inbound/outbound
- nhét logic work lifecycle vào inbound/outbound nếu đã có module `work`
- nhét logic debit note / billing rule vào inbound/outbound

---

## 3.4 Integration chỉ là adapter

Các module / adapter như:

- weighbridge
- ocr
- mobile-sync
- erp-sync
- storage
- exporter
- mail

chỉ được làm các việc sau:

- gọi external system
- nhận dữ liệu vào
- normalize request / response
- retry / timeout / circuit handling
- logging / tracing / mapping

### Cấm tuyệt đối

- tự quyết định state business cuối cùng
- tự kết luận “post inventory”
- tự áp dụng tolerance rule
- tự thay đổi workflow chính mà không đi qua application use case

---

## 3.5 Ledger là immutable

Sau khi inventory transaction đã post:

- không update record cũ
- không delete record cũ
- không silent fix dữ liệu trong DB bằng code path nghiệp vụ

Nếu cần sửa sai phải:

1. tạo reversal transaction
2. tạo corrected transaction mới nếu cần
3. ghi đầy đủ audit trail

---

## 3.6 Mọi command side effect phải có idempotency

Các action sau bắt buộc có idempotency:

- receive weigh-in / weigh-out
- confirm receipt
- create / complete work
- allocate / ship shipment
- inventory adjustment
- mobile sync callback
- weighbridge callback
- ERP re-push callback nếu có write path

### Rule bắt buộc

- request phải có `externalId`, `requestId`, hoặc idempotency key tương đương
- duplicate request phải trả về kết quả cũ hoặc state phù hợp
- không được tạo transaction trùng vì retry network

---

## 4. Folder structure bắt buộc

## 4.1 Root structure chuẩn

```txt
backend/
├── prisma/
├── src/
├── tests/
├── scripts/
├── Dockerfile
├── docker-compose.yml
├── package.json
└── README.md
```

Không tạo thêm folder root linh tinh như:

- `tmp-src/`
- `backup/`
- `new/`
- `draft/`
- `old/`
- `test-api/`
- `misc/`
- `helpers/` ở root

Nếu cần file tạm local để debug, file đó không được commit.

---

## 4.2 Structure dưới `src/`

```txt
src/
├── app.js
├── server.js
├── routes.js
├── config/
├── shared/
├── modules/
├── jobs/
└── docs/
```

### Ý nghĩa

- `app.js`: bootstrap express app / middlewares / routes
- `server.js`: start HTTP server
- `routes.js`: mount route tĩnh theo module
- `config/`: env, constants, permissions
- `shared/`: cross-cutting code dùng chung
- `modules/`: business modules
- `jobs/`: scheduled jobs / async workers trong cùng codebase
- `docs/`: tài liệu kiến trúc / API notes / state machines

---

## 4.3 Cấm tạo shared bừa bãi

Không được tạo các folder chung chung như:

- `src/common/`
- `src/core/`
- `src/base/`
- `src/helpers/`
- `src/services/`
- `src/lib/`

nếu chúng trở thành nơi nhét mọi thứ không biết để đâu.

Chỉ được dùng `shared/` cho **cross-cutting concern thật sự**.

---

## 5. Module boundaries bắt buộc

## 5.1 Danh sách module chính

```txt
modules/
├── foundation/
├── master-data/
├── inventory-core/
├── inbound/
├── outbound/
├── inventory-control/
├── work/
├── integration/
├── billing/
├── vas/
└── reporting/
```

### Rule

- Mỗi module phải có ownership rõ.
- Không tạo module mới chỉ vì “cho tiện”.
- Nếu tính năng mới thuộc một module hiện có, phải đặt trong module đó.
- Chỉ tạo module mới khi có domain boundary thật sự khác biệt.

---

## 5.2 Khi nào được tạo module mới?

Chỉ được tạo module mới khi thỏa ít nhất 3 điều sau:

1. Có business capability độc lập.
2. Có entity / workflow / permission riêng.
3. Có use case đủ lớn để tồn tại lâu dài.
4. Không phù hợp để đặt vào module hiện hữu.
5. Đã review với lead / architect.

Ví dụ có thể hợp lý:

- `bagging`
- `quality-control`
- `appointment`

Ví dụ không hợp lý:

- tạo module `status`
- tạo module `utils-business`
- tạo module `misc`
- tạo module `shared-business`

---

## 6. Internal structure của một module

Một module chuẩn có thể có dạng:

```txt
modules/<module-name>/
├── <module>.routes.js
├── <module>.controller.js
├── <module>.schema.js
├── application/
├── domain/
└── infra/
```

### Vai trò từng phần

#### `<module>.routes.js`

- khai báo route
- gắn middleware
- map route -> controller
- không chứa logic nghiệp vụ

#### `<module>.controller.js`

- parse request
- gọi use case
- trả response
- không chứa business rule dài
- không truy cập Prisma trực tiếp

#### `<module>.schema.js`

- validate input/output contract ở mức request DTO
- không chứa state machine nghiệp vụ

#### `application/`

- orchestration use case
- transaction boundary
- phối hợp domain + repository + integration
- nơi business flow được điều khiển

#### `domain/`

- business rules
- policy
- invariants
- status transition
- errors đặc thù module

#### `infra/`

- repository
- Prisma mapping
- external client/adapters của module
- persistence detail

---

## 6.1 File nào được phép tạo trong module?

### Allowed

- `<module>.routes.js`
- `<module>.controller.js`
- `<module>.schema.js`
- `application/*.usecase.js`
- `domain/*.policy.js`
- `domain/*.state-machine.js`
- `domain/*.rules.js`
- `domain/*.errors.js`
- `infra/*.repository.js`
- `infra/*.mapper.js`
- `infra/*.client.js`
- `infra/*.adapter.js`
- `infra/templates/*`

### Không khuyến khích / cấm nếu không có lý do rất rõ

- `<module>.service.js`
- `helper.js`
- `utils.js`
- `common.js`
- `manager.js`
- `processor.js`
- `index.js` gom bừa export
- `final.js`
- `new.js`
- `temp.js`

Lý do: các tên này mơ hồ, dễ trở thành chỗ nhét logic tạp.

---

## 6.2 Quy tắc cho `service.js`

Mặc định **không tạo** `service.js` trong module nếu module đã có `application/`.

### Chỉ được tạo service khi:

- đó là service có trách nhiệm hẹp và rõ,
- không phải use case riêng lẻ,
- có thể được nhiều use case dùng chung,
- tên service mô tả trách nhiệm cụ thể.

Ví dụ chấp nhận được:

- `inventoryAvailability.service.js`
- `allocationCandidate.service.js`
- `billingSnapshot.service.js`

Ví dụ không chấp nhận:

- `inbound.service.js`
- `outbound.service.js`
- `work.service.js`
- `common.service.js`

---

## 7. Naming convention bắt buộc

## 7.1 Tên file

Dùng `camelCase` + suffix mô tả vai trò.

### Ví dụ đúng

- `createReceipt.usecase.js`
- `shipShipment.usecase.js`
- `inbound.state-machine.js`
- `inventory.rules.js`
- `workHeader.repository.js`
- `weighbridge.adapter.js`

### Ví dụ sai

- `CreateReceipt.js`
- `receiptService.js`
- `doShip.js`
- `helper.js`
- `commonRepo.js`
- `work-final.js`

---

## 7.2 Tên class / function

Tên phải thể hiện đúng hành vi.

### Ví dụ tốt

- `createReceipt`
- `confirmReceipt`
- `completeWorkLine`
- `postInboundReceipt`
- `reverseInventoryTransaction`
- `assertShipmentCanBeShipped`

### Ví dụ xấu

- `handleData`
- `process`
- `doAction`
- `run`
- `updateEverything`

---

## 7.3 Tên biến

- dùng tên nghiệp vụ rõ nghĩa
- không viết tắt khó hiểu
- không dùng `data`, `item`, `obj` khi có thể đặt tên cụ thể hơn

Ví dụ tốt:

- `receiptHeader`
- `shipmentAllocation`
- `inventoryDimensionId`
- `completedWorkLine`
- `billingSnapshotDate`

---

## 8. Dependency rules bắt buộc

Đây là rule quan trọng nhất để tránh codebase thành spaghetti.

## 8.1 Hướng phụ thuộc chuẩn

```txt
routes -> controller -> application -> domain / infra
application -> inventory-core (được phép theo rule)
infra -> prisma / external system
```

### Không được phụ thuộc ngược chiều

- `domain` không import `controller`
- `domain` không import `repository`
- `repository` không import `controller`
- `shared` không import module nghiệp vụ
- module này không gọi ngược vào controller của module khác

---

## 8.2 Rule import giữa các module

### Được phép

- module A gọi **application service / use case công khai** của module B nếu đã thống nhất boundary
- module A dùng **domain contract** hoặc **API rõ ràng** từ module B

### Không được phép

- import chéo repository của nhau
- import trực tiếp file private trong `infra` của module khác
- gọi xuyên tầng sang `controller` module khác
- đọc trực tiếp table do module khác sở hữu rồi tự suy diễn side effect

### Ví dụ đúng

- `inbound` gọi `inventory-core/application/postingEngine.js`
- `outbound` gọi `work/application/createWork.usecase.js`

### Ví dụ sai

- `inbound` import `outbound/infra/shipment.repository.js`
- `billing` import `inbound.controller.js`
- `work` tự cập nhật `OnHand`

---

## 8.3 Shared layer không được nuốt business logic

`shared/` chỉ được chứa:

- logger
- errors chung
- transaction helper
- auth middleware
- idempotency middleware
- observability
- utilities thuần kỹ thuật

### Cấm đặt vào `shared/`

- `shared/inventory/`
- `shared/billing-rules/`
- `shared/workflow/`
- `shared/warehouse-policy/`
- `shared/business/`

Business logic phải sống trong module sở hữu nó.

---

## 9. Rule cho controller

Controller phải mỏng.

### Controller được phép làm

- đọc params/query/body
- gọi schema validate
- lấy auth context
- gọi use case
- format response
- map error có kiểm soát nếu cần

### Controller không được làm

- viết business rule dài
- gọi Prisma trực tiếp
- mở transaction DB
- gọi external system trực tiếp nếu đó là business flow chính
- viết allocation / tolerance / posting logic

### Dấu hiệu controller đang sai

- dài hơn 80–120 dòng và có nhiều nhánh `if`
- có query DB trong controller
- có loop qua data để áp rule nghiệp vụ
- có `try/catch` phức tạp để xử lý business outcome

---

## 10. Rule cho application use case

Use case là trái tim của module ở mức orchestration.

### Use case phải làm

- điều phối flow nghiệp vụ
- gọi domain policy để validate transition/rule
- gọi repository để đọc/ghi dữ liệu của module
- gọi module khác qua public boundary được phép
- mở transaction nếu operation cần atomicity
- publish audit / billing / integration trigger nếu có

### Use case không nên làm

- chứa query SQL/Prisma dài
- chứa mapping dữ liệu lặp lại nhiều nơi
- chứa constant hardcode nghiệp vụ rải rác

### Mỗi use case nên có 1 hành vi chính

Ví dụ tốt:

- `createReceipt.usecase.js`
- `confirmReceipt.usecase.js`
- `shipShipment.usecase.js`
- `adjustInventory.usecase.js`

Ví dụ xấu:

- `inboundFlow.usecase.js`
- `processReceiptAndWorkAndBilling.usecase.js`

Nếu 1 file đang điều phối quá nhiều hành vi, phải tách.

---

## 11. Rule cho domain layer

Domain là nơi chứa **business truth**.

### Domain được phép chứa

- policy
- rule
- invariant
- status transition
- domain-specific error
- pure function/business validation

### Domain không được chứa

- Prisma query
- HTTP request/response detail
- Express object
- external API call
- logging kỹ thuật quá mức

### Rule kỹ thuật

- domain ưu tiên hàm thuần hoặc object thuần
- dễ unit test
- không phụ thuộc framework nếu không cần

---

## 12. Rule cho repository / infra

Repository chỉ làm persistence/access.

### Repository được phép làm

- query Prisma
- save/read aggregate data
- transaction-scoped persistence
- mapper DB record -> domain/application object

### Repository không được làm

- viết state machine
- quyết định business approval
- quyết định posting
- tính billing rule
- tự gọi module khác để xử lý workflow

### Dấu hiệu repository đang sai

- repository có quá nhiều `if/else` nghiệp vụ
- repository biết business status transition
- repository gọi mail/ERP/weighbridge

---

## 13. Rule cho schema / validation

`<module>.schema.js` chỉ validate request contract.

### Được phép

- field required/optional
- enum request
- string/number/date format
- basic shape validation

### Không được phép

- validate “status hiện tại có được ship không”
- validate “tồn kho có đủ không”
- validate “tolerance cân có vượt rule không”

Các rule đó thuộc:

- `domain/`
- hoặc `application/` khi cần orchestration context

---

## 14. Rule cho transaction boundary

## 14.1 Khi nào phải mở transaction?

Phải mở transaction khi 1 use case có nhiều write liên quan chặt chẽ, ví dụ:

- tạo receipt + receipt lines + audit
- confirm receipt + post inventory + create billing event
- complete work line + update work + post inventory
- ship shipment + post inventory + create billing event

### Rule

- transaction mở ở `application layer`
- không mở transaction ở controller
- không để repository tự tạo transaction ngầm mà use case không kiểm soát

---

## 14.2 Transaction phải ngắn

Không đặt vào transaction các phần:

- gọi API external chậm
- upload file
- gửi mail
- generate export nặng
- chờ weighbridge callback

Pattern đúng:

1. ghi dữ liệu nghiệp vụ cốt lõi trong transaction
2. commit
3. xử lý side effect ngoài transaction nếu phù hợp

---

## 15. Rule cho jobs

`jobs/` chỉ chứa scheduled/background jobs.

### Được phép

- reconciliation job
- storage snapshot job
- export cleanup job
- ERP repush job

### Không được phép

- nhét business flow chính đang được API sử dụng mỗi ngày vào job chỉ vì “đỡ viết đúng kiến trúc”
- duplicate logic giữa job và use case

### Rule

- job phải gọi vào application service/use case rõ ràng
- job không viết riêng một business flow khác với API path nếu cùng hành vi

---

## 16. Rule cho tests

## 16.1 Cấu trúc test

```txt
tests/
├── unit/
├── integration/
├── contract/
└── e2e/
```

### Quy tắc

- `domain/` phải có unit test trước tiên
- use case quan trọng phải có integration test
- flow chính inbound/outbound/work phải có e2e test hoặc integration flow test
- bug critical phải đi kèm regression test

---

## 16.2 File test đặt tên

Ví dụ:

- `createReceipt.usecase.test.js`
- `inbound.state-machine.test.js`
- `postingEngine.integration.test.js`
- `shipShipment.e2e.test.js`

Không dùng tên mơ hồ như:

- `test1.js`
- `inbound-final.test.js`
- `misc.test.js`

---

## 17. Rule cho file rác và dead code

## 17.1 File rác là gì?

Các file sau bị xem là file rác nếu commit lên repo:

- file thử nghiệm local
- file backup thủ công
- file duplicate logic cũ không còn dùng
- file đặt tên mơ hồ không ai biết trách nhiệm
- file TODO scaffold nhưng không dùng

Ví dụ:

- `abc.js`
- `test-api.js`
- `draft.js`
- `backup-old.js`
- `inbound.new.js`
- `temp.repository.js`

### Rule

Không commit các file này.

---

## 17.2 Không comment-out code block lớn

Không giữ các block code cũ bị comment hàng chục dòng trong source.

Cách đúng:

- xóa hẳn nếu không dùng
- dựa vào git history để truy vết

---

## 17.3 Không để TODO mơ hồ

Ví dụ TODO xấu:

- `TODO: fix later`
- `TODO: optimize`
- `TODO: handle edge cases`

Nếu cần TODO, phải rõ:

- vì sao chưa làm
- điều kiện để làm
- ticket/reference nếu có

Ví dụ tốt:

- `TODO(SWM-142): split allocation strategy into FEFO/FIFO policies after FEFO go-live`

---

## 18. Rule cho docs trong codebase

Mỗi module lớn nên có thể có tài liệu ngắn nếu cần, nhưng không lạm dụng.

### Được phép

- `docs/architecture.md`
- `docs/state-machines.md`
- `docs/api.md`
- `modules/inbound/README.md` nếu module rất phức tạp

### Không nên

- mỗi folder con lại có 1 file note rời rạc khó kiểm soát
- để docs lỗi thời khác với code

Rule: docs phải ngắn, cập nhật được, và phục vụ onboarding/review.

---

## 19. Checklist bắt buộc trước khi tạo file mới

Trước khi tạo file mới, dev phải tự hỏi:

1. File này thuộc module nào?
2. File này thuộc layer nào: controller, application, domain, hay infra?
3. Trách nhiệm file có mô tả được bằng 1 câu rõ ràng không?
4. Đã có file hiện hữu phù hợp chưa?
5. Tên file có phản ánh đúng hành vi không?
6. File này có làm trùng logic với file khác không?
7. File này có làm lộ business rule sang sai layer không?

Nếu không trả lời được rõ 7 câu trên thì **chưa được tạo file**.

---

## 20. Checklist code review bắt buộc

Reviewer phải check ít nhất các điểm sau:

### Về kiến trúc

- file đặt đúng module chưa?
- file đặt đúng layer chưa?
- có import chéo sai boundary không?
- có business rule bị nhét vào controller/repository/integration không?

### Về naming

- tên file có rõ hành vi không?
- có file tên mơ hồ như `service`, `helper`, `utils` không?
- tên function có phản ánh đúng intent không?

### Về inventory integrity

- có module nào tự ghi inventory ngoài `inventory-core` không?
- có bypass `postingEngine` không?
- có nguy cơ duplicate side effect không?

### Về maintainability

- file có quá to không?
- use case có ôm quá nhiều trách nhiệm không?
- logic có bị copy-paste không?

### Về test

- có test cho rule quan trọng không?
- bug fix có regression test không?

---

## 21. Ví dụ đúng / sai

## 21.1 Ví dụ đúng

### Case: xác nhận phiếu nhập

- route gọi `inbound.controller.js`
- controller gọi `confirmReceipt.usecase.js`
- use case gọi `inbound.policy.js` để check transition
- use case gọi `receipt.repository.js`
- use case gọi `inventory-core/postingEngine.js`
- use case tạo audit / billing event nếu cần

Đây là flow đúng boundary.

---

## 21.2 Ví dụ sai

### Case: xác nhận phiếu nhập nhưng controller tự xử lý hết

- controller validate state
- controller query Prisma
- controller update receipt
- controller insert `InventTrans`
- controller update `OnHand`
- controller gửi mail

Đây là sai hoàn toàn vì controller đang ôm mọi thứ.

---

## 21.3 Ví dụ sai khác

### Case: `workLine.repository.js` tự trừ tồn

Repository của work không được tự cập nhật `OnHand` chỉ vì thấy work line completed.

Cách đúng là:

- use case `completeWorkLine.usecase.js`
- gọi `inventory-core/postingEngine.js`
- repository chỉ save phần dữ liệu mà nó sở hữu

---

## 22. Rule cho refactor

Khi refactor phải đảm bảo:

- không đổi boundary bừa bãi
- không tạo file mới chỉ để né sửa file cũ
- xóa file cũ nếu đã thay thế hoàn toàn
- cập nhật import sạch sẽ
- giữ test pass

### Không được refactor kiểu

- copy file cũ sang file mới rồi để cả 2 cùng tồn tại
- tạo `xxx.v2.js`
- tạo `xxx-new.js`
- tạo `xxx-fixed.js`

Nếu refactor xong, chỉ nên còn **một nguồn sự thật**.

---

## 23. Rule cho exception / thay đổi rule

Nếu có trường hợp không thể tuân thủ rule hiện tại, dev không được tự phá rule im lặng.

Phải làm một trong các cách sau:

1. nêu rõ trong pull request vì sao cần ngoại lệ
2. cập nhật tài liệu rule nếu cả team đồng ý đổi chuẩn
3. thêm note ngắn trong `docs/architecture.md` nếu ảnh hưởng lớn

Nguyên tắc: **không có ngoại lệ ngầm**.

---

## 24. Definition of Done cho backend file/code

Một file/code path chỉ được xem là hoàn thành khi:

- nằm đúng folder
- tên đúng convention
- đúng module ownership
- đúng layer responsibility
- không vi phạm dependency rule
- có test phù hợp
- không sinh file rác / dead code
- không bypass inventory-core nếu có inventory effect
- có idempotency nếu là side effect command
- có audit/log phù hợp nếu là flow quan trọng

---

## 25. Quy tắc chốt ngắn gọn để team nhớ

Nếu team chỉ nhớ 10 câu, hãy nhớ 10 câu này:

1. **Không multi-tenant hóa hệ thống này ở Phase 1.**
2. **Inventory chỉ được ghi qua `inventory-core`.**
3. **Work là execution layer, không phải stock owner.**
4. **Inbound/Outbound giữ state machine, không ôm hết mọi thứ.**
5. **Integration là adapter, không quyết định business.**
6. **Controller mỏng, repository ngu, domain rõ, use case điều phối.**
7. **Không tạo file `helper`, `common`, `service` mơ hồ.**
8. **Không import chéo bừa bãi giữa các module.**
9. **Mọi side effect phải idempotent và audit được.**
10. **Tạo file mới phải trả lời được: file này thuộc module nào, layer nào, trách nhiệm gì.**

---

## 26. Kết luận

Bộ rule này không nhằm làm team chậm đi. Mục tiêu của nó là để team đi **nhanh nhưng không phá kiến trúc**, đặc biệt trong dự án có nhiều flow nhạy cảm như inventory, weighbridge, work execution và billing.

Nếu cả team tuân thủ đúng tài liệu này, codebase sẽ có các đặc tính sau:

- dễ onboard dev mới,
- dễ review,
- ít file rác,
- ít logic đặt sai chỗ,
- ít bug do boundary mơ hồ,
- dễ maintain trong suốt Phase 1 và Phase 2.

Tài liệu này nên được dùng như:

- chuẩn tạo file mới,
- checklist code review,
- chuẩn refactor,
- chuẩn onboarding cho backend dev mới.

