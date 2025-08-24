import React, { useEffect, useMemo, useRef, useState } from 'react';
import { X, Star } from 'lucide-react';
import { useMapSpots } from '../../hooks/useMapSpots';
import { useSpotReviews } from '../../hooks/useSpotReviews';

interface ReviewsBottomSheetProps {
  open: boolean;
  onClose: () => void;
  spotId: string | null;
  location: { lat: number; lng: number; address?: string } | null;
}

export default function ReviewsBottomSheet({
  open,
  onClose,
  spotId,
  location,
}: ReviewsBottomSheetProps) {
  const { spots } = useMapSpots();
  const sheetRef = useRef<HTMLDivElement>(null);
  const { reviews, loading } = useSpotReviews(spotId);
  const [height, setHeight] = useState<number>(520);

  const spot = useMemo(
    () => spots.find(s => s.id === spotId) || null,
    [spots, spotId]
  );

  useEffect(() => {
    if (open) setHeight(520);
    else setHeight(0);
  }, [open]);

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 pointer-events-none select-none">
      <div
        ref={sheetRef}
        className="mx-auto max-w-md pointer-events-auto bg-white rounded-t-2xl shadow-2xl border-t border-gray-200 relative"
        style={{
          height: `${open ? height : 0}px`,
          minHeight: open ? '400px' : '0px',
          overflow: 'hidden',
          transition: 'height 220ms cubic-bezier(0.2, 0.8, 0.2, 1)',
        }}
        aria-live="polite"
        aria-label="口コミ一覧"
      >
        <button
          type="button"
          aria-label="閉じる"
          onClick={onClose}
          className="absolute top-2 right-2 p-2 rounded-full hover:bg-gray-100 active:bg-gray-200"
        >
          <X className="w-5 h-5 text-gray-500" />
        </button>

        <div className="px-4 pt-4">
          <div className="text-sm text-gray-700 font-medium truncate">
            {spot?.location_address || location?.address || '名称未設定の場所'}
          </div>
        </div>

        <div className="h-[calc(100%-64px)] overflow-y-auto px-4 pb-4">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex items-center">
              {[1, 2, 3, 4, 5].map(star => (
                <Star
                  key={star}
                  className={`w-5 h-5 ${
                    star <= Math.round((spot?.average_rating || 0) * 2) / 2
                      ? 'text-yellow-400 fill-current'
                      : 'text-gray-300'
                  }`}
                />
              ))}
            </div>
            <span className="text-sm text-gray-700">
              {(spot?.average_rating ?? 0).toFixed(1)} / 5.0
            </span>
          </div>

          {loading ? (
            <div className="text-sm text-gray-500">読み込み中...</div>
          ) : reviews.length === 0 ? (
            <div className="text-sm text-gray-500">口コミはまだありません</div>
          ) : (
            <ul className="space-y-3">
              {reviews.map(r => (
                <li
                  key={r.id}
                  className="border border-gray-100 rounded-lg p-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium text-gray-900 truncate">
                      {r.user_name || '匿名'}
                    </div>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map(s => (
                        <Star
                          key={s}
                          className={`w-4 h-4 ${
                            s <= r.rating
                              ? 'text-yellow-400 fill-current'
                              : 'text-gray-300'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  {r.comment && (
                    <div className="mt-1 text-sm text-gray-700 whitespace-pre-wrap">
                      {r.comment}
                    </div>
                  )}
                  <div className="mt-1 text-xs text-gray-500">
                    {new Date(r.created_at).toLocaleString('ja-JP')}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
