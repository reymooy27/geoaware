import { useState, useEffect, useRef, useCallback } from 'react';
import { useAlertStore } from '../hooks/useStores';
import { useQuery } from '../hooks/useQuery';
import { cn, formatRelativeTime, formatMagnitude, getRiskColor } from '../utils/helpers';
import {
  AlertTriangle, Bell, BellRing, MapPin, Loader2, CheckCircle
} from 'lucide-react';

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
}

export function AlertPage() {
  const { events, unreadCount, markRead, addEvent } = useAlertStore();
  const { fetchEarthquakes } = useQuery();
  const [notificationStatus, setNotificationStatus] = useState<'default' | 'granted' | 'denied' | 'prompting'>('default');
  const [subscribed, setSubscribed] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const [pushError, setPushError] = useState<string | null>(null);
  const lastEventCount = useRef(events.length);

  // Request browser notification permission
  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'granted') {
      setNotificationStatus('granted');
      return;
    }
    setNotificationStatus('prompting');
    const result = await Notification.requestPermission();
    setNotificationStatus(result === 'granted' ? 'granted' : 'denied');
  };

  const subscribePush = useCallback(async () => {
    setPushBusy(true);
    setPushError(null);
    try {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        throw new Error('Browser tidak mendukung push notification');
      }
      const reg = await navigator.serviceWorker.ready;
      const res = await fetch('/api/alerts/push/public-key');
      const { key } = await res.json();
      if (!key) throw new Error('Server belum dikonfigurasi (VAPID key kosong)');

      const existing = await reg.pushManager.getSubscription();
      const sub = existing ?? await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(key),
      });
      const json = sub.toJSON();

      const save = await fetch('/api/alerts/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys }),
      });
      if (!save.ok) throw new Error('Gagal menyimpan subscription ke server');
      setSubscribed(true);
    } catch (e) {
      setPushError(e instanceof Error ? e.message : 'Gagal mengaktifkan push');
    } finally {
      setPushBusy(false);
    }
  }, []);

  const unsubscribePush = useCallback(async () => {
    setPushBusy(true);
    setPushError(null);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch('/api/alerts/push/unsubscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setSubscribed(false);
    } catch (e) {
      setPushError(e instanceof Error ? e.message : 'Gagal menonaktifkan push');
    } finally {
      setPushBusy(false);
    }
  }, []);

  const enableNotifications = async () => {
    await requestNotificationPermission();
    if (Notification.permission === 'granted') await subscribePush();
  };

  // Send a browser notification for a new earthquake
  const sendNotification = useCallback((eq: any) => {
    if (Notification.permission !== 'granted') return;
    const riskLabel = eq.magnitude >= 7 ? 'KRITIS' : eq.magnitude >= 5 ? 'TINGGI' : eq.magnitude >= 4 ? 'MENENGAH' : 'RENDAH';
    new Notification(`⚠️ Gempa ${formatMagnitude(eq.magnitude)} - ${riskLabel}`, {
      body: `${eq.place}\nKedalaman: ${eq.depth} km\nSumber: ${eq.source}`,
      icon: '/favicon.ico',
      tag: eq.id,
      requireInteraction: eq.magnitude >= 5,
    });
  }, []);

  // Poll for new earthquakes every 30 seconds and notify on new ones
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const data = await fetchEarthquakes({ minMagnitude: 3.0, limit: 20 });
        if (!Array.isArray(data)) return;
        const existingIds = new Set(events.map(e => e.id));
        const newEvents = data.filter((e: any) => !existingIds.has(e.id));
        newEvents.forEach((e: any) => {
          addEvent(e);
          sendNotification(e);
        });
      } catch {}
    }, 30000);
    return () => clearInterval(interval);
  }, [events, fetchEarthquakes, addEvent, sendNotification]);

  // Initial fetch
  useEffect(() => {
    markRead();
    fetchEarthquakes({ minMagnitude: 3.0, limit: 20 }).then(data => {
      if (Array.isArray(data)) data.forEach((e: any) => addEvent(e));
    });
  }, [markRead, fetchEarthquakes, addEvent]);

  // Check notification permission + existing subscription on mount
  useEffect(() => {
    if ('Notification' in window) {
      setNotificationStatus(Notification.permission);
    }
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      navigator.serviceWorker.ready.then(async (reg) => {
        const sub = await reg.pushManager.getSubscription();
        setSubscribed(!!sub);
      });
    }
  }, []);

  const pushActive = notificationStatus === 'granted' && subscribed;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">Peringatan Gempa</h1>
          <p className="text-gray-600 dark:text-gray-400">Notifikasi push real-time saat gempa terbaru terdeteksi</p>
        </div>

        {/* Push Notification Banner */}
        <div className="card p-6 mb-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center flex-shrink-0">
              {pushActive ? (
                <BellRing className="w-6 h-6 text-primary-600 dark:text-primary-400" />
              ) : (
                <Bell className="w-6 h-6 text-primary-600 dark:text-primary-400" />
              )}
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                Push Notification {pushActive ? 'Aktif' : 'Belum Aktif'}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                {pushActive
                  ? 'Anda akan menerima notifikasi otomatis saat gempa baru terdeteksi.'
                  : 'Aktifkan notifikasi untuk menerima peringatan gempa, bahkan saat aplikasi tertutup.'}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Catatan: di iOS, aktifkan setelah memasang aplikasi ini ke layar utama.
              </p>
              {!pushActive && notificationStatus !== 'denied' && (
                <button
                  onClick={enableNotifications}
                  disabled={pushBusy}
                  className="btn-primary mt-3 text-sm disabled:opacity-50"
                >
                  {pushBusy ? 'Mengaktifkan...' : 'Aktifkan Notifikasi'}
                </button>
              )}
              {pushActive && (
                <button
                  onClick={unsubscribePush}
                  disabled={pushBusy}
                  className="btn-secondary mt-3 text-sm disabled:opacity-50"
                >
                  {pushBusy ? 'Menonaktifkan...' : 'Matikan Notifikasi'}
                </button>
              )}
              {notificationStatus === 'denied' && (
                <p className="text-xs text-red-500 dark:text-red-400 mt-2">
                  Notifikasi diblokir oleh browser. Aktifkan melalui pengaturan browser.
                </p>
              )}
              {pushError && (
                <p className="text-xs text-red-500 dark:text-red-400 mt-2">{pushError}</p>
              )}
            </div>
          </div>
        </div>

        {/* Earthquake List */}
        <div className="card">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              Gempa Terbaru (M≥3.0)
              {unreadCount > 0 && (
                <span className="badge bg-red-500 text-white ml-2">{unreadCount} baru</span>
              )}
            </h2>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {events.slice(0, 20).map((eq) => (
              <div key={eq.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={cn('badge', getRiskColor(eq.magnitude >= 7 ? 'critical' : eq.magnitude >= 5 ? 'high' : 'medium'))}>
                        {formatMagnitude(eq.magnitude)}
                      </span>
                      <span className={cn('text-sm', eq.source === 'BMKG' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' : 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300')}>
                        {eq.source}
                      </span>
                      {eq.tsunami && (
                        <span className="badge bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300">
                          Tsunami
                        </span>
                      )}
                    </div>
                    <p className="font-medium text-gray-900 dark:text-gray-100 mt-2 truncate">{eq.place}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      Kedalaman: {eq.depth} km • {formatRelativeTime(eq.time)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
            {events.length === 0 && (
              <div className="p-8 text-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary-600 mx-auto mb-3" />
                <p className="text-gray-500 dark:text-gray-400">Memuat data gempa...</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
