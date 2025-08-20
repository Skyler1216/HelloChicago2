import { useCallback } from 'react';
import mapboxgl from 'mapbox-gl';

export function useMapControls() {
  const addNavigationControl = useCallback((map: mapboxgl.Map) => {
    map.addControl(new mapboxgl.NavigationControl(), 'top-right');
  }, []);

  const addGeolocateControl = useCallback(
    (map: mapboxgl.Map, onGeolocate: (coords: [number, number]) => void) => {
      const geolocate = new mapboxgl.GeolocateControl({
        positionOptions: {
          enableHighAccuracy: true,
        },
        trackUserLocation: true,
        showUserHeading: true,
      });

      geolocate.on(
        'geolocate',
        (e: { coords: { longitude: number; latitude: number } }) => {
          onGeolocate([e.coords.longitude, e.coords.latitude]);
        }
      );

      map.addControl(geolocate, 'top-right');
      return geolocate;
    },
    []
  );

  const addBuildingToggleControl = useCallback(
    (
      map: mapboxgl.Map,
      showBuildings: boolean,
      onBuildingToggleChange: (show: boolean) => void
    ) => {
      const buildingToggle = document.createElement('div');
      buildingToggle.className = 'mapboxgl-ctrl mapboxgl-ctrl-group';
      buildingToggle.style.cssText = `
      position: absolute;
      top: 120px;
      right: 10px;
      background: white;
      border: 1px solid #ccc;
      border-radius: 4px;
      padding: 8px;
      cursor: pointer;
      font-size: 12px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    `;

      buildingToggle.innerHTML = `
      <div style="display: flex; align-items: center; gap: 4px;">
        <input type="checkbox" id="building-toggle" ${showBuildings ? 'checked' : ''} style="margin: 0;">
        <label for="building-toggle" style="margin: 0; cursor: pointer;">建物</label>
      </div>
    `;

      buildingToggle
        .querySelector('#building-toggle')
        ?.addEventListener('change', e => {
          const target = e.target as HTMLInputElement;
          onBuildingToggleChange(target.checked);
        });

      return buildingToggle;
    },
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
