import React, { useState, useEffect } from 'react';
import { MapPin, Navigation, TrendingUp, Map } from 'lucide-react';
import { mockPosts } from '../data/mockData';
import CategoryFilter from './CategoryFilter';
import PopularSpots from './PopularSpots';
import { useCategories } from '../hooks/useCategories';

export default function MapView() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedPost, setSelectedPost] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'map' | 'spots'>('map');
  const { categories, loading: categoriesLoading } = useCategories();
  
  const filteredPosts = selectedCategory 
    ? mockPosts.filter(post => post.category.id === selectedCategory)
    : mockPosts;

  const tabs = [
    { id: 'map' as const, label: 'マップ', icon: Map },
    { id: 'spots' as const, label: '人気スポット', icon: TrendingUp },
  ];
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
        <div className="flex-1 flex flex-col">
          {/* Map Description */}
          <div className="bg-white px-4 py-6 border-b border-gray-100">
            <div className="text-center">
              <MapPin className="w-16 h-16 text-coral-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">マップビュー</h3>
              <p className="text-gray-600 text-sm mb-4">
                実装時にMapboxを使用して<br />
                インタラクティブなマップを表示
              </p>
            </div>
          </div>
          
          {/* Map Container */}
          <div className="flex-1 relative bg-gradient-to-br from-blue-50 to-green-50">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative w-64 h-48 mx-auto bg-white rounded-lg shadow-lg p-4">
                <div className="text-xs text-gray-500 mb-2">シカゴ周辺エリア</div>
                {filteredPosts.slice(0, 3).map((post, index) => (
                  <div 
                    key={post.id}
                    className="absolute cursor-pointer transform hover:scale-110 transition-transform"
                    style={{
                      left: `${20 + index * 60}px`,
                      top: `${40 + index * 20}px`
                    }}
                    onClick={() => setSelectedPost(selectedPost === post.id ? null : post.id)}
                  >
                    <div 
                      className="w-6 h-6 rounded-full border-2 border-white shadow-lg flex items-center justify-center"
                      style={{ backgroundColor: post.category.color }}
                    >
                      <div className="w-2 h-2 bg-white rounded-full"></div>
                    </div>
                    
                    {selectedPost === post.id && (
                      <div className="absolute top-8 left-1/2 transform -translate-x-1/2 bg-white rounded-lg shadow-lg p-3 w-48 z-10">
                        <h4 className="font-semibold text-sm text-gray-900 mb-1">
                          {post.title}
                        </h4>
                        <p className="text-xs text-gray-600 mb-2">
                          {post.category.nameJa}
                        </p>
                        <button className="text-xs text-coral-600 font-medium">
                          詳細を見る
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
            
            {/* Current Location Button */}
            <button className="absolute bottom-6 right-6 bg-white p-3 rounded-full shadow-lg border border-gray-200 hover:shadow-xl transition-shadow">
              <Navigation className="w-5 h-5 text-coral-600" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}