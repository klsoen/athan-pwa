import { writable } from 'svelte/store';
import { browser } from '$app/environment';

/**
 * Theme Configuration
 * Each theme maintains the refined Islamic minimalist aesthetic
 * with WCAG-compliant contrast ratios
 */
export const themes = {
  gold: {
    id: 'gold',
    name: 'Refined Gold',
    description: 'The classic. Luxurious restraint.',
    bg: '#080808',
    bgGradient: null,
    accent: '#d4af37',
    accentBright: '#e8c252',
    accentDim: '#b8943a',
    accentRgb: '212, 175, 55',
    accentBrightRgb: '232, 194, 82',
    text: '#ffffff',
    textMuted: '#a0a0a0',
    textRgb: '255, 255, 255',
  },
  starlight: {
    id: 'starlight',
    name: 'Lunar Silk',
    description: 'Gold on silver. Light woven from starlight.',
    bg: '#0e0e10',
    bgGradient: 'radial-gradient(ellipse at 50% 40%, rgba(250, 200, 180, 0.15) 0%, rgba(230, 180, 160, 0.07) 40%, transparent 70%), radial-gradient(ellipse at 30% 80%, rgba(255, 210, 190, 0.08) 0%, transparent 50%)',
    accent: '#e0b070',
    accentBright: '#f5d090',
    accentDim: '#c49550',
    accentRgb: '224, 176, 112',
    accentBrightRgb: '245, 208, 144',
    text: '#ffffff',
    textMuted: '#a0a0a0',
    textRgb: '255, 255, 255',
  },
  amber: {
    id: 'amber',
    name: 'Amber Dusk',
    description: 'Warm honey sunset. The golden hour of Maghrib.',
    bg: '#0a0906',
    bgGradient: 'radial-gradient(ellipse at 50% 80%, rgba(60, 40, 20, 0.35) 0%, transparent 60%)',
    accent: '#d4a855',
    accentBright: '#e8c478',
    accentDim: '#a8843a',
    accentRgb: '212, 168, 85',
    accentBrightRgb: '232, 196, 120',
    text: '#ffffff',
    textMuted: '#a0a0a0',
    textRgb: '255, 255, 255',
  },
  rose: {
    id: 'rose',
    name: 'Rose Dawn',
    description: 'Warm rose. The soft blush of Fajr.',
    bg: '#0a0606',
    bgGradient: 'radial-gradient(ellipse at 50% 75%, rgba(120, 50, 55, 0.5) 0%, rgba(80, 35, 40, 0.25) 35%, transparent 65%), radial-gradient(ellipse at 35% 25%, rgba(100, 45, 50, 0.2) 0%, transparent 45%)',
    accent: '#f0a8a0',
    accentBright: '#ffd4cc',
    accentDim: '#d08878',
    accentRgb: '240, 168, 160',
    accentBrightRgb: '255, 212, 204',
    text: '#ffffff',
    textMuted: '#a0a0a0',
    textRgb: '255, 255, 255',
  },
  emerald: {
    id: 'emerald',
    name: 'Emerald Night',
    description: 'Traditional Islamic green. Sacred and spiritual.',
    bg: '#080a08',
    bgGradient: 'radial-gradient(ellipse at 50% 30%, rgba(30, 60, 35, 0.3) 0%, transparent 60%)',
    accent: '#7fb88c',
    accentBright: '#a8d4b2',
    accentDim: '#5a8a65',
    accentRgb: '127, 184, 140',
    accentBrightRgb: '168, 212, 178',
    text: '#ffffff',
    textMuted: '#a0a0a0',
    textRgb: '255, 255, 255',
  },
  ocean: {
    id: 'ocean',
    name: 'Ocean Depth',
    description: 'Deep teal waters. Vast and meditative.',
    bg: '#080a0a',
    bgGradient: 'radial-gradient(ellipse at 50% 60%, rgba(25, 50, 50, 0.4) 0%, transparent 60%)',
    accent: '#7cb8b8',
    accentBright: '#a8d8d8',
    accentDim: '#5a8a8a',
    accentRgb: '124, 184, 184',
    accentBrightRgb: '168, 216, 216',
    text: '#ffffff',
    textMuted: '#a0a0a0',
    textRgb: '255, 255, 255',
  },
  twilight: {
    id: 'twilight',
    name: 'Twilight Sapphire',
    description: 'Deep midnight blue. Between Maghrib and Isha.',
    bg: '#080c14',
    bgGradient: 'radial-gradient(ellipse at 50% 0%, rgba(30, 50, 80, 0.4) 0%, transparent 60%)',
    accent: '#a8c5d9',
    accentBright: '#d4e5ef',
    accentDim: '#6a8fa8',
    accentRgb: '168, 197, 217',
    accentBrightRgb: '212, 229, 239',
    text: '#ffffff',
    textMuted: '#a0a0a0',
    textRgb: '255, 255, 255',
  },
  coral: {
    id: 'coral',
    name: 'Coral Reef',
    description: 'Deep sea and warmth. Where ocean meets sun.',
    bg: '#0a1018',
    bgGradient: 'radial-gradient(ellipse at 50% 40%, rgba(20, 40, 60, 0.5) 0%, transparent 60%), radial-gradient(ellipse at 30% 70%, rgba(15, 35, 55, 0.4) 0%, transparent 50%)',
    accent: '#e8a060',
    accentBright: '#f8c080',
    accentDim: '#c88848',
    accentRgb: '232, 160, 96',
    accentBrightRgb: '248, 192, 128',
    text: '#ffffff',
    textMuted: '#a0a0a0',
    textRgb: '255, 255, 255',
  },
  manuscript: {
    id: 'manuscript',
    name: 'Sacred Script',
    description: 'Deep burgundy. The ink of sacred script.',
    bg: '#1a0810',
    bgGradient: 'radial-gradient(ellipse at 50% 40%, rgba(80, 20, 35, 0.5) 0%, transparent 60%), radial-gradient(ellipse at 70% 70%, rgba(60, 15, 28, 0.4) 0%, transparent 50%)',
    accent: '#f0a8b8',
    accentBright: '#ffd0dc',
    accentDim: '#d08898',
    accentRgb: '240, 168, 184',
    accentBrightRgb: '255, 208, 220',
    text: '#f5e8d0',
    textMuted: '#c0a888',
    textRgb: '245, 232, 208',
  },
};

// Load saved theme or default to gold
const savedTheme = browser ? localStorage.getItem('athan-theme') : null;
const initialTheme = savedTheme && themes[savedTheme] ? savedTheme : 'gold';

export const currentThemeId = writable(initialTheme);
export const currentTheme = writable(themes[initialTheme]);

// Apply theme to document when it changes
currentThemeId.subscribe((themeId) => {
  if (!browser) return;

  const theme = themes[themeId];
  if (!theme) return;

  currentTheme.set(theme);
  localStorage.setItem('athan-theme', themeId);

  // Apply CSS variables to :root
  const root = document.documentElement;
  root.style.setProperty('--theme-bg', theme.bg);
  root.style.setProperty('--theme-bg-gradient', theme.bgGradient || 'none');
  root.style.setProperty('--theme-accent', theme.accent);
  root.style.setProperty('--theme-accent-bright', theme.accentBright);
  root.style.setProperty('--theme-accent-dim', theme.accentDim);
  root.style.setProperty('--theme-accent-rgb', theme.accentRgb);
  root.style.setProperty('--theme-accent-bright-rgb', theme.accentBrightRgb);
  root.style.setProperty('--theme-text', theme.text);
  root.style.setProperty('--theme-text-muted', theme.textMuted);
  root.style.setProperty('--theme-text-rgb', theme.textRgb);

  // Also update meta theme-color for mobile browsers
  const metaTheme = document.querySelector('meta[name="theme-color"]');
  if (metaTheme) {
    metaTheme.setAttribute('content', theme.bg);
  }
});

export function setTheme(themeId) {
  if (themes[themeId]) {
    currentThemeId.set(themeId);
  }
}
