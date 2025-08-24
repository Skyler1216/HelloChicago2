import React from 'react';
import { MapPin, User, Home, Inbox } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  currentView: 'home' | 'map' | 'inbox' | 'profile';
  onViewChange: (view: 'home' | 'map' | 'inbox' | 'profile') => void;
  className?: string;
  unreadCount?: number;
}

export default function Layout({
  children,
  currentView,
  onViewChange,
  className = '',
  unreadCount = 0,
}: LayoutProps) {
  const navItems = [
    { id: 'home' as const, icon: Home, label: 'ホーム' },
    { id: 'map' as const, icon: MapPin, label: 'マップ' },
    { id: 'inbox' as const, icon: Inbox, label: '受信トレイ' },
    { id: 'profile' as const, icon: User, label: 'プロフィール' },
  ];

  return (
    <div className={`min-h-screen bg-gray-50 flex flex-col ${className}`}>
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-md mx-auto px-4 py-4">
          <div className="flex items-center">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-coral-500 to-coral-400 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">HC</span>
              </div>
              <h1 className="text-xl font-bold text-gray-900">HelloChicago</h1>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-md mx-auto w-full pb-20">{children}</main>

      {/* Bottom Navigation */}
      <nav className="bg-white border-t border-gray-200 fixed bottom-4 z-40 w-full">
        {/* 隙間を埋める背景 */}
        <div className="absolute -bottom-5 left-0 right-0 h-6 bg-white"></div>
        <div className="w-full px-3 sm:px-4">
          <div className="flex justify-between py-2 sm:py-3 gap-1">
            {navItems.map(item => {
              const IconComponent = item.icon;
              const isActive = currentView === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => onViewChange(item.id)}
                  className={`relative flex-1 flex flex-col items-center space-y-1 sm:space-y-1.5 px-1.5 sm:px-2 py-2 sm:py-2.5 rounded-lg transition-all duration-200 min-w-0 ${
                    isActive
                      ? 'text-coral-600 bg-coral-50 scale-105'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <div className="relative">
                    <IconComponent
                      className={`w-5 h-5 sm:w-6 sm:h-6 flex-shrink-0 ${isActive ? 'text-coral-600' : ''}`}
                    />
                    {/* 未読バッジ（受信トレイのみ） */}
                    {item.id === 'inbox' && unreadCount > 0 && (
                      <span className="absolute -top-2 -right-2 bg-coral-500 text-white text-[10px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                  </div>
                  <span
                    className={`text-[11px] sm:text-xs font-medium leading-tight text-center truncate w-full ${isActive ? 'text-coral-600' : ''}`}
                  >
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </nav>
    </div>
  );
}
