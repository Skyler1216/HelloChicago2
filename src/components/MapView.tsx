import React, { useCallback, useMemo, useState } from 'react';
import {
  TrendingUp,
  Map as MapIcon,
  Search,
  Filter,
  MapPin,
} from 'lucide-react';
import CategoryFilter from './CategoryFilter';
import PopularSpots from './PopularSpots';
import MapboxMap from './MapboxMap';
// SpotFormModalはページ遷移化に伴い未使用
import { useCategories } from '../hooks/useCategories';
import { useMapSpots } from '../hooks/useMapSpots';
import SpotBottomSheet from './map/SpotBottomSheet';
import TabNavigation, { TabItem } from './common/TabNavigation';
// import ReviewsBottomSheet from './map/ReviewsBottomSheet';

interface MapViewProps {
  onRequestCreateSpotAt?: (location: {
    lat: number;
    lng: number;
    address?: string;
  }) => void;
}

export default function MapView({ onRequestCreateSpotAt }: MapViewProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedSpot, setSelectedSpot] = useState<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any
  const [activeTab, setActiveTab] = useState<'map' | 'spots'>('map');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [distanceFilter, setDistanceFilter] = useState<number>(10); // km
  const [sortBy, setSortBy] = useState<'recent' | 'popular' | 'rating'>(
    'recent'
  );
  // POIクリックで表示するアクションモーダルの状態
  const [bottomSheetOpen, setBottomSheetOpen] = useState(false);
  const [actionsLocation, setActionsLocation] = useState<{
    lat: number;
    lng: number;
    address?: string;
    average_rating?: number;
    category_hints?: string[];
  } | null>(null);
  // const [actionsSpotId, setActionsSpotId] = useState<string | null>(null);
  // const [reviewsSheetOpen, setReviewsSheetOpen] = useState(false);
  // 旧: 自己評価入力用の一時ratingは廃止（平均表示のみ）
  const [focusLocation, setFocusLocation] = useState<{
    lat: number;
    lng: number;
    zoom?: number;
  } | null>(null);

  const { categories, loading: categoriesLoading } = useCategories();
  const { spots: mapSpots, loading: mapSpotsLoading } = useMapSpots();

  // モーダルは廃止（ページ遷移に変更）

  const tabs: TabItem[] = [
    { id: 'map', label: 'マップ', icon: MapIcon },
    { id: 'spots', label: '人気スポット', icon: TrendingUp },
  ];

  // フィルタリングされたマップスポットを取得
  const filteredMapSpots = useMemo(() => {
    return mapSpots.filter(spot => {
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
  }, [mapSpots, selectedCategory, searchQuery]);

  const handleLocationClick = useCallback(
    (location: {
      lat: number;
      lng: number;
      address?: string;
      category_hints?: string[];
    }) => {
      try {
        // 近接スポットを検索（50m以内）
        let nearest: { id: string; avg: number; dist: number } | null = null;
        // フィルタに関係なく、全スポットから近接判定する
        for (const s of mapSpots) {
          const toRad = (v: number) => (v * Math.PI) / 180;
          const R = 6371000;
          const dLat = toRad(s.location_lat - location.lat);
          const dLng = toRad(s.location_lng - location.lng);
          const lat1 = toRad(location.lat);
          const lat2 = toRad(s.location_lat);
          const a =
            Math.sin(dLat / 2) ** 2 +
            Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          const dist = R * c;
          if (!nearest || dist < nearest.dist) {
            nearest = { id: s.id, avg: s.average_rating ?? 0, dist };
          }
        }

        const within = nearest && nearest.dist <= 50;
        const avg = within && nearest ? nearest.avg : 0;

        setActionsLocation(prev => {
          const same =
            prev &&
            prev.lat === location.lat &&
            prev.lng === location.lng &&
            prev.address === location.address;
          if (!same) return { ...location, average_rating: avg };
          return prev
            ? { ...prev, average_rating: avg }
            : { ...location, average_rating: avg };
        });
        setBottomSheetOpen(true);
      } catch (error) {
        console.error('Error handling location click:', error);
        // エラーが発生しても基本的な情報でボトムシートを開く
        setActionsLocation({ ...location, average_rating: 0 });
        setBottomSheetOpen(true);
      }
    },
    [mapSpots]
  );

  // 人気スポットを取得（マップスポットのみ）
  const popularSpots = React.useMemo(() => {
    const spotMap = new Map();

    // マップスポットのみを追加
    filteredMapSpots.forEach(spot => {
      const key = `${spot.location_lat.toFixed(3)},${spot.location_lng.toFixed(3)}`;
      if (!spotMap.has(key)) {
        spotMap.set(key, {
          location: key,
          lat: spot.location_lat,
          lng: spot.location_lng,
          address: spot.location_address,
          posts: [],
          postCount: 0,
          categories: new Set(),
          mapSpot: spot,
          isMapSpot: true,
        });
      }

      const currentSpot = spotMap.get(key);
      if (currentSpot) {
        currentSpot.posts.push(spot);
        currentSpot.postCount++;
        if (spot.category_id) {
          currentSpot.categories.add(spot.category_id);
        }
      }
    });

    return Array.from(spotMap.values())
      .sort((a, b) => b.postCount - a.postCount)
      .slice(0, 20); // 上位20件
  }, [filteredMapSpots]);

  if (selectedSpot) {
    return (
      <div className="h-full flex flex-col bg-white">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <button
            onClick={() => setSelectedSpot(null)}
            className="flex items-center space-x-2 text-gray-600 hover:text-gray-800"
          >
            <span>← 戻る</span>
          </button>
          <h1 className="text-lg font-semibold text-gray-900">スポット詳細</h1>
          <div></div>
        </div>
        <div className="flex-1 p-4 overflow-y-auto">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              {selectedSpot.name}
            </h2>
            {selectedSpot.description && (
              <p className="text-gray-600 mb-4">{selectedSpot.description}</p>
            )}
            <div className="text-sm text-gray-500">
              <p>カテゴリ: {selectedSpot.category?.name_ja || '未設定'}</p>
              <p>
                作成日:{' '}
                {new Date(selectedSpot.created_at).toLocaleDateString('ja-JP')}
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header with Search and Filters */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10 flex-shrink-0">
        <div className="px-3 sm:px-4 py-1.5 sm:py-2">
          {/* Search Bar */}
          <div className="relative mb-0.5 sm:mb-1">
            <Search className="absolute left-2 sm:left-3 top-1/2 transform -translate-y-1 text-gray-400 w-4 h-4 sm:w-5 sm:h-5" />
            <input
              type="text"
              placeholder="場所やスポットを検索..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-7 sm:pl-10 pr-2 sm:pr-4 py-1.5 sm:py-2 text-sm sm:text-base border border-gray-200 rounded-lg sm:rounded-xl focus:ring-2 focus:ring-coral-500 focus:border-transparent transition-all"
            />
          </div>

          {/* Filter Toggle and Category Filter */}
          <div className="flex items-center justify-between mb-0.5 sm:mb-1">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center space-x-1 sm:space-x-2 px-2 sm:px-3 py-1 sm:py-1.5 rounded-md sm:rounded-lg text-xs sm:text-sm font-medium transition-all ${
                showFilters
                  ? 'bg-coral-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Filter className="w-3 h-3 sm:w-4 sm:h-4" />
              <span>フィルター</span>
            </button>

            <div className="flex items-center space-x-1 sm:space-x-2">
              <MapPin className="w-3 h-3 sm:w-4 sm:h-4 text-gray-500" />
              <span className="text-xs sm:text-sm text-gray-600">
                {filteredMapSpots.length}件のスポット
              </span>
            </div>
          </div>

          {/* Advanced Filters */}
          {showFilters && (
            <div className="mt-0.5 sm:mt-1 p-1.5 sm:p-2 bg-gray-50 rounded-lg space-y-1.5 sm:space-y-2 mb-0 sm:mb-0.5">
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-1.5">
                  距離: {distanceFilter}km以内
                </label>
                <input
                  type="range"
                  min="1"
                  max="50"
                  value={distanceFilter}
                  onChange={e => setDistanceFilter(Number(e.target.value))}
                  className="w-full h-1.5 sm:h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1 sm:mb-1.5">
                  並び順
                </label>
                <div className="flex space-x-1 sm:space-x-2">
                  {[
                    { value: 'recent', label: '最新' },
                    { value: 'popular', label: '人気' },
                    { value: 'rating', label: '評価' },
                  ].map(option => (
                    <button
                      key={option.value}
                      onClick={() =>
                        setSortBy(
                          option.value as 'recent' | 'popular' | 'rating'
                        )
                      }
                      className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-md sm:rounded-lg text-xs sm:text-sm font-medium transition-all ${
                        sortBy === option.value
                          ? 'bg-coral-500 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Category Filter */}
          <div className="mb-0 sm:mb-0.5">
            <CategoryFilter
              categories={categories}
              loading={categoriesLoading}
              selectedCategory={selectedCategory}
              onCategorySelect={setSelectedCategory}
            />
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <TabNavigation
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={tabId => setActiveTab(tabId as 'map' | 'spots')}
        variant="compact"
        className="flex-shrink-0"
      />

      {/* Content based on active tab */}
      {activeTab === 'spots' ? (
        <div className="flex-1 overflow-y-auto">
          <PopularSpots
            spots={popularSpots}
            onSpotSelect={spot => {
              setActiveTab('map');
              if (spot?.lat && spot?.lng) {
                setFocusLocation({ lat: spot.lat, lng: spot.lng, zoom: 16 });
              }
            }}
          />
        </div>
      ) : (
        <div className="flex-1 relative min-h-0">
          <MapboxMap
            spots={filteredMapSpots}
            selectedCategory={selectedCategory}
            onSpotSelect={setSelectedSpot}
            searchQuery={searchQuery}
            distanceFilter={distanceFilter}
            focusLocation={focusLocation}
            onLocationClick={handleLocationClick}
          />

          {mapSpotsLoading && (
            <div className="absolute inset-0 bg-white/90 flex items-center justify-center z-10">
              <div className="text-center">
                <div className="w-8 h-8 border-2 border-coral-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                <p className="text-gray-500">地図を読み込み中...</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Spot Bottom Sheet */}
      <SpotBottomSheet
        open={bottomSheetOpen}
        location={actionsLocation}
        onClose={() => setBottomSheetOpen(false)}
        onClickViewReviews={() => {
          // 旧: 口コミ一覧シートは一旦停止
        }}
        onClickPostReview={() => {
          setBottomSheetOpen(false);
          if (onRequestCreateSpotAt && actionsLocation) {
            onRequestCreateSpotAt(actionsLocation);
          }
        }}
      />

      {/* Reviews Bottom Sheet - disabled in rollback */}
    </div>
  );
}
