import mapboxgl from "mapbox-gl";

const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN;

// Don't throw error immediately, let the component handle it gracefully
let isMapboxAvailable = false;

if (mapboxToken && mapboxToken !== 'your_mapbox_api_key_here') {
  try {
    mapboxgl.accessToken = mapboxToken;
    isMapboxAvailable = true;
  } catch (error) {
    console.warn("Failed to set Mapbox access token:", error);
    isMapboxAvailable = false;
  }
} else {
  console.warn("Mapbox API key not configured or using placeholder value");
}

export { mapboxgl, isMapboxAvailable };

// Map configuration
export const mapConfig = {
  style: "mapbox://styles/mapbox/streets-v12", // より安定したスタイルに変更
  center: [-87.6298, 41.8781] as [number, number], // Chicago coordinates
  zoom: 10,
  minZoom: 8,
  maxZoom: 18,
};

// Alternative map styles for fallback
export const alternativeStyles = [
  "mapbox://styles/mapbox/streets-v12",
  "mapbox://styles/mapbox/outdoors-v12",
  "mapbox://styles/mapbox/light-v11",
  "mapbox://styles/mapbox/satellite-v9"
];

// Marker colors for different categories
export const markerColors = {
  hospital: "#FF6B6B",
  beauty: "#4ECDC4", 
  shopping: "#FFE66D",
  restaurant: "#95E1D3",
  kids: "#F38BA8",
  park: "#A8E6CF",
  other: "#747d8c",
};

// Category icons (using Lucide React icons)
export const categoryIcons = {
  hospital: "heart-pulse",
  beauty: "scissors",
  shopping: "shopping-bag",
  restaurant: "utensils-crossed",
  kids: "baby",
  park: "trees",
  other: "map-pin",
};
