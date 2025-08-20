import { useState } from 'react';
import { Camera, HelpCircle, Gift, Plus, X } from 'lucide-react';
import PostCard from './PostCard';
import PostDetailView from './PostDetailView';
import { usePosts } from '../hooks/usePosts';
import { Database } from '../types/database';

type Post = Database['public']['Tables']['posts']['Row'] & {
  profiles: Database['public']['Tables']['profiles']['Row'];
  categories: Database['public']['Tables']['categories']['Row'];
  likes_count?: number;
  comments_count?: number;
};

interface HomeViewProps {
  onShowPostForm: (type: 'post' | 'consultation' | 'transfer') => void;
}

export default function HomeView({ onShowPostForm }: HomeViewProps) {
  const [selectedPostType, setSelectedPostType] = useState<
    'post' | 'consultation' | 'transfer'
  >('post');
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [showPostModal, setShowPostModal] = useState(false);

  const { posts, loading: postsLoading, refetch } = usePosts(selectedPostType);

  const postTypeTabs = [
    {
      id: 'post' as const,
      label: '体験',
      icon: Camera,
      color: 'text-blue-600',
    },
    {
      id: 'consultation' as const,
      label: '相談',
      icon: HelpCircle,
      color: 'text-teal-600',
    },
    {
      id: 'transfer' as const,
      label: '譲渡',
      icon: Gift,
      color: 'text-coral-600',
    },
  ];

  const handlePostUpdate = (updatedPost: Post) => {
    // 選択された投稿を更新
    setSelectedPost(updatedPost);

    // 投稿リストも更新するためにrefetchを実行
    refetch();
  };

  const handlePostTypeSelect = (type: 'post' | 'consultation' | 'transfer') => {
    setSelectedPostType(type);
    setShowPostModal(false);
    // 投稿フォームを表示
    onShowPostForm(type);
  };

  if (selectedPost) {
    return (
      <PostDetailView
        post={selectedPost}
        onBack={() => setSelectedPost(null)}
        onPostUpdate={handlePostUpdate}
      />
    );
  }

  return (
    <div className="pb-6 relative">
      {/* Post Type Tabs */}
      <div className="px-4 py-4 bg-white border-b border-gray-100">
        <div className="flex space-x-1">
          {postTypeTabs.map(tab => {
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
                <IconComponent
                  className={`w-4 h-4 ${isActive ? 'text-gray-900' : tab.color}`}
                />
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
              style={{
                marginLeft: index === 0 ? '0' : '4px',
                marginRight: index === postTypeTabs.length - 1 ? '0' : '4px',
              }}
            />
          ))}
        </div>
      </div>

      <div className="px-4">
        <h2 className="text-lg font-bold text-gray-900 mb-4">
          {selectedPostType === 'post' && '最新の体験'}
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
                {selectedPostType === 'post' && 'まだ体験がありません'}
                {selectedPostType === 'consultation' && 'まだ相談がありません'}
                {selectedPostType === 'transfer' &&
                  'まだ譲渡の投稿がありません'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Floating Action Button (FAB) */}
      <button
        onClick={() => setShowPostModal(true)}
        className="fixed bottom-20 right-4 w-14 h-14 bg-coral-500 hover:bg-coral-600 text-white rounded-full shadow-lg flex items-center justify-center transition-all duration-200 hover:scale-110 z-50"
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* Post Type Selection Modal */}
      {showPostModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-end justify-center z-50">
          <div className="bg-white rounded-t-3xl w-full max-w-md p-6 pb-8">
            {/* Modal Header */}
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-gray-900">投稿する</h3>
              <button
                onClick={() => setShowPostModal(false)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            {/* Post Type Options */}
            <div className="space-y-4">
              {postTypeTabs.map(tab => {
                const IconComponent = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => handlePostTypeSelect(tab.id)}
                    className="w-full flex items-center space-x-4 p-4 rounded-xl border border-gray-200 hover:border-coral-300 hover:bg-coral-50 transition-all duration-200"
                  >
                    <div
                      className={`p-3 rounded-lg ${tab.color.replace('text-', 'bg-').replace('-600', '-100')}`}
                    >
                      <IconComponent className={`w-6 h-6 ${tab.color}`} />
                    </div>
                    <div className="flex-1 text-left">
                      <div className={`font-bold text-lg ${tab.color}`}>
                        {tab.label}
                      </div>
                      <div className="text-gray-600 text-sm mt-1">
                        {tab.id === 'post' && '体験談やおすすめをシェア'}
                        {tab.id === 'consultation' && '質問や相談をする'}
                        {tab.id === 'transfer' && '不要なものを譲る・もらう'}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
