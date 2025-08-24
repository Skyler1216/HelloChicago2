import { useEffect, useMemo, useRef, useState } from 'react';
import { Star, Eye, MessageSquarePlus, X } from 'lucide-react';
import { useMapSpots } from '../../hooks/useMapSpots';
import { useCategories } from '../../hooks/useCategories';

interface SpotBottomSheetProps {
  open: boolean;
  onClose: () => void;
  location: {
    lat: number;
    lng: number;
    address?: string;
    average_rating?: number;
    category_hints?: string[];
  } | null;
  onClickPostReview: () => void;
  onClickViewReviews: (args: {
    spotId: string | null;
    location: { lat: number; lng: number; address?: string } | null;
  }) => void;
}

export default function SpotBottomSheet({
  open,
  onClose,
  location,
  onClickPostReview,
  onClickViewReviews,
}: SpotBottomSheetProps) {
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
  const { categories } = useCategories();
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
  const nearestSpotObj = useMemo(
    () => spots.find(s => s.id === targetSpotId) || null,
    [spots, targetSpotId]
  );
  const myExistingRating = useMemo(() => {
    const v = nearestSpotObj?.user_rating;
    return typeof v === 'number' ? v : null;
  }, [nearestSpotObj]);

  // 星表示用の平均値は、近接スポットの値を優先し、なければロケーションの推定値
  const displayAverage = useMemo(() => {
    const avgFromSpot = nearestSpotObj?.average_rating;
    if (typeof avgFromSpot === 'number') return avgFromSpot;
    return typeof location?.average_rating === 'number'
      ? location.average_rating
      : 0;
  }, [nearestSpotObj?.average_rating, location?.average_rating]);

  // Provider-based categories via Mapbox Geocoding for better accuracy
  const [providerCategories, setProviderCategories] = useState<string[] | null>(
    null
  );
  const [resolvedAddress, setResolvedAddress] = useState<string>('');
  const [providerLoading, setProviderLoading] = useState(false);
  // Fallback reverse geocoding (OSM) to ensure we have an address line (English)
  useEffect(() => {
    if (!open || !location) return;
    // If we already have a resolved address different from the POI name, skip
    if (resolvedAddress && resolvedAddress !== location.address) return;
    const controller = new AbortController();
    const run = async () => {
      try {
        const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${location.lat}&lon=${location.lng}&accept-language=en`;
        const res = await fetch(url, {
          signal: controller.signal,
          headers: { Accept: 'application/json' },
        });
        if (!res.ok) return;
        const json = await res.json();
        const display = (json?.display_name as string) || '';
        if (display && display !== location.address) {
          setResolvedAddress(display);
        }
      } catch {
        // ignore
      }
    };
    run();
    return () => controller.abort();
  }, [open, location?.lat, location?.lng, location?.address, resolvedAddress]);
  useEffect(() => {
    const token = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN as
      | string
      | undefined;
    if (!open || !location) {
      setProviderCategories(null);
      setResolvedAddress(location?.address || '');
      return;
    }
    if (!token) {
      setProviderCategories(null);
      setResolvedAddress(location.address || '');
      return;
    }
    const controller = new AbortController();
    const fetchCategories = async () => {
      try {
        setProviderLoading(true);
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${location.lng},${location.lat}.json?types=poi&limit=1&language=en&access_token=${encodeURIComponent(
          token
        )}`;
        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) throw new Error(`Geocoding failed: ${res.status}`);
        const json = await res.json();
        const feature = json?.features?.[0];
        const props = (feature?.properties || {}) as Record<string, unknown>;
        const placeName = (feature?.place_name as string) || '';
        const poiName =
          (feature?.text as string) ||
          (props['name_ja'] as string) ||
          (props['name'] as string) ||
          '';
        let addressLine = placeName || '';
        if (poiName && addressLine) {
          const escape = (s: string) =>
            s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const regex = new RegExp('^' + escape(poiName) + '\\s*,\\s*', 'i');
          addressLine = addressLine.replace(regex, '').trim();
        }
        setResolvedAddress(addressLine || location.address || '');
        const list: string[] = [];
        const addFrom = (v: unknown) => {
          if (!v) return;
          if (Array.isArray(v)) {
            for (const x of v) if (x) list.push(String(x));
          } else if (typeof v === 'string') {
            v.split(',')
              .map(s => s.trim())
              .filter(Boolean)
              .forEach(s => list.push(s));
          }
        };
        addFrom(props['category']);
        // Some tiles expose additional arrays
        addFrom((props as never)['poi_category']);
        addFrom((props as never)['poi_category_ids']);
        if (props['maki']) list.push(String(props['maki']));
        setProviderCategories(list.length > 0 ? list : null);
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          setProviderCategories(null);
          setResolvedAddress(location.address || '');
        }
      } finally {
        setProviderLoading(false);
      }
    };
    fetchCategories();
    return () => controller.abort();
  }, [open, location?.lat, location?.lng, location]);

  // Strict mapping: provider categories and hints only, precedence by rule
  const suggestedCategoryId = useMemo(() => {
    if (categories.length === 0) return null;
    const tokens = [
      ...(providerCategories || []),
      ...(location?.category_hints || []),
      location?.address || '',
    ]
      .filter(Boolean)
      .map(v => String(v).toLowerCase());

    const hasAny = (arr: string[]) =>
      arr.some(k => tokens.some(t => t.includes(k)));

    const findById = (id: string) =>
      categories.find(c => c.id === id)?.id || null;
    const findByName = (ja: string) =>
      categories.find(c => (c.name_ja || '').includes(ja))?.id || null;
    const pick = (id: string, jaFallback: string) =>
      findById(id) || findByName(jaFallback);

    // Precedence to avoid common misclassifications
    // 1) Hotels/Lodging -> Other
    if (
      hasAny(['hotel', 'lodging', '旅館', 'ホテル', 'inn', 'hostel', 'motel'])
    ) {
      return pick('other', 'その他');
    }
    // 2) Parks (公園) before sports
    if (hasAny(['park', '公園'])) {
      return pick('park', '公園');
    }
    // 3) Sports/Gym
    if (
      hasAny([
        'gym',
        'fitness',
        'スポーツ',
        '運動',
        'ジム',
        'フィットネス',
        'ヨガ',
        'stadium',
        'arena',
        'tennis',
        'soccer',
        'basketball',
      ])
    ) {
      return pick('sports', 'スポーツ');
    }
    // 4) School/Education
    if (hasAny(['school', '大学', '学校', '幼稚園', 'college', 'university'])) {
      return pick('school', '学校');
    }
    // 5) Children (nursery etc.)
    if (hasAny(['nursery', 'kindergarten', '保育', '子ども', '子供', 'kids'])) {
      return pick('children', '子ども');
    }
    // 6) Medical
    if (
      hasAny([
        'hospital',
        'clinic',
        'dentist',
        'pharmacy',
        '病院',
        'クリニック',
        '歯科',
        '薬局',
      ])
    ) {
      return pick('hospital', '病院');
    }
    // 7) Restaurant/Cafe (lower priority)
    if (
      hasAny([
        'restaurant',
        'cafe',
        'coffee',
        '喫茶',
        'レストラン',
        '居酒屋',
        '寿司',
        'ラーメン',
        'bar',
        'bakery',
      ])
    ) {
      return pick('restaurant', 'レストラン');
    }
    // 8) Shopping
    if (
      hasAny([
        'supermarket',
        'grocery',
        'convenience',
        'market',
        'shopping',
        'store',
        'mall',
        'コンビニ',
        'スーパー',
      ])
    ) {
      return pick('shopping', '買い物');
    }
    // 9) Beauty
    if (
      hasAny(['beauty', 'salon', 'hair', 'barber', '美容', '美容院', 'サロン'])
    ) {
      return pick('beauty', '美容');
    }
    // 10) Library
    if (hasAny(['library', '図書館'])) {
      return pick('library', '図書館');
    }
    return null;
  }, [
    providerCategories,
    location?.category_hints,
    location?.address,
    categories,
  ]);

  const displayCategoryName = useMemo(() => {
    const id = nearestSpotObj?.category_id || suggestedCategoryId;
    if (!id) return null;
    return categories.find(c => c.id === id)?.name_ja || null;
  }, [nearestSpotObj?.category_id, suggestedCategoryId, categories]);

  if (!open || !location) return null;

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
            {/* 住所コピー */}
            <div className="mt-1 flex items-center gap-2">
              <input
                readOnly
                value={
                  resolvedAddress ||
                  `${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}`
                }
                onFocus={e => e.currentTarget.select()}
                className="flex-1 text-xs text-gray-700 bg-gray-50 border border-gray-200 rounded-md px-2 py-1"
              />
              <button
                type="button"
                onClick={() => {
                  const text =
                    resolvedAddress || `${location.lat}, ${location.lng}`;
                  navigator.clipboard.writeText(text);
                }}
                className="text-xs px-2 py-1 rounded-md bg-coral-50 text-coral-700 hover:bg-coral-100 border border-coral-100"
              >
                コピー
              </button>
            </div>
            {displayCategoryName && (
              <div className="mt-2 text-xs text-gray-700">
                カテゴリ: {displayCategoryName}
                {!nearestSpotObj?.category_id && '（候補）'}
              </div>
            )}
          </div>

          {/* rating (average) */}
          <div className="mb-4">
            <div className="text-sm font-medium text-gray-700 mb-2">
              評価（平均）
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center">
                {[1, 2, 3, 4, 5].map(star => (
                  <Star
                    key={star}
                    className={`w-5 h-5 ${
                      star <= Math.round((displayAverage || 0) * 2) / 2
                        ? 'text-yellow-400 fill-current'
                        : 'text-gray-300'
                    }`}
                  />
                ))}
              </div>
              <span className="text-sm text-gray-700">
                {(displayAverage ?? 0).toFixed(1)} / 5.0
              </span>
              {/* 口コミ件数は重複するため非表示 */}
              {providerLoading && (
                <span className="text-xs text-gray-400">
                  ・ カテゴリ解析中…
                </span>
              )}
            </div>
          </div>

          {/* actions */}
          <div className="grid grid-cols-2 gap-3 mt-2">
            <button
              onClick={() =>
                onClickViewReviews({ spotId: targetSpotId, location })
              }
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 whitespace-nowrap"
            >
              <Eye className="w-5 h-5 flex-shrink-0 text-gray-700" />
              <span className="whitespace-nowrap">口コミを見る</span>
            </button>
            <button
              onClick={onClickPostReview}
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-coral-500 text-white hover:bg-coral-600 whitespace-nowrap"
            >
              <MessageSquarePlus className="w-5 h-5 flex-shrink-0 text-white" />
              <span className="whitespace-nowrap">
                {myExistingRating ? '口コミを編集する' : '口コミを投稿する'}
              </span>
            </button>
          </div>

          <div className="h-6 safe-bottom" />
        </div>
      </div>
    </div>
  );
}
