-- プロフィール詳細情報テーブルの作成
CREATE TABLE profile_details (
  profile_id uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  bio text,
  location_area text,
  interests text[],
  languages text[],
  arrival_date date,
  family_structure text,
  privacy_settings jsonb DEFAULT '{"profile_visible": true, "posts_visible": true, "activity_visible": false, "contact_allowed": true}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- RLS (Row Level Security) ポリシーの設定
ALTER TABLE profile_details ENABLE ROW LEVEL SECURITY;

-- 自分の詳細情報は読み書き可能
CREATE POLICY "Users can view own profile details" ON profile_details
  FOR SELECT USING (auth.uid() = profile_id);

CREATE POLICY "Users can update own profile details" ON profile_details
  FOR UPDATE USING (auth.uid() = profile_id);

CREATE POLICY "Users can insert own profile details" ON profile_details
  FOR INSERT WITH CHECK (auth.uid() = profile_id);

-- 他のユーザーの詳細情報は、プライバシー設定に応じて表示
CREATE POLICY "Users can view others profile details based on privacy" ON profile_details
  FOR SELECT USING (
    auth.uid() != profile_id AND 
    (privacy_settings->>'profile_visible')::boolean = true
  );

-- updated_at自動更新トリガー
CREATE OR REPLACE FUNCTION update_profile_details_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profile_details_updated_at
  BEFORE UPDATE ON profile_details
  FOR EACH ROW
  EXECUTE FUNCTION update_profile_details_updated_at();

-- インデックスの作成
CREATE INDEX idx_profile_details_profile_id ON profile_details(profile_id);
CREATE INDEX idx_profile_details_location_area ON profile_details(location_area);
CREATE INDEX idx_profile_details_arrival_date ON profile_details(arrival_date);

-- profile_detailsテーブル用のコメント
COMMENT ON TABLE profile_details IS 'ユーザーの詳細プロフィール情報';
COMMENT ON COLUMN profile_details.bio IS '自己紹介文';
COMMENT ON COLUMN profile_details.location_area IS '居住エリア（例：ダウンタウン、郊外等）';
COMMENT ON COLUMN profile_details.interests IS '趣味・関心事のリスト';
COMMENT ON COLUMN profile_details.languages IS '話せる言語のリスト';
COMMENT ON COLUMN profile_details.arrival_date IS 'シカゴ到着日';
COMMENT ON COLUMN profile_details.family_structure IS '家族構成';
COMMENT ON COLUMN profile_details.privacy_settings IS 'プライバシー設定（JSON形式）';
