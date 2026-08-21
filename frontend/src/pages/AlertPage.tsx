import { useState, useEffect } from 'react';
import { useAlertStore, useUserStore } from '../hooks/useStores';
import { useQuery } from '../hooks/useQuery';
import { cn, formatRelativeTime, formatMagnitude, getRiskColor, getRiskLabel } from '../utils/helpers';
import {
  Bell, AlertTriangle, CheckCircle, XCircle, Phone, MessageSquare,
  Wifi, WifiOff, Volume2, VolumeX, Settings, Plus, Trash2, Edit,
  ShieldCheck, Loader2, MapPin
} from 'lucide-react';

export function AlertPage() {
  const { events, unreadCount, markRead, addEvent } = useAlertStore();
  const { settings, updateSettings, emergencyContacts, addEmergencyContact, removeEmergencyContact } = useUserStore();
  const { fetchEarthquakes } = useQuery();
  
  const [showSettings, setShowSettings] = useState(false);
  const [showContactForm, setShowContactForm] = useState(false);
  const [editingContact, setEditingContact] = useState<any>(null);
  const [newContact, setNewContact] = useState({ name: '', phone: '', relationship: '', isPrimary: false });
  const [testAlert, setTestAlert] = useState<'push' | 'sms' | 'whatsapp' | null>(null);

  useEffect(() => {
    markRead();
    fetchEarthquakes({ minMagnitude: 3.0, limit: 20 }).then(data => {
      data.forEach(e => addEvent(e));
    });
  }, [markRead, fetchEarthquakes, addEvent]);

  const handleTestAlert = async (type: 'push' | 'sms' | 'whatsapp') => {
    setTestAlert(type);
    try {
      await fetch('/api/alerts/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 'current-user', type }),
      });
      alert(`${type.toUpperCase()} test notification sent!`);
    } catch (error) {
      alert('Gagal mengirim test. Periksa pengaturan notifikasi.');
    } finally {
      setTestAlert(null);
    }
  };

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingContact) {
      // Update logic
      setEditingContact(null);
    } else {
      addEmergencyContact({ ...newContact, id: `contact-${Date.now()}` });
    }
    setShowContactForm(false);
    setNewContact({ name: '', phone: '', relationship: '', isPrimary: false });
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-5xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">Peringatan & Pantauan Gempa</h1>
          <p className="text-gray-600 dark:text-gray-400">Notifikasi real-time dari BMKG & USGS, serta fitur darurat "Saya Selamat"</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
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
                      <button className="btn-secondary text-sm whitespace-nowrap flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        Lihat di Peta
                      </button>
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

            <div className="card p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-green-600" />
                Fitur "Saya Selamat"
              </h2>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                Saat gempa terjadi, kirimkan koordinat lokasi dan status keselamatan ke kontak darurat via SMS/WhatsApp tanpa perlu internet stabil.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <button className="btn-primary py-4 flex flex-col items-center gap-2">
                  <CheckCircle className="w-8 h-8 text-green-500" />
                  <span className="font-medium">Selamat</span>
                  <span className="text-xs text-gray-500">Anda & keluarga aman</span>
                </button>
                <button className="btn-secondary py-4 flex flex-col items-center gap-2 border-yellow-300 dark:border-yellow-600 text-yellow-700 dark:text-yellow-300 hover:bg-yellow-50 dark:hover:bg-yellow-900/20">
                  <AlertTriangle className="w-8 h-8" />
                  <span className="font-medium">Butuh Bantuan</span>
                  <span className="text-xs text-gray-500">Terjebak/butuh evakuasi</span>
                </button>
                <button className="btn-secondary py-4 flex flex-col items-center gap-2 border-red-300 dark:border-red-600 text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20">
                  <XCircle className="w-8 h-8" />
                  <span className="font-medium">Terluka</span>
                  <span className="text-xs text-gray-500">Butuh pertolongan medis</span>
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  <Bell className="w-5 h-5 text-primary-600" />
                  Pengaturan Notifikasi
                </h2>
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className="text-sm text-primary-600 dark:text-primary-400 hover:underline"
                >
                  {showSettings ? 'Sembunyikan' : 'Atur'}
                </button>
              </div>

              {showSettings && (
                <div className="space-y-4 animate-in">
                  <div>
                    <label className="label">Minimal Magnitudo</label>
                    <select
                      value={settings.minMagnitude}
                      onChange={(e) => updateSettings({ minMagnitude: parseFloat(e.target.value) })}
                      className="input"
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
                      className="input"
                    >
                      <option value={50}>50 km</option>
                      <option value={100}>100 km</option>
                      <option value={200}>200 km</option>
                      <option value={500}>500 km</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.pushNotifications}
                        onChange={(e) => updateSettings({ pushNotifications: e.target.checked })}
                        className="w-4 h-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">Push Notification</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.smsNotifications}
                        onChange={(e) => updateSettings({ smsNotifications: e.target.checked })}
                        className="w-4 h-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">SMS (via Twilio)</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.whatsappNotifications}
                        onChange={(e) => updateSettings({ whatsappNotifications: e.target.checked })}
                        className="w-4 h-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">WhatsApp</span>
                    </label>
                  </div>
                  
                  <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                    <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-3">Test Notifikasi</h4>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleTestAlert('push')}
                        disabled={testAlert !== null}
                        className="btn-secondary flex-1"
                      >
                        {testAlert === 'push' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Volume2 className="w-4 h-4" />} Push
                      </button>
                      <button
                        onClick={() => handleTestAlert('sms')}
                        disabled={testAlert !== null}
                        className="btn-secondary flex-1"
                      >
                        {testAlert === 'sms' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Phone className="w-4 h-4" />} SMS
                      </button>
                      <button
                        onClick={() => handleTestAlert('whatsapp')}
                        disabled={testAlert !== null}
                        className="btn-secondary flex-1"
                      >
                        {testAlert === 'whatsapp' ? <Loader2 className="w-4 h-4 animate-spin" /> : <MessageSquare className="w-4 h-4" />} WA
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  <Phone className="w-5 h-5 text-green-600" />
                  Kontak Darurat
                </h2>
                <button
                  onClick={() => { setEditingContact(null); setShowContactForm(true); }}
                  className="btn-primary text-sm"
                >
                  <Plus className="w-4 h-4" />
                  Tambah
                </button>
              </div>

              {showContactForm && (
                <form onSubmit={handleContactSubmit} className="space-y-3 mb-4 animate-in">
                  <input
                    type="text"
                    placeholder="Nama"
                    value={newContact.name}
                    onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                    className="input"
                    required
                  />
                  <input
                    type="tel"
                    placeholder="Nomor Telepon (08xx)"
                    value={newContact.phone}
                    onChange={(e) => setNewContact({ ...newContact, phone: e.target.value })}
                    className="input"
                    required
                  />
                  <input
                    type="text"
                    placeholder="Hubungan (Orang tua, Pasangan, dll)"
                    value={newContact.relationship}
                    onChange={(e) => setNewContact({ ...newContact, relationship: e.target.value })}
                    className="input"
                  />
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newContact.isPrimary}
                      onChange={(e) => setNewContact({ ...newContact, isPrimary: e.target.checked })}
                      className="w-4 h-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Kontak utama (diterima notifikasi prioritas)</span>
                  </label>
                  <div className="flex gap-2">
                    <button type="submit" className="btn-primary flex-1">Simpan</button>
                    <button type="button" onClick={() => setShowContactForm(false)} className="btn-secondary">Batal</button>
                  </div>
                </form>
              )}

              <div className="space-y-2">
                {emergencyContacts.length === 0 ? (
                  <p className="text-gray-500 dark:text-gray-400 text-center py-4">Belum ada kontak darurat. Tambahkan untuk menerima notifikasi "Saya Selamat".</p>
                ) : (
                  emergencyContacts.map(contact => (
                    <div key={contact.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                          <Phone className="w-4 h-4 text-green-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-gray-100">{contact.name}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">{contact.phone} • {contact.relationship}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {contact.isPrimary && (
                          <span className="badge bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-xs">Utama</span>
                        )}
                        <button
                          onClick={() => setEditingContact(contact)}
                          className="p-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => removeEmergencyContact(contact.id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}