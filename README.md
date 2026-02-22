# Athan PWA

A beautiful, privacy-focused Islamic prayer times app built as a Progressive Web App.

## Features

- Animated sky that changes with prayer times
- Accurate prayer time calculations (adhan-js)
- Countdown to next prayer
- Geolocation support
- Works offline
- No tracking, no analytics

## Setup

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Adding Icons

Create two icon files in the `static/` folder:
- `icon-192.png` (192x192 pixels)
- `icon-512.png` (512x512 pixels)
- `favicon.png` (32x32 pixels)

## Deploying

Build and deploy the `build/` folder to any static host:
- Vercel
- Netlify
- Cloudflare Pages
- GitHub Pages

## Adding to Home Screen

### iOS
1. Open in Safari
2. Tap Share button
3. Tap "Add to Home Screen"

### Android
1. Open in Chrome
2. Tap menu (3 dots)
3. Tap "Add to Home Screen" or "Install"
