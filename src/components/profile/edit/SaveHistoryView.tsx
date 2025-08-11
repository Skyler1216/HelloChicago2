import React, { useState } from 'react';
import {
  Clock,
  CheckCircle,
  AlertCircle,
  Trash2,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { SaveHistory } from '../../../hooks/useProfileManager';

interface SaveHistoryViewProps {
  saveHistory: SaveHistory[];
  onRemoveHistory: (historyId: string) => void;
  onClearHistory: () => void;
  className?: string;
}

export default function SaveHistoryView({
  saveHistory,
  onRemoveHistory,
  onClearHistory,
  className = '',
}: SaveHistoryViewProps) {
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [showDetails, setShowDetails] = useState(true);

  if (saveHistory.length === 0) {
    return (
      <div
        className={`bg-white rounded-2xl p-6 shadow-sm border border-gray-100 ${className}`}
      >
        <div className="text-center py-8">
          <Clock className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            保存履歴がありません
          </h3>
          <p className="text-gray-600">
            プロフィールを編集すると、ここに履歴が表示されます
          </p>
        </div>
      </div>
    );
  }

  const toggleExpanded = (historyId: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(historyId)) {
        newSet.delete(historyId);
      } else {
        newSet.add(historyId);
      }
      return newSet;
    });
  };

  const formatTimestamp = (timestamp: Date) => {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return '今';
    if (minutes < 60) return `${minutes}分前`;
    if (hours < 24) return `${hours}時間前`;
    if (days < 7) return `${days}日前`;

    return timestamp.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'profile':
        return '基本情報';
      case 'details':
        return '詳細情報';
      case 'both':
        return '一括更新';
      default:
        return type;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'profile':
        return 'bg-blue-100 text-blue-800';
      case 'details':
        return 'bg-green-100 text-green-800';
      case 'both':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const renderChanges = (changes: Record<string, unknown>) => {
    return Object.entries(changes).map(([key, value]) => {
      const displayKey = getDisplayKey(key);
      const displayValue = formatValue(value);

      return (
        <div
          key={key}
          className="flex justify-between py-2 border-b border-gray-100 last:border-b-0"
        >
          <span className="text-sm font-medium text-gray-700">
            {displayKey}
          </span>
          <span
            className="text-sm text-gray-600 max-w-xs truncate"
            title={displayValue}
          >
            {displayValue}
          </span>
        </div>
      );
    });
  };

  const getDisplayKey = (key: string) => {
    const keyMap: Record<string, string> = {
      name: '名前',
      avatar_url: 'プロフィール画像',
      bio: '自己紹介',
      location_area: '居住エリア',
      interests: '趣味・関心事',
      languages: '話せる言語',
      arrival_date: '到着日',
      family_structure: '家族構成',
      updated_at: '更新日時',
    };

    return keyMap[key] || key;
  };

  const formatValue = (value: unknown): string => {
    if (value === null || value === undefined) return '-';
    if (typeof value === 'boolean') return value ? 'はい' : 'いいえ';
    if (Array.isArray(value))
      return value.length > 0 ? value.join(', ') : 'なし';
    if (typeof value === 'string') {
      if (value.length > 50) return value.substring(0, 50) + '...';
      return value;
    }
    return String(value);
  };

  return (
    <div
      className={`bg-white rounded-2xl shadow-sm border border-gray-100 ${className}`}
    >
      {/* ヘッダー */}
      <div className="flex items-center justify-between p-6 border-b border-gray-100">
        <div className="flex items-center space-x-3">
          <Clock className="w-5 h-5 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900">保存履歴</h3>
          <span className="bg-gray-100 text-gray-600 text-sm px-2 py-1 rounded-full">
            {saveHistory.length}件
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
            title={showDetails ? '詳細を隠す' : '詳細を表示'}
          >
            {showDetails ? (
              <EyeOff className="w-4 h-4" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
          </button>

          <button
            onClick={onClearHistory}
            className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
            title="履歴をクリア"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 履歴リスト */}
      <div className="divide-y divide-gray-100">
        {saveHistory.map(item => (
          <div key={item.id} className="p-6 hover:bg-gray-50 transition-colors">
            {/* 履歴ヘッダー */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {/* 成功/失敗アイコン */}
                {item.success ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-red-500" />
                )}

                {/* 更新タイプ */}
                <span
                  className={`px-2 py-1 text-xs font-medium rounded-full ${getTypeColor(item.type)}`}
                >
                  {getTypeLabel(item.type)}
                </span>

                {/* タイムスタンプ */}
                <span className="text-sm text-gray-500">
                  {formatTimestamp(item.timestamp)}
                </span>
              </div>

              <div className="flex items-center space-x-2">
                {/* 展開/折りたたみボタン */}
                <button
                  onClick={() => toggleExpanded(item.id)}
                  className="p-1 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded transition-colors"
                >
                  {expandedItems.has(item.id) ? (
                    <ChevronUp className="w-4 h-4" />
                  ) : (
                    <ChevronDown className="w-4 h-4" />
                  )}
                </button>

                {/* 削除ボタン */}
                <button
                  onClick={() => onRemoveHistory(item.id)}
                  className="p-1 text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
                  title="この履歴を削除"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* エラーメッセージ（失敗の場合） */}
            {!item.success && item.error && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700">{item.error}</p>
              </div>
            )}

            {/* 変更内容の詳細 */}
            {showDetails && expandedItems.has(item.id) && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <h4 className="text-sm font-medium text-gray-700 mb-3">
                  変更内容
                </h4>
                <div className="space-y-1">{renderChanges(item.changes)}</div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* フッター */}
      <div className="p-4 bg-gray-50 border-t border-gray-100">
        <p className="text-xs text-gray-500 text-center">
          最新の10件の履歴を表示しています
        </p>
      </div>
    </div>
  );
}
