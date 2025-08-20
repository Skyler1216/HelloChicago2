import React, { useState } from 'react';
import {
  TrendingUp,
  Map as MapIcon,
  Search,
  Filter,
  MapPin,
  Plus,
} from 'lucide-react';
import CategoryFilter from './CategoryFilter';
import PopularSpots from './PopularSpots';
import MapboxMap from './MapboxMap';
import PostDetailView from './PostDetailView';
import SpotFormModal from './map/SpotFormModal';
import { useCategories } from '../hooks/useCategories';
import { usePosts } from '../hooks/usePosts';
import { useMapSpots } from '../hooks/useMapSpots';

export default function MapView() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedPost, setSelectedPost] = useState<any>(null); // eslint-disable-line @typescript-eslint/no-explicit-any
  const [activeTab, setActiveTab] = useState<'map' | 'spots'>('map');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [distanceFilter, setDistanceFilter] = useState<number>(10); // km
  const [sortBy, setSortBy] = useState<'recent' | 'popular' | 'rating'>(
    'recent'
  );
  const [showSpotForm, setShowSpotForm] = useState(false);
  const [clickedLocation, setClickedLocation] = useState<{
    lat: number;
    lng: number;
    address?: string;
  } | null>(null);

  const { categories, loading: categoriesLoading } = useCategories();
  const { posts } = usePosts();
  const { spots: mapSpots, loading: mapSpotsLoading } = useMapSpots();

  const tabs = [
    { id: 'map' as const, label: 'マップ', icon: MapIcon },
    { id: 'spots' as const, label: 'お気に入りスポット', icon: TrendingUp },
  ];

  // フィルタリングされた投稿を取得（ホームの投稿）
  const filteredPosts = posts.filter(post => {
    // カテゴリフィルター
    if (selectedCategory && post.category_id !== selectedCategory) {
      return false;
    }

    // 検索クエリフィルター
    if (
      searchQuery &&
      !post.title.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !post.content.toLowerCase().includes(searchQuery.toLowerCase())
    ) {
      return false;
    }

    return true;
  });

  // フィルタリングされたマップスポットを取得
  const filteredMapSpots = mapSpots.filter(spot => {
    // カテゴリフィルター
    if (selectedCategory && spot.category_id !== selectedCategory) {
      return false;
    }

    // 検索クエリフィルター
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

  // 人気スポットを取得（マップスポットベース）
  const popularSpots = React.useMemo(() => {
    const spotMap = new Map();

    // マップスポットを追加
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

    // ホームの投稿も追加（既存のスポットと統合）
    filteredPosts.forEach(post => {
      const key = `${post.location_lat.toFixed(3)},${post.location_lng.toFixed(3)}`;
      if (!spotMap.has(key)) {
        spotMap.set(key, {
          location: key,
          lat: post.location_lat,
          lng: post.location_lng,
          address: post.location_address,
          posts: [],
          postCount: 0,
          categories: new Set(),
          mapSpot: null,
          isMapSpot: false,
        });
      }

      const currentSpot = spotMap.get(key);
      if (currentSpot) {
        currentSpot.posts.push(post);
        currentSpot.postCount++;
        if (post.category_id) {
          currentSpot.categories.add(post.category_id);
        }
      }
    });

    return Array.from(spotMap.values())
      .sort((a, b) => b.postCount - a.postCount)
      .slice(0, 20); // 上位20件
  }, [filteredMapSpots, filteredPosts]);

  if (selectedPost) {
    return (
      <PostDetailView
        post={selectedPost}
        onBack={() => setSelectedPost(null)}
      />
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Header with Search and Filters */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="px-4 py-4">
          {/* Search Bar */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1 text-gray-400" />
            <input
              type="text"
              placeholder="場所やスポットを検索..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-coral-500 focus:border-transparent transition-all"
            />
          </div>

          {/* Filter Toggle and Category Filter */}
          <div className="flex items-center justify-between">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                showFilters
                  ? 'bg-coral-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-100'
              }`}
            >
              <Filter className="w-4 h-4" />
              <span>フィルター</span>
            </button>

            <div className="flex items-center space-x-2">
              <MapPin className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-600">
                {filteredMapSpots.length}件のスポット
              </span>
            </div>
          </div>

          {/* Advanced Filters */}
          {showFilters && (
            <div className="mt-3 p-3 bg-gray-50 rounded-lg space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  距離: {distanceFilter}km以内
                </label>
                <input
                  type="range"
                  min="1"
                  max="50"
                  value={distanceFilter}
                  onChange={e => setDistanceFilter(Number(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  並び順
                </label>
                <div className="flex space-x-2">
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
                      className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${
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
          <CategoryFilter
            categories={categories}
            loading={categoriesLoading}
            selectedCategory={selectedCategory}
            onCategorySelect={setSelectedCategory}
          />
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="px-4 py-3 bg-white border-b border-gray-100">
        <div className="flex space-x-1">
          {tabs.map(tab => {
            const IconComponent = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-lg font-medium text-sm transition-all duration-200 ${
                  isActive
                    ? 'bg-coral-100 text-coral-700 border-2 border-coral-200'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <IconComponent
                  className={`w-4 h-4 ${isActive ? 'text-coral-700' : 'text-gray-500'}`}
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
            onSpotSelect={() => {
              setActiveTab('map');
              // 地図でそのスポットを中心に表示する処理
            }}
          />
        </div>
      ) : (
        <div className="flex-1 relative">
          {mapSpotsLoading ? (
            <div className="absolute inset-0 bg-white bg-opacity-90 flex items-center justify-center z-10">
              <div className="text-center">
                <div className="w-8 h-8 border-2 border-coral-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                <p className="text-gray-500">地図を読み込み中...</p>
              </div>
            </div>
          ) : (
            <MapboxMap
              posts={filteredPosts}
              mapSpots={filteredMapSpots}
              selectedCategory={selectedCategory}
              onPostSelect={setSelectedPost}
              searchQuery={searchQuery}
              distanceFilter={distanceFilter}
              onLocationClick={location => {
                console.log('Location clicked in MapView:', location); // デバッグログ
                setClickedLocation(location);
              }}
            />
          )}
        </div>
      )}

      {/* Quick Actions Floating Button */}
      <button
        onClick={() => setShowSpotForm(true)}
        className="fixed bottom-24 right-4 w-12 h-12 bg-coral-500 hover:bg-coral-600 text-white rounded-full shadow-lg flex items-center justify-center transition-all duration-200 hover:scale-110 z-50"
      >
        <Plus className="w-5 h-5" />
      </button>

      {/* Spot Form Modal */}
      <SpotFormModal
        isOpen={showSpotForm || !!clickedLocation}
        onClose={() => {
          setShowSpotForm(false);
          setClickedLocation(null);
        }}
        location={clickedLocation || undefined}
      />
    </div>
  );
}
