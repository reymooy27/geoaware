import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import {
  SlidersHorizontal,
  X,
  Calendar,
  MapPin,
  Activity,
  Radio,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Search,
} from "lucide-react";
import { cn } from "@/utils/helpers";
import type { EarthquakeFilterParams } from "@/hooks/useQuery";

interface EarthquakeFilterPanelProps {
  filters: EarthquakeFilterParams;
  onFilterChange: (filters: EarthquakeFilterParams) => void;
  isOpen: boolean;
  onToggle: () => void;
  totalResults?: number;
}

const DATE_PRESETS = [
  { label: "7 hari terakhir", days: 7 },
  { label: "30 hari terakhir", days: 30 },
  { label: "90 hari terakhir", days: 90 },
  { label: "1 tahun terakhir", days: 365 },
];

const MAGNITUDE_PRESETS = [
  { label: "Semua (≥0)", min: 0, max: 10 },
  { label: "Ringan (3-4)", min: 3, max: 4 },
  { label: "Sedang (4-5)", min: 4, max: 5 },
  { label: "Kuat (5-6)", min: 5, max: 6 },
  { label: "Sangat Kuat (6-7)", min: 6, max: 7 },
  { label: "Ekstrem (≥7)", min: 7, max: 10 },
];

function isoToDateInput(iso?: string): string {
  if (!iso) return "";
  return new Date(iso).toISOString().split("T")[0];
}

function startOfDayUTC(date: Date): string {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}

function endOfDayUTC(date: Date): string {
  const d = new Date(date);
  d.setUTCHours(23, 59, 59, 999);
  return d.toISOString();
}

function daysFromToday(dateInput: string): number {
  if (!dateInput) return 0;
  const start = new Date(dateInput + "T00:00:00Z");
  const now = new Date();
  now.setUTCHours(0, 0, 0, 0);
  return Math.floor((now.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
}

export function EarthquakeFilterPanel({
  filters,
  onFilterChange,
  isOpen,
  onToggle,
  totalResults = 0,
}: EarthquakeFilterPanelProps) {
  const [dateSectionOpen, setDateSectionOpen] = useState(true);
  const [magSectionOpen, setMagSectionOpen] = useState(true);
  const [sourceSectionOpen, setSourceSectionOpen] = useState(true);
  const [locationSectionOpen, setLocationSectionOpen] = useState(true);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Local filter state — only synced from props on panel open
  const [draft, setDraft] = useState<EarthquakeFilterParams>(() => ({
    minMagnitude: filters.minMagnitude ?? 0,
    maxMagnitude: filters.maxMagnitude,
    startDate: filters.startDate,
    endDate: filters.endDate,
    source: filters.source ?? "ALL",
    place: filters.place,
  }));

  // Sync draft from external filters ONLY when panel opens
  useEffect(() => {
    if (isOpen) {
      setDraft({
        minMagnitude: filters.minMagnitude ?? 0,
        maxMagnitude: filters.maxMagnitude,
        startDate: filters.startDate,
        endDate: filters.endDate,
        source: filters.source ?? "ALL",
        place: filters.place,
      });
    }
  }, [isOpen, filters]);

  const patchDraft = useCallback((patch: Partial<EarthquakeFilterParams>) => {
    setDraft((prev) => ({ ...prev, ...patch }));
  }, []);

  const handleApply = useCallback(() => {
    onFilterChange({ ...draft, offset: 0 });
    onToggle();
  }, [draft, onFilterChange, onToggle]);

  const handleReset = useCallback(() => {
    const resetFilters: EarthquakeFilterParams = {
      minMagnitude: 0,
      source: "ALL",
    };
    setDraft(resetFilters);
    onFilterChange(resetFilters);
  }, [onFilterChange]);

  // Date helpers using draft state
  const dateRange = useMemo(
    () => ({
      start: isoToDateInput(draft.startDate),
      end: isoToDateInput(draft.endDate),
    }),
    [draft.startDate, draft.endDate],
  );

  const sliderDays = useMemo(() => daysFromToday(dateRange.start), [dateRange.start]);

  const updateDateFromSlider = (days: number) => {
    const start = new Date();
    start.setUTCHours(0, 0, 0, 0);
    start.setUTCDate(start.getUTCDate() - days);
    const end = new Date();
    end.setUTCHours(23, 59, 59, 999);
    patchDraft({
      startDate: start.toISOString(),
      endDate: end.toISOString(),
    });
  };

  const handlePresetDate = (days: number) => {
    const start = new Date();
    start.setUTCHours(0, 0, 0, 0);
    start.setUTCDate(start.getUTCDate() - days);
    const end = new Date();
    end.setUTCHours(23, 59, 59, 999);
    patchDraft({
      startDate: start.toISOString(),
      endDate: end.toISOString(),
    });
  };

  const handleDateStartChange = (val: string) => {
    const patch: Partial<EarthquakeFilterParams> = {
      startDate: val ? new Date(val + "T00:00:00Z").toISOString() : undefined,
    };
    if (dateRange.end) {
      patch.endDate = new Date(dateRange.end + "T23:59:59Z").toISOString();
    }
    patchDraft(patch);
  };

  const handleDateEndChange = (val: string) => {
    const patch: Partial<EarthquakeFilterParams> = {
      endDate: val ? new Date(val + "T23:59:59Z").toISOString() : undefined,
    };
    if (dateRange.start) {
      patch.startDate = new Date(dateRange.start + "T00:00:00Z").toISOString();
    }
    patchDraft(patch);
  };

  const handleMagnitudeMinChange = (val: number) => {
    patchDraft({ minMagnitude: val });
  };

  const handleMagnitudeMaxChange = (val: number) => {
    patchDraft({ maxMagnitude: val >= 10 ? undefined : val });
  };

  const handleSourceChange = (src: "BMKG" | "USGS" | "ALL") => {
    patchDraft({ source: src });
  };

  const handlePlaceChange = (val: string) => {
    patchDraft({ place: val || undefined });
  };

  const hasActiveFilters =
    dateRange.start ||
    dateRange.end ||
    (draft.minMagnitude ?? 0) > 0 ||
    (draft.maxMagnitude ?? 10) < 10 ||
    draft.source !== "ALL" ||
    !!draft.place;

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={onToggle}
        className={cn(
          "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors",
          isOpen
            ? "bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300"
            : "bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 shadow-lg",
        )}
        title="Filter Gempa"
      >
        <SlidersHorizontal className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Filter</span>
        {hasActiveFilters && (
          <span className="w-1.5 h-1.5 rounded-full bg-primary-500" />
        )}
      </button>

      {/* Panel */}
      {isOpen && (
        <div className="fixed sm:absolute left-2 right-2 sm:left-auto sm:right-0 top-14 sm:top-12 z-[100] sm:z-30 sm:w-80 max-h-[75vh] sm:max-h-[70vh] bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-primary-600 dark:text-primary-400" />
              <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                Filter Gempa
              </span>
            </div>
            <div className="flex items-center gap-2">
              {hasActiveFilters && (
                <button
                  onClick={handleReset}
                  className="flex items-center gap-1 text-[10px] text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                >
                  <RotateCcw className="w-3 h-3" />
                  Reset
                </button>
              )}
              <button
                onClick={onToggle}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4">
            {/* Date Range Section */}
            <FilterSection
              icon={<Calendar className="w-3.5 h-3.5" />}
              title="Rentang Waktu"
              isOpen={dateSectionOpen}
              onToggle={() => setDateSectionOpen(!dateSectionOpen)}
            >
              {/* Preset buttons */}
              <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-1.5 mb-3">
                {DATE_PRESETS.map((preset) => {
                  const isActive =
                    dateRange.start ===
                      new Date(Date.now() - preset.days * 24 * 60 * 60 * 1000)
                        .toISOString()
                        .split("T")[0] &&
                    dateRange.end === new Date().toISOString().split("T")[0];
                  return (
                    <button
                      key={preset.days}
                      onClick={() => handlePresetDate(preset.days)}
                      className={cn(
                        "px-2 py-1 rounded-md text-[10px] font-medium transition-colors",
                        isActive
                          ? "bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300"
                          : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600",
                      )}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>

              {/* Date inputs */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Dari
                  </label>
                  <input
                    type="date"
                    value={dateRange.start}
                    onChange={(e) => handleDateStartChange(e.target.value)}
                    className="w-full px-2 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-xs text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Sampai
                  </label>
                  <input
                    type="date"
                    value={dateRange.end}
                    onChange={(e) => handleDateEndChange(e.target.value)}
                    className="w-full px-2 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-xs text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  />
                </div>
              </div>

              {/* Date Slider */}
              {dateRange.start && (
                <div className="mt-3">
                  <label className="block text-[10px] font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Geser hari dari awal
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={365}
                    value={sliderDays}
                    onChange={(e) => updateDateFromSlider(parseInt(e.target.value))}
                    className="w-full h-1.5 bg-gray-200 dark:bg-gray-600 rounded-full appearance-none cursor-pointer accent-primary-500"
                  />
                  <div className="flex justify-between text-[9px] text-gray-400 dark:text-gray-500 mt-0.5">
                    <span>Hari ini</span>
                    <span>1 tahun lalu</span>
                  </div>
                </div>
              )}
            </FilterSection>

            {/* Magnitude Section */}
            <FilterSection
              icon={<Activity className="w-3.5 h-3.5" />}
              title="Kekuatan Gempa"
              isOpen={magSectionOpen}
              onToggle={() => setMagSectionOpen(!magSectionOpen)}
            >
              {/* Presets */}
              <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-1.5 mb-3">
                {MAGNITUDE_PRESETS.map((preset) => {
                  const isActive =
                    (draft.minMagnitude ?? 0) === preset.min &&
                    (draft.maxMagnitude ?? 10) === preset.max;
                  return (
                    <button
                      key={preset.label}
                      onClick={() => {
                        patchDraft({
                          minMagnitude: preset.min,
                          maxMagnitude: preset.max >= 10 ? undefined : preset.max,
                        });
                      }}
                      className={cn(
                        "px-2 py-1 rounded-md text-[10px] font-medium transition-colors",
                        isActive
                          ? "bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300"
                          : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600",
                      )}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>

              {/* Dual range sliders */}
              <div className="space-y-2">
                <div>
                  <div className="flex justify-between text-[10px] text-gray-500 dark:text-gray-400 mb-1">
                    <span>Minimum</span>
                    <span className="font-mono font-bold text-orange-600 dark:text-orange-400">
                      {(draft.minMagnitude ?? 0).toFixed(1)} SR
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={10}
                    step={0.5}
                    value={draft.minMagnitude ?? 0}
                    onChange={(e) =>
                      handleMagnitudeMinChange(parseFloat(e.target.value))
                    }
                    className="w-full h-1.5 bg-gray-200 dark:bg-gray-600 rounded-full appearance-none cursor-pointer accent-orange-500"
                  />
                </div>
                <div>
                  <div className="flex justify-between text-[10px] text-gray-500 dark:text-gray-400 mb-1">
                    <span>Maksimum</span>
                    <span className="font-mono font-bold text-red-600 dark:text-red-400">
                      {(draft.maxMagnitude ?? 10) >= 10 ? "∞" : (draft.maxMagnitude ?? 10).toFixed(1)} SR
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={10}
                    step={0.5}
                    value={draft.maxMagnitude ?? 10}
                    onChange={(e) =>
                      handleMagnitudeMaxChange(parseFloat(e.target.value))
                    }
                    className="w-full h-1.5 bg-gray-200 dark:bg-gray-600 rounded-full appearance-none cursor-pointer accent-red-500"
                  />
                </div>
              </div>
            </FilterSection>

            {/* Source Section */}
            <FilterSection
              icon={<Radio className="w-3.5 h-3.5" />}
              title="Sumber Data"
              isOpen={sourceSectionOpen}
              onToggle={() => setSourceSectionOpen(!sourceSectionOpen)}
            >
              <div className="flex gap-1.5">
                {[
                  { value: "ALL" as const, label: "Semua", icon: "📡" },
                  { value: "BMKG" as const, label: "BMKG", icon: "🇮🇩" },
                  { value: "USGS" as const, label: "USGS", icon: "🌍" },
                ].map((s) => (
                  <button
                    key={s.value}
                    onClick={() => handleSourceChange(s.value)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors flex-1",
                      draft.source === s.value
                        ? "bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 ring-1 ring-primary-300 dark:ring-primary-700"
                        : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600",
                    )}
                  >
                    <span>{s.icon}</span>
                    <span>{s.label}</span>
                  </button>
                ))}
              </div>
            </FilterSection>

            {/* Location Search Section */}
            <FilterSection
              icon={<MapPin className="w-3.5 h-3.5" />}
              title="Lokasi Gempa"
              isOpen={locationSectionOpen}
              onToggle={() => setLocationSectionOpen(!locationSectionOpen)}
            >
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={draft.place ?? ""}
                  onChange={(e) => handlePlaceChange(e.target.value)}
                  placeholder="Cari lokasi... (contoh: Sulawesi, Aceh)"
                  className="w-full pl-8 pr-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-xs text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
                {draft.place && (
                  <button
                    onClick={() => {
                      patchDraft({ place: undefined });
                      searchInputRef.current?.focus();
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {[
                  "Jawa",
                  "Sumatera",
                  "Sulawesi",
                  "Bali",
                  "Papua",
                  "NTT",
                  "Maluku",
                ].map((region) => (
                  <button
                    key={region}
                    onClick={() => patchDraft({ place: region })}
                    className={cn(
                      "px-2 py-0.5 rounded text-[10px] font-medium transition-colors",
                      draft.place === region
                        ? "bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300"
                        : "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600",
                    )}
                  >
                    {region}
                  </button>
                ))}
              </div>
            </FilterSection>
          </div>

          {/* Footer */}
          <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-700 dark:bg-gray-750">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-gray-500 dark:text-gray-400">
                {totalResults.toLocaleString("id-ID")} hasil ditemukan
              </span>
              <button
                onClick={handleApply}
                className="px-3 py-1.5 rounded-lg bg-primary-600 text-white text-xs font-medium hover:bg-primary-700 transition-colors"
              >
                Terapkan
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ---------- FilterSection sub-component ---------- */

function FilterSection({
  icon,
  title,
  isOpen,
  onToggle,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="border border-gray-200 dark:border-gray-600 rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-3 py-2 bg-gray-750 dark:bg-gray-750 dark:hover:bg-gray-700 transition-colors"
      >
        <div className="flex items-center gap-2 text-xs font-medium text-gray-700 dark:text-gray-300">
          {icon}
          <span>{title}</span>
        </div>
        {isOpen ? (
          <ChevronUp className="w-3.5 h-3.5 text-gray-400" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
        )}
      </button>
      {isOpen && <div className="px-3 py-3 space-y-2">{children}</div>}
    </div>
  );
}
