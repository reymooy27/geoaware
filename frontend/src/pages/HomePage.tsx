import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import mapboxgl from 'mapbox-gl';
import type { Map as MapboxMap } from 'mapbox-gl';
import { MapContainer } from '../components/Map/MapContainer';
import { useMapStore, useAlertStore, useUserStore } from '../hooks/useStores';
import { useQuery, type EarthquakeFilterParams } from '../hooks/useQuery';
import { getCurrentLocation } from '../utils/helpers';
import { cn, formatRelativeTime, getRiskColor } from '../utils/helpers';
import { EarthquakeFilterPanel } from '../components/Earthquake/EarthquakeFilterPanel';
import { EarthquakeHistoryList } from '../components/Earthquake/EarthquakeHistoryList';
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
  const [filterOpen, setFilterOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [filters, setFilters] = useState<EarthquakeFilterParams>({
    minMagnitude: 0,
    source: 'ALL',
  });
  const [userLoc, setUserLoc] = useState<{ lat: number; lng: number } | null>(null);
  const mapInstanceRef = useRef<MapboxMap | null>(null);

  useEffect(() => {
    loadRecentEarthquakes();
    if (navigator.geolocation) {
      getCurrentLocation().then(pos => {
        setUserLoc({ lat: pos.latitude, lng: pos.longitude });
        setLocation({ coordinates: { latitude: pos.latitude, longitude: pos.longitude }, accuracy: pos.accuracy, timestamp: Date.now(), source: 'gps' });
      }).catch(() => {});
    }
  }, [setLocation]);

  const loadRecentEarthquakes = useCallback(async (filterOverrides?: EarthquakeFilterParams) => {
    try {
      const params = { ...filters, ...filterOverrides, limit: 10, minMagnitude: filterOverrides?.minMagnitude ?? filters.minMagnitude ?? 0 };
      const data = await fetchEarthquakes(params);
      setRecentEarthquakes(data);
      data.forEach((e: any) => addEvent(e));
    } catch (error) {
      console.error('Failed to load earthquakes:', error);
    }
  }, [filters, fetchEarthquakes, addEvent]);

  const handleFilterChange = useCallback((newFilters: EarthquakeFilterParams) => {
    setFilters(newFilters);
    loadRecentEarthquakes(newFilters);
  }, [loadRecentEarthquakes]);

  const userMarkerRef = useRef<mapboxgl.Marker | null>(null);

  const handleLocateUser = () => {
    if (!navigator.geolocation) return;
    getCurrentLocation()
      .then(pos => {
        setUserLoc({ lat: pos.latitude, lng: pos.longitude });
        setLocation({ coordinates: { latitude: pos.latitude, longitude: pos.longitude }, accuracy: pos.accuracy, timestamp: Date.now(), source: 'gps' });

        if (mapInstanceRef.current) {
          mapInstanceRef.current.flyTo({
            center: [pos.longitude, pos.latitude],
            zoom: 12,
            essential: true,
          });

          // Remove old marker
          if (userMarkerRef.current) {
            userMarkerRef.current.remove();
          }

          // Add user marker
          const el = document.createElement('div');
          el.className = 'user-location-marker';
          el.style.cssText = `
            width: 16px;
            height: 16px;
            border-radius: 50%;
            background: #3b82f6;
            border: 3px solid white;
            box-shadow: 0 0 10px rgba(59,130,246,0.6);
          `;

          userMarkerRef.current = new (mapboxgl as any).Marker({ element: el })
            .setLngLat([pos.longitude, pos.latitude])
            .setPopup(
              new (mapboxgl as any).Popup({ closeButton: false, offset: 15 })
                .setHTML('<div style="padding:4px 8px;font-size:12px;font-weight:600;">📍 Lokasi Anda</div>')
            )
            .addTo(mapInstanceRef.current);
        }
      })
      .catch(err => {
        console.error('Gagal mendapatkan lokasi:', err);
      });
  };

  const handleFocusEarthquake = (eq: any) => {
    const latitude = eq?.location?.latitude;
    const longitude = eq?.location?.longitude;
    if (typeof latitude !== 'number' || typeof longitude !== 'number' || !mapInstanceRef.current) return;

    if (!showEarthquakes) toggleLayer('earthquakes');

    mapInstanceRef.current.flyTo({
      center: [longitude, latitude],
      zoom: Math.max(mapInstanceRef.current.getZoom(), 8),
      essential: true,
    });
  };

  return (
    <div className="relative w-full h-[calc(100vh-0rem)] bg-gray-900">
      {/* Fullscreen map */}
      <MapContainer className="absolute inset-0" onMapLoad={(m) => { mapInstanceRef.current = m; }} />

      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between p-2 sm:p-3">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="flex items-center gap-2 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-xl px-2.5 py-1.5 sm:px-3 sm:py-2 shadow-lg hover:bg-white dark:hover:bg-gray-800 transition-colors"
        >
          {sidebarOpen ? <X className="w-5 h-5 text-gray-700 dark:text-gray-300" /> : <Menu className="w-5 h-5 text-gray-700 dark:text-gray-300" />}
          <div className="w-7 h-7 rounded-lg bg-primary-600 flex items-center justify-center">
            <ShieldCheck className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-gray-900 dark:text-gray-100 hidden sm:block">GeoAware</span>
        </button>

        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Filter Panel */}
          <div className="relative">
            <EarthquakeFilterPanel
              filters={filters}
              onFilterChange={handleFilterChange}
              isOpen={filterOpen}
              onToggle={() => { setFilterOpen(!filterOpen); setHistoryOpen(false); }}
            />
          </div>

          <div className="flex items-center gap-0.5 sm:gap-1 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-xl p-1 sm:p-1.5 shadow-lg">
            <button
              onClick={() => toggleLayer('faults')}
              className={cn('flex items-center gap-1.5 px-2 py-1.5 sm:px-2.5 rounded-lg text-xs font-medium transition-colors',
                showFaults ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              )}
            >
              <Target className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Patahan</span>
            </button>
            <button
              onClick={() => toggleLayer('earthquakes')}
              className={cn('flex items-center gap-1.5 px-2 py-1.5 sm:px-2.5 rounded-lg text-xs font-medium transition-colors',
                showEarthquakes ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300' : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              )}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Gempa</span>
            </button>
          </div>

          <button
            onClick={handleLocateUser}
            className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-xl p-1.5 sm:p-2 shadow-lg hover:bg-white dark:hover:bg-gray-800 transition-colors"
            title="Lokasi saya"
          >
            <Locate className="w-5 h-5 text-primary-600" />
          </button>
        </div>
      </div>

      {/* Sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="absolute inset-0 z-[25] bg-black/40 transition-opacity"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      {sidebarOpen && (
        <div className="absolute inset-y-0 left-0 z-30 w-72 bg-white dark:bg-gray-800 shadow-2xl flex flex-col animate-in">
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

      {/* Bottom: earthquake card — center di mobile, bottom-right di layar besar */}
      <div className="absolute z-20 inset-x-2 bottom-2 sm:inset-x-auto sm:right-4 sm:bottom-4 sm:w-80">
        <div className="bg-gray-900/95 backdrop-blur-md rounded-xl shadow-2xl overflow-hidden border border-gray-700/50">
          {/* Header */}
          <div className="flex items-center justify-between px-3.5 py-2.5 bg-gray-800/80 border-b border-gray-700/50">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-red-500/20 flex items-center justify-center">
                <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
              </div>
              <span className="text-xs font-bold text-gray-100 tracking-wide">Gempa Terbaru</span>
              <span className="text-[10px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded-full font-bold tabular-nums">{recentEarthquakes.length}</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => { setHistoryOpen(!historyOpen); setFilterOpen(false); }}
                className="text-[10px] text-blue-400 font-semibold hover:text-blue-300 transition-colors"
              >
                {historyOpen ? 'Tutup' : 'Riwayat'}
              </button>
              <span className="text-gray-600">·</span>
              <button onClick={() => setEqExpanded(!eqExpanded)} className="text-[10px] text-blue-400 font-semibold hover:text-blue-300 transition-colors">
                {eqExpanded ? 'Tutup' : 'Semua'}
              </button>
            </div>
          </div>
          {/* List */}
          <div className={cn('overflow-y-auto transition-all scrollbar-thin', eqExpanded ? 'max-h-[55vh]' : 'max-h-[200px]')}>
            {recentEarthquakes.map((eq) => (
              <div
                key={eq.id}
                role="button"
                tabIndex={0}
                onClick={() => handleFocusEarthquake(eq)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleFocusEarthquake(eq); }}
                className="px-3.5 py-2.5 hover:bg-gray-800/60 active:bg-gray-700/60 transition-colors cursor-pointer border-b border-gray-800/60 last:border-b-0 focus:outline-none focus:bg-gray-800/60"
              >
                <div className="flex items-start gap-2.5">
                  {/* Magnitude badge */}
                  <div className={cn(
                    'flex-shrink-0 min-w-[42px] h-9 rounded-lg flex items-center justify-center text-[13px] font-black tabular-nums',
                    eq.magnitude >= 7 ? 'bg-red-600/20 text-red-400 ring-1 ring-red-500/30' :
                    eq.magnitude >= 6 ? 'bg-red-500/15 text-red-400 ring-1 ring-red-500/20' :
                    eq.magnitude >= 5 ? 'bg-orange-500/15 text-orange-400 ring-1 ring-orange-500/25' :
                    eq.magnitude >= 4 ? 'bg-amber-500/15 text-amber-400 ring-1 ring-amber-500/20' :
                    'bg-emerald-500/15 text-emerald-400 ring-1 ring-emerald-500/20'
                  )}>
                    {eq.magnitude.toFixed(1)}
                  </div>
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-semibold text-gray-100 truncate leading-tight">{eq.place}</p>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      <span className="text-[9px] text-gray-400 tabular-nums">{eq.depth} km</span>
                      <span className="text-gray-600">·</span>
                      <span className="text-[9px] text-gray-400">{formatRelativeTime(eq.time)}</span>
                      {eq.source && (
                        <>
                          <span className="text-gray-600">·</span>
                          <span className={cn(
                            'text-[9px] font-bold uppercase tracking-wider',
                            eq.source === 'BMKG' ? 'text-sky-400' : eq.source === 'USGS' ? 'text-violet-400' : 'text-gray-400'
                          )}>{eq.source}</span>
                        </>
                      )}
                      {eq.tsunami && (
                        <span className="text-[9px] bg-sky-500/20 text-sky-400 px-1 rounded font-semibold">🌊</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {recentEarthquakes.length === 0 && (
              <div className="px-3 py-6 text-center">
                <Navigation className="w-5 h-5 text-gray-600 mx-auto mb-1.5 animate-pulse" />
                <p className="text-[10px] text-gray-500">Memuat data gempa...</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* History List Panel */}
      <EarthquakeHistoryList
        isOpen={historyOpen}
        onToggle={() => { setHistoryOpen(!historyOpen); setFilterOpen(false); }}
        onFocusEarthquake={handleFocusEarthquake}
      />
    </div>
  );
}
