<script>
  import { calculationMethod, customAngles, settingsOpen, clockIndicators, labelSize } from '$lib/stores/prayer.js';
  import { darkThemes, lightThemes, currentThemeId, setTheme, themeMode, setThemeMode } from '$lib/stores/theme.js';
  import { fade } from 'svelte/transition';
  import { onMount } from 'svelte';

  // Theme lists for selector
  $: activeThemes = $themeMode === 'light' ? lightThemes : darkThemes;
  $: themeList = Object.values(activeThemes);

  // Switch to a mode and set a valid theme for that mode if needed
  function switchToMode(mode) {
    setThemeMode(mode);
    const targetThemes = mode === 'light' ? lightThemes : darkThemes;
    // If current theme doesn't exist in the new mode, pick the first one
    if (!targetThemes[$currentThemeId]) {
      const firstThemeId = Object.keys(targetThemes)[0];
      if (firstThemeId) {
        setTheme(firstThemeId);
      }
    }
  }

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
  let qiblaPermissionNote = '';

  function emitQiblaPermission(status) {
    if (typeof window === 'undefined') return;
    try {
      window.dispatchEvent(new CustomEvent('azan:qibla-permission', { detail: { status } }));
    } catch (error) {
      // Ignore event dispatch issues; UI state is source of truth.
    }
  }

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
      localStorage.setItem('azan-method', selectedMethod);
      localStorage.setItem('azan-angles', JSON.stringify({ fajr: fajrAngle, isha: ishaAngle }));
    }
  }

  async function toggleQiblaIndicator() {
    qiblaPermissionNote = '';

    // Turning off never needs a permission flow.
    if ($clockIndicators.qibla) {
      clockIndicators.toggle('qibla');
      return;
    }

    // iOS compass permission flow: ask at toggle time.
    if (
      typeof window !== 'undefined'
      && window.DeviceOrientationEvent
      && typeof window.DeviceOrientationEvent.requestPermission === 'function'
    ) {
      try {
        const permission = await window.DeviceOrientationEvent.requestPermission();
        if (permission === 'granted') {
          clockIndicators.toggle('qibla');
          emitQiblaPermission('granted');
        } else {
          qiblaPermissionNote = 'Compass permission was denied. Enable it in Safari settings to use Qibla.';
          emitQiblaPermission('denied');
        }
      } catch (error) {
        qiblaPermissionNote = 'Could not request compass permission right now.';
        emitQiblaPermission('denied');
      }
      return;
    }

    // Non-iOS browsers usually do not require an explicit permission prompt.
    clockIndicators.toggle('qibla');
    emitQiblaPermission('granted');
  }

  function handleKeydown(e) {
    if (e.key === 'Escape' && isOpen) {
      close();
    }
  }

  onMount(() => {
    if (typeof localStorage !== 'undefined') {
      const savedMethod = localStorage.getItem('azan-method');
      const savedAngles = localStorage.getItem('azan-angles');

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
    <!-- Gear icon -->
    <g class="gear">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </g>
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

  <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <div class="settings-content" on:click={close} role="dialog" aria-modal="true">
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <div class="settings-inner" on:click|stopPropagation>
      <!-- Header -->
      <div class="settings-header">
        <span class="settings-title">Settings</span>
      </div>

      <!-- Theme Selector -->
      <div class="section">
      <span class="section-label">Theme</span>

      <!-- Dark/Light/Texture Mode Switcher -->
      <div class="mode-switcher">
        <button
          class="mode-tab"
          class:active={$themeMode === 'dark'}
          on:click={() => switchToMode('dark')}
          type="button"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" class="mode-icon">
            <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z"/>
          </svg>
          <span>Dark</span>
        </button>
        <button
          class="mode-tab"
          class:active={$themeMode === 'light'}
          on:click={() => switchToMode('light')}
          type="button"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="mode-icon">
            <circle cx="12" cy="12" r="4"/>
            <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>
          </svg>
          <span>Light</span>
          <span class="new-badge">NEW</span>
        </button>
      </div>

      <div class="theme-grid">
        {#each themeList as theme, i}
          {@const isNewDarkTheme = $themeMode === 'dark' && (theme.id === 'sakura' || theme.id === 'ember')}
          <button
            class="theme-card"
            class:selected={$currentThemeId === theme.id}
            on:click={() => { setTheme(theme.id); close(); }}
            type="button"
            style="--preview-bg: {theme.bg}; --preview-accent: {theme.accent}; --preview-accent-bright: {theme.accentBright};"
          >
            {#if isNewDarkTheme}
              <span class="new-badge theme-badge">NEW</span>
            {/if}
            <div class="theme-preview">
              <div class="preview-glow"></div>
              <div class="preview-dot"></div>
            </div>
            <span class="theme-name">{theme.name}</span>
          </button>
        {/each}
      </div>
    </div>

    <!-- Clock Indicators -->
    <div class="section">
      <span class="section-label">Clock Indicators</span>
      <div class="indicators-grid">
        <button
          class="indicator-toggle"
          class:active={$clockIndicators.sunrise}
          on:click={() => clockIndicators.toggle('sunrise')}
          type="button"
        >
          <span class="indicator-name">Sunrise</span>
        </button>
        <button
          class="indicator-toggle"
          class:active={$clockIndicators.qibla}
          on:click={toggleQiblaIndicator}
          type="button"
        >
          <span class="indicator-name">Qibla</span>
          <span class="indicator-desc">Compass needle</span>
        </button>
        <button
          class="indicator-toggle"
          class:active={$clockIndicators.lastThird}
          on:click={() => clockIndicators.toggle('lastThird')}
          type="button"
        >
          <span class="indicator-name">Last Third</span>
          <span class="indicator-desc">Best time for dua</span>
        </button>
        <button
          class="indicator-toggle"
          class:active={$clockIndicators.firstThirdEnd}
          on:click={() => clockIndicators.toggle('firstThirdEnd')}
          type="button"
        >
          <span class="indicator-name">1st Third End</span>
          <span class="indicator-desc">Isha preferred end</span>
        </button>
        <button
          class="indicator-toggle"
          class:active={$clockIndicators.fridayDua}
          on:click={() => clockIndicators.toggle('fridayDua')}
          type="button"
        >
          <span class="indicator-name">Jumu'ah Dua</span>
          <span class="indicator-desc">Asr to Maghrib</span>
        </button>
        <button
          class="indicator-toggle"
          class:active={$clockIndicators.duha}
          on:click={() => clockIndicators.toggle('duha')}
          type="button"
        >
          <span class="indicator-name">Duha</span>
          <span class="indicator-desc">Morning prayer</span>
        </button>
        <button
          class="indicator-toggle"
          class:active={$clockIndicators.qaylula}
          on:click={() => clockIndicators.toggle('qaylula')}
          type="button"
        >
          <span class="indicator-name">Qaylula</span>
          <span class="indicator-desc">Mid-day rest</span>
        </button>
      </div>
      {#if $clockIndicators.qibla}
        <p class="indicator-note">Qibla is based on your selected city—we never track your live location. May be inaccurate within Makkah or while travelling.</p>
      {/if}
      {#if qiblaPermissionNote}
        <p class="indicator-note">{qiblaPermissionNote}</p>
      {/if}
    </div>

    <!-- Label Size -->
    <div class="section">
      <span class="section-label">Clock Label Size</span>
      <div class="size-options">
        <button
          class="size-option"
          class:active={$labelSize === 'small'}
          on:click={() => labelSize.set('small')}
          type="button"
        >Small</button>
        <button
          class="size-option"
          class:active={$labelSize === 'medium'}
          on:click={() => labelSize.set('medium')}
          type="button"
        >Medium</button>
        <button
          class="size-option"
          class:active={$labelSize === 'large'}
          on:click={() => labelSize.set('large')}
          type="button"
        >Large</button>
      </div>
    </div>

    <!-- Calculation Method -->
    <div class="section">
      <span class="section-label">Calculation Method</span>
      <div class="method-grid">
        {#each methods as method, i}
          <button
            class="method-card"
            class:selected={selectedMethod === method.id}
            on:click={() => selectMethod(method)}
            type="button"
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

    <!-- GitHub link -->
    <a
      href="https://github.com/klsoen/athan-pwa"
      target="_blank"
      rel="noopener noreferrer"
      class="github-link"
    >
      <svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
      </svg>
      <span>View on GitHub</span>
    </a>
    </div>

    <!-- Close hint -->
    <div class="close-hint">
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

  /* Gear icon */
  .settings-btn .gear {
    transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
    transform-origin: center;
  }

  .settings-btn.open .gear {
    opacity: 0;
    transform: rotate(90deg) scale(0.5);
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
    justify-content: flex-start;
    gap: 1rem;
    padding: 1rem;
    padding-top: calc(4.5rem + env(safe-area-inset-top, 0px));
    padding-bottom: calc(2rem + env(safe-area-inset-bottom, 0px));
    overflow-y: auto;
    scrollbar-width: none;
    -ms-overflow-style: none;
    cursor: pointer;
  }

  .settings-content::-webkit-scrollbar {
    display: none;
  }

  .settings-inner {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1.5rem;
    width: 100%;
    max-width: 400px;
    cursor: default;
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

  /* Mode switcher (Light/Dark tabs) */
  .mode-switcher {
    display: flex;
    background: rgba(var(--theme-text-rgb), 0.04);
    border: 1px solid rgba(var(--theme-text-rgb), 0.08);
    border-radius: 2rem;
    padding: 0.2rem;
    gap: 0.15rem;
    margin-bottom: 0.5rem;
  }

  .mode-tab {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.4rem;
    padding: 0.5rem 1.2rem;
    background: transparent;
    border: none;
    border-radius: 1.5rem;
    cursor: pointer;
    transition: all 0.25s ease;
    color: rgba(var(--theme-text-rgb), 0.45);
  }

  .mode-tab:hover {
    color: rgba(var(--theme-text-rgb), 0.7);
    background: rgba(var(--theme-text-rgb), 0.04);
  }

  .mode-tab.active {
    background: rgba(var(--theme-accent-rgb), 0.15);
    color: var(--theme-accent);
  }

  .mode-tab span:not(.new-badge) {
    font-family: 'Outfit', sans-serif;
    font-size: 0.72rem;
    font-weight: 500;
    letter-spacing: 0.02em;
  }

  .mode-icon {
    width: 0.9rem;
    height: 0.9rem;
  }

  .new-badge {
    position: absolute;
    top: -4px;
    right: -4px;
    padding: 0.15rem 0.35rem;
    background: var(--theme-accent);
    color: var(--theme-bg);
    font-family: 'Outfit', sans-serif;
    font-size: 0.5rem;
    font-weight: 700;
    letter-spacing: 0.05em;
    border-radius: 0.25rem;
    text-transform: uppercase;
  }

  .new-badge.theme-badge {
    top: 2px;
    right: 2px;
    font-size: 0.45rem;
    padding: 0.1rem 0.25rem;
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
    position: relative;
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

  /* Clock Indicators */
  .indicators-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 0.5rem;
    width: 100%;
    max-width: 320px;
  }

  .indicator-toggle {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.2rem;
    padding: 0.6rem 0.4rem;
    background: rgba(var(--theme-text-rgb), 0.03);
    border: 1px solid rgba(var(--theme-text-rgb), 0.06);
    border-radius: 0.75rem;
    cursor: pointer;
    transition: all 0.2s ease;
    min-height: 3.2rem;
  }

  .indicator-toggle:hover {
    background: rgba(var(--theme-text-rgb), 0.06);
    border-color: rgba(var(--theme-text-rgb), 0.12);
  }

  .indicator-toggle.active {
    background: rgba(var(--theme-accent-rgb), 0.1);
    border-color: rgba(var(--theme-accent-rgb), 0.4);
  }

  .indicator-name {
    font-family: 'Outfit', sans-serif;
    font-size: 0.65rem;
    font-weight: 500;
    color: rgba(var(--theme-text-rgb), 0.7);
    text-align: center;
    line-height: 1.2;
  }

  .indicator-toggle.active .indicator-name {
    color: var(--theme-accent);
  }

  .indicator-desc {
    font-family: 'Outfit', sans-serif;
    font-size: 0.55rem;
    color: rgba(var(--theme-text-rgb), 0.35);
    text-align: center;
  }

  .indicator-toggle.active .indicator-desc {
    color: rgba(var(--theme-accent-rgb), 0.6);
  }

  .indicator-note {
    font-family: 'Outfit', sans-serif;
    font-size: 0.7rem;
    color: rgba(var(--theme-accent-rgb), 0.8);
    text-align: center;
    margin-top: 0.75rem;
    padding: 0.6rem 0.8rem;
    line-height: 1.4;
    background: rgba(var(--theme-accent-rgb), 0.08);
    border-radius: 0.5rem;
    border: 1px solid rgba(var(--theme-accent-rgb), 0.15);
  }

  .size-options {
    display: flex;
    gap: 0.5rem;
    justify-content: center;
  }

  .size-option {
    font-family: 'Outfit', sans-serif;
    font-size: 0.75rem;
    font-weight: 400;
    padding: 0.5rem 1rem;
    background: rgba(var(--theme-text-rgb), 0.05);
    border: 1px solid rgba(var(--theme-text-rgb), 0.1);
    border-radius: 0.5rem;
    color: rgba(var(--theme-text-rgb), 0.6);
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .size-option:hover {
    background: rgba(var(--theme-text-rgb), 0.08);
    border-color: rgba(var(--theme-text-rgb), 0.15);
  }

  .size-option.active {
    background: rgba(var(--theme-accent-rgb), 0.15);
    border-color: rgba(var(--theme-accent-rgb), 0.4);
    color: var(--theme-accent);
  }

  .github-link {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.6rem 1rem;
    background: rgba(var(--theme-text-rgb), 0.05);
    border: 1px solid rgba(var(--theme-text-rgb), 0.1);
    border-radius: 2rem;
    color: rgba(var(--theme-text-rgb), 0.5);
    text-decoration: none;
    transition: all 0.2s ease;
  }

  .github-link:hover {
    background: rgba(var(--theme-text-rgb), 0.1);
    color: rgba(var(--theme-text-rgb), 0.8);
  }

  .github-link svg {
    width: 1rem;
    height: 1rem;
  }

  .github-link span {
    font-family: 'Outfit', sans-serif;
    font-size: 0.75rem;
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

    .indicators-grid {
      grid-template-columns: repeat(2, 1fr);
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
