# Changelog
---

Versioning: `MAJOR.FEATURE.UPDATE`
- **MAJOR** — complete overhauls or rebrands
- **FEATURE** — new functionality added
- **UPDATE** — changes, fixes, and corrections to existing features

---

## v3.0.0 — 2026-04-04
### Major — Arabic Language & Font Overhaul
- Added full Arabic/English language toggle and Western/Arabic numeral (123/١٢٣) toggle in settings
- Arabic mode shows only Arabic text throughout: prayer names, dates, labels, indicators, city selector
- All translations centralized in `src/lib/stores/locale.js`
- Numeral style applies to all numbers: prayer times, countdown, Hijri dates, Gregorian dates, calculation method angles
- Arabic mode shows ص/م instead of AM/PM; RTL layout on next-prayer row
- Numeral style auto-follows language; explicit override stored separately and persisted
- Calendar weekday labels, month/year, and dates switch to Arabic locale in Arabic mode
- Removed Cormorant Garamond, Amiri, and Inter — fonts were never properly loading; browsers fell back to system serif
- All English UI now uses **Outfit** exclusively; all Arabic text uses **Cairo** exclusively (Google Fonts)
- `app.html` updated to load Outfit + Cairo only
- Replaced default city suggestions with globally diverse set: Mecca, London, NYC, LA, São Paulo, Cairo, Karachi, Jakarta, Sydney
- Enhanced city search bar with accent border glow, larger input, and hint text prompting users to type their city
- Countdown uses per-digit fixed-width spans — layout never shifts as numbers tick; single digits show without zero-padding
- App version now displayed in the About section of Settings
- Calendar glow no longer clipped at right edge; language switch fades smoothly; calendar close transition no longer glitches
- Settings title, language/numeral toggles, and letter-spacing corrected for Arabic rendering
- Removed "Use my location" geolocation button from city selector (added then reverted)

---

## v2.4.0 — 2026-03-16
### Update
- Center orphan items in last row of theme, indicator, and calculation method grids
- Match calculation method grid max-width to indicators grid (320px)
- Updated `azanicn.png` settings logo

---

## v2.3.0 — 2026-03-15
### Feature
- About section added at the bottom of Settings: logo, app name, tagline, GitHub button
- Husky pre-commit hook: blocks any commit where `CHANGELOG.md` was not staged/updated
- `prepare` script in `package.json` so hooks install automatically for all contributors after `npm install`

### Update
- Settings about logo enlarged from `2rem` → `3rem`
- Main page centered using flex column layout instead of absolute positioning
- Prayer list fixed sizing — removed `clamp(Yvh)` values to prevent vertical stretching on tall phones
- Countdown moved to appear below "Next [prayer] [time]" line
- Countdown no longer shows seconds when hours remain (`HHh MMm` / `MMm SSs`)
- Countdown unit label corrected from "hr" → "h"
- White dot glow on clock no longer cropped — SVG filter switched to `filterUnits="userSpaceOnUse"`

---

## v2.2.0 — 2026-03-15
### Feature
- Prayer row state styling: past = greyed, active = gold, future = whiter

### Update
- Prayer list lines equal length on both sides using CSS Grid `display: contents` on `.time-row`
- Time values right-aligned
- Next prayer layout: "Next" label left, name centered, time right

---

## v2.1.0 — 2026-03-15
### Feature
- Replaced all app icons with new Azan branding (`icon-192.png`, `icon-512.png`, `favicon.png`)
- Created `static/images/` directory, moved all source images there

---

## v2.0.0 — 2026-03-15
### Major — Complete rebrand from Athan to Azan
- `package.json`: `name` → `azan-pwa`
- `src/app.html`: `<title>` → `Azan`
- `static/manifest.json`: `name` and `short_name` → `Azan`
- `src/service-worker.js`: cache → `azan-v1`
- All `localStorage` keys, store names, and custom events renamed from `athan-*` → `azan-*`

---

## v1.0.0 — prior history

| Commit | Description |
|--------|-------------|
| `cf7be5a` | Use the azan logo for app icons and support worktree dev serving |
| `58e9996` | Use theme shade for Friday Dua arc |
| `2b479e8` | Move Qibla permission flow to settings toggle |
| `50b4830` | Disable pinch zoom in viewport and touch actions |
| `6bc1aa4` | Add light themes, new dark themes, and UI refinements |
| `c49e56b` | Add clock label size control in Settings |
| `8c1d61` | Add Qibla compass needle to clock |
| `583fdbd` | Add clock indicators and improve Settings UX |
| `af28ff7` | Fix Hijri date to change at Maghrib and improve iOS layout |
| `8e82362` | Add new themes and theme-aware text colors |
| `23143e0` | Add multi-theme system with 6 color palettes |
| `480d83f` | Rebrand to !Athan with minimal crescent logo |
| `0125b47` | Initial commit: Athan PWA |
