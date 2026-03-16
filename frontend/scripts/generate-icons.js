/**
 * Script tạo placeholder app icons cho PWA/Capacitor.
 * 
 * Trong production, thay bằng icon thật từ designer.
 * Chạy: node scripts/generate-icons.js
 * 
 * Script này tạo SVG placeholder icons với các kích thước cần thiết.
 * Để tạo PNG thật, dùng tool như sharp hoặc Capacitor's asset generator:
 *   npx @capacitor/assets generate --iconBackgroundColor '#0c1829' --splashBackgroundColor '#0c1829'
 */

import { writeFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ICONS_DIR = join(__dirname, '..', 'public', 'assets', 'icons')

const sizes = [72, 96, 128, 144, 152, 192, 384, 512]

function createSvgIcon(size, maskable = false) {
  const padding = maskable ? size * 0.1 : 0
  const innerSize = size - padding * 2
  const fontSize = Math.round(innerSize * 0.22)
  const subFontSize = Math.round(innerSize * 0.09)
  
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" fill="#0c1829" rx="${maskable ? 0 : size * 0.15}"/>
  <text x="50%" y="42%" text-anchor="middle" dominant-baseline="middle" 
    fill="#60a5fa" font-family="system-ui,sans-serif" font-weight="800" font-size="${fontSize}">SL</text>
  <text x="50%" y="62%" text-anchor="middle" dominant-baseline="middle" 
    fill="#93c5fd" font-family="system-ui,sans-serif" font-weight="600" font-size="${subFontSize}">SWM</text>
</svg>`
}

for (const size of sizes) {
  const svg = createSvgIcon(size, false)
  // Write as SVG (browsers handle SVG icons well)
  writeFileSync(join(ICONS_DIR, `icon-${size}x${size}.png`), svg)
  console.log(`✓ icon-${size}x${size}.png (SVG placeholder)`)
}

// Maskable icons
for (const size of [192, 512]) {
  const svg = createSvgIcon(size, true)
  writeFileSync(join(ICONS_DIR, `icon-maskable-${size}x${size}.png`), svg)
  console.log(`✓ icon-maskable-${size}x${size}.png (SVG placeholder)`)
}

console.log('\n⚠️  Đây là placeholder icons (SVG trong file .png).')
console.log('   Trong production, hãy thay bằng PNG thật từ designer.')
console.log('   Hoặc dùng: npx @capacitor/assets generate')
