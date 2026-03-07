---
description: Cách Pull và Push code an toàn giữ nguyên local changes
---

# Quy trình Git cho Agent (Pull & Push an toàn)

Quy trình này đảm bảo việc kéo (pull) code mới từ remote về không bao giờ gây mất mát hoặc conflict với các file đang chỉnh sửa dở dang (untracked, modified files) ở local.
Tất cả các Agent khi được yêu cầu Pull code hoặc làm việc với Git phải tuân thủ nghiêm ngặt quy trình dưới đây.

## 1. Pull Code (Giữ nguyên local changes)

Luôn luôn sử dụng stash để lưu tạm local changes (kể cả các file untracked) trước khi pull.

// turbo
1. Lưu tạm thay đổi xuống stash (thêm cờ `-u` để bao gồm các file untracked mới tạo):
```bash
git stash push -u -m "saving local files for pull"
```

2. Pull code mới từ remote (thường là nhánh `develop`):
```bash
git pull origin develop
```

3. Khôi phục local changes từ stash:
```bash
git stash pop
```

*Lưu ý: Nếu `git stash pop` báo lỗi `Already up to date` nhưng vẫn giữ stash (do trong stash chỉ có untracked files nên git không tự động drop stash), bạn có thể chạy thêm `git stash drop` để dọn dẹp.*

---

## 2. Push Code (Chỉ push 1 thư mục/module cụ thể)

Tuyệt đối không chạy lệnh `git add .` để tránh vô tình push các file không mong muốn hoặc các file config local. Bắt buộc phải thêm đường dẫn tới file/thư mục cụ thể mà bạn chỉnh sửa.

Ví dụ, khi chỉ muốn push code của module `frontend`:

```bash
# 1. Chỉ add thư mục frontend
git add frontend/

# 2. Tạo commit message chuẩn format (VD: feat, fix, docs, refactor...)
git commit -m "feat(frontend): <mô tả thay đổi chi tiết>"

# 3. Push lên repository
git push origin develop
```

*(Thay `frontend/` bằng đường dẫn thư mục mà bạn cần push trong task hiện tại, ví dụ: `backend/src/modules/billing`)*
