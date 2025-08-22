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
  } | null>(null);
  const [tempRating, setTempRating] = useState(0);
  const [focusLocation, setFocusLocation] = useState<{
    lat: number;
    lng: number;
    zoom?: number;
  } | null>(null);

  const { categories, loading: categoriesLoading } = useCategories();
  const { spots: mapSpots, loading: mapSpotsLoading } = useMapSpots();

  // モーダルは廃止（ページ遷移に変更）

  const tabs = [
    { id: 'map' as const, label: 'マップ', icon: MapIcon },
    { id: 'spots' as const, label: '人気スポット', icon: TrendingUp },
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
    (location: { lat: number; lng: number; address?: string }) => {
      setTempRating(0);
      setActionsLocation(prev => {
        const same =
          prev &&
          prev.lat === location.lat &&
          prev.lng === location.lng &&
          prev.address === location.address;
        if (!same) return location;
        return prev;
      });
      setBottomSheetOpen(true);
    },
    []
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
      <div className="px-3 sm:px-4 py-1 sm:py-1.5 bg-white border-b border-gray-100 flex-shrink-0">
        <div className="flex space-x-1">
          {tabs.map(tab => {
            const IconComponent = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center space-x-1 sm:space-x-2 py-1 sm:py-1.5 px-2 sm:px-4 rounded-md sm:rounded-lg font-medium text-xs sm:text-sm transition-all duration-200 ${
                  isActive
                    ? 'bg-coral-100 text-coral-700 border-2 border-coral-200'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <IconComponent
                  className={`w-3 h-3 sm:w-4 sm:h-4 ${isActive ? 'text-coral-700' : 'text-gray-500'}`}
                />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

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
        rating={tempRating}
        onChangeRating={setTempRating}
        onClose={() => setBottomSheetOpen(false)}
        onClickViewReviews={() => {
          setBottomSheetOpen(false);
          // TODO: 口コミ一覧ページへ遷移（未実装）
        }}
        onClickPostReview={() => {
          setBottomSheetOpen(false);
          if (onRequestCreateSpotAt && actionsLocation) {
            onRequestCreateSpotAt(actionsLocation);
          }
        }}
      />
    </div>
  );
}
