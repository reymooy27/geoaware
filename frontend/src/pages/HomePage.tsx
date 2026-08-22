import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MapContainer } from '../components/Map/MapContainer';
import { useMapStore, useAlertStore, useUserStore } from '../hooks/useStores';
import { useQuery } from '../hooks/useQuery';
import { getCurrentLocation } from '../utils/helpers';
import { cn, formatRelativeTime, getRiskColor } from '../utils/helpers';
import {
  ShieldCheck, AlertTriangle, MapPin, Download, Settings, Target,
  Globe, Clock, Menu, X, Navigation, ChevronRight, Locate
} from 'lucide-react';

export function HomePage() {
  const { fetchEarthquakes } = useQuery();
  const { addEvent } = useAlertStore();
  const { setLocation } = useUserStore();
  const { showFaults, showEarthquakes, toggleLayer } = useMapStore();
  const [recentEarthquakes, setRecentEarthquakes] = useState<any[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [eqExpanded, setEqExpanded] = useState(false);
  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    loadRecentEarthquakes();
    if (navigator.geolocation) {
      getCurrentLocation().then(pos => {
        setUserLoc({ lat: pos.latitude, lng: pos.longitude });
        setLocation({ coordinates: { latitude: pos.latitude, longitude: pos.longitude }, accuracy: pos.accuracy, timestamp: Date.now(), source: 'gps' });
      }).catch(() => {});
    }
  }, [setLocation]);

  const loadRecentEarthquakes = async () => {
    try {
      const data = await fetchEarthquakes({ minMagnitude: 3.0, limit: 10 });
      setRecentEarthquakes(data);
      data.forEach((e: any) => addEvent(e));
    } catch (error) {
      console.error('Failed to load earthquakes:', error);
    }
  };

  const handleLocateUser = () => {
    if (navigator.geolocation) {
      getCurrentLocation().then(pos => {
        setUserLoc({ lat: pos.latitude, lng: pos.longitude });
      }).catch(() => {});
    }
  };

  return (
    <div className="relative w-full h-[calc(100vh-0rem)] bg-gray-900">
      {/* Fullscreen map */}
      <MapContainer className="absolute inset-0" />

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between p-3">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="flex items-center gap-2 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-xl px-3 py-2 shadow-lg hover:bg-white dark:hover:bg-gray-800 transition-colors"
        >
          {sidebarOpen ? <X className="w-5 h-5 text-gray-700 dark:text-gray-300" /> : <Menu className="w-5 h-5 text-gray-700 dark:text-gray-300" />}
          <div className="w-7 h-7 rounded-lg bg-primary-600 flex items-center justify-center">
            <ShieldCheck className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-gray-900 dark:text-gray-100 hidden sm:block">GeoAware</span>
        </button>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-xl p-1.5 shadow-lg">
            <button
              onClick={() => toggleLayer('faults')}
              className={cn('flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors',
                showFaults ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              )}
            >
              <Target className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Patahan</span>
            </button>
            <button
              onClick={() => toggleLayer('earthquakes')}
              className={cn('flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors',
                showEarthquakes ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              )}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Gempa</span>
            </button>
          </div>

          <button
            onClick={handleLocateUser}
            className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-xl p-2 shadow-lg hover:bg-white dark:hover:bg-gray-800 transition-colors"
            title="Lokasi saya"
          >
            <Locate className="w-5 h-5 text-primary-600" />
          </button>
        </div>
      </div>

      {/* Sidebar */}
      {sidebarOpen && (
        <div className="absolute inset-y-0 left-0 z-30 w-72 bg-white dark:bg-gray-800 shadow-2xl flex flex-col">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary-600 flex items-center justify-center">
                <ShieldCheck className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-lg text-gray-900 dark:text-gray-100">GeoAware</h1>
                <p className="text-xs text-gray-500 dark:text-gray-400">Peta Risiko Gempa Indonesia</p>
              </div>
            </div>
          </div>
          <nav className="flex-1 p-3 space-y-1">
            <Link to="/" onClick={() => setSidebarOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium bg-primary-50 dark:bg-primary-900/30 text-primary-600 dark:text-primary-400"><Target className="w-4 h-4" /> Peta Interaktif</Link>
            <Link to="/risk" onClick={() => setSidebarOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"><ShieldCheck className="w-4 h-4" /> Cek Risiko <ChevronRight className="w-3 h-3 ml-auto" /></Link>
            <Link to="/alerts" onClick={() => setSidebarOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"><AlertTriangle className="w-4 h-4" /> Peringatan <ChevronRight className="w-3 h-3 ml-auto" /></Link>
            <Link to="/offline" onClick={() => setSidebarOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"><Download className="w-4 h-4" /> Mode Offline <ChevronRight className="w-3 h-3 ml-auto" /></Link>
            <Link to="/settings" onClick={() => setSidebarOpen(false)} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"><Settings className="w-4 h-4" /> Pengaturan <ChevronRight className="w-3 h-3 ml-auto" /></Link>
          </nav>
        </div>
      )}

      {/* Bottom-right: earthquake card */}
      <div className="absolute bottom-4 right-4 z-20 w-72">
        <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-xl shadow-lg overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200/50 dark:border-gray-700/50">
            <div className="flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
              <span className="text-xs font-semibold text-gray-900 dark:text-gray-100">Gempa Terbaru</span>
              <span className="text-[10px] bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-1.5 py-0.5 rounded-full font-medium">{recentEarthquakes.length}</span>
            </div>
            <button onClick={() => setEqExpanded(!eqExpanded)} className="text-[10px] text-primary-600 dark:text-primary-400 font-medium hover:underline">
              {eqExpanded ? 'Tutup' : 'Lihat semua'}
            </button>
          </div>
          <div className={cn('divide-y divide-gray-100/50 dark:divide-gray-700/50 overflow-y-auto transition-all', eqExpanded ? 'max-h-[50vh]' : 'max-h-[180px]')}>
            {recentEarthquakes.map((eq) => (
              <div key={eq.id} className="px-3 py-2 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors cursor-pointer">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate flex-1 min-w-0">{eq.place}</p>
                  <span className={cn('flex-shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded',
                    eq.magnitude >= 7 ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                    eq.magnitude >= 5 ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' :
                    'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                  )}>{eq.magnitude.toFixed(1)}</span>
                </div>
                <div className="flex items-center gap-2 mt-0.5 text-[10px] text-gray-500 dark:text-gray-400">
                  <span>{eq.depth} km</span>
                  <span>·</span>
                  <span>{formatRelativeTime(eq.time)}</span>
                </div>
              </div>
            ))}
            {recentEarthquakes.length === 0 && (
              <div className="px-3 py-4 text-center">
                <Navigation className="w-5 h-5 text-gray-300 dark:text-gray-600 mx-auto mb-1 animate-pulse" />
                <p className="text-[10px] text-gray-500 dark:text-gray-400">Memuat...</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}