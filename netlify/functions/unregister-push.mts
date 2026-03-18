import { deleteDeviceRecord } from './_lib/push-store.mjs';

export default async (req: Request) => {
  try {
    const payload = await req.json();

    if (!payload?.deviceId) {
      return new Response('Missing deviceId.', { status: 400 });
    }

    await deleteDeviceRecord(String(payload.deviceId));

    return Response.json({ ok: true });
  } catch (error) {
    return new Response(error instanceof Error ? error.message : 'Unable to unregister device.', {
      status: 400
    });
  }
};
