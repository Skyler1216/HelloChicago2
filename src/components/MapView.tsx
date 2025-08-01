import React, { useState, useEffect } from 'react';
import { TrendingUp, Map } from 'lucide-react';
import CategoryFilter from './CategoryFilter';
import PopularSpots from './PopularSpots';
import MapboxMap from './MapboxMap';
import PostDetailView from './PostDetailView';
import { useCategories } from '../hooks/useCategories';
import { usePosts } from '../hooks/usePosts';

export default function MapView() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedPost, setSelectedPost] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<'map' | 'spots'>('map');
  const { categories, loading: categoriesLoading } = useCategories();
  const { posts, loading: postsLoading } = usePosts();

  const tabs = [
    { id: 'map' as const, label: 'マップ', icon: Map },
    { id: 'spots' as const, label: '人気スポット', icon: TrendingUp },
  ];

  if (selectedPost) {
    return (
      <PostDetailView 
        post={selectedPost} 
        onBack={() => setSelectedPost(null)} 
      />
    );
  }

  return (
    <div className="h-full flex flex-col">
      <CategoryFilter 
        categories={categories}
        loading={categoriesLoading}
        selectedCategory={selectedCategory}
        onCategorySelect={setSelectedCategory}
      />
      
      {/* Tab Navigation */}
      <div className="px-4 py-3 bg-white border-b border-gray-100">
        <div className="flex space-x-1">
          {tabs.map((tab) => {
            const IconComponent = tab.icon;
            const isActive = activeTab === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-lg font-medium text-sm transition-all duration-200 ${
                  isActive 
                    ? 'bg-gray-100 text-gray-900' 
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <IconComponent className={`w-4 h-4 ${isActive ? 'text-gray-900' : 'text-teal-600'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
        {/* Active tab indicator */}
        <div className="flex mt-2">
          {tabs.map((tab, index) => (
            <div 
              key={tab.id}
              className={`flex-1 h-0.5 ${
                activeTab === tab.id ? 'bg-teal-500' : 'bg-transparent'
              } transition-colors duration-200`}
              style={{ marginLeft: index === 0 ? '0' : '4px', marginRight: index === tabs.length - 1 ? '0' : '4px' }}
            />
          ))}
        </div>
      </div>
      
      {/* Content based on active tab */}
      {activeTab === 'spots' ? (
        <div className="flex-1 overflow-y-auto">
          <PopularSpots />
        </div>
      ) : (
        <MapboxMap 
          posts={posts}
          selectedCategory={selectedCategory}
          onPostSelect={setSelectedPost}
        />
      )}
    </div>
  );
}