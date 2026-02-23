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

// Current time store (updates every second)
export const currentTime = writable(new Date());

// Update current time every second
if (typeof window !== 'undefined') {
  setInterval(() => {
    currentTime.set(new Date());
  }, 1000);
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

      const date = new Date();
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

// Current and next prayer
export const currentPrayer = derived(
  [prayerTimes, currentTime],
  ([$times, $now]) => {
    if (!$times || !$times.fajr) {
      return { current: 'isha', next: 'fajr', nextTime: new Date() };
    }

    const prayers = ['fajr', 'sunrise', 'dhuhr', 'asr', 'maghrib', 'isha'];

    for (let i = prayers.length - 1; i >= 0; i--) {
      if ($now >= $times[prayers[i]]) {
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

// Time until next prayer
export const countdown = derived(
  [currentPrayer, currentTime],
  ([$prayer, $now]) => {
    if (!$prayer || !$prayer.nextTime) {
      return { hours: 0, minutes: 0, seconds: 0, total: 0 };
    }

    const diff = $prayer.nextTime - $now;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    return { hours, minutes, seconds, total: diff };
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

