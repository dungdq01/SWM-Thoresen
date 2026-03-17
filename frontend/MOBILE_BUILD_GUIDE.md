# Mobile Build Guide — SmartLog WMS

## Prerequisites
- Node.js 18+
- Android Studio (for Android builds)
- Xcode 15+ (for iOS builds, macOS only)
- Capacitor CLI: `npx cap`

## Development (Web)
```bash
npm run dev
# Open http://localhost:8386
```

## Build for Mobile

### 1. Build web assets
```bash
npm run build
```

### 2. Sync with native projects
```bash
npx cap sync
```

### 3. Run on Android
```bash
npx cap run android
# Or open in Android Studio:
npx cap open android
```

### 4. Run on iOS (macOS only)
```bash
npx cap run ios
# Or open in Xcode:
npx cap open ios
```

## Live Reload (Development)
Uncomment the `server` block in `capacitor.config.ts` and set your dev machine IP:

```ts
server: {
  url: 'http://YOUR_IP:8386',
  cleartext: true,
}
```

Then run:
```bash
npm run dev -- --host
npx cap run android  # or ios
```

## PWA Testing (Safari Standalone)
1. Start dev server: `npm run dev -- --host`
2. Start ngrok: `ngrok http 8386`
3. Open ngrok URL in Safari on iPhone
4. Tap Share → Add to Home Screen
5. Open from Home Screen (runs as standalone PWA)

**Note:** After code changes, you may need to:
- Remove the home screen shortcut
- Clear Safari cache
- Re-add to home screen

## Icons
Replace placeholder SVG icons in `public/assets/icons/` with real PNG icons before production release.

Generate placeholders:
```bash
node scripts/generate-icons.js
```

## Troubleshooting
- **White screen on native:** Ensure `webDir: 'dist'` in `capacitor.config.ts` and run `npm run build` before `npx cap sync`
- **API calls failing:** Check that backend URL is accessible from the device/emulator
- **Camera not working:** Ensure camera permissions are granted in device settings
