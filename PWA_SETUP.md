# PWA Icons Setup

To complete the PWA setup, you need to generate app icons in various sizes.

## Option 1: Use an Online Generator (Easiest)

1. Go to https://www.pwabuilder.com/imageGenerator
2. Upload your logo/favicon
3. Download the generated icons
4. Extract and place them in `/public/icons/`

## Option 2: Use your existing favicon

Copy your `favicon.ico` and resize it to create these sizes:
- icon-72x72.png
- icon-96x96.png
- icon-128x128.png
- icon-144x144.png
- icon-152x152.png
- icon-192x192.png
- icon-384x384.png
- icon-512x512.png

## Option 3: Quick PowerShell Script (if you have ImageMagick)

```powershell
$sizes = @(72, 96, 128, 144, 152, 192, 384, 512)
foreach ($size in $sizes) {
    magick convert favicon.ico -resize ${size}x${size} "icons/icon-${size}x${size}.png"
}
```

## Screenshots (Optional)

For the PWA install prompt to look nice, add screenshots:
- `/public/screenshots/desktop.png` (1920x1080)
- `/public/screenshots/mobile.png` (390x844)

## Testing the PWA

1. Run `npm run build && npm start` (PWA doesn't work in dev mode)
2. Open Chrome DevTools → Application → Service Workers
3. Check if the service worker is registered
4. Try installing the app via the browser's install button
