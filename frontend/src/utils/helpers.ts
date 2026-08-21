import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDistance(km: number): string {
  if (km < 1) {
    return `${Math.round(km * 1000)} m`;
  }
  return `${km.toFixed(1)} km`;
}

export function formatMagnitude(mag: number): string {
  return `${mag.toFixed(1)} SR`;
}

export function formatDate(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatRelativeTime(date: string | Date): string {
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Baru saja';
  if (diffMins < 60) return `${diffMins} menit lalu`;
  if (diffHours < 24) return `${diffHours} jam lalu`;
  if (diffDays < 7) return `${diffDays} hari lalu`;
  return formatDate(d);
}

export function getRiskColor(risk: 'low' | 'medium' | 'high' | 'critical'): string {
  const colors = {
    low: 'text-green-600 dark:text-green-400',
    medium: 'text-yellow-600 dark:text-yellow-400',
    high: 'text-orange-600 dark:text-orange-400',
    critical: 'text-red-600 dark:text-red-400',
  };
  return colors[risk];
}

export function getRiskBgColor(risk: 'low' | 'medium' | 'high' | 'critical'): string {
  const colors = {
    low: 'bg-green-100 dark:bg-green-900/30',
    medium: 'bg-yellow-100 dark:bg-yellow-900/30',
    high: 'bg-orange-100 dark:bg-orange-900/30',
    critical: 'bg-red-100 dark:bg-red-900/30',
  };
  return colors[risk];
}

export function getRiskLabel(risk: 'low' | 'medium' | 'high' | 'critical'): string {
  const labels = {
    low: 'Rendah',
    medium: 'Sedang',
    high: 'Tinggi',
    critical: 'Sangat Tinggi',
  };
  return labels[risk];
}

export function getFaultTypeColor(type: string): string {
  const colors = {
    active: 'text-red-600',
    megathrust: 'text-red-700',
    inactive: 'text-gray-500',
  };
  return colors[type as keyof typeof colors] || 'text-gray-500';
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

export async function getCurrentLocation(): Promise<{ latitude: number; longitude: number; accuracy: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation not supported'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
      },
      (error) => reject(error),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
    );
  });
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function isOnline(): boolean {
  return navigator.onLine;
}

export function registerSW(): void {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js').catch(console.error);
  }
}