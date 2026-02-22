# Athan PWA - Claude Code Instructions

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
- **Typography**: Amiri for Arabic, Cormorant Garamond for English display, Outfit for UI
- **Motion**: Subtle, purposeful animations - no bouncing or excessive effects
- **Philosophy**: Less is more. Every element should be intentional.

## Key Files

- `src/lib/components/BreathDesign.svelte` - Main app component (breathing state + clock)
- `src/lib/components/CitySelector.svelte` - Spotlight-style city picker
- `src/lib/stores/prayer.js` - Prayer time calculations and state
- `src/app.css` - Global styles

## Technical Notes

- Uses `adhan` library for prayer time calculations
- Clock is oriented with Maghrib at 12 o'clock (start of Islamic day)
- Hijri date uses `islamic-umalqura` calendar
- City selector uses a store (`citySelectorOpen`) to communicate blur state to parent
