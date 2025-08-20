import mapboxgl from 'mapbox-gl';

const mapboxToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

if (!mapboxToken) {
  throw new Error(
    'Missing Mapbox environment variable: VITE_MAPBOX_ACCESS_TOKEN'
  );
}

// Set the access token
mapboxgl.accessToken = mapboxToken;

export { mapboxgl };

// Map configuration
export const mapConfig = {
  style: 'mapbox://styles/mapbox/light-v11', // より確実なスタイルに変更
  center: [-87.6298, 41.8781] as [number, number], // Chicago coordinates
  zoom: 10,
  minZoom: 8,
  maxZoom: 18,
};

// Marker colors for different categories
export const markerColors = {
  restaurant: '#ff4757',
  shopping: '#2ed573',
  healthcare: '#3742fa',
  entertainment: '#ffa502',
  education: '#ff6348',
  other: '#747d8c',
};

// Category icons (using Lucide React icons)
export const categoryIcons = {
  restaurant: 'utensils',
  shopping: 'shopping-bag',
  healthcare: 'heart-pulse',
  entertainment: 'music',
  education: 'graduation-cap',
  other: 'map-pin',
};
