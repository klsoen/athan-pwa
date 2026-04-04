# Azan PWA - Claude Code Instructions

## UI/Frontend Changes

**Always use the `/frontend-design` skill when making UI or frontend changes.**

This includes:
- Component styling changes
- Layout modifications
- Animation updates
- Color/theme adjustments
- Any visual design work

## Design Direction

This app follows a **Refined Islamic Minimalism** aesthetic:
- **Color palette**: Monochromatic gold (#d4af37) on deep black (#080808)
- **Typography**: Cairo for Arabic, Outfit for all English UI
- **Motion**: Subtle, purposeful animations - no bouncing or excessive effects
- **Philosophy**: Less is more. Every element should be intentional.

## Key Files

- `src/lib/components/BreathDesign.svelte` - Main app component (breathing state + clock)
- `src/lib/components/CitySelector.svelte` - Spotlight-style city picker
- `src/lib/stores/prayer.js` - Prayer time calculations and state
- `src/app.css` - Global styles

## Changelog Rule

**Always update `CHANGELOG.md` before every commit — no exceptions.**

- Read the current latest version at the top of the file
- Versioning is `MAJOR.FEATURE.UPDATE` (3-point): increment update for fixes/changes, feature for new functionality, major for overhauls
- "Fix" and "Update" are the same category — use **Update** only
- Add the new version block at the top of the file with today's date and a clear description of what changed
- Stage `CHANGELOG.md` along with the other changed files

## Technical Notes

- Uses `adhan` library for prayer time calculations
- Clock is oriented with Maghrib at 12 o'clock (start of Islamic day)
- Hijri date uses `islamic-umalqura` calendar
- City selector uses a store (`citySelectorOpen`) to communicate blur state to parent
