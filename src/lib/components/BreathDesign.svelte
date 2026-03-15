<script>
  import { onMount } from 'svelte';
  import { tweened } from 'svelte/motion';
  import { cubicInOut, cubicOut } from 'svelte/easing';
  import { fade, scale, fly } from 'svelte/transition';
  import {
    prayerTimes as todayPrayerTimes,
    currentPrayer as todayCurrentPrayer,
    countdown as todayCountdown,
    selectedPrayerTimes as prayerTimes,
    selectedCurrentPrayer as currentPrayer,
    selectedCountdown as countdown,
    prayerNames,
    location,
    currentTime,
    citySelectorOpen,
    settingsOpen,
    clockIndicators,
    qiblaDirection,
    labelSize,
    dateOffset
  } from '$lib/stores/prayer.js';
  import { currentTheme } from '$lib/stores/theme.js';
  import CitySelector from './CitySelector.svelte';
  import Settings from './Settings.svelte';

  let calendarOpen = false;

  // Combined overlay state for blur
  $: overlayOpen = $citySelectorOpen || $settingsOpen || calendarOpen;

  // Ring opacity multiplier for light/dark mode compatibility
  $: ringMult = parseFloat($currentTheme?.ringOpacity || '1');
  // Glow intensity for light/dark mode (reduced in light mode to avoid eye strain)
  $: glowIntensity = parseFloat($currentTheme?.glowIntensity || '1');
  // Pre-computed opacity values for SVG elements - higher caps for brighter clock
  $: ringOpacity = {
    faint: Math.min(0.06 * ringMult, 0.6),
    subtle: Math.min(0.10 * ringMult, 0.7),
    light: Math.min(0.15 * ringMult, 0.8),
    medium: Math.min(0.25 * ringMult, 0.9),
    strong: Math.min(0.40 * ringMult, 1.0),
  };

  // Animated progress angle for arc and dot
  const animatedAngle = tweened(0, {
    duration: 2800,
    easing: cubicInOut
  });

  let mounted = false;
  let breathPhase = 0;
  let dateSwipeDirection = 1;
  let calendarMonth = new Date();
  const weekdayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  let calendarTouchStartX = 0;
  let calendarTouchStartY = 0;
  let calendarTouchStartAt = 0;
  let calendarMonthSwipeDirection = 1;

  // Label size scale factor
  // Label sizes: small=1.0, medium=1.2 (default), large=1.45
  $: labelScale = $labelSize === 'small' ? 1.0 : $labelSize === 'large' ? 1.45 : 1.2;

  // Qibla compass state
  let compassHeading = 0;
  let compassEnabled = false;
  let compassPermission = 'unknown'; // 'unknown', 'granted', 'denied', 'unavailable'
  let compassListening = false;
  let qiblaNeedleRotation = 0;
  let lastRawRotation = 0;

  // Smooth rotation that doesn't jump at 0/360 boundary
  $: {
    if (compassEnabled) {
      let rawRotation = ($qiblaDirection - compassHeading + 360) % 360;
      // Calculate shortest path
      let delta = rawRotation - lastRawRotation;
      if (delta > 180) delta -= 360;
      if (delta < -180) delta += 360;
      qiblaNeedleRotation += delta;
      lastRawRotation = rawRotation;
    } else {
      qiblaNeedleRotation = $qiblaDirection;
      lastRawRotation = $qiblaDirection;
    }
  }
  // Aligned when within 5 degrees of pointing up (0, 360, 720, etc.)
  $: qiblaAligned = compassEnabled && (Math.abs(qiblaNeedleRotation % 360) < 5 || Math.abs(qiblaNeedleRotation % 360) > 355);

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

  // Calculate first third end (Hanbali Isha time) - diamond marker only
  $: firstThirdEnd = (() => {
    const maghrib = $prayerTimes.maghrib;
    const fajr = $prayerTimes.fajr;
    if (!maghrib || !fajr) return { angle: 0, time: null };

    let nightDurationMs = fajr.getTime() - maghrib.getTime();
    if (nightDurationMs < 0) nightDurationMs += 24 * 60 * 60 * 1000;

    const firstThirdEndMs = maghrib.getTime() + (nightDurationMs / 3);
    const endTimeDate = new Date(firstThirdEndMs);

    const nightStartHour = maghrib.getHours() + maghrib.getMinutes() / 60;
    let nightEndHour = fajr.getHours() + fajr.getMinutes() / 60;
    if (nightEndHour < nightStartHour) nightEndHour += 24;

    const nightDuration = nightEndHour - nightStartHour;
    const angle = ((nightDuration / 3) / 24) * 360;

    return { angle, time: endTimeDate };
  })();

  // Friday Dua time (Asr to Maghrib) - only on Fridays
  $: isFriday = $currentTime.getDay() === 5;
  $: fridayDuaTime = (() => {
    if (!isFriday) return null;
    const asr = $prayerTimes.asr;
    const maghrib = $prayerTimes.maghrib;
    if (!asr || !maghrib) return null;

    const startAngle = prayerAngles.asr;
    const endAngle = 0; // Maghrib is always at 0

    return { start: startAngle, end: endAngle, startTime: asr, endTime: maghrib };
  })();

  // Qaylula time (mid-day rest) - 30min after Dhuhr until ~60% to Asr
  $: qaylulaTime = (() => {
    const dhuhr = $prayerTimes.dhuhr;
    const asr = $prayerTimes.asr;
    if (!dhuhr || !asr) return null;

    // Start 30 minutes after Dhuhr
    const startMs = dhuhr.getTime() + (30 * 60 * 1000);
    const startTime = new Date(startMs);

    const durationMs = asr.getTime() - dhuhr.getTime();
    const endMs = dhuhr.getTime() + (durationMs * 0.6);
    const endTime = new Date(endMs);

    const startAngle = timeToAngle(startTime, maghribHour);
    const endAngle = timeToAngle(endTime, maghribHour);

    return { start: startAngle, end: endAngle, startTime, endTime };
  })();

  // Duha time (after sunrise until ~15 min before Dhuhr)
  $: duhaTime = (() => {
    const sunrise = $prayerTimes.sunrise;
    const dhuhr = $prayerTimes.dhuhr;
    if (!sunrise || !dhuhr) return null;

    // Start 15-20 min after sunrise
    const startMs = sunrise.getTime() + (20 * 60 * 1000);
    const startTime = new Date(startMs);

    // End ~15 min before Dhuhr (to avoid zawal/makruh time)
    const endMs = dhuhr.getTime() - (15 * 60 * 1000);
    const endTime = new Date(endMs);

    const startAngle = timeToAngle(startTime, maghribHour);
    const endAngle = timeToAngle(endTime, maghribHour);

    return { start: startAngle, end: endAngle, startTime, endTime };
  })();

  // Use store for enabled indicators (controlled from Settings)

  // Check if currently in special times
  $: isInFirstThird = (() => {
    if (!firstThirdEnd.time || !$prayerTimes.maghrib) return false;
    const now = $currentTime;
    return now >= $prayerTimes.maghrib && now < firstThirdEnd.time;
  })();

  $: isInFridayDua = (() => {
    if (!fridayDuaTime) return false;
    const now = $currentTime;
    return now >= fridayDuaTime.startTime && now < fridayDuaTime.endTime;
  })();

  $: isInQaylula = (() => {
    if (!qaylulaTime) return false;
    const now = $currentTime;
    return now >= qaylulaTime.startTime && now < qaylulaTime.endTime;
  })();

  $: isInDuha = (() => {
    if (!duhaTime) return false;
    const now = $currentTime;
    return now >= duhaTime.startTime && now < duhaTime.endTime;
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
    // Known new moon: February 18, 2026 (recent reference for accuracy)
    const knownNewMoon = new Date(Date.UTC(2026, 1, 18, 0, 0, 0));
    const lunarCycle = 29.53058867; // days

    const daysSinceKnown = (date.getTime() - knownNewMoon.getTime()) / (1000 * 60 * 60 * 24);
    let phase = (daysSinceKnown % lunarCycle) / lunarCycle;

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

  // Generate SVG path for moon phase using proper astronomical geometry
  // The terminator (shadow line) is an ellipse seen edge-on
  function getMoonPath(cx, cy, r, illumination, waxing) {
    // Round to nearest 10% for discrete phase display
    const illum = Math.round(illumination * 10) / 10;

    if (illum <= 0.03) {
      // New moon - show thin outline only
      return { type: 'new', path: '' };
    }

    if (illum >= 0.97) {
      // Full moon - complete circle
      return { type: 'full', path: '' };
    }

    // The terminator is modeled as an ellipse
    // At 50% illumination, it's a straight line (ellipse width = 0)
    // At 0% or 100%, it matches the outer circle
    // The ellipse horizontal radius varies with illumination
    const terminatorRx = Math.abs(Math.cos(illumination * Math.PI)) * r;

    // For waxing: right side is lit, terminator curves from left
    // For waning: left side is lit, terminator curves from right

    // Build path: outer arc on lit side + terminator arc
    // Start at top of moon, arc to bottom on lit side, arc back via terminator

    const topY = cy - r;
    const botY = cy + r;

    // Sweep direction for outer arc (1 = clockwise, 0 = counter-clockwise)
    // For waxing (right lit): go clockwise from top to bottom
    // For waning (left lit): go counter-clockwise from top to bottom
    const outerSweep = waxing ? 1 : 0;

    // Terminator sweep direction depends on phase
    // Crescent (illum < 0.5): terminator curves INTO lit side (less visible)
    // Gibbous (illum > 0.5): terminator curves AWAY from lit side (more visible)
    const terminatorSweep = illumination < 0.5
      ? (waxing ? 0 : 1)  // Crescent: curve into lit area
      : (waxing ? 1 : 0); // Gibbous: curve away from lit area

    // SVG path
    const path = `M ${cx} ${topY} ` +
      `A ${r} ${r} 0 0 ${outerSweep} ${cx} ${botY} ` +
      `A ${terminatorRx} ${r} 0 0 ${terminatorSweep} ${cx} ${topY} Z`;

    return { type: 'phase', path };
  }

  $: moonData = getMoonData($currentTime);

  // Moon path for Maghrib (small moon)
  $: maghribMoon = getMoonPath(62, 14, 7, moonData.illumination, moonData.waxing);

  // Moon path for Isha (large moon)
  $: ishaMoon = getMoonPath(40, 20, 14, moonData.illumination, moonData.waxing);

  let breathInterval;
  let showFullClock = false;
  let isAnimating = false;
  let animationTimeout;

  function toggleClock() {
    if (!overlayOpen) {
      showFullClock = !showFullClock;

      // Animate arc when opening clock
      if (showFullClock) {
        isAnimating = true;
        clearTimeout(animationTimeout);
        animatedAngle.set(0, { duration: 0 });
        setTimeout(() => {
          animatedAngle.set(currentTimeAngle, { duration: 2800 });
        }, 50);
        // Fade out motion trail after animation completes
        animationTimeout = setTimeout(() => {
          isAnimating = false;
        }, 3000);
      } else {
        isAnimating = false;
      }
    }
  }

  onMount(() => {
    mounted = true;

    const handleQiblaPermission = (event) => {
      const status = event?.detail?.status;
      if (!status) return;

      compassPermission = status;
      if (status === 'granted') {
        startCompass();
      } else if (status === 'denied') {
        stopCompass();
      }
    };

    // Breathing animation - slower, more meditative (4-second cycle)
    breathInterval = setInterval(() => {
      breathPhase = (breathPhase + 1) % 360;
    }, 66);

    // Check compass availability
    if (window.DeviceOrientationEvent) {
      // iOS 13+ requires permission
      if (typeof DeviceOrientationEvent.requestPermission === 'function') {
        compassPermission = 'unknown';
        if ($clockIndicators.qibla) {
          startCompass();
        }
      } else {
        // Android or older iOS - start listening
        compassPermission = 'granted';
        if ($clockIndicators.qibla) {
          startCompass();
        }
      }
    } else {
      compassPermission = 'unavailable';
    }

    window.addEventListener('azan:qibla-permission', handleQiblaPermission);

    return () => {
      mounted = false;
      clearInterval(breathInterval);
      stopCompass();
      window.removeEventListener('azan:qibla-permission', handleQiblaPermission);
    };
  });

  function handleOrientation(event) {
    // iOS provides webkitCompassHeading directly (0-360, 0 = North)
    // -1 means compass needs calibration
    if (event.webkitCompassHeading !== undefined && event.webkitCompassHeading !== null && event.webkitCompassHeading >= 0) {
      compassHeading = event.webkitCompassHeading;
      compassEnabled = true;
    } else if (event.alpha !== null && event.alpha !== undefined) {
      // Android/other: use alpha rotation
      compassHeading = (360 - event.alpha) % 360;
      compassEnabled = true;
    }
  }

  function startCompass() {
    if (typeof window === 'undefined') return;
    if (compassListening) return;
    // Try absolute orientation first (more reliable for compass on Android)
    if ('ondeviceorientationabsolute' in window) {
      window.addEventListener('deviceorientationabsolute', handleOrientation, true);
    } else {
      window.addEventListener('deviceorientation', handleOrientation, true);
    }
    compassListening = true;
  }

  function stopCompass() {
    if (typeof window === 'undefined') return;
    if (!compassListening) return;
    window.removeEventListener('deviceorientation', handleOrientation);
    window.removeEventListener('deviceorientationabsolute', handleOrientation);
    compassListening = false;
    compassEnabled = false;
  }

  $: if (mounted) {
    if ($clockIndicators.qibla) {
      if (compassPermission !== 'unavailable' && compassPermission !== 'denied') {
        startCompass();
      }
    } else {
      stopCompass();
    }
  }



  function formatCountdown(cd) {
    const h = String(cd.hours).padStart(2, '0');
    const m = String(cd.minutes).padStart(2, '0');
    const s = String(Math.max(0, cd.seconds)).padStart(2, '0');
    if (cd.hours > 0) return `${h}h ${m}m`;
    return `${m}m ${s}s`;
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

  function normalizeDate(date) {
    const normalized = new Date(date);
    normalized.setHours(12, 0, 0, 0);
    return normalized;
  }

  function getBaseDay() {
    return normalizeDate($todayPrayerTimes.dhuhr || $todayPrayerTimes.fajr || $currentTime);
  }

  function getDateFromOffset(offset) {
    const date = getBaseDay();
    date.setDate(date.getDate() + offset);
    return date;
  }

  function isSameDay(a, b) {
    return a.getFullYear() === b.getFullYear()
      && a.getMonth() === b.getMonth()
      && a.getDate() === b.getDate();
  }

  function openCalendar() {
    calendarOpen = true;
    const selectedDay = getDateFromOffset($dateOffset);
    calendarMonth = new Date(selectedDay.getFullYear(), selectedDay.getMonth(), 1, 12, 0, 0, 0);
  }

  function closeCalendar() {
    calendarOpen = false;
  }

  function closeCalendarToHome() {
    calendarOpen = false;
    showFullClock = false;
  }

  function shiftCalendarMonth(months) {
    if (!months) return;
    calendarMonthSwipeDirection = months > 0 ? 1 : -1;
    const next = new Date(calendarMonth);
    next.setMonth(next.getMonth() + months);
    calendarMonth = next;
  }

  function handleCalendarTouchStart(event) {
    const touch = event.touches?.[0];
    if (!touch) return;
    calendarTouchStartX = touch.clientX;
    calendarTouchStartY = touch.clientY;
    calendarTouchStartAt = Date.now();
  }

  function handleCalendarTouchEnd(event) {
    const touch = event.changedTouches?.[0];
    if (!touch) return;

    const deltaX = touch.clientX - calendarTouchStartX;
    const deltaY = touch.clientY - calendarTouchStartY;
    const duration = Date.now() - calendarTouchStartAt;

    // Horizontal intent with enough travel and reasonable speed.
    if (Math.abs(deltaX) < 44) return;
    if (Math.abs(deltaX) < Math.abs(deltaY) * 1.25) return;
    if (duration > 650) return;

    shiftCalendarMonth(deltaX < 0 ? 1 : -1);
  }

  function getCalendarCells(monthDate) {
    const startOfMonth = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1, 12, 0, 0, 0);
    const start = new Date(startOfMonth);
    start.setDate(start.getDate() - startOfMonth.getDay());

    const cells = [];
    for (let i = 0; i < 42; i++) {
      const day = new Date(start);
      day.setDate(start.getDate() + i);
      cells.push(day);
    }
    return cells;
  }

  function getCalendarMonthLabel(date) {
    return date.toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric'
    });
  }

  function getHijriDayNumber(date) {
    const day = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', {
      day: 'numeric'
    }).format(date);
    return day.replace(/[^\d]/g, '') || day;
  }

  function getHijriMonthMeta(date) {
    const monthNumRaw = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', {
      month: 'numeric'
    }).format(date);
    const yearRaw = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', {
      year: 'numeric'
    }).format(date);

    const monthNum = parseInt(monthNumRaw, 10);
    const yearNum = yearRaw.replace(/[^\d]/g, '');
    const name = hijriMonths[monthNum - 1] || monthNumRaw;

    return {
      monthNum,
      yearNum,
      name,
      key: `${monthNum}-${yearNum}`
    };
  }

  function getHijriMonthsInGregorianMonth(monthDate) {
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();
    const first = new Date(year, month, 1, 12, 0, 0, 0);
    const last = new Date(year, month + 1, 0, 12, 0, 0, 0);
    const months = [];
    const seen = new Set();

    for (let day = 1; day <= last.getDate(); day++) {
      const date = new Date(year, month, day, 12, 0, 0, 0);
      const meta = getHijriMonthMeta(date);
      if (seen.has(meta.key)) continue;
      seen.add(meta.key);
      months.push(meta);
    }

    if (months.length === 0) {
      months.push(getHijriMonthMeta(first));
    }

    return months;
  }

  function selectCalendarDate(day) {
    const today = getBaseDay();
    const target = normalizeDate(day);
    const nextOffset = Math.round((target.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));

    if (nextOffset !== $dateOffset) {
      dateSwipeDirection = nextOffset > $dateOffset ? 1 : -1;
      dateOffset.set(nextOffset);
    }

    closeCalendar();
  }

  function handleCalendarKeydown(e) {
    if (e.key === 'Escape' && calendarOpen) {
      closeCalendar();
    }
  }

  function shiftDate(days) {
    if (!days) return;
    dateSwipeDirection = days > 0 ? 1 : -1;
    dateOffset.update((value) => value + days);
  }

  function jumpCalendarToToday() {
    const today = getBaseDay();
    const targetMonth = new Date(today.getFullYear(), today.getMonth(), 1, 12, 0, 0, 0);
    const currentMonthIndex = (calendarMonth.getFullYear() * 12) + calendarMonth.getMonth();
    const targetMonthIndex = (targetMonth.getFullYear() * 12) + targetMonth.getMonth();

    if (targetMonthIndex !== currentMonthIndex) {
      calendarMonthSwipeDirection = targetMonthIndex > currentMonthIndex ? 1 : -1;
      calendarMonth = targetMonth;
    }

    if ($dateOffset !== 0) {
      dateSwipeDirection = $dateOffset > 0 ? -1 : 1;
      dateOffset.set(0);
    }
  }

  function getOffsetLabel(offset) {
    if (offset === 0) return 'Today';
    if (offset === 1) return 'Tomorrow';
    if (offset === -1) return 'Yesterday';
    return offset > 0 ? `${offset} days ahead` : `${Math.abs(offset)} days back`;
  }

  function dateListSlide(node, { direction = 1, duration = 430 } = {}) {
    const distance = node.getBoundingClientRect().width + 64;
    return {
      duration,
      easing: cubicInOut,
      css: (t, u) => `
        transform: translate3d(${u * direction * distance}px, 0, 0);
        opacity: ${0.18 + (0.82 * t)};
      `
    };
  }

  function calendarMonthSlide(node, { direction = 1, duration = 380 } = {}) {
    const distance = node.getBoundingClientRect().width + 36;
    return {
      duration,
      easing: cubicInOut,
      css: (t, u) => `
        transform: translate3d(${u * direction * distance}px, 0, 0);
        opacity: ${0.35 + (0.65 * t)};
      `
    };
  }

  function getDateAnchor() {
    return $prayerTimes.dhuhr || $prayerTimes.fajr || $currentTime;
  }

  $: selectedCalendarDate = getDateFromOffset($dateOffset);
  $: todayCalendarDate = getDateFromOffset(0);
  $: calendarCells = getCalendarCells(calendarMonth);
  $: calendarHijriMonths = getHijriMonthsInGregorianMonth(calendarMonth);
  $: selectedHijriMonth = getHijriMonthMeta(selectedCalendarDate);
  $: activeCalendarHijriMonthKey = calendarHijriMonths.some((month) => month.key === selectedHijriMonth.key)
    ? selectedHijriMonth.key
    : calendarHijriMonths[0]?.key;

  // Get Hijri date
  const hijriMonths = [
    'Muharram', 'Safar', 'Rabi al-Awwal', 'Rabi al-Thani',
    'Jumada al-Awwal', 'Jumada al-Thani', 'Rajab', 'Shaban',
    'Ramadan', 'Shawwal', 'Dhu al-Qadah', 'Dhu al-Hijjah'
  ];

  function getHijriDate() {
    try {
      const date = getDateAnchor();

      // Get Hijri date parts
      const day = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', { day: 'numeric', timeZone: $location.timezone }).format(date);
      const monthNum = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', { month: 'numeric', timeZone: $location.timezone }).format(date);
      const year = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', { year: 'numeric', timeZone: $location.timezone }).format(date);

      // Use our own month names (Android fallback)
      const monthName = hijriMonths[parseInt(monthNum) - 1] || monthNum;

      // Extract just the number from year (removes "AH" suffix if present)
      const yearNum = year.replace(/[^\d]/g, '');

      return `${day} ${monthName} ${yearNum} AH`;
    } catch {
      return '';
    }
  }

  $: hijriDate = ($currentTime, $prayerTimes.dhuhr, $dateOffset, getHijriDate());

  // Get Gregorian date
  function getGregorianDate() {
    const date = getDateAnchor();
    return date.toLocaleDateString('en-US', {
      timeZone: $location.timezone,
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    });
  }

  $: gregorianDate = ($currentTime, $prayerTimes.dhuhr, $dateOffset, getGregorianDate());

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

  // All indicator arcs at same inner radius (33)
  $: lastThirdArcPath = getArcPath(lastThirdOfNight.start, lastThirdOfNight.end, 33);
  // Diamond markers stay on the main clock ring (38)
  $: lastThirdPos = getPosition(lastThirdOfNight.start, 38);
  $: lastThirdLabelPos = getPosition(lastThirdOfNight.start, 58);

  // First third end (diamond only) positions - on main clock ring
  $: firstThirdPos = getPosition(firstThirdEnd.angle, 38);
  $: firstThirdLabelPos = getPosition(firstThirdEnd.angle, 58);

  // Friday Dua arc (same radius as Last Third)
  $: fridayDuaArcPath = fridayDuaTime ? getArcPath(fridayDuaTime.start, fridayDuaTime.end > fridayDuaTime.start ? fridayDuaTime.end : 360, 33) : '';

  // Qaylula arc (same radius as Last Third)
  $: qaylulaArcPath = qaylulaTime ? getArcPath(qaylulaTime.start, qaylulaTime.end, 33) : '';

  // Duha arc (same radius as Last Third)
  $: duhaArcPath = duhaTime ? getArcPath(duhaTime.start, duhaTime.end, 33) : '';

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

<svelte:window on:keydown={handleCalendarKeydown} />

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
      <div class="full-clock" class:blurred={overlayOpen} style="--label-scale: {labelScale};" in:scale={{ duration: 300, start: 0.92, opacity: 0 }} out:fade={{ duration: 150 }}>
        <svg viewBox="0 0 100 100" class="clock-svg">
          <defs>
            <!-- Soft atmospheric glow -->
            <filter id="softGlow" x="-30" y="-30" width="160" height="160" filterUnits="userSpaceOnUse">
              <feGaussianBlur stdDeviation="2" result="blur"/>
              <feMerge>
                <feMergeNode in="blur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
            <!-- Intense glow for active elements -->
            <filter id="activeGlow" x="-300%" y="-300%" width="700%" height="700%">
              <feGaussianBlur stdDeviation="2" result="innerBlur"/>
              <feGaussianBlur stdDeviation="5" result="outerBlur"/>
              <feColorMatrix in="outerBlur" type="matrix"
                values="1.5 0 0 0 0.2
                        0 1.5 0 0 0.2
                        0 0 1.5 0 0.2
                        0 0 0 1 0" result="brightBlur"/>
              <feMerge>
                <feMergeNode in="brightBlur"/>
                <feMergeNode in="brightBlur"/>
                <feMergeNode in="innerBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
            <!-- Clean glow for diamond markers -->
            <filter id="diamondGlow" x="-300%" y="-300%" width="700%" height="700%" filterUnits="objectBoundingBox">
              <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur"/>
              <feMerge>
                <feMergeNode in="blur"/>
                <feMergeNode in="blur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
            <!-- Gradient for progress arc -->
            <linearGradient id="arcGradient" gradientUnits="userSpaceOnUse" x1="50" y1="10" x2="50" y2="90">
              <stop offset="0%" stop-color="var(--theme-accent-bright)"/>
              <stop offset="100%" stop-color="var(--theme-accent)"/>
            </linearGradient>
            <!-- Qibla aligned pulse glow -->
            <filter id="qiblaGlow" x="-200%" y="-200%" width="500%" height="500%">
              <feGaussianBlur stdDeviation="1.5" result="innerBlur"/>
              <feGaussianBlur stdDeviation="4" result="outerBlur"/>
              <feColorMatrix in="outerBlur" type="matrix"
                values="2 0 0 0 0.3
                        0 2 0 0 0.3
                        0 0 2 0 0.3
                        0 0 0 1.2 0" result="brightBlur"/>
              <feMerge>
                <feMergeNode in="brightBlur"/>
                <feMergeNode in="innerBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>

          <!-- Outer frame ring -->
          <circle
            cx="50" cy="50" r="44"
            fill="none"
            stroke="rgba(var(--theme-accent-rgb),{ringOpacity.light})"
            stroke-width="0.3"
          />

          <!-- Qibla compass needle -->
          {#if $clockIndicators.qibla}
            <g
              style="transform-origin: 50px 50px; transform: rotate({qiblaNeedleRotation}deg); transition: transform 0.1s linear;"
              filter={qiblaAligned ? "url(#qiblaGlow)" : "none"}
              class:qibla-aligned={qiblaAligned}
            >
              <!-- Elegant elongated triangle pointing outward -->
              <polygon
                points="50,0 47.5,5 52.5,5"
                fill={qiblaAligned ? "var(--theme-accent-bright)" : "var(--theme-marker)"}
                opacity={compassEnabled ? (qiblaAligned ? 1 : 0.7) : 0.5}
              />
            </g>
          {/if}

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
              stroke={isMajor ? `rgba(var(--theme-accent-rgb),${ringOpacity.strong})` : `rgba(var(--theme-text-rgb),${ringOpacity.light})`}
              stroke-width={isMajor ? 0.6 : 0.3}
            />
          {/each}

          <!-- Main track ring -->
          <circle
            cx="50" cy="50" r="38"
            fill="none"
            stroke="rgba(var(--theme-text-rgb),{ringOpacity.subtle})"
            stroke-width="2"
          />

          <!-- Last third arc -->
          {#if $clockIndicators.lastThird}
            <path
              d={getArcPath(lastThirdOfNight.start, lastThirdOfNight.end, 33)}
              fill="none"
              stroke="rgba(var(--theme-accent-rgb),{isInLastThird ? 0.6 : 0.4})"
              stroke-width="1"
              stroke-linecap="round"
            />
          {/if}

          <!-- Friday Dua arc (Asr to Maghrib) - only on Fridays -->
          {#if $clockIndicators.fridayDua && fridayDuaTime}
            <path
              d={getArcPath(fridayDuaTime.start, 360, 33)}
              fill="none"
              stroke="rgba(var(--theme-accent-bright-rgb), {isInFridayDua ? 0.58 : 0.32})"
              stroke-width="1"
              stroke-linecap="round"
              stroke-dasharray="2 2"
            />
          {/if}

          <!-- Qaylula arc (mid-day rest) -->
          {#if $clockIndicators.qaylula && qaylulaTime}
            <path
              d={qaylulaArcPath}
              fill="none"
              stroke="rgba(200, 180, 100, {isInQaylula ? 0.6 : 0.3})"
              stroke-width="1"
              stroke-linecap="round"
            />
          {/if}

          <!-- Duha arc (morning prayer time) -->
          {#if $clockIndicators.duha && duhaTime}
            <path
              d={duhaArcPath}
              fill="none"
              stroke="rgba(255, 180, 100, {isInDuha ? 0.6 : 0.3})"
              stroke-width="1"
              stroke-linecap="round"
            />
          {/if}

          <!-- Day progress arc -->
          {#if $animatedAngle > 1}
            <path
              d={getArcPath(0, $animatedAngle, 38)}
              fill="none"
              stroke="url(#arcGradient)"
              stroke-width="2"
              stroke-linecap="round"
              filter="url(#softGlow)" opacity={glowIntensity}
            />
          {/if}

          <!-- Prayer markers -->
          {#each prayers as prayer}
            {@const pos = getPosition(prayerAngles[prayer], 38)}
            {@const isActive = $currentPrayer.current === prayer}
            {#if prayer === 'sunrise'}
              <!-- Sunrise: diamond indicator (toggleable) -->
              {#if $clockIndicators.sunrise}
                {#if isActive}
                  <g filter="url(#diamondGlow)" opacity={glowIntensity}>
                    <polygon
                      points="{pos.x},{pos.y - 2.5} {pos.x + 2},{pos.y} {pos.x},{pos.y + 2.5} {pos.x - 2},{pos.y}"
                      fill="var(--theme-marker)"
                      transform="rotate({prayerAngles[prayer]} {pos.x} {pos.y})"
                    />
                  </g>
                {:else}
                  <polygon
                    points="{pos.x},{pos.y - 2} {pos.x + 1.5},{pos.y} {pos.x},{pos.y + 2} {pos.x - 1.5},{pos.y}"
                    fill="var(--theme-marker)"
                    transform="rotate({prayerAngles[prayer]} {pos.x} {pos.y})"
                  />
                {/if}
              {/if}
            {:else}
              <!-- Other prayers: circles -->
              {#if isActive}
                <g filter="url(#activeGlow)" opacity={glowIntensity}>
                  <circle cx={pos.x} cy={pos.y} r="3.5" fill=var(--theme-accent-bright)/>
                </g>
              {:else}
                <circle cx={pos.x} cy={pos.y} r="2" fill=var(--theme-accent-dim)/>
              {/if}
            {/if}
          {/each}

          <!-- First third end diamond marker (Hanbali Isha) -->
          {#if $clockIndicators.firstThirdEnd && firstThirdEnd.time}
            {#if isInFirstThird}
              <g filter="url(#diamondGlow)" opacity={glowIntensity}>
                <polygon
                  points="{firstThirdPos.x},{firstThirdPos.y - 2.5} {firstThirdPos.x + 2},{firstThirdPos.y} {firstThirdPos.x},{firstThirdPos.y + 2.5} {firstThirdPos.x - 2},{firstThirdPos.y}"
                  fill="var(--theme-marker)"
                  transform="rotate({firstThirdEnd.angle} {firstThirdPos.x} {firstThirdPos.y})"
                />
              </g>
            {:else}
              <polygon
                points="{firstThirdPos.x},{firstThirdPos.y - 2} {firstThirdPos.x + 1.5},{firstThirdPos.y} {firstThirdPos.x},{firstThirdPos.y + 2} {firstThirdPos.x - 1.5},{firstThirdPos.y}"
                fill="var(--theme-marker)"
                transform="rotate({firstThirdEnd.angle} {firstThirdPos.x} {firstThirdPos.y})"
              />
            {/if}
          {/if}

          <!-- Last third diamond marker -->
          {#if $clockIndicators.lastThird}
            {#if isInLastThird}
              <g filter="url(#diamondGlow)" opacity={glowIntensity}>
                <polygon
                  points="{lastThirdPos.x},{lastThirdPos.y - 2.5} {lastThirdPos.x + 2},{lastThirdPos.y} {lastThirdPos.x},{lastThirdPos.y + 2.5} {lastThirdPos.x - 2},{lastThirdPos.y}"
                  fill="var(--theme-marker)"
                  transform="rotate({lastThirdOfNight.start} {lastThirdPos.x} {lastThirdPos.y})"
                />
              </g>
            {:else}
              <polygon
                points="{lastThirdPos.x},{lastThirdPos.y - 2} {lastThirdPos.x + 1.5},{lastThirdPos.y} {lastThirdPos.x},{lastThirdPos.y + 2} {lastThirdPos.x - 1.5},{lastThirdPos.y}"
                fill="var(--theme-marker)"
                transform="rotate({lastThirdOfNight.start} {lastThirdPos.x} {lastThirdPos.y})"
              />
            {/if}
          {/if}

          <!-- Current time indicator -->
          <g style="transform-origin: 50px 50px; transform: rotate({$animatedAngle}deg)">
            <!-- Motion trail glow - only visible during animation -->
            <circle
              cx="50" cy="12" r="3"
              fill="rgba(255,255,255,{isAnimating ? 0.25 : 0})"
              filter="url(#softGlow)" opacity={glowIntensity}
              style="transition: fill 0.5s ease-out;"
            />
            <circle cx="50" cy="12" r="2" fill="white"/>
            <circle cx="50" cy="11.5" r="0.8" fill="rgba(255,255,255,0.8)"/>
          </g>

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

        <!-- First Third End label (Hanbali Isha) -->
        {#if $clockIndicators.firstThirdEnd && firstThirdEnd.time}
          <div
            class="clock-label first-third"
            class:active={isInFirstThird}
            style="left: {firstThirdLabelPos.x}%; top: {firstThirdLabelPos.y}%;"
          >
            <span class="clock-label-name">1st&nbsp;Third&nbsp;End</span>
            <span class="clock-label-time">{formatTime(firstThirdEnd.time)}</span>
          </div>
        {/if}

        <!-- Last Third label -->
        {#if $clockIndicators.lastThird}
          <div
            class="clock-label last-third"
            class:active={isInLastThird}
            style="left: {lastThirdLabelPos.x}%; top: {lastThirdLabelPos.y}%;"
          >
            <span class="clock-label-name">Last&nbsp;Third</span>
            <span class="clock-label-time">{formatTime(lastThirdOfNight.startTime)}</span>
          </div>
        {/if}

      </div>

      <!-- Center info in clock mode -->
      <div class="clock-center" class:blurred={overlayOpen}>
        {#key $currentPrayer.current}
          <div class="clock-center-arabic" in:fly={{ y: 8, duration: 500, delay: 150, easing: cubicOut }} out:fly={{ y: -8, duration: 200 }}>{prayerNames[$currentPrayer.current]?.ar || 'العشاء'}</div>
          <div class="clock-center-english" in:fly={{ y: 6, duration: 500, delay: 200, easing: cubicOut }} out:fly={{ y: -6, duration: 200 }}>{prayerNames[$currentPrayer.current]?.en || 'Isha'}</div>
        {/key}
        <div class="clock-center-countdown">{formatCountdown($todayCountdown)}</div>
        {#key $todayCurrentPrayer.next}
          <div class="clock-center-next" in:fly={{ y: 4, duration: 500, delay: 250, easing: cubicOut }} out:fly={{ y: -4, duration: 200 }}>until {prayerNames[$todayCurrentPrayer.next]?.en}</div>
        {/key}
      </div>

      <!-- Special times info below clock - only shown when active -->
      {#if (isInDuha && $clockIndicators.duha) || (isInQaylula && $clockIndicators.qaylula) || (isInFridayDua && $clockIndicators.fridayDua) || (isInFirstThird && $clockIndicators.firstThirdEnd) || (isInLastThird && $clockIndicators.lastThird)}
        <div class="clock-indicators" class:blurred={overlayOpen}>
          {#if isInDuha && $clockIndicators.duha}
            <span class="indicator-active">Duha until {formatTime(duhaTime.endTime)}</span>
          {:else if isInQaylula && $clockIndicators.qaylula}
            <span class="indicator-active">Qaylula until {formatTime(qaylulaTime.endTime)}</span>
          {:else if isInFridayDua && $clockIndicators.fridayDua}
            <span class="indicator-active">Jumu'ah Dua until Maghrib</span>
          {:else if isInFirstThird && $clockIndicators.firstThirdEnd}
            <span class="indicator-active">1st Third until {formatTime(firstThirdEnd.time)}</span>
          {:else if isInLastThird && $clockIndicators.lastThird}
            <span class="indicator-active">Last Third until Fajr</span>
          {/if}
        </div>
      {/if}

      {#if $clockIndicators.qibla && compassPermission === 'granted' && !compassEnabled}
        <div class="compass-enable" class:blurred={overlayOpen}>
          Rotate device to calibrate...
        </div>
      {:else if $clockIndicators.qibla && compassPermission === 'denied'}
        <div class="compass-enable" class:blurred={overlayOpen}>
          Compass permission denied
        </div>
      {/if}

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
                      <stop offset="0%" stop-color=var(--theme-accent-bright) stop-opacity="0.6"/>
                      <stop offset="40%" stop-color=var(--theme-accent) stop-opacity="0.25"/>
                      <stop offset="100%" stop-color=var(--theme-accent) stop-opacity="0"/>
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
                      <stop offset="0%" stop-color=var(--theme-accent-bright) stop-opacity="0.5"/>
                      <stop offset="60%" stop-color=var(--theme-accent) stop-opacity="0.15"/>
                      <stop offset="100%" stop-color=var(--theme-accent) stop-opacity="0"/>
                    </radialGradient>
                    <radialGradient id="groundGlowSunrise" cx="50%" cy="0%" r="100%">
                      <stop offset="0%" stop-color=var(--theme-accent) stop-opacity="0.25"/>
                      <stop offset="100%" stop-color=var(--theme-accent) stop-opacity="0"/>
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
                      <stop offset="0%" stop-color=var(--theme-accent) stop-opacity="0.22"/>
                      <stop offset="100%" stop-color=var(--theme-accent) stop-opacity="0"/>
                    </radialGradient>
                    <radialGradient id="dhuhrSunGlow" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stop-color=var(--theme-accent-bright) stop-opacity="0.55"/>
                      <stop offset="50%" stop-color=var(--theme-accent) stop-opacity="0.2"/>
                      <stop offset="100%" stop-color=var(--theme-accent) stop-opacity="0"/>
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
                      <stop offset="0%" stop-color=var(--theme-accent) stop-opacity="0.15"/>
                      <stop offset="100%" stop-color=var(--theme-accent) stop-opacity="0"/>
                    </radialGradient>
                    <radialGradient id="asrSunGlow" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stop-color=var(--theme-accent-bright) stop-opacity="0.35"/>
                      <stop offset="100%" stop-color=var(--theme-accent) stop-opacity="0"/>
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
                      <stop offset="0%" stop-color=var(--theme-accent-bright) stop-opacity="0.7"/>
                      <stop offset="30%" stop-color=var(--theme-accent) stop-opacity="0.3"/>
                      <stop offset="100%" stop-color=var(--theme-accent) stop-opacity="0"/>
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
                  {#if maghribMoon.type === 'full'}
                    <circle class="moon-fill" cx="62" cy="14" r="7"/>
                  {:else if maghribMoon.type === 'new'}
                    <circle class="moon-outline" cx="62" cy="14" r="7"/>
                  {:else}
                    <path class="moon-fill" d={maghribMoon.path}/>
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
                  <defs>
                    <linearGradient id="shootingStarGrad" x1="100%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stop-color="var(--theme-accent-bright)" stop-opacity="0"/>
                      <stop offset="60%" stop-color="var(--theme-accent-bright)" stop-opacity="0.5"/>
                      <stop offset="100%" stop-color="var(--theme-accent-bright)" stop-opacity="1"/>
                    </linearGradient>
                  </defs>
                  <!-- Moon with actual phase -->
                  {#if ishaMoon.type === 'full'}
                    <circle class="isha-moon-fill" cx="40" cy="20" r="14"/>
                  {:else if ishaMoon.type === 'new'}
                    <circle class="isha-moon-outline" cx="40" cy="20" r="14"/>
                  {:else}
                    <path class="isha-moon-fill" d={ishaMoon.path}/>
                  {/if}
                  <circle class="isha-star star-1" cx="16" cy="12" r="1.5"/>
                  <circle class="isha-star star-2" cx="68" cy="18" r="1.2"/>
                  <circle class="isha-star star-3" cx="24" cy="38" r="1"/>
                  <circle class="isha-star star-4" cx="58" cy="40" r="1.3"/>
                  <circle class="isha-star star-5" cx="12" cy="30" r="0.8"/>
                  <!-- Shooting star (tail trails behind, star at front moving down-left) -->
                  <g class="shooting-star">
                    <line x1="12" y1="0" x2="0" y2="8" stroke="url(#shootingStarGrad)" stroke-width="1.5" stroke-linecap="round"/>
                    <circle cx="0" cy="8" r="1" fill="var(--theme-accent-bright)"/>
                  </g>
                </svg>
              {/if}
            </div>
            {/key}
            <div class="current-arabic engrave-in">{prayerNames[$currentPrayer.current]?.ar || 'العشاء'}</div>
            <div class="current-name" in:fly={{ y: 6, duration: 500, delay: 100, easing: cubicOut }} out:fly={{ y: -6, duration: 200 }}>{prayerNames[$currentPrayer.current]?.en || 'Isha'}</div>
          {/key}
          <div class="tap-hint" class:blurred={overlayOpen}>tap for full clock</div>
          {#key $currentPrayer.current}
            <div class="current-time" in:fly={{ y: 4, duration: 500, delay: 150, easing: cubicOut }} out:fly={{ y: -4, duration: 200 }}>{formatTime($prayerTimes[$currentPrayer.current])}</div>
          {/key}
        </div>

        <div class="prayer-divider" in:fade={{ duration: 350, delay: 200 }}>
          <span class="divider-line"></span>
          <span class="divider-countdown">{formatCountdown($todayCountdown)}</span>
          <span class="divider-line"></span>
        </div>

        <div class="next-prayer" in:fly={{ y: 12, duration: 400, delay: 250 }}>
          <span class="next-label">Next</span>
          {#key $todayCurrentPrayer.next}
            <span class="next-name" in:fly={{ y: 4, duration: 500, easing: cubicOut }} out:fly={{ y: -4, duration: 200 }}>{prayerNames[$todayCurrentPrayer.next]?.en}</span>
            <span class="next-time" in:fly={{ y: 4, duration: 500, delay: 50, easing: cubicOut }} out:fly={{ y: -4, duration: 200 }}>{formatTime($todayPrayerTimes[$todayCurrentPrayer.next])}</span>
          {/key}
        </div>

        <!-- All prayer times -->
        <div class="all-times-stage">
          {#key $dateOffset}
            <div
              class="all-times"
              in:dateListSlide={{ direction: dateSwipeDirection > 0 ? 1 : -1, duration: 420 }}
              out:dateListSlide={{ direction: dateSwipeDirection > 0 ? -1 : 1, duration: 420 }}
            >
              {#each prayerListOrder as prayer}
                {@const isActive = $currentPrayer.current === prayer}
                {@const activeIndex = prayerListOrder.indexOf($currentPrayer.current)}
                {@const thisIndex = prayerListOrder.indexOf(prayer)}
                {@const isPast = thisIndex < activeIndex}
                {@const isFuture = thisIndex > activeIndex}
                <div class="time-row" class:active={isActive} class:past={isPast} class:future={isFuture}>
                  <span class="time-name">{prayerNames[prayer]?.en}</span>
                  <span class="time-dots"></span>
                  <span class="time-value">{formatTime($prayerTimes[prayer])}</span>
                </div>
              {/each}
            </div>
          {/key}
        </div>
      </div>
    {/if}

    <!-- Dates at bottom (both views) -->
    <div class="dates-row" class:blurred={overlayOpen}>
      <button class="date-nav date-nav-prev" type="button" aria-label="Previous day" on:click|stopPropagation={() => shiftDate(-1)}>
        <svg class="date-nav-icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M15 5.5 L8.5 12 L15 18.5" />
        </svg>
      </button>

      <button class="date-core" type="button" aria-label="Open calendar" on:click|stopPropagation={openCalendar}>
        <span class="date-offset">{getOffsetLabel($dateOffset)}</span>
        <div class="date-line">
          <span class="date-hijri">{hijriDate}</span>
          <span class="date-separator">·</span>
          <span class="date-gregorian">{gregorianDate}</span>
        </div>
      </button>

      <button class="date-nav date-nav-next" type="button" aria-label="Next day" on:click|stopPropagation={() => shiftDate(1)}>
        <svg class="date-nav-icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M9 5.5 L15.5 12 L9 18.5" />
        </svg>
      </button>
    </div>

    {#if calendarOpen}
      <button
        class="calendar-backdrop"
        type="button"
        aria-label="Close calendar"
        on:click|stopPropagation={closeCalendarToHome}
        transition:fade={{ duration: 180 }}
      ></button>

      <div
        class="calendar-dialog"
        role="dialog"
        aria-modal="true"
        aria-label="Choose date"
      >
        <div
          class="calendar-sheet"
          on:touchstart={handleCalendarTouchStart}
          on:touchend={handleCalendarTouchEnd}
          transition:scale={{ duration: 260, start: 0.96, opacity: 0 }}
        >
          <div class="calendar-header">
            <button class="calendar-month-nav" type="button" aria-label="Previous month" on:click|stopPropagation={() => shiftCalendarMonth(-1)}>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M15 5.5 L8.5 12 L15 18.5" />
              </svg>
            </button>
            <div class="calendar-month-titles">
              <div class="calendar-month-label">{getCalendarMonthLabel(calendarMonth)}</div>
              <div class="calendar-hijri-months">
                {#each calendarHijriMonths as month}
                  <span class="calendar-hijri-month" class:active={month.key === activeCalendarHijriMonthKey}>
                    {month.name}
                  </span>
                {/each}
              </div>
            </div>
            <button class="calendar-month-nav" type="button" aria-label="Next month" on:click|stopPropagation={() => shiftCalendarMonth(1)}>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M9 5.5 L15.5 12 L9 18.5" />
              </svg>
            </button>
          </div>

          <div class="calendar-grid-stage">
            {#key `${calendarMonth.getFullYear()}-${calendarMonth.getMonth()}`}
              <div
                class="calendar-grid-sheet"
                in:calendarMonthSlide={{ direction: calendarMonthSwipeDirection > 0 ? 1 : -1, duration: 360 }}
                out:calendarMonthSlide={{ direction: calendarMonthSwipeDirection > 0 ? -1 : 1, duration: 320 }}
              >
                <div class="calendar-weekdays">
                  {#each weekdayLabels as label}
                    <span>{label}</span>
                  {/each}
                </div>

                <div class="calendar-grid">
                  {#each calendarCells as cell}
                    {@const inMonth = cell.getMonth() === calendarMonth.getMonth()}
                    {@const isSelected = isSameDay(cell, selectedCalendarDate)}
                    {@const isToday = isSameDay(cell, todayCalendarDate)}
                    <button
                      class="calendar-day"
                      class:out-month={!inMonth}
                      class:selected={isSelected}
                      class:today={isToday}
                      type="button"
                      on:click|stopPropagation={() => selectCalendarDate(cell)}
                    >
                      <span class="calendar-day-greg">{cell.getDate()}</span>
                      <span class="calendar-day-hijri">{getHijriDayNumber(cell)}</span>
                    </button>
                  {/each}
                </div>
              </div>
            {/key}
          </div>

          <button class="calendar-today" type="button" on:click|stopPropagation={jumpCalendarToToday}>
            Back To Today
          </button>
        </div>
      </div>
    {/if}


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

  /* Qibla aligned pulse animation */
  @keyframes qiblaPulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.6; }
  }

  :global(.qibla-aligned) {
    animation: qiblaPulse 1.5s ease-in-out infinite;
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
    justify-content: center;
    padding: max(1.5rem, env(safe-area-inset-top, 1.5rem)) 1.5rem max(5.5rem, calc(env(safe-area-inset-bottom, 0px) + 5.5rem));
    overflow: hidden;
  }

  .home-header {
    position: absolute;
    top: 1.25rem;
    left: 1.5rem;
    right: 1.5rem;
    padding-top: env(safe-area-inset-top, 0px);
    display: flex;
    justify-content: space-between;
    align-items: center;
    z-index: 10;
  }

  /* Breathing glow - centered on prayer display */
  /* Glow intensity controlled by --theme-glow-intensity (1 for dark, 0.3 for light) */
  .breath-glow {
    position: absolute;
    top: 50%;
    left: 50%;
    border-radius: 50%;
    pointer-events: none;
    z-index: 0;
    opacity: var(--theme-glow-intensity, 1);
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

  .prayer-svg.maghrib .moon-fill {
    fill: var(--theme-accent-bright);
    opacity: 0;
    animation: crescentAppear 1.5s ease-out 0.5s forwards;
  }

  .prayer-svg.maghrib .moon-outline {
    fill: none;
    stroke: var(--theme-accent-bright);
    stroke-width: 0.3;
    opacity: 0;
    animation: crescentAppear 1.5s ease-out 0.5s forwards;
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
  .prayer-svg.isha .isha-moon-fill {
    fill: var(--theme-accent-bright);
  }

  .prayer-svg.isha .isha-moon-outline {
    fill: none;
    stroke: var(--theme-accent-bright);
    stroke-width: 0.5;
    opacity: 0.4;
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

  /* Shooting star animation */
  .prayer-svg.isha .shooting-star {
    opacity: 0;
    animation: shootingStar 10s linear infinite;
    animation-delay: 2s;
  }

  @keyframes shootingStar {
    0%, 75% {
      opacity: 0;
      transform: translate(70px, 2px);
    }
    76% {
      opacity: 1;
      transform: translate(65px, 5px);
    }
    90% {
      opacity: 0.6;
      transform: translate(20px, 35px);
    }
    91%, 100% {
      opacity: 0;
      transform: translate(15px, 38px);
    }
  }

  @keyframes starTwinkle {
    0%, 100% { opacity: 0.3; }
    50% { opacity: 1; }
  }

  .current-name {
    font-family: 'Cormorant Garamond', serif;
    font-size: 1.2rem;
    color: rgba(var(--theme-text-rgb), 0.5);
    letter-spacing: 0.5em;
    text-transform: uppercase;
    margin-top: 0.5rem;
  }

  .current-time {
    font-family: 'Outfit', sans-serif;
    font-size: clamp(2rem, 5vw, 2.5rem);
    font-weight: 300;
    color: rgba(var(--theme-text-rgb), 0.85);
    margin-top: clamp(0.5rem, 1.5vh, 1rem);
    letter-spacing: 0.05em;
  }

  /* Divider with countdown */
  .prayer-divider {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 1rem;
    margin: clamp(1rem, 2.5vh, 1.75rem) 0;
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
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }

  /* Next prayer */
  .next-prayer {
    display: flex;
    align-items: baseline;
    justify-content: center;
    gap: 0.6rem;
  }

  .next-label {
    font-family: 'Outfit', sans-serif;
    font-size: 0.85rem;
    font-weight: 400;
    color: rgba(var(--theme-text-rgb), 0.3);
    text-transform: uppercase;
    letter-spacing: 0.15em;
  }

  .next-name {
    font-family: 'Cormorant Garamond', serif;
    font-size: 1.5rem;
    color: rgba(var(--theme-text-rgb), 0.6);
  }

  .next-time {
    font-family: 'Outfit', sans-serif;
    font-size: 0.85rem;
    font-weight: 400;
    color: rgba(var(--theme-text-rgb), 0.5);
  }

  /* All prayer times list */
  .all-times-stage {
    margin-top: 1.25rem;
    margin-bottom: 1.25rem;
    width: 100%;
    max-width: min(320px, 85vw);
    margin-left: auto;
    margin-right: auto;
    min-height: 15rem;
    position: relative;
    overflow: hidden;
  }

  .all-times {
    position: absolute;
    inset: 0;
    display: grid;
    grid-template-columns: max-content 1fr max-content;
    column-gap: 0.75rem;
    row-gap: 0.75rem;
    align-content: flex-start;
    align-items: center;
  }

  .time-row {
    display: contents;
  }

  .time-name {
    font-family: 'Outfit', sans-serif;
    font-size: clamp(0.85rem, 2.5vw, 1.1rem);
    font-weight: 400;
    color: rgba(var(--theme-text-rgb), 0.55);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    white-space: nowrap;
  }

  .time-dots {
    height: 1px;
    background: linear-gradient(90deg,
      rgba(var(--theme-text-rgb), 0.1) 0%,
      rgba(var(--theme-text-rgb), 0.05) 50%,
      rgba(var(--theme-text-rgb), 0.1) 100%
    );
    background-size: 4px 1px;
  }

  .time-value {
    font-family: 'Outfit', sans-serif;
    font-size: clamp(0.95rem, 2.8vw, 1.25rem);
    font-weight: 300;
    color: rgba(var(--theme-text-rgb), 0.7);
    font-variant-numeric: tabular-nums;
    text-align: right;
    white-space: nowrap;
  }

  .time-row.past .time-name,
  .time-row.past .time-value {
    color: rgba(var(--theme-text-rgb), 0.25);
  }

  .time-row.past .time-dots {
    background: linear-gradient(90deg,
      rgba(var(--theme-text-rgb), 0.06) 0%,
      rgba(var(--theme-text-rgb), 0.03) 50%,
      rgba(var(--theme-text-rgb), 0.06) 100%
    );
  }

  .time-row.future .time-name,
  .time-row.future .time-value {
    color: rgba(var(--theme-text-rgb), 0.85);
  }

  .time-row.future .time-dots {
    background: linear-gradient(90deg,
      rgba(var(--theme-text-rgb), 0.18) 0%,
      rgba(var(--theme-text-rgb), 0.08) 50%,
      rgba(var(--theme-text-rgb), 0.18) 100%
    );
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
    bottom: 0;
    left: 0;
    right: 0;
    /* Account for iOS home indicator */
    padding-bottom: max(1.25rem, env(safe-area-inset-bottom, 1.25rem));
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 0.65rem;
    transition: filter 0.3s ease-out;
    z-index: 3;
  }

  .date-nav {
    width: clamp(3.2rem, 9.2vw, 4rem);
    height: clamp(3.2rem, 9.2vw, 4rem);
    border-radius: 999px;
    border: 1px solid rgba(var(--theme-text-rgb), 0.16);
    background: rgba(var(--theme-text-rgb), 0.04);
    color: rgba(var(--theme-text-rgb), 0.68);
    padding: 0;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    transition: all 0.24s ease;
  }

  .date-nav-icon {
    width: clamp(1.58rem, 4.7vw, 1.95rem);
    height: clamp(1.58rem, 4.7vw, 1.95rem);
    display: block;
    stroke: currentColor;
    stroke-width: 2.6;
    stroke-linecap: round;
    stroke-linejoin: round;
    fill: none;
  }

  .date-nav:active {
    transform: scale(0.96);
  }

  .date-core {
    min-width: min(250px, 72vw);
    border: 1px solid rgba(var(--theme-accent-rgb), 0.18);
    border-radius: 999px;
    background: linear-gradient(
      120deg,
      rgba(var(--theme-accent-rgb), 0.08),
      rgba(var(--theme-text-rgb), 0.03)
    );
    padding: 0.3rem 0.8rem 0.4rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.12rem;
    backdrop-filter: blur(6px);
    cursor: pointer;
    transition: border-color 0.25s ease, transform 0.2s ease;
    appearance: none;
    -webkit-appearance: none;
    outline: none;
    color: inherit;
  }

  .date-core:active {
    transform: scale(0.99);
  }

  .date-core:hover {
    border-color: rgba(var(--theme-accent-rgb), 0.32);
  }

  .date-offset {
    font-family: 'Outfit', sans-serif;
    font-size: 0.58rem;
    text-transform: uppercase;
    letter-spacing: 0.16em;
    color: rgba(var(--theme-accent-bright-rgb), 0.56);
  }

  .calendar-backdrop {
    position: fixed;
    inset: 0;
    z-index: 1200;
    background: rgba(4, 6, 14, 0.22);
    border: 0;
    backdrop-filter: blur(2px);
  }

  .calendar-dialog {
    position: fixed;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: clamp(1.4rem, 4vh, 2.5rem) clamp(1.4rem, 6vw, 3rem);
    background:
      radial-gradient(circle at 50% 35%, rgba(var(--theme-accent-rgb), 0.12), transparent 60%),
      linear-gradient(180deg, rgba(var(--theme-text-rgb), 0.06), rgba(var(--theme-text-rgb), 0.03));
    backdrop-filter: blur(18px) saturate(125%);
    z-index: 1201;
    pointer-events: none;
  }

  .calendar-sheet {
    width: min(500px, 86vw);
    min-height: min(74vh, 660px);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: clamp(0.9rem, 2vh, 1.2rem);
    pointer-events: auto;
  }

  .calendar-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
  }

  .calendar-month-label {
    font-family: 'Cormorant Garamond', serif;
    font-size: clamp(1.3rem, 3.7vw, 1.9rem);
    letter-spacing: 0.06em;
    color: rgba(var(--theme-accent-bright-rgb), 0.9);
  }

  .calendar-month-titles {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.12rem;
  }

  .calendar-hijri-months {
    display: flex;
    align-items: center;
    gap: 0.45rem;
    flex-wrap: wrap;
    justify-content: center;
    max-width: min(72vw, 360px);
  }

  .calendar-hijri-month {
    font-family: 'Amiri', serif;
    font-size: clamp(0.74rem, 2.1vw, 0.88rem);
    letter-spacing: 0.04em;
    color: rgba(var(--theme-text-rgb), 0.5);
    transition: color 0.2s ease, text-shadow 0.2s ease;
  }

  .calendar-hijri-month.active {
    color: rgba(var(--theme-accent-rgb), 0.82);
    text-shadow: 0 0 14px rgba(var(--theme-accent-rgb), 0.22);
  }

  .calendar-month-nav {
    width: clamp(2.35rem, 7vw, 2.9rem);
    height: clamp(2.35rem, 7vw, 2.9rem);
    border-radius: 999px;
    border: 1px solid rgba(var(--theme-text-rgb), 0.12);
    background: rgba(var(--theme-text-rgb), 0.08);
    color: rgba(var(--theme-text-rgb), 0.72);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    transition: all 0.2s ease;
  }

  .calendar-month-nav:active {
    transform: scale(0.96);
  }

  .calendar-month-nav svg {
    width: 1.06rem;
    height: 1.06rem;
    stroke: currentColor;
    stroke-width: 2.4;
    stroke-linecap: round;
    stroke-linejoin: round;
    fill: none;
  }

  .calendar-weekdays {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    width: 100%;
    gap: 0.5rem;
  }

  .calendar-weekdays span {
    text-align: center;
    font-family: 'Outfit', sans-serif;
    font-size: clamp(0.62rem, 1.8vw, 0.76rem);
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: rgba(var(--theme-text-rgb), 0.42);
  }

  .calendar-grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    width: 100%;
    gap: clamp(0.42rem, 1.4vw, 0.62rem);
    justify-items: center;
  }

  .calendar-grid-stage {
    width: 100%;
    min-height: clamp(21rem, 54vh, 25rem);
    position: relative;
    overflow: hidden;
  }

  .calendar-grid-sheet {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    gap: 0.65rem;
  }

  .calendar-day {
    width: clamp(2.45rem, 10.5vw, 3.3rem);
    aspect-ratio: 1;
    border-radius: 50%;
    border: 1px solid rgba(var(--theme-text-rgb), 0.09);
    background: rgba(var(--theme-text-rgb), 0.09);
    color: rgba(var(--theme-text-rgb), 0.78);
    font-family: 'Outfit', sans-serif;
    font-size: clamp(0.85rem, 2.4vw, 1rem);
    font-weight: 400;
    font-variant-numeric: tabular-nums;
    transition: all 0.22s ease;
    padding: 0;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    gap: 0.05rem;
  }

  .calendar-day-greg {
    font-family: 'Outfit', sans-serif;
    font-size: clamp(0.84rem, 2.3vw, 1rem);
    line-height: 1;
  }

  .calendar-day-hijri {
    font-family: 'Amiri', serif;
    font-size: clamp(0.5rem, 1.5vw, 0.62rem);
    line-height: 1;
    color: rgba(var(--theme-accent-rgb), 0.55);
  }

  .calendar-day.out-month {
    color: rgba(var(--theme-text-rgb), 0.3);
    background: transparent;
    border-color: rgba(var(--theme-text-rgb), 0.04);
  }

  .calendar-day.out-month .calendar-day-hijri {
    color: rgba(var(--theme-text-rgb), 0.22);
  }

  .calendar-day.today {
    border-color: rgba(var(--theme-accent-rgb), 0.45);
    color: rgba(var(--theme-accent-bright-rgb), 0.92);
  }

  .calendar-day.selected {
    border-color: rgba(var(--theme-accent-rgb), 0.7);
    background: radial-gradient(circle at 35% 30%, rgba(var(--theme-accent-bright-rgb), 0.4), rgba(var(--theme-accent-rgb), 0.27));
    color: rgba(var(--theme-accent-bright-rgb), 1);
    box-shadow: 0 0 30px rgba(var(--theme-accent-rgb), 0.3);
  }

  .calendar-day.selected .calendar-day-hijri {
    color: rgba(var(--theme-accent-bright-rgb), 0.92);
  }

  .calendar-today {
    margin-top: 0.4rem;
    min-width: min(320px, 72vw);
    border-radius: 999px;
    border: 1px solid rgba(var(--theme-accent-rgb), 0.24);
    background: linear-gradient(
      120deg,
      rgba(var(--theme-accent-rgb), 0.12),
      rgba(var(--theme-text-rgb), 0.05)
    );
    color: rgba(var(--theme-accent-bright-rgb), 0.9);
    font-family: 'Outfit', sans-serif;
    font-size: clamp(0.68rem, 1.8vw, 0.8rem);
    text-transform: uppercase;
    letter-spacing: 0.14em;
    padding: 0.66rem 1.2rem;
  }

  .date-line {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.55rem;
  }

  .date-hijri {
    font-family: 'Amiri', serif;
    font-size: 0.74rem;
    color: rgba(var(--theme-accent-bright-rgb), 0.5);
  }

  .date-separator {
    color: rgba(var(--theme-text-rgb), 0.2);
  }

  .date-gregorian {
    font-family: 'Outfit', sans-serif;
    font-size: 0.7rem;
    font-weight: 300;
    color: rgba(var(--theme-text-rgb), 0.35);
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
    font-size: calc(clamp(0.5rem, 1.8vw, 0.7rem) * var(--label-scale, 1));
    font-weight: 500;
    color: rgba(var(--theme-text-rgb), 0.35);
    text-transform: uppercase;
    letter-spacing: 0.12em;
    margin-bottom: 0.15rem;
  }

  .clock-label-time {
    display: block;
    font-family: 'Outfit', sans-serif;
    font-size: calc(clamp(0.65rem, 2.2vw, 0.9rem) * var(--label-scale, 1));
    font-weight: 300;
    color: rgba(var(--theme-text-rgb), 0.55);
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

  /* First third (Hanbali Isha) label */
  .clock-label.first-third .clock-label-name {
    color: rgba(var(--theme-accent-rgb), 0.5);
  }

  .clock-label.first-third .clock-label-time {
    color: rgba(var(--theme-accent-rgb), 0.4);
  }

  .clock-label.first-third.active .clock-label-name {
    color: rgba(var(--theme-accent-bright-rgb), 0.95);
    text-shadow: 0 0 12px rgba(var(--theme-accent-rgb), 0.5);
  }

  .clock-label.first-third.active .clock-label-time {
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
    font-size: 2.8rem;
    color: var(--theme-accent-bright);
    line-height: 1.2;
    text-shadow: 0 0 20px rgba(var(--theme-accent-rgb), 0.3);
  }

  .clock-center-english {
    font-family: 'Cormorant Garamond', serif;
    font-size: 1rem;
    font-weight: 500;
    color: rgba(var(--theme-text-rgb), 0.5);
    text-transform: uppercase;
    letter-spacing: 0.15em;
    margin-top: 0.2rem;
  }

  .clock-center-countdown {
    font-family: 'Outfit', sans-serif;
    font-size: 1.5rem;
    font-weight: 200;
    color: rgba(var(--theme-text-rgb), 0.8);
    margin-top: 0.6rem;
  }

  .clock-center-next {
    font-family: 'Outfit', sans-serif;
    font-size: 0.75rem;
    color: rgba(var(--theme-accent-rgb), 0.6);
    margin-top: 0.3rem;
    letter-spacing: 0.1em;
  }

  /* Clock indicators info */
  .clock-indicators {
    position: absolute;
    bottom: clamp(80px, 15vh, 120px);
    left: 50%;
    transform: translateX(-50%);
    text-align: center;
    transition: filter 0.3s ease;
  }

  .clock-indicators.blurred {
    filter: blur(8px);
    opacity: 0.5;
  }

  .indicator-active {
    font-family: 'Outfit', sans-serif;
    font-size: 0.8rem;
    font-weight: 400;
    color: rgba(var(--theme-accent-rgb), 0.9);
    letter-spacing: 0.05em;
    padding: 0.4rem 0.8rem;
    background: rgba(var(--theme-accent-rgb), 0.1);
    border-radius: 1rem;
  }

  .compass-enable {
    position: absolute;
    bottom: calc(max(1.25rem, env(safe-area-inset-bottom, 0px)) + clamp(4.75rem, 11vh, 6.25rem));
    left: 50%;
    transform: translateX(-50%);
    font-family: 'Outfit', sans-serif;
    font-size: 0.7rem;
    font-weight: 400;
    color: var(--theme-marker);
    letter-spacing: 0.05em;
    padding: 0.4rem 0.8rem;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 1.5rem;
    cursor: pointer;
    transition: all 0.2s ease;
    z-index: 4;
  }

  .compass-enable:hover {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.2);
  }

  .compass-enable.blurred {
    filter: blur(8px);
    opacity: 0.5;
  }

  .indicator-upcoming {
    font-family: 'Outfit', sans-serif;
    font-size: 0.7rem;
    font-weight: 400;
    color: rgba(var(--theme-text-rgb), 0.4);
    letter-spacing: 0.05em;
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

    .date-nav {
      width: 2.95rem;
      height: 2.95rem;
    }

    .date-nav-icon {
      width: 1.42rem;
      height: 1.42rem;
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

    .date-nav {
      width: 2.7rem;
      height: 2.7rem;
    }

    .date-nav-icon {
      width: 1.28rem;
      height: 1.28rem;
    }
  }

  @media (max-height: 700px) {
    .prayer-divider {
      margin: 1.25rem 0;
    }

    .all-times-stage {
      margin-top: 1rem;
      margin-bottom: 1rem;
      min-height: 13rem;
    }

    .all-times {
      gap: 0.4rem;
    }

    .dates-row {
      bottom: 1rem;
    }

    .date-core {
      padding: 0.24rem 0.68rem 0.32rem;
    }

    .date-nav {
      width: 2.9rem;
      height: 2.9rem;
    }

    .date-nav-icon {
      width: 1.38rem;
      height: 1.38rem;
    }

    .compass-enable {
      bottom: calc(max(0.9rem, env(safe-area-inset-bottom, 0px)) + clamp(4.15rem, 12vh, 5.4rem));
      font-size: 0.66rem;
      padding: 0.34rem 0.7rem;
    }
  }

  @media (max-height: 600px) {
    .all-times-stage {
      margin-top: 1rem;
      min-height: 11rem;
    }

    .all-times {
      gap: 0.4rem;
    }

    .time-name {
      font-size: 0.75rem;
    }

    .time-value {
      font-size: 0.8rem;
    }

    .date-nav {
      width: 2.45rem;
      height: 2.45rem;
    }

    .date-nav-icon {
      width: 1.14rem;
      height: 1.14rem;
    }

    .date-core {
      min-width: min(228px, 72vw);
      padding: 0.2rem 0.6rem 0.28rem;
    }

    .date-hijri {
      font-size: 0.66rem;
    }

    .date-gregorian {
      font-size: 0.62rem;
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
