import React from 'react';
import { TrendingUp, Star } from 'lucide-react';
import * as LucideIcons from 'lucide-react';

export default function PopularSpots() {
  // Mock data for popular spots - in real app, this would come from database
  const spots = [
    {
      id: 'spot1',
      name: 'Northwestern Memorial Hospital',
      category: { icon: 'Heart', name_ja: '病院', color: '#FF6B6B' },
      postCount: 5,
      averageRating: 4.8,
    },
    {
      id: 'spot2',
      name: 'Whole Foods Market Lincoln Park',
      category: { icon: 'ShoppingBag', name_ja: '買い物', color: '#FFE66D' },
      postCount: 8,
      averageRating: 4.5,
    },
    {
      id: 'spot3',
      name: 'Lincoln Park Zoo',
      category: { icon: 'Baby', name_ja: '子ども', color: '#F38BA8' },
      postCount: 12,
      averageRating: 4.7,
    },
  ];

  return (
    <div className="px-4 py-6">
      <div className="flex items-center space-x-2 mb-4">
        <TrendingUp className="w-5 h-5 text-coral-600" />
        <h2 className="text-lg font-bold text-gray-900">人気スポット</h2>
      </div>

      <div className="space-y-3">
        {spots.map((spot, index) => {
          const IconComponent =
            LucideIcons[spot.category.icon as keyof typeof LucideIcons];

          return (
            <div
              key={spot.id}
              className="bg-white rounded-xl p-4 border border-gray-100 hover:shadow-md transition-all duration-200"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg text-white font-bold text-sm bg-gradient-to-r from-coral-500 to-coral-400">
                    {index + 1}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900 text-sm">
                      {spot.name}
                    </h3>
                    <div className="flex items-center space-x-1 mt-1">
                      <div
                        className="flex items-center space-x-1 px-2 py-1 rounded-full text-xs"
                        style={{
                          backgroundColor: spot.category.color + '20',
                          color: spot.category.color,
                        }}
                      >
                        {IconComponent && <IconComponent className="w-4 h-4" />}
                        <span>{spot.category.name_ja}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm text-gray-500">
                <span>{spot.postCount}件の投稿</span>
                <div className="flex items-center space-x-1">
                  <Star className="w-4 h-4 text-yellow-500 fill-current" />
                  <span>{spot.averageRating}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
