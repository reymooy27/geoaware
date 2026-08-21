import { useState, useEffect } from 'react';
import { MapContainer } from '../components/Map/MapContainer';
import { useOfflineStore, useMapStore } from '../hooks/useStores';
import { useQuery } from '../hooks/useQuery';
import { getCurrentLocation } from '../utils/helpers';
import { cn, formatDistance } from '../utils/helpers';
import {
  Download, Map, Navigation, MapPin, RefreshCw, Trash2, 
  AlertTriangle, Home, Users, Loader2, CheckCircle, XCircle,
  Wifi, WifiOff, Database, Layers
} from 'lucide-react';

export function OfflinePage() {
  const { fetchEvacuationRoutes, fetchAssemblyPoints } = useQuery();
  const { regions, addRegion, updateProgress, removeRegion, setDownloading, isDownloading } = useOfflineStore();
  const { center, setCenter, setZoom } = useMapStore();
  
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [downloadBounds, setDownloadBounds] = useState<{ minLat: number; minLng: number; maxLat: number; maxLng: number } | null>(null);
  const [downloadName, setDownloadName] = useState('');
  const [downloadingRegionId, setDownloadingRegionId] = useState<string | null>(null);
  const [evacuationRoutes, setEvacuationRoutes] = useState<any[]>([]);
  const [assemblyPoints, setAssemblyPoints] = useState<any[]>([]);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    getCurrentLocation().then(pos => {
      setUserLocation({ lat: pos.latitude, lng: pos.longitude });
      setCenter({ latitude: pos.latitude, longitude: pos.longitude });
      loadOfflineData(pos.latitude, pos.longitude);
    }).catch(() => {});
  }, [setCenter]);

  const loadOfflineData = async (lat: number, lng: number) => {
    try {
      const [routes, points] = await Promise.all([
        fetchEvacuationRoutes(lat, lng, 10),
        fetchAssemblyPoints(lat, lng, 20),
      ]);
      setEvacuationRoutes(routes);
      setAssemblyPoints(points);
    } catch (error) {
      console.error('Failed to load offline data:', error);
    }
  };

  const handleMapClick = (e: React.MouseEvent) => {
    // This would need map integration to get coordinates
  };

  const startDownload = async () => {
    if (!downloadBounds || !downloadName.trim()) return;
    
    const id = `region-${Date.now()}`;
    const areaKm2 = calculateArea(downloadBounds);
    const estimatedSize = estimateSize(areaKm2, 10, 16);
    
    const region = {
      id,
      name: downloadName,
      bounds: downloadBounds,
      progress: 0,
    };
    
    addRegion(region);
    setDownloadingRegionId(id);
    setDownloading(true);
    setShowDownloadModal(false);
    setDownloadName('');
    setDownloadBounds(null);
    
    // Simulate download progress
    for (let i = 0; i <= 100; i += 10) {
      await new Promise(r => setTimeout(r, 300));
      updateProgress(id, i);
    }
    
    // Mark as downloaded
    updateProgress(id, 100);
    setDownloadingRegionId(null);
    setDownloading(false);
  };

  const handleDeleteRegion = (id: string) => {
    if (confirm('Hapus peta offline ini?')) {
      removeRegion(id);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">Peta & Navigasi Offline</h1>
          <p className="text-gray-600 dark:text-gray-400">Unduh peta patahan dan rute evakuasi untuk akses tanpa internet</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="card relative h-[500px] overflow-hidden">
              <MapContainer className="h-full w-full" />
              
              <div className="absolute top-4 left-4 right-4 z-10 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-xl p-4 shadow-lg max-w-md">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100">Peta Offline</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Geser dan zoom ke area yang ingin diunduh</p>
                </div>
                <button
                  onClick={() => { 
                    // Get current map bounds and open modal
                    setDownloadBounds({
                      minLat: center.latitude - 0.5,
                      minLng: center.longitude - 0.5,
                      maxLat: center.latitude + 0.5,
                      maxLng: center.longitude + 0.5,
                    });
                    setShowDownloadModal(true);
                  }}
                  className="btn-primary flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Unduh Area Ini
                </button>
              </div>

              {userLocation && (
                <div className="absolute bottom-4 left-4 z-10 bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-xl p-3 shadow-lg">
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="w-4 h-4 text-primary-600" />
                    <span>Lokasi: {userLocation.lat.toFixed(4)}, {userLocation.lng.toFixed(4)}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="card p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                <Database className="w-5 h-5 text-primary-600" />
                Peta Tersimpan ({regions.length}/5)
              </h3>
              <div className="space-y-3">
                {regions.length === 0 ? (
                  <p className="text-gray-500 dark:text-gray-400 text-center py-4">Belum ada peta offline. Unduh area di sebelah kiri.</p>
                ) : (
                  regions.map(region => (
                    <div key={region.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center',
                          region.progress === 100 ? 'bg-green-100 dark:bg-green-900/30' : 'bg-blue-100 dark:bg-blue-900/30'
                        )}>
                          {region.progress === 100 ? (
                            <CheckCircle className="w-5 h-5 text-green-600" />
                          ) : (
                            <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 dark:text-gray-100 text-sm">{region.name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {region.progress < 100 ? `Mengunduh... ${region.progress}%` : 'Siap digunakan offline'}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteRegion(region.id)}
                        disabled={region.progress < 100}
                        className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 disabled:opacity-50"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
              <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg text-sm">
                <p className="text-gray-600 dark:text-gray-400">
                  Maksimal 5 area - Total ukuran &lt; 500 MB - Kedaluwarsa 30 hari
                </p>
              </div>
            </div>

            <div className="card p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                <Navigation className="w-5 h-5 text-blue-600" />
                Rute Evakuasi Terdekat
              </h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {evacuationRoutes.length === 0 ? (
                  <p className="text-gray-500 dark:text-gray-400 text-center py-4">Mengambil data rute evakuasi...</p>
                ) : (
                  evacuationRoutes.slice(0, 5).map((route: any) => (
                    <div key={route.id} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-gray-100 text-sm">{route.assemblyName}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Kapasitas: {route.assemblyCapacity} orang</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-primary-600 text-sm">{formatDistance(route.distanceKm)}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{route.estimatedTimeMin} menit</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="card p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-green-600" />
                Titik Kumpul Terdekat
              </h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {assemblyPoints.length === 0 ? (
                  <p className="text-gray-500 dark:text-gray-400 text-center py-4">Mengambil data titik kumpul...</p>
                ) : (
                  assemblyPoints.slice(0, 5).map((point: any) => (
                    <div key={point.id} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-gray-100 text-sm">{point.name}</p>
                          {point.address && <p className="text-xs text-gray-500 dark:text-gray-400">{point.address}</p>}
                        </div>
                        <span className="badge bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs">
                          Kap: {point.capacity}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {showDownloadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-md w-full animate-in p-6">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">Unduh Peta Offline</h2>
            
            <div className="space-y-4">
              <div>
                <label className="label">Nama Area</label>
                <input
                  type="text"
                  value={downloadName}
                  onChange={(e) => setDownloadName(e.target.value)}
                  placeholder="Contoh: Jakarta Selatan, Bandung, dll"
                  className="input"
                />
              </div>
              
              <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2">Area yang akan diunduh:</p>
                {downloadBounds && (
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Lat:</span>
                      <span className="font-mono ml-2">{downloadBounds.minLat.toFixed(4)} - {downloadBounds.maxLat.toFixed(4)}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Lng:</span>
                      <span className="font-mono ml-2">{downloadBounds.minLng.toFixed(4)} - {downloadBounds.maxLng.toFixed(4)}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Luas:</span>
                      <span className="font-mono ml-2">{calculateArea(downloadBounds).toFixed(1)} km²</span>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400">Est. Ukuran:</span>
                      <span className="font-mono ml-2">{estimateSize(calculateArea(downloadBounds), 10, 16).toFixed(1)} MB</span>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDownloadModal(false)}
                  className="btn-secondary flex-1"
                >
                  Batal
                </button>
                <button
                  onClick={startDownload}
                  disabled={!downloadName.trim() || isDownloading}
                  className="btn-primary flex-1"
                >
                  {isDownloading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Mengunduh...
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      Mulai Unduh
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function calculateArea(bounds: { minLat: number; minLng: number; maxLat: number; maxLng: number }): number {
  const R = 6371;
  const latDiff = (bounds.maxLat - bounds.minLat) * Math.PI / 180;
  const lngDiff = (bounds.maxLng - bounds.minLng) * Math.PI / 180;
  const avgLat = (bounds.maxLat + bounds.minLat) / 2 * Math.PI / 180;
  return R * R * latDiff * lngDiff * Math.cos(avgLat);
}

function estimateSize(areaKm2: number, minZoom: number, maxZoom: number): number {
  let totalTiles = 0;
  for (let z = minZoom; z <= maxZoom; z++) {
    const tileAreaKm2 = (40075 * 40075) / Math.pow(2, 2 * z);
    totalTiles += Math.ceil(areaKm2 / tileAreaKm2);
  }
  return Math.round(totalTiles * 0.0005 * 100) / 100;
}