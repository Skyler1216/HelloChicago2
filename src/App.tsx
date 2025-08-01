import React, { useState, useEffect } from 'react';
import { supabase, getProfile, signOut } from './lib/supabase';
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
  const [currentView, setCurrentView] = useState<'home' | 'map' | 'post' | 'profile'>('home');
  const [showAdminView, setShowAdminView] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const { user, profile, loading, hasAdminUsers, isAuthenticated, isApproved } = useAuth();

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  if (showSplash) {
    return <SplashScreen onComplete={() => setShowSplash(false)} />;
  }

  if (loading && !isAuthenticated) {
    return <LoadingScreen />;
  }

  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  if (!isApproved) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-coral-50 to-teal-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-3xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-gradient-to-r from-coral-500 to-coral-400 rounded-full mx-auto mb-6 flex items-center justify-center">
            <span className="text-white font-bold text-lg">⏳</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">承認待ちです</h2>
          <p className="text-gray-600 mb-6">
            アカウントの承認をお待ちください。<br />
            運営チームが確認後、ご利用いただけるようになります。
          </p>
          <p className="text-sm text-gray-500">
            通常、1-2営業日以内に承認いたします。
          </p>
          
          {/* Logout Button */}
          <button
            onClick={async () => {
              try {
                console.log('Logout button clicked');
                await signOut();
                // Force reload after signout
                setTimeout(() => {
                  window.location.reload();
                }, 100);
              } catch (error) {
                console.error('Logout error:', error);
                // Force reload even if signout fails
                setTimeout(() => {
                  window.location.reload();
                }, 100);
              }
            }}
            className="mt-4 w-full bg-gray-100 text-gray-700 py-3 px-6 rounded-xl font-semibold hover:bg-gray-200 transition-all duration-200"
          >
            別のアカウントでログイン
          </button>
          
          {/* Self-approval button for first user only */}
          {hasAdminUsers === false && !loading && (
            <button
              onClick={async () => {
                try {
                  setIsApproving(true);
                 
                 const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();
                 if (userError || !currentUser) {
                   throw new Error('ユーザー情報を取得できませんでした');
                 }
                 
                 const { data: existingProfile, error: checkError } = await supabase
                   .from('profiles')
                   .select('*')
                   .eq('id', currentUser.id)
                   .maybeSingle();
                 
                 if (checkError) {
                   throw checkError;
                 }
                 
                 if (!existingProfile) {
                  const { error: createError } = await supabase
                    .from('profiles')
                    .insert({
                      id: currentUser.id,
                      email: currentUser.email || '',
                      name: currentUser.user_metadata?.name || currentUser.email?.split('@')[0] || 'User',
                      is_approved: true,
                      role: 'admin'
                    });
                  
                  if (createError) {
                    throw createError;
                  }
                } else {
                  const { error } = await supabase
                    .from('profiles')
                    .update({ 
                      is_approved: true,
                      role: 'admin'
                    })
                    .eq('id', currentUser.id);
                  
                  if (error) {
                    throw error;
                  }
                 }
                  
                 alert('承認が完了しました！ページをリロードします。');
                 
                 setTimeout(() => {
                   window.location.reload();
                 }, 1000);
                 
                } catch (error) {
                  console.error('Self-approval error:', error);
                 alert(`承認に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`);
                } finally {
                  setIsApproving(false);
                }
              }}
              disabled={isApproving}
             className="mt-6 w-full bg-gradient-to-r from-coral-500 to-coral-400 text-white py-3 px-6 rounded-xl font-semibold hover:from-coral-600 hover:to-coral-500 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isApproving ? '承認中...' : '管理者として承認する'}
            </button>
          )}
          
          {hasAdminUsers === false && (
            <p className="text-xs text-gray-400 mt-3">
            ※ システムに管理者がいない場合のみ表示されます
          </p>
          )}
        </div>
      </div>
    );
  }

  if (showAdminView) {
    return (
      <Layout
        currentView="profile"
        onViewChange={(view) => {
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

  const renderCurrentView = () => {
    switch (currentView) {
      case 'home':
        return <HomeView />;
      case 'map':
        return <MapView />;
      case 'post':
        return <PostFormView />;
      case 'profile':
        return <ProfileView user={user} profile={profile} onAdminClick={() => setShowAdminView(true)} />;
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