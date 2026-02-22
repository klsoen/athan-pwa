<script>
  import { onMount } from 'svelte';
  import { prayerTimes, currentPrayer, countdown, prayerNames, location, currentTime } from '$lib/stores/prayer.js';
  import CitySelector from './CitySelector.svelte';

  const prayers = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'];

  // Positions around the circle (in degrees, 0 = top)
  const prayerAngles = {
    fajr: -60,
    sunrise: 0,
    dhuhr: 60,
    asr: 120,
    maghrib: 180,
    isha: 240
  };

  function getPosition(angle, radius) {
    const rad = (angle - 90) * Math.PI / 180;
    return {
      x: 50 + radius * Math.cos(rad),
      y: 50 + radius * Math.sin(rad)
    };
  }

  function formatTime(date) {
    if (!date) return '--:--';
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: false
    });
  }

  function formatCountdown(cd) {
    const h = String(cd.hours).padStart(2, '0');
    const m = String(cd.minutes).padStart(2, '0');
    const s = String(cd.seconds).padStart(2, '0');
    return `${h}:${m}:${s}`;
  }

  function formatHijriDate() {
    try {
      const formatter = new Intl.DateTimeFormat('en-u-ca-islamic', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      });
      return formatter.format($currentTime);
    } catch {
      return '';
    }
  }

  // Calculate current time position on circle
  function getCurrentAngle() {
    const now = $currentTime;
    const hours = now.getHours() + now.getMinutes() / 60;
    // Map 24 hours to 360 degrees, starting from top
    return (hours / 24) * 360 - 90;
  }

  $: currentAngle = getCurrentAngle();
  $: indicatorPos = getPosition(currentAngle + 90, 38);

  let activeTab = 'prayer';
</script>

<div class="circle-container">
  <!-- Background -->
  <div class="circle-bg"></div>

  <!-- Header -->
  <header class="circle-header">
    <CitySelector />
    <div class="hijri-date">{formatHijriDate()}</div>
  </header>

  <!-- Main circle -->
  <div class="prayer-circle-wrapper">
    <svg viewBox="0 0 100 100" class="prayer-circle-svg">
      <!-- Outer ring -->
      <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="0.5" />

      <!-- Prayer arc track -->
      <circle cx="50" cy="50" r="38" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="8" stroke-linecap="round" />

      <!-- Progress arc (shows current time position) -->
      <circle
        cx="50" cy="50" r="38"
        fill="none"
        stroke="rgba(212,175,55,0.15)"
        stroke-width="8"
        stroke-linecap="round"
        stroke-dasharray="238.76"
        stroke-dashoffset={238.76 - (currentAngle + 90) / 360 * 238.76}
        transform="rotate(-90 50 50)"
      />

      <!-- Inner decorative ring -->
      <circle cx="50" cy="50" r="28" fill="none" stroke="rgba(255,255,255,0.04)" stroke-width="0.5" />

      <!-- Prayer points -->
      {#each prayers as prayer}
        {@const pos = getPosition(prayerAngles[prayer], 38)}
        {@const isActive = $currentPrayer.current === prayer}
        {@const isNext = $currentPrayer.next === prayer}

        <!-- Connection line to label -->
        <line
          x1={pos.x}
          y1={pos.y}
          x2={getPosition(prayerAngles[prayer], 46).x}
          y2={getPosition(prayerAngles[prayer], 46).y}
          stroke={isActive ? 'rgba(212,175,55,0.5)' : 'rgba(255,255,255,0.1)'}
          stroke-width="0.3"
        />

        <!-- Prayer dot -->
        <circle
          cx={pos.x}
          cy={pos.y}
          r={isActive ? 3 : 2}
          fill={isActive ? '#d4af37' : isNext ? 'rgba(212,175,55,0.5)' : 'rgba(255,255,255,0.3)'}
        />

        <!-- Active glow -->
        {#if isActive}
          <circle
            cx={pos.x}
            cy={pos.y}
            r="6"
            fill="none"
            stroke="rgba(212,175,55,0.3)"
            stroke-width="0.5"
          />
        {/if}
      {/each}

      <!-- Current time indicator -->
      <circle
        cx={indicatorPos.x}
        cy={indicatorPos.y}
        r="1.5"
        fill="white"
        opacity="0.8"
      />

      <!-- Center content background -->
      <circle cx="50" cy="50" r="20" fill="rgba(0,0,0,0.3)" />
    </svg>

    <!-- Prayer labels (positioned around circle) -->
    {#each prayers as prayer}
      {@const labelPos = getPosition(prayerAngles[prayer], 58)}
      {@const isActive = $currentPrayer.current === prayer}

      <div
        class="prayer-label"
        class:active={isActive}
        style="left: {labelPos.x}%; top: {labelPos.y}%;"
      >
        <span class="prayer-label-name">{prayerNames[prayer]?.en}</span>
        <span class="prayer-label-time">{formatTime($prayerTimes[prayer])}</span>
      </div>
    {/each}

    <!-- Center content -->
    <div class="circle-center">
      <div class="center-arabic">{prayerNames[$currentPrayer.current]?.ar || ''}</div>
      <div class="center-english">{prayerNames[$currentPrayer.current]?.en || ''}</div>
    </div>
  </div>

  <!-- Countdown box -->
  <div class="countdown-box">
    <div class="countdown-label">Time until {prayerNames[$currentPrayer.next]?.en}</div>
    <div class="countdown-time">{formatCountdown($countdown)}</div>
  </div>

  <!-- Bottom navigation -->
  <nav class="bottom-nav">
    <button class="nav-item" class:active={activeTab === 'prayer'} on:click={() => activeTab = 'prayer'}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <path d="M12 2L2 7v10c0 5.55 3.84 10.74 10 12 6.16-1.26 10-6.45 10-12V7l-10-5z" />
      </svg>
      <span>Prayer</span>
    </button>

    <button class="nav-item" class:active={activeTab === 'qibla'} on:click={() => activeTab = 'qibla'}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
        <circle cx="12" cy="12" r="3" fill="currentColor" />
      </svg>
      <span>Qibla</span>
    </button>

    <button class="nav-item" class:active={activeTab === 'tracker'} on:click={() => activeTab = 'tracker'}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <path d="M9 11l3 3L22 4" stroke-linecap="round" stroke-linejoin="round" />
        <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
      </svg>
      <span>Tracker</span>
    </button>

    <button class="nav-item" class:active={activeTab === 'settings'} on:click={() => activeTab = 'settings'}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
      </svg>
      <span>Settings</span>
    </button>
  </nav>
</div>

<style>
  .circle-container {
    position: fixed;
    inset: 0;
    background: radial-gradient(ellipse at 50% 30%, #1a2a3d 0%, #0d141c 100%);
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 1.5rem 1rem;
    overflow: hidden;
  }

  .circle-bg {
    position: absolute;
    inset: 0;
    background-image: radial-gradient(circle at 20% 80%, rgba(212,175,55,0.03) 0%, transparent 40%),
                      radial-gradient(circle at 80% 20%, rgba(100,150,200,0.03) 0%, transparent 40%);
  }

  /* Header */
  .circle-header {
    position: relative;
    z-index: 1;
    text-align: center;
    margin-bottom: 0.5rem;
  }

  .hijri-date {
    font-family: 'Amiri', serif;
    font-size: 0.85rem;
    color: rgba(212, 175, 55, 0.8);
    margin-top: 0.125rem;
  }

  /* Prayer circle */
  .prayer-circle-wrapper {
    position: relative;
    width: 100%;
    max-width: 320px;
    aspect-ratio: 1;
    flex-shrink: 0;
  }

  .prayer-circle-svg {
    width: 100%;
    height: 100%;
  }

  /* Prayer labels */
  .prayer-label {
    position: absolute;
    transform: translate(-50%, -50%);
    text-align: center;
    transition: all 0.3s ease;
  }

  .prayer-label-name {
    display: block;
    font-size: 0.7rem;
    color: rgba(var(--theme-text-rgb), 0.5);
    letter-spacing: 0.03em;
  }

  .prayer-label-time {
    display: block;
    font-size: 0.6rem;
    color: rgba(var(--theme-text-rgb), 0.3);
    margin-top: 0.125rem;
    font-variant-numeric: tabular-nums;
  }

  .prayer-label.active .prayer-label-name {
    color: #d4af37;
    font-weight: 500;
  }

  .prayer-label.active .prayer-label-time {
    color: rgba(212, 175, 55, 0.7);
  }

  /* Center content */
  .circle-center {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    text-align: center;
    pointer-events: none;
  }

  .center-arabic {
    font-family: 'Amiri', serif;
    font-size: 1.75rem;
    color: #d4af37;
    line-height: 1.2;
  }

  .center-english {
    font-size: 0.65rem;
    color: rgba(var(--theme-text-rgb), 0.4);
    letter-spacing: 0.15em;
    text-transform: uppercase;
    margin-top: 0.125rem;
  }

  /* Countdown box */
  .countdown-box {
    position: relative;
    z-index: 1;
    background: rgba(212, 175, 55, 0.08);
    border: 1px solid rgba(212, 175, 55, 0.15);
    border-radius: 1rem;
    padding: 1rem 2rem;
    text-align: center;
    margin-top: 1rem;
  }

  .countdown-label {
    font-size: 0.625rem;
    color: rgba(var(--theme-text-rgb), 0.4);
    letter-spacing: 0.15em;
    text-transform: uppercase;
  }

  .countdown-time {
    font-family: 'Outfit', sans-serif;
    font-size: 2.25rem;
    font-weight: 200;
    color: white;
    letter-spacing: 0.05em;
    margin-top: 0.25rem;
    font-variant-numeric: tabular-nums;
  }

  /* Bottom navigation */
  .bottom-nav {
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    display: flex;
    justify-content: space-around;
    padding: 0.75rem 1rem;
    padding-bottom: calc(0.75rem + env(safe-area-inset-bottom, 0));
    background: rgba(13, 20, 28, 0.95);
    border-top: 1px solid rgba(var(--theme-text-rgb), 0.05);
  }

  .nav-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
    padding: 0.5rem 0.75rem;
    background: none;
    border: none;
    color: rgba(var(--theme-text-rgb), 0.3);
    cursor: pointer;
    transition: color 0.2s;
  }

  .nav-item svg {
    width: 1.25rem;
    height: 1.25rem;
  }

  .nav-item span {
    font-size: 0.6rem;
    letter-spacing: 0.03em;
  }

  .nav-item.active {
    color: #d4af37;
  }
</style>
