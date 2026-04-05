# Changelog
---

Versioning: `MAJOR.FEATURE.UPDATE`
- **MAJOR** — complete overhauls or rebrands
- **FEATURE** — new functionality added
- **UPDATE** — changes, fixes, and corrections to existing features

---

## v2.6.7 — 2026-04-05
### Update
- Replaced Lexend with Montserrat throughout all English UI

---

## v2.6.6 — 2026-04-05
### Update
- Reordered Settings sections: Language → Notifications → Clock Indicators → Label Size → Calculation Method → Custom Angles → Theme → About

---

## v2.6.5 — 2026-04-05
### Update
- Applied consistent 4/8/12/16/24/32px spacing scale across all vertical gaps
- Prayer display uses flex column with centered alignment — no drift between elements
- Standardized typography: current-name 0.75rem/0.22em tracking, time values 0.75rem tabular Inter, next-prayer labels 0.7rem
- Current time uses Inter with tabular-nums for numeric stability
- Prayer list grid: 12px column-gap and row-gap, max-width 280px matching divider
- Active row no longer changes font-weight (no layout shift)
- Divider lines now fluid width within fixed max-width container
- clock-center-next and tap-hint use 8px margin-top on scale

---

## v2.6.4 — 2026-04-05
### Update
- Countdown: `align-items: baseline` on all containers so labels sit on the same baseline as numbers
- Label color now inherits from parent (matches number color — no more faded secondary color)
- Tightened internal `gap` between number and label to 0.15em; inter-unit gap 0.6em
- Reduced label font-size to 0.65em for correct proportion without looking detached

---

## v2.6.3 — 2026-04-05
### Update
- Countdown redesign: flex-centered, no layout shift, `width: 2ch` per number, `font-variant-numeric: tabular-nums` + `font-feature-settings: "tnum" 1`
- Hide hours block when zero; hide minutes when zero (show seconds only); no leading zeros
- Arabic mode: Noto Kufi Arabic for digits and labels, `direction: rtl`
- Western numbers use Inter; Eastern Arabic numerals use Noto Kufi Arabic

---

## v2.6.2 — 2026-04-05
### Update
- Font overhaul: Lexend for all English UI, Inter for numeric displays (prayer times, countdown, calendar dates), Noto Kufi Arabic for all Arabic text
- Updated Google Fonts links in `app.html` and `+page.svelte`
- Updated `tailwind.config.js` font families to match

---

## v2.6.1 — 2026-04-05
### Update
- Reverted all font changes to keep Amiri (Arabic) and Inter (English) from main branch
- Restored original Google Fonts link in `app.html`, `+page.svelte`, and `tailwind.config.js`
- Replaced all `font-family: 'Cairo'` references in `BreathDesign.svelte` and `CircleDesign.svelte` with `Amiri`

---

## v2.6.0 — 2026-04-05
### Feature
- Added full Arabic/English language toggle and Western/Arabic numeral (123/١٢٣) toggle in Settings
- Arabic mode shows only Arabic text throughout: prayer names, dates, labels, indicators, city selector
- All translations centralized in `src/lib/stores/locale.js`
- Numeral style applies to all numbers: prayer times, countdown, Hijri dates, Gregorian dates, calculation method angles
- Arabic mode shows ص/م instead of AM/PM; RTL layout on next-prayer row
- Numeral style auto-follows language; explicit override stored separately and persisted
- Calendar weekday labels, month/year, and dates switch to Arabic locale in Arabic mode
- Countdown uses per-digit fixed-width spans — layout never shifts as numbers tick; single digits show without zero-padding

### Update
- City selector: globally diverse default cities, prominent search bar with hint text
- App version shown in Settings About section
- Various rendering fixes: calendar glow no longer clipped at right edge, language switch fades smoothly, settings title and letter-spacing corrected for Arabic rendering

---

## v2.5.1.3 — 2026-03-18
### Fix
- Softened the notification settings syncing label so reminder updates read more naturally in the UI

---

## v2.5.1.2 — 2026-03-18
### Fix
- Reworded the notification settings helper text so the reminders section reads more clearly for end users

---

## v2.5.1.1 — 2026-03-18
### Fix
- Added the live PWA link to the README so the hosted app is easy to open directly from the repo

---

## v2.5.1.0 — 2026-03-18
### Feature
- Rewrote the README around Azan's privacy-first product story, including the anonymous push architecture, local-first Qibla approach, and deployment guidance
- Added a dedicated privacy flow diagram to visually explain what stays on-device, what Netlify stores, and what is never stored at all

---

## v2.5.0.4 — 2026-03-18
### Fix
- Added a dedicated monochrome notification badge asset so Android status bar notifications use a proper icon instead of a blank square
- Updated push payloads and the service worker fallback badge to use the new badge asset while keeping the full app icon in expanded notifications

---

## v2.5.0.3 — 2026-03-18
### Fix
- Stopped reinterpreting already-correct prayer `Date` values during notification scheduling so synced UTC reminder times stay aligned with the selected city
- Added a regression test covering Lahore prayer generation and UTC serialization for notification payloads

---

## v2.5.0.2 — 2026-03-18
### Fix
- Moved the prayer push cron configuration into the Netlify function so scheduled runs are registered on deploy
- Removed the invalid scheduled-function block from `netlify.toml` so production reminders can actually execute

---

## v2.5.0.1 — 2026-03-18
### Fix
- Removed the extra break between prayer and special notification tiles so the notifications grid flows as one section
- Cleaned up the city selector accessibility warning and removed unused indicator CSS

---

## v2.5.0.0 — 2026-03-18
### Feature
- Added Netlify Functions and Blob-backed web push scaffolding for anonymous prayer reminder delivery
- Added notification scheduling for the five daily prayers, sunrise, last third of the night, first third end, and new Islamic month at Maghrib

### Update
- Added notification controls to Settings with enable/disable state and per-reminder toggles using the existing settings design language
- Extended the service worker to display push notifications and reopen Azan when a reminder is tapped

---

## v2.4.0.2 — 2026-03-16
### Fix
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
