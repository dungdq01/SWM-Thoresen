---
name: WRS Frontend Design System
description: Quy chuẩn thiết kế thống nhất cho toàn bộ frontend WRS — màu sắc, typography, components, layout, popup, animation, sidebar. Tất cả dev Agent PHẢI tuân theo khi làm bất kỳ module FE nào.
---

# 🎨 WRS Frontend Design System — Navy & Moonlight

> **Mục tiêu:** Đồng nhất 100% style, màu sắc, font chữ, form, popup, sidebar, animation xuyên suốt 14 module. Mọi Agent sinh code FE **PHẢI** đọc file này trước khi code.

---

## 1. 🏗️ Tech Stack (BẮT BUỘC)

| Thành phần | Công nghệ | Version | Ghi chú |
|------------|-----------|---------|---------|
| Framework | React + TypeScript | 18.x + TS 5.x | Strict mode |
| Build | Vite | 5.x | Port 9999 |
| Routing | react-router-dom | 6.x | — |
| Styling | TailwindCSS | 3.4.x | Config tại `tailwind.config.js` |
| Icons | lucide-react | 0.344+ | KHÔNG dùng icon library khác |
| Charts | recharts | 2.12+ | — |
| Utilities | clsx + tailwind-merge | Latest | cn() helper |
| Font | Inter | Google Fonts | Đã load trong `index.html` |

### Import alias
```ts
// vite.config.ts
'@': path.resolve(__dirname, './src')

// Sử dụng:
import { Button } from '@/shared/components/ui'
import { cn } from '@/lib/utils'
```

---

## 2. 🎨 Bảng Màu (Color Palette)

### Nguyên tắc
- **Navy** = Foundation, authority, trust → Sidebar, headings, cards đậm
- **Moonlight** = Warmth, clarity → Background, cards nhẹ, borders
- **Gold** = Action, accent → CTA buttons, active states, highlights
- **KHÔNG BAO GIỜ** dùng màu tự chọn ngoài bảng dưới

### Navy Core (Foundation)
```
navy-950: #060e1a   ← Deepest (hiếm dùng)
navy-900: #0a1628   ← Sidebar background
navy-800: #0f1d32   ← Primary text, card navy, button default
navy-700: #162440   ← Sidebar card hover
navy-600: #1e3055   ← Sidebar border active
navy-500: #2a4270   ← Secondary text
navy-400: #3d5a8a   ← Muted text, labels, placeholders
navy-300: #5a7aaa   ← Disabled text
navy-200: #8aa4c8   ← Chart secondary
navy-100: #c0d0e4   ← Avatar bg, divider nhẹ
navy-50:  #e8eef6   ← Hover bg nhẹ
```

### Moonlight / Cream (Warmth)
```
moon-50:  #fdfbf7   ← Lightest (card bg khi cần trắng hơn)
moon-100: #faf5eb   ← Sidebar text, heading on dark
moon-200: #f0e6d3   ← Border chính, divider
moon-300: #e4d4b8   ← Input border, table header bg
moon-400: #d4bf96   ← Muted border đậm
moon-500: #c9a84c   ← Gold accent (= gold.DEFAULT)
```

### Gold Accent
```
gold:       #c9a84c   ← CTA, active menu, icon highlight
gold-light: #e8d598   ← Hover gold, badge gold nhẹ
gold-dark:  #9a7a34   ← Text on gold bg
gold-glow:  rgba(201,168,76,0.15)  ← Glow effect
```

### Semantic Colors
```
background:  #f5f0e8   ← Page background (ấm, kem)
foreground:  #0f1d32   ← Default text (navy-800)
border:      #e4d4b8   ← Default border (moon-300)
card bg:     #ffffff   ← Card background
success:     #2d8f5e   ← Đã hoàn thành, active
warning:     #d4952a   ← Cảnh báo, pending
info:        #3a7bc8   ← Thông tin, in-progress
danger:      #dc4446   ← Lỗi, overdue, delete
```

### Sidebar Colors
```
sidebar:            #0a1628                    ← BG gradient navy
sidebar-foreground: #faf5eb                    ← Text chính
sidebar-accent:     #c9a84c                    ← Gold active item
sidebar-muted:      rgba(250,245,235,0.35)     ← Group title text
sidebar-border:     rgba(250,245,235,0.08)     ← Divider lines
sidebar-hover:      rgba(201,168,76,0.10)      ← Hover bg
sidebar-active:     rgba(201,168,76,0.18)      ← Active bg
```

---

## 3. 📝 Typography

### Font
```css
font-family: 'Inter', system-ui, sans-serif;
letter-spacing: -0.01em;  /* Body */
letter-spacing: -0.02em;  /* Headings */
```

### Hierarchy (BẮT BUỘC tuân theo)

| Element | Size | Weight | Color | Class |
|---------|------|--------|-------|-------|
| Page title (h1) | 24px (text-2xl) | 800 (extrabold) | navy-900 | `text-2xl font-extrabold text-navy-900 tracking-tight` |
| Section title (h2) | 20px (text-heading) | 700 (bold) | navy-900 | `section-title` |
| Card title (h3) | 14px (text-sm) | 600 (semibold) | navy-800 | `text-sm font-semibold text-navy-800` |
| Body text | 14px (text-sm) | 400 | navy-800 | `text-sm text-navy-800` |
| Secondary text | 14px | 400 | navy-400 | `text-sm text-navy-400` |
| KPI number | 32px (text-kpi) | 800 | navy-900 | `kpi-value` |
| KPI number small | 24px (text-kpi-sm) | 700 | navy-900 | `kpi-value-sm` |
| KPI label | 12px (text-xs) | 500 | navy-400 | `kpi-label` |
| Table header | 11px | 700 (bold) | navy-400 | `text-[11px] font-bold text-navy-400 uppercase tracking-wider` |
| Badge text | 11px | 700 | varies | `text-[11px] font-bold` |
| Tiny label | 10px | 600 | navy-400 | `text-[10px] font-semibold text-navy-400` |

### Quy tắc
1. **Heading** luôn `tracking-tight` (-0.02em)
2. **Label/caption** luôn `uppercase tracking-wider`
3. **KHÔNG dùng** font-weight dưới 400 (thin, light)
4. **Body text** tối thiểu 14px, **KHÔNG nhỏ hơn 11px** ở bất kỳ đâu

---

## 4. 📦 Component Standards

### 4.1 Cards

```tsx
// ═══ Card trắng (dùng cho content chính) ═══
<div className="wrs-card p-5">
  {/* content */}
</div>
// CSS: bg-white rounded-2xl border border-moon-200 shadow-card hover:shadow-card-hover transition-all duration-300

// ═══ Card navy (dùng cho highlight, sidebar widget) ═══
<div className="wrs-card-navy p-5">
  {/* content */}
</div>
// CSS: bg-navy-800 rounded-2xl border border-navy-600 text-moon-50

// ═══ Card header (khi card có title + action) ═══
<div className="wrs-card overflow-hidden">
  <div className="flex items-center justify-between px-5 py-4 border-b-2 border-moon-200">
    <h2 className="section-title">
      <IconComponent className="h-5 w-5 text-gold" />
      Title
    </h2>
    <Button variant="outline" size="sm">Action</Button>
  </div>
  <div className="p-5">{/* body */}</div>
</div>
```

**Quy tắc Card:**
- Border-radius: `rounded-2xl` (1rem) — LUÔN LUÔN
- Border: `border border-moon-200` — 1px
- Card header border: `border-b-2 border-moon-200` — 2px bottom
- Shadow: `shadow-card` default, `shadow-card-hover` on hover
- Padding: `p-5` (20px) là standard, `p-4` cho compact

### 4.2 Buttons

```tsx
import { Button } from '@/shared/components/ui'

// Primary (hành động chính) — Navy dark
<Button>Tạo đơn hàng</Button>

// Gold CTA (hành động nổi bật nhất)
<Button variant="gold">Xác nhận giao dịch</Button>

// Outline (hành động phụ)
<Button variant="outline">Lọc</Button>

// Ghost (hành động nhỏ, inline)
<Button variant="ghost" size="sm">Xem thêm</Button>

// Destructive (xoá, huỷ)
<Button variant="destructive">Xóa</Button>

// Icon button
<Button variant="outline" size="icon">
  <Plus className="h-4 w-4" />
</Button>
```

**Quy tắc Button:**
- Border-radius: `rounded-xl` (0.875rem)
- Height: `h-10` default, `h-8` small, `h-12` large
- Font: `font-semibold` (600)
- **Gold button** có `shadow-glow-gold`
- Outline button border: `border-2` (dày hơn bình thường)
- Hover transition: `duration-200`
- Icon trong button: `h-4 w-4` + `gap-2` spacing

### 4.3 Badges

```tsx
import { Badge } from '@/shared/components/ui'

<Badge>Default (navy)</Badge>
<Badge variant="secondary">Nhãn phụ</Badge>
<Badge variant="outline">Viền</Badge>
<Badge variant="success">Hoàn thành</Badge>
<Badge variant="warning">Đang xử lý</Badge>
<Badge variant="danger">Quá hạn</Badge>
```

**Quy tắc Badge:**
- Border-radius: `rounded-lg`
- Font: `text-[11px] font-bold`
- Padding: `px-2.5 py-0.5`
- **Status badges** luôn kèm icon nhỏ (h-3 w-3) bên trái khi có thể

### 4.4 Inputs & Forms

```tsx
import { Input } from '@/shared/components/ui'

// Input chuẩn
<Input placeholder="Tìm kiếm..." />

// Input với icon
<div className="relative">
  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-navy-300" />
  <Input className="pl-10" placeholder="Tìm kiếm..." />
</div>

// Select
<select className="h-10 px-4 rounded-xl border-2 border-moon-200 bg-white text-sm text-navy-800 
  focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 transition-all">
  <option>Tất cả</option>
</select>

// Textarea
<textarea className="w-full px-4 py-3 rounded-xl border-2 border-moon-200 bg-white text-sm text-navy-800 
  placeholder:text-navy-300 focus:outline-none focus:border-gold focus:ring-2 focus:ring-gold/20 
  transition-all resize-none" rows={4} />

// Label
<label className="text-sm font-semibold text-navy-700 mb-1.5 block">
  Tên kho <span className="text-danger">*</span>
</label>

// Error message
<p className="text-xs text-danger mt-1.5 flex items-center gap-1">
  <AlertCircle className="h-3 w-3" /> Trường này bắt buộc
</p>
```

**Quy tắc Form:**
- Border: `border-2 border-moon-200` (dày để rõ ràng)
- Focus: `focus:border-gold focus:ring-2 focus:ring-gold/20`
- Border-radius: `rounded-xl`
- Height: `h-10` cho input/select
- Label: `font-semibold text-navy-700`, spacing `mb-1.5`
- Error: `text-danger text-xs` + icon AlertCircle
- **Vertical spacing**: `space-y-4` giữa các form field

### 4.5 Tables

```tsx
// Dùng CSS utility class wrs-table
<div className="wrs-card overflow-hidden">
  <table className="wrs-table">
    <thead>
      <tr>
        <th>CỘT 1</th>
        <th>CỘT 2</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Dữ liệu</td>
        <td>Dữ liệu</td>
      </tr>
    </tbody>
  </table>
</div>
```

**Quy tắc Table:**
- Wrap trong `wrs-card overflow-hidden`
- Header: bg `moon-50`, text `navy-400`, `uppercase tracking-wider`, font `bold`
- Header bottom border: `border-b-2 border-moon-200`
- Row border: `border-b border-moon-100`
- Row hover: `hover:bg-moon-50/60`
- Cell padding: `px-4 py-4`
- **Mã/ID column**: `font-bold text-navy-900`
- **Name column**: `font-semibold text-navy-800`
- **Secondary info**: `text-navy-400 text-[11px]` dòng dưới

---

## 5. 🖼️ Layout Standards

### 5.1 Page Layout — Dashboard-First (BẮT BUỘC)

> **Quy tắc VÀNG:** Mọi trang PHẢI có dashboard/KPI section ở trên cùng, rồi mới tới details bên dưới (user scroll xuống dần). Logic: **Visualize → Details.**

```tsx
// MỌI PAGE PHẢI THEO STRUCTURE NÀY:
export default function SomePage() {
  return (
    <div className="space-y-6">
      {/* ── 1. Page Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-navy-900 tracking-tight">
            Tiêu đề trang
          </h1>
          <p className="text-sm text-navy-400 mt-0.5">Mô tả ngắn</p>
        </div>
        <Button variant="gold" className="gap-2">
          <Plus className="h-4 w-4" /> Hành động chính
        </Button>
      </div>

      {/* ── 2. Info Banner ── */}
      <div className="rounded-xl bg-gold/8 border border-gold/20 px-4 py-3 text-xs text-navy-600 flex items-center gap-2">
        <Info className="h-4 w-4 text-gold shrink-0" />
        <span><strong>Module X:</strong> Mô tả chức năng module.</span>
      </div>

      {/* ── 3. Dashboard KPIs (BẮT BUỘC mọi trang) ── */}
      <div className="grid grid-cols-4 gap-4">
        {/* 4 KPI cards — luôn có icon square bên trái */}
      </div>

      {/* ── 4. Details Content (scroll xuống) ── */}
      {/* Table / Grid / Form / Cards / etc. */}
    </div>
  )
}
```

### 5.2 Grid System

```
1 cột full:    col-span-12
2 cột bằng:    col-span-6 + col-span-6
7-5 split:     col-span-7 + col-span-5   (dashboard style)
8-4 split:     col-span-8 + col-span-4   (detail page)
3 cột:         col-span-4 × 3
4 cột:         grid grid-cols-4 gap-4     (KPI cards)

Parent: <div className="grid grid-cols-12 gap-5">
```

### 5.3 Spacing

```
Giữa page sections:  space-y-6  (24px)
Giữa cards trong grid: gap-4 hoặc gap-5
Card nội bộ:          space-y-4  (16px)
Form fields:          space-y-4  (16px)
Compact list:         space-y-2  (8px)
Page padding (main):  p-6       (24px) — đã set trong MainLayout
```

---

## 6. 🪟 Popup / Modal / Dialog

### Chuẩn Modal

```tsx
// Modal overlay
<div className="fixed inset-0 z-50 flex items-center justify-center">
  {/* Backdrop */}
  <div className="absolute inset-0 bg-navy-900/60 backdrop-blur-sm" onClick={onClose} />
  
  {/* Modal content */}
  <div className="relative bg-white rounded-2xl shadow-card-lg border border-moon-200 
    w-full max-w-lg mx-4 animate-slide-up overflow-hidden">
    
    {/* Header */}
    <div className="flex items-center justify-between px-6 py-4 border-b-2 border-moon-200">
      <h3 className="text-lg font-bold text-navy-900">Tiêu đề Modal</h3>
      <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-moon-100 transition-colors">
        <X className="h-5 w-5 text-navy-400" />
      </button>
    </div>
    
    {/* Body */}
    <div className="px-6 py-5">
      {/* content */}
    </div>
    
    {/* Footer */}
    <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-moon-200 bg-moon-50">
      <Button variant="outline" onClick={onClose}>Huỷ</Button>
      <Button variant="gold">Xác nhận</Button>
    </div>
  </div>
</div>
```

**Quy tắc Modal:**
- Backdrop: `bg-navy-900/60 backdrop-blur-sm`
- Rounded: `rounded-2xl`
- Max-width: `max-w-sm` (nhỏ), `max-w-lg` (vừa), `max-w-2xl` (lớn), `max-w-4xl` (full)
- Animation: `animate-slide-up`
- Header border: `border-b-2 border-moon-200`
- Footer: `bg-moon-50 border-t border-moon-200`
- Close button: top-right, `rounded-lg hover:bg-moon-100`
- Z-index: `z-50`

### Confirm Dialog

```tsx
// Confirm dialog — dùng cho Delete, Cancel, Destructive actions
<div className="... max-w-sm">
  <div className="px-6 py-6 text-center">
    <div className="w-12 h-12 rounded-full bg-danger/10 flex items-center justify-center mx-auto mb-4">
      <AlertTriangle className="h-6 w-6 text-danger" />
    </div>
    <h3 className="text-lg font-bold text-navy-900 mb-2">Xác nhận xoá?</h3>
    <p className="text-sm text-navy-400">Hành động này không thể hoàn tác.</p>
  </div>
  <div className="flex gap-3 px-6 py-4 border-t border-moon-200 bg-moon-50">
    <Button variant="outline" className="flex-1" onClick={onClose}>Huỷ</Button>
    <Button variant="destructive" className="flex-1">Xoá</Button>
  </div>
</div>
```

---

## 7. 🎭 Toast / Notification

```tsx
// Toast container — fixed bottom-right
// Success
<div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white border-2 border-success/30 shadow-card-lg animate-slide-up">
  <CheckCircle className="h-5 w-5 text-success shrink-0" />
  <div>
    <p className="text-sm font-semibold text-navy-900">Thành công!</p>
    <p className="text-xs text-navy-400">Đơn hàng đã được tạo.</p>
  </div>
  <button className="ml-auto p-1 rounded hover:bg-moon-100"><X className="h-4 w-4 text-navy-400" /></button>
</div>

// Error
border-2 border-danger/30, icon text-danger

// Warning
border-2 border-warning/30, icon text-warning

// Info
border-2 border-info/30, icon text-info
```

**Quy tắc Toast:**
- Position: `fixed bottom-6 right-6 z-[60]`
- Max-width: `max-w-sm`
- Animation: `animate-slide-up`, auto-dismiss 5s
- Border-left accent: Dùng `border-l-4` nếu cần nhấn mạnh hơn
- Stack: Nếu nhiều toast, `space-y-2` từ dưới lên

---

## 7a. 🎯 SlidePanel — Hide & Seek (SÁng tạo)

> **"Xem chi tiết mà không rời trang."** SlidePanel là pattern chính cho hide-and-seek trong WRS. Chuyên nghiệp, mượt, gold accent.

```tsx
import { SlidePanel, SlidePanelTrigger } from '@/shared/components/ui'

// Trigger — luôn dùng SlidePanelTrigger cho consistency
<SlidePanelTrigger label="Xem chi tiết" onClick={() => setOpen(true)} />

// Panel — slides from right, navy header, gold left border
<SlidePanel
  open={isOpen}
  onClose={() => setOpen(false)}
  title="Chi tiết đơn hàng"
  subtitle="ORD-2026-001"
  icon={<FileText className="h-5 w-5 text-gold" />}
  width="md"        // sm | md | lg | xl
  footer={
    <>
      <Button variant="outline" onClick={close}>Đóng</Button>
      <Button variant="gold">Xác nhận</Button>
    </>
  }
>
  {/* Nội dung chi tiết */}
</SlidePanel>
```

**Quy tắc SlidePanel:**
- Animation: `animate-slide-panel` (slide from right, cubic-bezier spring)
- Border-left: `border-l-4 border-gold` — LUÔN có viền vàng bên trái
- Header: gradient navy (`from-navy-800 to-navy-900`), text `moon-50`
- Icon: `bg-gold/20` rounded-xl container
- Backdrop: `bg-navy-900/40 backdrop-blur-[2px]`
- Close: Escape key + click backdrop + X button
- Width: `sm` (384), `md` (512), `lg` (672), `xl` (896)

### Khi nào dùng SlidePanel vs Modal:

| Use Case | Component |
|----------|-----------|
| Xem chi tiết row trong table | **SlidePanel** |
| Form edit nhanh (ít fields) | **SlidePanel** |
| Confirm/Delete dialog | **Modal** (max-w-sm) |
| Form phức tạp (nhiều fields) | **Trang riêng** (navigate) |
| Preview document/image | **SlidePanel** (width lg/xl) |

---

## 7b. 📤 Drawer — Bottom Panel

```tsx
import { Drawer } from '@/shared/components/ui'

<Drawer
  open={isFilterOpen}
  onClose={() => setFilterOpen(false)}
  title="Bộ lọc nâng cao"
  height="auto"      // auto | half | full
>
  {/* Filter form content */}
</Drawer>
```

**Quy tắc Drawer:**
- Slide up from bottom, `rounded-t-2xl`
- Handle bar: `w-10 h-1 rounded-full bg-moon-300` ở top
- Border-top: `border-t-4 border-gold`
- Height: `auto` (fit content, max 70vh), `half` (50vh), `full` (85vh)

---

## 7c. 📑 Pagination — Phân trang chuẩn

```tsx
import { Pagination } from '@/shared/components/ui'

<Pagination
  currentPage={page}
  totalPages={20}
  totalItems={195}
  itemsPerPage={10}
  onPageChange={(p) => setPage(p)}
/>
```

**Quy tắc Pagination:**
- Position: Cuối mỗi bảng/list, có `border-t border-moon-200 pt-4`
- Left: "Hiển thị **1–10** / 195 kết quả"
- Right: `<< < 1 ... 4 [5] 6 ... 20 > >>`
- Active page: `bg-navy-800 text-gold shadow-glow-gold`
- Button hover: `hover:border-gold/40 hover:text-gold`
- **MỌI danh sách > 10 items PHẢI có pagination**

---

## 7d. 🏷️ Tabs — In-Module Navigation

```tsx
import { Tabs, TabContent } from '@/shared/components/ui'

const tabs = [
  { id: 'overview', label: 'Tổng quan', icon: <LayoutDashboard /> },
  { id: 'files', label: 'Files', badge: 12 },
  { id: 'history', label: 'Lịch sử', badge: 5 },
]

<Tabs tabs={tabs} activeTab={active} onTabChange={setActive} />
<TabContent>
  {/* Content phù hợp active tab */}
</TabContent>
```

**Quy tắc Tabs:**
- Active: `text-gold border-b-2 border-gold`
- Inactive: `text-navy-400 hover:text-navy-700`
- Badge: rounded-full, `bg-gold/15 text-gold-dark` khi active
- Content: `animate-fade-in` transition giữa tabs

---

## 7e. 📐 In-Module Forms & Consistency

> **QUY TẮC:** Khi click chức năng trong module (Tạo mới, Sửa, Chi tiết), style PHẢI giữ nguyên — cùng font, cùng spacing, cùng card style.

### Breadcrumb Navigation
```tsx
<div className="breadcrumb">
  <a href="/asset">← Quay lại</a>
  <span>/</span>
  <span className="breadcrumb-active">Tạo site mới</span>
</div>
```

### Form Page Structure
```tsx
<div className="space-y-6">
  {/* Breadcrumb */}
  <div className="breadcrumb">...</div>

  {/* Page title */}
  <h1 className="text-2xl font-extrabold text-navy-900 tracking-tight">Thêm Site mới</h1>

  {/* Form sections — mỗi group 1 card */}
  <div className="form-section">
    <h2 className="form-section-title">
      <Building className="h-5 w-5 text-gold" />
      Thông tin cơ bản
    </h2>
    <div className="form-grid">
      <div className="form-field">
        <label className="form-label">Tên site *</label>
        <Input placeholder="VD: Kho Bình Dương Central" />
      </div>
      {/* more fields */}
    </div>
  </div>

  {/* Another section */}
  <div className="form-section">
    <h2 className="form-section-title">
      <Phone className="h-5 w-5 text-gold" />
      Thông tin liên hệ
    </h2>
    <div className="form-grid">...</div>
  </div>

  {/* Footer actions */}
  <div className="form-footer">
    <Button variant="outline">Huỷ</Button>
    <Button variant="gold">Tạo site</Button>
  </div>
</div>
```

**Quy tắc Form:**
- Form sections: `form-section` (= `wrs-card p-6`)
- Section title: `form-section-title` + icon `text-gold`
- Grid: `form-grid` (1 col mobile, 2 cols desktop)
- Field: `form-field` + `form-label`
- Footer: `form-footer` — outline Cancel + gold Submit
- **LUÔN có breadcrumb** để quay lại danh sách

---

## 8. 📱 Sidebar & Header Standards

### ⚠️ QUY TẮC QUAN TRỌNG: Sidebar = Modules Only, User → Header

Sidebar **CHỈ** hiển thị navigation modules. Thông tin user (avatar, tên, role, settings, logout) **PHẢI** nằm ở **Header góc trên phải** (dropdown menu).

### Sidebar Structure (KHÔNG ĐƯỢC THAY ĐỔI)

```
┌─────────────────────┐
│  Logo   SmartLogWRS  │  h-16, border-b
├─────────────────────┤
│  TRUNG TÂM          │  Group title: text-[10px] font-bold uppercase tracking-[0.15em]
│  ▪ Dashboard         │  
│  ▪ AI Agent          │  
│                      │  mb-5 between groups
│  TÀI SẢN & LISTING  │
│  ▪ Kho bãi           │  Item: text-[13px] font-medium
│  ▪ Marketplace       │  
│  ...6 nhóm...        │  
├─────────────────────┤
│  ◀ Thu nhỏ           │  Collapse toggle — CHỈ CÓ NÚT NÀY
└─────────────────────┘
```

❌ **KHÔNG để User info, Settings, logout trong Sidebar**

### Header Structure (KHÔNG ĐƯỢC THAY ĐỔI)

```
┌────────────────────────────────────────────────────┐
│  🔍 Tìm kiếm...              🔔(3)  [AD] Admin ▼ │
│                                      Operator      │
└────────────────────────────────────────────────────┘
                                Dropdown: Hồ sơ, Cài đặt, Đăng xuất
```

### Quy tắc Sidebar:
- Width: `w-60` (240px) expanded, `w-[68px]` collapsed
- Background: `gradient-navy` (CSS gradient)
- Logo icon: `bg-gold` rounded-xl, icon `Container` from lucide
- Brand text: "SmartLog" `text-moon-50` + "WRS" `text-gold`
- **6 nhóm menu** — KHÔNG thay đổi thứ tự
- Menu item icons: `h-[18px] w-[18px]`
- Active: `bg-sidebar-active text-gold shadow-inner-glow`
- Hover: `hover:text-moon-50 hover:bg-sidebar-hover`
- Collapse animation: `transition-all duration-300 ease-in-out`

---

## 9. 🎬 Animation & Transition Standards

### Allowed Animations

```css
/* Fade in — dùng cho page load */
animate-fade-in   → opacity 0→1, 0.4s ease-out

/* Slide up — dùng cho cards, modals, toasts */
animate-slide-up  → opacity 0→1 + translateY(12px→0), 0.4s ease-out

/* Stagger delay — dùng cho list/grid items */
stagger-1 → delay 50ms
stagger-2 → delay 100ms
stagger-3 → delay 150ms
stagger-4 → delay 200ms
stagger-5 → delay 250ms
```

### Transition Rules

```
Hover effects:     duration-200  (nhanh, snappy)
Layout changes:    duration-300  (sidebar collapse, panel slide)
Color transitions: duration-200
Shadow transitions: duration-300
```

### KHÔNG ĐƯỢC DÙNG:
- ❌ `animate-bounce`, `animate-spin` (trừ loading spinner)
- ❌ `transition-all` không có `duration-*` cụ thể
- ❌ Animation dài hơn 500ms
- ❌ Parallax, 3D transform, heavy GPU effects

---

## 10. 📊 KPI Card Pattern

```tsx
// CHUẨN cho mọi trang có KPI
<div className="grid grid-cols-4 gap-4">
  {kpiCards.map((kpi, i) => (
    <div key={i} className="wrs-card p-5 flex items-center gap-4 animate-slide-up"
         style={{ animationDelay: `${i * 60}ms` }}>
      <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center shrink-0', kpi.iconBg)}>
        <kpi.icon className={cn('h-6 w-6', kpi.iconColor)} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="kpi-value-sm">{kpi.value}</span>
          <span className={cn('text-[11px] font-bold flex items-center gap-0.5 ml-auto',
            kpi.trendUp ? 'text-success' : 'text-danger')}>
            {kpi.trendUp ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {kpi.trend}
          </span>
        </div>
        <p className="kpi-label">{kpi.title}</p>
      </div>
    </div>
  ))}
</div>
```

**KPI icon backgrounds:**
- Navy action: `bg-navy-800 text-gold`
- Success: `bg-success/10 text-success`
- Warning: `bg-warning/10 text-warning`
- Info: `bg-info/10 text-info`
- Danger: `bg-danger/10 text-danger`

---

## 11. 🔄 Loading States

```tsx
// Full page loading
<div className="flex items-center justify-center py-20">
  <div className="flex flex-col items-center gap-3">
    <Loader2 className="h-8 w-8 animate-spin text-gold" />
    <p className="text-sm text-navy-400">Đang tải dữ liệu...</p>
  </div>
</div>

// Skeleton card
<div className="wrs-card p-5 animate-pulse">
  <div className="h-4 bg-moon-200 rounded w-3/4 mb-3" />
  <div className="h-3 bg-moon-100 rounded w-1/2 mb-2" />
  <div className="h-3 bg-moon-100 rounded w-full" />
</div>

// Table skeleton row
<tr className="animate-pulse">
  <td className="px-4 py-4"><div className="h-3 bg-moon-200 rounded w-16" /></td>
  <td className="px-4 py-4"><div className="h-3 bg-moon-200 rounded w-32" /></td>
</tr>

// Button loading
<Button disabled>
  <Loader2 className="h-4 w-4 animate-spin mr-2" /> Đang xử lý...
</Button>
```

---

## 12. 🚫 Empty States

```tsx
<div className="text-center py-20">
  <div className="w-16 h-16 rounded-2xl bg-moon-100 flex items-center justify-center mx-auto mb-4">
    <Inbox className="h-8 w-8 text-navy-300" />
  </div>
  <h3 className="text-lg font-bold text-navy-800 mb-1">Chưa có dữ liệu</h3>
  <p className="text-sm text-navy-400 mb-4 max-w-sm mx-auto">
    Mô tả hướng dẫn người dùng làm gì tiếp theo.
  </p>
  <Button variant="gold" className="gap-2">
    <Plus className="h-4 w-4" /> Tạo mới
  </Button>
</div>
```

---

## 13. ❌ Error States

```tsx
// Inline error
<div className="rounded-xl bg-danger/5 border-2 border-danger/20 px-4 py-3 flex items-center gap-3">
  <AlertTriangle className="h-5 w-5 text-danger shrink-0" />
  <div>
    <p className="text-sm font-semibold text-navy-900">Không thể tải dữ liệu</p>
    <p className="text-xs text-navy-400 mt-0.5">Vui lòng thử lại sau.</p>
  </div>
  <Button variant="outline" size="sm" className="ml-auto">Thử lại</Button>
</div>
```

---

## 14. 📁 File Structure (MỌI MODULE PHẢI THEO)

```
src/modules/{module-name}/
├── api/
│   └── {module}.api.ts        ← API calls (dùng @/shared/api/client)
├── components/
│   └── {ComponentName}.tsx     ← Module-specific components
├── hooks/
│   └── use{Module}.ts         ← Custom hooks (data fetching, mutations)
├── pages/
│   ├── {Module}ListPage.tsx   ← List/overview page
│   ├── {Module}DetailPage.tsx ← Detail page
│   └── {Module}FormPage.tsx   ← Create/Edit form
├── state/                      ← Local state (optional)
├── types/
│   └── {module}.types.ts      ← TypeScript interfaces
└── index.ts                   ← Barrel exports
```

---

## 15. ✅ Checklist trước khi Submit Code

Mọi Agent **PHẢI** verify trước khi hoàn thành:

- [ ] Dùng đúng font Inter, không font khác
- [ ] Tất cả color dùng từ bảng màu (navy-*, moon-*, gold, success, warning, info, danger)
- [ ] **KHÔNG** có màu tự chọn (red-500, blue-300, gray-200, etc.)
- [ ] Card dùng `wrs-card` hoặc `wrs-card-navy`
- [ ] Button dùng `<Button>` component, đúng variant
- [ ] Badge dùng `<Badge>` component
- [ ] Input/Select có `border-2 border-moon-200, focus:border-gold`
- [ ] Table dùng `wrs-table` class
- [ ] Page header có h1 `text-2xl font-extrabold text-navy-900`
- [ ] Popup/Modal theo chuẩn Section 6
- [ ] Animation chỉ dùng `animate-slide-up`, `animate-fade-in`, `stagger-*`
- [ ] Loading state dùng `Loader2 text-gold animate-spin`
- [ ] Icon chỉ từ `lucide-react`, size `h-4 w-4` (inline) hoặc `h-5 w-5` (section title)
- [ ] Icon màu sắc ấm áp — tuân thủ Section 16
- [ ] Sidebar CHỈ có module navigation, KHÔNG có user info
- [ ] User info ở Header dropdown (góc trên phải)
- [ ] Trang có Dashboard KPIs ở trên, details ở dưới (scroll)
- [ ] File structure đúng pattern Section 14

---

## 16. 🎯 Icon Colors — Warm Logistics Palette

> **Nguyên tắc:** Icons trong WRS PHẢI mang màu ấm áp, liên quan đến logistics. KHÔNG dùng icon xám nhạt hoặc lạnh lẽo.

### Icon Color Rules

```
── KPI / Section Icons ──
icon bên trong bg-navy-800:    text-gold         ← Logistics premium feel
icon bên trong bg-success/10:  text-success       ← Hoàn thành, active  
icon bên trong bg-warning/10:  text-warning       ← Cảnh báo, pending
icon bên trong bg-info/10:     text-info          ← Thông tin
icon bên trong bg-danger/10:   text-danger        ← Lỗi, overdue

── Inline Icons (trong text) ──
card section title icon:       text-gold          ← LUÔN dùng gold cho section icons
sidebar icon (active):         text-gold          ← inherits from parent
sidebar icon (inactive):       inherits text-moon-200/70
info banner icon:              text-gold          ← Gold accent

── Icon Hover ──
hover trên card items:         text-gold          ← Gold hover transition
hover suggestion buttons:      text-gold          ← Warm interactive feedback
```

### ❌ KHÔNG ĐƯỢC dùng:
- `text-gray-*` cho icons
- `text-emerald-*` cho icons (đã thay bằng success/gold)
- `text-muted-foreground` cho icons chính
- Icons nhỏ hơn `h-3 w-3` trong mọi trường hợp

### ✅ Icon Library: lucide-react ONLY
- Logistics-related icons: `Warehouse`, `Container`, `Boxes`, `Receipt`, `FileText`, `HandshakeIcon`, `ClipboardCheck`
- Status icons: `CheckCircle2`, `AlertTriangle`, `Clock`, `XCircle`, `Send`
- Action icons: `Plus`, `Search`, `SlidersHorizontal`, `ArrowRight`

---

## 17. 🧠 UX Principles & Localization (Nguyên lý UX & Bản địa hóa)

> **Mục tiêu:** Đảm bảo hệ thống SWM không chỉ đẹp mắt mà còn ĐÚNG chuẩn Usability (ISO 9241-11, ISO/IEC 25010), được tối ưu hóa cho hành vi người Việt trong môi trường logistics nhịp độ cao.

### 17.1 Nguyên lý dòng chảy & Quy tắc 1 chạm (Flow & 1-Touch)
- **Mạch lạc (User Flow):** Thiết kế dòng chảy từ trên xuống, trái sang phải. Gom nhóm các tác vụ logic liên quan gần nhau, điều hướng nhất quán bước 1 → 2 → 3 rõ ràng, không vòng vèo.
- **Quy tắc 1 chạm:** Tối đa hóa Auto-fill, AI suggestions và Default values. Đặt các CTA (Xác nhận, Lưu, Gửi) ở góc dưới cùng bên phải hoặc trong vùng ngón tay cái dễ với (Thumb Zone) trên thiết bị di động.

### 17.2 Giảm tải nhận thức (Low Cognitive Load)
- **Nhất quán (Consistency):** Tuân thủ 100% components, màu sắc, phông chữ đã quy định.
- **Che giấu độ phức tạp:** Ứng dụng mô hình "Hide & Seek" với `SlidePanel` hoặc `Drawer` để hiển thị thông tin phụ thay vì nhồi nhét vào 1 trang. 
- **Phản hồi hệ thống (System Feedback):** Dùng Toast notification, Skeleton loading để phản hồi <400ms. Luôn cho người dùng biết hệ thống đang xử lý, không để họ tự hỏi "Mình đã ấn nút chưa?".

### 17.3 Tương tác thông minh & Ngưỡng giới hạn (Smart Guides & Thresholds)
- **Interactive Guide (Hướng dẫn tại chỗ):** Dùng Box info (Gold Banner), text hint bên dưới trường nhập liệu để hướng dẫn người dùng mới tự học (ví dụ: cách tính khối lượng, giải thích thuật ngữ), thay vì bắt họ đọc manual.
- **Thresholds (Ngưỡng cảnh báo Validation):** Hiển thị màu đỏ/cam cảnh báo vượt ngưỡng dung sai (ví dụ: Kho đầy >85%, mẻ cân lệch >0.5%) **ngay trong lúc nhập liệu (Real-time)** để ngăn chặn lỗi xảy ra sớm trước khi nhấn nút Submit.

### 17.4 Bản địa hóa & Văn hóa Việt Nam (Vietnamese Context)
- **Ngôn ngữ thực tế:** Sử dụng ngôn ngữ bình dân kho bãi Việt Nam ("Chờ cân", "Hàng hư hỏng", "Xe vào") thay vì dịch thuật ngữ IT máy móc. Định dạng ngày giờ, số (DD/MM/YYYY, phân cách hàng nghìn bằng dấu chấm `.`) chuẩn Việt Nam.
- **Cảm hứng Á Đông:** Tone màu Navy nền tảng kết hợp Gold accent trên giao diện thể hiện đẳng cấp, sự minh bạch B2B đồng thời gợi sự thịnh vượng (màu Vàng Tài lộc) trong văn hóa kinh doanh.

