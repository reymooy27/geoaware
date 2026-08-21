import { useEffect, useRef, useState, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { useMapStore } from '@/hooks/useStores';
import { useQuery } from '@/hooks/useQuery';
import type { FaultLine, EarthquakeEvent, Coordinates } from '@geoaware/shared';
import { getFaultTypeColor, getRiskColor } from '@/utils/helpers';

mapboxgl.accessToken = (import.meta as any).env?.VITE_MAPBOX_TOKEN || '';

interface MapContainerProps {
  className?: string;
  onMapLoad?: (map: mapboxgl.Map) => void;
}

export function MapContainer({ className, onMapLoad }: MapContainerProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  
  const { center, zoom, style, showFaults, showEarthquakes, setCenter, setZoom, selectFault } = useMapStore();
  const { fetchFaults, fetchEarthquakes, loading } = useQuery();

  const initializeMap = useCallback(async () => {
    if (map.current || !mapRef.current) return;

    const initialCenter: [number, number] = [center.longitude, center.latitude];
    
    const styleUrls = {
      standard: 'mapbox://styles/mapbox/light-v11',
      satellite: 'mapbox://styles/mapbox/satellite-v9',
      hybrid: 'mapbox://styles/mapbox/satellite-streets-v12',
    };

    map.current = new mapboxgl.Map({
      container: mapRef.current,
      style: styleUrls[style],
      center: initialCenter,
      zoom: zoom,
      attributionControl: false,
      preserveDrawingBuffer: true,
    });

    map.current.addControl(new mapboxgl.NavigationControl({ showCompass: false }), 'top-right');
    map.current.addControl(new mapboxgl.GeolocateControl({
      positionOptions: { enableHighAccuracy: true },
      trackUserLocation: true,
      showUserHeading: true,
    }), 'top-right');

    map.current.on('load', () => {
      setMapLoaded(true);
      loadMapLayers();
      onMapLoad?.(map.current!);
    });

    map.current.on('moveend', () => {
      if (map.current) {
        const c = map.current.getCenter();
        const z = map.current.getZoom();
        setCenter({ latitude: c.lat, longitude: c.lng });
        setZoom(z);
      }
    });

    map.current.on('style.load', () => {
      loadMapLayers();
    });
  }, [center, zoom, style, setCenter, setZoom, onMapLoad]);

  const loadMapLayers = async () => {
    if (!map.current) return;

    if (showFaults) {
      await addFaultLayer();
    } else {
      removeLayer('fault-lines');
      removeLayer('fault-lines-glow');
    }

    if (showEarthquakes) {
      await addEarthquakeLayer();
    } else {
      removeLayer('earthquakes');
      removeLayer('earthquakes-cluster');
      removeLayer('earthquakes-cluster-count');
    }
  };

  const addFaultLayer = async () => {
    if (!map.current) return;
    
    try {
      const faults = await fetchFaults();
      
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

      if (map.current.getSource('faults')) {
        (map.current.getSource('faults') as mapboxgl.GeoJSONSource).setData(geojson);
        return;
      }

      map.current.addSource('faults', { type: 'geojson', data: geojson });

      map.current.addLayer({
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

      map.current.addLayer({
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

      map.current.on('click', 'fault-lines', (e) => {
        const feature = e.features?.[0];
        const props = feature?.properties as { id?: string } | undefined;
        if (props?.id) {
          const fault = faults.find(f => f.id === props.id);
          if (fault) selectFault(fault);
        }
      });

      map.current.on('mouseenter', 'fault-lines', () => {
        map.current!.getCanvas().style.cursor = 'pointer';
      });

      map.current.on('mouseleave', 'fault-lines', () => {
        map.current!.getCanvas().style.cursor = '';
      });
    } catch (error) {
      console.error('Failed to load fault lines:', error);
    }
  };

  const addEarthquakeLayer = async () => {
    if (!map.current) return;

    try {
      const events = await fetchEarthquakes({ minMagnitude: 3.0, limit: 500 });
      
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

      if (map.current.getSource('earthquakes')) {
        (map.current.getSource('earthquakes') as mapboxgl.GeoJSONSource).setData(geojson);
        return;
      }

      map.current.addSource('earthquakes', { 
        type: 'geojson', 
        data: geojson,
        cluster: true,
        clusterMaxZoom: 14,
        clusterRadius: 50,
      });

      map.current.addLayer({
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

      map.current.addLayer({
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

      map.current.addLayer({
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

      map.current.on('click', 'earthquakes', (e) => {
        const feature = e.features?.[0];
        if (feature) {
          const props = feature.properties;
          showEarthquakePopup(e.lngLat, props);
        }
      });

      map.current.on('click', 'earthquakes-cluster', (e) => {
        const features = map.current!.queryRenderedFeatures(e.point, { layers: ['earthquakes-cluster'] });
        if (features[0]) {
          const clusterId = features[0].properties?.cluster_id;
          const source = map.current!.getSource('earthquakes') as mapboxgl.GeoJSONSource;
          source.getClusterExpansionZoom(clusterId, (err, zoom) => {
            if (!err && zoom) {
              map.current!.easeTo({ center: e.lngLat, zoom: zoom });
            }
          });
        }
      });

      map.current.on('mouseenter', 'earthquakes', () => {
        map.current!.getCanvas().style.cursor = 'pointer';
      });
      map.current.on('mouseenter', 'earthquakes-cluster', () => {
        map.current!.getCanvas().style.cursor = 'pointer';
      });
      map.current.on('mouseleave', 'earthquakes', () => {
        map.current!.getCanvas().style.cursor = '';
      });
      map.current.on('mouseleave', 'earthquakes-cluster', () => {
        map.current!.getCanvas().style.cursor = '';
      });
    } catch (error) {
      console.error('Failed to load earthquakes:', error);
    }
  };

  const showEarthquakePopup = (lngLat: mapboxgl.LngLat, props: any) => {
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
      .addTo(map.current!);
  };

  const removeLayer = (id: string) => {
    if (map.current?.getLayer(id)) {
      map.current.removeLayer(id);
    }
    if (map.current?.getSource(id.replace('-lines', '').replace('-cluster', ''))) {
      map.current.removeSource(id.replace('-lines', '').replace('-cluster', ''));
    }
  };

  useEffect(() => {
    initializeMap();
    return () => {
      map.current?.remove();
      map.current = null;
      setMapLoaded(false);
    };
  }, [initializeMap]);

  useEffect(() => {
    if (!mapLoaded || !map.current) return;
    
    const styleUrls = {
      standard: 'mapbox://styles/mapbox/light-v11',
      satellite: 'mapbox://styles/mapbox/satellite-v9',
      hybrid: 'mapbox://styles/mapbox/satellite-streets-v12',
    };
    
    map.current.setStyle(styleUrls[style]);
  }, [style, mapLoaded]);

  useEffect(() => {
    if (!mapLoaded || !map.current) return;
    loadMapLayers();
  }, [showFaults, showEarthquakes, mapLoaded]);

  return (
    <div 
      ref={mapRef} 
      className={cn('w-full h-full', className)} 
      role="application"
      aria-label="Peta interaktif risiko gempa GeoAware"
    />
  );
}

import { cn } from '../../utils/helpers';