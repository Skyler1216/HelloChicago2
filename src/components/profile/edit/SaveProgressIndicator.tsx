import React from 'react';
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

export type SaveStatus = 'idle' | 'saving' | 'success' | 'error';

interface SaveProgressIndicatorProps {
  status: SaveStatus;
  progress?: number;
  errorMessage?: string;
  className?: string;
}

export default function SaveProgressIndicator({
  status,
  progress = 0,
  errorMessage,
  className = '',
}: SaveProgressIndicatorProps) {
  const getStatusContent = () => {
    switch (status) {
      case 'saving':
        return (
          <div className="flex items-center space-x-2">
            <Loader2 className="w-4 h-4 animate-spin text-coral-500" />
            <span className="text-sm text-gray-600">保存中...</span>
            {progress > 0 && progress < 100 && (
              <div className="flex-1 max-w-32">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-coral-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        );

      case 'success':
        return (
          <div className="flex items-center space-x-2 text-green-600">
            <CheckCircle className="w-4 h-4" />
            <span className="text-sm font-medium">保存完了</span>
          </div>
        );

      case 'error':
        return (
          <div className="flex items-center space-x-2 text-red-600">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm font-medium">
              {errorMessage || '保存に失敗しました'}
            </span>
          </div>
        );

      default:
        return null;
    }
  };

  if (status === 'idle') return null;

  return (
    <div className={`fixed bottom-4 right-4 z-50 ${className}`}>
      <div className="bg-white rounded-lg shadow-lg border border-gray-200 px-4 py-3 min-w-48">
        {getStatusContent()}
      </div>
    </div>
  );
}

// インライン表示用のコンポーネント
interface InlineSaveProgressProps {
  status: SaveStatus;
  className?: string;
}

export function InlineSaveProgress({
  status,
  className = '',
}: InlineSaveProgressProps) {
  if (status === 'idle') return null;

  return (
    <div className={`inline-flex items-center space-x-2 ${className}`}>
      {status === 'saving' && (
        <>
          <Loader2 className="w-4 h-4 animate-spin text-coral-500" />
          <span className="text-sm text-gray-600">保存中...</span>
        </>
      )}
      {status === 'success' && (
        <>
          <CheckCircle className="w-4 h-4 text-green-500" />
          <span className="text-sm text-green-600">保存完了</span>
        </>
      )}
      {status === 'error' && (
        <>
          <AlertCircle className="w-4 h-4 text-red-500" />
          <span className="text-sm text-red-600">保存失敗</span>
        </>
      )}
    </div>
  );
}
