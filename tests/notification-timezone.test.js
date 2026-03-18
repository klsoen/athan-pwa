import test from 'node:test';
import assert from 'node:assert/strict';
import * as adhan from 'adhan';

function createPrayerTimesForDate(loc, method, angles, date) {
  const coords = new adhan.Coordinates(loc.latitude, loc.longitude);
  let params;

  if (method === 'Custom') {
    params = adhan.CalculationMethod.MuslimWorldLeague();
    params.fajrAngle = angles.fajr;
    params.ishaAngle = angles.isha;
  } else {
    params = adhan.CalculationMethod[method]();
  }

  const times = new adhan.PrayerTimes(coords, date, params);
  return {
    fajr: times.fajr,
    sunrise: times.sunrise,
    dhuhr: times.dhuhr,
    asr: times.asr,
    maghrib: times.maghrib,
    isha: times.isha
  };
}

function createScheduleEvent(type, label, date) {
  return {
    id: `${type}-${date.toISOString()}`,
    type,
    label,
    timeUtc: date.toISOString(),
    sent: false
  };
}

function buildNotificationSchedule({ location, method, angles, types, now }) {
  const cityDate = new Date(2026, 2, 19, 12, 0, 0, 0);
  const times = createPrayerTimesForDate(location, method, angles, cityDate);
  const schedule = [];

  if (types.fajr) schedule.push(createScheduleEvent('fajr', 'Fajr', times.fajr));
  if (types.dhuhr) schedule.push(createScheduleEvent('dhuhr', 'Dhuhr', times.dhuhr));
  if (types.asr) schedule.push(createScheduleEvent('asr', 'Asr', times.asr));
  if (types.maghrib) schedule.push(createScheduleEvent('maghrib', 'Maghrib', times.maghrib));
  if (types.isha) schedule.push(createScheduleEvent('isha', 'Isha', times.isha));

  return schedule
    .filter((entry) => new Date(entry.timeUtc).getTime() > now.getTime())
    .sort((a, b) => new Date(a.timeUtc).getTime() - new Date(b.timeUtc).getTime());
}

function formatInTimezone(date, timeZone) {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).format(date);
}

function getTimePart(isoString, timeZone) {
  return formatInTimezone(new Date(isoString), timeZone).split(', ')[1].slice(0, 5);
}

test('Lahore schedule keeps prayer times intact when serialized to UTC', () => {
  const lahore = {
    latitude: 31.5497,
    longitude: 74.3436,
    timezone: 'Asia/Karachi'
  };

  const schedule = buildNotificationSchedule({
    location: lahore,
    method: 'MuslimWorldLeague',
    angles: { fajr: 18, isha: 17 },
    types: {
      fajr: true,
      dhuhr: true,
      asr: true,
      maghrib: true,
      isha: true
    },
    now: new Date('2026-03-18T00:00:00.000Z')
  });

  const firstDhuhr = schedule.find((entry) => entry.type === 'dhuhr');
  const firstAsr = schedule.find((entry) => entry.type === 'asr');
  const firstMaghrib = schedule.find((entry) => entry.type === 'maghrib');

  assert.ok(firstDhuhr);
  assert.ok(firstAsr);
  assert.ok(firstMaghrib);

  assert.equal(firstDhuhr.timeUtc, '2026-03-19T07:11:00.000Z');
  assert.equal(firstAsr.timeUtc, '2026-03-19T10:38:00.000Z');
  assert.equal(firstMaghrib.timeUtc, '2026-03-19T13:13:00.000Z');

  assert.equal(getTimePart(firstDhuhr.timeUtc, lahore.timezone), '12:11');
  assert.equal(getTimePart(firstAsr.timeUtc, lahore.timezone), '15:38');
  assert.equal(getTimePart(firstMaghrib.timeUtc, lahore.timezone), '18:13');
});
