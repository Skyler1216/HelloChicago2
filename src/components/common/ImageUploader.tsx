import React, { useRef, useState } from 'react';
import { X, Upload } from 'lucide-react';
import { useImageUpload } from '../../hooks/useImageUpload';
import { useAuth } from '../../hooks/useAuth';

interface ImageUploaderProps {
  value: string[];
  onChange: (urls: string[]) => void;
  bucket?: string; // default: 'avatars'
  folder?: string; // default: `${user.id}/posts`
  maxImages?: number; // default: 5
  onUploadingChange?: (isUploading: boolean) => void;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({
  value,
  onChange,
  bucket = 'avatars',
  folder,
  maxImages = 5,
  onUploadingChange,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { user } = useAuth();
  const { uploadImage, uploading, uploadProgress, error } = useImageUpload();
  const [localPreviews, setLocalPreviews] = useState<string[]>([]);

  React.useEffect(() => {
    onUploadingChange?.(uploading);
  }, [uploading, onUploadingChange]);

  const handleSelectFiles = () => {
    fileInputRef.current?.click();
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files || !user) return;

    const remainingSlots = maxImages - value.length;
    const filesToUpload = Array.from(files).slice(
      0,
      Math.max(0, remainingSlots)
    );

    const previewsQueue = filesToUpload.map(file => URL.createObjectURL(file));
    // enqueue previews
    setLocalPreviews(prev => [...prev, ...previewsQueue]);

    for (const file of filesToUpload) {
      await uploadImage(
        file,
        user.id,
        uploadedUrl => {
          onChange([...value, uploadedUrl]);
        },
        {
          bucket,
          folder: folder ?? `${user.id}/posts`,
          filenamePrefix: 'post_',
        }
      );

      // remove the head of the previews queue
      setLocalPreviews(prev => prev.slice(1));
    }
  };

  const handleRemove = (url: string) => {
    onChange(value.filter(u => u !== url));
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    handleFiles(e.dataTransfer.files);
  };

  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="block text-sm font-medium text-gray-700">
          写真 (最大{maxImages}枚)
        </label>
        {uploading && (
          <span className="text-xs text-gray-500">{uploadProgress}%</span>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3">
        {/* Existing images */}
        {value.map(url => (
          <div
            key={url}
            className="relative group border rounded-lg overflow-hidden"
          >
            <img
              src={url}
              alt="uploaded"
              className="w-full h-24 object-cover"
            />
            <button
              type="button"
              onClick={() => handleRemove(url)}
              className="absolute top-1 right-1 bg-black bg-opacity-50 text-white p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity"
              aria-label="remove image"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}

        {/* Local previews (during upload) */}
        {localPreviews.map((src, idx) => (
          <div
            key={`preview-${idx}`}
            className="relative border rounded-lg overflow-hidden"
          >
            <img
              src={src}
              alt="preview"
              className="w-full h-24 object-cover opacity-80"
            />
            {uploading && (
              <div className="absolute inset-0 bg-black/30 flex items-end">
                <div className="w-full h-1 bg-gray-200">
                  <div
                    className="h-1 bg-coral-500"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Add button */}
        {value.length < maxImages && (
          <div
            onDrop={onDrop}
            onDragOver={onDragOver}
            className="flex flex-col items-center justify-center h-24 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-coral-400 hover:text-coral-600 transition-colors cursor-pointer"
            onClick={handleSelectFiles}
          >
            <Upload className="w-6 h-6 mb-1" />
            <span className="text-xs">写真を追加（ドラッグ&ドロップ可）</span>
          </div>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        className="hidden"
        onChange={e => handleFiles(e.target.files)}
      />

      {!user && (
        <p className="mt-2 text-xs text-red-600">
          アップロードにはログインが必要です
        </p>
      )}
      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
};

export default ImageUploader;
