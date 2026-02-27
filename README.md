# Athan PWA

A beautiful, privacy-focused Islamic prayer times app built as a Progressive Web App.

## Features

- Animated sky that changes with prayer times
- Accurate prayer time calculations (adhan-js)
- Countdown to next prayer
- Optional salah notifications
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

## Web Push For Closed-App Notifications

The app now supports Web Push subscription flow for true background/closed-app prayer alerts.

Set these public env vars in your deployment:

- `PUBLIC_WEB_PUSH_PUBLIC_KEY`: VAPID public key (base64url)
- `PUBLIC_WEB_PUSH_API_BASE_URL`: your backend base URL

Client-side calls expected backend endpoints:

- `POST /api/push/subscribe`
  - body: `{ subscription, context }`
- `POST /api/push/update`
  - body: `{ endpoint, context }`
- `POST /api/push/unsubscribe`
  - body: `{ endpoint }`

`context` includes selected location + calculation method so your backend can schedule each prayer notification.

If push config is missing, app falls back to local in-app notifications while open.

## Adding to Home Screen

### iOS
1. Open in Safari
2. Tap Share button
3. Tap "Add to Home Screen"

### Android
1. Open in Chrome
2. Tap menu (3 dots)
3. Tap "Add to Home Screen" or "Install"
