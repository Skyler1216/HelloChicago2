import { useState } from 'react';
import { POIFeature, POISearchResult, Location } from '../types/map';

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

export function useMapPOI() {
  const [isSearching, setIsSearching] = useState(false);
  const [lastSearchResult, setLastSearchResult] =
    useState<POISearchResult | null>(null);

  const searchPOI = async (location: Location): Promise<POISearchResult> => {
    if (!MAPBOX_TOKEN) {
      throw new Error('Mapbox APIキーが設定されていません');
    }

    setIsSearching(true);

    try {
      const { lat, lng } = location;

      // 座標の形式を確認し、適切な範囲内に収める
      const validLng = Math.max(-180, Math.min(180, lng));
      const validLat = Math.max(-90, Math.min(90, lat));

      // POIタイプのみを検索（建物、ランドマーク、お店など）
      const poiSearchUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${validLng},${validLat}.json?access_token=${MAPBOX_TOKEN}&types=poi&language=ja&limit=1&radius=50`;

      const response = await fetch(poiSearchUrl);

      if (!response.ok) {
        throw new Error(`POI検索に失敗しました: ${response.status}`);
      }

      const data = await response.json();

      if (!data.features || data.features.length === 0) {
        return {
          poiFound: false,
          poiName: '',
          poiAddress: '',
          coordinates: [validLng, validLat],
        };
      }

      const feature: POIFeature = data.features[0];
      const relevance = feature.relevance || 0;
      const distance = feature.distance || 0;

      // より厳しい条件でPOIを有効とする
      if (relevance > 0.7 && distance < 100) {
        const poiName = feature.text_ja || feature.text || '';
        const poiAddress = feature.place_name_ja || feature.place_name || '';

        const result: POISearchResult = {
          poiFound: true,
          poiName,
          poiAddress,
          coordinates: [validLng, validLat],
        };

        setLastSearchResult(result);
        return result;
      } else {
        return {
          poiFound: false,
          poiName: '',
          poiAddress: '',
          coordinates: [validLng, validLat],
        };
      }
    } catch (error) {
      console.error('POI検索エラー:', error);
      throw error;
    } finally {
      setIsSearching(false);
    }
  };

  const clearLastSearchResult = () => {
    setLastSearchResult(null);
  };

  return {
    searchPOI,
    isSearching,
    lastSearchResult,
    clearLastSearchResult,
  };
}
