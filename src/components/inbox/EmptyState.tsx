import React from 'react';
import { Bell, MessageSquare } from 'lucide-react';

interface EmptyStateProps {
  currentFilter: 'notification' | 'message';
}

export default function EmptyState({ currentFilter }: EmptyStateProps) {
  const getEmptyStateContent = () => {
    switch (currentFilter) {
      case 'notification':
        return {
          icon: Bell,
          title: '通知はありません',
          description: '新しい通知が届くとここに表示されます',
        };
      case 'message':
        return {
          icon: MessageSquare,
          title: 'メッセージはありません',
          description: 'コメントやメッセージが届くとここに表示されます',
        };
      default:
        return {
          icon: Bell,
          title: '通知はありません',
          description: '新しい通知が届くとここに表示されます',
        };
    }
  };

  const { icon: Icon, title, description } = getEmptyStateContent();

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-gray-400" />
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-500 text-center max-w-sm">{description}</p>
    </div>
  );
}
