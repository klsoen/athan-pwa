import { env } from '$env/dynamic/public';

function base64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const output = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; i += 1) {
    output[i] = rawData.charCodeAt(i);
  }

  return output;
}

function getApiBaseUrl() {
  return (env.PUBLIC_WEB_PUSH_API_BASE_URL || '').replace(/\/$/, '');
}

function getStoredSecrets() {
  if (typeof localStorage === 'undefined') return {};
  try {
    return JSON.parse(localStorage.getItem('athan-push-client-secrets') || '{}');
  } catch (_) {
    return {};
  }
}

function setStoredSecrets(next) {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem('athan-push-client-secrets', JSON.stringify(next));
}

function saveClientSecret(endpoint, clientSecret) {
  const secrets = getStoredSecrets();
  secrets[endpoint] = clientSecret;
  setStoredSecrets(secrets);
}

function getClientSecret(endpoint) {
  const secrets = getStoredSecrets();
  return secrets[endpoint] || null;
}

function removeClientSecret(endpoint) {
  const secrets = getStoredSecrets();
  delete secrets[endpoint];
  setStoredSecrets(secrets);
}

function toHex(buffer) {
  return [...new Uint8Array(buffer)]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

async function buildSignatureHeaders(secret, payload) {
  const timestamp = String(Date.now());
  const message = `${timestamp}.${payload}`;
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  return {
    'x-push-timestamp': timestamp,
    'x-push-signature': toHex(sig)
  };
}

export function isWebPushSupported() {
  if (typeof window === 'undefined') return false;
  return (
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window &&
    window.isSecureContext
  );
}

export function hasPushConfig() {
  return Boolean(env.PUBLIC_WEB_PUSH_PUBLIC_KEY && getApiBaseUrl());
}

async function postJSON(path, payload, extraHeaders = {}) {
  const baseUrl = getApiBaseUrl();
  const response = await fetch(`${baseUrl}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...extraHeaders },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`Push API error (${response.status})`);
  }

  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return response.json();
  }
  return null;
}

export async function subscribeToPrayerPush(context) {
  if (!isWebPushSupported()) {
    return { ok: false, reason: 'unsupported' };
  }

  if (!hasPushConfig()) {
    return { ok: false, reason: 'missing-config' };
  }

  const registration = await navigator.serviceWorker.ready;
  let subscription = await registration.pushManager.getSubscription();

  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: base64ToUint8Array(env.PUBLIC_WEB_PUSH_PUBLIC_KEY)
    });
  }

  const result = await postJSON('/api/push/subscribe', {
    subscription,
    context
  });

  if (result?.clientSecret) {
    saveClientSecret(subscription.endpoint, result.clientSecret);
  }

  return { ok: true, subscription };
}

export async function updatePrayerPushContext(context) {
  if (!isWebPushSupported() || !hasPushConfig()) return;

  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) return;

  const payload = {
    endpoint: subscription.endpoint,
    context
  };
  const raw = JSON.stringify(payload);
  const clientSecret = getClientSecret(subscription.endpoint);
  if (!clientSecret) return;

  const signatureHeaders = await buildSignatureHeaders(clientSecret, raw);
  await postJSON('/api/push/update', payload, signatureHeaders);
}

export async function unsubscribeFromPrayerPush() {
  if (!isWebPushSupported() || !hasPushConfig()) return { ok: true };

  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) return { ok: true };

  const payload = {
    endpoint: subscription.endpoint
  };
  const raw = JSON.stringify(payload);
  const clientSecret = getClientSecret(subscription.endpoint);

  if (clientSecret) {
    const signatureHeaders = await buildSignatureHeaders(clientSecret, raw);
    await postJSON('/api/push/unsubscribe', payload, signatureHeaders);
    removeClientSecret(subscription.endpoint);
  }

  await subscription.unsubscribe();
  return { ok: true };
}
