import { useState, useEffect } from 'react';
import { signOut } from './lib/supabase';
import SplashScreen from './components/SplashScreen';
import LoginScreen from './components/LoginScreen';
import LoadingScreen from './components/LoadingScreen';
import Layout from './components/Layout';
import HomeView from './components/HomeView';
import MapView from './components/MapView';
import PostFormView from './components/PostFormView';
import ProfileView from './components/ProfileView';
import AdminApprovalView from './components/AdminApprovalView';
import AdminDashboard from './components/admin/AdminDashboard';
import ErrorBoundary from './components/ErrorBoundary';
import { useAuth } from './hooks/useAuth';
import { useToast } from './hooks/useToast';
import { validateConfig } from './lib/config';

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [currentView, setCurrentView] = useState<
    'home' | 'map' | 'post' | 'profile'
  >('home');
  const [showAdminView, setShowAdminView] = useState(false);
  const [showAdminDashboard, setShowAdminDashboard] = useState(false);
  const { user, profile, loading, isAuthenticated, isApproved } = useAuth();
  const { ToastContainer } = useToast();

  // Validate configuration on app start
  useEffect(() => {
    if (!validateConfig()) {
      console.error('❌ App configuration is invalid');
    }
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

  // Show loading screen
  if (loading) {
    return <LoadingScreen />;
  }

  // Show login screen if not authenticated
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
        onViewChange={view => {
          setShowAdminDashboard(false);
          setCurrentView(view);
        }}
        user={user}
        profile={profile}
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
        onViewChange={view => {
          setShowAdminView(false);
          setCurrentView(view);
        }}
        user={user}
        profile={profile}
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

  // Render main app
  const renderCurrentView = () => {
    switch (currentView) {
      case 'home':
        return <HomeView />;
      case 'map':
        return <MapView />;
      case 'post':
        return <PostFormView />;
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
        return <HomeView />;
    }
  };

  return (
    <ErrorBoundary>
      <Layout
        currentView={currentView}
        onViewChange={setCurrentView}
        user={user}
        profile={profile}
      >
        {renderCurrentView()}
      </Layout>
      <ToastContainer />
    </ErrorBoundary>
  );
}
