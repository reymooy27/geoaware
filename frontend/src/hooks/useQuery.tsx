import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import type { FaultLine, EarthquakeEvent, SoilType, RiskAssessment, EvacuationRoute, AssemblyPoint } from '@geoaware/shared';

interface QueryContextType {
  fetchFaults: (params?: { latitude?: number; longitude?: number; radiusKm?: number }) => Promise<FaultLine[]>;
  fetchEarthquakes: (params?: { minMagnitude?: number; limit?: number }) => Promise<EarthquakeEvent[]>;
  fetchSoilTypes: () => Promise<SoilType[]>;
  assessRisk: (latitude: number, longitude: number, address?: string) => Promise<RiskAssessment>;
  fetchEvacuationRoutes: (latitude: number, longitude: number, radiusKm?: number) => Promise<EvacuationRoute[]>;
  fetchAssemblyPoints: (latitude: number, longitude: number, radiusKm?: number) => Promise<AssemblyPoint[]>;
  loading: Record<string, boolean>;
}

const QueryContext = createContext<QueryContextType | undefined>(undefined);

const API_BASE = '/api';

export function QueryProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  const setLoadingKey = useCallback((key: string, value: boolean) => {
    setLoading(prev => ({ ...prev, [key]: value }));
  }, []);

  const fetchFaults = useCallback(async (params?: { latitude?: number; longitude?: number; radiusKm?: number }) => {
    setLoadingKey('faults', true);
    try {
      const searchParams = new URLSearchParams();
      if (params?.latitude) searchParams.set('latitude', params.latitude.toString());
      if (params?.longitude) searchParams.set('longitude', params.longitude.toString());
      if (params?.radiusKm) searchParams.set('radiusKm', params.radiusKm.toString());
      
      const response = await fetch(`${API_BASE}/faults?${searchParams}`);
      if (!response.ok) throw new Error('Failed to fetch faults');
      return response.json();
    } finally {
      setLoadingKey('faults', false);
    }
  }, [setLoadingKey]);

  const fetchEarthquakes = useCallback(async (params?: { minMagnitude?: number; limit?: number }) => {
    setLoadingKey('earthquakes', true);
    try {
      const searchParams = new URLSearchParams();
      if (params?.minMagnitude) searchParams.set('minMagnitude', params.minMagnitude.toString());
      if (params?.limit) searchParams.set('limit', params.limit.toString());
      
      const response = await fetch(`${API_BASE}/earthquakes?${searchParams}`);
      if (!response.ok) throw new Error('Failed to fetch earthquakes');
      const data = await response.json();
      return data.events || data;
    } finally {
      setLoadingKey('earthquakes', false);
    }
  }, [setLoadingKey]);

  const fetchSoilTypes = useCallback(async () => {
    setLoadingKey('soil', true);
    try {
      const response = await fetch(`${API_BASE}/faults/soil-types`);
      if (!response.ok) throw new Error('Failed to fetch soil types');
      return response.json();
    } finally {
      setLoadingKey('soil', false);
    }
  }, [setLoadingKey]);

  const assessRisk = useCallback(async (latitude: number, longitude: number, address?: string) => {
    setLoadingKey('risk', true);
    try {
      const response = await fetch(`${API_BASE}/risk/assess`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ latitude, longitude, address }),
      });
      if (!response.ok) throw new Error('Failed to assess risk');
      return response.json();
    } finally {
      setLoadingKey('risk', false);
    }
  }, [setLoadingKey]);

  const fetchEvacuationRoutes = useCallback(async (latitude: number, longitude: number, radiusKm = 10) => {
    setLoadingKey('evacuation', true);
    try {
      const response = await fetch(`${API_BASE}/offline/evacuation-routes?latitude=${latitude}&longitude=${longitude}&radiusKm=${radiusKm}`);
      if (!response.ok) throw new Error('Failed to fetch evacuation routes');
      return response.json();
    } finally {
      setLoadingKey('evacuation', false);
    }
  }, [setLoadingKey]);

  const fetchAssemblyPoints = useCallback(async (latitude: number, longitude: number, radiusKm = 20) => {
    setLoadingKey('assembly', true);
    try {
      const response = await fetch(`${API_BASE}/offline/assembly-points?latitude=${latitude}&longitude=${longitude}&radiusKm=${radiusKm}`);
      if (!response.ok) throw new Error('Failed to fetch assembly points');
      return response.json();
    } finally {
      setLoadingKey('assembly', false);
    }
  }, [setLoadingKey]);

  return (
    <QueryContext.Provider value={{
      fetchFaults,
      fetchEarthquakes,
      fetchSoilTypes,
      assessRisk,
      fetchEvacuationRoutes,
      fetchAssemblyPoints,
      loading,
    }}>
      {children}
    </QueryContext.Provider>
  );
}

export function useQuery() {
  const context = useContext(QueryContext);
  if (!context) {
    throw new Error('useQuery must be used within a QueryProvider');
  }
  return context;
}