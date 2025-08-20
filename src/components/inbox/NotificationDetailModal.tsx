import { X, Clock, User } from 'lucide-react';

interface NotificationDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  notification: {
    title: string;
    message: string;
    timestamp: string;
    type: string;
  } | null;
}

export default function NotificationDetailModal({
  isOpen,
  onClose,
  notification,
}: NotificationDetailModalProps) {
  if (!isOpen || !notification) return null;

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'app_update':
        return 'アプリアップデート';
      case 'system_maintenance':
        return 'システムメンテナンス';
      case 'feature_release':
        return '新機能リリース';
      case 'community_event':
        return 'コミュニティイベント';
      case 'system':
        return 'システム通知';
      default:
        return type;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'app_update':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'system_maintenance':
        return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'feature_release':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'community_event':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'system':
        return 'bg-gray-100 text-gray-700 border-gray-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* オーバーレイ */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* モーダル */}
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* ヘッダー */}
        <div className="bg-gradient-to-r from-purple-500 to-pink-500 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                <span className="text-white text-lg">⚡</span>
              </div>
              <div>
                <h2 className="text-white font-bold text-lg">
                  管理者からのお知らせ
                </h2>
                <p className="text-white text-opacity-90 text-sm">
                  {getTypeLabel(notification.type)}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-white text-opacity-80 hover:text-opacity-100 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* コンテンツ */}
        <div className="p-6 space-y-6">
          {/* タイトル */}
          <div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              {notification.title}
            </h3>
            <span
              className={`inline-block px-3 py-1 text-xs font-medium rounded-full border ${getTypeColor(
                notification.type
              )}`}
            >
              {getTypeLabel(notification.type)}
            </span>
          </div>

          {/* メッセージ */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">
              メッセージ内容
            </h4>
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">
                {notification.message}
              </p>
            </div>
          </div>

          {/* メタ情報 */}
          <div className="flex items-center justify-between text-sm text-gray-500 border-t pt-4">
            <div className="flex items-center space-x-4">
              <span className="flex items-center space-x-2">
                <Clock className="w-4 h-4" />
                <span>
                  {new Date(notification.timestamp).toLocaleString('ja-JP')}
                </span>
              </span>
              <span className="flex items-center space-x-2">
                <User className="w-4 h-4" />
                <span>システム管理者</span>
              </span>
            </div>
          </div>
        </div>

        {/* フッター */}
        <div className="bg-gray-50 px-6 py-4 border-t">
          <button
            onClick={onClose}
            className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white py-3 px-6 rounded-xl font-semibold hover:from-purple-600 hover:to-pink-600 transition-all duration-200 shadow-sm"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}
