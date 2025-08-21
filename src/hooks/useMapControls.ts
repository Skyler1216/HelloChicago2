import { useCallback } from 'react';
import mapboxgl from 'mapbox-gl';

export function useMapControls() {
  // Navigation/Geolocate controls are no longer used in UI
  const addNavigationControl = useCallback((_: mapboxgl.Map) => {}, []);
  const addGeolocateControl = useCallback(
    (_: mapboxgl.Map, __: (coords: [number, number]) => void) => null,
    []
  );

  // Custom building toggle control no longer injected; visibility is handled programmatically
  const addBuildingToggleControl = useCallback(
    (
      _map: mapboxgl.Map,
      _showBuildings: boolean,
      _onChange: (show: boolean) => void
    ) => null,
    []
  );

  const centerOnLocation = useCallback(
    (map: mapboxgl.Map, coordinates: [number, number], zoom: number = 11) => {
      map.flyTo({
        center: coordinates,
        zoom,
        duration: 2000,
      });
    },
    []
  );

  const updateMapStyle = useCallback((map: mapboxgl.Map, style: string) => {
    map.setStyle(style);
  }, []);

  const updateBuildingVisibility = useCallback(
    (map: mapboxgl.Map, showBuildings: boolean) => {
      try {
        if (map.getLayer('building')) {
          if (showBuildings) {
            map.setLayoutProperty('building', 'visibility', 'visible');
            map.setPaintProperty('building', 'fill-color', '#f0f0f0');
            map.setPaintProperty('building', 'fill-opacity', 0.8);
          } else {
            map.setLayoutProperty('building', 'visibility', 'none');
          }
        }
      } catch {
        console.log('Building layer not available in current style');
      }
    },
    []
  );

  return {
    addNavigationControl,
    addGeolocateControl,
    addBuildingToggleControl,
    centerOnLocation,
    updateMapStyle,
    updateBuildingVisibility,
  };
}
