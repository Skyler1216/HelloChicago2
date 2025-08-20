import { Bell, MessageSquare, Clock, Check } from 'lucide-react';

type InboxItemData = {
  id: string;
  type: 'notification' | 'message';
  title: string;
  message: string;
  timestamp: string;
  isRead: boolean;
  actionUrl?: string;
  postId?: string;
  metadata?: Record<string, unknown>;
};

interface InboxItemProps {
  item: InboxItemData;
  onAction: (item: InboxItemData) => void;
  onMarkAsRead: () => void;
}

export default function InboxItem({
  item,
  onAction,
  onMarkAsRead,
}: InboxItemProps) {
  // 管理者通知かどうかを判定
  const isAdminNotification = () => {
    return item.metadata?.system_notification_id !== undefined;
  };

  const getIcon = () => {
    // 管理者通知の場合は特別なアイコン
    if (isAdminNotification()) {
      return (
        <div className="w-5 h-5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center">
          <span className="text-white text-xs font-bold">管</span>
        </div>
      );
    }

    switch (item.type) {
      case 'notification':
        return (
          <Bell
            className={`w-5 h-5 ${
              item.isRead ? 'text-gray-400' : 'text-blue-500'
            }`}
          />
        );
      case 'message':
        return (
          <MessageSquare
            className={`w-5 h-5 ${
              item.isRead ? 'text-gray-400' : 'text-green-500'
            }`}
          />
        );
      default:
        return (
          <Bell
            className={`w-5 h-5 ${
              item.isRead ? 'text-gray-400' : 'text-gray-500'
            }`}
          />
        );
    }
  };

  return (
    <div
      className={`p-4 border-l-4 transition-all duration-200 hover:shadow-md cursor-pointer ${
        isAdminNotification()
          ? item.isRead
            ? 'border-purple-300 bg-purple-50 opacity-90'
            : 'border-purple-500 bg-purple-50'
          : item.isRead
            ? 'border-gray-200 bg-gray-50 opacity-90'
            : 'border-coral-500 bg-coral-50'
      }`}
      onClick={() => onAction(item)}
    >
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0 mt-1">{getIcon()}</div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center space-x-2">
              <h3
                className={`text-sm font-medium ${
                  item.isRead ? 'text-gray-600' : 'text-gray-900'
                }`}
              >
                {item.title}
              </h3>
              {isAdminNotification() && (
                <span className="px-2 py-1 text-xs bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full font-medium">
                  管理者からのお知らせ
                </span>
              )}
              {item.isRead && (
                <span className="px-2 py-1 text-xs bg-gray-100 text-gray-500 rounded-full">
                  既読済
                </span>
              )}
            </div>
            <div className="flex items-center space-x-2">
              {!item.isRead && (
                <button
                  onClick={e => {
                    e.stopPropagation();
                    onMarkAsRead();
                  }}
                  className="p-1 text-coral-600 hover:text-coral-700 hover:bg-coral-100 rounded-full transition-colors"
                >
                  <Check className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          <p
            className={`text-sm mb-2 ${
              item.isRead ? 'text-gray-500' : 'text-gray-700'
            }`}
          >
            {item.message}
          </p>

          <div className="flex items-center space-x-4 text-xs text-gray-400">
            <span className="flex items-center space-x-1">
              <Clock className="w-3 h-3" />
              <span>{new Date(item.timestamp).toLocaleString('ja-JP')}</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
