import React, { useRef, useEffect, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { MapPin, Navigation, Layers } from 'lucide-react';
import * as LucideIcons from 'lucide-react';

// Set your Mapbox access token with fallback
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;
if (MAPBOX_TOKEN) {
  mapboxgl.accessToken = MAPBOX_TOKEN;
}

interface MapboxMapProps {
  posts: any[];
  selectedCategory: string | null;
  onPostSelect: (post: any) => void;
}

export default function MapboxMap({ posts, selectedCategory, onPostSelect }: MapboxMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markers = useRef<mapboxgl.Marker[]>([]);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [mapStyle, setMapStyle] = useState('mapbox://styles/mapbox/streets-v12');
  const [mapError, setMapError] = useState<string | null>(null);

  // Chicago coordinates
  const chicagoCenter: [number, number] = [-87.6298, 41.8781];

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
        bearing: 0
      });
      
      // Add navigation controls
      map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');

      // Add geolocate control
      const geolocate = new mapboxgl.GeolocateControl({
        positionOptions: {
          enableHighAccuracy: true
        },
        trackUserLocation: true,
        showUserHeading: true
      });

      map.current.addControl(geolocate, 'top-right');

      // Handle map load
      map.current.on('load', () => {
        setMapLoaded(true);
        setMapError(null);
      });

      // Handle geolocate
      geolocate.on('geolocate', (e: any) => {
        setUserLocation([e.coords.longitude, e.coords.latitude]);
      });

      // Handle map errors
      map.current.on('error', (e) => {
        console.error('Mapbox error:', e);
        setMapError('地図の読み込みに失敗しました');
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
    };
  }, [MAPBOX_TOKEN]);

  // Update map style
  useEffect(() => {
    if (map.current && mapLoaded) {
      map.current.setStyle(mapStyle);
    }
  }, [mapStyle, mapLoaded]);

  // Update markers when posts or category filter changes
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    // Clear existing markers
    markers.current.forEach(marker => marker.remove());
    markers.current = [];

    // Filter posts based on selected category
    const filteredPosts = selectedCategory 
      ? posts.filter(post => post.categories?.id === selectedCategory)
      : posts;

    // Add markers for each post
    filteredPosts.forEach(post => {
      if (!post.location_lat || !post.location_lng) return;

      // Create custom marker element
      const markerElement = document.createElement('div');
      markerElement.className = 'custom-marker';
      markerElement.style.cssText = `
        width: 40px;
        height: 40px;
        border-radius: 50%;
        background-color: ${post.categories?.color || '#FF6B6B'};
        border: 3px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: transform 0.2s ease;
      `;

      // Add icon to marker
      const IconComponent = post.categories?.icon ? LucideIcons[post.categories.icon as keyof typeof LucideIcons] : MapPin;
      if (IconComponent) {
        const iconSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        iconSvg.setAttribute('width', '20');
        iconSvg.setAttribute('height', '20');
        iconSvg.setAttribute('fill', 'white');
        iconSvg.setAttribute('viewBox', '0 0 24 24');
        iconSvg.innerHTML = '<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>';
        markerElement.appendChild(iconSvg);
      }

      // Add hover effects
      markerElement.addEventListener('mouseenter', () => {
        markerElement.style.transform = 'scale(1.1)';
      });

      markerElement.addEventListener('mouseleave', () => {
        markerElement.style.transform = 'scale(1)';
      });

      // Create popup
      const popup = new mapboxgl.Popup({
        offset: 25,
        closeButton: true,
        closeOnClick: false
      }).setHTML(`
        <div style="padding: 12px; max-width: 250px;">
          <h3 style="margin: 0 0 8px 0; font-size: 14px; font-weight: bold; color: #1f2937;">
            ${post.title}
          </h3>
          <div style="display: flex; align-items: center; gap: 4px; margin-bottom: 8px;">
            <div style="width: 16px; height: 16px; background-color: ${post.categories?.color || '#FF6B6B'}; border-radius: 4px;"></div>
            <span style="font-size: 12px; color: #6b7280;">${post.categories?.name_ja || 'カテゴリなし'}</span>
          </div>
          <p style="margin: 0 0 8px 0; font-size: 12px; color: #4b5563; line-height: 1.4;">
            ${post.summary || post.content.substring(0, 100) + '...'}
          </p>
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-size: 11px; color: #9ca3af;">
              ${new Date(post.created_at).toLocaleDateString('ja-JP')}
            </span>
            <button 
              onclick="window.selectPost('${post.id}')"
              style="background: #ff6b6b; color: white; border: none; padding: 4px 8px; border-radius: 4px; font-size: 11px; cursor: pointer;"
            >
              詳細を見る
            </button>
          </div>
        </div>
      `);

      // Create marker
      const marker = new mapboxgl.Marker(markerElement)
        .setLngLat([post.location_lng, post.location_lat])
        .setPopup(popup)
        .addTo(map.current!);

      markers.current.push(marker);

      // Handle marker click
      markerElement.addEventListener('click', () => {
        onPostSelect(post);
      });
    });

    // Add global function for popup button clicks
    (window as any).selectPost = (postId: string) => {
      const post = posts.find(p => p.id === postId);
      if (post) {
        onPostSelect(post);
      }
    };

  }, [posts, selectedCategory, mapLoaded, onPostSelect]);

  const mapStyles = [
    { id: 'mapbox://styles/mapbox/streets-v12', name: 'Streets', icon: '🗺️' },
    { id: 'mapbox://styles/mapbox/satellite-streets-v12', name: 'Satellite', icon: '🛰️' },
    { id: 'mapbox://styles/mapbox/light-v11', name: 'Light', icon: '☀️' },
    { id: 'mapbox://styles/mapbox/dark-v11', name: 'Dark', icon: '🌙' },
  ];

  const centerOnChicago = () => {
    if (map.current) {
      map.current.flyTo({
        center: chicagoCenter,
        zoom: 11,
        duration: 1000
      });
    }
  };

  const centerOnUser = () => {
    if (map.current && userLocation) {
      map.current.flyTo({
        center: userLocation,
        zoom: 14,
        duration: 1000
      });
    } else {
      // Try to get user location
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const coords: [number, number] = [position.coords.longitude, position.coords.latitude];
            setUserLocation(coords);
            if (map.current) {
              map.current.flyTo({
                center: coords,
                zoom: 14,
                duration: 1000
              });
            }
          },
          (error) => {
            console.error('Error getting location:', error);
            alert('位置情報の取得に失敗しました');
          }
        );
      }
    }
  };

  if (!MAPBOX_TOKEN) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-100">
        <div className="text-center p-6">
          <MapPin className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Mapbox設定が必要です</h3>
          <p className="text-gray-600 text-sm">
            環境変数にVITE_MAPBOX_ACCESS_TOKENを設定してください
          </p>
        </div>
      </div>
    );
  }

  if (mapError) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-100">
        <div className="text-center p-6">
          <MapPin className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">地図エラー</h3>
          <p className="text-gray-600 text-sm mb-4">{mapError}</p>
          <button onClick={() => window.location.reload()} className="px-4 py-2 bg-coral-500 text-white rounded-lg hover:bg-coral-600">
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
              onChange={(e) => setMapStyle(e.target.value)}
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
              ? posts.filter(p => p.categories?.id === selectedCategory).length 
              : posts.length
            }件の投稿
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