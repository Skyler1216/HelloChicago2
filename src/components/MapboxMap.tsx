import { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { MapPin, Navigation, Layers } from 'lucide-react';
import { Post, Location, CategoryInfo } from '../types/map';
import { useMapPOI } from '../hooks/useMapPOI';
import { useMapMarkers } from '../hooks/useMapMarkers';
import { useMapControls } from '../hooks/useMapControls';

// Set your Mapbox access token with fallback
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
if (MAPBOX_TOKEN) {
  mapboxgl.accessToken = MAPBOX_TOKEN;
}

interface MapboxMapProps {
  posts: Post[];
  selectedCategory: string | null;
  onPostSelect: (post: Post) => void;
  onLocationClick?: (location: Location) => void;
  searchQuery?: string;
  distanceFilter?: number;
}

export default function MapboxMap({
  posts,
  selectedCategory,
  onPostSelect,
  onLocationClick,
  searchQuery,
}: MapboxMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const buildingToggleRef = useRef<HTMLDivElement | null>(null);

  const [mapLoaded, setMapLoaded] = useState(false);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(
    null
  );
  const [mapStyle, setMapStyle] = useState(
    'mapbox://styles/mapbox/streets-v12'
  );
  const [showBuildings, setShowBuildings] = useState(true);
  const [mapError, setMapError] = useState<string | null>(null);

  // カスタムフック
  const { searchPOI, isSearching } = useMapPOI();
  const {
    clearAllMarkers,
    createPostMarker,
    createClickMarker,
    addGlobalSelectPostFunction,
  } = useMapMarkers();
  const {
    addNavigationControl,
    addGeolocateControl,
    addBuildingToggleControl,
    centerOnLocation,
    updateMapStyle,
    updateBuildingVisibility,
  } = useMapControls();

  // Chicago coordinates
  const chicagoCenter: [number, number] = useMemo(
    () => [-87.6298, 41.8781],
    []
  );

  // Get category information for posts
  const getCategoryInfo = useCallback((categoryId: string): CategoryInfo => {
    const defaultColors = [
      '#FF6B6B',
      '#4ECDC4',
      '#45B7D1',
      '#96CEB4',
      '#FFEAA7',
    ];
    const colorIndex = categoryId.charCodeAt(0) % defaultColors.length;
    return {
      color: defaultColors[colorIndex],
      name_ja: categoryId,
    };
  }, []);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    // Check if Mapbox token is available
    if (!MAPBOX_TOKEN) {
      setMapError('Mapbox APIキーが設定されていません');
      return;
    }

    try {
      // Initialize map
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: mapStyle,
        center: chicagoCenter,
        zoom: 11,
        pitch: 0,
        bearing: 0,
      });

      // Add controls
      addNavigationControl(map.current);
      const geolocate = addGeolocateControl(map.current, setUserLocation);

      // Add building toggle control
      buildingToggleRef.current = addBuildingToggleControl(
        map.current,
        showBuildings,
        setShowBuildings
      );
      mapContainer.current.appendChild(buildingToggleRef.current);

      // Handle map load
      map.current.on('load', () => {
        setMapLoaded(true);
        setMapError(null);

        // Initialize building layer
        updateBuildingVisibility(map.current!, showBuildings);
      });

      // Handle geolocate
      geolocate.on(
        'geolocate',
        (e: { coords: { longitude: number; latitude: number } }) => {
          setUserLocation([e.coords.longitude, e.coords.latitude]);
        }
      );

      // Handle map errors
      map.current.on('error', e => {
        console.error('Mapbox error:', e);
        setMapError('地図の読み込みに失敗しました');
      });

      // Handle map clicks for location selection
      map.current.on('click', async e => {
        if (!onLocationClick) return;

        const { lng, lat } = e.lngLat;
        console.log('Map clicked at:', { lng, lat });

        try {
          const searchResult = await searchPOI({ lat, lng });

          if (searchResult.poiFound) {
            console.log('✅ Valid POI found, opening modal');

            // Create click marker for POI
            createClickMarker(
              {
                lat: searchResult.coordinates[1],
                lng: searchResult.coordinates[0],
              },
              true,
              map.current!
            );

            // Open modal
            onLocationClick({
              lat: searchResult.coordinates[1],
              lng: searchResult.coordinates[0],
              address: searchResult.poiAddress || searchResult.poiName,
            });
          } else {
            console.log('❌ No valid POI, showing temporary marker');

            // Create temporary marker
            createClickMarker(
              {
                lat: searchResult.coordinates[1],
                lng: searchResult.coordinates[0],
              },
              false,
              map.current!
            );
          }
        } catch (error) {
          console.error('POI search error:', error);
        }
      });

      return () => {
        if (map.current) {
          map.current.remove();
          map.current = null;
        }
        if (buildingToggleRef.current) {
          buildingToggleRef.current.remove();
          buildingToggleRef.current = null;
        }
      };
    } catch (error) {
      console.error('Map initialization error:', error);
      setMapError('地図の初期化に失敗しました');
    }
  }, [
    onLocationClick,
    chicagoCenter,
    mapStyle,
    showBuildings,
    addNavigationControl,
    addGeolocateControl,
    addBuildingToggleControl,
    updateBuildingVisibility,
    searchPOI,
    createClickMarker,
  ]);

  // Update map style
  useEffect(() => {
    if (map.current && mapLoaded) {
      updateMapStyle(map.current, mapStyle);
    }
  }, [mapStyle, mapLoaded, updateMapStyle]);

  // Update building visibility
  useEffect(() => {
    if (map.current && mapLoaded) {
      updateBuildingVisibility(map.current, showBuildings);
    }
  }, [showBuildings, mapLoaded, updateBuildingVisibility]);

  // Update markers when posts or category filter changes
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    // Clear existing markers
    clearAllMarkers();

    // Filter posts based on category and search
    const filteredPosts = posts.filter(post => {
      if (selectedCategory && post.category_id !== selectedCategory) {
        return false;
      }
      if (
        searchQuery &&
        !post.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !post.content.toLowerCase().includes(searchQuery.toLowerCase())
      ) {
        return false;
      }
      return true;
    });

    // Add markers for filtered posts
    filteredPosts.forEach(post => {
      const categoryInfo = getCategoryInfo(post.category_id);
      const isHighlighted =
        !!searchQuery &&
        (post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          post.content.toLowerCase().includes(searchQuery.toLowerCase()));

      createPostMarker(
        post,
        categoryInfo,
        isHighlighted,
        onPostSelect,
        map.current!
      );
    });

    // Add global function for popup button clicks
    addGlobalSelectPostFunction(posts, onPostSelect);
  }, [
    posts,
    selectedCategory,
    searchQuery,
    mapLoaded,
    onPostSelect,
    clearAllMarkers,
    createPostMarker,
    addGlobalSelectPostFunction,
    getCategoryInfo,
  ]);

  // Center on Chicago function
  const centerOnChicago = useCallback(() => {
    if (map.current) {
      centerOnLocation(map.current, chicagoCenter, 11);
    }
  }, [centerOnLocation, chicagoCenter]);

  // Center on user location function
  const centerOnUser = useCallback(() => {
    if (map.current && userLocation) {
      centerOnLocation(map.current, userLocation, 15);
    }
  }, [centerOnLocation, userLocation]);

  // Map style options
  const mapStyles = [
    { id: 'mapbox://styles/mapbox/streets-v12', name: 'Streets', icon: '🏙️' },
    { id: 'mapbox://styles/mapbox/outdoors-v12', name: 'Outdoors', icon: '🏔️' },
    {
      id: 'mapbox://styles/mapbox/satellite-v9',
      name: 'Satellite',
      icon: '🛰️',
    },
  ];

  if (mapError) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-100">
        <div className="text-center p-6">
          <MapPin className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            地図エラー
          </h3>
          <p className="text-gray-600 text-sm mb-4">{mapError}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-coral-500 text-white rounded-lg hover:bg-coral-600"
          >
            再読み込み
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 relative">
      {/* Map Container */}
      <div ref={mapContainer} className="w-full h-full min-h-[400px]" />

      {/* Map Controls */}
      <div className="absolute top-4 left-4 z-10 space-y-2">
        {/* Style Selector */}
        <div className="bg-white rounded-lg shadow-lg p-2">
          <div className="flex items-center space-x-1">
            <Layers className="w-4 h-4 text-gray-600" />
            <select
              value={mapStyle}
              onChange={e => setMapStyle(e.target.value)}
              className="text-xs border-none bg-transparent focus:outline-none"
            >
              {mapStyles.map(style => (
                <option key={style.id} value={style.id}>
                  {style.icon} {style.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-lg shadow-lg p-2 space-y-1">
          <button
            onClick={centerOnChicago}
            className="w-full flex items-center space-x-2 px-3 py-2 text-xs text-gray-700 hover:bg-gray-100 rounded transition-colors"
          >
            <MapPin className="w-4 h-4" />
            <span>シカゴ中心</span>
          </button>
          <button
            onClick={centerOnUser}
            className="w-full flex items-center space-x-2 px-3 py-2 text-xs text-gray-700 hover:bg-gray-100 rounded transition-colors"
          >
            <Navigation className="w-4 h-4" />
            <span>現在地</span>
          </button>
        </div>
      </div>

      {/* Loading Indicator */}
      {!mapLoaded && (
        <div className="absolute inset-0 bg-gray-100 flex items-center justify-center z-20">
          <div className="text-center">
            <div className="w-8 h-8 border-2 border-coral-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-gray-600 text-sm">マップを読み込み中...</p>
          </div>
        </div>
      )}

      {/* POI Search Loading Indicator */}
      {isSearching && (
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-lg px-4 py-2 z-30">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 border-2 border-coral-500 border-t-transparent rounded-full animate-spin"></div>
            <span className="text-sm text-gray-700">POIを検索中...</span>
          </div>
        </div>
      )}

      {/* Post Count */}
      <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg px-3 py-2 z-10">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-coral-500 rounded-full"></div>
          <span className="text-xs text-gray-700">
            {selectedCategory
              ? posts.filter(p => p.category_id === selectedCategory).length
              : posts.length}
            件の投稿
          </span>
        </div>
      </div>

      {/* POI Click Help */}
      <div className="absolute bottom-4 right-4 bg-white rounded-lg shadow-lg px-3 py-2 z-10 max-w-xs">
        <div className="flex items-center space-x-2 mb-1">
          <MapPin className="w-4 h-4 text-coral-500" />
          <span className="text-sm font-medium text-gray-700">
            スポット追加
          </span>
        </div>
        <p className="text-xs text-gray-600 leading-tight">
          建物、ランドマーク、お店などをクリックしてスポットを追加できます
        </p>
      </div>

      {/* Debug Info */}
      {process.env.NODE_ENV === 'development' && (
        <div className="absolute top-4 right-4 bg-black bg-opacity-75 text-white text-xs p-2 rounded">
          <div>Token: {MAPBOX_TOKEN ? '✓' : '✗'}</div>
          <div>Loaded: {mapLoaded ? '✓' : '✗'}</div>
          <div>Posts: {posts.length}</div>
          <div>Searching: {isSearching ? '✓' : '✗'}</div>
        </div>
      )}
    </div>
  );
}
