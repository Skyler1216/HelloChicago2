import React from 'react';
import { Bell, MessageSquare, Inbox } from 'lucide-react';

interface EmptyStateProps {
  currentFilter: 'all' | 'notification' | 'message';
}

export default function EmptyState({ currentFilter }: EmptyStateProps) {
  const getEmptyStateContent = () => {
    switch (currentFilter) {
      case 'notification':
        return {
          icon: Bell,
          title: '通知はありません',
          description: 'システムからのお知らせがここに表示されます',
          iconColor: 'text-gray-400',
          bgColor: 'bg-gray-100',
        };
      case 'message':
        return {
          icon: MessageSquare,
          title: 'メッセージはありません',
          description:
            '投稿・相談・譲渡でやりとりをはじめると、メッセージが表示されます',
          iconColor: 'text-blue-400',
          bgColor: 'bg-blue-100',
        };
      default:
        return {
          icon: Inbox,
          title: '受信トレイは空です',
          description: '通知やメッセージが届くと、ここに表示されます',
          iconColor: 'text-gray-400',
          bgColor: 'bg-gray-100',
        };
    }
  };

  const content = getEmptyStateContent();
  const IconComponent = content.icon;

  return (
    <div className="flex-1 flex items-center justify-center p-8">
      <div className="text-center max-w-sm">
        {/* Icon */}
        <div
          className={`w-20 h-20 ${content.bgColor} rounded-full flex items-center justify-center mx-auto mb-6`}
        >
          <IconComponent className={`w-10 h-10 ${content.iconColor}`} />
        </div>

        {/* Title */}
        <h3 className="text-lg font-semibold text-gray-900 mb-3">
          {content.title}
        </h3>

        {/* Description */}
        <p className="text-gray-600 leading-relaxed">{content.description}</p>

        {/* Additional info based on filter */}
        {currentFilter === 'all' && (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="text-sm font-medium text-gray-700 mb-2">
              受信トレイについて
            </h4>
            <div className="text-xs text-gray-600 space-y-1">
              <div className="flex items-center space-x-2">
                <Bell className="w-3 h-3 text-coral-500" />
                <span>通知：システムからのお知らせ</span>
              </div>
              <div className="flex items-center space-x-2">
                <MessageSquare className="w-3 h-3 text-blue-500" />
                <span>メッセージ：投稿へのコメント</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
