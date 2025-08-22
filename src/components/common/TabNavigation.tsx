import React from 'react';
import { LucideIcon } from 'lucide-react';

export interface TabItem {
  id: string;
  label: string;
  icon: LucideIcon;
}

interface TabNavigationProps {
  tabs: TabItem[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
  variant?: 'default' | 'compact';
  className?: string;
}

export default function TabNavigation({
  tabs,
  activeTab,
  onTabChange,
  variant = 'default',
  className = '',
}: TabNavigationProps) {
  const isCompact = variant === 'compact';

  return (
    <div className={`bg-white border-b border-gray-100 ${className}`}>
      <div className="max-w-md mx-auto px-4">
        <div className="flex space-x-1">
          {tabs.map(tab => {
            const IconComponent = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex-1 flex items-center justify-center space-x-2 px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                  isActive
                    ? 'text-coral-600 bg-coral-50 border-b-2 border-coral-500'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                } ${isCompact ? 'py-2 text-xs' : ''}`}
              >
                <IconComponent
                  className={`${isCompact ? 'w-3 h-3' : 'w-4 h-4'}`}
                />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
