import React, { useState, useRef } from 'react';
import { User, Upload } from 'lucide-react';
import ImageCropModal from './ImageCropModal';

interface BasicInfoSectionProps {
  name: string;
  avatarUrl: string;
  onNameChange: (name: string) => void;
  onAvatarChange: (file: File) => void;
}

const BasicInfoSection: React.FC<BasicInfoSectionProps> = ({
  name,
  avatarUrl,
  onNameChange,
  onAvatarChange,
}) => {
  const [showCropModal, setShowCropModal] = useState(false);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setSelectedImageFile(file);
      setShowCropModal(true);
    }
  };

  const handleCropComplete = (croppedFile: File) => {
    // クロップ完了後は、ファイルを親コンポーネントに渡すだけで、自動保存はしない
    onAvatarChange(croppedFile);
    setSelectedImageFile(null);
    setShowCropModal(false);
  };

  const handleCloseCropModal = () => {
    setShowCropModal(false);
    setSelectedImageFile(null);
    // ファイル入力をリセット
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">基本情報</h3>

      {/* アバターセクション */}
      <div className="flex items-center space-x-6 mb-6">
        <div className="relative">
          <div className="w-24 h-24 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt="プロフィール画像"
                className="w-full h-full object-cover"
              />
            ) : (
              <User className="w-12 h-12 text-gray-400" />
            )}
          </div>
        </div>

        <div className="flex-1">
          <div className="mb-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              プロフィール画像
            </label>
            <p className="text-sm text-gray-500 mb-3">
              正方形の画像が推奨されます
            </p>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />

          <button
            onClick={handleUploadClick}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
          >
            <Upload className="w-4 h-4 mr-2" />
            画像を選択
          </button>
        </div>
      </div>

      {/* 名前セクション */}
      <div>
        <label
          htmlFor="name"
          className="block text-sm font-medium text-gray-700 mb-2"
        >
          名前
        </label>
        <input
          type="text"
          id="name"
          value={name}
          onChange={e => onNameChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          placeholder="あなたの名前を入力してください"
        />
      </div>

      {/* 画像クロップモーダル */}
      <ImageCropModal
        isOpen={showCropModal}
        onClose={handleCloseCropModal}
        onCrop={handleCropComplete}
        imageFile={selectedImageFile}
      />
    </div>
  );
};

export default BasicInfoSection;
