import { useState } from 'react';
import { POISearchResult, Location } from '../types/map';

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

      // GoogleマップライクなPOI検索 - シンプルで確実
      const poiSearchUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${validLng},${validLat}.json?access_token=${MAPBOX_TOKEN}&types=poi&language=ja&limit=5`;

      const response = await fetch(poiSearchUrl);

      if (!response.ok) {
        throw new Error(`POI検索に失敗しました: ${response.status}`);
      }

      const data = await response.json();

      console.log('🔍 POI検索結果:', data.features.length, '件');

      // 最も関連性の高いPOIを選択
      if (data.features.length > 0) {
        const bestFeature = data.features[0];
        const poiName = bestFeature.text_ja || bestFeature.text || '';
        const poiAddress = bestFeature.place_name_ja || bestFeature.place_name || '';
        // use actual feature coordinates if provided
        let lngOut = validLng;
        let latOut = validLat;
        if (
          bestFeature.geometry &&
          bestFeature.geometry.type === 'Point' &&
          Array.isArray(bestFeature.geometry.coordinates)
        ) {
          lngOut = Number(bestFeature.geometry.coordinates[0]);
          latOut = Number(bestFeature.geometry.coordinates[1]);
        }

        const result: POISearchResult = {
          poiFound: true,
          poiName,
          poiAddress,
          coordinates: [lngOut, latOut],
        };

        console.log('✅ POI発見:', result);
        setLastSearchResult(result);
        return result;
      }

      console.log('❌ POIが見つかりませんでした');
      return {
        poiFound: false,
        poiName: '',
        poiAddress: '',
        coordinates: [validLng, validLat],
      };
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
