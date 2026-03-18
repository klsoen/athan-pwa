import webpush from 'web-push';
import {
  deleteDeviceRecord,
  listDeviceRecords,
  saveDeviceRecord
} from './_lib/push-store.mjs';

function configureWebPush() {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;

  if (!publicKey || !privateKey || !subject) {
    throw new Error('Missing VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, or VAPID_SUBJECT.');
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
}

function createNotificationPayload(entry: { type: string; label: string; timeUtc: string }) {
  const title = entry.type === 'newIslamicMonth' ? 'New Islamic Month' : `${entry.label} reminder`;
  const body = entry.type === 'newIslamicMonth'
    ? 'Maghrib has entered with the start of a new Hijri month.'
    : `It is time for ${entry.label}.`;

  return JSON.stringify({
    title,
    body,
    tag: `azan-${entry.type}`,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    data: {
      type: entry.type,
      timeUtc: entry.timeUtc
    }
  });
}

export default async () => {
  configureWebPush();

  const now = Date.now();
  const minDueTime = now - (2 * 60 * 1000);
  const maxDueTime = now + (60 * 1000);
  const records = await listDeviceRecords();
  let sentCount = 0;

  for (const record of records) {
    if (!record.notificationsEnabled || !record.subscription?.endpoint) {
      continue;
    }

    const dueEntries = (record.schedule || []).filter((entry: { timeUtc: string; sent?: boolean; sentAt?: string | null }) => {
      if (entry.sent || entry.sentAt) return false;
      const scheduledTime = new Date(entry.timeUtc).getTime();
      return scheduledTime >= minDueTime && scheduledTime <= maxDueTime;
    });

    if (dueEntries.length === 0) {
      continue;
    }

    let shouldDeleteRecord = false;

    for (const entry of dueEntries) {
      try {
        await webpush.sendNotification(record.subscription, createNotificationPayload(entry));
        entry.sent = true;
        entry.sentAt = new Date().toISOString();
        sentCount += 1;
      } catch (error) {
        const statusCode = error && typeof error === 'object' && 'statusCode' in error
          ? Number(error.statusCode)
          : 0;

        if (statusCode === 404 || statusCode === 410) {
          shouldDeleteRecord = true;
          break;
        }

        console.error(`Failed to send push for ${record.deviceId}:`, error);
      }
    }

    if (shouldDeleteRecord) {
      await deleteDeviceRecord(record.deviceId);
      continue;
    }

    record.schedule = (record.schedule || []).filter((entry: { timeUtc: string; sentAt?: string | null }) => {
      const scheduledTime = new Date(entry.timeUtc).getTime();
      return scheduledTime > now - (24 * 60 * 60 * 1000) && (!entry.sentAt || scheduledTime > now - (5 * 60 * 1000));
    });
    record.updatedAt = new Date().toISOString();
    await saveDeviceRecord(record);
  }

  return Response.json({ ok: true, sentCount, processed: records.length });
};

export const config = {
  schedule: '* * * * *'
};
