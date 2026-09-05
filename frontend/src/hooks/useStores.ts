import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Coordinates, FaultLine, EarthquakeEvent, RiskAssessment } from '@geoaware/shared';

interface MapState {
  center: Coordinates;
  zoom: number;
  style: 'standard' | 'satellite' | 'hybrid';
  showFaults: boolean;
  showEarthquakes: boolean;
  showSoil: boolean;
  selectedFault: FaultLine | null;
  setCenter: (center: Coordinates) => void;
  setZoom: (zoom: number) => void;
  setStyle: (style: 'standard' | 'satellite' | 'hybrid') => void;
  toggleLayer: (layer: 'faults' | 'earthquakes' | 'soil') => void;
  selectFault: (fault: FaultLine | null) => void;
}

interface RiskState {
  currentAssessment: RiskAssessment | null;
  assessments: RiskAssessment[];
  setAssessment: (assessment: RiskAssessment) => void;
  addAssessment: (assessment: RiskAssessment) => void;
  clearAssessment: () => void;
}

interface AlertState {
  events: EarthquakeEvent[];
  unreadCount: number;
  addEvent: (event: EarthquakeEvent) => void;
  markRead: () => void;
  setEvents: (events: EarthquakeEvent[]) => void;
}

interface OfflineState {
  regions: { id: string; name: string; bounds: any; progress: number }[];
  isDownloading: boolean;
  addRegion: (region: OfflineState['regions'][0]) => void;
  updateProgress: (id: string, progress: number) => void;
  removeRegion: (id: string) => void;
  setDownloading: (downloading: boolean) => void;
}

export const useMapStore = create<MapState>()(
  persist(
    (set) => ({
      center: { latitude: -2.5489, longitude: 118.0149 },
      zoom: 5,
      style: 'hybrid',
      showFaults: true,
      showEarthquakes: true,
      showSoil: false,
      selectedFault: null,
      setCenter: (center) => set({ center }),
      setZoom: (zoom) => set({ zoom }),
      setStyle: (style) => set({ style }),
      toggleLayer: (layer) => set((state) => {
        if (layer === 'faults') return { showFaults: !state.showFaults };
        if (layer === 'earthquakes') return { showEarthquakes: !state.showEarthquakes };
        if (layer === 'soil') return { showSoil: !state.showSoil };
        return {};
      }),
      selectFault: (fault) => set({ selectedFault: fault }),
    }),
    { name: 'geoaware-map', storage: createJSONStorage(() => localStorage), version: 1, migrate: (state: any) => { state.style = 'hybrid'; return state; } }
  )
);

export const useRiskStore = create<RiskState>((set) => ({
  currentAssessment: null,
  assessments: [],
  setAssessment: (assessment) => set({ currentAssessment: assessment }),
  addAssessment: (assessment) => set((state) => ({ assessments: [assessment, ...state.assessments.slice(0, 9)] })),
  clearAssessment: () => set({ currentAssessment: null }),
}));

export const useAlertStore = create<AlertState>()(
  persist(
    (set) => ({
      events: [],
      unreadCount: 0,
      addEvent: (event) => set((state) => ({ 
        events: [event, ...state.events.slice(0, 99)], 
        unreadCount: state.unreadCount + 1 
      })),
      markRead: () => set({ unreadCount: 0 }),
      setEvents: (events) => set({ events }),
    }),
    { name: 'geoaware-alerts', storage: createJSONStorage(() => localStorage) }
  )
);

export const useOfflineStore = create<OfflineState>()(
  persist(
    (set) => ({
      regions: [],
      isDownloading: false,
      addRegion: (region) => set((state) => ({ regions: [...state.regions, region] })),
      updateProgress: (id, progress) => set((state) => ({ 
        regions: state.regions.map(r => r.id === id ? { ...r, progress } : r) 
      })),
      removeRegion: (id) => set((state) => ({ regions: state.regions.filter(r => r.id !== id) })),
      setDownloading: (downloading) => set({ isDownloading: downloading }),
    }),
    { name: 'geoaware-offline', storage: createJSONStorage(() => localStorage) }
  )
);
