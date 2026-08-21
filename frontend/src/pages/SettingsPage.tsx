import { useState } from 'react';
import { useUserStore } from '../hooks/useStores';
import { useTheme } from '../hooks/useTheme';
import { cn } from '../utils/helpers';
import {
  User, Palette, Globe, Bell, Shield, Database, Download, 
  Moon, Sun, Monitor, Smartphone, Save, Loader2, CheckCircle
} from 'lucide-react';

export function SettingsPage() {
  const { user, setUser, settings, updateSettings } = useUserStore();
  const { theme, setTheme } = useTheme();
  
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await new Promise(r => setTimeout(r, 500));
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const themeOptions = [
    { value: 'light' as const, label: 'Terang', icon: Sun },
    { value: 'dark' as const, label: 'Gelap', icon: Moon },
    { value: 'system' as const, label: 'Sistem', icon: Monitor },
  ];

  const languageOptions = [
    { value: 'id' as const, label: 'Bahasa Indonesia', flag: '🇮🇩' },
    { value: 'en' as const, label: 'English', flag: '🇺🇸' },
  ];

  const unitsOptions = [
    { value: 'metric' as const, label: 'Metrik (km, m, °C)' },
    { value: 'imperial' as const, label: 'Imperial (mi, ft, °F)' },
  ];

  const mapStyleOptions = [
    { value: 'standard' as const, label: 'Standar', icon: Map },
    { value: 'satellite' as const, label: 'Satelit', icon: Globe },
    { value: 'hybrid' as const, label: 'Hibrida', icon: Layers },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-3xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">Pengaturan</h1>
          <p className="text-gray-600 dark:text-gray-400">Kelola preferensi aplikasi dan akun Anda</p>
        </div>

        <div className="space-y-6">
          <section className="card">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <User className="w-5 h-5 text-primary-600" />
                Profil
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label htmlFor="name" className="label">Nama Lengkap</label>
                <input
                  id="name"
                  type="text"
                  value={user?.name || ''}
                  onChange={(e) => setUser(user ? { ...user, name: e.target.value } : null)}
                  className="input"
                  placeholder="Nama Anda"
                />
              </div>
              <div>
                <label htmlFor="email" className="label">Email</label>
                <input
                  id="email"
                  type="email"
                  value={user?.email || ''}
                  disabled
                  className="input bg-gray-50 dark:bg-gray-700"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Email tidak dapat diubah</p>
              </div>
              <div>
                <label htmlFor="phone" className="label">Nomor Telepon</label>
                <input
                  id="phone"
                  type="tel"
                  value={user?.phone || ''}
                  onChange={(e) => setUser(user ? { ...user, phone: e.target.value } : null)}
                  className="input"
                  placeholder="08xx-xxxx-xxxx"
                />
              </div>
            </div>
          </section>

          <section className="card">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <Palette className="w-5 h-5 text-primary-600" />
                Tampilan
              </h2>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <label className="label">Tema</label>
                <div className="grid grid-cols-3 gap-3">
                  {themeOptions.map(option => {
                    const Icon = option.icon;
                    return (
                      <button
                        key={option.value}
                        onClick={() => setTheme(option.value)}
                        className={cn(
                          'p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2',
                          theme === option.value
                            ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                        )}
                      >
                        <Icon className={cn('w-6 h-6', theme === option.value ? 'text-primary-600' : 'text-gray-400')} />
                        <span className={cn('text-sm font-medium', theme === option.value ? 'text-primary-700 dark:text-primary-300' : 'text-gray-700 dark:text-gray-300')}>
                          {option.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="label">Bahasa</label>
                <select
                  value={settings.language}
                  onChange={(e) => updateSettings({ language: e.target.value as 'id' | 'en' })}
                  className="input max-w-xs"
                >
                  {languageOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.flag} {opt.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Satuan</label>
                <select
                  value={settings.units}
                  onChange={(e) => updateSettings({ units: e.target.value as 'metric' | 'imperial' })}
                  className="input max-w-xs"
                >
                  {unitsOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="label">Gaya Peta Default</label>
                <select
                  value={settings.mapStyle}
                  onChange={(e) => updateSettings({ mapStyle: e.target.value as 'standard' | 'satellite' | 'hybrid' })}
                  className="input max-w-xs"
                >
                  {mapStyleOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </section>

          <section className="card">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <Bell className="w-5 h-5 text-primary-600" />
                Notifikasi & Peringatan
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900 dark:text-gray-100">Push Notification</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Terima notifikasi gempa real-time</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.pushNotifications}
                  onChange={(e) => updateSettings({ pushNotifications: e.target.checked })}
                  className="w-6 h-6 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900 dark:text-gray-100">SMS Notification</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Kirim via SMS (biaya berlaku)</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.smsNotifications}
                  onChange={(e) => updateSettings({ smsNotifications: e.target.checked })}
                  className="w-6 h-6 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900 dark:text-gray-100">WhatsApp Notification</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Kirim via WhatsApp Business API</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.whatsappNotifications}
                  onChange={(e) => updateSettings({ whatsappNotifications: e.target.checked })}
                  className="w-6 h-6 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
                />
              </div>
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <label className="label">Minimal Magnitudo Peringatan</label>
                <select
                  value={settings.minMagnitude}
                  onChange={(e) => updateSettings({ minMagnitude: parseFloat(e.target.value) })}
                  className="input max-w-xs"
                >
                  <option value={3.0}>M ≥ 3.0 (Terasa)</option>
                  <option value={4.0}>M ≥ 4.0 (Signifikan)</option>
                  <option value={5.0}>M ≥ 5.0 (Merusak)</option>
                  <option value={6.0}>M ≥ 6.0 (Besar)</option>
                </select>
              </div>
              <div>
                <label className="label">Radius Peringatan</label>
                <select
                  value={settings.alertRadiusKm}
                  onChange={(e) => updateSettings({ alertRadiusKm: parseInt(e.target.value) })}
                  className="input max-w-xs"
                >
                  <option value={50}>50 km</option>
                  <option value={100}>100 km</option>
                  <option value={200}>200 km</option>
                  <option value={500}>500 km</option>
                </select>
              </div>
            </div>
          </section>

          <section className="card">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <Database className="w-5 h-5 text-primary-600" />
                Data & Penyimpanan
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900 dark:text-gray-100">Unduh Otomatis di WiFi</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Peta offline diperbarui otomatis saat WiFi</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.offlineOnWifiOnly}
                  onChange={(e) => updateSettings({ offlineOnWifiOnly: e.target.checked })}
                  className="w-6 h-6 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900 dark:text-gray-100">Bagikan Lokasi Default</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Gunakan lokasi saat membuka aplikasi</p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.shareLocationDefault}
                  onChange={(e) => updateSettings({ shareLocationDefault: e.target.checked })}
                  className="w-6 h-6 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
                />
              </div>
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <button className="btn-secondary flex items-center gap-2">
                  <Download className="w-4 h-4" />
                  Kelola Peta Offline
                </button>
              </div>
            </div>
          </section>

          <section className="card border-red-200 dark:border-red-800">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <Shield className="w-5 h-5 text-red-600" />
                Zona Berbahaya
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <h3 className="font-medium text-red-800 dark:text-red-300 mb-2">Hapus Akun</h3>
                <p className="text-red-700 dark:text-red-400 text-sm mb-4">
                  Menghapus akun akan menghapus semua data Anda: riwayat risiko, kontak darurat, peta offline, dan pengaturan. Tindakan ini tidak dapat dibatalkan.
                </p>
                <button className="btn-danger">Hapus Akun Permanen</button>
              </div>
            </div>
          </section>

          <div className="flex justify-end gap-4">
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn-primary flex items-center gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Menyimpan...
                </>
              ) : saved ? (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Tersimpan
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Simpan Perubahan
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

import { Layers } from 'lucide-react';