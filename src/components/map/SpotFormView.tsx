import React, { useEffect, useState } from 'react';
import { ArrowLeft, MapPin, Send } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { useCategories } from '../../hooks/useCategories';
import { useMapSpots } from '../../hooks/useMapSpots';
import { CreateMapSpotData } from '../../types/map';

interface SpotFormViewProps {
  initialLocation?: { lat: number; lng: number; address?: string } | null;
  onBack: () => void;
}

export default function SpotFormView({
  initialLocation,
  onBack,
}: SpotFormViewProps) {
  const { categories, loading: categoriesLoading } = useCategories();
  const { createSpot, loading } = useMapSpots();

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<CreateMapSpotData>({
    name: '',
    description: '',
    category_id: '',
    location_lat: initialLocation?.lat ?? 0,
    location_lng: initialLocation?.lng ?? 0,
    location_address: initialLocation?.address ?? '',
    is_public: true,
  });

  useEffect(() => {
    if (initialLocation) {
      setFormData(prev => ({
        ...prev,
        location_lat: initialLocation.lat,
        location_lng: initialLocation.lng,
        location_address: initialLocation.address ?? prev.location_address,
      }));
    }
  }, [initialLocation]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!formData.name.trim()) newErrors.name = 'スポット名は必須です';
    if (!formData.category_id) newErrors.category_id = 'カテゴリは必須です';
    if (!formData.location_lat || !formData.location_lng)
      newErrors.location = '位置情報は必須です';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsSubmitting(true);
    try {
      const created = await createSpot(formData);
      if (created) {
        alert('スポットを作成しました');
        onBack();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-100 sticky top-0 bg-white z-10">
        <button
          onClick={onBack}
          className="flex items-center space-x-2 text-gray-600 hover:text-gray-800"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>戻る</span>
        </button>
        <h1 className="text-lg font-semibold text-gray-900">
          新しいスポットを追加
        </h1>
        <div className="w-10" />
      </div>

      {/* Form */}
      <div className="flex-1 overflow-y-auto">
        <form
          onSubmit={handleSubmit}
          className="p-4 space-y-5 max-w-md mx-auto"
        >
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              スポット名 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-coral-500 focus:border-transparent transition-all ${
                errors.name ? 'border-red-300' : 'border-gray-200'
              }`}
              placeholder="スポットの名前を入力"
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-500">{errors.name}</p>
            )}
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              カテゴリ <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-3">
              {categories.map(category => {
                const IconComponent =
                  LucideIcons[category.icon as keyof typeof LucideIcons];
                const active = formData.category_id === category.id;
                return (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() =>
                      setFormData({ ...formData, category_id: category.id })
                    }
                    className={`flex items-center space-x-2 p-3 rounded-xl border-2 transition-all ${
                      active
                        ? 'border-coral-500 bg-coral-50 text-coral-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {IconComponent &&
                      typeof IconComponent === 'function' &&
                      React.createElement(
                        IconComponent as React.ComponentType<{
                          className?: string;
                        }>,
                        { className: 'w-4 h-4' }
                      )}
                    <span className="text-sm font-medium">
                      {category.name_ja}
                    </span>
                  </button>
                );
              })}
            </div>
            {errors.category_id && (
              <p className="mt-1 text-sm text-red-500">{errors.category_id}</p>
            )}
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              位置情報
            </label>
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={formData.location_address}
                onChange={e =>
                  setFormData({ ...formData, location_address: e.target.value })
                }
                placeholder="住所または場所名を入力"
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-coral-500 focus:border-transparent transition-all"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              緯度: {formData.location_lat.toFixed(6)} / 経度:{' '}
              {formData.location_lng.toFixed(6)}
            </p>
            {errors.location && (
              <p className="mt-1 text-sm text-red-500">{errors.location}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              説明（任意）
            </label>
            <textarea
              value={formData.description}
              onChange={e =>
                setFormData({ ...formData, description: e.target.value })
              }
              rows={5}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-coral-500 focus:border-transparent transition-all resize-none"
              placeholder="スポットの説明を入力"
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting || categoriesLoading || loading}
            className="w-full bg-coral-500 text-white py-3 px-6 rounded-xl font-semibold hover:bg-coral-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
          >
            {isSubmitting || loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>保存中...</span>
              </>
            ) : (
              <>
                <Send className="w-5 h-5" />
                <span>作成する</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
