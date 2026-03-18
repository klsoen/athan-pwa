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
const timeFormatterCache = new Map();

function getMiddayDate(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0, 0);
}

function getTimeFormatter(timeZone) {
  const key = timeZone || 'local';
  if (!timeFormatterCache.has(key)) {
    timeFormatterCache.set(key, new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }));
  }

  return timeFormatterCache.get(key);
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

function getZonedUtcDate(date, timeZone) {
  if (!timeZone) return new Date(date.getTime());

  const target = {
    year: date.getFullYear(),
    month: date.getMonth() + 1,
    day: date.getDate(),
    hour: date.getHours(),
    minute: date.getMinutes(),
    second: date.getSeconds(),
    millisecond: date.getMilliseconds()
  };

  let guess = new Date(Date.UTC(
    target.year,
    target.month - 1,
    target.day,
    target.hour,
    target.minute,
    target.second,
    target.millisecond
  ));

  const formatter = getTimeFormatter(timeZone);

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const zoned = extractParts(formatter, guess);
    const zonedUtc = Date.UTC(
      zoned.year,
      (zoned.month || 1) - 1,
      zoned.day || 1,
      zoned.hour || 0,
      zoned.minute || 0,
      zoned.second || 0,
      target.millisecond
    );
    const targetUtc = Date.UTC(
      target.year,
      target.month - 1,
      target.day,
      target.hour,
      target.minute,
      target.second,
      target.millisecond
    );
    const diff = targetUtc - zonedUtc;

    if (diff === 0) break;
    guess = new Date(guess.getTime() + diff);
  }

  return guess;
}

function getHijriMonthKey(date, timeZone) {
  const parts = extractParts(getHijriMonthFormatter(timeZone), date);
  return `${parts.month}-${parts.year}`;
}

function createNightEvent(type, label, startTime, endTime, fraction, timeZone) {
  if (!startTime || !endTime) return null;

  let durationMs = endTime.getTime() - startTime.getTime();
  if (durationMs < 0) durationMs += 24 * 60 * 60 * 1000;

  const eventTime = new Date(startTime.getTime() + (durationMs * fraction));
  const utcDate = getZonedUtcDate(eventTime, timeZone);

  return {
    id: `${type}-${utcDate.toISOString()}`,
    type,
    label,
    timeUtc: utcDate.toISOString(),
    sent: false
  };
}

function createScheduleEvent(type, label, date, timeZone) {
  if (!date) return null;

  const utcDate = getZonedUtcDate(date, timeZone);

  return {
    id: `${type}-${utcDate.toISOString()}`,
    type,
    label,
    timeUtc: utcDate.toISOString(),
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

    if (types.fajr) schedule.push(createScheduleEvent('fajr', 'Fajr', times.fajr, timeZone));
    if (types.dhuhr) schedule.push(createScheduleEvent('dhuhr', 'Dhuhr', times.dhuhr, timeZone));
    if (types.asr) schedule.push(createScheduleEvent('asr', 'Asr', times.asr, timeZone));
    if (types.maghrib) schedule.push(createScheduleEvent('maghrib', 'Maghrib', times.maghrib, timeZone));
    if (types.isha) schedule.push(createScheduleEvent('isha', 'Isha', times.isha, timeZone));
    if (types.sunrise) schedule.push(createScheduleEvent('sunrise', 'Sunrise', times.sunrise, timeZone));

    if (types.lastThird) {
      schedule.push(createNightEvent('lastThird', 'Last Third', times.maghrib, nextDay.times.fajr, 2 / 3, timeZone));
    }

    if (types.firstThirdEnd) {
      schedule.push(createNightEvent('firstThirdEnd', '1st Third End', times.maghrib, nextDay.times.fajr, 1 / 3, timeZone));
    }

    if (types.newIslamicMonth) {
      const currentHijriKey = getHijriMonthKey(currentDay.day, timeZone);
      const nextHijriKey = getHijriMonthKey(nextDay.day, timeZone);

      if (currentHijriKey !== nextHijriKey) {
        schedule.push(createScheduleEvent('newIslamicMonth', 'New Islamic Month', times.maghrib, timeZone));
      }
    }
  }

  return schedule
    .filter(Boolean)
    .filter((entry) => new Date(entry.timeUtc).getTime() > now.getTime() + 5000)
    .sort((a, b) => new Date(a.timeUtc).getTime() - new Date(b.timeUtc).getTime());
}
