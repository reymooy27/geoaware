import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MapContainer } from '../components/Map/MapContainer';
import { useMapStore, useAlertStore, useUserStore } from '../hooks/useStores';
import { useQuery } from '../hooks/useQuery';
import { getCurrentLocation } from '../utils/helpers';
import { cn, formatRelativeTime, getRiskLabel, getRiskColor } from '../utils/helpers';
import {
  ShieldCheck, AlertTriangle, MapPin, Navigation, Download, Target, 
  TrendingUp, Users, Globe, Clock, Map as MapIcon
} from 'lucide-react';

const features = [
  { icon: MapPin, title: 'Cek Risiko Sekali Klik', desc: 'Masukkan alamat atau gunakan GPS untuk mengetahui jarak ke patahan aktif, jenis tanah, dan skor risiko gempa.', href: '/risk', color: 'blue' },
  { icon: AlertTriangle, title: 'Peringatan Real-Time', desc: 'Notifikasi gempa M≥3.0 dari BMKG & USGS dalam hitungan menit. Fitur "Saya Selamat" untuk memberitahu keluarga.', href: '/alerts', color: 'red' },
  { icon: MapIcon, title: 'Peta Interaktif Vektor', desc: 'Visualisasi jalur patahan aktif, zona megathrust, dan risiko likuifaksi dengan render cepat di semua perangkat.', href: '/', color: 'green' },
  { icon: Download, title: 'Mode Offline Lengkap', desc: 'Unduh peta patahan & rute evakuasi untuk diakses tanpa internet. Navigasi ke titik kumpul terdekat.', href: '/offline', color: 'orange' },
];

const stats = [
  { label: 'Patahan Aktif', value: '300+', icon: Target },
  { label: 'Gempa Terpantau', value: 'Real-time', icon: TrendingUp },
  { label: 'Titik Evakuasi', value: '5000+', icon: Navigation },
  { label: 'Pengguna Aktif', value: '10.000+', icon: Users },
];

export function HomePage() {
  const { fetchEarthquakes } = useQuery();
  const { events, addEvent } = useAlertStore();
  const { location, setLocation } = useUserStore();
  const { showFaults, showEarthquakes, toggleLayer } = useMapStore();
  const [recentEarthquakes, setRecentEarthquakes] = useState<any[]>([]);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    loadRecentEarthquakes();
    if (navigator.geolocation) {
      getCurrentLocation().then(pos => {
        setUserLocation({ lat: pos.latitude, lng: pos.longitude });
        setLocation({ coordinates: { latitude: pos.latitude, longitude: pos.longitude }, accuracy: pos.accuracy, timestamp: Date.now(), source: 'gps' });
      }).catch(() => {});
    }
  }, [setLocation]);

  const loadRecentEarthquakes = async () => {
    try {
      const data = await fetchEarthquakes({ minMagnitude: 3.0, limit: 10 });
      setRecentEarthquakes(data);
      data.forEach(e => addEvent(e));
    } catch (error) {
      console.error('Failed to load earthquakes:', error);
    }
  };

  return (
    <div className="min-h-screen">
      <section className="relative h-[60vh] min-h-[400px] max-h-[600px] w-full">
        <MapContainer className="h-full w-full" />
        
        <div className="absolute top-4 left-4 right-4 z-10 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-xl p-4 shadow-lg max-w-md">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Peta Risiko Gempa Indonesia</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Jelajahi jalur patahan aktif, zona megathrust, dan risiko likuifaksi secara interaktif</p>
          </div>
          
          <div className="flex items-center gap-2 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-xl p-2 shadow-lg">
            <button
              onClick={() => toggleLayer('faults')}
              className={cn('flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors', 
                showFaults ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              )}
            >
              <Target className="w-4 h-4" />
              Patahan
            </button>
            <button
              onClick={() => toggleLayer('earthquakes')}
              className={cn('flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
                showEarthquakes ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              )}
            >
              <AlertTriangle className="w-4 h-4" />
              Gempa
            </button>
          </div>
        </div>

        {userLocation && (
          <div className="absolute bottom-4 left-4 z-10 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-xl p-3 shadow-lg">
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="w-4 h-4 text-primary-600" />
              <span className="font-medium text-gray-900 dark:text-gray-100">Lokasi Anda</span>
              <span className="text-gray-500 dark:text-gray-400">
                {userLocation.lat.toFixed(4)}, {userLocation.lng.toFixed(4)}
              </span>
            </div>
          </div>
        )}
      </section>

      <section className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              Fitur Utama GeoAware
            </h2>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Semua yang Anda butuhkan untuk siap menghadapi gempa bumi dalam satu aplikasi
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              const colorClasses = {
                blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400',
                red: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
                green: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400',
                orange: 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400',
              };
              return (
                <Link
                  key={feature.href}
                  to={feature.href}
                  className="card-hover p-6 group"
                >
                  <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center mb-4', colorClasses[feature.color as keyof typeof colorClasses])}>
                    <Icon className="w-6 h-6" aria-hidden="true" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">{feature.desc}</p>
                </Link>
              );
            })}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-16">
            {stats.map((stat, index) => (
              <div key={stat.label} className="card p-6 text-center">
                <stat.icon className="w-10 h-10 text-primary-600 dark:text-primary-400 mx-auto mb-3" aria-hidden="true" />
                <div className="text-3xl font-bold text-gray-900 dark:text-gray-100">{stat.value}</div>
                <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>

          <section className="mb-16">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Gempa Terbaru (M≥3.0)</h2>
              <Link to="/alerts" className="text-primary-600 dark:text-primary-400 hover:underline text-sm font-medium">
                Lihat semua →
              </Link>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {recentEarthquakes.slice(0, 6).map((eq) => (
                <div key={eq.id} className="card p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-gray-100">{eq.place}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{formatRelativeTime(eq.time)}</p>
                    </div>
                    <span className={cn('badge', getRiskColor(eq.magnitude >= 7 ? 'critical' : eq.magnitude >= 5 ? 'high' : 'medium'))}>
                      {eq.magnitude.toFixed(1)} SR
                    </span>
                  </div>
                  <div className="mt-3 flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
                    <span className="flex items-center gap-1">
                      <Globe className="w-3 h-3" /> {eq.depth} km
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" /> {eq.source}
                    </span>
                  </div>
                </div>
              ))}
              {recentEarthquakes.length === 0 && (
                <div className="col-span-full card p-8 text-center">
                  <AlertTriangle className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-500 dark:text-gray-400">Memuat data gempa terbaru...</p>
                </div>
              )}
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6 text-center">
              Siap Menghadapi Gempa?
            </h2>
            <div className="max-w-2xl mx-auto text-center space-y-4">
              <p className="text-gray-600 dark:text-gray-400 text-lg">
                Mulai cek risiko rumah Anda, atur peringatan gempa, dan siapkan rute evakuasi darurat.
              </p>
              <div className="flex items-center justify-center gap-4">
                <Link to="/risk" className="btn-primary">
                  <ShieldCheck className="w-4 h-4" />
                  Cek Risiko Sekarang
                </Link>
                <Link to="/alerts" className="btn-secondary">
                  <AlertTriangle className="w-4 h-4" />
                  Atur Peringatan
                </Link>
              </div>
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}