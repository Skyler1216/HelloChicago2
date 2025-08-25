import { useState, useEffect } from 'react';
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

  // localStorageからタブ状態を復元、デフォルトは'post'
  const [selectedPostType, setSelectedPostType] = useState<
    'post' | 'consultation' | 'transfer'
  >(() => {
    // 手動再読み込みの場合は「体験」タブにリセット
    const isManualReload = sessionStorage.getItem('manual_reload_detected');
    if (isManualReload) {
      console.log('📱 HomeView: Manual reload detected, resetting to post tab');
      sessionStorage.removeItem('manual_reload_detected');
      localStorage.removeItem('home_selected_tab'); // タブ状態をクリア
      return 'post';
    }

    // 通常の場合は保存されたタブ状態またはデフォルト
    const saved = localStorage.getItem('home_selected_tab');
    return (saved as 'post' | 'consultation' | 'transfer') || 'post';
  });

  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [showPostModal, setShowPostModal] = useState(false);
  const [editingPost, setEditingPost] = useState<Post | null>(null);

  // タブ状態をlocalStorageに保存
  const updateSelectedPostType = (
    type: 'post' | 'consultation' | 'transfer'
  ) => {
    setSelectedPostType(type);
    localStorage.setItem('home_selected_tab', type);
  };

  // 手動再読み込み時の処理（一時的に無効化）
  /*
  useEffect(() => {
    const handleManualReload = () => {
      console.log('📱 HomeView: Manual reload detected, resetting tab state');
      setSelectedPostType('post');
    };

    // 手動再読み込みの検出（初回のみ）
    const isManualReload = sessionStorage.getItem('manual_reload_detected');
    if (isManualReload) {
      console.log('📱 HomeView: Manual reload detected, will reset tab state');
      // フラグは即座に削除（重複実行を防ぐ）
      sessionStorage.removeItem('manual_reload_detected');

      // 少し待ってからタブ状態をリセット（コンポーネントの準備が完了してから）
      setTimeout(() => {
        handleManualReload();
      }, 200);
    }

    // アプリ再起動の検出（初回のみ）
    const lastVisibleTime = sessionStorage.getItem('last_visible_time');
    const currentTime = Date.now();
    if (lastVisibleTime) {
      const timeDiff = currentTime - parseInt(lastVisibleTime);
      if (timeDiff > 5 * 60 * 1000) {
        // 5分以上経過
        console.log('📱 HomeView: App restart detected, resetting tab state');
        setTimeout(() => {
          handleManualReload();
        }, 200);
      }
    }
  }, []); // 依存配列を空にして、初回のみ実行
  */

  const {
    posts,
    loading: postsLoading,
    isRefreshing,
    refetch,
    deletePost,
    isCached,
    cacheAge,
  } = usePosts(selectedPostType);

  // キャッシュがある場合はローディングを表示しない
  const effectiveLoading = postsLoading;

  // キャッシュ状態のデバッグ表示
  useEffect(() => {
    console.log('📱 HomeView: Cache status', {
      selectedPostType,
      isCached,
      cacheAge: cacheAge > 0 ? `${cacheAge}s` : 'N/A',
      postsCount: posts.length,
      effectiveLoading,
      postsLoading,
    });

    if (isCached) {
      console.log('📱 HomeView: Using cached posts data', {
        age: cacheAge + 's',
        type: selectedPostType,
      });
    }
  }, [selectedPostType, isCached, cacheAge, posts.length, effectiveLoading, postsLoading]);

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
    updateSelectedPostType(type);
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
          updateSelectedPostType(tabId as 'post' | 'consultation' | 'transfer')
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

          {effectiveLoading ? (
            <div className="text-center py-8">
              <div className="space-y-4">
                <div className="w-8 h-8 border-2 border-coral-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                <p className="text-gray-500">
                  {navigator.onLine ? '読み込み中...' : 'オフライン - 接続を確認中...'}
                </p>
                <p className="text-xs text-gray-400">
                  {isCached ? `キャッシュ: ${cacheAge}秒前` : '初回読み込み'}
                </p>
                {!navigator.onLine && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mx-4">
                    <p className="text-amber-700 text-sm">
                      📵 インターネット接続を確認してください
                    </p>
                  </div>
                )}
              </div>
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