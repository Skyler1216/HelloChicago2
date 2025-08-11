import React from 'react';
import { User, Camera, Upload, X } from 'lucide-react';
import { InlineValidationMessage } from './ValidationMessage';

interface BasicInfoSectionProps {
  name: string;
  avatarUrl: string | null;
  onNameChange: (name: string) => void;
  onAvatarChange: (file: File) => void;
  onAvatarRemove: () => void;
  nameError?: string;
  avatarError?: string;
  uploading?: boolean;
  uploadProgress?: number;
}

export default function BasicInfoSection({
  name,
  avatarUrl,
  onNameChange,
  onAvatarChange,
  onAvatarRemove,
  nameError,
  avatarError,
  uploading = false,
  uploadProgress = 0,
}: BasicInfoSectionProps) {
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onAvatarChange(file);
    }
  };

  const handleCameraClick = () => {
    fileInputRef.current?.click();
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.add(
      'ring-2',
      'ring-coral-500',
      'ring-opacity-50'
    );
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.currentTarget.classList.remove(
      'ring-2',
      'ring-coral-500',
      'ring-opacity-50'
    );
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.remove(
      'ring-2',
      'ring-coral-500',
      'ring-opacity-50'
    );

    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
      onAvatarChange(file);
    }
  };

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-6">
      {/* Section Header */}
      <div className="flex items-center space-x-3">
        <User className="w-6 h-6 text-coral-600" />
        <h2 className="text-xl font-semibold text-gray-900">基本情報</h2>
      </div>

      {/* Avatar Section */}
      <div className="space-y-4">
        <label className="block text-sm font-medium text-gray-700">
          プロフィール画像
        </label>

        <div className="flex items-center space-x-6">
          {/* Avatar Display */}
          <div className="relative">
            <div className="w-24 h-24 bg-gradient-to-r from-coral-500 to-coral-400 rounded-full flex items-center justify-center overflow-hidden">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="プロフィール画像"
                  className="w-24 h-24 object-cover"
                />
              ) : (
                <span className="text-white font-bold text-3xl">
                  {name?.charAt(0) || 'U'}
                </span>
              )}

              {/* Upload Overlay */}
              {uploading && (
                <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-full">
                  <div className="text-center">
                    <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mb-1"></div>
                    <div className="text-xs text-white">{uploadProgress}%</div>
                  </div>
                </div>
              )}
            </div>

            {/* Remove Button */}
            {avatarUrl && !uploading && (
              <button
                type="button"
                onClick={onAvatarRemove}
                className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                aria-label="画像を削除"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Upload Controls */}
          <div className="flex-1 space-y-3">
            {/* Camera Button */}
            <button
              type="button"
              onClick={handleCameraClick}
              disabled={uploading}
              className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-coral-500 text-white rounded-lg hover:bg-coral-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Camera className="w-4 h-4" />
              <span>写真を撮影</span>
            </button>

            {/* Upload Button */}
            <button
              type="button"
              onClick={handleCameraClick}
              disabled={uploading}
              className="w-full flex items-center justify-center space-x-2 px-4 py-2 border border-coral-500 text-coral-600 rounded-lg hover:bg-coral-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Upload className="w-4 h-4" />
              <span>画像を選択</span>
            </button>

            {/* Hidden File Input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
        </div>

        {/* Drag & Drop Area */}
        <div
          className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-coral-400 transition-colors cursor-pointer"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleCameraClick}
        >
          <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-600">
            画像をドラッグ&ドロップまたはクリックして選択
          </p>
          <p className="text-xs text-gray-500 mt-1">JPG, PNG, GIF (最大5MB)</p>
        </div>

        {/* Avatar Error */}
        {avatarError && (
          <InlineValidationMessage type="error" message={avatarError} />
        )}
      </div>

      {/* Name Section */}
      <div className="space-y-2">
        <label
          htmlFor="name"
          className="block text-sm font-medium text-gray-700"
        >
          名前 <span className="text-red-500">*</span>
        </label>
        <input
          id="name"
          type="text"
          value={name}
          onChange={e => onNameChange(e.target.value)}
          className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-coral-500 focus:border-transparent transition-all ${
            nameError ? 'border-red-300 bg-red-50' : 'border-gray-200'
          }`}
          placeholder="お名前を入力してください"
          required
        />
        {nameError && (
          <InlineValidationMessage type="error" message={nameError} />
        )}
      </div>
    </div>
  );
}
