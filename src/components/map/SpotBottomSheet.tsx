import { useEffect, useMemo, useRef, useState } from 'react';
import { Star, Eye, MessageSquarePlus, X } from 'lucide-react';
import { useMapSpots } from '../../hooks/useMapSpots';
import { useSpotReviews } from '../../hooks/useSpotReviews';

interface SpotBottomSheetProps {
  open: boolean;
  onClose: () => void;
  location: {
    lat: number;
    lng: number;
    address?: string;
    average_rating?: number;
  } | null;
  onClickPostReview: () => void;
  onClickViewReviews: () => void;
}

export default function SpotBottomSheet({
  open,
  onClose,
  location,
  onClickPostReview,
  onClickViewReviews,
}: SpotBottomSheetProps) {
  // Early return if not open or no location - no hooks called after this point
  if (!open || !location) return null;

  const sheetRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const [viewportH, setViewportH] = useState<number>(
    typeof window === 'undefined' ? 800 : window.innerHeight
  );
  useEffect(() => {
    const onResize = () => setViewportH(window.innerHeight);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const SNAP_PEEK = useMemo(
    () => Math.max(160, Math.round(viewportH * 0.25)),
    [viewportH]
  );
  const SNAP_MID = useMemo(() => Math.round(viewportH * 0.5), [viewportH]);
  const SNAP_FULL = useMemo(() => Math.round(viewportH * 0.88), [viewportH]);
  const MIN_SHEET = 280; // ボタンまで確実に見える最低高さ(px)

  const [height, setHeight] = useState<number>(SNAP_PEEK);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (open) {
      // 初期表示は中間スナップか最低高さの大きい方
      setHeight(Math.max(SNAP_MID, MIN_SHEET));
    } else {
      setHeight(0);
    }
  }, [open, SNAP_MID]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (open) document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const container = sheetRef.current;
    if (!container) return;

    let startY = 0;
    let startH = 0;
    let dragging = false;

    const getScrollTop = () => contentRef.current?.scrollTop ?? 0;

    const onPointerDown = (e: PointerEvent) => {
      dragging = true;
      setIsDragging(true);
      startY = e.clientY;
      startH = height;
      container.setPointerCapture(e.pointerId);
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!dragging) return;
      const dy = startY - e.clientY; // up is positive
      if (dy < 0 && getScrollTop() > 0) {
        return;
      }
      const newH = Math.min(SNAP_FULL, Math.max(80, startH + dy));
      setHeight(newH);
    };

    const snapTo = (h: number) => {
      const points = [SNAP_PEEK, SNAP_MID, SNAP_FULL];
      const nearest = points.reduce((p, c) =>
        Math.abs(c - h) < Math.abs(p - h) ? c : p
      );
      if (nearest === SNAP_PEEK && h < SNAP_PEEK * 0.6) {
        onClose();
        return;
      }
      setHeight(nearest);
    };

    const onPointerUp = (e: PointerEvent) => {
      if (!dragging) return;
      dragging = false;
      setIsDragging(false);
      snapTo(height);
      try {
        container.releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
    };

    container.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    return () => {
      container.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }, [open, height, SNAP_PEEK, SNAP_MID, SNAP_FULL, onClose]);

  // Determine nearest existing spot within 50m to show review count
  const { spots } = useMapSpots();
  const nearestSpot = useMemo(() => {
    try {
      if (!location) return null;
      let best: { id: string; dist: number } | null = null;
      const toRad = (v: number) => (v * Math.PI) / 180;
      const R = 6371000;
      for (const s of spots) {
        const dLat = toRad(s.location_lat - location.lat);
        const dLng = toRad(s.location_lng - location.lng);
        const lat1 = toRad(location.lat);
        const lat2 = toRad(s.location_lat);
        const a =
          Math.sin(dLat / 2) ** 2 +
          Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const dist = R * c;
        if (!best || dist < best.dist) best = { id: s.id, dist };
      }
      return best && best.dist <= 50 ? best : null;
    } catch (error) {
      console.error('Error calculating nearest spot:', error);
      return null;
    }
  }, [spots, location]);

  const targetSpotId = nearestSpot ? nearestSpot.id : null;
  const { reviews, loading: reviewsLoading } = useSpotReviews(targetSpotId);

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 pointer-events-none select-none">
      <div
        ref={sheetRef}
        className="mx-auto max-w-md pointer-events-auto bg-white rounded-t-2xl shadow-2xl border-t border-gray-200 relative"
        style={{
          height: `${open ? height : 0}px`,
          minHeight: open ? `${MIN_SHEET}px` : '0px',
          transition: isDragging
            ? 'none'
            : 'height 220ms cubic-bezier(0.2, 0.8, 0.2, 1)',
          touchAction: 'none',
          overflow: 'hidden',
        }}
        aria-live="polite"
        aria-label="場所の詳細"
      >
        <button
          type="button"
          aria-label="閉じる"
          onClick={onClose}
          className="absolute top-2 right-2 p-2 rounded-full hover:bg-gray-100 active:bg-gray-200"
        >
          <X className="w-5 h-5 text-gray-500" />
        </button>
        {/* drag handle */}
        <div className="flex justify-center pt-2 pb-1 cursor-grab active:cursor-grabbing">
          <div className="w-10 h-1.5 bg-gray-300 rounded-full" />
        </div>

        {/* scrollable content */}
        <div
          ref={contentRef}
          className="h-[calc(100%-20px)] overflow-y-auto px-4 sm:px-5 pb-4 bottom-sheet-scroll"
        >
          {/* place info */}
          <div className="mb-3">
            <div className="text-base font-semibold text-gray-900">
              {location.address || '未設定の場所'}
            </div>
            {/* 緯度経度は非表示 */}
            <div className="text-xs text-gray-500 mt-0.5">
              {reviewsLoading
                ? '口コミ 読み込み中…'
                : `口コミ ${reviews.length}件`}
            </div>
          </div>

          {/* rating (average) */}
          <div className="mb-4">
            <div className="text-sm font-medium text-gray-700 mb-2">
              評価（平均）
            </div>
            {(location?.average_rating ?? 0) > 0 ? (
              <div className="flex items-center gap-2">
                <div className="flex items-center">
                  {[1, 2, 3, 4, 5].map(star => (
                    <Star
                      key={star}
                      className={`w-5 h-5 ${
                        star <=
                        Math.round((location?.average_rating || 0) * 2) / 2
                          ? 'text-yellow-400 fill-current'
                          : 'text-gray-300'
                      }`}
                    />
                  ))}
                </div>
                <span className="text-sm text-gray-700">
                  {(location?.average_rating ?? 0).toFixed(1)} / 5.0
                </span>
              </div>
            ) : (
              <div className="text-sm text-gray-500">
                口コミはまだありません
              </div>
            )}
          </div>

          {/* actions */}
          <div className="grid grid-cols-2 gap-3 mt-2">
            <button
              onClick={onClickViewReviews}
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50"
            >
              <Eye className="w-5 h-5" />
              <span>口コミを見る</span>
            </button>
            <button
              onClick={onClickPostReview}
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-coral-500 text-white hover:bg-coral-600"
            >
              <MessageSquarePlus className="w-5 h-5" />
              <span>口コミを投稿する</span>
            </button>
          </div>

          <div className="h-6 safe-bottom" />
        </div>
      </div>
    </div>
  );
}
