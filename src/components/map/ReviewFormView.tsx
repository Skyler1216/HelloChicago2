import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Send, Star } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { useMapSpots } from '../../hooks/useMapSpots';
import { useSpotReviews } from '../../hooks/useSpotReviews';
import { useAuth } from '../../hooks/useAuth';
import { useCategories } from '../../hooks/useCategories';

interface ReviewFormViewProps {
  initialLocation?: {
    lat: number;
    lng: number;
    address?: string;
    category_hints?: string[];
  } | null;
  onBack: () => void;
}

// Haversine distance (meters)
function distanceMeters(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number }
): number {
  const R = 6371000;
  const toRad = (v: number) => (v * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const h =
    sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng;
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return R * c;
}

export default function ReviewFormView({
  initialLocation,
  onBack,
}: ReviewFormViewProps) {
  const { spots, createSpot, rateSpot, loading } = useMapSpots();
  const { user } = useAuth();
  const { categories } = useCategories();
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  const [rating, setRating] = useState<number>(0);
  const [comment, setComment] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [targetSpotId, setTargetSpotId] = useState<string | null>(null);

  // Fetch existing reviews for nearest spot if available
  const { reviews, loading: loadingReviews } = useSpotReviews(targetSpotId);

  // Determine if user already rated this spot (from aggregated spots data)
  const myExistingRating = useMemo(() => {
    if (!targetSpotId) return null;
    const s = spots.find(sp => sp.id === targetSpotId);
    return typeof s?.user_rating === 'number' ? s.user_rating : null;
  }, [spots, targetSpotId]);

  useEffect(() => {
    // If user has an existing rating, prefill the stars for edit UX
    if (myExistingRating && rating === 0) {
      setRating(myExistingRating);
    }
  }, [myExistingRating, rating]);
  // Prefill category by inference or default top category from docs ordering
  useEffect(() => {
    if (!initialLocation || selectedCategoryId) return;
    const inferred = inferCategoryId(
      initialLocation.address,
      initialLocation.category_hints || [],
      categories.map(c => ({ id: c.id, key: c.name_ja, icon: c.icon }))
    );
    if (inferred) {
      setSelectedCategoryId(inferred);
    } else if (categories.length > 0) {
      setSelectedCategoryId(categories[0].id);
    }
  }, [initialLocation, categories, selectedCategoryId]);


  // Prefill existing comment if present
  const myExistingReview = useMemo(
    () => reviews.find(r => r.user_id === user?.id) || null,
    [reviews, user?.id]
  );
  useEffect(() => {
    if (myExistingReview && comment.length === 0) {
      setComment(myExistingReview.comment ?? '');
    }
  }, [myExistingReview, comment]);

  const nearestSpot = useMemo(() => {
    if (!initialLocation) return null;
    let best: { id: string; dist: number } | null = null;
    for (const s of spots) {
      const dist = distanceMeters(
        { lat: initialLocation.lat, lng: initialLocation.lng },
        { lat: s.location_lat, lng: s.location_lng }
      );
      if (best === null || dist < best.dist) best = { id: s.id, dist };
    }
    return best;
  }, [spots, initialLocation]);

  // Category inference from hints/name with explicit mapping to 7 top-level categories
  function inferCategoryId(
    name: string | undefined,
    hints: string[],
    available: { id: string; key: string; icon: string }[]
  ): string | null {
    const text = `${name || ''} ${(hints || []).join(' ')}`.toLowerCase();

    // Helper to resolve a canonical slug to an available category id
    const resolve = (slug: string): string | null => {
      const found = available.find(c => c.id === slug);
      return found ? found.id : null;
    };

    // Priority 1: direct keyword → top-level mapping
    const rules: Array<{ re: RegExp; slug: string }> = [
      // Food
      { re: /(restaurant|food|diner|izakaya|居酒屋|レストラン|寿司|すし|ラーメン|らーめん|cafe|coffee|喫茶|カフェ|bakery|ベーカリー|sweets|スイーツ|fast[_\s-]?food|マクド|バーガー|pizza|pizzeria)/, slug: 'food' },
      // Hospital
      { re: /(hospital|clinic|dentist|pharmacy|urgent[_\s-]?care|病院|クリニック|歯科|薬局)/, slug: 'hospital' },
      // Play / Entertainment
      { re: /(park|playground|公園|gym|fitness|golf|ゴルフ|cinema|movie|シネマ|映画|museum|美術館|博物館|amusement|zoo|aquarium|stadium|ボウリング|カラオケ)/, slug: 'play' },
      // Shopping (supermarket/grocery)
      { re: /(supermarket|grocery|market|アウトレット|mall|ショッピング|ストア|store)/, slug: 'shopping' },
      // Convenience store → Food per docs' subcategory placement
      { re: /(convenience|コンビニ)/, slug: 'food' },
      // Beauty
      { re: /(beauty|hair|barber|salon|nail|spa|美容|理容|床屋|ヘア|ネイル|エステ|スパ)/, slug: 'beauty' },
      // Lodging
      { re: /(hotel|lodging|motel|inn|hostel|宿|ホテル|旅館|モーテル|ホステル)/, slug: 'lodging' },
      // Other facilities
      { re: /(school|university|college|kindergarten|preschool|学校|大学|幼稚園|保育園|library|図書館|bank|銀行|atm|post[_\s-]?office|郵便局|city[_\s-]?hall|役所|区役所|embassy|大使館|police|警察)/, slug: 'other' },
    ];

    for (const r of rules) {
      if (r.re.test(text)) {
        const id = resolve(r.slug);
        if (id) return id;
      }
    }

    // Priority 2: fallback by Mapbox-like place_type hints if present
    const joined = (hints || []).join(' ').toLowerCase();
    const hintRules: Array<{ re: RegExp; slug: string }> = [
      { re: /(poi|place|address)/, slug: 'other' },
      { re: /(school|university|college)/, slug: 'other' },
      { re: /(restaurant|food|cafe|coffee|bakery|fast[_\s-]?food)/, slug: 'food' },
      { re: /(supermarket|grocery|market|convenience)/, slug: 'shopping' },
      { re: /(park|playground|gym|museum|cinema|theatre|golf)/, slug: 'play' },
      { re: /(hospital|clinic|dentist|pharmacy)/, slug: 'hospital' },
      { re: /(hotel|lodging|motel|inn|hostel)/, slug: 'lodging' },
      { re: /(beauty|hair|barber|salon|nail|spa)/, slug: 'beauty' },
    ];
    for (const r of hintRules) {
      if (r.re.test(joined)) {
        const id = resolve(r.slug);
        if (id) return id;
      }
    }

    // Final fallback: top of the list (sort_order) if available
    return available.length > 0 ? available[0].id : null;
  }

  useEffect(() => {
    if (!initialLocation) return;
    if (nearestSpot && nearestSpot.dist <= 50) {
      setTargetSpotId(nearestSpot.id);
    } else {
      setTargetSpotId(null);
    }
  }, [initialLocation, nearestSpot]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!initialLocation) return;
    if (rating <= 0) {
      setError('星評価を選択してください');
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      let spotId = targetSpotId;
      if (!spotId) {
        // Auto-categorize using hints and heuristics
        const categoryId = selectedCategoryId || inferCategoryId(
          initialLocation.address,
          initialLocation.category_hints || [],
          categories.map(c => ({ id: c.id, key: c.name_ja, icon: c.icon }))
        );
        const created = await createSpot({
          name: initialLocation.address || 'スポット',
          location_lat: initialLocation.lat,
          location_lng: initialLocation.lng,
          location_address: initialLocation.address || '',
          category_id: categoryId || undefined,
          is_public: true,
        });
        if (!created) {
          setError('スポットの作成に失敗しました');
          setIsSubmitting(false);
          return;
        }
        spotId = created.id;
      }

      const ok = await rateSpot({
        spot_id: spotId!,
        rating,
        comment: comment || undefined,
      });
      if (!ok) {
        setError('口コミの保存に失敗しました');
        setIsSubmitting(false);
        return;
      }

      onBack();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 min-h-0 flex flex-col bg-white">
      <div className="flex items-center justify-between p-4 border-b border-gray-100 sticky top-0 bg-white z-10">
        <button
          onClick={onBack}
          className="flex items-center space-x-2 text-gray-600 hover:text-gray-800"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>戻る</span>
        </button>
        <h1 className="text-lg font-semibold text-gray-900">
          {myExistingReview ? '口コミを編集する' : '口コミを投稿する'}
        </h1>
        <div className="w-10" />
      </div>

      {/* POI Preview */}
      <div className="px-4 pt-4">
        <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-coral-500 to-coral-400 flex items-center justify-center text-white font-bold">
              📍
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm text-gray-700 font-medium truncate">
                {initialLocation?.address || '名称未設定の場所'}
              </div>
              {/* 口コミ件数のみ表示 */}
              <div className="text-xs text-gray-500 mt-1">
                {loadingReviews
                  ? '口コミ 読み込み中…'
                  : `口コミ ${reviews.length}件`}
              </div>
              {myExistingRating && (
                <div className="mt-1 text-xs text-coral-700 bg-coral-50 border border-coral-200 inline-block px-2 py-0.5 rounded">
                  既に投稿済みのため、編集として更新されます
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="flex-1 overflow-y-auto">
        <form
          onSubmit={handleSubmit}
          className="p-4 space-y-5 max-w-md mx-auto"
        >
          {/* Category selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              カテゴリ
            </label>
            <div className="grid grid-cols-2 gap-3">
              {categories.map(category => {
                const IconComponent =
                  LucideIcons[category.icon as keyof typeof LucideIcons];
                const active = selectedCategoryId === category.id;
                return (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => setSelectedCategoryId(category.id)}
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
          </div>
          {/* Rating */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              評価 <span className="text-gray-400 text-xs">（1〜5）</span>
            </label>
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className="p-1 hover:scale-110 transition-transform"
                  aria-label={`評価 ${star}`}
                >
                  <Star
                    className={`w-7 h-7 ${star <= rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
                  />
                </button>
              ))}
              {rating > 0 && (
                <span className="ml-2 text-sm text-gray-600">{rating}/5</span>
              )}
            </div>
          </div>

          {/* Comment */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              口コミ
            </label>
            <textarea
              value={comment}
              onChange={e => setComment(e.target.value)}
              rows={6}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-coral-500 focus:border-transparent transition-all"
              placeholder="体験や感想、役立つ情報（価格/予約/注意点など）を書いてください"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting || loading}
            className="w-full bg-coral-500 text-white py-3 px-6 rounded-xl font-semibold hover:bg-coral-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSubmitting || loading ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>{myExistingRating ? '更新中...' : '投稿中...'}</span>
              </>
            ) : (
              <>
                <Send className="w-5 h-5" />
                <span>{myExistingRating ? '更新する' : '投稿する'}</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
