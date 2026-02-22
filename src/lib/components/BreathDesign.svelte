<script>
  import { onMount } from 'svelte';
  import { tweened } from 'svelte/motion';
  import { cubicOut } from 'svelte/easing';
  import { prayerTimes, currentPrayer, countdown, prayerNames, location, currentTime, citySelectorOpen } from '$lib/stores/prayer.js';
  import CitySelector from './CitySelector.svelte';

  // Animated progress angle for arc and dot
  const animatedAngle = tweened(0, {
    duration: 2500,
    easing: cubicOut
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

  let breathInterval;
  let showFullClock = false;

  function toggleClock() {
    if (!$citySelectorOpen) {
      showFullClock = !showFullClock;
    }
  }

  onMount(() => {
    // Start clock animation
    animatedAngle.set(0, { duration: 0 });
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        animatedAngle.set(currentTimeAngle);
      });
    });

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
    </div>

    {#if showFullClock}
      <!-- FULL CLOCK VIEW -->
      <div class="full-clock" class:blurred={$citySelectorOpen}>
        <svg viewBox="0 0 100 100" class="clock-svg">
          <defs>
            <filter id="ringGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="1.5" result="blur"/>
              <feMerge>
                <feMergeNode in="blur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>

          <!-- Background track -->
          <circle
            cx="50" cy="50" r="38"
            fill="none"
            stroke="rgba(255,255,255,0.1)"
            stroke-width="1.5"
          />

          <!-- Day progress arc -->
          {#if $animatedAngle > 1}
            <path
              d={getArcPath(0, $animatedAngle, 38)}
              fill="none"
              stroke="rgba(212,175,55,0.7)"
              stroke-width="2"
              stroke-linecap="round"
              filter="url(#ringGlow)"
            />
          {/if}

          <!-- Last third arc -->
          <path
            d={getArcPath(lastThirdOfNight.start, lastThirdOfNight.end, 33)}
            fill="none"
            stroke="rgba(212,175,55,0.25)"
            stroke-width="0.5"
            stroke-linecap="round"
          />

          <!-- Prayer markers -->
          {#each prayers as prayer}
            {@const pos = getPosition(prayerAngles[prayer], 38)}
            {@const isActive = $currentPrayer.current === prayer}
            {#if prayer === 'sunrise'}
              <rect
                x={pos.x - (isActive ? 3 : 2)}
                y={pos.y - (isActive ? 3 : 2)}
                width={isActive ? 6 : 4}
                height={isActive ? 6 : 4}
                fill={isActive ? '#d4af37' : 'rgba(212,175,55,0.4)'}
                transform="rotate(45 {pos.x} {pos.y})"
              />
            {:else}
              <circle
                cx={pos.x} cy={pos.y}
                r={isActive ? 3 : 2}
                fill={isActive ? '#d4af37' : 'rgba(212,175,55,0.4)'}
              />
            {/if}
          {/each}

          <!-- Last third diamond -->
          <rect
            x={lastThirdPos.x - (isInLastThird ? 2.5 : 1.5)}
            y={lastThirdPos.y - (isInLastThird ? 2.5 : 1.5)}
            width={isInLastThird ? 5 : 3}
            height={isInLastThird ? 5 : 3}
            fill={isInLastThird ? '#d4af37' : 'rgba(212,175,55,0.5)'}
            transform="rotate(45 {lastThirdPos.x} {lastThirdPos.y})"
          />

          <!-- Current time indicator -->
          <circle
            cx="50"
            cy="12"
            r="2"
            fill="white"
            style="transform-origin: 50px 50px; transform: rotate({$animatedAngle}deg)"
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
      <div class="clock-center" class:blurred={$citySelectorOpen}>
        <div class="clock-center-arabic">{prayerNames[$currentPrayer.current]?.ar || 'العشاء'}</div>
        <div class="clock-center-countdown">{formatCountdown($countdown)}</div>
        <div class="clock-center-next">until {prayerNames[$currentPrayer.next]?.en}</div>
      </div>

    {:else}
      <!-- SIMPLE VIEW (default) - no clock, just prayer info -->
      <div class="prayer-display" class:blurred={$citySelectorOpen}>
        <div class="current-prayer">
          <div class="current-arabic">{prayerNames[$currentPrayer.current]?.ar || 'العشاء'}</div>
          <div class="current-name">{prayerNames[$currentPrayer.current]?.en || 'Isha'}</div>
          <div class="current-time">{formatTime($prayerTimes[$currentPrayer.current])}</div>
        </div>

        <div class="prayer-divider">
          <span class="divider-line"></span>
          <span class="divider-countdown">{formatCountdown($countdown)}</span>
          <span class="divider-line"></span>
        </div>

        <div class="next-prayer">
          <span class="next-label">Next</span>
          <span class="next-name">{prayerNames[$currentPrayer.next]?.en}</span>
          <span class="next-time">{formatTime($prayerTimes[$currentPrayer.next])}</span>
        </div>

        <!-- All prayer times -->
        <div class="all-times">
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
    <div class="dates-row" class:blurred={$citySelectorOpen}>
      <span class="date-hijri">{hijriDate}</span>
      <span class="date-separator">·</span>
      <span class="date-gregorian">{gregorianDate}</span>
    </div>

    <!-- Tap hint -->
    {#if !showFullClock}
      <div class="tap-hint" class:blurred={$citySelectorOpen}>tap for full clock</div>
    {/if}

  </div>

</div>

<style>
  .app-container {
    position: fixed;
    inset: 0;
    background: #080808;
    overflow: hidden;
    user-select: none;
    -webkit-user-select: none;
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
    left: 0;
    right: 0;
    display: flex;
    justify-content: center;
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
    background: radial-gradient(circle, rgba(212, 175, 55, 0.1) 0%, rgba(212, 175, 55, 0.03) 50%, transparent 70%);
  }

  .breath-glow.inner {
    width: min(280px, 75vw);
    height: min(280px, 75vw);
    background: radial-gradient(circle, rgba(212, 175, 55, 0.15) 0%, rgba(212, 175, 55, 0.05) 45%, transparent 65%);
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
    color: #e8c252;
    line-height: 1.1;
    text-shadow: 0 0 80px rgba(212, 175, 55, 0.3);
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
    background: linear-gradient(90deg, transparent, rgba(212, 175, 55, 0.3), transparent);
  }

  .divider-countdown {
    font-family: 'Outfit', sans-serif;
    font-size: 1.4rem;
    font-weight: 200;
    color: rgba(212, 175, 55, 0.8);
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
    gap: 0.75rem;
    width: 100%;
    max-width: 260px;
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
    font-size: 0.85rem;
    font-weight: 400;
    color: rgba(255, 255, 255, 0.35);
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
    font-size: 0.95rem;
    font-weight: 300;
    color: rgba(255, 255, 255, 0.5);
    font-variant-numeric: tabular-nums;
    text-align: right;
    width: 80px;
    flex-shrink: 0;
  }

  .time-row.active .time-name {
    color: rgba(212, 175, 55, 0.8);
  }

  .time-row.active .time-dots {
    background: linear-gradient(90deg,
      rgba(212, 175, 55, 0.3) 0%,
      rgba(212, 175, 55, 0.15) 50%,
      rgba(212, 175, 55, 0.3) 100%
    );
  }

  .time-row.active .time-value {
    color: rgba(212, 175, 55, 0.9);
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
    color: rgba(232, 194, 82, 0.5);
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
    width: min(65vw, 45vh);
    aspect-ratio: 1;
    transition: filter 0.3s ease-out;
    animation: clockIn 0.4s cubic-bezier(0.16, 1, 0.3, 1);
  }

  @keyframes clockIn {
    from {
      opacity: 0;
      transform: translate(-50%, -50%) scale(0.9);
    }
    to {
      opacity: 1;
      transform: translate(-50%, -50%) scale(1);
    }
  }

  .full-clock .clock-svg {
    width: 100%;
    height: 100%;
  }

  /* Clock labels */
  .clock-label {
    position: absolute;
    transform: translate(-50%, -50%);
    text-align: center;
    pointer-events: none;
    white-space: nowrap;
  }

  .clock-label-name {
    display: block;
    font-family: 'Outfit', sans-serif;
    font-size: clamp(0.45rem, 1.5vw, 0.65rem);
    font-weight: 500;
    color: rgba(255, 255, 255, 0.4);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    margin-bottom: 0.1rem;
  }

  .clock-label-time {
    display: block;
    font-family: 'Outfit', sans-serif;
    font-size: clamp(0.6rem, 2vw, 0.85rem);
    font-weight: 300;
    color: rgba(255, 255, 255, 0.6);
    font-variant-numeric: tabular-nums;
  }

  .clock-label.active .clock-label-name {
    color: rgba(212, 175, 55, 0.9);
  }

  .clock-label.active .clock-label-time {
    color: #d4af37;
    font-weight: 400;
  }

  .clock-label.last-third .clock-label-name {
    color: rgba(212, 175, 55, 0.7);
  }

  .clock-label.last-third .clock-label-time {
    color: rgba(212, 175, 55, 0.8);
  }

  .clock-label.last-third.active .clock-label-name {
    color: rgba(212, 175, 55, 1);
  }

  .clock-label.last-third.active .clock-label-time {
    color: #d4af37;
    font-weight: 400;
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
    font-size: 2rem;
    color: #e8c252;
    line-height: 1.2;
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
    color: rgba(212, 175, 55, 0.6);
    margin-top: 0.25rem;
    letter-spacing: 0.1em;
  }

  /* Tap hint */
  .tap-hint {
    position: absolute;
    bottom: 5.5rem;
    left: 50%;
    transform: translateX(-50%);
    font-family: 'Outfit', sans-serif;
    font-size: 0.6rem;
    font-weight: 300;
    color: rgba(255, 255, 255, 0.2);
    letter-spacing: 0.15em;
    text-transform: lowercase;
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

    .tap-hint {
      bottom: 4rem;
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
