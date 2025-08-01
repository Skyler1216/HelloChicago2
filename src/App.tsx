import React, { useState, useEffect } from 'react';
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
import { useAuth } from './hooks/useAuth';

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [currentView, setCurrentView] = useState<
    'home' | 'map' | 'post' | 'profile'
  >('home');
  const [showAdminView, setShowAdminView] = useState(false);
  const { user, profile, loading, isAuthenticated, isApproved } = useAuth();

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
            承認待ちです
          </h2>
          <p className="text-gray-600 mb-6">
            アカウントの承認をお待ちください。
            <br />
            運営チームが確認後、ご利用いただけるようになります。
          </p>
          <p className="text-sm text-gray-500 mb-6">
            通常、1-2営業日以内に承認いたします。
          </p>

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
          />
        );
      default:
        return <HomeView />;
    }
  };

  return (
    <Layout
      currentView={currentView}
      onViewChange={setCurrentView}
      user={user}
      profile={profile}
    >
      {renderCurrentView()}
    </Layout>
  );
}
