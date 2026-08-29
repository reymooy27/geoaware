import { useState, useCallback, useEffect } from 'react';
import {
  List, X, ChevronLeft, ChevronRight, MapPin, Clock, Activity,
  Globe, Navigation, Filter
} from 'lucide-react';
import { cn, formatRelativeTime, formatDate } from '@/utils/helpers';
import { useQuery, type EarthquakeFilterParams } from '@/hooks/useQuery';
import { EarthquakeFilterPanel } from './EarthquakeFilterPanel';

interface EarthquakeHistoryListProps {
  isOpen: boolean;
  onToggle: () => void;
  onFocusEarthquake: (eq: any) => void;
}

const PAGE_SIZE = 20;

export function EarthquakeHistoryList({
  isOpen,
  onToggle,
  onFocusEarthquake,
}: EarthquakeHistoryListProps) {
  const { fetchEarthquakesPaginated, loading } = useQuery();
  const [events, setEvents] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [filterOpen, setFilterOpen] = useState(false);
  const [filters, setFilters] = useState<EarthquakeFilterParams>({
    minMagnitude: 0,
    source: 'ALL',
    limit: PAGE_SIZE,
    offset: 0,
  });
  const [selectedEvent, setSelectedEvent] = useState<any>(null);

  const loadEvents = useCallback(async () => {
    try {
      const result = await fetchEarthquakesPaginated({
        ...filters,
        limit: PAGE_SIZE,
        offset: page * PAGE_SIZE,
      });
      setEvents(result.events || []);
      setTotal(result.total || 0);
    } catch (err) {
      console.error('Failed to load earthquake history:', err);
    }
  }, [filters, page, fetchEarthquakesPaginated]);

  useEffect(() => {
    if (isOpen) {
      loadEvents();
    }
  }, [isOpen, loadEvents]);

  const handleFilterChange = useCallback((newFilters: EarthquakeFilterParams) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    setPage(0);
  }, []);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const getMagnitudeColor = (mag: number) => {
    if (mag >= 7) return 'bg-red-500 text-white';
    if (mag >= 6) return 'bg-red-400 text-white';
    if (mag >= 5) return 'bg-orange-500 text-white';
    if (mag >= 4) return 'bg-yellow-500 text-white';
    return 'bg-green-500 text-white';
  };

  const getSourceBadge = (src: string) => {
    const colors: Record<string, string> = {
      BMKG: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300',
      USGS: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300',
      CITIZEN: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
    };
    return colors[src] || 'bg-gray-100 text-gray-600';
  };

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={onToggle}
        className={cn(
          'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors',
          isOpen
            ? 'bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
            : 'bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 shadow-lg'
        )}
        title="Riwayat Gempa"
      >
        <List className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Riwayat</span>
        {total > 0 && (
          <span className="text-[9px] bg-gray-200 dark:bg-gray-600 px-1 rounded-full">
            {total > 999 ? '999+' : total}
          </span>
        )}
      </button>

      {/* Full-width panel */}
      {isOpen && (
        <div className="fixed sm:absolute left-2 right-2 bottom-14 sm:left-auto sm:inset-x-auto sm:right-4 sm:bottom-16 sm:w-96 z-[80] sm:z-30 max-h-[55vh] sm:max-h-[60vh] bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col animate-in">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <List className="w-4 h-4 text-primary-600 dark:text-primary-400" />
              <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                Riwayat Gempa
              </span>
              <span className="text-[10px] bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-1.5 py-0.5 rounded-full">
                {total.toLocaleString('id-ID')}
              </span>
            </div>
            <div className="flex items-center gap-1">
              {/* Filter toggle inside the header */}
              <div className="relative">
                <EarthquakeFilterPanel
                  filters={filters}
                  onFilterChange={handleFilterChange}
                  isOpen={filterOpen}
                  onToggle={() => setFilterOpen(!filterOpen)}
                  totalResults={total}
                />
              </div>
              <button
                onClick={onToggle}
                className="ml-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Event List */}
          <div className="flex-1 overflow-y-auto">
            {loading.earthquakes && events.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <Navigation className="w-6 h-6 text-gray-300 dark:text-gray-600 mx-auto mb-2 animate-pulse" />
                <p className="text-xs text-gray-500 dark:text-gray-400">Memuat data gempa...</p>
              </div>
            ) : events.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <Filter className="w-6 h-6 text-gray-300 dark:text-gray-600 mx-auto mb-2" />
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Tidak ada data gempa ditemukan
                </p>
                <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">
                  Coba ubah filter pencarian
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100/50 dark:divide-gray-700/50">
                {events.map((eq: any) => (
                  <div
                    key={eq.id}
                    className={cn(
                      'px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors cursor-pointer',
                      selectedEvent?.id === eq.id && 'bg-primary-50 dark:bg-primary-900/20'
                    )}
                    onClick={() => {
                      setSelectedEvent(eq);
                      onFocusEarthquake(eq);
                    }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={e => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        setSelectedEvent(eq);
                        onFocusEarthquake(eq);
                      }
                    }}
                  >
                    {/* Magnitude + Place */}
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        'flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold',
                        getMagnitudeColor(eq.magnitude)
                      )}>
                        {eq.magnitude.toFixed(1)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-900 dark:text-gray-100 truncate">
                          {eq.place}
                        </p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className={cn('text-[9px] font-medium px-1.5 py-0.5 rounded', getSourceBadge(eq.source))}>
                            {eq.source}
                          </span>
                          {eq.tsunami && (
                            <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                              🌊 Tsunami
                            </span>
                          )}
                          {eq.felt && (
                            <span className="text-[9px] font-medium px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">
                              Terasa
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Meta row */}
                    <div className="flex items-center gap-3 mt-2 ml-[52px] text-[10px] text-gray-500 dark:text-gray-400">
                      <span className="flex items-center gap-1">
                        <Activity className="w-3 h-3" />
                        {eq.depth} km
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatRelativeTime(eq.time)}
                      </span>
                      {eq.location && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {eq.location.latitude.toFixed(2)}, {eq.location.longitude.toFixed(2)}
                        </span>
                      )}
                    </div>

                    {/* Expanded detail */}
                    {selectedEvent?.id === eq.id && (
                      <div className="mt-2 ml-[52px] p-2 rounded-lg bg-gray-50 dark:bg-gray-750 border border-gray-200/50 dark:border-gray-600/50">
                        <div className="grid grid-cols-2 gap-2 text-[10px]">
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">Waktu:</span>
                            <p className="font-medium text-gray-900 dark:text-gray-100">
                              {formatDate(eq.time)}
                            </p>
                          </div>
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">Kekuatan:</span>
                            <p className="font-medium text-gray-900 dark:text-gray-100">
                              {eq.magnitude.toFixed(1)} SR
                            </p>
                          </div>
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">Kedalaman:</span>
                            <p className="font-medium text-gray-900 dark:text-gray-100">
                              {eq.depth} km
                            </p>
                          </div>
                          <div>
                            <span className="text-gray-500 dark:text-gray-400">Sumber:</span>
                            <p className="font-medium text-gray-900 dark:text-gray-100">{eq.source}</p>
                          </div>
                          {eq.location && (
                            <div className="col-span-2">
                              <span className="text-gray-500 dark:text-gray-400">Koordinat:</span>
                              <p className="font-mono text-gray-900 dark:text-gray-100">
                                {eq.location.latitude.toFixed(4)}, {eq.location.longitude.toFixed(4)}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                className={cn(
                  'flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium transition-colors',
                  page === 0
                    ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                )}
              >
                <ChevronLeft className="w-3 h-3" />
                Sebelumnya
              </button>
              <span className="text-[10px] text-gray-500 dark:text-gray-400">
                Hal {page + 1} dari {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
                className={cn(
                  'flex items-center gap-1 px-2 py-1 rounded text-[10px] font-medium transition-colors',
                  page >= totalPages - 1
                    ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                )}
              >
                Selanjutnya
                <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
