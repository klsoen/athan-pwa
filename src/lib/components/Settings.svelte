<script>
  import { calculationMethod, customAngles, settingsOpen } from '$lib/stores/prayer.js';
  import { themes, currentThemeId, setTheme } from '$lib/stores/theme.js';
  import { fade, fly, scale } from 'svelte/transition';
  import { cubicOut, backOut } from 'svelte/easing';
  import { onMount } from 'svelte';

  // Theme list for selector
  const themeList = Object.values(themes);

  const methods = [
    { id: 'MuslimWorldLeague', name: 'Muslim World League', fajr: 18, isha: 17 },
    { id: 'Egyptian', name: 'Egyptian General Authority of Survey', fajr: 19.5, isha: 17.5 },
    { id: 'Karachi', name: 'University of Islamic Sciences, Karachi', fajr: 18, isha: 18 },
    { id: 'UmmAlQura', name: 'Umm al-Qura University, Makkah', fajr: 18.5, isha: '90min' },
    { id: 'Dubai', name: 'UAE General Authority of Islamic Affairs', fajr: 18.2, isha: 18.2 },
    { id: 'Kuwait', name: 'Ministry of Awqaf, Kuwait', fajr: 18, isha: 17.5 },
    { id: 'Qatar', name: 'Qatar Calendar House', fajr: 18, isha: '90min' },
    { id: 'NorthAmerica', name: 'Islamic Society of North America', fajr: 15, isha: 15 },
    { id: 'MoonsightingCommittee', name: 'Moonsighting Committee Worldwide', fajr: 18, isha: 18 },
    { id: 'Turkey', name: 'Diyanet Isleri Baskanligi, Turkey', fajr: 18, isha: 17 },
    { id: 'Tehran', name: 'Institute of Geophysics, Tehran', fajr: 17.7, isha: 14 },
    { id: 'Singapore', name: 'Islamic Religious Council of Singapore', fajr: 20, isha: 18 },
    { id: 'Custom', name: 'Custom', fajr: 18, isha: 17 },
  ];

  let isOpen = false;
  let selectedMethod = 'MuslimWorldLeague';
  let fajrAngle = 18;
  let ishaAngle = 17;
  let showCustom = false;

  function open() {
    isOpen = true;
    settingsOpen.set(true);
  }

  function close() {
    isOpen = false;
    settingsOpen.set(false);
  }

  function selectMethod(method) {
    selectedMethod = method.id;

    if (method.id === 'Custom') {
      showCustom = true;
    } else {
      showCustom = false;
      fajrAngle = method.fajr;
      ishaAngle = method.isha;
      calculationMethod.set(method.id);
      customAngles.set({ fajr: method.fajr, isha: method.isha });
    }

    saveSettings();
  }

  function updateCustomAngles() {
    // Clamp values
    fajrAngle = Math.max(0, Math.min(25, fajrAngle));
    ishaAngle = Math.max(0, Math.min(25, ishaAngle));

    customAngles.set({ fajr: fajrAngle, isha: ishaAngle });
    calculationMethod.set('Custom');
    selectedMethod = 'Custom';
    saveSettings();
  }

  function saveSettings() {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('athan-method', selectedMethod);
      localStorage.setItem('athan-angles', JSON.stringify({ fajr: fajrAngle, isha: ishaAngle }));
    }
  }

  function handleKeydown(e) {
    if (e.key === 'Escape' && isOpen) {
      close();
    }
  }

  onMount(() => {
    if (typeof localStorage !== 'undefined') {
      const savedMethod = localStorage.getItem('athan-method');
      const savedAngles = localStorage.getItem('athan-angles');

      if (savedMethod) {
        selectedMethod = savedMethod;
        calculationMethod.set(savedMethod);
        showCustom = savedMethod === 'Custom';
      }

      if (savedAngles) {
        const angles = JSON.parse(savedAngles);
        fajrAngle = angles.fajr;
        ishaAngle = angles.isha;
        customAngles.set(angles);
      } else {
        // Set default angles from selected method
        const method = methods.find(m => m.id === selectedMethod);
        if (method) {
          fajrAngle = method.fajr;
          ishaAngle = method.isha;
          customAngles.set({ fajr: method.fajr, isha: method.isha });
        }
      }
    }
  });

  $: currentMethod = methods.find(m => m.id === selectedMethod);
</script>

<svelte:window on:keydown={handleKeydown} />

<button
  class="settings-btn"
  class:open={isOpen}
  on:click|stopPropagation={() => isOpen ? close() : open()}
  type="button"
  aria-label={isOpen ? 'Close settings' : 'Settings'}
>
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
    <!-- Three dots that morph into X -->
    <circle class="dot dot-top" cx="12" cy="5" r="1.5" fill="currentColor" stroke="none" />
    <circle class="dot dot-mid" cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
    <circle class="dot dot-bot" cx="12" cy="19" r="1.5" fill="currentColor" stroke="none" />
    <!-- X lines (hidden by default) -->
    <line class="x-line x-line-1" x1="7" y1="7" x2="17" y2="17" stroke-linecap="round" />
    <line class="x-line x-line-2" x1="17" y1="7" x2="7" y2="17" stroke-linecap="round" />
  </svg>
</button>

{#if isOpen}
  <button
    class="backdrop"
    on:click|stopPropagation={close}
    type="button"
    aria-label="Close"
    transition:fade={{ duration: 200 }}
  ></button>

  <div class="settings-content" on:click|stopPropagation role="dialog" aria-modal="true">

    <!-- Header -->
    <div class="settings-header" in:fly={{ y: -15, duration: 400, delay: 50, easing: cubicOut }}>
      <span class="settings-title">Settings</span>
    </div>

    <!-- Theme Selector -->
    <div class="section" in:fade={{ duration: 300, delay: 80 }}>
      <span class="section-label">Theme</span>
      <div class="theme-grid">
        {#each themeList as theme, i}
          <button
            class="theme-card"
            class:selected={$currentThemeId === theme.id}
            on:click={() => { setTheme(theme.id); close(); }}
            type="button"
            style="--preview-bg: {theme.bg}; --preview-accent: {theme.accent}; --preview-accent-bright: {theme.accentBright};"
            in:scale={{ duration: 200, delay: 100 + i * 30, start: 0.9, easing: backOut }}
          >
            <div class="theme-preview">
              <div class="preview-glow"></div>
              <div class="preview-dot"></div>
            </div>
            <span class="theme-name">{theme.name}</span>
          </button>
        {/each}
      </div>
    </div>

    <!-- Calculation Method -->
    <div class="section" in:fade={{ duration: 300, delay: 150 }}>
      <span class="section-label">Calculation Method</span>
      <div class="method-grid">
        {#each methods as method, i}
          <button
            class="method-card"
            class:selected={selectedMethod === method.id}
            on:click={() => selectMethod(method)}
            type="button"
            in:scale={{ duration: 250, delay: 120 + i * 25, start: 0.9, easing: backOut }}
          >
            <span class="method-name">{method.name}</span>
            {#if method.id !== 'Custom'}
              <span class="method-angles">{method.fajr}° / {typeof method.isha === 'string' ? method.isha : method.isha + '°'}</span>
            {:else}
              <span class="method-angles">Your angles</span>
            {/if}
          </button>
        {/each}
      </div>
    </div>

    <!-- Custom Angles -->
    <div
      class="section custom-section"
      class:expanded={showCustom || selectedMethod === 'Custom'}
      in:fly={{ y: 20, duration: 400, delay: 250, easing: cubicOut }}
    >
      <span class="section-label">Custom Angles</span>
      <div class="angles-row">
        <div class="angle-input-group">
          <label for="fajr-angle">Fajr</label>
          <div class="angle-control">
            <button
              class="angle-btn"
              on:click={() => { fajrAngle = Math.max(0, fajrAngle - 0.5); updateCustomAngles(); }}
              type="button"
            >−</button>
            <input
              id="fajr-angle"
              type="number"
              bind:value={fajrAngle}
              on:change={updateCustomAngles}
              min="0"
              max="25"
              step="0.5"
            />
            <button
              class="angle-btn"
              on:click={() => { fajrAngle = Math.min(25, fajrAngle + 0.5); updateCustomAngles(); }}
              type="button"
            >+</button>
          </div>
          <span class="angle-unit">degrees</span>
        </div>

        <div class="angle-divider"></div>

        <div class="angle-input-group">
          <label for="isha-angle">Isha</label>
          <div class="angle-control">
            <button
              class="angle-btn"
              on:click={() => { ishaAngle = Math.max(0, ishaAngle - 0.5); updateCustomAngles(); }}
              type="button"
            >−</button>
            <input
              id="isha-angle"
              type="number"
              bind:value={ishaAngle}
              on:change={updateCustomAngles}
              min="0"
              max="25"
              step="0.5"
            />
            <button
              class="angle-btn"
              on:click={() => { ishaAngle = Math.min(25, ishaAngle + 0.5); updateCustomAngles(); }}
              type="button"
            >+</button>
          </div>
          <span class="angle-unit">degrees</span>
        </div>
      </div>
      <p class="angle-hint">Degrees below horizon for twilight calculation</p>
    </div>

    <!-- Close hint -->
    <div class="close-hint" in:fade={{ duration: 300, delay: 400 }}>
      tap anywhere to close
    </div>
  </div>
{/if}

<style>
  .settings-btn {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2.2rem;
    height: 2.2rem;
    background: rgba(var(--theme-text-rgb), 0.06);
    border: 1px solid rgba(var(--theme-text-rgb), 0.1);
    border-radius: 50%;
    color: rgba(var(--theme-text-rgb), 0.5);
    cursor: pointer;
    transition: all 0.2s;
    z-index: 1;
  }

  .settings-btn.open {
    z-index: 1002;
    background: rgba(var(--theme-text-rgb), 0.1);
    color: rgba(var(--theme-text-rgb), 0.8);
  }

  .settings-btn:hover {
    background: rgba(var(--theme-text-rgb), 0.1);
    color: rgba(var(--theme-text-rgb), 0.8);
  }

  .settings-btn svg {
    width: 1.1rem;
    height: 1.1rem;
  }

  /* Dots */
  .settings-btn .dot {
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    transform-origin: center;
  }

  .settings-btn.open .dot-top {
    transform: translate(0, 7px);
    opacity: 0;
  }

  .settings-btn.open .dot-mid {
    opacity: 0;
    transform: scale(0);
  }

  .settings-btn.open .dot-bot {
    transform: translate(0, -7px);
    opacity: 0;
  }

  /* X lines */
  .settings-btn .x-line {
    stroke-width: 2;
    opacity: 0;
    transform: scale(0) rotate(0deg);
    transform-origin: center;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .settings-btn.open .x-line {
    opacity: 1;
    transform: scale(1) rotate(0deg);
  }

  .settings-btn.open .x-line-1 {
    transition-delay: 0.1s;
  }

  .settings-btn.open .x-line-2 {
    transition-delay: 0.15s;
  }

  .backdrop {
    position: fixed;
    inset: 0;
    background: transparent;
    z-index: 1000;
    border: none;
    cursor: default;
  }

  .settings-content {
    position: fixed;
    inset: 0;
    z-index: 1001;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1.5rem;
    padding: 1.5rem;
    padding-top: calc(4.5rem + env(safe-area-inset-top, 0px));
    padding-bottom: calc(2rem + env(safe-area-inset-bottom, 0px));
    overflow-y: auto;
    scrollbar-width: none;
    -ms-overflow-style: none;
  }

  .settings-content::-webkit-scrollbar {
    display: none;
  }

  .settings-header {
    text-align: center;
  }

  .settings-title {
    font-family: 'Cormorant Garamond', serif;
    font-size: 1.4rem;
    font-weight: 500;
    color: rgba(var(--theme-accent-rgb), 0.9);
    letter-spacing: 0.1em;
  }

  .section {
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.9rem;
  }

  .section-label {
    font-family: 'Outfit', sans-serif;
    font-size: 0.65rem;
    color: rgba(var(--theme-text-rgb), 0.35);
    text-transform: uppercase;
    letter-spacing: 0.15em;
  }

  /* Theme grid */
  .theme-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.6rem;
    width: 100%;
    max-width: 320px;
  }

  .theme-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    padding: 0.6rem 0.4rem;
    background: rgba(var(--theme-text-rgb), 0.03);
    border: 1px solid rgba(var(--theme-text-rgb), 0.06);
    border-radius: 0.75rem;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .theme-card:hover {
    background: rgba(var(--theme-text-rgb), 0.06);
    border-color: rgba(var(--theme-text-rgb), 0.12);
  }

  .theme-card.selected {
    background: rgba(var(--theme-accent-rgb), 0.1);
    border-color: rgba(var(--theme-accent-rgb), 0.4);
  }

  .theme-preview {
    position: relative;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    background: var(--preview-bg);
    border: 1px solid rgba(var(--theme-text-rgb), 0.1);
    overflow: hidden;
  }

  .preview-glow {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: radial-gradient(circle, var(--preview-accent) 0%, transparent 70%);
    opacity: 0.4;
  }

  .preview-dot {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--preview-accent-bright);
    box-shadow: 0 0 8px var(--preview-accent);
  }

  .theme-name {
    font-family: 'Outfit', sans-serif;
    font-size: 0.6rem;
    font-weight: 500;
    color: rgba(var(--theme-text-rgb), 0.6);
    text-align: center;
    line-height: 1.2;
  }

  .theme-card.selected .theme-name {
    color: var(--theme-accent);
  }

  /* Method grid */
  .method-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0.5rem;
    width: 100%;
    max-width: 360px;
  }

  .method-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 0.7rem 0.5rem;
    background: rgba(var(--theme-text-rgb), 0.04);
    border: 1px solid rgba(var(--theme-text-rgb), 0.08);
    border-radius: 0.75rem;
    cursor: pointer;
    transition: all 0.2s ease;
    min-height: 4.2rem;
  }

  .method-card:hover {
    background: rgba(var(--theme-text-rgb), 0.08);
    border-color: rgba(var(--theme-text-rgb), 0.15);
  }

  .method-card.selected {
    background: rgba(var(--theme-accent-rgb), 0.12);
    border-color: rgba(var(--theme-accent-rgb), 0.35);
  }

  .method-name {
    font-family: 'Outfit', sans-serif;
    font-size: 0.72rem;
    font-weight: 500;
    color: rgba(var(--theme-text-rgb), 0.8);
    text-align: center;
    line-height: 1.3;
  }

  .method-card.selected .method-name {
    color: var(--theme-accent);
  }

  .method-angles {
    font-family: 'Outfit', sans-serif;
    font-size: 0.65rem;
    color: rgba(var(--theme-text-rgb), 0.35);
    margin-top: 0.2rem;
  }

  .method-card.selected .method-angles {
    color: rgba(var(--theme-accent-rgb), 0.6);
  }

  /* Custom angles section */
  .custom-section {
    opacity: 0.5;
    transition: opacity 0.3s ease;
  }

  .custom-section.expanded {
    opacity: 1;
  }

  .angles-row {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 1.5rem;
  }

  .angle-divider {
    width: 1px;
    height: 3rem;
    background: rgba(var(--theme-text-rgb), 0.1);
  }

  .angle-input-group {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.4rem;
  }

  .angle-input-group label {
    font-family: 'Outfit', sans-serif;
    font-size: 0.75rem;
    font-weight: 500;
    color: rgba(var(--theme-accent-rgb), 0.7);
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  .angle-control {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    background: rgba(var(--theme-text-rgb), 0.05);
    border: 1px solid rgba(var(--theme-text-rgb), 0.1);
    border-radius: 2rem;
    padding: 0.25rem;
  }

  .angle-btn {
    width: 2rem;
    height: 2rem;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(var(--theme-text-rgb), 0.08);
    border: none;
    border-radius: 50%;
    color: rgba(var(--theme-text-rgb), 0.7);
    font-size: 1.1rem;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .angle-btn:hover {
    background: rgba(var(--theme-accent-rgb), 0.2);
    color: var(--theme-accent);
  }

  .angle-input-group input {
    width: 3.5rem;
    background: none;
    border: none;
    color: white;
    font-family: 'Outfit', sans-serif;
    font-size: 1.1rem;
    font-weight: 500;
    text-align: center;
    outline: none;
    -moz-appearance: textfield;
  }

  .angle-input-group input::-webkit-outer-spin-button,
  .angle-input-group input::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }

  .angle-unit {
    font-family: 'Outfit', sans-serif;
    font-size: 0.6rem;
    color: rgba(var(--theme-text-rgb), 0.3);
  }

  .angle-hint {
    font-family: 'Outfit', sans-serif;
    font-size: 0.65rem;
    color: rgba(var(--theme-text-rgb), 0.25);
    text-align: center;
    margin-top: 0.25rem;
  }

  .close-hint {
    font-family: 'Outfit', sans-serif;
    font-size: 0.6rem;
    color: rgba(var(--theme-text-rgb), 0.2);
    letter-spacing: 0.1em;
  }

  /* Responsive */
  @media (max-width: 360px) {
    .method-grid {
      grid-template-columns: 1fr;
    }

    .angles-row {
      flex-direction: column;
      gap: 1rem;
    }

    .angle-divider {
      width: 3rem;
      height: 1px;
    }
  }
</style>
