import { writable, derived } from 'svelte/store';
import * as adhan from 'adhan';

const Coordinates = adhan.Coordinates;
const CalculationMethod = adhan.CalculationMethod;
const PrayerTimes = adhan.PrayerTimes;
const Qibla = adhan.Qibla;

// User location store (includes timezone for proper time display)
export const location = writable({
  latitude: 21.4225,  // Default: Mecca
  longitude: 39.8262,
  name: 'Mecca',
  timezone: 'Asia/Riyadh'
});

// Fetch timezone for coordinates using TimeAPI.io
export async function fetchTimezone(lat, lng) {
  try {
    const response = await fetch(
      `https://timeapi.io/api/TimeZone/coordinate?latitude=${lat}&longitude=${lng}`
    );
    const data = await response.json();
    return data.timeZone || null;
  } catch (e) {
    console.error('Failed to fetch timezone:', e);
    return null;
  }
}

// Calculation method store
export const calculationMethod = writable('MuslimWorldLeague');

// Custom angles for prayer calculation
export const customAngles = writable({ fajr: 18, isha: 17 });

// Settings open state (for blur effect)
export const settingsOpen = writable(false);

// Clock indicators store (which special times to show)
// Max 3 arcs can be enabled at once
const defaultIndicators = {
  sunrise: true,        // Sunrise marker (default on)
  qibla: true,          // Qibla compass needle (default on)
  lastThird: true,      // Last third of night (default on)
  firstThirdEnd: true,  // End of first third (Hanbali Isha) - diamond only
  fridayDua: true,      // Friday Asr-Maghrib (only shows on Fridays)
  qaylula: false,       // Mid-day rest time
  duha: false           // Morning prayer time
};

function createIndicatorsStore() {
  // Load from localStorage
  let initial = defaultIndicators;
  if (typeof localStorage !== 'undefined') {
    const saved = localStorage.getItem('athan-indicators');
    if (saved) {
      initial = { ...defaultIndicators, ...JSON.parse(saved) };
    }
  }

  const { subscribe, set, update } = writable(initial);

  return {
    subscribe,
    toggle: (key) => {
      update(state => {
        const newState = { ...state, [key]: !state[key] };
        // Save to localStorage
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('athan-indicators', JSON.stringify(newState));
        }
        return newState;
      });
    },
    set: (value) => {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('athan-indicators', JSON.stringify(value));
      }
      set(value);
    }
  };
}

export const clockIndicators = createIndicatorsStore();

// Label size store (controls clock label font size)
const defaultLabelSize = 'medium'; // 'small', 'medium', 'large'

function createLabelSizeStore() {
  let initial = defaultLabelSize;
  if (typeof localStorage !== 'undefined') {
    const saved = localStorage.getItem('athan-label-size');
    if (saved) {
      initial = saved;
    }
  }

  const { subscribe, set } = writable(initial);

  return {
    subscribe,
    set: (value) => {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('athan-label-size', value);
      }
      set(value);
    }
  };
}

export const labelSize = createLabelSizeStore();

// Current time store (updates every second)
export const currentTime = writable(new Date());

// Update current time every second
if (typeof window !== 'undefined') {
  setInterval(() => {
    currentTime.set(new Date());
  }, 1000);
}

// Get current time in city's timezone as a comparable Date
// This converts the current moment to "what time is showing on a clock in that city"
function getCityTime(cityTimezone) {
  if (!cityTimezone) return new Date();

  const now = new Date();
  // Get the time string in the city's timezone
  const cityTimeStr = now.toLocaleString('en-US', {
    timeZone: cityTimezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });

  // Parse it back to a Date (this Date will have the city's wall clock time)
  const [datePart, timePart] = cityTimeStr.split(', ');
  const [month, day, year] = datePart.split('/');
  const [hour, minute, second] = timePart.split(':');

  return new Date(year, month - 1, day, hour, minute, second);
}

// Check if current date is in Ramadan (Hijri month 9)
function isRamadan(date) {
  try {
    const hijri = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', {
      month: 'numeric'
    }).format(date);
    return parseInt(hijri) === 9;
  } catch (e) {
    return false;
  }
}

// Prayer times derived from location, method, and custom angles
export const prayerTimes = derived(
  [location, calculationMethod, customAngles],
  ([$location, $method, $angles]) => {
    try {
      const coords = new Coordinates($location.latitude, $location.longitude);
      let params;

      if ($method === 'Custom') {
        // Use custom angles with MuslimWorldLeague as base
        params = CalculationMethod.MuslimWorldLeague();
        params.fajrAngle = $angles.fajr;
        params.ishaAngle = $angles.isha;
      } else {
        params = CalculationMethod[$method]();
      }

      // Use the city's current date for calculation
      const date = getCityTime($location.timezone);

      // Umm al-Qura uses 120 min for Isha during Ramadan (instead of 90)
      if ($method === 'UmmAlQura' && isRamadan(date)) {
        params.adjustments = { ...params.adjustments, isha: 30 };
      }

      const times = new PrayerTimes(coords, date, params);

      return {
        fajr: times.fajr,
        sunrise: times.sunrise,
        dhuhr: times.dhuhr,
        asr: times.asr,
        maghrib: times.maghrib,
        isha: times.isha
      };
    } catch (e) {
      console.error('Prayer time calculation error:', e);
      const now = new Date();
      return {
        fajr: now,
        sunrise: now,
        dhuhr: now,
        asr: now,
        maghrib: now,
        isha: now
      };
    }
  }
);

// Current and next prayer (uses city timezone for comparison)
export const currentPrayer = derived(
  [prayerTimes, currentTime, location],
  ([$times, $now, $location]) => {
    if (!$times || !$times.fajr) {
      return { current: 'isha', next: 'fajr', nextTime: new Date() };
    }

    // Get current time in the city's timezone for proper comparison
    const cityNow = getCityTime($location.timezone);

    // Convert prayer times to comparable format (hours/minutes in city timezone)
    const getCityHoursMinutes = (date) => {
      const str = date.toLocaleTimeString('en-US', {
        timeZone: $location.timezone,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      });
      const [h, m] = str.split(':').map(Number);
      return h * 60 + m;
    };

    const nowMinutes = cityNow.getHours() * 60 + cityNow.getMinutes();
    const prayers = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'];

    for (let i = prayers.length - 1; i >= 0; i--) {
      const prayerMinutes = getCityHoursMinutes($times[prayers[i]]);
      if (nowMinutes >= prayerMinutes) {
        return {
          current: prayers[i],
          next: prayers[(i + 1) % prayers.length],
          nextTime: i === prayers.length - 1
            ? new Date($times.fajr.getTime() + 24 * 60 * 60 * 1000) // Next day fajr
            : $times[prayers[(i + 1) % prayers.length]]
        };
      }
    }

    // Before fajr
    return {
      current: 'isha',
      next: 'fajr',
      nextTime: $times.fajr
    };
  }
);

// Time until next prayer (uses city timezone)
export const countdown = derived(
  [currentPrayer, currentTime, location, prayerTimes],
  ([$prayer, $now, $location, $times]) => {
    if (!$prayer || !$times) {
      return { hours: 0, minutes: 0, seconds: 0, total: 0 };
    }

    // Get current time in city's timezone
    const cityNow = getCityTime($location.timezone);
    const nowMinutes = cityNow.getHours() * 60 + cityNow.getMinutes();
    const nowSeconds = cityNow.getSeconds();

    // Get next prayer time in city's timezone
    const nextPrayer = $prayer.next;
    const nextTime = $times[nextPrayer];
    if (!nextTime) {
      return { hours: 0, minutes: 0, seconds: 0, total: 0 };
    }

    const nextStr = nextTime.toLocaleTimeString('en-US', {
      timeZone: $location.timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
    const [nextH, nextM] = nextStr.split(':').map(Number);
    let nextMinutes = nextH * 60 + nextM;

    // If next prayer is tomorrow (e.g., Fajr after Isha)
    if (nextMinutes <= nowMinutes && $prayer.current === 'isha') {
      nextMinutes += 24 * 60; // Add a day
    }

    const diffMinutes = nextMinutes - nowMinutes;
    const diffSeconds = (diffMinutes * 60) - nowSeconds;

    const hours = Math.floor(diffSeconds / 3600);
    const minutes = Math.floor((diffSeconds % 3600) / 60);
    const seconds = diffSeconds % 60;

    return { hours, minutes, seconds: Math.max(0, seconds), total: diffSeconds * 1000 };
  }
);

// Qibla direction
export const qiblaDirection = derived(location, ($loc) => {
  try {
    return Qibla(new Coordinates($loc.latitude, $loc.longitude));
  } catch (e) {
    return 0;
  }
});

// Prayer period for sky color (0-5 representing different times)
export const prayerPeriod = derived(currentPrayer, ($prayer) => {
  if (!$prayer) return 5;

  const periods = {
    fajr: 0,      // Dawn
    sunrise: 1,   // Morning
    dhuhr: 2,     // Midday
    asr: 3,       // Afternoon
    maghrib: 4,   // Sunset
    isha: 5       // Night
  };
  return periods[$prayer.current] ?? 5;
});

// City selector open state (for blur effect)
export const citySelectorOpen = writable(false);

// Prayer names in Arabic
export const prayerNames = {
  fajr: { en: 'Fajr', ar: 'الفجر' },
  sunrise: { en: 'Sunrise', ar: 'الشروق' },
  dhuhr: { en: 'Dhuhr', ar: 'الظهر' },
  asr: { en: 'Asr', ar: 'العصر' },
  maghrib: { en: 'Maghrib', ar: 'المغرب' },
  isha: { en: 'Isha', ar: 'العشاء' }
};

