import React from 'react';
import { Database } from '../../types/database';
import { getNotificationStyle } from '../../hooks/useNotifications';
import { X, ExternalLink } from 'lucide-react';

type Notification = Database['public']['Tables']['notifications']['Row'] & {
  sender?: {
    id: string;
    name: string;
    avatar_url: string | null;
  } | null;
  related_post?: {
    id: string;
    title: string;
  } | null;
};

interface NotificationItemProps {
  notification: Notification;
  onMarkAsRead: (id: string) => void;
  onDelete: (id: string) => void;
  onNavigate?: (postId: string) => void;
}

export default function NotificationItem({
  notification,
  onMarkAsRead,
  onDelete,
  onNavigate,
}: NotificationItemProps) {
  const style = getNotificationStyle(notification.type);

  const handleClick = () => {
    if (!notification.is_read) {
      onMarkAsRead(notification.id);
    }

    if (notification.related_post_id && onNavigate) {
      onNavigate(notification.related_post_id);
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete(notification.id);
  };

  // シンプルな日時表示（date-fnsなし）
  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const notificationDate = new Date(dateString);
    const diffInSeconds = Math.floor(
      (now.getTime() - notificationDate.getTime()) / 1000
    );

    if (diffInSeconds < 60) return '今';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}分前`;
    if (diffInSeconds < 86400)
      return `${Math.floor(diffInSeconds / 3600)}時間前`;
    if (diffInSeconds < 604800)
      return `${Math.floor(diffInSeconds / 86400)}日前`;

    // 1週間以上前は日付表示
    return notificationDate.toLocaleDateString('ja-JP', {
      month: 'short',
      day: 'numeric',
    });
  };

  const timeAgo = formatTimeAgo(notification.created_at);

  return (
    <div
      className={`relative p-4 border-l-4 ${style.borderColor} ${
        notification.is_read ? 'bg-white' : style.bgColor
      } hover:shadow-md transition-all duration-200 cursor-pointer group`}
      onClick={handleClick}
    >
      {/* 未読インジケーター */}
      {!notification.is_read && (
        <div className="absolute top-2 right-2 w-2 h-2 bg-coral-500 rounded-full"></div>
      )}

      {/* 削除ボタン */}
      <button
        onClick={handleDelete}
        className="absolute top-2 right-6 opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-200 rounded"
        title="通知を削除"
      >
        <X className="w-4 h-4 text-gray-500" />
      </button>

      <div className="flex items-start space-x-3">
        {/* アバター */}
        <div className="flex-shrink-0">
          {notification.sender?.avatar_url ? (
            <img
              src={notification.sender.avatar_url}
              alt={notification.sender.name}
              className="w-10 h-10 rounded-full object-cover"
            />
          ) : (
            <div
              className={`w-10 h-10 ${style.bgColor} rounded-full flex items-center justify-center text-lg`}
            >
              {style.icon}
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          {/* タイトル */}
          <h4 className={`font-semibold ${style.color} mb-1`}>
            {notification.title}
          </h4>

          {/* メッセージ */}
          <p className="text-gray-700 text-sm leading-relaxed mb-2">
            {notification.message}
          </p>

          {/* 関連投稿リンク */}
          {notification.related_post && (
            <div className="flex items-center space-x-1 text-sm text-gray-500 mb-2">
              <ExternalLink className="w-3 h-3" />
              <span className="truncate">
                投稿: {notification.related_post.title}
              </span>
            </div>
          )}

          {/* フッター */}
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>{timeAgo}</span>
            {notification.is_read && (
              <span className="text-green-600">既読</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
