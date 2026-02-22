<script>
  import { calculationMethod, customAngles, settingsOpen } from '$lib/stores/prayer.js';
  import { fade, fly, scale } from 'svelte/transition';
  import { cubicOut, backOut } from 'svelte/easing';
  import { onMount } from 'svelte';

  const methods = [
    { id: 'MuslimWorldLeague', name: 'Muslim World League', fajr: 18, isha: 17 },
    { id: 'Egyptian', name: 'Egyptian General Authority of Survey', fajr: 19.5, isha: 17.5 },
    { id: 'Karachi', name: 'University of Islamic Sciences, Karachi', fajr: 18, isha: 18 },
    { id: 'UmmAlQura', name: 'Umm al-Qura University, Makkah', fajr: 18.5, isha: '90min' },
    { id: 'Dubai', name: 'UAE General Authority of Islamic Affairs', fajr: 18.2, isha: 18.2 },
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

<button class="settings-btn" on:click|stopPropagation={open} type="button" aria-label="Settings">
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
    <circle cx="12" cy="5" r="1.5" fill="currentColor" stroke="none" />
    <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
    <circle cx="12" cy="19" r="1.5" fill="currentColor" stroke="none" />
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

    <!-- Calculation Method -->
    <div class="section" in:fade={{ duration: 300, delay: 100 }}>
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
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2.2rem;
    height: 2.2rem;
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 50%;
    color: rgba(255, 255, 255, 0.5);
    cursor: pointer;
    transition: all 0.2s;
  }

  .settings-btn:hover {
    background: rgba(255, 255, 255, 0.1);
    color: rgba(255, 255, 255, 0.8);
  }

  .settings-btn svg {
    width: 1.1rem;
    height: 1.1rem;
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
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    z-index: 1001;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1.75rem;
    padding: 1.5rem;
    width: 92vw;
    max-width: 420px;
    max-height: 85vh;
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
    color: rgba(212, 175, 55, 0.9);
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
    color: rgba(255, 255, 255, 0.35);
    text-transform: uppercase;
    letter-spacing: 0.15em;
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
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 0.75rem;
    cursor: pointer;
    transition: all 0.2s ease;
    min-height: 4.2rem;
  }

  .method-card:hover {
    background: rgba(255, 255, 255, 0.08);
    border-color: rgba(255, 255, 255, 0.15);
  }

  .method-card.selected {
    background: rgba(212, 175, 55, 0.12);
    border-color: rgba(212, 175, 55, 0.35);
  }

  .method-name {
    font-family: 'Outfit', sans-serif;
    font-size: 0.72rem;
    font-weight: 500;
    color: rgba(255, 255, 255, 0.8);
    text-align: center;
    line-height: 1.3;
  }

  .method-card.selected .method-name {
    color: #d4af37;
  }

  .method-angles {
    font-family: 'Outfit', sans-serif;
    font-size: 0.65rem;
    color: rgba(255, 255, 255, 0.35);
    margin-top: 0.2rem;
  }

  .method-card.selected .method-angles {
    color: rgba(212, 175, 55, 0.6);
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
    background: rgba(255, 255, 255, 0.1);
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
    color: rgba(212, 175, 55, 0.7);
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }

  .angle-control {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 2rem;
    padding: 0.25rem;
  }

  .angle-btn {
    width: 2rem;
    height: 2rem;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(255, 255, 255, 0.08);
    border: none;
    border-radius: 50%;
    color: rgba(255, 255, 255, 0.7);
    font-size: 1.1rem;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  .angle-btn:hover {
    background: rgba(212, 175, 55, 0.2);
    color: #d4af37;
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
    color: rgba(255, 255, 255, 0.3);
  }

  .angle-hint {
    font-family: 'Outfit', sans-serif;
    font-size: 0.65rem;
    color: rgba(255, 255, 255, 0.25);
    text-align: center;
    margin-top: 0.25rem;
  }

  .close-hint {
    font-family: 'Outfit', sans-serif;
    font-size: 0.6rem;
    color: rgba(255, 255, 255, 0.2);
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
