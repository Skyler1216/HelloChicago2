import React from 'react';
import { Home, Map, Plus, User } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  currentView: string;
  onViewChange: (view: string) => void;
  onLogout: () => void;
}

export default function Layout({
  children,
  currentView,
  onViewChange,
  onLogout,
}: LayoutProps) {
  const menuItems = [
    { id: 'home', label: 'ホーム', icon: Home },
    { id: 'map', label: 'マップ', icon: Map },
    { id: 'post', label: '投稿', icon: Plus },
    { id: 'profile', label: 'プロフィール', icon: User },
  ];

  return (
    <div className='min-h-screen bg-gray-50'>
      {/* Header */}
      <header className='bg-white shadow-sm border-b border-gray-200'>
        <div className='max-w-md mx-auto px-4'>
          <div className='flex justify-between items-center py-4'>
            <h1 className='text-xl font-semibold text-gray-900'>
              HelloChicago
            </h1>
            <button
              onClick={onLogout}
              className='text-gray-500 hover:text-gray-700 transition-colors'
            >
              ログアウト
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className='flex-1'>{children}</main>

      {/* Bottom Navigation */}
      <nav className='bg-white border-t border-gray-200 fixed bottom-0 left-0 right-0 z-50'>
        <div className='max-w-md mx-auto px-4'>
          <div className='flex justify-around py-2'>
            {menuItems.map(item => {
              const IconComponent = item.icon;
              const isActive = currentView === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => onViewChange(item.id)}
                  className={`flex flex-col items-center py-2 px-3 rounded-lg transition-colors ${
                    isActive
                      ? 'text-teal-600 bg-teal-50'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <IconComponent className='w-5 h-5 mb-1' />
                  <span className='text-xs font-medium'>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>
    </div>
  );
}
