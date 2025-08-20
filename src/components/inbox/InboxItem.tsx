import React from 'react';
import { Bell, MessageSquare, ExternalLink, Clock, Check } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ja } from 'date-fns/locale';

interface InboxItemProps {
  item: {
    id: string;
    type: 'notification' | 'message';
    title: string;
    message: string;
    timestamp: string;
    isRead: boolean;
    priority?: 'low' | 'normal' | 'high' | 'urgent';
    actionUrl?: string;
    actionText?: string;
    // For messages
    postId?: string;
    postTitle?: string;
    postType?: string;
    authorName?: string;
    authorAvatar?: string;
    commentContent?: string;
    hasReplies?: boolean;
  };
  onAction?: () => void;
  onMarkAsRead?: () => void;
}

export default function InboxItem({
  item,
  onAction,
  onMarkAsRead,
}: InboxItemProps) {
  const formatTime = (timestamp: string) => {
    try {
      return formatDistanceToNow(new Date(timestamp), {
        addSuffix: true,
        locale: ja,
      });
    } catch {
      return '不明';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'low':
        return 'text-gray-500';
      case 'high':
        return 'text-orange-600';
      case 'urgent':
        return 'text-red-600';
      default:
        return 'text-gray-700';
    }
  };

  const getPrioritySize = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return 'text-lg font-semibold';
      case 'high':
        return 'text-base font-medium';
      default:
        return 'text-sm';
    }
  };

  const getIcon = () => {
    if (item.type === 'notification') {
      return (
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center ${
            item.isRead ? 'bg-gray-100' : 'bg-coral-100'
          }`}
        >
          <Bell
            className={`w-5 h-5 ${
              item.isRead ? 'text-gray-500' : 'text-coral-600'
            }`}
          />
        </div>
      );
    } else {
      return (
        <div className="w-10 h-10 rounded-full flex items-center justify-center bg-blue-100">
          <MessageSquare className="w-5 h-5 text-blue-600" />
        </div>
      );
    }
  };

  const getPostTypeIcon = (postType?: string) => {
    switch (postType) {
      case 'consultation':
        return '💬';
      case 'transfer':
        return '🔄';
      default:
        return '📝';
    }
  };

  return (
    <div
      className={`bg-white rounded-lg border p-4 transition-all duration-200 hover:shadow-md ${
        item.isRead ? 'border-gray-200' : 'border-coral-200 bg-coral-50'
      }`}
    >
      <div className="flex items-start space-x-3">
        {/* Icon */}
        {getIcon()}

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1 min-w-0">
              <h3
                className={`font-medium text-gray-900 mb-1 ${
                  item.isRead ? 'text-gray-700' : 'text-gray-900'
                } ${getPrioritySize(item.priority || 'normal')}`}
              >
                {item.title}
              </h3>

              {/* Message content */}
              <p
                className={`text-sm mb-2 ${
                  item.isRead ? 'text-gray-600' : 'text-gray-700'
                }`}
              >
                {item.message}
              </p>

              {/* Post info for messages */}
              {item.type === 'message' && item.postTitle && (
                <div className="flex items-center space-x-2 text-xs text-gray-500 mb-2">
                  <span>{getPostTypeIcon(item.postType)}</span>
                  <span className="truncate">{item.postTitle}</span>
                </div>
              )}

              {/* Author info for messages */}
              {item.type === 'message' && item.authorName && (
                <div className="flex items-center space-x-2 text-xs text-gray-500 mb-2">
                  {item.authorAvatar && (
                    <img
                      src={item.authorAvatar}
                      alt={item.authorName}
                      className="w-4 h-4 rounded-full"
                    />
                  )}
                  <span>{item.authorName}</span>
                </div>
              )}
            </div>

            {/* Timestamp */}
            <div className="flex items-center space-x-1 text-xs text-gray-400 ml-2">
              <Clock className="w-3 h-3" />
              <span>{formatTime(item.timestamp)}</span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {/* Mark as read button for notifications */}
              {item.type === 'notification' && !item.isRead && onMarkAsRead && (
                <button
                  onClick={onMarkAsRead}
                  className="flex items-center space-x-1 text-xs text-coral-600 hover:text-coral-700 hover:bg-coral-100 px-2 py-1 rounded transition-colors"
                >
                  <Check className="w-3 h-3" />
                  <span>既読</span>
                </button>
              )}

              {/* Priority indicator */}
              {item.priority && item.priority !== 'normal' && (
                <span
                  className={`text-xs px-2 py-1 rounded-full ${
                    item.priority === 'urgent'
                      ? 'bg-red-100 text-red-700'
                      : item.priority === 'high'
                        ? 'bg-orange-100 text-orange-700'
                        : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {item.priority === 'urgent'
                    ? '緊急'
                    : item.priority === 'high'
                      ? '重要'
                      : '低'}
                </span>
              )}
            </div>

            {/* Action button */}
            {item.actionUrl && item.actionText && (
              <button
                onClick={onAction}
                className="flex items-center space-x-1 text-xs text-coral-600 hover:text-coral-700 hover:bg-coral-100 px-2 py-1 rounded transition-colors"
              >
                <span>{item.actionText}</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            )}

            {/* Navigate to post for messages */}
            {item.type === 'message' && item.postId && onAction && (
              <button
                onClick={onAction}
                className="flex items-center space-x-1 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-100 px-2 py-1 rounded transition-colors"
              >
                <span>投稿を見る</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
