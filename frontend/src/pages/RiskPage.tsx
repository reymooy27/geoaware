import { useState } from 'react';
import { MapContainer } from '../components/Map/MapContainer';
import { useMapStore, useRiskStore } from '../hooks/useStores';
import { useQuery } from '../hooks/useQuery';
import { getCurrentLocation } from '../utils/helpers';
import { cn, formatDistance, getRiskLabel, getRiskColor, getRiskBgColor } from '../utils/helpers';
import { 
  MapPin, Search, Target, ShieldCheck, Home, AlertTriangle, 
  CheckCircle, XCircle, HelpCircle, ChevronDown, ChevronUp, 
  Navigation, Map as MapIcon, Loader2
} from 'lucide-react';

export function RiskPage() {
  const { assessRisk, fetchFaults, loading } = useQuery();
  const { setAssessment, addAssessment, currentAssessment, clearAssessment } = useRiskStore();
  const { center, setCenter, selectFault } = useMapStore();
  
  const [address, setAddress] = useState('');
  const [isAssessing, setIsAssessing] = useState(false);
  const [showChecklist, setShowChecklist] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const handleAssessRisk = async (coords: { latitude: number; longitude: number }, addr?: string) => {
    setIsAssessing(true);
    try {
      const assessment = await assessRisk(coords.latitude, coords.longitude, addr);
      setAssessment(assessment);
      addAssessment(assessment);
      setCenter(coords);
      if (assessment.nearestFault.fault.geometry) {
        selectFault(assessment.nearestFault.fault);
      }
    } catch (error) {
      console.error('Risk assessment failed:', error);
      alert('Gagal menilai risiko. Silakan coba lagi.');
    } finally {
      setIsAssessing(false);
    }
  };

  const handleUseGPS = () => {
    getCurrentLocation().then(pos => {
      handleAssessRisk({ latitude: pos.latitude, longitude: pos.longitude }, 'Lokasi GPS');
    }).catch(() => alert('Tidak dapat mengakses lokasi. Pastikan izin lokasi diaktifkan.'));
  };

  const handleAddressSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!address.trim()) return;
    
    fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1&countrycodes=id`)
      .then(res => res.json())
      .then(data => {
        if (data.length > 0) {
          const coords = { latitude: parseFloat(data[0].lat), longitude: parseFloat(data[0].lon) };
          handleAssessRisk(coords, address);
        } else {
          alert('Alamat tidak ditemukan. Coba dengan format yang lebih lengkap.');
        }
      })
      .catch(() => alert('Gagal mencari alamat.'));
  };

  if (!currentAssessment) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-3xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-gray-100 mb-4">
              Seberapa Aman Rumah Anda?
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400">
              Masukkan alamat atau gunakan GPS untuk mendapatkan analisis risiko gempa lengkap
            </p>
          </div>

          <form onSubmit={handleAddressSubmit} className="card p-6 mb-8">
            <div className="flex gap-3 mb-6">
              <label htmlFor="address" className="sr-only">Alamat atau nama tempat</label>
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="address"
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Contoh: Jl. Sudirman No. 1, Jakarta Selatan"
                  className="input pl-10"
                  autoComplete="address"
                />
              </div>
              <button type="submit" className="btn-primary whitespace-nowrap" disabled={isAssessing || !address.trim()}>
                {isAssessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Menganalisis...
                  </>
                ) : (
                  <>
                    <MapPin className="w-4 h-4" />
                    Cek Risiko
                  </>
                )}
              </button>
            </div>
            <button
              type="button"
              onClick={handleUseGPS}
              className="btn-secondary w-full flex items-center justify-center gap-2"
              disabled={isAssessing}
            >
              <Navigation className="w-4 h-4" />
              Gunakan Lokasi Saya (GPS)
            </button>
          </form>

          <div className="card p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-primary-600" />
              Apa yang akan Anda dapatkan?
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <Target className="w-8 h-8 text-primary-600 mx-auto mb-2" />
                <h3 className="font-medium text-gray-900 dark:text-gray-100">Jarak ke Patahan</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Jarak presisi ke patahan aktif terdekat</p>
              </div>
              <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <AlertTriangle className="w-8 h-8 text-orange-600 mx-auto mb-2" />
                <h3 className="font-medium text-gray-900 dark:text-gray-100">Jenis Tanah & Likuifaksi</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Analisis kerentanan tanah di lokasi Anda</p>
              </div>
              <div className="text-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <ShieldCheck className="w-8 h-8 text-green-600 mx-auto mb-2" />
                <h3 className="font-medium text-gray-900 dark:text-gray-100">Skor Risiko & Rekomendasi</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Rendah/Sedang/Tinggi + checklist bangunan</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const { nearestFault, soilType, riskScore, recommendations, buildingChecklist, location: loc } = currentAssessment;
  const categories = ['all', 'foundation', 'structure', 'roof', 'non-structural'] as const;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      <div className="h-[40vh] min-h-[300px] relative">
        <MapContainer className="h-full w-full" />
        <div className="absolute top-4 left-4 right-4 z-10">
          <div className="max-w-3xl mx-auto">
            <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-xl p-4 shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Lokasi Dianalisis</h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{currentAssessment.address || `${loc.latitude.toFixed(4)}, ${loc.longitude.toFixed(4)}`}</p>
                </div>
                <button
                  onClick={() => { clearAssessment(); setAddress(''); }}
                  className="btn-secondary text-sm"
                >
                  <MapIcon className="w-4 h-4" />
                  Cek Lokasi Lain
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="card p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    <Target className="w-5 h-5 text-primary-600" />
                    Patahan Aktif Terdekat
                  </h3>
                  <span className={cn('badge', getRiskColor(nearestFault.fault.type === 'megathrust' ? 'critical' : 'high'))}>
                    {nearestFault.fault.type === 'megathrust' ? 'Megathrust' : 'Aktif'}
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Nama Patahan</p>
                    <p className="font-semibold text-gray-900 dark:text-gray-100">{nearestFault.fault.name}</p>
                  </div>
                  <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Jarak</p>
                    <p className="font-semibold text-gray-900 dark:text-gray-100 text-xl">{formatDistance(nearestFault.distanceKm)}</p>
                  </div>
                  <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Potensi Magnitudo Max</p>
                    <p className="font-semibold text-gray-900 dark:text-gray-100 text-xl">{nearestFault.fault.maxMagnitude.toFixed(1)} SR</p>
                  </div>
                </div>
              </div>

              <div className="card p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-orange-600" />
                  Kondisi Tanah & Risiko Likuifaksi
                </h3>
                {soilType ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <p className="text-sm text-gray-500 dark:text-gray-400">Jenis Tanah</p>
                      <p className="font-semibold text-gray-900 dark:text-gray-100">{soilType.name}</p>
                    </div>
                    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <p className="text-sm text-gray-500 dark:text-gray-400">Risiko Likuifaksi</p>
                      <p className={cn('font-semibold', getRiskColor(soilType.liquefactionRisk))}>
                        {getRiskLabel(soilType.liquefactionRisk)}
                      </p>
                    </div>
                    {soilType.vs30 && (
                      <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                        <p className="text-sm text-gray-500 dark:text-gray-400">Vs30 (Kecepatan Gelombang)</p>
                        <p className="font-semibold text-gray-900 dark:text-gray-100">{soilType.vs30} m/s</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-gray-500 dark:text-gray-400">Data tanah tidak tersedia untuk lokasi ini</p>
                )}
              </div>
            </div>

            <div className="space-y-6">
              <div className={cn('card p-6 text-center', getRiskBgColor(riskScore))}>
                <div className="flex items-center justify-center gap-2 mb-2">
                  <ShieldCheck className={cn('w-8 h-8', getRiskColor(riskScore))} />
                  <span className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                    Risiko: {getRiskLabel(riskScore)}
                  </span>
                </div>
                <p className="text-gray-600 dark:text-gray-400">
                  Berdasarkan jarak ke patahan, magnitudo potensial, aktivitas patahan, dan kondisi tanah
                </p>
              </div>

              <div className="card p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
                  <Home className="w-5 h-5 text-primary-600" />
                  Rekomendasi Utama
                </h3>
                <ul className="space-y-2">
                  {recommendations.slice(0, 3).map((rec: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-300">
                      <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <div className="lg:col-span-3">
            <div className="card">
              <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-primary-600" />
                    Checklist Bangunan Tahan Gempa
                  </h3>
                  <button
                    onClick={() => setShowChecklist(!showChecklist)}
                    className="btn-secondary text-sm"
                  >
                    {showChecklist ? (
                      <>
                        <ChevronUp className="w-4 h-4" />
                        Sembunyikan
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-4 h-4" />
                        Tampilkan ({buildingChecklist.length} item)
                      </>
                    )}
                  </button>
                </div>
                
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {categories.map(cat => (
                    <button
                      key={cat}
                      onClick={() => setActiveCategory(cat)}
                      className={cn(
                        'px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors',
                        activeCategory === cat
                          ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                          : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                      )}
                    >
                      {cat === 'all' ? 'Semua' : cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {showChecklist && (
                <div className="p-6">
                  <div className="space-y-3">
                    {buildingChecklist
                      .filter((item: any) => activeCategory === 'all' || item.category === activeCategory)
                      .map((item: any) => (
                        <div 
                          key={item.id} 
                          className="flex items-start gap-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
                        >
                          <div className={cn('w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5',
                            item.priority === 'high' ? 'bg-red-100 dark:bg-red-900/30 text-red-600' :
                            item.priority === 'medium' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600' :
                            'bg-green-100 dark:bg-green-900/30 text-green-600'
                          )}>
                            <span className="text-xs font-bold">{item.priority[0].toUpperCase()}</span>
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-gray-900 dark:text-gray-100">{item.question}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{item.description}</p>
                          </div>
                          <input
                            type="checkbox"
                            className="w-5 h-5 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
                            defaultChecked={item.isCompliant}
                          />
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
