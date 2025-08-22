import React from 'react';
import { MapPin, User, Home, Inbox } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  currentView: 'home' | 'map' | 'inbox' | 'profile';
  onViewChange: (view: 'home' | 'map' | 'inbox' | 'profile') => void;
}

export default function Layout({
  children,
  currentView,
  onViewChange,
}: LayoutProps) {
  const navItems = [
    { id: 'home' as const, icon: Home, label: 'ホーム' },
    { id: 'map' as const, icon: MapPin, label: 'マップ' },
    { id: 'inbox' as const, icon: Inbox, label: '受信トレイ' },
    { id: 'profile' as const, icon: User, label: 'プロフィール' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
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
      <main className="flex-1 max-w-md mx-auto w-full">{children}</main>

      {/* Bottom Navigation */}
      <nav className="bg-white border-t border-gray-200 sticky bottom-0 z-40 w-full">
        <div className="w-full px-2 sm:px-4">
          <div className="flex justify-between py-1 sm:py-2 gap-1">
            {navItems.map(item => {
              const IconComponent = item.icon;
              const isActive = currentView === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => onViewChange(item.id)}
                  className={`flex-1 flex flex-col items-center space-y-0.5 sm:space-y-1 px-0.5 sm:px-3 py-1.5 sm:py-2 rounded-lg transition-all duration-200 min-w-0 ${
                    isActive
                      ? 'text-coral-600 bg-coral-50 scale-105'
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <IconComponent
                    className={`w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0 ${isActive ? 'text-coral-600' : ''}`}
                  />
                  <span
                    className={`text-[10px] sm:text-xs font-medium leading-tight text-center truncate w-full ${isActive ? 'text-coral-600' : ''}`}
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
