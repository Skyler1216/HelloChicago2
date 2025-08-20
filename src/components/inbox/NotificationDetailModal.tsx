import { X, Clock, User } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

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
  const modalRef = useRef<HTMLDivElement>(null);

  // モーダル表示時に背景のスクロールを無効化
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      document.body.classList.add('modal-open');
      // モーダルにフォーカスを設定
      modalRef.current?.focus();
    } else {
      document.body.style.overflow = 'unset';
      document.body.classList.remove('modal-open');
    }

    // クリーンアップ
    return () => {
      document.body.style.overflow = 'unset';
      document.body.classList.remove('modal-open');
    };
  }, [isOpen]);

  // キーボードイベントの処理
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

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

  const modalContent = (
    <>
      {/* オーバーレイ - 画面全体を覆う */}
      <div
        className="fixed inset-0 bg-black bg-opacity-60 z-modal-overlay"
        onClick={onClose}
      />

      {/* モーダルコンテナ - 画面全体を覆い、安全なマージンを確保 */}
      <div className="fixed inset-0 z-modal-content flex items-center justify-center p-3 sm:p-4">
        {/* モーダル本体 - 画面に収まる適切なサイズ */}
        <div
          ref={modalRef}
          className="bg-white rounded-2xl shadow-2xl w-full max-w-lg sm:max-w-2xl h-[calc(100vh-6rem)] flex flex-col focus:outline-none modal-content"
          tabIndex={-1}
        >
          {/* ヘッダー - 固定サイズ */}
          <div className="bg-gradient-to-r from-blue-600 to-teal-500 px-4 sm:px-6 py-3 sm:py-4 rounded-t-2xl flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-7 h-7 sm:w-8 sm:h-8 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
                  <span className="text-white text-base sm:text-lg">📢</span>
                </div>
                <div>
                  <h2 className="text-white font-bold text-sm sm:text-base">
                    管理者からのお知らせ
                  </h2>
                  <p className="text-white text-opacity-90 text-xs sm:text-sm">
                    {getTypeLabel(notification.type)}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-white hover:text-white text-opacity-80 hover:text-opacity-100 transition-colors focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50 rounded p-1"
              >
                <X className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>
            </div>
          </div>

          {/* スクロール可能なコンテンツエリア - 残りの高さを全て使用 */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3 sm:space-y-4 min-h-0">
            {/* タイトル */}
            <div>
              <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-2">
                {notification.title}
              </h3>
              <span
                className={`inline-block px-2 py-1 text-xs font-medium rounded-full border ${getTypeColor(
                  notification.type
                )}`}
              >
                {getTypeLabel(notification.type)}
              </span>
            </div>

            {/* メッセージ */}
            <div>
              <h4 className="text-sm font-medium text-gray-700 mb-2 sm:mb-3">
                メッセージ内容
              </h4>
              <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
                <p className="text-gray-800 leading-relaxed whitespace-pre-wrap text-sm sm:text-base">
                  {notification.message}
                </p>
              </div>
            </div>

            {/* メタ情報 */}
            <div className="flex items-center justify-between text-xs sm:text-sm text-gray-500 border-t pt-3 sm:pt-4">
              <div className="flex items-center space-x-2 sm:space-x-4">
                <span className="flex items-center space-x-1 sm:space-x-2">
                  <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span>
                    {new Date(notification.timestamp).toLocaleString('ja-JP')}
                  </span>
                </span>
                <span className="flex items-center space-x-1 sm:space-x-2">
                  <User className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span>システム管理者</span>
                </span>
              </div>
            </div>
          </div>

          {/* フッター - 固定サイズ */}
          <div className="bg-gray-50 px-3 sm:px-4 py-3 sm:py-4 border-t rounded-b-2xl flex-shrink-0">
            <button
              onClick={onClose}
              className="w-full bg-gradient-to-r from-blue-600 to-teal-500 text-white py-2.5 sm:py-3 px-4 sm:px-6 rounded-xl font-semibold hover:from-blue-700 hover:to-teal-600 transition-all duration-200 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 text-sm sm:text-base"
            >
              閉じる
            </button>
          </div>
        </div>
      </div>
    </>
  );

  // Portalを使用してbody直下にモーダルを表示
  return createPortal(modalContent, document.body);
}
