import React, { useState, useEffect } from 'react';
import { X, MapPin } from 'lucide-react';
import { useCategories } from '../../hooks/useCategories';
import { useMapSpots } from '../../hooks/useMapSpots';
import { MapSpot, CreateMapSpotData, UpdateMapSpotData } from '../../types/map';

interface SpotFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  spot?: MapSpot | null; // 編集時は既存のスポット、新規作成時はnull
  location?: { lat: number; lng: number; address?: string };
}

export default function SpotFormModal({
  isOpen,
  onClose,
  spot,
  location,
}: SpotFormModalProps) {
  const [formData, setFormData] = useState<CreateMapSpotData>({
    name: '',
    description: '',
    category_id: '',
    location_lat: 0,
    location_lng: 0,
    location_address: '',
    is_public: true,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const { categories } = useCategories();
  const { createSpot, updateSpot, loading, error } = useMapSpots();

  const isEditing = !!spot;

  // 初期データを設定
  useEffect(() => {
    if (spot) {
      setFormData({
        name: spot.name,
        description: spot.description || '',
        category_id: spot.category_id || '',
        location_lat: spot.location_lat,
        location_lng: spot.location_lng,
        location_address: spot.location_address || '',
        is_public: spot.is_public,
      });
    } else if (location) {
      setFormData(prev => ({
        ...prev,
        location_lat: location.lat,
        location_lng: location.lng,
        location_address: location.address || '',
      }));
    }
  }, [spot, location]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'スポット名は必須です';
    }

    if (!formData.location_lat || !formData.location_lng) {
      newErrors.location = '位置情報は必須です';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    try {
      if (isEditing && spot) {
        const updateData: UpdateMapSpotData = {
          name: formData.name,
          description: formData.description,
          category_id: formData.category_id,
          is_public: formData.is_public,
        };

        const success = await updateSpot(spot.id, updateData);
        if (success) {
          onClose();
        }
      } else {
        const newSpot = await createSpot(formData);
        if (newSpot) {
          onClose();
        }
      }
    } catch (err) {
      console.error('スポットの保存に失敗しました:', err);
    }
  };

  const handleInputChange = (
    field: keyof CreateMapSpotData,
    value: string | number | boolean
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // エラーをクリア
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div
        className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-900">
            {isEditing ? 'スポットを編集' : '新しいスポットを追加'}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* スポット名 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              スポット名 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={e => handleInputChange('name', e.target.value)}
              className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-coral-500 focus:border-transparent transition-all ${
                errors.name ? 'border-red-300' : 'border-gray-200'
              }`}
              placeholder="スポットの名前を入力"
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-500">{errors.name}</p>
            )}
          </div>

          {/* 説明 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              説明
            </label>
            <textarea
              value={formData.description}
              onChange={e => handleInputChange('description', e.target.value)}
              rows={3}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-coral-500 focus:border-transparent transition-all"
              placeholder="スポットの説明を入力（オプション）"
            />
          </div>

          {/* カテゴリ */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              カテゴリ
            </label>
            <select
              value={formData.category_id}
              onChange={e => handleInputChange('category_id', e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-coral-500 focus:border-transparent transition-all"
            >
              <option value="">カテゴリを選択</option>
              {categories.map(category => (
                <option key={category.id} value={category.id}>
                  {category.name_ja}
                </option>
              ))}
            </select>
          </div>

          {/* 位置情報 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              位置情報
            </label>
            <div className="space-y-3">
              <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-lg">
                <MapPin className="w-5 h-5 text-gray-500" />
                <div className="flex-1">
                  <p className="text-sm text-gray-600">
                    {formData.location_address || '住所が設定されていません'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formData.location_lat}, {formData.location_lng}
                  </p>
                </div>
              </div>
              {errors.location && (
                <p className="text-sm text-red-500">{errors.location}</p>
              )}
            </div>
          </div>

          {/* 公開設定 */}
          <div>
            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={formData.is_public}
                onChange={e => handleInputChange('is_public', e.target.checked)}
                className="w-4 h-4 text-coral-600 border-gray-300 rounded focus:ring-coral-500"
              />
              <span className="text-sm text-gray-700">
                他のユーザーに公開する
              </span>
            </label>
          </div>

          {/* エラーメッセージ */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* アクションボタン */}
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-3 bg-coral-500 text-white rounded-lg hover:bg-coral-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? '保存中...' : isEditing ? '更新' : '作成'}
            </button>
          </div>
        </form>
      </div>

      {/* Overlay click handler */}
      <div className="absolute inset-0 -z-10" onClick={onClose} />
    </div>
  );
}
