import { useState } from 'react';
import { supabase } from '../lib/supabase';

interface UploadOptions {
  bucket?: string; // Supabase Storage bucket name
  folder?: string; // Path prefix inside the bucket
  filenamePrefix?: string; // Optional file name prefix
}

interface UseImageUploadReturn {
  uploading: boolean;
  uploadProgress: number;
  uploadImage: (
    file: File,
    userId: string,
    onSuccess?: (url: string) => void,
    options?: UploadOptions
  ) => Promise<string | null>;
  error: string | null;
}

export function useImageUpload(): UseImageUploadReturn {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const validateImageFile = (file: File): boolean => {
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/heic',
      'image/heif',
    ];
    const maxSize = 15 * 1024 * 1024; // 15MB (圧縮前の許容上限)

    if (!allowedTypes.includes(file.type)) {
      setError('JPEG/PNG/WebP/HEIC(β) のみ対応しています');
      return false;
    }

    if (file.size > maxSize) {
      setError('ファイルサイズは15MB以下にしてください');
      return false;
    }

    return true;
  };

  const compressImage = (
    file: File,
    maxLongSide = 1600,
    quality = 0.8
  ): Promise<File> => {
    // HEIC/HEIF はブラウザでデコードできない場合が多いので、非圧縮で通す
    if (file.type.includes('heic') || file.type.includes('heif')) {
      return Promise.resolve(file);
    }

    return new Promise(resolve => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();

      img.onload = () => {
        // 長辺が maxLongSide 以下になるよう縮小
        const { width, height } = img;
        const longSide = Math.max(width, height);
        const ratio = Math.min(1, maxLongSide / longSide);
        const targetWidth = Math.round(width * ratio);
        const targetHeight = Math.round(height * ratio);
        canvas.width = targetWidth;
        canvas.height = targetHeight;

        ctx?.drawImage(img, 0, 0, targetWidth, targetHeight);

        const outputType =
          file.type === 'image/png' ? 'image/png' : 'image/jpeg';

        canvas.toBlob(
          blob => {
            if (blob) {
              const compressedFile = new File([blob], file.name, {
                type: outputType,
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            } else {
              resolve(file);
            }
          },
          outputType,
          quality
        );
      };

      img.onerror = () => {
        // 何らかの理由で読めない場合は、そのまま返却
        resolve(file);
      };

      img.src = URL.createObjectURL(file);
    });
  };

  const uploadImage = async (
    file: File,
    userId: string,
    onSuccess?: (url: string) => void,
    options?: UploadOptions
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

      // アップロード先設定
      const bucket = options?.bucket ?? 'avatars';
      const folder = options?.folder ?? `${userId}`;
      const filenamePrefix = options?.filenamePrefix ?? 'image_';

      // ファイル名を生成（ユーザーIDとタイムスタンプを使用）
      const timestamp = Date.now();
      const extFromType =
        compressedFile.type === 'image/jpeg'
          ? 'jpg'
          : compressedFile.type.split('/')[1] ||
            compressedFile.name.split('.').pop() ||
            'jpg';
      const fileName = `${folder}/${filenamePrefix}${timestamp}.${extFromType}`;

      setUploadProgress(40);

      // Supabase Storageにアップロード
      const { error } = await supabase.storage
        .from(bucket)
        .upload(fileName, compressedFile, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) {
        // バケットが無いなどの典型エラーをユーザーフレンドリーに
        if (error.message.includes('Bucket not found')) {
          throw new Error(
            'アップロード先バケットが見つかりません。管理者に「Storage の avatars バケット作成(公開)」を依頼してください。'
          );
        }
        throw new Error(`アップロードエラー: ${error.message}`);
      }

      // アップロードされたファイルのURLを取得
      const {
        data: { publicUrl },
      } = supabase.storage.from(bucket).getPublicUrl(fileName);

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
