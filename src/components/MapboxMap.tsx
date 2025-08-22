import { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { MapPin, Navigation, Layers } from 'lucide-react';
import { Location, CategoryInfo } from '../types/map';
import { useMapMarkers } from '../hooks/useMapMarkers';
import { useMapControls } from '../hooks/useMapControls';

// Set your Mapbox access token with fallback
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
if (MAPBOX_TOKEN) {
  mapboxgl.accessToken = MAPBOX_TOKEN;
}

interface MapboxMapProps {
  spots: any[]; // eslint-disable-line @typescript-eslint/no-explicit-any
  selectedCategory: string | null;
  onSpotSelect: (spot: any) => void; // eslint-disable-line @typescript-eslint/no-explicit-any
  onLocationClick?: (location: Location) => void;
  searchQuery?: string;
  distanceFilter?: number;
  focusLocation?: { lat: number; lng: number; zoom?: number } | null;
}

export default function MapboxMap({
  spots,
  selectedCategory,
  onSpotSelect,
  onLocationClick,
  searchQuery,
  focusLocation,
}: MapboxMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const buildingToggleRef = useRef<HTMLDivElement | null>(null);

  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapStyle, setMapStyle] = useState(
    'mapbox://styles/mapbox/streets-v12'
  );
  const [showBuildings] = useState(true);
  const [mapError, setMapError] = useState<string | null>(null);
  const lastPoiLayerClickTsRef = useRef<number>(0);
  const poiClickHandlerRef = useRef<
    ((e: mapboxgl.MapLayerMouseEvent) => void) | null
  >(null);
  const poiMouseEnterHandlerRef = useRef<(() => void) | null>(null);
  const poiMouseLeaveHandlerRef = useRef<(() => void) | null>(null);

  const shouldCenterOnFixRef = useRef(false);
  const [isLocating, setIsLocating] = useState(false);
  const [locateError, setLocateError] = useState<string | null>(null);

  // Geolocation status tracking - simplified since notifications are disabled
  const userLocationMarkerRef = useRef<mapboxgl.Marker | null>(null);

  // 初期センター制御：最初から現在地を表示（取得できない場合のみシカゴ）
  const [initialCenter, setInitialCenter] = useState<[number, number] | null>(
    null
  );
  const startedWithUserLocationRef = useRef(false);

  // 画面サイズに応じたズームレベルを取得
  const getInitialZoom = useCallback(() => {
    if (typeof window === 'undefined') return 11;

    const width = window.innerWidth;
    if (width < 640) return 13; // スマホ
    if (width < 768) return 12; // タブレット
    return 11; // デスクトップ
  }, []);

  // 現在地マーカーを作成・更新する関数
  const updateUserLocationMarker = useCallback(
    (coords: [number, number] | null) => {
      // 既存のマーカーを削除
      if (userLocationMarkerRef.current) {
        userLocationMarkerRef.current.remove();
        userLocationMarkerRef.current = null;
      }

      if (coords && map.current) {
        // 新しい現在地マーカーを作成
        const markerElement = document.createElement('div');
        markerElement.innerHTML = `
        <div style="
          width: 20px;
          height: 20px;
          background: #3B82F6;
          border: 3px solid white;
          border-radius: 50%;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          animation: pulse 2s infinite;
        "></div>
        <style>
          @keyframes pulse {
            0% { transform: scale(1); opacity: 1; }
            50% { transform: scale(1.2); opacity: 0.7; }
            100% { transform: scale(1); opacity: 1; }
          }
        </style>
      `;

        const marker = new mapboxgl.Marker(markerElement)
          .setLngLat(coords)
          .addTo(map.current);

        userLocationMarkerRef.current = marker;
      } else {
        // setUserLocation(null); // This line was removed as per the edit hint
      }
    },
    []
  );

  // カスタムフック
  const {
    clearAllMarkers,
    createPostMarker,
    createClickMarker,
    addGlobalSelectSpotFunction,
  } = useMapMarkers();
  const { centerOnLocation, updateMapStyle, updateBuildingVisibility } =
    useMapControls();

  // Chicago coordinates
  const chicagoCenter: [number, number] = useMemo(
    () => [-87.6298, 41.8781],
    []
  );

  // 初回マウント時に初期中心座標を決定（現在地優先）
  useEffect(() => {
    if (initialCenter !== null) return; // 既に決定済み
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        position => {
          const coords: [number, number] = [
            position.coords.longitude,
            position.coords.latitude,
          ];
          startedWithUserLocationRef.current = true;
          setInitialCenter(coords);
        },
        () => {
          setInitialCenter(chicagoCenter);
        },
        { timeout: 8000, enableHighAccuracy: true, maximumAge: 60000 }
      );
    } else {
      setInitialCenter(chicagoCenter);
    }
  }, [chicagoCenter, initialCenter]);

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
    if (!mapContainer.current || map.current || !initialCenter) return;

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
        center: initialCenter,
        zoom: startedWithUserLocationRef.current ? getInitialZoom() : 11,
        pitch: 0,
        bearing: 0,
        attributionControl: false,
      });

      // 地図コンテナのサイズを確実に設定
      setTimeout(() => {
        if (map.current) {
          map.current.resize();
        }
      }, 200);

      // さらに確実にするため、少し遅れて再度リサイズ
      setTimeout(() => {
        if (map.current) {
          map.current.resize();
        }
      }, 500);

      // ウィンドウリサイズ時の処理を追加
      const handleResize = () => {
        if (map.current) {
          map.current.resize();
        }
      };
      window.addEventListener('resize', handleResize);

      // No default Mapbox controls (UI minimized). We'll use our own button.

      // A helper to attach POI layer click handlers (Google Maps-like)
      const attachPoiClickHandlers = () => {
        if (!map.current) return;

        const poiLayerId = 'poi-label';
        // Guard: remove existing handlers to avoid duplicates when style reloads
        if (poiClickHandlerRef.current) {
          map.current.off('click', poiLayerId, poiClickHandlerRef.current);
        }
        if (poiMouseEnterHandlerRef.current) {
          map.current.off(
            'mouseenter',
            poiLayerId,
            poiMouseEnterHandlerRef.current
          );
        }
        if (poiMouseLeaveHandlerRef.current) {
          map.current.off(
            'mouseleave',
            poiLayerId,
            poiMouseLeaveHandlerRef.current
          );
        }

        if (map.current.getLayer(poiLayerId)) {
          const handlePoiClick = (e: mapboxgl.MapLayerMouseEvent) => {
            if (!onLocationClick) return;
            if (!e.features || e.features.length === 0) return;

            const feature = e.features[0] as mapboxgl.MapboxGeoJSONFeature;
            // Try to get name from multilingual properties
            const props = (feature.properties || {}) as Record<string, unknown>;
            const name =
              (props['name_ja'] as string) ||
              (props['name'] as string) ||
              (props['name_en'] as string) ||
              '';

            // Coordinates: prefer geometry point, fallback to event lngLat
            let lng = e.lngLat.lng;
            let lat = e.lngLat.lat;
            if (
              feature.geometry &&
              feature.geometry.type === 'Point' &&
              Array.isArray((feature.geometry as GeoJSON.Point).coordinates)
            ) {
              const coords = (feature.geometry as GeoJSON.Point).coordinates;
              lng = Number(coords[0]);
              lat = Number(coords[1]);
            }

            // Mark that this click came from POI layer to avoid duplicate handling
            lastPoiLayerClickTsRef.current = Date.now();

            // Create a highlighted click marker and open modal
            createClickMarker({ lat, lng }, true, map.current!);
            onLocationClick({ lat, lng, address: name });
          };
          poiClickHandlerRef.current = handlePoiClick;
          map.current.on('click', poiLayerId, handlePoiClick);

          // Cursor feedback
          const handleMouseEnter = () => {
            map.current!.getCanvas().style.cursor = 'pointer';
          };
          const handleMouseLeave = () => {
            map.current!.getCanvas().style.cursor = '';
          };
          poiMouseEnterHandlerRef.current = handleMouseEnter;
          poiMouseLeaveHandlerRef.current = handleMouseLeave;
          map.current.on('mouseenter', poiLayerId, handleMouseEnter);
          map.current.on('mouseleave', poiLayerId, handleMouseLeave);
        }
      };

      // Handle map load
      map.current.on('load', () => {
        setMapLoaded(true);
        setMapError(null);

        // Initialize building layer
        updateBuildingVisibility(map.current!, showBuildings);

        // Attach POI click handlers for current style
        attachPoiClickHandlers();

        // 初期表示が現在地だった場合はマーカーだけ表示
        if (startedWithUserLocationRef.current) {
          updateUserLocationMarker(initialCenter);
        }
      });

      // Re-attach handlers when style changes (e.g., user switches style)
      map.current.on('style.load', () => {
        if (!map.current) return;
        updateBuildingVisibility(map.current, showBuildings);
        attachPoiClickHandlers();
      });

      // Handle map errors
      map.current.on('error', e => {
        console.error('Mapbox error:', e);
        setMapError('地図の読み込みに失敗しました');
      });

      // Handle generic map clicks: do nothing when not clicking a POI label
      map.current.on('click', () => {
        // If this click just came from POI layer handler, skip
        if (Date.now() - lastPoiLayerClickTsRef.current < 50) return;
        // Intentionally no-op for non-POI clicks
        // This prevents showing "POIを検索中" and avoids any unintended recentering
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
        window.removeEventListener('resize', handleResize);
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
    updateBuildingVisibility,
    createClickMarker,
    updateUserLocationMarker,
    centerOnLocation,
    initialCenter,
    getInitialZoom,
  ]);

  // Update map style
  useEffect(() => {
    if (map.current && mapLoaded) {
      updateMapStyle(map.current, mapStyle);
    }
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('map.style', mapStyle);
      }
    } catch {
      // Ignore localStorage errors
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

    // Filter spots based on category and search
    const filteredSpots = spots.filter(spot => {
      if (selectedCategory && spot.category_id !== selectedCategory) {
        return false;
      }
      if (
        searchQuery &&
        !spot.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !(
          spot.description &&
          spot.description.toLowerCase().includes(searchQuery.toLowerCase())
        )
      ) {
        return false;
      }
      return true;
    });

    // Add markers for filtered spots
    filteredSpots.forEach(spot => {
      const categoryInfo = getCategoryInfo(spot.category_id);
      const isHighlighted =
        !!searchQuery &&
        (spot.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (spot.description &&
            spot.description
              .toLowerCase()
              .includes(searchQuery.toLowerCase())));

      createPostMarker(
        spot,
        categoryInfo,
        isHighlighted,
        onSpotSelect,
        map.current!
      );
    });

    // Add global function for popup button clicks
    addGlobalSelectSpotFunction(spots, onSpotSelect);
  }, [
    spots,
    selectedCategory,
    searchQuery,
    mapLoaded,
    onSpotSelect,
    clearAllMarkers,
    createPostMarker,
    addGlobalSelectSpotFunction,
    getCategoryInfo,
  ]);

  // Focus map externally when focusLocation changes
  useEffect(() => {
    if (!map.current || !mapLoaded || !focusLocation) return;
    const zoomLevel = focusLocation.zoom ?? getInitialZoom();
    centerOnLocation(
      map.current,
      [focusLocation.lng, focusLocation.lat],
      zoomLevel
    );
  }, [focusLocation, mapLoaded, centerOnLocation, getInitialZoom]);

  // Request and center on user location explicitly from UI
  const requestAndCenterOnUser = useCallback(() => {
    if (!map.current) return;
    if (!('geolocation' in navigator)) {
      console.error('Browser does not support geolocation');
      shouldCenterOnFixRef.current = false;
      return;
    }
    shouldCenterOnFixRef.current = true;
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      position => {
        const coords: [number, number] = [
          position.coords.longitude,
          position.coords.latitude,
        ];
        if (map.current) {
          const zoomLevel = getInitialZoom();
          centerOnLocation(map.current, coords, zoomLevel);
          updateUserLocationMarker(coords);
        }
        shouldCenterOnFixRef.current = false;
        setIsLocating(false);
      },
      err => {
        console.error('Geolocation error:', err);
        shouldCenterOnFixRef.current = false;
        setIsLocating(false);
        setLocateError(
          err.code === err.PERMISSION_DENIED
            ? '位置情報の権限が拒否されました'
            : err.code === err.POSITION_UNAVAILABLE
              ? '位置情報を取得できませんでした'
              : '位置情報の取得がタイムアウトしました'
        );
        setTimeout(() => setLocateError(null), 4000);
      },
      { timeout: 10000, enableHighAccuracy: true, maximumAge: 60000 }
    );
  }, [centerOnLocation, updateUserLocationMarker, getInitialZoom]);

  // Map style options
  const mapStyles = [
    { id: 'mapbox://styles/mapbox/streets-v12', name: '標準', icon: '🏙️' },
    { id: 'mapbox://styles/mapbox/outdoors-v12', name: '地形', icon: '🏔️' },
    { id: 'mapbox://styles/mapbox/satellite-v9', name: '衛星', icon: '🛰️' },
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
      <div
        ref={mapContainer}
        className="w-full h-full min-h-[calc(100vh-358px)] sm:min-h-[500px] md:min-h-[600px] bg-gray-100"
      />

      {/* Custom Toolbar */}
      <div className="absolute top-2 left-2 right-2 z-10 flex items-center justify-between gap-2">
        <div className="bg-white rounded-lg shadow p-2">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-gray-600" />
            <select
              value={mapStyle}
              onChange={e => setMapStyle(e.target.value)}
              className="text-xs border-none bg-transparent focus:outline-none"
              aria-label="地図スタイル"
            >
              {mapStyles.map(style => (
                <option key={style.id} value={style.id}>
                  {style.icon} {style.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow p-1 flex items-center">
          <button
            onClick={requestAndCenterOnUser}
            className="flex items-center space-x-1 px-3 py-2 text-xs text-gray-700 hover:bg-gray-100 rounded-lg disabled:opacity-50"
            disabled={isLocating}
            aria-label="現在地"
            title="現在地"
          >
            <Navigation className="w-4 h-4" />
            <span>{isLocating ? '取得中...' : '現在地'}</span>
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

      {/* Locate error toast */}
      {locateError && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-red-50 border border-red-200 text-red-700 rounded-lg shadow px-3 py-2 z-30 text-xs">
          {locateError}
        </div>
      )}

      {/* Post Count removed and merged into bottom bar */}

      {/* Bottom info bar */}
      <div className="absolute left-2 right-2 bottom-2 z-10 flex flex-col gap-2">
        <div className="bg-white rounded-lg shadow-md px-3 py-2 text-xs text-gray-800 flex items-center gap-2 w-fit border border-gray-100">
          <MapPin className="w-4 h-4 text-coral-500 flex-shrink-0" />
          <span className="leading-tight whitespace-nowrap">
            建物やランドマークをクリックでスポット追加
          </span>
        </div>
      </div>

      {/* Debug Info removed per UI requirements */}
    </div>
  );
}
