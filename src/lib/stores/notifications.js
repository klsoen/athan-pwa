import { browser } from '$app/environment';
import { get, writable } from 'svelte/store';
import { calculationMethod, customAngles, location } from '$lib/stores/prayer.js';
import {
  buildNotificationSchedule,
  defaultNotificationPreferences,
  notificationDefinitions
} from '$lib/utils/notificationSchedule.js';

const STORAGE_KEY = 'azan-notification-preferences';
const DEVICE_ID_KEY = 'azan-device-id';
const REGISTER_ENDPOINT = '/.netlify/functions/register-push';
const SYNC_ENDPOINT = '/.netlify/functions/sync-push-schedule';
const UNREGISTER_ENDPOINT = '/.netlify/functions/unregister-push';

let initialized = false;
let syncTimer;
let cleanupSubscriptions = [];
let visibilityHandler;

function cloneDefaults() {
  return JSON.parse(JSON.stringify(defaultNotificationPreferences));
}

function createNotificationPreferencesStore() {
  const initial = cloneDefaults();

  if (browser) {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        initial.enabled = Boolean(parsed.enabled);
        initial.types = { ...initial.types, ...(parsed.types || {}) };
      } catch (error) {
        console.warn('Failed to load notification preferences:', error);
      }
    }
  }

  const store = writable(initial);

  const persist = (value) => {
    if (!browser) return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  };

  return {
    subscribe: store.subscribe,
    set(value) {
      persist(value);
      store.set(value);
    },
    update(updater) {
      store.update((value) => {
        const nextValue = updater(value);
        persist(nextValue);
        return nextValue;
      });
    }
  };
}

export const notificationPreferences = createNotificationPreferencesStore();

export const notificationState = writable({
  supported: false,
  pushSupported: false,
  permission: browser && 'Notification' in window ? Notification.permission : 'default',
  subscribed: false,
  syncing: false,
  backendConfigured: Boolean(browser ? import.meta.env.VITE_VAPID_PUBLIC_KEY : false),
  lastSyncedAt: null,
  error: ''
});

export { notificationDefinitions };

function getOrCreateDeviceId() {
  const existing = localStorage.getItem(DEVICE_ID_KEY);
  if (existing) return existing;

  const nextId = crypto.randomUUID();
  localStorage.setItem(DEVICE_ID_KEY, nextId);
  return nextId;
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const normalized = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(normalized);
  const outputArray = new Uint8Array(rawData.length);

  for (let index = 0; index < rawData.length; index += 1) {
    outputArray[index] = rawData.charCodeAt(index);
  }

  return outputArray;
}

function setNotificationState(nextState) {
  notificationState.update((state) => ({ ...state, ...nextState }));
}

async function getPushSubscription() {
  const registration = await navigator.serviceWorker.ready;
  return registration.pushManager.getSubscription();
}

async function createPushSubscription() {
  const publicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
  if (!publicKey) {
    throw new Error('Missing VITE_VAPID_PUBLIC_KEY.');
  }

  const registration = await navigator.serviceWorker.ready;
  return registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey)
  });
}

function buildSyncPayload(subscription) {
  const preferences = get(notificationPreferences);
  const currentLocation = get(location);
  const method = get(calculationMethod);
  const angles = get(customAngles);

  return {
    deviceId: getOrCreateDeviceId(),
    notificationsEnabled: preferences.enabled,
    types: preferences.types,
    schedule: buildNotificationSchedule({
      location: currentLocation,
      method,
      angles,
      types: preferences.types
    }),
    subscription: subscription?.toJSON ? subscription.toJSON() : subscription
  };
}

async function postJson(url, payload) {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed with ${response.status}`);
  }

  return response.json().catch(() => ({}));
}

export async function syncNotificationSchedule(endpoint = SYNC_ENDPOINT) {
  if (!browser) return false;

  const preferences = get(notificationPreferences);
  const state = get(notificationState);

  if (!preferences.enabled || state.permission !== 'granted') {
    return false;
  }

  const subscription = await getPushSubscription();
  if (!subscription) {
    setNotificationState({ subscribed: false });
    return false;
  }

  setNotificationState({ syncing: true, error: '' });

  try {
    await postJson(endpoint, buildSyncPayload(subscription));
    setNotificationState({
      syncing: false,
      subscribed: true,
      lastSyncedAt: new Date().toISOString(),
      error: ''
    });
    return true;
  } catch (error) {
    setNotificationState({ syncing: false, error: error.message || 'Unable to sync notifications.' });
    return false;
  }
}

function queueSync(endpoint = SYNC_ENDPOINT, delay = 700) {
  if (!browser) return;
  clearTimeout(syncTimer);
  syncTimer = window.setTimeout(() => {
    syncNotificationSchedule(endpoint);
  }, delay);
}

export async function enableNotifications() {
  if (!browser) return false;

  if (!import.meta.env.VITE_VAPID_PUBLIC_KEY) {
    setNotificationState({ error: 'Missing VITE_VAPID_PUBLIC_KEY for push setup.' });
    return false;
  }

  const supported = 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
  if (!supported) {
    setNotificationState({ supported: false, pushSupported: false, error: 'Push notifications are not supported here.' });
    return false;
  }

  let permission = Notification.permission;
  if (permission !== 'granted') {
    permission = await Notification.requestPermission();
  }

  setNotificationState({ permission });

  if (permission !== 'granted') {
    notificationPreferences.update((value) => ({ ...value, enabled: false }));
    setNotificationState({ error: 'Notifications are blocked in this browser.' });
    return false;
  }

  try {
    const subscription = (await getPushSubscription()) || await createPushSubscription();
    notificationPreferences.update((value) => ({ ...value, enabled: true }));
    await postJson(REGISTER_ENDPOINT, buildSyncPayload(subscription));
    setNotificationState({
      supported: true,
      pushSupported: true,
      subscribed: true,
      syncing: false,
      error: '',
      lastSyncedAt: new Date().toISOString()
    });
    return true;
  } catch (error) {
    notificationPreferences.update((value) => ({ ...value, enabled: false }));
    setNotificationState({ error: error.message || 'Unable to enable notifications.' });
    return false;
  }
}

export async function disableNotifications() {
  if (!browser) return;

  clearTimeout(syncTimer);

  const subscription = await getPushSubscription();
  const deviceId = localStorage.getItem(DEVICE_ID_KEY);

  try {
    if (deviceId) {
      await postJson(UNREGISTER_ENDPOINT, {
        deviceId,
        endpoint: subscription?.endpoint || null
      });
    }
  } catch (error) {
    setNotificationState({ error: error.message || 'Unable to unregister notifications.' });
  }

  if (subscription) {
    await subscription.unsubscribe();
  }

  notificationPreferences.update((value) => ({ ...value, enabled: false }));
  setNotificationState({ subscribed: false, syncing: false, error: '' });
}

export function toggleNotificationType(type) {
  notificationPreferences.update((value) => ({
    ...value,
    types: {
      ...value.types,
      [type]: !value.types[type]
    }
  }));

  queueSync();
}

export async function initializeNotifications() {
  if (!browser || initialized) return;
  initialized = true;

  const supported = 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
  setNotificationState({
    supported,
    pushSupported: supported,
    backendConfigured: Boolean(import.meta.env.VITE_VAPID_PUBLIC_KEY),
    permission: supported ? Notification.permission : 'default'
  });

  if (!supported) return;

  try {
    const subscription = await getPushSubscription();
    setNotificationState({ subscribed: Boolean(subscription) });
  } catch (error) {
    setNotificationState({ error: error.message || 'Unable to read notification subscription.' });
  }

  const watchAndSync = () => {
    cleanupSubscriptions = [
      notificationPreferences.subscribe((value) => {
        if (value.enabled && Notification.permission === 'granted') {
          queueSync();
        }
      }),
      location.subscribe(() => queueSync()),
      calculationMethod.subscribe(() => queueSync()),
      customAngles.subscribe(() => queueSync())
    ];
  };

  watchAndSync();

  visibilityHandler = () => {
    if (document.visibilityState === 'visible') {
      queueSync();
      setNotificationState({ permission: Notification.permission });
    }
  };

  document.addEventListener('visibilitychange', visibilityHandler);

  if (Notification.permission === 'granted' && get(notificationPreferences).enabled) {
    queueSync();
  }
}

export function destroyNotifications() {
  clearTimeout(syncTimer);
  cleanupSubscriptions.forEach((unsubscribe) => unsubscribe());
  cleanupSubscriptions = [];
  if (visibilityHandler) {
    document.removeEventListener('visibilitychange', visibilityHandler);
    visibilityHandler = null;
  }
  initialized = false;
}
