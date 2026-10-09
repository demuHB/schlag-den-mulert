// Erzeugt Logo (webp) und PWA-/Favicon-Icons aus raw/logo.png
import sharp from 'sharp'

const src = 'raw/logo.png'
const bg = { r: 12, g: 10, b: 20, alpha: 1 }

await sharp(src).resize({ width: 900 }).webp({ quality: 88 }).toFile('public/logo.webp')
for (const size of [192, 512, 180, 48]) {
  const inner = Math.round(size * 0.86)
  const logo = await sharp(src).trim().resize({ width: inner, height: inner, fit: 'inside' }).toBuffer()
  const name = size === 180 ? 'apple-touch-icon.png' : size === 48 ? 'favicon.png' : `icon-${size}.png`
  await sharp({ create: { width: size, height: size, channels: 4, background: bg } })
    .composite([{ input: logo, gravity: 'center' }])
    .png()
    .toFile(`public/${name}`)
}
console.log('✔ Icons erzeugt')
