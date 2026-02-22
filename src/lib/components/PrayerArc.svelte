<script>
  import { prayerTimes, currentTime, currentPrayer } from '$lib/stores/prayer.js';

  // Calculate position on arc for current time
  function getTimeProgress() {
    const now = $currentTime;
    const times = $prayerTimes;

    if (!times.fajr) return 0.5;

    // Create array of prayer times for the day
    const prayerOrder = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'];
    const prayerPositions = [0.05, 0.18, 0.35, 0.52, 0.72, 0.88];

    // Find current position
    for (let i = prayerOrder.length - 1; i >= 0; i--) {
      const prayerTime = times[prayerOrder[i]];
      if (now >= prayerTime) {
        const currentPos = prayerPositions[i];
        const nextPos = prayerPositions[(i + 1) % prayerOrder.length] || 1;
        const nextTime = times[prayerOrder[(i + 1) % prayerOrder.length]];

        if (nextTime && nextTime > prayerTime) {
          const elapsed = now - prayerTime;
          const total = nextTime - prayerTime;
          const progress = Math.min(elapsed / total, 1);
          return currentPos + (nextPos - currentPos) * progress;
        }
        return currentPos;
      }
    }
    return 0.02;
  }

  $: progress = getTimeProgress();

  // Arc path - a smooth curve
  const arcPath = "M 20,140 Q 80,40 180,35 Q 280,30 340,60 Q 400,90 440,140";

  // Prayer dot positions along the arc (x, y coordinates)
  const prayerDots = [
    { x: 35, y: 115, prayer: 'fajr' },
    { x: 85, y: 55, prayer: 'sunrise' },
    { x: 180, y: 35, prayer: 'dhuhr' },
    { x: 280, y: 45, prayer: 'asr' },
    { x: 370, y: 85, prayer: 'maghrib' },
    { x: 425, y: 125, prayer: 'isha' }
  ];

  // Calculate current position on arc
  function getCurrentPosition(t) {
    // Simplified bezier calculation for visual position
    const x = 20 + t * 420;
    const y = 140 - Math.sin(t * Math.PI) * 105;
    return { x, y };
  }

  $: currentPos = getCurrentPosition(progress);
</script>

<div class="arc-container">
  <svg viewBox="0 0 460 160" class="arc-svg" preserveAspectRatio="xMidYMid meet">
    <defs>
      <!-- Gradient for the arc line -->
      <linearGradient id="arcGradient" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="rgba(255,255,255,0.1)" />
        <stop offset="50%" stop-color="rgba(255,255,255,0.3)" />
        <stop offset="100%" stop-color="rgba(255,255,255,0.1)" />
      </linearGradient>

      <!-- Glow filter for current position -->
      <filter id="currentGlow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="4" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>

    <!-- Arc line -->
    <path
      d={arcPath}
      fill="none"
      stroke="url(#arcGradient)"
      stroke-width="2"
      stroke-linecap="round"
    />

    <!-- Prayer time dots -->
    {#each prayerDots as dot}
      <circle
        cx={dot.x}
        cy={dot.y}
        r="6"
        fill="none"
        stroke="rgba(255,255,255,0.4)"
        stroke-width="1.5"
        class="prayer-dot"
        class:active={$currentPrayer.current === dot.prayer}
      />
      {#if $currentPrayer.current === dot.prayer}
        <circle
          cx={dot.x}
          cy={dot.y}
          r="4"
          fill="#E8DCC4"
        />
      {/if}
    {/each}

    <!-- Current time indicator (sun/moon) -->
    <g filter="url(#currentGlow)" transform="translate({currentPos.x}, {currentPos.y})">
      <circle r="8" fill="#E8DCC4" />
    </g>
  </svg>
</div>

<style>
  .arc-container {
    width: 100%;
    padding: 1rem 0;
  }

  .arc-svg {
    width: 100%;
    height: auto;
    max-height: 120px;
  }

  .prayer-dot {
    transition: all 0.3s ease;
  }

  .prayer-dot.active {
    stroke: #E8DCC4;
    stroke-width: 2;
  }
</style>
