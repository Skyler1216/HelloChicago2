import React, { useState, useEffect } from 'react';
import { supabase, getProfile } from './lib/supabase';
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

  // Debug logging
  useEffect(() => {
    console.log('App state:', {
      showSplash,
      loading,
      isAuthenticated,
      isApproved,
      hasAdminUsers,
      user: user?.id,
      profile: profile?.id
    });
  }, [showSplash, loading, isAuthenticated, isApproved, hasAdminUsers, user, profile]);

  if (showSplash) {
    return <SplashScreen onComplete={() => setShowSplash(false)} />;
  }

  // Show loading screen only if we're still initializing auth
  if (loading && !showSplash) {
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
                await supabase.auth.signOut();
                localStorage.clear();
                sessionStorage.clear();
                window.location.reload();
              } catch (error) {
                console.error('Logout error:', error);
                // Force reload even if logout fails
                localStorage.clear();
                sessionStorage.clear();
                window.location.reload();
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
               
               // Get current user
               const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();
               if (userError || !currentUser) {
                 throw new Error('ユーザー情報を取得できませんでした');
               }
               
               console.log('Current user ID:', currentUser.id);
               
               // Check if profile exists
               const { data: existingProfile, error: checkError } = await supabase
                 .from('profiles')
                 .select('*')
                 .eq('id', currentUser.id)
                 .maybeSingle();
               
               if (checkError) {
                 console.error('Profile check error:', checkError);
                 throw checkError;
               }
               
               if (!existingProfile) {
                console.log('No profile found, creating new profile for user:', currentUser.id);
                
                // Create new profile
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
                  console.error('Profile creation error:', createError);
                  throw createError;
                }
                
                console.log('Profile created and approved successfully');
              } else {
                console.log('Existing profile:', existingProfile);
                
                // Update existing profile
                const { error } = await supabase
                  .from('profiles')
                  .update({ 
                    is_approved: true,
                    role: 'admin'
                  })
                  .eq('id', currentUser.id);
                
                if (error) {
                  console.error('Update error:', error);
                  throw error;
                }
                
                console.log('Profile updated successfully');
               }
               
               // Verify the update
               const { data: updatedProfile, error: verifyError } = await supabase
                 .from('profiles')
                 .select('*')
                 .eq('id', currentUser.id)
                 .maybeSingle();
               
               if (verifyError) {
                 console.error('Verification error:', verifyError);
               } else {
                 console.log('Updated profile:', updatedProfile);
               }
                
               alert('承認が完了しました！ページをリロードします。');
               
               // Wait a moment then reload
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

  // If admin view is requested, show it regardless of current view
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