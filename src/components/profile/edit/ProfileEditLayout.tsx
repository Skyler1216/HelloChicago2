import React from 'react';
import { ArrowLeft, Save, CheckCircle } from 'lucide-react';

interface ProfileEditLayoutProps {
  title: string;
  onBack: () => void;
  onSave: () => void;
  saving: boolean;
  hasChanges: boolean;
  children: React.ReactNode;
}

export default function ProfileEditLayout({
  title,
  onBack,
  onSave,
  saving,
  hasChanges,
  children,
}: ProfileEditLayoutProps) {
  return (
    <div className="w-full">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10 shadow-sm">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <button
                onClick={onBack}
                className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
                aria-label="戻る"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <h1 className="text-xl font-bold text-gray-900">{title}</h1>
            </div>

            {/* Save Button */}
            <button
              onClick={onSave}
              disabled={saving || !hasChanges}
              className={`flex items-center space-x-2 px-6 py-3 rounded-xl font-medium transition-all duration-200 ${
                saving || !hasChanges
                  ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                  : 'bg-coral-500 text-white hover:bg-coral-600 hover:shadow-lg active:scale-95'
              }`}
            >
              {saving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>保存中...</span>
                </>
              ) : hasChanges ? (
                <>
                  <Save className="w-4 h-4" />
                  <span>保存</span>
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  <span>保存済み</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-6">{children}</div>
    </div>
  );
}
