import React, { useState, useRef, useCallback } from 'react';
import {
  Camera,
  Upload,
  RotateCw,
  ZoomIn,
  Download,
  Trash2,
} from 'lucide-react';
import { InlineValidationMessage } from './ValidationMessage';

interface ImageMetadata {
  width: number;
  height: number;
  size: number;
  type: string;
  lastModified: number;
}

interface OptimizedImage {
  file: File;
  preview: string;
  metadata: ImageMetadata;
}

interface ImageUploadSectionProps {
  currentImageUrl: string | null;
  onImageChange: (file: File) => void;
  onImageRemove: () => void;
  onImageOptimize?: (optimizedFile: File) => void;
  maxSize?: number; // MB
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0-1
  error?: string;
  uploading?: boolean;
  uploadProgress?: number;
}

export default function ImageUploadSection({
  currentImageUrl,
  onImageChange,
  onImageRemove,
  onImageOptimize,
  maxSize = 5, // 5MB
  maxWidth = 800,
  maxHeight = 800,
  quality = 0.8,
  error,
  uploading = false,
  uploadProgress = 0,
}: ImageUploadSectionProps) {
  const [dragActive, setDragActive] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [imageMetadata, setImageMetadata] = useState<ImageMetadata | null>(
    null
  );
  const [isOptimizing, setIsOptimizing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // 画像の最適化処理
  const optimizeImage = useCallback(
    async (file: File): Promise<OptimizedImage> => {
      return new Promise((resolve, reject) => {
        const canvas = canvasRef.current;
        if (!canvas) {
          reject(new Error('Canvas not available'));
          return;
        }

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('2D context not available'));
          return;
        }

        const img = new Image();
        img.onload = () => {
          try {
            // 元のサイズを取得
            const originalWidth = img.width;
            const originalHeight = img.height;

            // アスペクト比を保持してリサイズ
            const { width, height } = calculateDimensions(
              originalWidth,
              originalHeight,
              maxWidth,
              maxHeight
            );

            // キャンバスのサイズを設定
            canvas.width = width;
            canvas.height = height;

            // 画像を描画
            ctx.drawImage(img, 0, 0, width, height);

            // 最適化された画像を生成
            canvas.toBlob(
              blob => {
                if (!blob) {
                  reject(new Error('Failed to create blob'));
                  return;
                }

                const optimizedFile = new File([blob], file.name, {
                  type: 'image/jpeg',
                  lastModified: Date.now(),
                });

                // プレビュー用のURLを生成
                const preview = canvas.toDataURL('image/jpeg', quality);

                // メタデータを設定
                const metadata: ImageMetadata = {
                  width,
                  height,
                  size: blob.size,
                  type: blob.type,
                  lastModified: Date.now(),
                };

                resolve({
                  file: optimizedFile,
                  preview,
                  metadata,
                });
              },
              'image/jpeg',
              quality
            );
          } catch (err) {
            reject(err);
          }
        };

        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = URL.createObjectURL(file);
      });
    },
    [maxWidth, maxHeight, quality]
  );

  // 画像の寸法計算
  const calculateDimensions = (
    originalWidth: number,
    originalHeight: number,
    maxWidth: number,
    maxHeight: number
  ) => {
    let { width, height } = { width: originalWidth, height: originalHeight };

    if (width > maxWidth || height > maxHeight) {
      const ratio = Math.min(maxWidth / width, maxHeight / height);
      width = Math.round(width * ratio);
      height = Math.round(height * ratio);
    }

    return { width, height };
  };

  // ファイル選択処理
  const handleFileSelect = useCallback(
    async (file: File) => {
      if (!file.type.startsWith('image/')) {
        return;
      }

      // ファイルサイズチェック
      if (file.size > maxSize * 1024 * 1024) {
        return;
      }

      setIsOptimizing(true);

      try {
        // 最適化処理をシミュレート（実際の実装ではWeb Workersを使用）
        await new Promise(resolve => setTimeout(resolve, 500));

        const optimized = await optimizeImage(file);

        setPreviewImage(optimized.preview);
        setImageMetadata(optimized.metadata);

        // 最適化されたファイルを親コンポーネントに渡す
        if (onImageOptimize) {
          onImageOptimize(optimized.file);
        } else {
          onImageChange(optimized.file);
        }
      } catch (error) {
        console.error('Image optimization failed:', error);
      } finally {
        setIsOptimizing(false);
      }
    },
    [maxSize, optimizeImage, onImageChange, onImageOptimize]
  );

  // ドラッグ&ドロップ処理
  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragIn = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setDragActive(true);
    }
  }, []);

  const handleDragOut = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleFileSelect(e.dataTransfer.files[0]);
      }
    },
    [handleFileSelect]
  );

  // 画像の回転
  const rotateImage = useCallback(() => {
    if (!canvasRef.current || !previewImage) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // キャンバスを90度回転
    const { width, height } = canvas;
    canvas.width = height;
    canvas.height = width;

    ctx.translate(height, 0);
    ctx.rotate(Math.PI / 2);
    ctx.drawImage(canvas, 0, 0);

    // 新しいプレビューを生成
    const newPreview = canvas.toDataURL('image/jpeg', quality);
    setPreviewImage(newPreview);
  }, [previewImage, quality]);

  // 画像の拡大表示
  const zoomImage = useCallback(() => {
    if (previewImage) {
      const newWindow = window.open(previewImage, '_blank');
      if (newWindow) {
        newWindow.document.title = '画像プレビュー';
      }
    }
  }, [previewImage]);

  // 画像のダウンロード
  const downloadImage = useCallback(() => {
    if (previewImage) {
      const link = document.createElement('a');
      link.href = previewImage;
      link.download = 'profile-image.jpg';
      link.click();
    }
  }, [previewImage]);

  const displayImage = previewImage || currentImageUrl;

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-6">
      {/* セクションヘッダー */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          プロフィール画像
        </h3>
        {displayImage && (
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={rotateImage}
              className="p-2 text-gray-600 hover:text-coral-600 hover:bg-coral-50 rounded-lg transition-colors"
              title="画像を回転"
            >
              <RotateCw className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={zoomImage}
              className="p-2 text-gray-600 hover:text-coral-600 hover:bg-coral-50 rounded-lg transition-colors"
              title="拡大表示"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={downloadImage}
              className="p-2 text-gray-600 hover:text-coral-600 hover:bg-coral-50 rounded-lg transition-colors"
              title="ダウンロード"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onImageRemove}
              className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
              title="削除"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* 画像表示エリア */}
      <div className="flex items-center space-x-6">
        {/* 画像プレビュー */}
        <div className="relative">
          <div className="w-24 h-24 bg-gradient-to-r from-coral-500 to-coral-400 rounded-full flex items-center justify-center overflow-hidden">
            {displayImage ? (
              <img
                src={displayImage}
                alt="プロフィール画像"
                className="w-24 h-24 object-cover"
              />
            ) : (
              <span className="text-white font-bold text-3xl">U</span>
            )}

            {/* 最適化中のオーバーレイ */}
            {isOptimizing && (
              <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-full">
                <div className="text-center">
                  <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mb-1"></div>
                  <div className="text-xs text-white">最適化中...</div>
                </div>
              </div>
            )}

            {/* アップロード中のオーバーレイ */}
            {uploading && !isOptimizing && (
              <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-full">
                <div className="text-center">
                  <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mb-1"></div>
                  <div className="text-xs text-white">{uploadProgress}%</div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* アップロードコントロール */}
        <div className="flex-1 space-y-3">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || isOptimizing}
            className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-coral-500 text-white rounded-lg hover:bg-coral-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Camera className="w-4 h-4" />
            <span>写真を撮影・選択</span>
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || isOptimizing}
            className="w-full flex items-center justify-center space-x-2 px-4 py-2 border border-coral-500 text-coral-600 rounded-lg hover:bg-coral-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Upload className="w-4 h-4" />
            <span>画像を選択</span>
          </button>
        </div>
      </div>

      {/* ドラッグ&ドロップエリア */}
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-all cursor-pointer ${
          dragActive
            ? 'border-coral-500 bg-coral-50'
            : 'border-gray-300 hover:border-coral-400'
        }`}
        onDragEnter={handleDragIn}
        onDragLeave={handleDragOut}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <Upload
          className={`w-8 h-8 mx-auto mb-2 transition-colors ${
            dragActive ? 'text-coral-500' : 'text-gray-400'
          }`}
        />
        <p className="text-sm text-gray-600">
          画像をドラッグ&ドロップまたはクリックして選択
        </p>
        <p className="text-xs text-gray-500 mt-1">
          JPG, PNG, GIF (最大{maxSize}MB)
        </p>
      </div>

      {/* 画像メタデータ表示 */}
      {imageMetadata && (
        <div className="bg-gray-50 rounded-lg p-4 space-y-2">
          <h4 className="text-sm font-medium text-gray-700">画像情報</h4>
          <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
            <div>
              サイズ: {imageMetadata.width} × {imageMetadata.height}
            </div>
            <div>
              ファイルサイズ: {(imageMetadata.size / 1024 / 1024).toFixed(2)} MB
            </div>
            <div>形式: {imageMetadata.type}</div>
            <div>最適化: 完了</div>
          </div>
        </div>
      )}

      {/* エラー表示 */}
      {error && <InlineValidationMessage type="error" message={error} />}

      {/* 隠しファイル入力 */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={e => {
          const file = e.target.files?.[0];
          if (file) {
            handleFileSelect(file);
          }
        }}
        className="hidden"
      />

      {/* 隠しキャンバス（画像処理用） */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
