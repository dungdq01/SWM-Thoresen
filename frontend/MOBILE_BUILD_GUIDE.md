# SmartLog SWM — Hướng dẫn Build Mobile App (Capacitor)

## Tổng quan

Dự án sử dụng **Capacitor** để đóng gói web app thành native app cho Android và iOS.
Cùng 1 codebase React + Vite + TailwindCSS chạy trên cả 3 nền tảng: **Web**, **Android**, **iOS**.

## Yêu cầu hệ thống

### Chung
- Node.js >= 18
- npm >= 9

### Android
- [Android Studio](https://developer.android.com/studio) (phiên bản mới nhất)
- Android SDK (API Level 33+)
- Java JDK 17+

### iOS (chỉ trên macOS)
- Xcode 15+
- CocoaPods (`sudo gem install cocoapods`)
- Apple Developer Account (để publish lên App Store)

## Cấu trúc thư mục

```
frontend/
├── android/              ← Capacitor tạo tự động (Android Studio project)
├── ios/                  ← Capacitor tạo tự động (Xcode project)
├── capacitor.config.ts   ← Cấu hình Capacitor
├── public/
│   ├── manifest.json     ← PWA manifest
│   └── assets/icons/     ← App icons (placeholder, cần thay bằng icon thật)
├── src/
│   ├── shared/
│   │   ├── hooks/usePlatform.js   ← Hook phát hiện platform
│   │   └── lib/capacitor.js       ← Khởi tạo native plugins
│   └── app/layouts/
│       └── components/
│           └── MobileBottomNav.jsx ← Bottom navigation cho mobile
└── ...
```

## Scripts

| Script | Mô tả |
|--------|-------|
| `npm run dev` | Chạy dev server (web) |
| `npm run build` | Build web cho deploy |
| `npm run build:mobile` | Build web với config Capacitor (relative paths) |
| `npm run cap:sync` | Đồng bộ web build vào native projects |
| `npm run cap:android` | Build + sync + mở Android Studio |
| `npm run cap:ios` | Build + sync + mở Xcode |
| `npm run cap:run:android` | Build + sync + chạy trên thiết bị/emulator Android |
| `npm run cap:run:ios` | Build + sync + chạy trên thiết bị/simulator iOS |

## Quy trình Build

### 1. Build cho Web (không thay đổi)
```bash
npm run build
# Output: dist/ → deploy lên server
```

### 2. Build cho Android
```bash
# Cách 1: Mở Android Studio để build/debug
npm run cap:android

# Cách 2: Chạy trực tiếp trên thiết bị kết nối USB
npm run cap:run:android
```

Trong Android Studio:
1. Chờ Gradle sync xong
2. Chọn thiết bị/emulator
3. Click ▶ Run
4. Build APK: **Build → Build Bundle(s) / APK(s) → Build APK(s)**
5. Build AAB (cho Google Play): **Build → Build Bundle(s) / APK(s) → Build Bundle(s)**

### 3. Build cho iOS (cần macOS)
```bash
# Mở Xcode
npm run cap:ios

# Hoặc chạy trên simulator
npm run cap:run:ios
```

Trong Xcode:
1. Chọn target "App"
2. Chọn simulator hoặc thiết bị thật
3. Click ▶ Run
4. Archive cho App Store: **Product → Archive**

## Dev trên thiết bị thật (Live Reload)

Để test nhanh trên điện thoại với live reload:

1. Tìm IP máy tính: `ipconfig` (Windows) hoặc `ifconfig` (macOS)
2. Mở `capacitor.config.ts`, uncomment:
   ```ts
   server: {
     url: 'http://192.168.1.x:8386',  // ← IP máy tính
     cleartext: true,
   }
   ```
3. Chạy dev server: `npm run dev`
4. Sync và chạy: `npx cap sync && npx cap run android`
5. **Nhớ comment lại** khi build production!

## App Icons

Hiện tại đang dùng placeholder icons (SVG). Để tạo icon thật:

### Cách 1: Dùng Capacitor Assets (khuyên dùng)
```bash
npm install -D @capacitor/assets
# Đặt file icon gốc (1024x1024 PNG) vào assets/icon.png
npx @capacitor/assets generate --iconBackgroundColor '#0c1829' --splashBackgroundColor '#0c1829'
```

### Cách 2: Thủ công
Thay các file trong `public/assets/icons/` bằng PNG thật với đúng kích thước.

## Publish lên Store

### Google Play Store
1. Tạo tài khoản Google Play Console ($25 một lần)
2. Build AAB trong Android Studio
3. Upload lên Google Play Console
4. Điền thông tin app, screenshots, mô tả
5. Submit review

### Apple App Store
1. Tạo tài khoản Apple Developer ($99/năm)
2. Archive trong Xcode
3. Upload qua App Store Connect
4. Điền thông tin app, screenshots, mô tả
5. Submit review

## Lưu ý quan trọng

- **android/** và **ios/** đã được thêm vào `.gitignore` vì là generated code
- Khi clone repo mới, chạy `npx cap add android` và `npx cap add ios` để tạo lại
- Mỗi lần thay đổi code, cần `npm run build:mobile && npx cap sync` trước khi test trên thiết bị
- Dùng Live Reload trong dev để tiết kiệm thời gian
- Capacitor plugins (Camera, Barcode Scanner, Push Notification) có thể thêm sau khi cần
