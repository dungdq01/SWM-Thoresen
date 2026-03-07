# TVL — SMART WAREHOUSE MANAGEMENT (SWM)
## BÀI TOÁN NGHIỆP VỤ & BỐI CẢNH DỰ ÁN

| | |
|---|---|
| **Tài liệu:** | Business Problem Statement |
| **Phiên bản:** | v1.0 |
| **Ngày:** | 07/03/2026 |
| **Đối tượng đọc:** | Product Owner, Business Analyst, Project Sponsor |
| **Mục đích:** | Mô tả bài toán từ góc nhìn khách hàng TVL — vận hành thực tế, pain points, kỳ vọng hệ thống |
| **Lưu ý:** | Tài liệu KHÔNG đi sâu vào kỹ thuật hay chi tiết quy trình. Tập trung mô tả "chuyện gì đang xảy ra" và "khách hàng cần gì" |

---

# 1. TVL LÀ AI?

## 1.1 Bức tranh doanh nghiệp

**Thoresen Vinama Logistics (TVL)** là doanh nghiệp logistics quy mô lớn, chuyên cung cấp dịch vụ **kho bãi và phân phối hàng hóa rời (bulk cargo)**.

Mô hình kinh doanh của TVL rất rõ ràng: **nhận hàng từ cảng biển → lưu kho → phân phối nội địa theo lệnh chủ hàng**. TVL là nhà cung cấp dịch vụ 3PL — hàng trong kho thuộc sở hữu của nhiều chủ hàng (Owner) khác nhau, TVL thu phí dịch vụ.

**Quy mô vận hành:**

- 11 nhà kho (WH5.1 → WH5.6.2), tổng ~81.500 m²
- Gồm kho có mái (covered warehouse) và bãi ngoài trời (open yard)
- Nhiều chủ hàng gửi kho đồng thời, mỗi chủ hàng có biểu phí riêng

## 1.2 Đặc thù hàng hóa — Khác biệt hoàn toàn với kho thương mại

Đây là điểm mấu chốt cần hiểu trước khi đọc tiếp: hàng hóa của TVL **KHÔNG giống** hàng trong kho thương mại, kho e-commerce, hay kho sản xuất. Cụ thể:

| Đặc điểm | Kho thương mại thông thường | TVL |
|---|---|---|
| Loại hàng | Thùng, kiện, pallet, SKU đóng gói | **Hàng rời/hàng xá** (bột đá, clinker, phân bón, sắn lát) — đổ đống, không đóng gói |
| Nhận dạng hàng | Barcode, RFID, mã vạch | **KHÔNG CÓ barcode/RFID** — không thể dán mã lên đống bột đá |
| Đo lường | Đếm số lượng (piece, thùng, pallet) | **Cân nặng là tất cả** — 100% phụ thuộc trạm cân (weighbridge) |
| Hao hụt | Thường không đáng kể | **Hao hụt tự nhiên** — bay bụi, ẩm, bám dính xe (shrinkage 1-3% là bình thường) |
| Dạng lưu trữ | Rack, shelf, bin | **Đổ đống trên nền kho** hoặc bãi ngoài trời |

Hàng bao (bagged goods) cũng có mặt trong kho TVL, nhưng đó là **sản phẩm đầu ra** của dịch vụ đóng bao (bagging VAS) — tức hàng xá sau khi qua gia công tại kho TVL.

## 1.3 TVL kiếm tiền bằng cách nào?

Toàn bộ doanh thu của TVL đến từ phí dịch vụ thu từ chủ hàng. Có 4 nguồn chính:

| Nguồn thu | Bản chất | Cách tính đơn giản |
|---|---|---|
| **Phí lưu kho** (Storage Fee) | Hàng nằm trong kho bao nhiêu ngày, tính phí bấy nhiêu | Tấn × Đơn giá × Số ngày |
| **Phí xếp dỡ** (Handling Fee) | Mỗi lần nhập hoặc xuất hàng, TVL thu phí bốc xếp | Tấn thực cân × Đơn giá (khác nhau theo loại xe, loại hàng, ngày thường/lễ) |
| **Phí đóng bao** (Bagging Fee) | Dịch vụ gia tăng: đóng hàng xá vào bao | Nhân công (theo tấn, có bậc thang) + Nguyên liệu bao bì (theo số bao) |
| **Phí khác** | Đóng container, pha trộn, chuyển kho, kiểm tra chất lượng | Theo sự kiện hoặc thỏa thuận riêng |

> **Điểm mấu chốt:** Mọi đồng doanh thu của TVL đều bắt nguồn từ dữ liệu vận hành kho — số cân, số ngày lưu, số bao đóng. **Sai dữ liệu = mất tiền hoặc tranh chấp với khách hàng.**

## 1.4 Ai tham gia vận hành hàng ngày?

| Vai trò | Công việc chính | Ở đâu |
|---|---|---|
| **Quản lý kho** (WH Manager) | Giám sát tổng thể, duyệt các trường hợp ngoại lệ, phê duyệt điều chỉnh | Văn phòng kho |
| **Thủ kho** (WH Keeper) | Nhận hàng, xếp hàng vào vị trí, lấy hàng xuất, đóng bao, di chuyển hàng | Sàn kho, di động liên tục |
| **Nhân viên cân** (WB Operator) | Cân xe vào/ra, ghi nhận khối lượng, kiểm tra chênh lệch | Trạm cân |
| **Nhân viên tính phí** (Billing Officer) | Tính phí, tạo công nợ, đối soát với chủ hàng | Văn phòng |
| **Chủ hàng** (Owner) | Gửi lệnh nhập/xuất, nhận báo cáo tồn kho, nhận công nợ hàng tháng | Bên ngoài (khách hàng) |

---

# 2. TVL ĐANG GẶP VẤN ĐỀ GÌ?

## 2.1 Bức tranh chung: Vận hành thủ công, dữ liệu phân tán

Hiện tại TVL vận hành phần lớn bằng **quy trình thủ công kết hợp Excel và sổ sách**. Dữ liệu cân nặng, tồn kho, và tính phí được nhập tay, đối chiếu tay, lưu trữ phân tán trên nhiều file Excel của nhiều người. Không có một nguồn dữ liệu duy nhất đáng tin cậy (single source of truth).

Hệ quả: mỗi bộ phận có "phiên bản sự thật" của riêng mình — số liệu cân ở trạm cân, tồn kho trong sổ thủ kho, billing trên Excel kế toán — và chúng thường **KHÔNG khớp nhau**.

## 2.2 Bảy vấn đề cốt lõi

### Vấn đề 1: Khối lượng — Thứ quan trọng nhất lại khó kiểm soát nhất

Hàng rời không có bao bì chuẩn. Khối lượng chỉ biết khi cân. Mà giữa khối lượng ghi trên chứng từ và khối lượng thực cân **luôn có chênh lệch** — đó là bản chất của hàng rời.

TVL cần trả lời câu hỏi: **"Bao nhiêu phần trăm chênh lệch thì chấp nhận, bao nhiêu thì từ chối?"** — và câu trả lời này khác nhau tùy loại hàng (clinker chênh ít hơn cassava), tùy chủ hàng (mỗi owner có tolerance riêng).

Hiện tại, quyết định này phụ thuộc vào phán đoán cá nhân của nhân viên cân. Không có quy chuẩn, không có log, không trace lại được tại sao xe này được nhận mà xe kia bị từ chối.

> **Ví dụ:** Xe nhập CaCO₃, chứng từ ghi 30.000 kg. Cân thực: Net = 30.300 kg → chênh +1,0%. Tolerance cho phép 2% → OK. Nhưng nếu +7% → phải từ chối. Ai quyết? Dựa vào đâu? Ghi ở đâu?

### Vấn đề 2: Hai luồng nhập hàng, một mớ hỗn độn

TVL có hai nguồn hàng đầu vào hoàn toàn khác nhau:

- **Hàng tàu (Vessel):** Một vận đơn (B/L) gồm hàng chục chuyến xe. Mỗi xe chỉ chở một phần. Phải tổng hợp tất cả xe cùng B/L mới biết tổng khối lượng thực nhận.
- **Hàng xe đăng ký (Standard):** Xe đăng ký trước, vào cân, dỡ, cân lại. Đơn giản hơn nhưng vẫn cần kiểm soát tolerance.

Hai luồng này hiện xử lý theo cách khác nhau, dữ liệu lưu ở chỗ khác nhau, rất khó khi cần đối chiếu tổng tồn kho hay tổng hợp báo cáo.

### Vấn đề 3: Không biết hàng nằm ở đâu

11 nhà kho, hàng trăm vị trí. Hàng dỡ ở khu tiếp nhận rồi chuyển vào vị trí lưu trữ. Nhưng:

- Không có hệ thống ghi nhận vị trí → **thủ kho phải nhớ bằng đầu**.
- Khi cần lấy hàng xuất, phải đi hỏi người — không có dữ liệu tra cứu.
- Khi hàng di chuyển nội bộ (dồn kho, sắp xếp lại), không ai cập nhật → tồn kho "trên sổ" lệch với thực tế.
- Hàng ở trạng thái nào (sẵn sàng xuất / hư hỏng / đang bị khóa / đang vận chuyển) cũng không rõ ràng.

### Vấn đề 4: Xuất hàng nhiều mã trên cùng một xe — Phức tạp và dễ sai

Đây là đặc thù nổi bật nhất của TVL: **một xe có thể chở nhiều loại hàng** (VD: CaCO₃ + CaO + Dolomite). Phải cân xe sau mỗi lần chất một mã hàng, tính net bằng hiệu giữa hai lần cân liền kề. Thủ kho chọn tự do thứ tự chất hàng, không theo thứ tự chứng từ.

> **Ví dụ:** Xe chở 3 mã, cân 4 lần (1 tare + 3 gross). Sai số ở lần cân thứ 2 sẽ kéo sai tất cả lần sau. Hiện tại ghi tay → sai sót thường xuyên.

Thêm vào đó, mỗi mã hàng phải kiểm tra tolerance riêng. Nếu **một mã fail** → toàn bộ xe bị giữ lại chờ xử lý ngoại lệ. Quy trình xử lý ngoại lệ hiện tại: gọi điện cho quản lý → quản lý xuống cân xem → quyết định miệng → không có log.

### Vấn đề 5: Tính phí — Nguồn sống nhưng cũng là nguồn đau đầu lớn nhất

Billing là nghiệp vụ sống còn của TVL, nhưng lại là nơi phát sinh nhiều vấn đề nhất:

**a) Phí lưu kho — Phức tạp hơn tưởng tượng**

Công thức: **(Tồn đầu ngày + Nhập trong ngày) × Đơn giá/tấn/ngày**, tính cho từng ngày, từng chủ hàng, từng sản phẩm. Cộng dồn cả tháng. Nhân viên phải chạy snapshot cuối ngày (hiện tại = Excel), với hàng nghìn dòng. Một sai sót nhỏ ở ngày 1 kéo sai cả tháng.

Lưu ý: công thức dùng **tồn đầu ngày + nhập**, KHÔNG trừ xuất trong ngày. Tức là ngày có xuất 300 tấn vẫn tính phí trên toàn bộ tồn đầu + nhập. Đây là logic nghiệp vụ TVL confirm, nhưng rất dễ nhầm nếu tính tay.

Ngoài ra còn có cơ chế **miễn phí lưu kho** (free days) — một số chủ hàng được miễn phí mấy ngày đầu sau khi nhập. Phải track ngày putaway đầu tiên cho từng lô hàng.

**b) Phí xếp dỡ — Nhiều biến số**

Đơn giá thay đổi theo: loại xe, dạng hàng (xá hay bao), ngày thường/nghỉ/lễ (100% / 150% / 200%), ngoài giờ (+30% đến +100%). Rất nhiều tổ hợp → tính tay thường sai.

**c) Phí đóng bao — Bậc thang phức tạp**

Sản lượng 0–1.000 tấn: 111K/tấn. 1.001–5.000 tấn: 105K/tấn. >5.000 tấn: 100K/tấn. Tính sai bậc là chuyện thường.

**d) Đối soát — Nỗi ám ảnh hàng tháng**

Chủ hàng thường xuyên thắc mắc từng dòng phí. Yêu cầu trace ngược: "Dòng phí 250.000đ ngày 01/03 là từ xe nào, lần cân nào, phiếu nhập nào?" Hiện tại rất khó trả lời vì dữ liệu phân tán giữa Excel cân, sổ kho, và file billing.

### Vấn đề 6: Đóng bao — Biến động tồn kho kép và bài toán DPM

Dịch vụ đóng bao tạo ra biến động tồn kho phức tạp: giảm hàng xá, tăng hàng bao, tiêu hao bao bì. Phải ghi nhận cả 3 dòng biến động cùng lúc — hiện tại làm tay, dễ quên dòng nào đó.

**Bài toán đặc biệt — Chủ hàng DPM (Đạm Phú Mỹ):** DPM yêu cầu xuất kho theo **khối lượng quy cách** (1.000 bao × 50kg = 50.000 kg danh nghĩa), nhưng khối lượng thực cân có thể là 50.500 kg. **Kho trừ bao nhiêu?** Đây là bài toán dual tracking: báo cáo theo quy cách bao, nhưng tồn kho theo khối lượng thực.

### Vấn đề 7: Chuyển kho và hao hụt — "Hàng biến mất" trên sổ sách

TVL thường xuyên chuyển hàng giữa các kho. Hàng phải cân tại kho gửi và cân lại tại kho nhận — chênh lệch là hao hụt vận chuyển. Nhưng: giữa lúc hàng rời kho A và chưa đến kho B, **hàng "biến mất" khỏi sổ sách** — không có trạng thái "đang vận chuyển" (In-Transit) trong hệ thống hiện tại.

Hao hụt tổng thể (shrinkage) cũng là vấn đề lớn: nhập 1.000 tấn, xuất hết chỉ còn 985 tấn. 15 tấn đi đâu? Bay bụi? Bám xe? Ẩm? Hiện không track được shrinkage theo từng owner, từng sản phẩm → không phát hiện được bất thường.

---

# 3. TVL CẦN GÌ TỪ HỆ THỐNG MỚI?

## 3.1 Tầm nhìn — Nói bằng một câu

> **Số hóa toàn bộ chuỗi vận hành kho, từ trạm cân đến sàn kho đến bàn kế toán, sao cho mọi số liệu chỉ cần nhập MỘT LẦN, tại ĐÚNG NƠI nó phát sinh, và tự động chảy sang tất cả các khâu còn lại.**

## 3.2 Năm kỳ vọng cốt lõi

### Kỳ vọng 1: Ghi nhận tự động — Bỏ nhập tay

Khối lượng cân phải tự động đọc từ trạm cân vào hệ thống. Không nhập tay. Không chép lại. Con số trên cân bao nhiêu → hệ thống ghi bấy nhiêu. Giảm triệt để sai sót do con người.

### Kỳ vọng 2: Biết ngay — Hàng nào, của ai, ở đâu, bao nhiêu

Tồn kho phải cập nhật **ngay khi sự kiện xảy ra**: xe cân xong → tồn tăng, xe xuất xong → tồn giảm, hàng chuyển vị trí → tồn di chuyển theo. Bất kỳ ai, bất kỳ lúc nào, mở hệ thống lên phải thấy tồn kho chính xác, lọc theo chủ hàng, kho, vị trí, trạng thái hàng.

### Kỳ vọng 3: Tính phí tự động — Không cần Excel

Hệ thống tự tính phí dựa trên dữ liệu kho thực tế. Nhân viên billing chỉ cần **kiểm tra và duyệt**, không phải tự tính. Mọi dòng phí đều trace ngược được đến chứng từ gốc: phiếu nhập nào, lần cân nào, ngày nào, xe gì.

### Kỳ vọng 4: Sàn kho di động hóa

Thủ kho dùng điện thoại/tablet để nhận lệnh, xác nhận vị trí (scan QR), ghi nhận khối lượng. Tự chủ nhận việc (không cần trưởng kho phân công từng task). Hoạt động được cả khi mất sóng (offline → sync khi có mạng).

### Kỳ vọng 5: Kiểm soát ngoại lệ có quy chuẩn

Mọi trường hợp ngoại lệ (chênh lệch tolerance, hàng hư, điều chỉnh tồn kho) phải có quy trình rõ ràng, có log, có lý do, có người chịu trách nhiệm. Không còn "quyết định miệng" không ai nhớ.

## 3.3 Phạm vi hệ thống — Phase 1 (Go-Live)

| Có trong Phase 1 | KHÔNG có trong Phase 1 |
|---|---|
| Web Admin Portal cho quản lý và kế toán | Tích hợp sâu ERP (chỉ đẩy debit note một chiều) |
| Mobile App cho sàn kho (Android/iOS/Web Mobile) | Đa tiền tệ (chỉ VND) |
| Kết nối trạm cân tự động | Cross-dock |
| Toàn bộ chu trình billing: thiết lập → tự tính → debit note → khóa | RFID / Barcode (hàng rời không dùng được) |
| OCR quét phiếu giao hàng cảng | Tracking pallet / LPN |
| Sơ đồ 2D vị trí kho | Tracking Batch/Lot (xem xét Phase 2) |
| Dashboard công suất + aging | Credit Note (Phase 2) |
| Báo cáo nhập/xuất/tồn/hao hụt | Camera nhận dạng biển số (nhập tay Phase 1) |
| Module chuyển kho nội bộ | Phân bổ FEFO (chỉ dùng FIFO Phase 1) |

## 3.4 Các chủ hàng đặc biệt cần lưu ý

| Chủ hàng | Đặc thù | Ảnh hưởng |
|---|---|---|
| **DPM (Đạm Phú Mỹ)** | Xuất theo quy cách bao (nominal weight), không theo thực cân. Cần dual tracking: kho trừ thực, báo cáo theo bao. | Cần logic riêng cho tồn kho + billing |
| **Owner có tolerance riêng** | Mỗi chủ hàng, mỗi loại hàng có thể có tolerance % khác nhau | Config phải linh hoạt: per owner + per product, có default fallback |
| **Owner có hợp đồng riêng** | Biểu phí, free days, bậc thang giá khác nhau | Hệ thống phải hỗ trợ nhiều contract, max 1 active per owner per thời điểm |

---

# 4. TỔNG KẾT BÀI TOÁN

## 4.1 TVL không chỉ cần "phần mềm kho"

TVL cần một hệ thống **quản lý kho + billing + truy vết** tích hợp, được thiết kế cho đặc thù hàng rời — nơi mà:

- **Cân nặng thay thế barcode** làm phương thức nhận dạng duy nhất.
- **Tolerance** thay thế exact match làm tiêu chuẩn kiểm soát.
- **Shrinkage** là chuyện bình thường cần quản lý, không phải bug cần fix.
- **Billing phụ thuộc 100% vào dữ liệu kho** — sai tồn kho = sai phí = mất doanh thu.

## 4.2 Bảng tóm tắt pain points và kỳ vọng

| # | Pain Point hiện tại | Kỳ vọng từ SWM |
|---|---|---|
| 1 | Khối lượng cân nhập tay, không có quy chuẩn tolerance | Đọc cân tự động, tolerance config theo owner/product, log 100% |
| 2 | Hai luồng nhập (tàu/xe) xử lý rời rạc | Một hệ thống xử lý cả hai, tổng hợp tự động theo B/L |
| 3 | Không biết hàng ở đâu, thủ kho nhớ bằng đầu | Tracking vị trí realtime, scan QR xác nhận |
| 4 | Xuất nhiều mã/xe ghi tay, sai sót nhiều | Multi-trip weighing tự động, tolerance check từng mã |
| 5 | Tính phí thủ công trên Excel, tranh chấp nhiều | Auto-billing từ dữ liệu kho, trace 100% về chứng từ gốc |
| 6 | Đóng bao không track biến động tồn kho, DPM cần logic riêng | 3 dòng biến động tự động, dual tracking cho DPM |
| 7 | Chuyển kho mất dấu, shrinkage không track | Trạng thái In-Transit, cân 2 đầu, shrinkage report per owner |

## 4.3 Các câu hỏi còn mở — Cần TVL trả lời trước khi thiết kế chi tiết

Đây là những quyết định nghiệp vụ mà **chỉ TVL mới trả lời được**, không phải đội giải pháp tự quyết:

| # | Câu hỏi | Tại sao quan trọng | Risk |
|---|---|---|---|
| 1 | Tolerance % cụ thể cho từng loại hàng, từng owner? | Ảnh hưởng trực tiếp đến việc xe được nhận hay bị từ chối | 🔴 HIGH |
| 2 | Giờ chốt cuối ngày (EOD cut-off) — 23:59 hay giờ khác? | Quyết định snapshot tồn kho hàng ngày → ảnh hưởng billing | 🔴 HIGH |
| 3 | Logic DPM: kho trừ theo actual hay nominal? Report xuất theo gì? | Ảnh hưởng thiết kế tồn kho + billing cho chủ hàng lớn | 🔴 HIGH |
| 4 | Shrinkage tolerance cho phép bao nhiêu %? | Bao nhiêu là "bình thường", bao nhiêu cần cảnh báo? | 🟡 MEDIUM |
| 5 | Xe cân fail tolerance → giữ xe lại hay cho đi rồi xử lý sau? | Ảnh hưởng quy trình tại trạm cân và ùn tắc | 🟡 MEDIUM |
| 6 | Short pick (lấy ít hơn đơn đặt) — tự động điều chỉnh hay cần duyệt? | Ảnh hưởng quy trình xuất kho | 🟡 MEDIUM |
| 7 | Lịch ngày lễ/ngày nghỉ — ai maintain? Cập nhật hàng năm hay cố định? | Ảnh hưởng phí xếp dỡ (hệ số 150%–300%) | 🟢 LOW |

---

*Tài liệu này là điểm khởi đầu để PO và BA đồng thuận về phạm vi bài toán trước khi đi vào thiết kế chi tiết từng module. Mọi quy trình chi tiết (step-by-step), business rules, data model, UI wireframe sẽ được triển khai trong các tài liệu spec riêng.*
