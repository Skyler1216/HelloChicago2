import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export interface CommunityInfo {
  totalMembers: number;
}

export function useCommunityInfo() {
  const [communityInfo, setCommunityInfo] = useState<CommunityInfo | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function fetchCommunityInfo() {
      try {
        setLoading(true);
        setError(null);

        // 総メンバー数を取得
        const { count: totalMembers, error: membersError } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('is_approved', true);

        // エラーチェック
        if (membersError) throw membersError;

        // コンポーネントがマウントされている場合のみ状態を更新
        if (isMounted) {
          setCommunityInfo({
            totalMembers: totalMembers || 0,
          });
        }
      } catch (err) {
        console.error('コミュニティ情報の取得に失敗:', err);
        if (isMounted) {
          setError(
            err instanceof Error ? err.message : '不明なエラーが発生しました'
          );
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchCommunityInfo();

    // クリーンアップ関数
    return () => {
      isMounted = false;
    };
  }, []);

  return { communityInfo, loading, error };
}
