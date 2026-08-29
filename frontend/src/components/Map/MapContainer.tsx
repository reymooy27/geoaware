import { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useMapStore } from '@/hooks/useStores';
import { useQuery } from '@/hooks/useQuery';
import type { FaultLine, EarthquakeEvent, Coordinates } from '@geoaware/shared';
import { getFaultTypeColor, getRiskColor, cn } from '@/utils/helpers';

mapboxgl.accessToken = (import.meta as any).env?.VITE_MAPBOX_TOKEN || '';

interface MapContainerProps {
  className?: string;
  onMapLoad?: (map: mapboxgl.Map) => void;
}

export function MapContainer({ className, onMapLoad }: MapContainerProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  
  const { style, showFaults, showEarthquakes, selectFault } = useMapStore();
  const { fetchFaults, fetchEarthquakes } = useQuery();

  const styleUrls = {
    standard: 'mapbox://styles/mapbox/light-v11',
    satellite: 'mapbox://styles/mapbox/satellite-v9',
    hybrid: 'mapbox://styles/mapbox/satellite-streets-v12',
  };

  useEffect(() => {
    if (map.current || !mapRef.current) return;

    const m = new mapboxgl.Map({
      container: mapRef.current,
      style: styleUrls[style] || styleUrls.hybrid,
      center: [118.0149, -2.5489],
      zoom: 5,
      attributionControl: false,
      preserveDrawingBuffer: true,
    });

    m.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right');
    m.addControl(new mapboxgl.GeolocateControl({
      positionOptions: { enableHighAccuracy: true },
      trackUserLocation: true,
      showUserHeading: true,
    }), 'top-right');

    m.on('load', () => {
      map.current = m;
      setMapLoaded(true);
      onMapLoad?.(m);
    });

    return () => {
      m.remove();
      map.current = null;
      setMapLoaded(false);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const addFaultLayer = async (m: mapboxgl.Map) => {
    try {
      const faults = await fetchFaults();
      if (!faults || faults.length === 0) return;
      
      const geojson = {
        type: 'FeatureCollection' as const,
        features: faults.map(fault => ({
          type: 'Feature' as const,
          geometry: fault.geometry,
          properties: {
            id: fault.id,
            name: fault.name,
            type: fault.type,
            maxMagnitude: fault.maxMagnitude,
            activityLevel: fault.activityLevel,
          },
        })),
      };

      if (m.getSource('faults')) {
        (m.getSource('faults') as mapboxgl.GeoJSONSource).setData(geojson);
        return;
      }

      m.addSource('faults', { type: 'geojson', data: geojson });

      m.addLayer({
        id: 'fault-lines-glow',
        type: 'line',
        source: 'faults',
        paint: {
          'line-color': [
            'match',
            ['get', 'type'],
            'active', '#ef4444',
            'megathrust', '#dc2626',
            'inactive', '#9ca3af',
            '#9ca3af'
          ],
          'line-width': ['interpolate', ['linear'], ['zoom'], 4, 1, 10, 3, 18, 6],
          'line-opacity': 0.3,
          'line-blur': 2,
        },
      });

      m.addLayer({
        id: 'fault-lines',
        type: 'line',
        source: 'faults',
        paint: {
          'line-color': [
            'match',
            ['get', 'type'],
            'active', '#ef4444',
            'megathrust', '#dc2626',
            'inactive', '#9ca3af',
            '#9ca3af'
          ],
          'line-width': ['interpolate', ['linear'], ['zoom'], 4, 1, 10, 2, 18, 4],
          'line-opacity': 0.9,
        },
      });

      m.on('click', 'fault-lines', (e) => {
        const feature = e.features?.[0];
        const props = feature?.properties as { id?: string } | undefined;
        if (props?.id) {
          const fault = faults.find(f => f.id === props.id);
          if (fault) selectFault(fault);
        }
      });

      m.on('mouseenter', 'fault-lines', () => { m.getCanvas().style.cursor = 'pointer'; });
      m.on('mouseleave', 'fault-lines', () => { m.getCanvas().style.cursor = ''; });
    } catch (error) {
      console.error('Failed to load fault lines:', error);
    }
  };

  const addEarthquakeLayer = async (m: mapboxgl.Map) => {
    try {
      const events = await fetchEarthquakes({ minMagnitude: 3.0, limit: 500, endpoint: 'earthquakes/map' });
      if (!events || events.length === 0) return;
      
      const geojson = {
        type: 'FeatureCollection' as const,
        features: events.map(event => ({
          type: 'Feature' as const,
          geometry: {
            type: 'Point' as const,
            coordinates: [event.location.longitude, event.location.latitude],
          },
          properties: {
            id: event.id,
            magnitude: event.magnitude,
            place: event.place,
            time: event.time,
            source: event.source,
          },
        })),
      };

      if (m.getSource('earthquakes')) {
        (m.getSource('earthquakes') as mapboxgl.GeoJSONSource).setData(geojson);
        return;
      }

      m.addSource('earthquakes', { 
        type: 'geojson', 
        data: geojson,
        cluster: true,
        clusterMaxZoom: 14,
        clusterRadius: 50,
      });

      m.addLayer({
        id: 'earthquakes-cluster',
        type: 'circle',
        source: 'earthquakes',
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': [
            'step',
            ['get', 'point_count'],
            '#f97316', 10,
            '#ef4444', 50,
            '#dc2626'
          ],
          'circle-radius': ['step', ['get', 'point_count'], 20, 10, 30, 50, 40],
          'circle-opacity': 0.8,
        },
      });

      m.addLayer({
        id: 'earthquakes-cluster-count',
        type: 'symbol',
        source: 'earthquakes',
        filter: ['has', 'point_count'],
        layout: {
          'text-field': '{point_count_abbreviated}',
          'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
          'text-size': 12,
        },
        paint: {
          'text-color': '#ffffff',
        },
      });

      m.addLayer({
        id: 'earthquakes',
        type: 'circle',
        source: 'earthquakes',
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['get', 'magnitude'], 3, 6, 5, 12, 7, 20, 9, 30],
          'circle-color': [
            'interpolate',
            ['linear'],
            ['get', 'magnitude'],
            3, '#f97316',
            5, '#ef4444',
            7, '#dc2626',
            9, '#7f1d1d'
          ],
          'circle-opacity': 0.8,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#ffffff',
        },
      });

      m.on('click', 'earthquakes', (e) => {
        const feature = e.features?.[0];
        if (feature) {
          const props = feature.properties;
          showEarthquakePopup(e.lngLat, props);
        }
      });

      m.on('click', 'earthquakes-cluster', (e) => {
        const features = m.queryRenderedFeatures(e.point, { layers: ['earthquakes-cluster'] });
        if (features[0]) {
          const clusterId = features[0].properties?.cluster_id;
          const source = m.getSource('earthquakes') as mapboxgl.GeoJSONSource;
          source.getClusterExpansionZoom(clusterId, (err, zoom) => {
            if (!err && zoom) m.easeTo({ center: e.lngLat, zoom: zoom });
          });
        }
      });

      m.on('mouseenter', 'earthquakes', () => { m.getCanvas().style.cursor = 'pointer'; });
      m.on('mouseenter', 'earthquakes-cluster', () => { m.getCanvas().style.cursor = 'pointer'; });
      m.on('mouseleave', 'earthquakes', () => { m.getCanvas().style.cursor = ''; });
      m.on('mouseleave', 'earthquakes-cluster', () => { m.getCanvas().style.cursor = ''; });
    } catch (error) {
      console.error('Failed to load earthquakes:', error);
    }
  };

  const showEarthquakePopup = (lngLat: mapboxgl.LngLat, props: any) => {
    if (!map.current) return;
    new mapboxgl.Popup({ closeButton: true, closeOnClick: true })
      .setLngLat(lngLat)
      .setHTML(`
        <div class="p-2 min-w-[200px]">
          <div class="font-semibold text-gray-900 dark:text-gray-100">${props.place}</div>
          <div class="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Magnitudo: <span class="font-mono ${getRiskColor(props.magnitude >= 7 ? 'critical' : props.magnitude >= 5 ? 'high' : 'medium')}">${props.magnitude.toFixed(1)} SR</span>
          </div>
          <div class="text-sm text-gray-600 dark:text-gray-400">
            Sumber: ${props.source}
          </div>
          <div class="text-xs text-gray-500 dark:text-gray-500 mt-1">
            ${new Date(props.time).toLocaleString('id-ID')}
          </div>
        </div>
      `)
      .addTo(map.current);
  };

  // Change map style & reload layers after style loads
  useEffect(() => {
    const m = map.current;
    if (!m) return;
    const newStyle = styleUrls[style as keyof typeof styleUrls];
    if (!newStyle) return;
    m.setStyle(newStyle);
    m.once('style.load', () => {
      if (map.current === m) loadMapLayers();
    });
  }, [style]);

  const loadMapLayers = useCallback(async () => {
    const m = map.current;
    if (!m || !m.isStyleLoaded()) return;
    if (showFaults) {
      await addFaultLayer(m);
    } else {
      removeLayer(m, 'fault-lines-glow');
      removeLayer(m, 'fault-lines');
      removeSourceSafe(m, 'faults');
    }
    if (showEarthquakes) {
      await addEarthquakeLayer(m);
    } else {
      removeLayer(m, 'earthquakes-cluster');
      removeLayer(m, 'earthquakes-cluster-count');
      removeLayer(m, 'earthquakes');
      removeSourceSafe(m, 'earthquakes');
    }
  }, [showFaults, showEarthquakes]);

  useEffect(() => {
    if (!mapLoaded) return;
    const m = map.current;
    if (!m) return;
    if (m.isStyleLoaded()) { loadMapLayers(); } else {
      const handler = () => { if (m.isStyleLoaded()) { loadMapLayers(); m.off('style.load', handler); } };
      m.on('style.load', handler);
    }
  }, [mapLoaded, loadMapLayers]);

  return (
    <div 
      ref={mapRef} 
      className={cn('w-full h-full', className)} 
      role="application"
      aria-label="Peta interaktif risiko gempa GeoAware"
    />
  );
}

function removeLayer(m: mapboxgl.Map, id: string) {
  try { if (m.getLayer(id)) m.removeLayer(id); } catch {}
}

function removeSourceSafe(m: mapboxgl.Map, id: string) {
  try { if (m.getSource(id)) m.removeSource(id); } catch {}
}