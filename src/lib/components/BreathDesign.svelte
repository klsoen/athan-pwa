<script>
  import { onMount } from 'svelte';
  import { tweened } from 'svelte/motion';
  import { cubicInOut } from 'svelte/easing';
  import { fade, scale, fly } from 'svelte/transition';
  import { prayerTimes, currentPrayer, countdown, prayerNames, location, currentTime, citySelectorOpen, settingsOpen } from '$lib/stores/prayer.js';
  import { currentTheme } from '$lib/stores/theme.js';
  import CitySelector from './CitySelector.svelte';
  import Settings from './Settings.svelte';

  // Combined overlay state for blur
  $: overlayOpen = $citySelectorOpen || $settingsOpen;

  // Animated progress angle for arc and dot
  const animatedAngle = tweened(0, {
    duration: 2800,
    easing: cubicInOut
  });

  let mounted = false;
  let breathPhase = 0;

  // Subtle, meditative breathing - like candlelight
  $: breathScale = 1 + Math.sin(breathPhase * Math.PI / 180) * 0.06;
  $: breathOpacity = 0.6 + Math.sin(breathPhase * Math.PI / 180) * 0.3;

  // Clock order (Maghrib at top)
  const prayers = ['maghrib', 'isha', 'fajr', 'sunrise', 'dhuhr', 'asr'];
  // List order (Fajr first - natural day order)
  const prayerListOrder = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'];

  // Get Maghrib hour for offset (Maghrib = 0 degrees at top)
  $: maghribHour = $prayerTimes.maghrib
    ? $prayerTimes.maghrib.getHours() + $prayerTimes.maghrib.getMinutes() / 60
    : 18;

  // Convert time to angle on 24-hour clock (Maghrib at top, clockwise)
  function timeToAngle(date, maghribOffset) {
    if (!date) return 0;
    const hours = date.getHours() + date.getMinutes() / 60;
    // Offset so Maghrib is at top (0 degrees)
    const adjusted = ((hours - maghribOffset + 24) % 24);
    return (adjusted / 24) * 360;
  }

  // Get prayer angles based on actual times (relative to Maghrib)
  $: prayerAngles = {
    maghrib: 0, // Always at top
    isha: timeToAngle($prayerTimes.isha, maghribHour),
    fajr: timeToAngle($prayerTimes.fajr, maghribHour),
    sunrise: timeToAngle($prayerTimes.sunrise, maghribHour),
    dhuhr: timeToAngle($prayerTimes.dhuhr, maghribHour),
    asr: timeToAngle($prayerTimes.asr, maghribHour)
  };

  // Calculate last third of the night (between Isha and Fajr area)
  $: lastThirdOfNight = (() => {
    const maghrib = $prayerTimes.maghrib;
    const fajr = $prayerTimes.fajr;
    if (!maghrib || !fajr) return { start: 0, end: 0, startTime: null };

    // Calculate night duration in milliseconds
    let nightDurationMs = fajr.getTime() - maghrib.getTime();
    if (nightDurationMs < 0) nightDurationMs += 24 * 60 * 60 * 1000; // Handle overnight

    // Last third starts 2/3 into the night
    const lastThirdStartMs = maghrib.getTime() + (nightDurationMs * 2 / 3);
    const startTimeDate = new Date(lastThirdStartMs);

    // Calculate angles relative to Maghrib
    const nightStartHour = maghrib.getHours() + maghrib.getMinutes() / 60;
    let nightEndHour = fajr.getHours() + fajr.getMinutes() / 60;
    if (nightEndHour < nightStartHour) nightEndHour += 24;

    const nightDuration = nightEndHour - nightStartHour;
    const startAngle = ((nightDuration * 2 / 3) / 24) * 360;
    const endAngle = (nightDuration / 24) * 360;

    return { start: startAngle, end: endAngle, startTime: startTimeDate };
  })();

  function getPosition(angle, radius) {
    const rad = (angle - 90) * Math.PI / 180;
    return {
      x: 50 + radius * Math.cos(rad),
      y: 50 + radius * Math.sin(rad)
    };
  }

  // Calculate moon phase (0 = new moon, 0.5 = full moon, 1 = new moon)
  function getMoonPhase(date) {
    // Known new moon: January 6, 2000 at 18:14 UTC
    const knownNewMoon = new Date(Date.UTC(2000, 0, 6, 18, 14, 0));
    const lunarCycle = 29.53058867; // days

    const daysSinceKnown = (date.getTime() - knownNewMoon.getTime()) / (1000 * 60 * 60 * 24);
    const phase = (daysSinceKnown % lunarCycle) / lunarCycle;

    return phase < 0 ? phase + 1 : phase;
  }

  // Get moon illumination and direction for SVG rendering
  // Returns: { illumination: 0-1, waxing: boolean }
  function getMoonData(date) {
    const phase = getMoonPhase(date);

    // Illumination follows cosine curve, not linear
    // Phase 0 = new moon (0% lit)
    // Phase 0.25 = first quarter (50% lit, right side)
    // Phase 0.5 = full moon (100% lit)
    // Phase 0.75 = last quarter (50% lit, left side)
    const illumination = (1 - Math.cos(phase * 2 * Math.PI)) / 2;

    const waxing = phase < 0.5; // Right side lit when waxing

    return { illumination, waxing, phase };
  }

  $: moonData = getMoonData($currentTime);

  // Moon rendering calculations for Maghrib (small moon)
  $: maghribMoon = (() => {
    const r = 7, cx = 62, cy = 14, innerR = 7.2;
    // Use sqrt for more accurate crescent width mapping
    // Thin crescent at low illumination, fuller at high
    const crescentWidth = r * 2 * Math.pow(moonData.illumination, 0.6);
    const offset = crescentWidth / 2;
    return {
      cx, cy, r, innerR,
      innerCx: moonData.waxing ? cx - offset : cx + offset,
      innerCy: cy,
      showInner: moonData.illumination < 0.92
    };
  })();

  // Moon rendering calculations for Isha (large moon)
  $: ishaMoon = (() => {
    const r = 14, cx = 40, cy = 20, innerR = 14.5;
    const crescentWidth = r * 2 * Math.pow(moonData.illumination, 0.6);
    const offset = crescentWidth / 2;
    return {
      cx, cy, r, innerR,
      innerCx: moonData.waxing ? cx - offset : cx + offset,
      innerCy: cy,
      showInner: moonData.illumination < 0.92
    };
  })();

  let breathInterval;
  let showFullClock = false;

  function toggleClock() {
    if (!$citySelectorOpen) {
      showFullClock = !showFullClock;

      // Animate arc when opening clock
      if (showFullClock) {
        animatedAngle.set(0, { duration: 0 });
        setTimeout(() => {
          animatedAngle.set(currentTimeAngle, { duration: 2800 });
        }, 50);
      }
    }
  }

  onMount(() => {
    // Breathing animation - slower, more meditative (4-second cycle)
    breathInterval = setInterval(() => {
      breathPhase = (breathPhase + 1) % 360;
    }, 66);

    return () => {
      clearInterval(breathInterval);
    };
  });



  function formatCountdown(cd) {
    if (cd.hours > 0) return `${cd.hours}h ${cd.minutes}m`;
    if (cd.minutes > 0) return `${cd.minutes}m ${cd.seconds}s`;
    return `${cd.seconds}s`;
  }

  function formatTime(date) {
    if (!date) return '--:--';
    const options = {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    };
    // Use city's timezone if available
    if ($location.timezone) {
      options.timeZone = $location.timezone;
    }
    return date.toLocaleTimeString('en-US', options);
  }

  // Get Hijri date
  const hijriMonths = [
    'Muharram', 'Safar', 'Rabi al-Awwal', 'Rabi al-Thani',
    'Jumada al-Awwal', 'Jumada al-Thani', 'Rajab', 'Shaban',
    'Ramadan', 'Shawwal', 'Dhu al-Qadah', 'Dhu al-Hijjah'
  ];

  function getHijriDate() {
    try {
      const date = $currentTime;

      // Get Hijri date parts
      const day = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', { day: 'numeric' }).format(date);
      const monthNum = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', { month: 'numeric' }).format(date);
      const year = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', { year: 'numeric' }).format(date);

      // Use our own month names (Android fallback)
      const monthName = hijriMonths[parseInt(monthNum) - 1] || monthNum;

      // Extract just the number from year (removes "AH" suffix if present)
      const yearNum = year.replace(/[^\d]/g, '');

      return `${day} ${monthName} ${yearNum} AH`;
    } catch {
      return '';
    }
  }

  $: hijriDate = getHijriDate();

  // Get Gregorian date
  function getGregorianDate() {
    const date = $currentTime;
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    });
  }

  $: gregorianDate = getGregorianDate();

  // Calculate current position on 24-hour clock (relative to Maghrib)
  $: currentTimeAngle = (() => {
    const now = $currentTime;
    const hours = now.getHours() + now.getMinutes() / 60 + now.getSeconds() / 3600;
    const adjusted = ((hours - maghribHour + 24) % 24);
    return (adjusted / 24) * 360;
  })();

  $: indicatorPos = getPosition(currentTimeAngle, 38);

  // Calculate arc path for progress/last third
  // Draws clockwise from startAngle to endAngle
  function getArcPath(startAngle, endAngle, radius) {
    const start = getPosition(startAngle, radius);
    const end = getPosition(endAngle, radius);

    // Calculate arc span going clockwise
    let arcLength = endAngle - startAngle;
    if (arcLength < 0) arcLength += 360;

    // To draw clockwise visually: draw from END to START with sweep=0
    const largeArc = arcLength > 180 ? 1 : 0;

    return `M ${end.x} ${end.y} A ${radius} ${radius} 0 ${largeArc} 0 ${start.x} ${start.y}`;
  }

  $: lastThirdArcPath = getArcPath(lastThirdOfNight.start, lastThirdOfNight.end, 36);
  $: lastThirdPos = getPosition(lastThirdOfNight.start, 38);
  $: lastThirdLabelPos = getPosition(lastThirdOfNight.start, 58);

  // Check if we're currently in the last third of the night
  $: isInLastThird = (() => {
    if (!lastThirdOfNight.startTime || !$prayerTimes.fajr) return false;
    const now = $currentTime;
    const start = lastThirdOfNight.startTime;
    const end = $prayerTimes.fajr;
    return now >= start && now < end;
  })();

  // Day progress arc (from Maghrib to current time)
  $: dayProgressPath = currentTimeAngle > 1 ? getArcPath(0, currentTimeAngle, 38) : '';
</script>

<div class="app-container" on:click={toggleClock} role="button" tabindex="0" on:keydown={(e) => e.key === 'Enter' && toggleClock()}>

  <div class="home-view">
    <!-- Breathing glow effect -->
    <div
      class="breath-glow outer"
      style="transform: translate(-50%, -50%) scale({breathScale}); opacity: {breathOpacity * 0.5};"
    ></div>
    <div
      class="breath-glow inner"
      style="transform: translate(-50%, -50%) scale({breathScale * 1.1}); opacity: {breathOpacity * 0.7};"
    ></div>

    <div class="home-header">
      <CitySelector />
      <Settings />
    </div>

    {#if showFullClock}
      <!-- FULL CLOCK VIEW -->
      <div class="full-clock" class:blurred={overlayOpen} in:scale={{ duration: 300, start: 0.92, opacity: 0 }} out:fade={{ duration: 150 }}>
        <svg viewBox="0 0 100 100" class="clock-svg">
          <defs>
            <!-- Soft atmospheric glow -->
            <filter id="softGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="2" result="blur"/>
              <feMerge>
                <feMergeNode in="blur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
            <!-- Stronger glow for active elements -->
            <filter id="activeGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="3" result="blur"/>
              <feMerge>
                <feMergeNode in="blur"/>
                <feMergeNode in="blur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
            <!-- Gradient for progress arc -->
            <linearGradient id="arcGradient" gradientUnits="userSpaceOnUse" x1="50" y1="10" x2="50" y2="90">
              <stop offset="0%" stop-color={$currentTheme.accentBright}/>
              <stop offset="100%" stop-color={$currentTheme.accent}/>
            </linearGradient>
          </defs>

          <!-- Outermost decorative ring -->
          <circle
            cx="50" cy="50" r="44"
            fill="none"
            stroke="rgba({$currentTheme.accentRgb},0.08)"
            stroke-width="0.3"
          />

          <!-- Hour tick marks (24) -->
          {#each Array(24) as _, i}
            {@const tickAngle = (i / 24) * 360}
            {@const isMajor = i % 6 === 0}
            {@const innerR = isMajor ? 40 : 41.5}
            {@const outerR = 43}
            {@const startPos = getPosition(tickAngle, innerR)}
            {@const endPos = getPosition(tickAngle, outerR)}
            <line
              x1={startPos.x} y1={startPos.y}
              x2={endPos.x} y2={endPos.y}
              stroke={isMajor ? `rgba(${$currentTheme.accentRgb},0.3)` : 'rgba(255,255,255,0.08)'}
              stroke-width={isMajor ? 0.6 : 0.3}
            />
          {/each}

          <!-- Main track ring -->
          <circle
            cx="50" cy="50" r="38"
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            stroke-width="2"
          />

          <!-- Inner decorative ring -->
          <circle
            cx="50" cy="50" r="28"
            fill="none"
            stroke="rgba({$currentTheme.accentRgb},0.06)"
            stroke-width="0.3"
          />

          <!-- Last third arc -->
          <path
            d={getArcPath(lastThirdOfNight.start, lastThirdOfNight.end, 33)}
            fill="none"
            stroke="rgba({$currentTheme.accentRgb},0.4)"
            stroke-width="1"
            stroke-linecap="round"
          />

          <!-- Day progress arc -->
          {#if $animatedAngle > 1}
            <path
              d={getArcPath(0, $animatedAngle, 38)}
              fill="none"
              stroke="url(#arcGradient)"
              stroke-width="2"
              stroke-linecap="round"
              filter="url(#softGlow)"
            />
          {/if}

          <!-- Prayer markers -->
          {#each prayers as prayer}
            {@const pos = getPosition(prayerAngles[prayer], 38)}
            {@const isActive = $currentPrayer.current === prayer}
            {#if prayer === 'sunrise'}
              <!-- Sunrise: diamond -->
              {#if isActive}
                <g filter="url(#activeGlow)">
                  <rect
                    x={pos.x - 3}
                    y={pos.y - 3}
                    width="6"
                    height="6"
                    fill={$currentTheme.accentBright}
                    transform="rotate(45 {pos.x} {pos.y})"
                  />
                </g>
              {:else}
                <rect
                  x={pos.x - 1.5}
                  y={pos.y - 1.5}
                  width="3"
                  height="3"
                  fill={$currentTheme.accentDim}
                  transform="rotate(45 {pos.x} {pos.y})"
                />
              {/if}
            {:else}
              <!-- Other prayers: circles -->
              {#if isActive}
                <g filter="url(#activeGlow)">
                  <circle cx={pos.x} cy={pos.y} r="3.5" fill={$currentTheme.accentBright}/>
                </g>
              {:else}
                <circle cx={pos.x} cy={pos.y} r="2" fill={$currentTheme.accentDim}/>
              {/if}
            {/if}
          {/each}

          <!-- Last third diamond marker -->
          {#if isInLastThird}
            <g filter="url(#activeGlow)">
              <rect
                x={lastThirdPos.x - 2.5}
                y={lastThirdPos.y - 2.5}
                width="5"
                height="5"
                fill={$currentTheme.accentBright}
                transform="rotate(45 {lastThirdPos.x} {lastThirdPos.y})"
              />
            </g>
          {:else}
            <rect
              x={lastThirdPos.x - 1.5}
              y={lastThirdPos.y - 1.5}
              width="3"
              height="3"
              fill={$currentTheme.accentDim}
              transform="rotate(45 {lastThirdPos.x} {lastThirdPos.y})"
            />
          {/if}

          <!-- Current time indicator -->
          <g style="transform-origin: 50px 50px; transform: rotate({$animatedAngle}deg)">
            <circle cx="50" cy="12" r="3" fill="rgba(255,255,255,0.2)" filter="url(#softGlow)"/>
            <circle cx="50" cy="12" r="2" fill="white"/>
            <circle cx="50" cy="11.5" r="0.8" fill="rgba(255,255,255,0.8)"/>
          </g>

          <!-- Center circle accent -->
          <circle
            cx="50" cy="50" r="18"
            fill="none"
            stroke="rgba({$currentTheme.accentRgb},0.04)"
            stroke-width="0.5"
          />
        </svg>

        <!-- Prayer labels around clock -->
        {#each prayers as prayer}
          {@const angle = prayerAngles[prayer]}
          {@const labelPos = getPosition(angle, 58)}
          {@const isActive = $currentPrayer.current === prayer}
          <div
            class="clock-label"
            class:active={isActive}
            style="left: {labelPos.x}%; top: {labelPos.y}%;"
          >
            <span class="clock-label-name">{prayerNames[prayer]?.en}</span>
            <span class="clock-label-time">{formatTime($prayerTimes[prayer])}</span>
          </div>
        {/each}

        <!-- Last Third label -->
        <div
          class="clock-label last-third"
          class:active={isInLastThird}
          style="left: {lastThirdLabelPos.x}%; top: {lastThirdLabelPos.y}%;"
        >
          <span class="clock-label-name">Last&nbsp;Third</span>
          <span class="clock-label-time">{formatTime(lastThirdOfNight.startTime)}</span>
        </div>
      </div>

      <!-- Center info in clock mode -->
      <div class="clock-center" class:blurred={overlayOpen}>
        <div class="clock-center-arabic">{prayerNames[$currentPrayer.current]?.ar || 'العشاء'}</div>
        <div class="clock-center-english">{prayerNames[$currentPrayer.current]?.en || 'Isha'}</div>
        <div class="clock-center-countdown">{formatCountdown($countdown)}</div>
        <div class="clock-center-next">until {prayerNames[$currentPrayer.next]?.en}</div>
      </div>

    {:else}
      <!-- SIMPLE VIEW (default) - no clock, just prayer info -->
      <div class="prayer-display" class:blurred={overlayOpen} in:scale={{ duration: 400, delay: 80, start: 0.95, opacity: 0 }} out:fade={{ duration: 120 }}>
        <div class="current-prayer" in:fly={{ y: 15, duration: 450, delay: 120 }}>
          {#key showFullClock}
            <!-- Prayer-specific animated icon (using $currentPrayer.current for testing) -->
            {#key $currentPrayer.current}
            <div class="prayer-icon">
              {#if $currentPrayer.current === 'fajr'}
                <!-- Fajr: Glow emanating from below horizon, stars fading -->
                <svg viewBox="0 0 80 50" class="prayer-svg fajr" style="overflow:visible">
                  <defs>
                    <radialGradient id="fajrGlow" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stop-color={$currentTheme.accentBright} stop-opacity="0.6"/>
                      <stop offset="40%" stop-color={$currentTheme.accent} stop-opacity="0.25"/>
                      <stop offset="100%" stop-color={$currentTheme.accent} stop-opacity="0"/>
                    </radialGradient>
                    <!-- Clip to only show above horizon -->
                    <clipPath id="aboveHorizonFajr">
                      <rect x="-20" y="-20" width="120" height="62"/>
                    </clipPath>
                  </defs>
                  <!-- Radial glow centered below horizon, clipped to show only above -->
                  <circle class="fajr-glow" cx="40" cy="48" r="32" fill="url(#fajrGlow)" clip-path="url(#aboveHorizonFajr)"/>
                  <!-- Horizon line -->
                  <line class="horizon" x1="0" y1="42" x2="80" y2="42"/>
                  <!-- Fading stars -->
                  <circle class="fajr-star star-1" cx="12" cy="8" r="1.2"/>
                  <circle class="fajr-star star-2" cx="68" cy="12" r="1"/>
                  <circle class="fajr-star star-3" cx="28" cy="6" r="0.8"/>
                  <circle class="fajr-star star-4" cx="52" cy="10" r="1.1"/>
                  <circle class="fajr-star star-5" cx="8" cy="22" r="0.9"/>
                  <circle class="fajr-star star-6" cx="72" cy="20" r="0.7"/>
                  <!-- Rising light particles -->
                  <circle class="fajr-particle p-1" cx="35" cy="36" r="0.8"/>
                  <circle class="fajr-particle p-2" cx="45" cy="34" r="0.6"/>
                  <circle class="fajr-particle p-3" cx="40" cy="38" r="0.7"/>
                  <circle class="fajr-particle p-4" cx="28" cy="32" r="0.5"/>
                  <circle class="fajr-particle p-5" cx="52" cy="35" r="0.6"/>
                </svg>
              {:else if $currentPrayer.current === 'sunrise'}
                <!-- Sunrise: Sun rising with glow and particles -->
                <svg viewBox="0 0 80 50" class="prayer-svg sunrise" style="overflow:visible">
                  <defs>
                    <radialGradient id="sunriseGlow" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stop-color={$currentTheme.accentBright} stop-opacity="0.5"/>
                      <stop offset="60%" stop-color={$currentTheme.accent} stop-opacity="0.15"/>
                      <stop offset="100%" stop-color={$currentTheme.accent} stop-opacity="0"/>
                    </radialGradient>
                    <radialGradient id="groundGlowSunrise" cx="50%" cy="0%" r="100%">
                      <stop offset="0%" stop-color={$currentTheme.accent} stop-opacity="0.25"/>
                      <stop offset="100%" stop-color={$currentTheme.accent} stop-opacity="0"/>
                    </radialGradient>
                    <filter id="groundBlurSunrise" x="-100%" y="-100%" width="300%" height="300%">
                      <feGaussianBlur in="SourceGraphic" stdDeviation="4"/>
                    </filter>
                  </defs>
                  <!-- Ground ellipse with atmospheric blur -->
                  <ellipse class="ground" cx="40" cy="48" rx="55" ry="12" fill="url(#groundGlowSunrise)" filter="url(#groundBlurSunrise)"/>
                  <!-- Sun glow -->
                  <circle class="sunrise-glow" cx="40" cy="32" r="22" fill="url(#sunriseGlow)"/>
                  <!-- Sun disc -->
                  <circle class="sun-disc" cx="40" cy="32" r="9"/>
                  <!-- Floating particles around sun -->
                  <circle class="sun-particle sp-1" cx="28" cy="24" r="1"/>
                  <circle class="sun-particle sp-2" cx="52" cy="26" r="0.8"/>
                  <circle class="sun-particle sp-3" cx="34" cy="18" r="0.7"/>
                  <circle class="sun-particle sp-4" cx="48" cy="20" r="0.9"/>
                  <circle class="sun-particle sp-5" cx="26" cy="34" r="0.6"/>
                  <circle class="sun-particle sp-6" cx="56" cy="36" r="0.8"/>
                </svg>
              {:else if $currentPrayer.current === 'dhuhr'}
                <!-- Dhuhr: Sun at zenith with glow and particles -->
                <svg viewBox="0 0 80 55" class="prayer-svg dhuhr" style="overflow:visible">
                  <defs>
                    <radialGradient id="groundGlowDhuhr" cx="50%" cy="0%" r="100%">
                      <stop offset="0%" stop-color={$currentTheme.accent} stop-opacity="0.22"/>
                      <stop offset="100%" stop-color={$currentTheme.accent} stop-opacity="0"/>
                    </radialGradient>
                    <radialGradient id="dhuhrSunGlow" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stop-color={$currentTheme.accentBright} stop-opacity="0.55"/>
                      <stop offset="50%" stop-color={$currentTheme.accent} stop-opacity="0.2"/>
                      <stop offset="100%" stop-color={$currentTheme.accent} stop-opacity="0"/>
                    </radialGradient>
                    <filter id="groundBlurDhuhr" x="-100%" y="-100%" width="300%" height="300%">
                      <feGaussianBlur in="SourceGraphic" stdDeviation="4"/>
                    </filter>
                  </defs>
                  <!-- Ground ellipse with atmospheric blur -->
                  <ellipse class="ground" cx="40" cy="52" rx="55" ry="12" fill="url(#groundGlowDhuhr)" filter="url(#groundBlurDhuhr)"/>
                  <!-- Sun glow (larger for zenith) -->
                  <circle class="zenith-glow" cx="40" cy="14" r="20" fill="url(#dhuhrSunGlow)"/>
                  <!-- Sun -->
                  <circle class="zenith-sun" cx="40" cy="14" r="8"/>
                  <!-- Floating particles -->
                  <circle class="sun-particle sp-1" cx="26" cy="8" r="1"/>
                  <circle class="sun-particle sp-2" cx="54" cy="10" r="0.9"/>
                  <circle class="sun-particle sp-3" cx="32" cy="4" r="0.7"/>
                  <circle class="sun-particle sp-4" cx="50" cy="6" r="0.8"/>
                  <circle class="sun-particle sp-5" cx="22" cy="18" r="0.6"/>
                  <circle class="sun-particle sp-6" cx="58" cy="20" r="0.7"/>
                  <circle class="sun-particle sp-7" cx="40" cy="2" r="0.8"/>
                </svg>
              {:else if $currentPrayer.current === 'asr'}
                <!-- Asr: Afternoon sun with ground below and floating dust -->
                <svg viewBox="0 0 80 55" class="prayer-svg asr" style="overflow:visible">
                  <defs>
                    <radialGradient id="groundGlowAsr" cx="50%" cy="0%" r="100%">
                      <stop offset="0%" stop-color={$currentTheme.accent} stop-opacity="0.15"/>
                      <stop offset="100%" stop-color={$currentTheme.accent} stop-opacity="0"/>
                    </radialGradient>
                    <radialGradient id="asrSunGlow" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stop-color={$currentTheme.accentBright} stop-opacity="0.35"/>
                      <stop offset="100%" stop-color={$currentTheme.accent} stop-opacity="0"/>
                    </radialGradient>
                    <filter id="groundBlurAsr" x="-100%" y="-100%" width="300%" height="300%">
                      <feGaussianBlur in="SourceGraphic" stdDeviation="4"/>
                    </filter>
                  </defs>
                  <!-- Ground ellipse with atmospheric blur -->
                  <ellipse class="ground" cx="40" cy="52" rx="55" ry="12" fill="url(#groundGlowAsr)" filter="url(#groundBlurAsr)"/>
                  <!-- Sun glow -->
                  <circle class="asr-glow" cx="60" cy="16" r="18" fill="url(#asrSunGlow)"/>
                  <!-- Afternoon sun (lower in sky, to the side) -->
                  <circle class="asr-sun" cx="60" cy="16" r="7"/>
                  <!-- Sun particles -->
                  <circle class="sun-particle sp-1" cx="48" cy="10" r="0.8"/>
                  <circle class="sun-particle sp-2" cx="72" cy="12" r="0.7"/>
                  <circle class="sun-particle sp-3" cx="54" cy="6" r="0.6"/>
                  <circle class="sun-particle sp-4" cx="68" cy="8" r="0.7"/>
                  <circle class="sun-particle sp-5" cx="50" cy="20" r="0.5"/>
                  <!-- Floating dust particles -->
                  <circle class="asr-dust d-1" cx="18" cy="20" r="0.8"/>
                  <circle class="asr-dust d-2" cx="32" cy="14" r="0.6"/>
                  <circle class="asr-dust d-3" cx="25" cy="32" r="0.7"/>
                  <circle class="asr-dust d-4" cx="40" cy="26" r="0.5"/>
                  <circle class="asr-dust d-5" cx="14" cy="40" r="0.6"/>
                  <circle class="asr-dust d-6" cx="35" cy="42" r="0.8"/>
                  <circle class="asr-dust d-7" cx="48" cy="36" r="0.5"/>
                  <circle class="asr-dust d-8" cx="22" cy="46" r="0.7"/>
                </svg>
              {:else if $currentPrayer.current === 'maghrib'}
                <!-- Maghrib: Sun setting below horizon, glow fading with it -->
                <svg viewBox="0 0 80 50" class="prayer-svg maghrib" style="overflow:visible">
                  <defs>
                    <radialGradient id="maghribGlowGrad" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stop-color={$currentTheme.accentBright} stop-opacity="0.7"/>
                      <stop offset="30%" stop-color={$currentTheme.accent} stop-opacity="0.3"/>
                      <stop offset="100%" stop-color={$currentTheme.accent} stop-opacity="0"/>
                    </radialGradient>
                    <!-- Clip to only show above horizon -->
                    <clipPath id="aboveHorizonMaghrib">
                      <rect x="-20" y="-20" width="120" height="62"/>
                    </clipPath>
                  </defs>
                  <!-- Radial glow + sun, both clipped at horizon -->
                  <g clip-path="url(#aboveHorizonMaghrib)">
                    <circle class="maghrib-glow" cx="40" cy="46" r="32" fill="url(#maghribGlowGrad)"/>
                    <circle class="setting-sun" cx="40" cy="46" r="8"/>
                  </g>
                  <!-- Horizon line -->
                  <line class="horizon" x1="0" y1="42" x2="80" y2="42"/>
                  <!-- Moon with actual phase -->
                  <circle class="crescent-outer" cx={maghribMoon.cx} cy={maghribMoon.cy} r={maghribMoon.r}/>
                  {#if maghribMoon.showInner}
                    <circle class="crescent-inner" cx={maghribMoon.innerCx} cy={maghribMoon.innerCy} r={maghribMoon.innerR}/>
                  {/if}
                  <!-- Stars appearing -->
                  <circle class="mag-star star-1" cx="16" cy="10" r="1.2"/>
                  <circle class="mag-star star-2" cx="8" cy="24" r="1"/>
                  <circle class="mag-star star-3" cx="26" cy="16" r="0.8"/>
                  <circle class="mag-star star-4" cx="48" cy="8" r="0.9"/>
                </svg>
              {:else}
                <!-- Isha: Night sky with moon and stars -->
                <svg viewBox="0 0 80 50" class="prayer-svg isha">
                  <!-- Moon with actual phase -->
                  <circle class="isha-crescent-outer" cx={ishaMoon.cx} cy={ishaMoon.cy} r={ishaMoon.r}/>
                  {#if ishaMoon.showInner}
                    <circle class="isha-crescent-inner" cx={ishaMoon.innerCx} cy={ishaMoon.innerCy} r={ishaMoon.innerR}/>
                  {/if}
                  <circle class="isha-star star-1" cx="16" cy="12" r="1.5"/>
                  <circle class="isha-star star-2" cx="68" cy="18" r="1.2"/>
                  <circle class="isha-star star-3" cx="24" cy="38" r="1"/>
                  <circle class="isha-star star-4" cx="58" cy="40" r="1.3"/>
                  <circle class="isha-star star-5" cx="12" cy="30" r="0.8"/>
                </svg>
              {/if}
            </div>
            {/key}
            <div class="current-arabic engrave-in">{prayerNames[$currentPrayer.current]?.ar || 'العشاء'}</div>
          {/key}
          <div class="current-name">{prayerNames[$currentPrayer.current]?.en || 'Isha'}</div>
          <div class="tap-hint" class:blurred={overlayOpen}>tap for full clock</div>
          <div class="current-time">{formatTime($prayerTimes[$currentPrayer.current])}</div>
        </div>

        <div class="prayer-divider" in:fade={{ duration: 350, delay: 200 }}>
          <span class="divider-line"></span>
          <span class="divider-countdown">{formatCountdown($countdown)}</span>
          <span class="divider-line"></span>
        </div>

        <div class="next-prayer" in:fly={{ y: 12, duration: 400, delay: 250 }}>
          <span class="next-label">Next</span>
          <span class="next-name">{prayerNames[$currentPrayer.next]?.en}</span>
          <span class="next-time">{formatTime($prayerTimes[$currentPrayer.next])}</span>
        </div>

        <!-- All prayer times -->
        <div class="all-times" in:fly={{ y: 20, duration: 500, delay: 320 }}>
          {#each prayerListOrder as prayer}
            {@const isActive = $currentPrayer.current === prayer}
            <div class="time-row" class:active={isActive}>
              <span class="time-name">{prayerNames[prayer]?.en}</span>
              <span class="time-dots"></span>
              <span class="time-value">{formatTime($prayerTimes[prayer])}</span>
            </div>
          {/each}
        </div>
      </div>
    {/if}

    <!-- Dates at bottom (both views) -->
    <div class="dates-row" class:blurred={overlayOpen}>
      <span class="date-hijri">{hijriDate}</span>
      <span class="date-separator">·</span>
      <span class="date-gregorian">{gregorianDate}</span>
    </div>


  </div>

</div>

<style>
  .app-container {
    position: fixed;
    inset: 0;
    background: var(--theme-bg);
    overflow: hidden;
    user-select: none;
    -webkit-user-select: none;
  }

  .app-container::before {
    content: '';
    position: absolute;
    inset: 0;
    background: var(--theme-bg-gradient);
    pointer-events: none;
  }

  .home-view {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 0 1.5rem;
  }

  .home-header {
    position: absolute;
    top: 2rem;
    left: 1.5rem;
    right: 1.5rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    z-index: 10;
  }

  /* Breathing glow - centered on prayer display */
  .breath-glow {
    position: absolute;
    top: 50%;
    left: 50%;
    border-radius: 50%;
    pointer-events: none;
    z-index: 0;
  }

  .breath-glow.outer {
    width: min(450px, 120vw);
    height: min(450px, 120vw);
    background: radial-gradient(circle, rgba(var(--theme-accent-rgb), 0.1) 0%, rgba(var(--theme-accent-rgb), 0.03) 50%, transparent 70%);
  }

  .breath-glow.inner {
    width: min(280px, 75vw);
    height: min(280px, 75vw);
    background: radial-gradient(circle, rgba(var(--theme-accent-rgb), 0.15) 0%, rgba(var(--theme-accent-rgb), 0.05) 45%, transparent 65%);
  }

  /* Main prayer display */
  .prayer-display {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    text-align: center;
    width: 100%;
    max-width: 320px;
    transition: filter 0.3s ease-out;
    z-index: 1;
  }

  /* Current prayer - hero section */
  .current-prayer {
    margin-bottom: 1.5rem;
  }

  .current-arabic {
    font-family: 'Amiri', serif;
    font-size: 4.5rem;
    color: var(--theme-accent-bright);
    line-height: 1.1;
    text-shadow: 0 0 80px rgba(var(--theme-accent-rgb), 0.3);
  }

  /* Gentle reveal with golden glow pulse */
  .current-arabic.engrave-in {
    animation: goldReveal 0.9s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    animation-delay: 0.1s;
    opacity: 0;
  }

  @keyframes goldReveal {
    0% {
      opacity: 0;
      transform: scale(0.94);
      text-shadow: 0 0 0 rgba(var(--theme-accent-rgb), 0);
    }
    50% {
      opacity: 1;
      text-shadow: 0 0 40px rgba(var(--theme-accent-bright-rgb), 0.6);
    }
    100% {
      opacity: 1;
      transform: scale(1);
      text-shadow: 0 0 80px rgba(var(--theme-accent-rgb), 0.3);
    }
  }

  /* ===== PRAYER-SPECIFIC ICONS ===== */
  .prayer-icon {
    margin-bottom: 0.5rem;
    height: 80px;
    display: flex;
    justify-content: center;
    align-items: flex-end;
    opacity: 0;
    filter: blur(8px);
    transform: scale(0.92);
    animation: iconReveal 2s cubic-bezier(0.16, 1, 0.3, 1) 0.15s forwards;
  }

  @keyframes iconReveal {
    0% {
      opacity: 0;
      filter: blur(8px);
      transform: scale(0.92);
    }
    40% {
      opacity: 0.9;
      filter: blur(0);
      transform: scale(1.02);
    }
    100% {
      opacity: 1;
      filter: blur(0);
      transform: scale(1);
    }
  }

  .prayer-svg {
    height: 70px;
    width: auto;
    overflow: visible;
  }

  /* Shared styles */
  .prayer-svg .horizon {
    stroke: rgba(var(--theme-accent-rgb), 0.3);
    stroke-width: 0.5;
  }

  /* === FAJR: Dawn - stars fading, light rising === */
  .prayer-svg.fajr .fajr-glow {
    animation: fajrGlow 4s ease-in-out infinite;
  }

  .prayer-svg.fajr .fajr-star {
    fill: var(--theme-accent-bright);
    animation: starFadeOut 4s ease-in-out infinite;
  }

  .prayer-svg.fajr .star-1 { animation-delay: 0s; }
  .prayer-svg.fajr .star-2 { animation-delay: 0.6s; }
  .prayer-svg.fajr .star-3 { animation-delay: 1.2s; }
  .prayer-svg.fajr .star-4 { animation-delay: 0.3s; }
  .prayer-svg.fajr .star-5 { animation-delay: 0.9s; }
  .prayer-svg.fajr .star-6 { animation-delay: 1.5s; }

  .prayer-svg.fajr .fajr-particle {
    fill: rgba(var(--theme-accent-bright-rgb), 0.8);
    animation: particleRise 3s ease-out infinite;
  }

  .prayer-svg.fajr .p-1 { animation-delay: 0s; }
  .prayer-svg.fajr .p-2 { animation-delay: 0.5s; }
  .prayer-svg.fajr .p-3 { animation-delay: 1s; }
  .prayer-svg.fajr .p-4 { animation-delay: 1.5s; }
  .prayer-svg.fajr .p-5 { animation-delay: 2s; }

  @keyframes fajrGlow {
    0%, 100% { opacity: 0.7; }
    50% { opacity: 1; }
  }

  @keyframes starFadeOut {
    0%, 100% { opacity: 0.7; transform: scale(1); }
    50% { opacity: 0.2; transform: scale(0.6); }
  }

  @keyframes particleRise {
    0% { opacity: 0; transform: translateY(0); }
    20% { opacity: 0.9; }
    100% { opacity: 0; transform: translateY(-20px); }
  }

  /* === SUNRISE: Sun rising with particles === */
  .prayer-svg.sunrise .sun-disc {
    fill: var(--theme-accent-bright);
  }

  .prayer-svg.sunrise .sunrise-glow {
    animation: glowPulse 3s ease-in-out infinite;
  }

  .prayer-svg.sunrise .sun-particle {
    fill: var(--theme-accent-bright);
    animation: sunParticleFloat 4s ease-in-out infinite;
  }

  .prayer-svg.sunrise .sp-1 { animation-delay: 0s; }
  .prayer-svg.sunrise .sp-2 { animation-delay: 0.6s; }
  .prayer-svg.sunrise .sp-3 { animation-delay: 1.2s; }
  .prayer-svg.sunrise .sp-4 { animation-delay: 0.3s; }
  .prayer-svg.sunrise .sp-5 { animation-delay: 0.9s; }
  .prayer-svg.sunrise .sp-6 { animation-delay: 1.5s; }

  @keyframes glowPulse {
    0%, 100% { opacity: 0.8; transform: scale(1); }
    50% { opacity: 1; transform: scale(1.08); }
  }

  @keyframes sunParticleFloat {
    0%, 100% { opacity: 0.5; transform: translate(0, 0); }
    25% { opacity: 1; transform: translate(2px, -3px); }
    50% { opacity: 0.7; transform: translate(-1px, -1px); }
    75% { opacity: 0.9; transform: translate(1px, -2px); }
  }

  /* === DHUHR: Sun at zenith with particles === */
  .prayer-svg.dhuhr .zenith-sun {
    fill: var(--theme-accent-bright);
  }

  .prayer-svg.dhuhr .zenith-glow {
    animation: zenithPulse 3s ease-in-out infinite;
  }

  .prayer-svg.dhuhr .sun-particle {
    fill: var(--theme-accent-bright);
    animation: sunParticleFloat 4s ease-in-out infinite;
  }

  .prayer-svg.dhuhr .sp-1 { animation-delay: 0s; }
  .prayer-svg.dhuhr .sp-2 { animation-delay: 0.5s; }
  .prayer-svg.dhuhr .sp-3 { animation-delay: 1s; }
  .prayer-svg.dhuhr .sp-4 { animation-delay: 0.3s; }
  .prayer-svg.dhuhr .sp-5 { animation-delay: 0.8s; }
  .prayer-svg.dhuhr .sp-6 { animation-delay: 1.3s; }
  .prayer-svg.dhuhr .sp-7 { animation-delay: 0.6s; }

  @keyframes zenithPulse {
    0%, 100% { opacity: 0.85; transform: scale(1); }
    50% { opacity: 1; transform: scale(1.1); }
  }

  /* === ASR: Warm afternoon with floating dust === */
  .prayer-svg.asr .asr-sun {
    fill: var(--theme-accent-bright);
  }

  .prayer-svg.asr .asr-glow {
    animation: asrGlowPulse 4s ease-in-out infinite;
  }

  @keyframes asrGlowPulse {
    0%, 100% { opacity: 0.8; }
    50% { opacity: 1; }
  }

  .prayer-svg.asr .sun-particle {
    fill: var(--theme-accent-bright);
    animation: sunParticleFloat 4s ease-in-out infinite;
  }

  .prayer-svg.asr .sp-1 { animation-delay: 0.2s; }
  .prayer-svg.asr .sp-2 { animation-delay: 0.8s; }
  .prayer-svg.asr .sp-3 { animation-delay: 0.5s; }
  .prayer-svg.asr .sp-4 { animation-delay: 1.1s; }
  .prayer-svg.asr .sp-5 { animation-delay: 0.4s; }

  .prayer-svg.asr .asr-dust {
    fill: rgba(var(--theme-accent-bright-rgb), 0.7);
    animation: dustFloat 5s ease-in-out infinite;
  }

  .prayer-svg.asr .d-1 { animation-delay: 0s; animation-duration: 4s; }
  .prayer-svg.asr .d-2 { animation-delay: 0.7s; animation-duration: 5s; }
  .prayer-svg.asr .d-3 { animation-delay: 1.4s; animation-duration: 4.5s; }
  .prayer-svg.asr .d-4 { animation-delay: 2.1s; animation-duration: 5.5s; }
  .prayer-svg.asr .d-5 { animation-delay: 0.3s; animation-duration: 4.2s; }
  .prayer-svg.asr .d-6 { animation-delay: 1s; animation-duration: 5.2s; }
  .prayer-svg.asr .d-7 { animation-delay: 1.8s; animation-duration: 4.8s; }
  .prayer-svg.asr .d-8 { animation-delay: 2.5s; animation-duration: 5s; }

  
  @keyframes dustFloat {
    0%, 100% {
      opacity: 0.3;
      transform: translate(0, 0);
    }
    25% {
      opacity: 0.8;
      transform: translate(3px, -4px);
    }
    50% {
      opacity: 0.5;
      transform: translate(-2px, -2px);
    }
    75% {
      opacity: 0.9;
      transform: translate(2px, -5px);
    }
  }

  /* === MAGHRIB: Sun sinking below horizon === */
  .prayer-svg.maghrib .maghrib-glow {
    animation: sunSet 4s ease-in forwards;
  }

  .prayer-svg.maghrib .setting-sun {
    fill: var(--theme-accent-bright);
    animation: sunSet 4s ease-in forwards;
  }

  .prayer-svg.maghrib .crescent-outer {
    fill: var(--theme-accent-bright);
    opacity: 0;
    animation: crescentAppear 1.5s ease-out 0.5s forwards;
  }

  .prayer-svg.maghrib .crescent-inner {
    fill: var(--theme-bg);
  }

  .prayer-svg.maghrib .mag-star {
    fill: var(--theme-accent-bright);
    animation: starTwinkle 3s ease-in-out infinite;
  }

  .prayer-svg.maghrib .star-1 { animation-delay: 0.8s; }
  .prayer-svg.maghrib .star-2 { animation-delay: 1.2s; }
  .prayer-svg.maghrib .star-3 { animation-delay: 1.6s; }
  .prayer-svg.maghrib .star-4 { animation-delay: 2s; }

  @keyframes maghribGlowPulse {
    0%, 100% { opacity: 0.8; }
    50% { opacity: 1; }
  }

  @keyframes sunSet {
    0% { transform: translateY(-4px); opacity: 1; }
    100% { transform: translateY(6px); opacity: 0.4; }
  }

  @keyframes crescentAppear {
    0% { opacity: 0; transform: scale(0.8); }
    100% { opacity: 1; transform: scale(1); }
  }

  /* === ISHA: Night sky === */
  .prayer-svg.isha .isha-crescent-outer {
    fill: var(--theme-accent-bright);
  }

  .prayer-svg.isha .isha-crescent-inner {
    fill: var(--theme-bg);
  }

  .prayer-svg.isha .isha-star {
    fill: var(--theme-accent-bright);
    animation: starTwinkle 3s ease-in-out infinite;
  }

  .prayer-svg.isha .star-1 { animation-delay: 0s; }
  .prayer-svg.isha .star-2 { animation-delay: 0.7s; }
  .prayer-svg.isha .star-3 { animation-delay: 1.4s; }
  .prayer-svg.isha .star-4 { animation-delay: 2.1s; }
  .prayer-svg.isha .star-5 { animation-delay: 2.8s; }

  @keyframes starTwinkle {
    0%, 100% { opacity: 0.3; }
    50% { opacity: 1; }
  }

  .current-name {
    font-family: 'Cormorant Garamond', serif;
    font-size: 1.2rem;
    color: rgba(255, 255, 255, 0.5);
    letter-spacing: 0.5em;
    text-transform: uppercase;
    margin-top: 0.5rem;
  }

  .current-time {
    font-family: 'Outfit', sans-serif;
    font-size: 2.5rem;
    font-weight: 300;
    color: rgba(255, 255, 255, 0.85);
    margin-top: 1rem;
    letter-spacing: 0.05em;
  }

  /* Divider with countdown */
  .prayer-divider {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 1rem;
    margin: 1.75rem 0;
  }

  .divider-line {
    flex: 1;
    max-width: 60px;
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(var(--theme-accent-rgb), 0.3), transparent);
  }

  .divider-countdown {
    font-family: 'Outfit', sans-serif;
    font-size: 1.4rem;
    font-weight: 200;
    color: rgba(var(--theme-accent-rgb), 0.8);
    letter-spacing: 0.1em;
  }

  /* Next prayer */
  .next-prayer {
    display: flex;
    align-items: baseline;
    justify-content: center;
    gap: 0.75rem;
  }

  .next-label {
    font-family: 'Outfit', sans-serif;
    font-size: 0.85rem;
    font-weight: 400;
    color: rgba(255, 255, 255, 0.3);
    text-transform: uppercase;
    letter-spacing: 0.15em;
  }

  .next-name {
    font-family: 'Cormorant Garamond', serif;
    font-size: 1.5rem;
    color: rgba(255, 255, 255, 0.6);
  }

  .next-time {
    font-family: 'Outfit', sans-serif;
    font-size: 1.2rem;
    font-weight: 300;
    color: rgba(255, 255, 255, 0.5);
  }

  /* All prayer times list */
  .all-times {
    margin-top: 2.5rem;
    display: flex;
    flex-direction: column;
    gap: clamp(0.6rem, 2vh, 1rem);
    width: 100%;
    max-width: min(320px, 85vw);
    margin-left: auto;
    margin-right: auto;
  }

  .time-row {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .time-name {
    font-family: 'Outfit', sans-serif;
    font-size: clamp(0.85rem, 2.5vw, 1.1rem);
    font-weight: 400;
    color: rgba(255, 255, 255, 0.55);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    width: 80px;
    flex-shrink: 0;
  }

  .time-dots {
    flex: 1;
    height: 1px;
    background: linear-gradient(90deg,
      rgba(255, 255, 255, 0.1) 0%,
      rgba(255, 255, 255, 0.05) 50%,
      rgba(255, 255, 255, 0.1) 100%
    );
    background-size: 4px 1px;
  }

  .time-value {
    font-family: 'Outfit', sans-serif;
    font-size: clamp(0.95rem, 2.8vw, 1.25rem);
    font-weight: 300;
    color: rgba(255, 255, 255, 0.7);
    font-variant-numeric: tabular-nums;
    text-align: right;
    white-space: nowrap;
    flex-shrink: 0;
  }

  .time-row.active .time-name {
    color: rgba(var(--theme-accent-rgb), 0.8);
  }

  .time-row.active .time-dots {
    background: linear-gradient(90deg,
      rgba(var(--theme-accent-rgb), 0.3) 0%,
      rgba(var(--theme-accent-rgb), 0.15) 50%,
      rgba(var(--theme-accent-rgb), 0.3) 100%
    );
  }

  .time-row.active .time-value {
    color: rgba(var(--theme-accent-rgb), 0.9);
    font-weight: 400;
  }

  /* Dates row at bottom */
  .dates-row {
    position: absolute;
    bottom: 2.5rem;
    left: 0;
    right: 0;
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 0.75rem;
    transition: filter 0.3s ease-out;
  }

  .date-hijri {
    font-family: 'Amiri', serif;
    font-size: 0.8rem;
    color: rgba(var(--theme-accent-bright-rgb), 0.5);
  }

  .date-separator {
    color: rgba(255, 255, 255, 0.2);
  }

  .date-gregorian {
    font-family: 'Outfit', sans-serif;
    font-size: 0.75rem;
    font-weight: 300;
    color: rgba(255, 255, 255, 0.35);
  }

  /* ===== FULL CLOCK VIEW ===== */
  .full-clock {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: min(70vw, 48vh);
    aspect-ratio: 1;
    transition: filter 0.3s ease-out;
  }

  .full-clock .clock-svg {
    width: 100%;
    height: 100%;
    overflow: visible;
  }

  /* Clock labels */
  .clock-label {
    position: absolute;
    transform: translate(-50%, -50%);
    text-align: center;
    pointer-events: none;
    white-space: nowrap;
    transition: all 0.3s ease;
  }

  .clock-label-name {
    display: block;
    font-family: 'Cormorant Garamond', serif;
    font-size: clamp(0.5rem, 1.8vw, 0.7rem);
    font-weight: 500;
    color: rgba(255, 255, 255, 0.35);
    text-transform: uppercase;
    letter-spacing: 0.12em;
    margin-bottom: 0.15rem;
  }

  .clock-label-time {
    display: block;
    font-family: 'Outfit', sans-serif;
    font-size: clamp(0.65rem, 2.2vw, 0.9rem);
    font-weight: 300;
    color: rgba(255, 255, 255, 0.55);
    font-variant-numeric: tabular-nums;
  }

  .clock-label.active .clock-label-name {
    color: rgba(var(--theme-accent-bright-rgb), 0.95);
    text-shadow: 0 0 12px rgba(var(--theme-accent-rgb), 0.5);
  }

  .clock-label.active .clock-label-time {
    color: var(--theme-accent-bright);
    font-weight: 400;
    text-shadow: 0 0 10px rgba(var(--theme-accent-rgb), 0.4);
  }

  .clock-label.last-third.active .clock-label-name {
    color: rgba(var(--theme-accent-bright-rgb), 0.95);
    text-shadow: 0 0 12px rgba(var(--theme-accent-rgb), 0.5);
  }

  .clock-label.last-third.active .clock-label-time {
    color: var(--theme-accent-bright);
    font-weight: 400;
    text-shadow: 0 0 10px rgba(var(--theme-accent-rgb), 0.4);
  }

  /* Center content in clock mode */
  .clock-center {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    text-align: center;
    z-index: 2;
    transition: filter 0.3s ease-out;
  }

  .clock-center-arabic {
    font-family: 'Amiri', serif;
    font-size: 2.2rem;
    color: var(--theme-accent-bright);
    line-height: 1.2;
    text-shadow: 0 0 20px rgba(var(--theme-accent-rgb), 0.3);
  }

  .clock-center-english {
    font-family: 'Cormorant Garamond', serif;
    font-size: 0.85rem;
    font-weight: 500;
    color: rgba(255, 255, 255, 0.5);
    text-transform: uppercase;
    letter-spacing: 0.15em;
    margin-top: 0.15rem;
  }

  .clock-center-countdown {
    font-family: 'Outfit', sans-serif;
    font-size: 1.25rem;
    font-weight: 200;
    color: rgba(255, 255, 255, 0.8);
    margin-top: 0.5rem;
  }

  .clock-center-next {
    font-family: 'Outfit', sans-serif;
    font-size: 0.65rem;
    color: rgba(var(--theme-accent-rgb), 0.6);
    margin-top: 0.25rem;
    letter-spacing: 0.1em;
  }

  /* Tap hint */
  .tap-hint {
    font-family: 'Outfit', sans-serif;
    font-size: 0.7rem;
    font-weight: 400;
    color: rgba(var(--theme-accent-rgb), 0.4);
    letter-spacing: 0.12em;
    text-transform: lowercase;
    margin-top: 0.75rem;
    transition: filter 0.3s ease-out;
  }

  /* Blur state */
  .blurred {
    filter: blur(20px) brightness(0.4);
    pointer-events: none;
  }

  /* ===== RESPONSIVE ===== */
  @media (max-width: 380px) {
    .current-arabic {
      font-size: 3.5rem;
    }

    .current-time {
      font-size: 2rem;
    }

    .divider-countdown {
      font-size: 1.2rem;
    }

    .next-name {
      font-size: 1.3rem;
    }

    .next-time {
      font-size: 1rem;
    }

    .clock-center-arabic {
      font-size: 1.6rem;
    }

    .clock-center-english {
      font-size: 0.75rem;
    }

    .clock-center-countdown {
      font-size: 1rem;
    }
  }

  @media (max-width: 320px) {
    .current-arabic {
      font-size: 3rem;
    }

    .current-name {
      font-size: 1rem;
      letter-spacing: 0.3em;
    }

    .current-time {
      font-size: 1.75rem;
    }

    .divider-countdown {
      font-size: 1.1rem;
    }

    .next-name {
      font-size: 1.2rem;
    }

    .clock-center-arabic {
      font-size: 1.4rem;
    }

    .clock-center-english {
      font-size: 0.7rem;
    }
  }

  @media (max-height: 700px) {
    .prayer-divider {
      margin: 1.25rem 0;
    }

    .all-times {
      margin-top: 1.5rem;
      gap: 0.4rem;
    }

    .dates-row {
      bottom: 1.5rem;
    }
  }

  @media (max-height: 600px) {
    .all-times {
      margin-top: 1rem;
      gap: 0.4rem;
    }

    .time-name {
      font-size: 0.75rem;
    }

    .time-value {
      font-size: 0.8rem;
    }
  }

  @media (max-height: 600px) {
    .clock-center-arabic {
      font-size: 1.4rem;
    }

    .clock-center-countdown {
      font-size: 1rem;
    }
  }
</style>
