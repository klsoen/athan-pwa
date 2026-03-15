# Changelog

## v2.4.0 — 2026-03-15
### Added
- Husky pre-commit hook: blocks any commit where `CHANGELOG.md` was not staged/updated
- `prepare` script in `package.json` so hooks install automatically for all contributors after `npm install`
- Changelog rule added to `CLAUDE.md` so Claude always updates the changelog before committing

---

## v2.3.4 — 2026-03-15
### Updated
- Replaced `azanicn.png` (settings about logo) with updated version provided
- Moved new file from project root to `static/images/azanicn.png`
- Removed leftover `azanicn.png` from project root

---

## v2.3.3 — 2026-03-15
### Changed
- Moved countdown display to appear **below** "Next [prayer] [time]" line
- Previous order: countdown → next prayer
- New order: next prayer → countdown

---

## v2.3.2 — 2026-03-15 (`c56bd8c`)
### Fixed
- White dot glow on the clock was being cropped when near the top during startup animation
- SVG filter `softGlow` switched from `filterUnits="objectBoundingBox"` (percentage-based) to `filterUnits="userSpaceOnUse"` with absolute bounds `x="-30" y="-30" width="160" height="160"`

---

## v2.3.1 — 2026-03-15 (`df190a9`)
### Fixed
- Main page was stuck to the top of the screen — replaced `position: absolute; top: 50%` on `.prayer-display` with flex column centering (`justify-content: center`) on `.home-view`
- Bottom padding added (`5.5rem`) to account for the absolutely-positioned `.dates-row`
- Prayer list was stretching/contracting vertically on tall phones — removed all `clamp(x, Yvh, z)` values from `.all-times-stage`, replaced with fixed `min-height: 15rem` and fixed margins

### Changed
- Settings about logo enlarged from `2rem` → `3rem`

---

## v2.3.0 — 2026-03-15 (`b69e460`)
### Added
- About section at the bottom of the Settings panel
  - Logo (`/images/azanicn.png`) on the left
  - App name "Azan" and tagline "Beautiful Islamic prayer times" in center
  - GitHub button linking to the repo on the right

---

## v2.2.2 — 2026-03-15 (`dd4e7ca`)
### Fixed
- Countdown unit label corrected from "hr" → "h" (e.g. `01h 23m`)

---

## v2.2.1 — 2026-03-15 (`afe8b18`)
### Changed
- Countdown no longer shows seconds when hours remain
  - Format when hours > 0: `HHh MMm`
  - Format when under an hour: `MMm SSs`

---

## v2.2.0 — 2026-03-15 (`d059f72`)
### Added
- Prayer row state styling: past = greyed, active = gold (existing), future = whiter

### Fixed
- Prayer list lines are now equal length on both sides
  - Used CSS Grid `display: contents` on `.time-row` so all rows share a single grid on `.all-times`
  - Columns sized with `max-content` so the widest name (SUNRISE) sets the column width for all rows
  - Corrected: first attempt used fixed pixel widths (`width: 100px`, `width: 72px`) which clipped times like "12:31 PM"
  - Corrected: line after Maghrib was shorter because each `.time-row` had been its own independent grid
- Time values right-aligned in prayer list
- Countdown no longer jumps as digits change
  - Zero-padded with `String.padStart(2, '0')`
  - `font-variant-numeric: tabular-nums` applied
  - `white-space: nowrap` applied

### Changed
- Next prayer label: "Next" centered, prayer name centered, time balanced on right
  - Corrected: first attempt used `grid-template-columns: 1fr auto 1fr` which made outer margins too wide — reverted to `display: flex` with `gap: 0.6rem`

---

## v2.1.0 — 2026-03-15 (`ee644f8`)
### Changed
- Replaced all app icons using new Azan branding
  - `azanapp.png` → source for home screen icons (`icon-192.png`, `icon-512.png`)
  - `azanfavicon.png` → source for browser favicon (`favicon.png`)
  - Icons regenerated using `sips`
- Created `static/images/` directory and moved all source images there

---

## v2.0.1 — 2026-03-15
### Fixed
- `manifest.json` and `app.html` had `!Azan` (kept `!` prefix by mistake from prior branding) — removed `!` from both

---

## v2.0.0 — 2026-03-15 (`2912590`)
### Changed — Complete rebrand from Athan to Azan
- `package.json`: `name` → `azan-pwa`
- `src/app.html`: `<title>` → `Azan`
- `static/manifest.json`: `name` and `short_name` → `Azan`
- `src/service-worker.js`: cache name → `azan-v1`
- `src/lib/components/CitySelector.svelte`: all `localStorage` keys `athan-city` → `azan-city`
- `src/lib/stores/prayer.js`: `athan-indicators` → `azan-indicators`, `athan-label-size` → `azan-label-size`
- `src/lib/stores/theme.js`: `athan-theme` → `azan-theme`, `athan-theme-mode` → `azan-theme-mode`
- `src/lib/components/Settings.svelte`: `athan-method` → `azan-method`, `athan-angles` → `azan-angles`, event `athan:qibla-permission` → `azan:qibla-permission`
- `src/lib/components/BreathDesign.svelte`: event `athan:qibla-permission` → `azan:qibla-permission`

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
