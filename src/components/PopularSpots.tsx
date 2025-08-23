import { TrendingUp, MapPin, Users, Calendar } from 'lucide-react';

interface Spot {
  location: string;
  lat: number;
  lng: number;
  address: string;
  posts: Array<{
    id: string;
    title: string;
    category_id?: string;
    created_at: string;
  }>;
  postCount: number;
  categories: Set<string>;
}

interface PopularSpotsProps {
  spots: Spot[];
  onSpotSelect?: (spot: Spot) => void;
}

export default function PopularSpots({
  spots,
  onSpotSelect,
}: PopularSpotsProps) {
  if (spots.length === 0) {
    return (
      <div className="px-4 py-6">
        <div className="text-center py-8">
          <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            スポットが見つかりません
          </h3>
          <p className="text-gray-500 text-sm">
            このエリアにはまだ投稿がありません
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-6">
      <div className="flex items-center space-x-2 mb-4">
        <TrendingUp className="w-5 h-5 text-coral-600" />
        <h2 className="text-lg font-bold text-gray-900">人気スポット</h2>
        <span className="text-sm text-gray-500">({spots.length}件)</span>
      </div>

      <div className="space-y-3">
        {spots.map((spot, index) => {
          // 最新の投稿を取得
          const latestPost = spot.posts.sort(
            (a, b) =>
              new Date(b.created_at).getTime() -
              new Date(a.created_at).getTime()
          )[0];

          // カテゴリの色を決定（最初のカテゴリを使用）
          const categoryColor =
            index < 3 ? ['#FF6B6B', '#4ECDC4', '#45B7D1'][index] : '#6B7280';

          return (
            <div
              key={spot.location}
              onClick={() => onSpotSelect?.(spot)}
              className={`bg-white rounded-xl p-4 border border-gray-100 hover:shadow-md transition-all duration-200 cursor-pointer ${
                onSpotSelect ? 'hover:border-coral-300 hover:scale-[1.02]' : ''
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div
                    className="flex items-center justify-center w-10 h-10 rounded-lg text-white font-bold text-lg"
                    style={{ backgroundColor: categoryColor }}
                  >
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 text-sm mb-1">
                      {spot.address ||
                        `${spot.lat.toFixed(4)}, ${spot.lng.toFixed(4)}`}
                    </h3>
                    {latestPost && (
                      <p className="text-xs text-gray-600 line-clamp-1">
                        {latestPost.title}
                      </p>
                    )}
                  </div>
                </div>

                <div className="text-right">
                  <div className="flex items-center space-x-1 text-xs text-gray-500 mb-1">
                    <Users className="w-3 h-3" />
                    <span>{spot.postCount}件</span>
                  </div>
                  {latestPost && (
                    <div className="flex items-center space-x-1 text-xs text-gray-400">
                      <Calendar className="w-3 h-3" />
                      <span>
                        {new Date(latestPost.created_at).toLocaleDateString(
                          'ja-JP',
                          {
                            month: 'short',
                            day: 'numeric',
                          }
                        )}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* カテゴリタグ */}
              <div className="flex flex-wrap gap-2">
                {Array.from(spot.categories)
                  .slice(0, 3)
                  .map(categoryId => (
                    <span
                      key={categoryId}
                      className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full"
                    >
                      {categoryId}
                    </span>
                  ))}
                {spot.categories.size > 3 && (
                  <span className="px-2 py-1 bg-gray-100 text-gray-500 text-xs rounded-full">
                    +{spot.categories.size - 3}
                  </span>
                )}
              </div>

              {/* アクションボタン */}
              {onSpotSelect && (
                <div className="mt-3 pt-3 border-t border-gray-100">
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      onSpotSelect(spot);
                    }}
                    className="w-full flex items-center justify-center space-x-2 py-2 px-4 bg-coral-50 text-coral-700 rounded-lg hover:bg-coral-100 transition-colors text-sm font-medium"
                  >
                    <MapPin className="w-4 h-4" />
                    <span>地図で見る</span>
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* エリア統計は非表示（要望により削除） */}
    </div>
  );
}
