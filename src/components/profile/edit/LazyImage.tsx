import { useState, useRef, useEffect } from 'react';
import { Loader2 } from 'lucide-react';

interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
  placeholder?: string;
  fallback?: string;
  onLoad?: () => void;
  onError?: () => void;
}

export default function LazyImage({
  src,
  alt,
  className = '',
  placeholder = '/placeholder-avatar.png',
  fallback = '/fallback-avatar.png',
  onLoad,
  onError,
}: LazyImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(placeholder);

  const imgRef = useRef<HTMLImageElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    // Intersection Observerの設定
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            setIsInView(true);
            // 一度表示されたら監視を停止
            if (observerRef.current) {
              observerRef.current.disconnect();
            }
          }
        });
      },
      {
        rootMargin: '50px', // 50px手前から読み込み開始
        threshold: 0.1,
      }
    );

    observerRef.current = observer;

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  useEffect(() => {
    if (isInView && src) {
      setCurrentSrc(src);
    }
  }, [isInView, src]);

  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    setHasError(true);
    if (fallback && fallback !== currentSrc) {
      setCurrentSrc(fallback);
    }
    onError?.();
  };

  return (
    <div className={`relative ${className}`}>
      {/* プレースホルダー */}
      {!isLoaded && !hasError && (
        <div className="absolute inset-0 bg-gray-200 rounded-lg flex items-center justify-center">
          <Loader2 className="w-6 h-6 text-gray-400 animate-spin" />
        </div>
      )}

      {/* 実際の画像 */}
      <img
        ref={imgRef}
        src={currentSrc}
        alt={alt}
        className={`w-full h-full object-cover rounded-lg transition-opacity duration-300 ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        }`}
        onLoad={handleLoad}
        onError={handleError}
        loading="lazy"
      />

      {/* エラー時のフォールバック */}
      {hasError && fallback && (
        <div className="absolute inset-0 bg-gray-100 rounded-lg flex items-center justify-center">
          <span className="text-gray-400 text-sm">
            画像を読み込めませんでした
          </span>
        </div>
      )}
    </div>
  );
}
