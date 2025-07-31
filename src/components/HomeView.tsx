import React, { useState } from 'react';
import { MessageSquare, HelpCircle, Gift } from 'lucide-react';
import PostCard from './PostCard';
import PostDetailView from './PostDetailView';
import { usePosts } from '../hooks/usePosts';

export default function HomeView() {
  const [selectedPostType, setSelectedPostType] = useState<'post' | 'consultation' | 'transfer'>('post');
  const [selectedPost, setSelectedPost] = useState<any>(null);

  const { posts, loading: postsLoading } = usePosts(selectedPostType);
  
  const postTypeTabs = [
    { id: 'post' as const, label: '投稿', icon: MessageSquare, color: 'text-blue-600' },
    { id: 'consultation' as const, label: '相談', icon: HelpCircle, color: 'text-teal-600' },
    { id: 'transfer' as const, label: '譲渡', icon: Gift, color: 'text-coral-600' },
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
    <div className="pb-6">
      {/* Post Type Tabs */}
      <div className="px-4 py-4 bg-white border-b border-gray-100">
        <div className="flex space-x-1">
          {postTypeTabs.map((tab) => {
            const IconComponent = tab.icon;
            const isActive = selectedPostType === tab.id;
            
            return (
              <button
                key={tab.id}
                onClick={() => setSelectedPostType(tab.id)}
                className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-lg font-medium text-sm transition-all duration-200 ${
                  isActive 
                    ? 'bg-gray-100 text-gray-900' 
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <IconComponent className={`w-4 h-4 ${isActive ? 'text-gray-900' : tab.color}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
        {/* Active tab indicator */}
        <div className="flex mt-2">
          {postTypeTabs.map((tab, index) => (
            <div 
              key={tab.id}
              className={`flex-1 h-0.5 ${
                selectedPostType === tab.id ? 'bg-teal-500' : 'bg-transparent'
              } transition-colors duration-200`}
              style={{ marginLeft: index === 0 ? '0' : '4px', marginRight: index === postTypeTabs.length - 1 ? '0' : '4px' }}
            />
          ))}
        </div>
      </div>
      
      <div className="px-4">
        <h2 className="text-lg font-bold text-gray-900 mb-4">
          {selectedPostType === 'post' && '最新の投稿'}
          {selectedPostType === 'consultation' && '最新の相談'}
          {selectedPostType === 'transfer' && '最新の譲渡'}
        </h2>
        <div className="space-y-4">
          {postsLoading ? (
            <div className="text-center py-8">
              <div className="w-8 h-8 border-2 border-coral-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-gray-500">読み込み中...</p>
            </div>
          ) : posts.length > 0 ? (
            posts.map(post => (
              <PostCard 
                key={post.id} 
                post={post} 
                onClick={() => setSelectedPost(post)}
              />
            ))
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">
                {selectedPostType === 'post' && 'まだ投稿がありません'}
                {selectedPostType === 'consultation' && 'まだ相談がありません'}
                {selectedPostType === 'transfer' && 'まだ譲渡の投稿がありません'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}