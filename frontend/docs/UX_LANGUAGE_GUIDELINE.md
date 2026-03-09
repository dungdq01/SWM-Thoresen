# UX Language Guideline - SWM-Thoresen WMS

**Version**: 1.0  
**Last Updated**: 2026-03-09

---

## 1. Language Policy

### Primary Language: **English**

All UI elements MUST use English consistently. This includes:
- Navigation labels
- Button text
- Table headers
- Form labels
- Status badges
- Error messages
- Empty states
- Tooltips

### Rationale (Lý do)
1. **Industry Standard**: WMS/Logistics terminology is internationally standardized in English
2. **Scalability**: Easier to onboard non-Vietnamese speakers
3. **Consistency**: Avoids translation inconsistencies
4. **Professional**: Aligns with enterprise software standards

---

## 2. Text Conversion Reference

### Common Actions

| ❌ Vietnamese (OLD) | ✅ English (NEW) |
|---------------------|------------------|
| Làm mới | Refresh |
| Làm mới dữ liệu | Refresh Data |
| Tạo mới | Create |
| Tạo ... | Create ... |
| Sửa | Edit |
| Xóa | Delete |
| Lưu | Save |
| Hủy | Cancel |
| Đóng | Close |
| Xác nhận | Confirm |
| Gửi | Submit |
| Tìm kiếm | Search |
| Lọc | Filter |
| Xuất | Export |
| Nhập | Import |

### Status & States

| ❌ Vietnamese (OLD) | ✅ English (NEW) |
|---------------------|------------------|
| Đang tải... | Loading... |
| Đang xử lý... | Processing... |
| Thành công | Success |
| Thất bại | Failed |
| Chờ xử lý | Pending |
| Đã hoàn thành | Completed |
| Đã hủy | Cancelled |

### Empty States

| ❌ Vietnamese (OLD) | ✅ English (NEW) |
|---------------------|------------------|
| Chưa có dữ liệu | No data available |
| Chưa có ... | No ... found |
| Không tìm thấy | No results found |
| Danh sách trống | List is empty |

### Instructions & Prompts

| ❌ Vietnamese (OLD) | ✅ English (NEW) |
|---------------------|------------------|
| Chọn ... | Select ... |
| Nhập ... | Enter ... |
| Vui lòng ... | Please ... |
| Bắt buộc | Required |

### Navigation & Headers

| ❌ Vietnamese (OLD) | ✅ English (NEW) |
|---------------------|------------------|
| Điều hướng | Navigation |
| Quản lý | Manage / Management |
| Danh sách | List |
| Chi tiết | Details |
| Cài đặt | Settings |
| Báo cáo | Reports |

### Module-Specific Terms

| ❌ Vietnamese (OLD) | ✅ English (NEW) |
|---------------------|------------------|
| Tạo shipment nhanh | Quick Create Shipment |
| Công việc đã claim | Claimed Work |
| Tất cả công việc | All Work |
| Đóng bao | Bagging |
| Đóng gói lại | Repacking |
| Chuyển kho | Transfer |
| Di chuyển nội bộ | Internal Move |
| Kiểm kê | Cycle Count |
| Điều chỉnh | Adjustment |

---

## 3. Module Description Patterns

### Layout Header Pattern

```jsx
// ❌ BAD - Mixed languages
<h2 className="module-nav-title">Điều hướng operational gatekeeper</h2>
<p className="module-nav-description">Theo dõi planning receipt...</p>

// ✅ GOOD - Consistent English
<h2 className="module-nav-title">Inbound Operations</h2>
<p className="module-nav-description">Manage receipts, weighing, exceptions, and putaway handoff.</p>
```

### Page Title Pattern

```jsx
// ❌ BAD
<h2 className="section-title">Work Queue (tất cả công việc)</h2>

// ✅ GOOD
<h2 className="section-title">Work Queue</h2>
```

### Form Section Pattern

```jsx
// ❌ BAD
<h3>Tạo VAS Work Order</h3>
<p>Tạo công việc đóng bao hoặc đóng gói lại.</p>

// ✅ GOOD
<h3>Create VAS Work Order</h3>
<p>Create bagging or repacking work orders.</p>
```

---

## 4. Button Naming Conventions

### Primary Actions
- **Create** - For creating new entities
- **Save** - For saving changes
- **Submit** - For submitting forms/requests
- **Confirm** - For confirming actions

### Secondary Actions
- **Cancel** - For canceling actions
- **Close** - For closing modals/panels
- **Reset** - For resetting forms

### Tertiary Actions
- **Refresh** - For refreshing data
- **Export** - For exporting data
- **Import** - For importing data

### Workflow Actions
- **Release** - Release for processing
- **Approve** - Approve request
- **Reject** - Reject request
- **Start** - Start work/process
- **Complete** - Complete work/process
- **Ship** - Ship goods
- **Receive** - Receive goods

---

## 5. Accessibility & UX Standards

### ISO 9241-11 Compliance
- **Effectiveness**: Clear labels that communicate purpose
- **Efficiency**: Minimal text, maximum clarity
- **Satisfaction**: Professional, consistent tone

### Cognitive Load Reduction
- Use familiar terminology
- Keep labels short (2-4 words max)
- Use verbs for actions, nouns for navigation

---

## 6. Implementation Checklist

For each page, verify:

- [ ] Page title is English only
- [ ] All button labels are English
- [ ] Table headers are English
- [ ] Form labels are English
- [ ] Empty state messages are English
- [ ] Status badges are English
- [ ] Error messages are English
- [ ] Modal titles and content are English
- [ ] Navigation items are English
- [ ] Tooltips are English

---

## 7. Files to Update

### Priority 1: Layouts (High Impact)
- `InboundOperationsLayout.jsx`
- `OutboundOperationsLayout.jsx`
- `InventoryControlLayout.jsx`
- `WorkExecutionLayout.jsx`
- `IntegrationLayout.jsx`
- `VasLayout.jsx`
- `BillingLayout.jsx`
- `MasterDataLayout.jsx`
- `InventoryCoreLayout.jsx`

### Priority 2: Settings Pages
- `RolesPage.jsx`
- `ReasonCodesPage.jsx`
- `NumberSequencesPage.jsx`
- `PermissionsPage.jsx`
- `UsersPage.jsx`

### Priority 3: Feature Pages
- All pages under `/pages/*`

---

*This guideline ensures consistent, professional UX across the SWM-Thoresen WMS application.*
