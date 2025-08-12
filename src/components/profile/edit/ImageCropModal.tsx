import React, { useState, useRef, useCallback } from 'react';
import ReactCrop, {
  Crop,
  PixelCrop,
  centerCrop,
  makeAspectCrop,
} from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';

interface ImageCropModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCrop: (croppedImage: File) => void;
  imageFile: File | null;
}

const ImageCropModal: React.FC<ImageCropModalProps> = ({
  isOpen,
  onClose,
  onCrop,
  imageFile,
}) => {
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [imageSrc, setImageSrc] = useState<string>('');
  const imgRef = useRef<HTMLImageElement>(null);

  // 画像ファイルが変更されたときの処理
  React.useEffect(() => {
    if (imageFile) {
      const reader = new FileReader();
      reader.onload = () => {
        setImageSrc(reader.result as string);
        // デフォルトのクロップ領域を設定（正方形、中央）
        const image = new Image();
        image.onload = () => {
          const crop = centerCrop(
            makeAspectCrop(
              {
                unit: '%',
                width: 80,
              },
              1, // アスペクト比 1:1 (正方形)
              image.width,
              image.height
            ),
            image.width,
            image.height
          );
          setCrop(crop);
        };
        image.src = reader.result as string;
      };
      reader.readAsDataURL(imageFile);
    }
  }, [imageFile]);

  // クロップ完了時の処理
  const onCropComplete = useCallback((crop: PixelCrop) => {
    setCompletedCrop(crop);
  }, []);

  // クロップ実行
  const handleCrop = useCallback(async () => {
    if (!imgRef.current || !completedCrop) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    const scaleX = imgRef.current.naturalWidth / imgRef.current.width;
    const scaleY = imgRef.current.naturalHeight / imgRef.current.height;

    canvas.width = completedCrop.width;
    canvas.height = completedCrop.height;

    ctx.drawImage(
      imgRef.current,
      completedCrop.x * scaleX,
      completedCrop.y * scaleY,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY,
      0,
      0,
      completedCrop.width,
      completedCrop.height
    );

    // Canvas から Blob を作成
    canvas.toBlob(
      blob => {
        if (blob) {
          const croppedFile = new File(
            [blob],
            imageFile?.name || 'cropped-image.jpg',
            {
              type: 'image/jpeg',
              lastModified: Date.now(),
            }
          );
          onCrop(croppedFile);
          onClose();
        }
      },
      'image/jpeg',
      0.9
    );
  }, [completedCrop, imageFile, onCrop, onClose]);

  if (!isOpen || !imageFile) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* ヘッダー */}
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold text-gray-900">
            プロフィール画像をクロップ
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* クロップエリア */}
        <div className="p-4 overflow-auto max-h-[60vh]">
          <div className="mb-4 text-sm text-gray-600">
            画像をドラッグしてクロップ領域を調整してください
          </div>

          <div className="flex justify-center">
            <ReactCrop
              crop={crop}
              onChange={(_, percentCrop) => setCrop(percentCrop)}
              onComplete={onCropComplete}
              aspect={1} // 正方形
              minWidth={100}
              minHeight={100}
            >
              <img
                ref={imgRef}
                src={imageSrc}
                alt="クロップ対象"
                className="max-w-full max-h-96 object-contain"
              />
            </ReactCrop>
          </div>
        </div>

        {/* アクションボタン */}
        <div className="flex justify-end gap-3 p-4 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
          >
            キャンセル
          </button>
          <button
            onClick={handleCrop}
            disabled={!completedCrop}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            クロップして保存
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImageCropModal;
