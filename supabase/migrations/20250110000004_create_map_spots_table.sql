-- マップ専用のスポットテーブルを作成
CREATE TABLE IF NOT EXISTS map_spots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category_id TEXT REFERENCES categories(id),
  location_lat DECIMAL(10, 8) NOT NULL,
  location_lng DECIMAL(11, 8) NOT NULL,
  location_address TEXT,
  created_by UUID REFERENCES profiles(id) NOT NULL,
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- スポットのお気に入りテーブル
CREATE TABLE IF NOT EXISTS spot_favorites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  spot_id UUID REFERENCES map_spots(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(spot_id, user_id)
);

-- スポットの評価テーブル
CREATE TABLE IF NOT EXISTS spot_ratings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  spot_id UUID REFERENCES map_spots(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5) NOT NULL,
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(spot_id, user_id)
);

-- スポットのメモ・コメントテーブル
CREATE TABLE IF NOT EXISTS spot_notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  spot_id UUID REFERENCES map_spots(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  note TEXT NOT NULL,
  is_private BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- インデックスを作成
CREATE INDEX IF NOT EXISTS idx_map_spots_location ON map_spots(location_lat, location_lng);
CREATE INDEX IF NOT EXISTS idx_map_spots_category ON map_spots(category_id);
CREATE INDEX IF NOT EXISTS idx_map_spots_created_by ON map_spots(created_by);
CREATE INDEX IF NOT EXISTS idx_spot_favorites_user ON spot_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_spot_ratings_spot ON spot_ratings(spot_id);
CREATE INDEX IF NOT EXISTS idx_spot_notes_spot ON spot_notes(spot_id);

-- RLSポリシーを設定
ALTER TABLE map_spots ENABLE ROW LEVEL SECURITY;
ALTER TABLE spot_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE spot_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE spot_notes ENABLE ROW LEVEL SECURITY;

-- map_spotsのポリシー
CREATE POLICY "map_spots_select_policy" ON map_spots
  FOR SELECT USING (is_public = true OR created_by = auth.uid());

CREATE POLICY "map_spots_insert_policy" ON map_spots
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "map_spots_update_policy" ON map_spots
  FOR UPDATE USING (auth.uid() = created_by);

CREATE POLICY "map_spots_delete_policy" ON map_spots
  FOR DELETE USING (auth.uid() = created_by);

-- spot_favoritesのポリシー
CREATE POLICY "spot_favorites_select_policy" ON spot_favorites
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "spot_favorites_insert_policy" ON spot_favorites
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "spot_favorites_delete_policy" ON spot_favorites
  FOR DELETE USING (auth.uid() = user_id);

-- spot_ratingsのポリシー
CREATE POLICY "spot_ratings_select_policy" ON spot_ratings
  FOR SELECT USING (true);

CREATE POLICY "spot_ratings_insert_policy" ON spot_ratings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "spot_ratings_update_policy" ON spot_ratings
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "spot_ratings_delete_policy" ON spot_ratings
  FOR DELETE USING (auth.uid() = user_id);

-- spot_notesのポリシー
CREATE POLICY "spot_notes_select_policy" ON spot_notes
  FOR SELECT USING (is_private = false OR auth.uid() = user_id);

CREATE POLICY "spot_notes_insert_policy" ON spot_notes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "spot_notes_update_policy" ON spot_notes
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "spot_notes_delete_policy" ON spot_notes
  FOR DELETE USING (auth.uid() = user_id);

-- 更新日時を自動更新するトリガー関数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- トリガーを作成
CREATE TRIGGER update_map_spots_updated_at BEFORE UPDATE ON map_spots
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_spot_ratings_updated_at BEFORE UPDATE ON spot_ratings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_spot_notes_updated_at BEFORE UPDATE ON spot_notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
