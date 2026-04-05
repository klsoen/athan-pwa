# Changelog
---

Versioning: `MAJOR.FEATURE.UPDATE`
- **MAJOR** — complete overhauls or rebrands
- **FEATURE** — new functionality added
- **UPDATE** — changes, fixes, and corrections to existing features

---

## v2.6.27 — 2026-04-05
### Update
- Arabic prayer name now overlaps the bottom glow of the prayer icon with margin-top: -18px — layered depth effect

---

## v2.6.26 — 2026-04-05
### Update
- Replaced in:fly on current-prayer and next-block with in:fade — no more upward slide when returning to main view, everything fades in cleanly

---

## v2.6.25 — 2026-04-05
### Update
- Tightened prayer display spacing: consistent 8px base unit throughout
- Removed border-bottom from current-prayer — whitespace separation alone is cleaner
- current-prayer margin-bottom 32px → 20px; padding-bottom removed
- current-name margin-top 8px → 6px; current-time margin-top 16px → 8px with line-height:1
- next-block top margin removed (was 12px), internal gap 6px → 4px
- Prayer icon height 72px → 64px, margin-bottom 8px → 4px

---

## v2.6.24 — 2026-04-05
### Update
- Current prayer name (ASR etc): font-size 0.75rem → 1rem, weight 400 → 600 for stronger presence
- Moved "tap for full clock" hint to below the current prayer time (was above it)
- Added subtle bottom border to current-prayer section to visually separate it from next-block
- Fixed goldReveal animation: removed 50% bright spike keyframe — now a clean linear fade from dark→light
- Synchronized all entrance animations: icon, text, and next-block all arrive in one cohesive wave (~80–160ms delay window, 500–700ms duration)

---

## v2.6.23 — 2026-04-05
### Update
- Tightened gap between countdown units from 0.6em → 0.3em; cd-num width:2ch preserved so digits never shift

---

## v2.6.22 — 2026-04-05
### Update
- Removed next prayer time display from next-block — only name and countdown remain

---

## v2.6.21 — 2026-04-05
### Update
- Reorganized next prayer section into a unified stacked block: NEXT label → ── Name ── → time → countdown
- Countdown is now the largest element (1.5rem, accent color) — most time-sensitive info is most prominent
- Flanking lines moved from countdown to prayer name row for better visual rhythm
- Removed scattered `.next-prayer` inline row and `.prayer-divider` separator; replaced with `.next-block` column layout

---

## v2.6.20 — 2026-04-05
### Update
- Fixed "العربية" language button using wrong font in English mode — it always uses var(--font-ar) now since the text is always Arabic

---

## v2.6.19 — 2026-04-05
### Update
- City selector: added Arabic names and country names for all 9 popular cities
- City selector search: uses Arabic Accept-Language header when in Arabic mode, so search results return in Arabic
- Fixed notification description labels (Prayer alert / Special reminder) not updating when language switches — replaced non-reactive function with a reactive `$:` map

---

## v2.6.18 — 2026-04-05
### Update
- Prayer time table: bumped name and time font sizes from 0.75rem → 0.9rem; wider column gap (16px) and row gap (14px)
- Divider lines between prayer table sections: changed from flex-fill to fixed 44px — short accent lines flanking the countdown
- Settings: increased all text sizes ~15-20% across section labels, tab text, indicator names/descs, method names, theme names, size options, about section

---

## v2.6.17 — 2026-04-05
### Update
- Bumped all overlay fade durations to 420ms — backdrop, calendar dialog, calendar sheet, Settings, CitySelector
- Moved `transition:fade` from calendar-sheet (inner) to calendar-dialog (outer wrapper) so the container stays alive for the full fade duration — fixes the cut on close
- Unified all overlay fade durations: Settings panel, City Selector, Calendar, backdrops all at 420ms
- Fixed settings close tap bleeding through to main screen — `settings-content` now stops propagation so closing settings no longer accidentally triggers clock toggle

---

## v2.6.15 — 2026-04-05
### Update
- All notification UI strings in Settings now go through `$t()` — fully translated in Arabic mode
- Added Arabic translations for all notification labels and descriptions to locale store
- Fixed missing `var(--font-ar)` on tap-hint, next-label, clock-center-next, indicator-active, calendar-today in Arabic mode
- Settings panel applies `var(--font-ar)` to all content when in Arabic mode via `.settings-inner.rtl`
- CitySelector applies `var(--font-ar)` and RTL direction in Arabic mode

---

## v2.6.14 — 2026-04-05
### Update
- Removed tabular-nums from main time display so digits render with natural proportional spacing

---

## v2.6.13 — 2026-04-05
### Update
- Bumped font-weight on all numeric elements (times, countdown, calendar) from 300/400 → 500

---

## v2.6.12 — 2026-04-05
### Update
- Removed all redundant `font-family: var(--font-en)` per-element declarations — everything now inherits from body
- Only explicit overrides remain: `--font-ar` for Arabic text, `--font-num` for numbers

---

## v2.6.11 — 2026-04-05
### Update
- Introduced 3 font CSS variables in `:root`: `--font-en`, `--font-ar`, `--font-num`
- All font-family declarations now use variables instead of hardcoded names

---

## v2.6.10 — 2026-04-05
### Update
- Countdown numbers zero-padded to 2 digits (e.g. 05m 09s)

---

## v2.6.9 — 2026-04-05
### Update
- Removed all letter-spacing declarations throughout the app

---

## v2.6.8 — 2026-04-05
### Update
- Replaced Noto Kufi Arabic with Noto Sans Arabic for all Arabic text throughout

---

## v2.6.7 — 2026-04-05
### Update
- Replaced Lexend and Inter with Montserrat throughout — single font for all English UI and numbers

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
