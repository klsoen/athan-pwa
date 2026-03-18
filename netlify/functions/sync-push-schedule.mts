import { normalizeDeviceRecord, saveDeviceRecord } from './_lib/push-store.mjs';

export default async (req: Request) => {
  try {
    const payload = await req.json();
    const record = normalizeDeviceRecord(payload);

    await saveDeviceRecord(record);

    return Response.json({
      ok: true,
      deviceId: record.deviceId,
      scheduleCount: record.schedule.length
    });
  } catch (error) {
    return new Response(error instanceof Error ? error.message : 'Invalid request.', {
      status: 400
    });
  }
};
