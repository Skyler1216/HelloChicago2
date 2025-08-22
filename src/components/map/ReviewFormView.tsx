import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Send, Star } from 'lucide-react';
import { useMapSpots } from '../../hooks/useMapSpots';

interface ReviewFormViewProps {
  initialLocation?: { lat: number; lng: number; address?: string } | null;
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

  const [rating, setRating] = useState<number>(0);
  const [comment, setComment] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [targetSpotId, setTargetSpotId] = useState<string | null>(null);

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
        const created = await createSpot({
          name: initialLocation.address || 'スポット',
          location_lat: initialLocation.lat,
          location_lng: initialLocation.lng,
          location_address: initialLocation.address || '',
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
          口コミを投稿する
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
              <div className="text-xs text-gray-500 mt-1">
                緯度: {initialLocation?.lat.toFixed(5)} / 経度:{' '}
                {initialLocation?.lng.toFixed(5)}
              </div>
              {nearestSpot && nearestSpot.dist <= 50 && (
                <div className="mt-1 inline-flex items-center text-xs text-green-600 bg-green-50 border border-green-200 px-2 py-0.5 rounded">
                  既存スポットに紐付け（{Math.round(nearestSpot.dist)}m）
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
                <span>投稿中...</span>
              </>
            ) : (
              <>
                <Send className="w-5 h-5" />
                <span>投稿する</span>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
