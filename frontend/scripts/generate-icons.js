/**
 * Generate placeholder SVG icons for PWA manifest.
 * Replace these with actual PNG icons for production.
 *
 * Run: node scripts/generate-icons.js
 */
import { writeFileSync, mkdirSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const iconsDir = join(__dirname, '..', 'public', 'assets', 'icons')

mkdirSync(iconsDir, { recursive: true })

const sizes = [72, 96, 128, 144, 152, 192, 384, 512]

sizes.forEach((size) => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${size * 0.15}" fill="#0b1628"/>
  <text x="50%" y="50%" text-anchor="middle" dominant-baseline="central" font-family="system-ui,sans-serif" font-weight="800" font-size="${size * 0.25}" fill="#60a5fa">SL</text>
</svg>`
  const filename = `icon-${size}x${size}.svg`
  writeFileSync(join(iconsDir, filename), svg)
  console.log(`✓ ${filename}`)
})

console.log(`\nDone! Generated ${sizes.length} icons in public/assets/icons/`)
console.log('⚠️  Replace SVGs with real PNG icons for production builds.')
