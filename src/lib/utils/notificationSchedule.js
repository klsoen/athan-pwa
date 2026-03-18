import { createPrayerTimesForDate, getCityTime } from '$lib/stores/prayer.js';

export const NOTIFICATION_HORIZON_DAYS = 60;

export const notificationDefinitions = [
  { id: 'fajr', label: 'Fajr', type: 'prayer' },
  { id: 'dhuhr', label: 'Dhuhr', type: 'prayer' },
  { id: 'asr', label: 'Asr', type: 'prayer' },
  { id: 'maghrib', label: 'Maghrib', type: 'prayer' },
  { id: 'isha', label: 'Isha', type: 'prayer' },
  { id: 'sunrise', label: 'Sunrise', type: 'marker' },
  { id: 'lastThird', label: 'Last Third', type: 'special' },
  { id: 'firstThirdEnd', label: '1st Third End', type: 'special' },
  { id: 'newIslamicMonth', label: 'New Islamic Month', type: 'special' }
];

export const notificationLabelMap = Object.fromEntries(
  notificationDefinitions.map((definition) => [definition.id, definition.label])
);

export const defaultNotificationPreferences = {
  enabled: false,
  types: {
    fajr: true,
    dhuhr: true,
    asr: true,
    maghrib: true,
    isha: true,
    sunrise: false,
    lastThird: false,
    firstThirdEnd: false,
    newIslamicMonth: true
  }
};

const hijriMonthFormatterCache = new Map();
function getMiddayDate(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0, 0);
}

function getHijriMonthFormatter(timeZone) {
  const key = timeZone || 'local';
  if (!hijriMonthFormatterCache.has(key)) {
    hijriMonthFormatterCache.set(key, new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', {
      timeZone,
      month: 'numeric',
      year: 'numeric'
    }));
  }

  return hijriMonthFormatterCache.get(key);
}

function extractParts(formatter, date) {
  const values = {};

  for (const part of formatter.formatToParts(date)) {
    if (part.type === 'literal') continue;
    values[part.type] = parseInt(part.value, 10);
  }

  if (values.hour === 24) {
    values.hour = 0;
  }

  return values;
}

function getHijriMonthKey(date, timeZone) {
  const parts = extractParts(getHijriMonthFormatter(timeZone), date);
  return `${parts.month}-${parts.year}`;
}

function createNightEvent(type, label, startTime, endTime, fraction) {
  if (!startTime || !endTime) return null;

  let durationMs = endTime.getTime() - startTime.getTime();
  if (durationMs < 0) durationMs += 24 * 60 * 60 * 1000;

  const eventTime = new Date(startTime.getTime() + (durationMs * fraction));

  return {
    id: `${type}-${eventTime.toISOString()}`,
    type,
    label,
    timeUtc: eventTime.toISOString(),
    sent: false
  };
}

function createScheduleEvent(type, label, date) {
  if (!date) return null;

  return {
    id: `${type}-${date.toISOString()}`,
    type,
    label,
    timeUtc: date.toISOString(),
    sent: false
  };
}

export function buildNotificationSchedule({
  location,
  method,
  angles,
  types,
  horizonDays = NOTIFICATION_HORIZON_DAYS,
  now = new Date()
}) {
  if (!location?.latitude || !location?.longitude) return [];

  const cityToday = getMiddayDate(getCityTime(location.timezone));
  const timeZone = location.timezone;
  const prayerDays = [];

  for (let offset = 0; offset <= horizonDays; offset += 1) {
    const day = new Date(cityToday);
    day.setDate(cityToday.getDate() + offset);
    prayerDays.push({
      day,
      times: createPrayerTimesForDate(location, method, angles, day)
    });
  }

  const schedule = [];

  for (let index = 0; index < prayerDays.length - 1; index += 1) {
    const currentDay = prayerDays[index];
    const nextDay = prayerDays[index + 1];
    const { times } = currentDay;

    if (types.fajr) schedule.push(createScheduleEvent('fajr', 'Fajr', times.fajr));
    if (types.dhuhr) schedule.push(createScheduleEvent('dhuhr', 'Dhuhr', times.dhuhr));
    if (types.asr) schedule.push(createScheduleEvent('asr', 'Asr', times.asr));
    if (types.maghrib) schedule.push(createScheduleEvent('maghrib', 'Maghrib', times.maghrib));
    if (types.isha) schedule.push(createScheduleEvent('isha', 'Isha', times.isha));
    if (types.sunrise) schedule.push(createScheduleEvent('sunrise', 'Sunrise', times.sunrise));

    if (types.lastThird) {
      schedule.push(createNightEvent('lastThird', 'Last Third', times.maghrib, nextDay.times.fajr, 2 / 3));
    }

    if (types.firstThirdEnd) {
      schedule.push(createNightEvent('firstThirdEnd', '1st Third End', times.maghrib, nextDay.times.fajr, 1 / 3));
    }

    if (types.newIslamicMonth) {
      const currentHijriKey = getHijriMonthKey(currentDay.day, timeZone);
      const nextHijriKey = getHijriMonthKey(nextDay.day, timeZone);

      if (currentHijriKey !== nextHijriKey) {
        schedule.push(createScheduleEvent('newIslamicMonth', 'New Islamic Month', times.maghrib));
      }
    }
  }

  return schedule
    .filter(Boolean)
    .filter((entry) => new Date(entry.timeUtc).getTime() > now.getTime() + 5000)
    .sort((a, b) => new Date(a.timeUtc).getTime() - new Date(b.timeUtc).getTime());
}
