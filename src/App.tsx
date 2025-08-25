import { useState, useEffect, useRef } from 'react';
import { signOut } from './lib/supabase';
import SplashScreen from './components/SplashScreen';
import LoginScreen from './components/LoginScreen';
import LoadingScreen from './components/LoadingScreen';
import Layout from './components/Layout';
import HomeView from './components/HomeView';
import MapView from './components/MapView';
import ReviewFormView from './components/map/ReviewFormView';
import PostFormView from './components/PostFormView';
import InboxView from './components/inbox/InboxView';
import PostDetailView from './components/PostDetailView';
import ProfileView from './components/ProfileView';
import AdminApprovalView from './components/AdminApprovalView';
import AdminDashboard from './components/admin/AdminDashboard';
import ErrorBoundary from './components/ErrorBoundary';
import { useAuth } from './hooks/useAuth';
import { useToast } from './hooks/useToast';
import { useAppLifecycle } from './hooks/useAppLifecycle';
import { useAppState } from './hooks/useAppState';
import { useAppStateManager } from './hooks/useAppStateManager';
import { useInbox } from './hooks/useInbox';
import { useCacheManager } from './hooks/useCacheManager';
import { validateConfig } from './lib/config';
import AppStateDebug from './components/debug/AppStateDebug';

// Prevent page bounce on mobile while preserving scroll
function preventPageBounce() {
  let startY = 0;

  // Prevent pull-to-refresh only at the top of the page
  document.addEventListener(
    'touchstart',
    e => {
      startY = e.touches[0].clientY;
    },
    { passive: true }
  );

  document.addEventListener(
    'touchmove',
    e => {
      const currentY = e.touches[0].clientY;
      const isScrollingDown = currentY > startY;
      const isAtTop = window.scrollY === 0;

      // Only prevent if at top and trying to pull down (refresh)
      if (isAtTop && isScrollingDown) {
        e.preventDefault();
      }
    },
    { passive: false }
  );
}

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [currentView, setCurrentView] = useState<'home' | 'map' | 'inbox' | 'profile'>('home');
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [selectedInboxTab, setSelectedInboxTab] = useState<'notification' | 'message'>('notification');
  const [showAdminView, setShowAdminView] = useState(false);
  const [showAdminDashboard, setShowAdminDashboard] = useState(false);
  const [showPostForm, setShowPostForm] = useState(false);
  const [showReviewFormView, setShowReviewFormView] = useState(false);
  const [reviewFormInitialLocation, setReviewFormInitialLocation] = useState<{ lat: number; lng: number; address?: string; } | null>(null);
  const [selectedPostType, setSelectedPostType] = useState<'post' | 'consultation' | 'transfer'>('post');

  const { user, profile, loading: authLoading, isAuthenticated, isApproved, initialized: authInitialized } = useAuth();
  const { ToastContainer } = useToast();

  const { isInitialized, backgroundRefreshing, forceInitialization } = useAppState();
  const { currentAnomaly } = useAppStateManager();
  const { handleAppRestart } = useCacheManager();
  const { unreadCount } = useInbox(isAuthenticated ? user?.id || '' : '');

  const { isOnline } = useAppLifecycle({
    onAppVisible: (backgroundTime) => {
      console.log('📱 App became visible, background time:', Math.round(backgroundTime / 1000), 's');
      // アプリ再起動の検出と処理
      const lastVisibleTime = sessionStorage.getItem('last_visible_time');
      const currentTime = Date.now();
      const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const restartThreshold = isMobileDevice ? 8 * 60 * 60 * 1000 : 4 * 60 * 60 * 1000;

      if (lastVisibleTime) {
        const timeDiff = currentTime - parseInt(lastVisibleTime);
        if (timeDiff > restartThreshold) {
          console.log(`📱 App: Long hidden duration detected (${Math.round(timeDiff / 60000)}min), treating as app restart`);
          sessionStorage.setItem('last_visible_time', currentTime.toString());
          handleAppRestart();
        }
      }
      sessionStorage.setItem('last_visible_time', currentTime.toString());
    },
    onAppHidden: () => {
      sessionStorage.setItem('last_hidden_time', Date.now().toString());
    },
    onAppOnline: () => console.log('📱 App came online'),
    onAppOffline: () => console.log('📱 App went offline'),
    refreshThreshold: 60 * 60 * 1000,
  });

  // Validate configuration on app start
  useEffect(() => {
    if (!validateConfig()) {
      console.error('❌ App configuration is invalid');
    }
  }, []);

  // Prevent page bounce on mobile
  useEffect(() => {
    preventPageBounce();
  }, []);

  // Splash screen timer
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  // Show splash screen
  if (showSplash) {
    return <SplashScreen onComplete={() => setShowSplash(false)} />;
  }

  // Show loading screen only if auth is not initialized or still loading
  if (!authInitialized || authLoading) {
    console.log('📱 App: Showing loading screen (Auth state)', { authInitialized, authLoading, isAuthenticated, isApproved, timestamp: new Date().toISOString() });
    return (
      <LoadingScreen
        maxLoadingTime={5000} // 5秒で復旧オプションを表示
      />
    );
  }

  // Show login screen if not authenticated after auth initialization
  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  // Show approval waiting screen if profile exists but not approved
  if (profile && !isApproved) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-coral-50 to-teal-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-3xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-coral-500 to-coral-400 rounded-full mx-auto mb-6 flex items-center justify-center">
            <span className="text-white font-bold text-lg">⏳</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            アカウント承認待ちです
          </h2>
          <p className="text-gray-600 mb-6">
            新規登録ありがとうございます！
            <br />
            セキュリティのため、管理者による承認が必要です。
          </p>
          <p className="text-sm text-gray-500 mb-6">
            承認後、すぐにご利用いただけます。
            <br />
            通常、24時間以内に承認いたします。
          </p>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-blue-800">
              💡 承認が完了すると、以下の機能がご利用いただけます：
            </p>
            <ul className="text-xs text-blue-700 mt-2 space-y-1 text-left">
              <li>• 体験談やおすすめの投稿</li>
              <li>• 地図での情報検索</li>
              <li>• 他のユーザーとの交流</li>
            </ul>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => window.location.reload()}
              className="w-full bg-coral-500 text-white py-3 px-6 rounded-xl font-semibold hover:bg-coral-600 transition-all duration-200"
            >
              🔄 承認状態を確認
            </button>

            <button
              onClick={async () => {
                try {
                  await signOut();
                  window.location.reload();
                } catch (error) {
                  console.error('Logout error:', error);
                  window.location.reload();
                }
              }}
              className="w-full bg-gray-100 text-gray-700 py-3 px-6 rounded-xl font-semibold hover:bg-gray-200 transition-all duration-200"
            >
              別のアカウントでログイン
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show admin dashboard
  if (showAdminDashboard) {
    return (
      <Layout
        currentView="profile"
        onViewChange={(view: 'home' | 'map' | 'inbox' | 'profile') => {
          setShowAdminDashboard(false);
          setCurrentView(view);
        }}
        unreadCount={unreadCount}
      >
        <div className="px-4 py-6">
          <button
            onClick={() => setShowAdminDashboard(false)}
            className="mb-4 text-coral-600 hover:text-coral-700 transition-colors"
          >
            ← プロフィールに戻る
          </button>
          <AdminDashboard />
        </div>
      </Layout>
    );
  }

  // Show admin view
  if (showAdminView) {
    return (
      <Layout
        currentView="profile"
        onViewChange={(view: 'home' | 'map' | 'inbox' | 'profile') => {
          setShowAdminView(false);
          setCurrentView(view);
        }}
        unreadCount={unreadCount}
      >
        <div className="px-4 py-6">
          <button
            onClick={() => setShowAdminView(false)}
            className="mb-4 text-coral-600 hover:text-coral-700 transition-colors"
          >
            ← プロフィールに戻る
          </button>
          <AdminApprovalView />
        </div>
      </Layout>
    );
  }

  // Show post form
  if (showPostForm) {
    return (
      <Layout
        currentView="home"
        onViewChange={(view: 'home' | 'map' | 'inbox' | 'profile') => {
          setShowPostForm(false);
          setCurrentView(view);
        }}
        unreadCount={unreadCount}
      >
        <PostFormView
          initialType={selectedPostType}
          onBack={() => setShowPostForm(false)}
        />
      </Layout>
    );
  }

  // Show review form view (from POI click)
  if (showReviewFormView) {
    return (
      <Layout
        currentView="map"
        onViewChange={(view: 'home' | 'map' | 'inbox' | 'profile') => {
          setShowReviewFormView(false);
          setCurrentView(view);
        }}
        unreadCount={unreadCount}
      >
        <ReviewFormView
          initialLocation={reviewFormInitialLocation}
          onBack={() => setShowReviewFormView(false)}
        />
      </Layout>
    );
  }

  // Render main app
  const renderCurrentView = () => {
    switch (currentView) {
      case 'home':
        return (
          <HomeView
            onShowPostForm={type => {
              setSelectedPostType(type);
              setShowPostForm(true);
            }}
          />
        );
      case 'map':
        return (
          <MapView
            onRequestCreateSpotAt={loc => {
              setReviewFormInitialLocation(loc);
              setShowReviewFormView(true);
            }}
          />
        );
      case 'inbox':
        return selectedPostId ? (
          <PostDetailView
            postId={selectedPostId}
            onBack={() => setSelectedPostId(null)}
          />
        ) : (
          <InboxView
            onNavigateToPost={postId => setSelectedPostId(postId)}
            onTabChange={setSelectedInboxTab}
            currentTab={selectedInboxTab}
          />
        );
      case 'profile':
        return (
          <ProfileView
            user={user}
            profile={profile}
            onAdminClick={() => setShowAdminView(true)}
            onAdminDashboardClick={() => setShowAdminDashboard(true)}
          />
        );
      default:
        return (
          <HomeView
            onShowPostForm={type => {
              setSelectedPostType(type);
              setShowPostForm(true);
            }}
          />
        );
    }
  };

  return (
    <ErrorBoundary>
      {/* オフライン状態のバナー */}
      {!isOnline && (
        <div className="fixed top-0 left-0 right-0 z-50 bg-amber-500 text-white text-center py-2 text-sm font-medium">
          📵 オフライン - 一部機能が制限されます
        </div>
      )}

      {/* バックグラウンド更新インジケーター */}
      {backgroundRefreshing && (
        <div className="fixed top-0 left-0 right-0 z-40 bg-blue-500 text-white text-center py-1 text-xs font-medium">
          🔄 データを更新中...
        </div>
      )}

      <Layout
        currentView={currentView}
        onViewChange={(view: 'home' | 'map' | 'inbox' | 'profile') =>
          setCurrentView(view)
        }
        className={`${!isOnline ? 'pt-10' : ''} ${backgroundRefreshing ? 'pt-6' : ''} ${currentAnomaly ? 'pt-8' : ''}`}
        unreadCount={unreadCount}
      >
        {renderCurrentView()}
      </Layout>
      <ToastContainer />
      {/* Debug component - only in development */}
      {process.env.NODE_ENV === 'development' && <AppStateDebug />}
    </ErrorBoundary>
  );
}