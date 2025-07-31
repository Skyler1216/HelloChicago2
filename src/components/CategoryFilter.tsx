import React from 'react';
import * as LucideIcons from 'lucide-react';
import { Database } from '../types/database';

type Category = Database['public']['Tables']['categories']['Row'];

interface CategoryFilterProps {
  categories: Category[];
  loading?: boolean;
  selectedCategory: string | null;
  onCategorySelect: (categoryId: string | null) => void;
}

export default function CategoryFilter({ categories, loading, selectedCategory, onCategorySelect }: CategoryFilterProps) {
  if (loading) {
    return (
      <div className="px-4 py-3 bg-white border-b border-gray-100">
        <div className="flex space-x-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-8 bg-gray-200 rounded-full animate-pulse" style={{ width: `${60 + i * 20}px` }}></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-3 bg-white border-b border-gray-100">
      <div className="flex space-x-2 overflow-x-auto scrollbar-hide">
        <button
          onClick={() => onCategorySelect(null)}
          className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
            selectedCategory === null
              ? 'bg-coral-100 text-coral-700 border-2 border-coral-200'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          すべて
        </button>
        {categories.map((category) => {
          const IconComponent = LucideIcons[category.icon as keyof typeof LucideIcons];
          
          return (
            <button
              key={category.id}
              onClick={() => onCategorySelect(category.id)}
              className={`flex-shrink-0 flex items-center space-x-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                selectedCategory === category.id
                  ? 'text-white border-2 border-transparent'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              style={selectedCategory === category.id ? { backgroundColor: category.color } : {}}
            >
              {IconComponent && <IconComponent className="w-4 h-4" />}
              <span>{category.name_ja}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}