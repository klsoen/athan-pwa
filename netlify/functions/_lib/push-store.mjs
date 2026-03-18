import { getStore } from '@netlify/blobs';

const STORE_NAME = 'azan-push-subscriptions';

function getPushStore() {
  return getStore(STORE_NAME);
}

function sanitizeSchedule(schedule = []) {
  return schedule
    .filter((entry) => entry && entry.id && entry.type && entry.label && entry.timeUtc)
    .map((entry) => ({
      id: String(entry.id),
      type: String(entry.type),
      label: String(entry.label),
      timeUtc: String(entry.timeUtc),
      sent: Boolean(entry.sent),
      sentAt: entry.sentAt || null
    }))
    .sort((a, b) => new Date(a.timeUtc).getTime() - new Date(b.timeUtc).getTime())
    .slice(0, 1000);
}

export function normalizeDeviceRecord(payload) {
  if (!payload?.deviceId) {
    throw new Error('Missing deviceId.');
  }

  if (!payload?.subscription?.endpoint) {
    throw new Error('Missing push subscription endpoint.');
  }

  return {
    deviceId: String(payload.deviceId),
    notificationsEnabled: Boolean(payload.notificationsEnabled),
    subscription: payload.subscription,
    types: { ...(payload.types || {}) },
    schedule: sanitizeSchedule(payload.schedule),
    updatedAt: new Date().toISOString()
  };
}

export async function saveDeviceRecord(record) {
  const store = getPushStore();
  await store.set(record.deviceId, JSON.stringify(record));
  return record;
}

export async function loadDeviceRecord(deviceId) {
  const store = getPushStore();
  const raw = await store.get(deviceId, { type: 'text' });
  return raw ? JSON.parse(raw) : null;
}

export async function deleteDeviceRecord(deviceId) {
  const store = getPushStore();
  await store.delete(deviceId);
}

export async function listDeviceRecords() {
  const store = getPushStore();
  const records = [];
  let cursor;
  let hasMore = true;

  while (hasMore) {
    const page = await store.list(cursor ? { cursor } : {});

    for (const blob of page.blobs || []) {
      const raw = await store.get(blob.key, { type: 'text' });
      if (!raw) continue;

      try {
        records.push(JSON.parse(raw));
      } catch (error) {
        console.warn(`Skipping invalid blob record for ${blob.key}:`, error);
      }
    }

    hasMore = Boolean(page.hasMore);
    cursor = page.cursor;
  }

  return records;
}
