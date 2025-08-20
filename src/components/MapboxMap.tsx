import { useRef, useEffect, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { MapPin, Navigation, Layers } from 'lucide-react';

// Set your Mapbox access token with fallback
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
if (MAPBOX_TOKEN) {
  mapboxgl.accessToken = MAPBOX_TOKEN;
}

interface MapboxMapProps {
  posts: Array<{
    id: string;
    title: string;
    content: string;
    summary?: string | null;
    location_lat: number;
    location_lng: number;
    location_address?: string;
    category_id: string;
    created_at: string;
  }>;
  mapSpots?: Array<{
    id: string;
    name: string;
    description?: string;
    category_id?: string;
    location_lat: number;
    location_lng: number;
    location_address?: string;
    created_by: string;
    is_public: boolean;
    created_at: string;
    updated_at: string;
  }>;
  selectedCategory: string | null;
  onPostSelect: (post: MapboxMapProps['posts'][0]) => void;
  onSpotSelect?: (spot: NonNullable<MapboxMapProps['mapSpots']>[0]) => void;
  onLocationClick?: (location: {
    lat: number;
    lng: number;
    address?: string;
  }) => void;
  searchQuery?: string;
  distanceFilter?: number;
}

export default function MapboxMap({
  posts,
  mapSpots,
  selectedCategory,
  onPostSelect,
  onSpotSelect,
  onLocationClick,
  searchQuery,
}: MapboxMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef<mapboxgl.Marker[]>([]);
  const clickMarker = useRef<mapboxgl.Marker | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(
    null
  );
  const [mapStyle, setMapStyle] = useState(
    'mapbox://styles/mapbox/streets-v12'
  );
  const [showBuildings, setShowBuildings] = useState(true);
  const [mapError, setMapError] = useState<string | null>(null);

  // Chicago coordinates
  const chicagoCenter: [number, number] = [-87.6298, 41.8781];

  // Get category information for posts
  const getCategoryInfo = (categoryId: string) => {
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
  };

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    // Check if Mapbox token is available
    if (!MAPBOX_TOKEN) {
      setMapError('Mapbox APIキーが設定されていません');
      return;
    }

    // Initialize map
    try {
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: mapStyle,
        center: chicagoCenter,
        zoom: 11,
        pitch: 0,
        bearing: 0,
      });

      // Add navigation controls
      map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

      // Add geolocate control
      const geolocate = new mapboxgl.GeolocateControl({
        positionOptions: {
          enableHighAccuracy: true,
        },
        trackUserLocation: true,
        showUserHeading: true,
      });

      map.current.addControl(geolocate, 'top-right');

      // Add building toggle control
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
          setShowBuildings(target.checked);
        });

      mapContainer.current.appendChild(buildingToggle);

      // Handle map load
      map.current.on('load', () => {
        setMapLoaded(true);
        setMapError(null);

        // 建物レイヤーを強調表示
        if (map.current && showBuildings) {
          try {
            if (map.current.getLayer('building')) {
              map.current.setPaintProperty('building', 'fill-color', '#f0f0f0');
              map.current.setPaintProperty('building', 'fill-opacity', 0.8);
            }
          } catch (error) {
            console.log('Building layer not available in current style');
          }
        }
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
        console.log('Map clicked at:', e.lngLat);
        console.log('onLocationClick available:', !!onLocationClick);

        if (onLocationClick) {
          const { lng, lat } = e.lngLat;
          console.log('Coordinates:', { lng, lat });

          try {
            // 座標の形式を確認し、適切な範囲内に収める
            const validLng = Math.max(-180, Math.min(180, lng));
            const validLat = Math.max(-90, Math.min(90, lat));

            console.log('Valid coordinates:', { validLng, validLat });

            // POI（建物、レストラン、公園など）を検索
            const geocodingUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${validLng},${validLat}.json?access_token=${MAPBOX_TOKEN}&types=poi&language=ja&limit=3`;
            console.log('Searching for POI at:', geocodingUrl);

            const response = await fetch(geocodingUrl);

            if (response.ok) {
              const data = await response.json();
              console.log('POI search response:', data);

              // POIが見つかった場合のみモーダルを開く
              if (data.features && data.features.length > 0) {
                const feature = data.features[0];
                console.log('Found POI:', feature);

                let address = '';
                let buildingName = '';

                // 建物名やPOI名を取得
                if (feature.text_ja) {
                  buildingName = feature.text_ja;
                } else if (feature.text) {
                  buildingName = feature.text;
                }

                // 住所を取得
                if (feature.place_name_ja) {
                  address = feature.place_name_ja;
                } else if (feature.place_name) {
                  address = feature.place_name;
                }

                // 建物名と住所を組み合わせ
                if (buildingName && address) {
                  address = `${buildingName} - ${address}`;
                } else if (buildingName) {
                  address = buildingName;
                }

                console.log('POI address:', address);

                // マーカーを表示
                if (clickMarker.current) {
                  clickMarker.current.remove();
                }

                const clickMarkerElement = document.createElement('div');
                clickMarkerElement.innerHTML = `
                  <div style="
                    width: 20px;
                    height: 20px;
                    background: #FF6B6B;
                    border: 3px solid white;
                    border-radius: 50%;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.3);
                    animation: pulse 1s infinite;
                  "></div>
                  <style>
                    @keyframes pulse {
                      0% { transform: scale(1); opacity: 1; }
                      50% { transform: scale(1.2); opacity: 0.7; }
                      100% { transform: scale(1); opacity: 1; }
                    }
                  </style>
                `;

                clickMarker.current = new mapboxgl.Marker(clickMarkerElement)
                  .setLngLat([validLng, validLat])
                  .addTo(map.current!);

                console.log('Opening modal for POI:', {
                  lat: validLat,
                  lng: validLng,
                  address,
                });

                onLocationClick({
                  lat: validLat,
                  lng: validLng,
                  address,
                });
              } else {
                console.log(
                  'No POI found at this location - not opening modal'
                );
                // POIが見つからない場合は何もしない（モーダルを開かない）
              }
            } else {
              console.log(
                'POI search failed:',
                response.status,
                response.statusText
              );
              // 検索に失敗した場合は何もしない
            }
          } catch (error) {
            console.error('Error searching for POI:', error);
            // エラーの場合は何もしない（モーダルを開かない）
          }
        } else {
          console.log('onLocationClick is not available');
        }
      });
    } catch (error) {
      console.error('Map initialization error:', error);
      setMapError('地図の初期化に失敗しました');
    }

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
      if (clickMarker.current) {
        clickMarker.current.remove();
        clickMarker.current = null;
      }
    };
  }, [onLocationClick]);

  // Update map style
  useEffect(() => {
    if (map.current && mapLoaded) {
      map.current.setStyle(mapStyle);
    }
  }, [mapStyle, mapLoaded]);

  // Update building visibility
  useEffect(() => {
    if (map.current && mapLoaded) {
      try {
        if (map.current.getLayer('building')) {
          if (showBuildings) {
            map.current.setLayoutProperty('building', 'visibility', 'visible');
            map.current.setPaintProperty('building', 'fill-color', '#f0f0f0');
            map.current.setPaintProperty('building', 'fill-opacity', 0.8);
          } else {
            map.current.setLayoutProperty('building', 'visibility', 'none');
          }
        }
      } catch (error) {
        console.log('Building layer not available in current style');
      }
    }
  }, [showBuildings, mapLoaded]);

  // Update markers when posts or category filter changes
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    // Clear existing markers
    markers.current.forEach(marker => marker.remove());
    markers.current = [];

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
      const markerElement = document.createElement('div');
      markerElement.className = 'custom-marker';

      const markerColor = post.category_id
        ? getCategoryInfo(post.category_id).color
        : '#FF6B6B';
      const isHighlighted =
        searchQuery &&
        (post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          post.content.toLowerCase().includes(searchQuery.toLowerCase()));

      markerElement.innerHTML = `
        <div style="
          width: 24px; 
          height: 24px; 
          background: ${markerColor}; 
          border: 3px solid white; 
          border-radius: 50%; 
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
          cursor: pointer;
          transition: all 0.2s ease;
          ${isHighlighted ? 'transform: scale(1.2); box-shadow: 0 4px 16px rgba(0,0,0,0.4);' : ''}
        "></div>
      `;

      const popup = new mapboxgl.Popup({
        closeButton: true,
        closeOnClick: false,
        maxWidth: '300px',
        className: 'custom-popup',
      }).setHTML(`
        <div style="padding: 8px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          <h3 style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #1f2937;">
            ${post.title}
          </h3>
          <div style="display: flex; align-items: center; gap: 4px; margin-bottom: 8px;">
            <div style="width: 12px; height: 12px; background-color: ${markerColor}; border-radius: 50%;"></div>
            <span style="font-size: 11px; color: #6b7280;">
              ${post.category_id ? getCategoryInfo(post.category_id).name_ja : 'カテゴリなし'}
            </span>
          </div>
          <p style="margin: 0 0 8px 0; font-size: 11px; color: #4b5563; line-height: 1.4; max-height: 60px; overflow: hidden;">
            ${post.content}
          </p>
          <div style="display: flex; gap: 8px;">
            <button onclick="window.selectPost('${post.id}')" style="
              padding: 4px 8px;
              background: #f59e0b;
              color: white;
              border: none;
              border-radius: 4px;
              font-size: 11px;
              cursor: pointer;
            ">詳細を見る</button>
          </div>
        </div>
      `);

      const marker = new mapboxgl.Marker(markerElement)
        .setLngLat([post.location_lng, post.location_lat])
        .setPopup(popup)
        .addTo(map.current!);

      markers.current.push(marker);

      // Handle marker click
      markerElement.addEventListener('click', () => {
        onPostSelect(post);
      });

      // Add hover effects
      markerElement.addEventListener('mouseenter', () => {
        markerElement.style.transform = 'scale(1.1)';
      });
      markerElement.addEventListener('mouseleave', () => {
        markerElement.style.transform = isHighlighted
          ? 'scale(1.2)'
          : 'scale(1)';
      });
    });

    // Add global function for popup button clicks
    (window as any).selectPost = (postId: string) => {
      const post = posts.find(p => p.id === postId);
      if (post) {
        onPostSelect(post);
      }
    };
  }, [posts, selectedCategory, searchQuery, mapLoaded, onPostSelect]);

  // Center on Chicago function
  const centerOnChicago = () => {
    if (map.current) {
      map.current.flyTo({
        center: chicagoCenter,
        zoom: 11,
        duration: 2000,
      });
    }
  };

  // Center on user location function
  const centerOnUser = () => {
    if (map.current && userLocation) {
      map.current.flyTo({
        center: userLocation,
        zoom: 15,
        duration: 2000,
      });
    }
  };

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

      {/* Debug Info */}
      {process.env.NODE_ENV === 'development' && (
        <div className="absolute bottom-4 right-4 bg-black bg-opacity-75 text-white text-xs p-2 rounded">
          <div>Token: {MAPBOX_TOKEN ? '✓' : '✗'}</div>
          <div>Loaded: {mapLoaded ? '✓' : '✗'}</div>
          <div>Posts: {posts.length}</div>
        </div>
      )}
    </div>
  );
}
