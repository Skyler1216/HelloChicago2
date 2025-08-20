import { useRef, useCallback } from 'react';
import mapboxgl from 'mapbox-gl';
import { Post, CategoryInfo, Location } from '../types/map';

export function useMapMarkers() {
  const markers = useRef<mapboxgl.Marker[]>([]);
  const clickMarker = useRef<mapboxgl.Marker | null>(null);

  const clearAllMarkers = useCallback(() => {
    markers.current.forEach(marker => marker.remove());
    markers.current = [];
  }, []);

  const clearClickMarker = useCallback(() => {
    if (clickMarker.current) {
      clickMarker.current.remove();
      clickMarker.current = null;
    }
  }, []);

  const createPostMarker = useCallback(
    (
      post: Post,
      categoryInfo: CategoryInfo,
      isHighlighted: boolean,
      onPostSelect: (post: Post) => void,
      map: mapboxgl.Map
    ) => {
      const markerElement = document.createElement('div');
      markerElement.className = 'custom-marker';

      const markerColor = categoryInfo.color;

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
            ${categoryInfo.name_ja}
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
        .addTo(map);

      // マーカークリックイベント
      markerElement.addEventListener('click', () => {
        onPostSelect(post);
      });

      // ホバーエフェクト
      markerElement.addEventListener('mouseenter', () => {
        markerElement.style.transform = 'scale(1.1)';
      });

      markerElement.addEventListener('mouseleave', () => {
        markerElement.style.transform = isHighlighted
          ? 'scale(1.2)'
          : 'scale(1)';
      });

      return marker;
    },
    []
  );

  const createClickMarker = useCallback(
    (location: Location, isPOI: boolean, map: mapboxgl.Map) => {
      clearClickMarker();

      const markerElement = document.createElement('div');
      markerElement.innerHTML = `
      <div style="
        width: ${isPOI ? '24px' : '16px'};
        height: ${isPOI ? '24px' : '16px'};
        background: ${isPOI ? '#FF6B6B' : '#9CA3AF'};
        border: ${isPOI ? '3px' : '2px'} solid white;
        border-radius: 50%;
        box-shadow: 0 2px 8px rgba(0,0,0,${isPOI ? '0.3' : '0.2'});
        animation: ${isPOI ? 'pulse 1s infinite' : 'none'};
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
        .setLngLat([location.lng, location.lat])
        .addTo(map);

      clickMarker.current = marker;

      // POIでない場合は一時的に表示
      if (!isPOI) {
        setTimeout(() => {
          marker.remove();
          if (clickMarker.current === marker) {
            clickMarker.current = null;
          }
        }, 2000);
      }

      return marker;
    },
    [clearClickMarker]
  );

  const addGlobalSelectPostFunction = useCallback(
    (posts: Post[], onPostSelect: (post: Post) => void) => {
      (
        window as Window &
          typeof globalThis & { selectPost?: (postId: string) => void }
      ).selectPost = (postId: string) => {
        const post = posts.find(p => p.id === postId);
        if (post) {
          onPostSelect(post);
        }
      };
    },
    []
  );

  return {
    markers: markers.current,
    clickMarker: clickMarker.current,
    clearAllMarkers,
    clearClickMarker,
    createPostMarker,
    createClickMarker,
    addGlobalSelectPostFunction,
  };
}
