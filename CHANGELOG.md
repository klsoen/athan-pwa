# Changelog

Versioning: `MAJOR.FEATURE.UPDATE.FIX`
- **MAJOR** — complete overhauls or rebrands
- **FEATURE** — new functionality added
- **UPDATE** — meaningful changes to existing features
- **FIX** — small corrections, tweaks, patches

---

## v2.4.0.1 — 2026-03-15
### Fix
- Updated `azanicn.png` settings logo with new version
- Switched changelog versioning from 3-point to 4-point (`MAJOR.FEATURE.UPDATE.FIX`)

---

## v2.4.0.0 — 2026-03-15
### Feature
- Husky pre-commit hook: blocks any commit where `CHANGELOG.md` was not staged/updated
- `prepare` script in `package.json` so hooks install automatically for all contributors after `npm install`
- Changelog rule added to `CLAUDE.md` so Claude always updates the changelog before committing

---

## v2.3.0.3 — 2026-03-15
### Fix
- Updated `azanicn.png` settings logo with new version provided
- Removed leftover file from project root

---

## v2.3.0.2 — 2026-03-15
### Fix
- Moved countdown display to appear **below** "Next [prayer] [time]" line
- Previous order: countdown → next prayer / New order: next prayer → countdown

---

## v2.3.0.1 — 2026-03-15 (`c56bd8c`)
### Fix
- White dot glow on the clock was being cropped near the top during startup animation
- SVG filter `softGlow` switched to `filterUnits="userSpaceOnUse"` with absolute bounds `x="-30" y="-30" width="160" height="160"`

---

## v2.3.0.0 — 2026-03-15 (`df190a9`, `b69e460`)
### Feature
- About section added at the bottom of Settings: logo, app name, tagline, GitHub button

### Update
- Settings about logo enlarged from `2rem` → `3rem`
- Main page centered using flex column layout instead of absolute positioning
- Prayer list fixed sizing — removed `clamp(Yvh)` values to prevent vertical stretching on tall phones

---

## v2.2.0.2 — 2026-03-15 (`dd4e7ca`)
### Fix
- Countdown unit label corrected from "hr" → "h" (e.g. `01h 23m`)

---

## v2.2.0.1 — 2026-03-15 (`afe8b18`)
### Fix
- Countdown no longer shows seconds when hours remain
  - Hours remaining: `HHh MMm`
  - Under an hour: `MMm SSs`

---

## v2.2.0.0 — 2026-03-15 (`d059f72`, `627f2c2`)
### Feature
- Prayer row state styling: past = greyed, active = gold, future = whiter

### Update
- Prayer list lines equal length on both sides using CSS Grid `display: contents` on `.time-row`
  - Fixed: first attempt used fixed pixel widths which clipped times like "12:31 PM"
  - Fixed: Maghrib line was shorter because each row was its own independent grid
- Time values right-aligned
- Countdown fixed-width — zero-padded, `tabular-nums`, `white-space: nowrap`
- Next prayer layout: "Next" label left, name centered, time right
  - Fixed: `grid-template-columns: 1fr auto 1fr` made margins too wide — reverted to flex with `gap: 0.6rem`

---

## v2.1.0.0 — 2026-03-15 (`ee644f8`)
### Feature
- Replaced all app icons with new Azan branding
  - `azanapp.png` → `icon-192.png`, `icon-512.png`
  - `azanfavicon.png` → `favicon.png`
  - Icons regenerated with `sips`
- Created `static/images/` directory, moved all source images there

---

## v2.0.0.1 — 2026-03-15
### Fix
- `manifest.json` and `app.html` had `!Azan` — removed the `!` prefix left over from prior branding

---

## v2.0.0.0 — 2026-03-15 (`2912590`)
### Major — Complete rebrand from Athan to Azan
- `package.json`: `name` → `azan-pwa`
- `src/app.html`: `<title>` → `Azan`
- `static/manifest.json`: `name` and `short_name` → `Azan`
- `src/service-worker.js`: cache → `azan-v1`
- `CitySelector.svelte`: `localStorage` keys `athan-city` → `azan-city`
- `prayer.js`: `athan-indicators` → `azan-indicators`, `athan-label-size` → `azan-label-size`
- `theme.js`: `athan-theme` → `azan-theme`, `athan-theme-mode` → `azan-theme-mode`
- `Settings.svelte`: `athan-method` → `azan-method`, `athan-angles` → `azan-angles`, event → `azan:qibla-permission`
- `BreathDesign.svelte`: event → `azan:qibla-permission`

---

## v1.0.0.0 — prior history

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
