import { useState } from 'react';
import { Camera, HelpCircle, Gift, Plus, X } from 'lucide-react';
import PostCard from './PostCard';
import { useAuth } from '../hooks/useAuth';
import { usePosts } from '../hooks/usePosts';
import { Database } from '../types/database';
import PostDetailView from './PostDetailView';
import PostEditModal from './PostEditModal';
import TabNavigation, { TabItem } from './common/TabNavigation';

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
  const { user } = useAuth();
  const [selectedPostType, setSelectedPostType] = useState<
    'post' | 'consultation' | 'transfer'
  >('post');
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [showPostModal, setShowPostModal] = useState(false);
  const [editingPost, setEditingPost] = useState<Post | null>(null);

  const {
    posts,
    loading: postsLoading,
    isRefreshing,
    refetch,
    deletePost,
  } = usePosts(selectedPostType);

  const postTypeTabs: TabItem[] = [
    {
      id: 'post',
      label: '体験',
      icon: Camera,
    },
    {
      id: 'consultation',
      label: '相談',
      icon: HelpCircle,
    },
    {
      id: 'transfer',
      label: '譲渡',
      icon: Gift,
    },
  ];

  const handlePostUpdate = (updatedPost: Post) => {
    // 選択された投稿を更新
    setSelectedPost(updatedPost);

    // 投稿リストも更新するためにrefetchを実行
    refetch();
  };

  const handleEditPost = (post: Post) => {
    if (!user || user.id !== post.author_id) return;
    setEditingPost(post);
  };

  const handleDeletePost = async (post: Post) => {
    if (!user || user.id !== post.author_id) return;
    if (!confirm('この投稿を削除しますか？')) return;
    try {
      await deletePost(post.id);
      await refetch();
      alert('投稿を削除しました');
    } catch {
      alert('削除に失敗しました');
    }
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
    <div className="pb-10 relative">
      {/* Post Type Tabs */}
      <TabNavigation
        tabs={postTypeTabs}
        activeTab={selectedPostType}
        onTabChange={tabId =>
          setSelectedPostType(tabId as 'post' | 'consultation' | 'transfer')
        }
        className="sticky top-16 z-30"
      />

      <div className="px-4">
        <h2 className="text-lg font-bold text-gray-900 mb-4">
          {selectedPostType === 'post' && '最新の体験'}
          {selectedPostType === 'consultation' && '最新の相談'}
          {selectedPostType === 'transfer' && '最新の譲渡'}
        </h2>
        <div className="space-y-4">
          {/* リフレッシュインジケーター */}
          {isRefreshing && !postsLoading && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-blue-700 text-sm">最新の情報を取得中...</p>
              </div>
            </div>
          )}

          {postsLoading && !isRefreshing ? (
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
                onEdit={handleEditPost}
                onDelete={handleDeletePost}
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
          <div
            className="bg-white rounded-t-3xl w-full max-w-md p-6 pb-8"
            onClick={e => e.stopPropagation()}
          >
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
                    onClick={() =>
                      handlePostTypeSelect(
                        tab.id as 'post' | 'consultation' | 'transfer'
                      )
                    }
                    className="w-full flex items-center space-x-4 p-4 rounded-xl border border-gray-200 hover:border-coral-300 hover:bg-coral-50 transition-all duration-200"
                  >
                    <div className="p-3">
                      <IconComponent className="w-6 h-6 text-coral-600" />
                    </div>
                    <div className="flex-1 text-left">
                      <div className="font-bold text-lg text-coral-600">
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
          {/* Overlay click handler */}
          <div
            className="absolute inset-0 -z-10"
            onClick={() => setShowPostModal(false)}
          />
        </div>
      )}

      {/* Edit Modal */}
      <PostEditModal
        isOpen={!!editingPost}
        post={editingPost}
        onClose={() => setEditingPost(null)}
        onSaved={updated => {
          handlePostUpdate(updated);
          setEditingPost(null);
        }}
      />
    </div>
  );
}
