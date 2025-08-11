import { useState } from 'react';
import { supabase } from '../lib/supabase';

interface UseImageUploadReturn {
  uploading: boolean;
  uploadProgress: number;
  uploadImage: (
    file: File,
    userId: string,
    onSuccess?: (url: string) => void
  ) => Promise<string | null>;
  error: string | null;
}

export function useImageUpload(): UseImageUploadReturn {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const validateImageFile = (file: File): boolean => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    const maxSize = 2 * 1024 * 1024; // 2MB

    if (!allowedTypes.includes(file.type)) {
      setError('JPEG、PNG、WebP形式の画像のみ対応しています');
      return false;
    }

    if (file.size > maxSize) {
      setError('ファイルサイズは2MB以下にしてください');
      return false;
    }

    return true;
  };

  const compressImage = (
    file: File,
    maxWidth = 800,
    quality = 0.8
  ): Promise<File> => {
    return new Promise(resolve => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        // アスペクト比を保持してリサイズ
        const ratio = Math.min(maxWidth / img.width, maxWidth / img.height);
        canvas.width = img.width * ratio;
        canvas.height = img.height * ratio;

        // 画像を描画
        ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);

        // Blobに変換
        canvas.toBlob(
          blob => {
            if (blob) {
              const compressedFile = new File([blob], file.name, {
                type: file.type,
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            } else {
              resolve(file);
            }
          },
          file.type,
          quality
        );
      };

      img.src = URL.createObjectURL(file);
    });
  };

  const uploadImage = async (
    file: File,
    userId: string,
    onSuccess?: (url: string) => void
  ): Promise<string | null> => {
    try {
      setUploading(true);
      setError(null);
      setUploadProgress(0);

      // ファイル検証
      if (!validateImageFile(file)) {
        return null;
      }

      // 画像圧縮
      setUploadProgress(20);
      const compressedFile = await compressImage(file);

      // ファイル名を生成（ユーザーIDとタイムスタンプを使用）
      const timestamp = Date.now();
      const fileExt = compressedFile.name.split('.').pop();
      const fileName = `${userId}/avatar_${timestamp}.${fileExt}`;

      setUploadProgress(40);

      // Supabase Storageにアップロード
      const { error } = await supabase.storage
        .from('avatars')
        .upload(fileName, compressedFile, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) {
        throw new Error(`アップロードエラー: ${error.message}`);
      }

      // アップロードされたファイルのURLを取得
      const {
        data: { publicUrl },
      } = supabase.storage.from('avatars').getPublicUrl(fileName);

      setUploadProgress(100);

      // 成功コールバックを実行
      if (onSuccess) {
        onSuccess(publicUrl);
      }

      return publicUrl;
    } catch (err) {
      console.error('❌ Image upload error:', err);
      setError(
        err instanceof Error ? err.message : 'アップロードに失敗しました'
      );
      return null;
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  return {
    uploading,
    uploadProgress,
    uploadImage,
    error,
  };
}
