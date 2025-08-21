export interface MapSpot {
  id: string;
  name: string;
  description?: string;
  category_id?: string;
  location_lat: number;
  location_lng: number;
  location_address?: string;
  created_by: string;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export interface SpotFavorite {
  id: string;
  spot_id: string;
  user_id: string;
  created_at: string;
}

export interface SpotRating {
  id: string;
  spot_id: string;
  user_id: string;
  rating: number; // 1-5
  comment?: string;
  created_at: string;
  updated_at: string;
}

export interface SpotNote {
  id: string;
  spot_id: string;
  user_id: string;
  note: string;
  is_private: boolean;
  created_at: string;
  updated_at: string;
}

export interface MapSpotWithDetails extends MapSpot {
  category?: {
    id: string;
    name: string;
    name_ja: string;
    icon: string;
    color: string;
  };
  favorites_count: number;
  average_rating: number;
  user_rating?: number;
  user_favorite?: boolean;
  user_notes?: SpotNote[];
}

export interface CreateMapSpotData {
  name: string;
  description?: string;
  category_id?: string;
  location_lat: number;
  location_lng: number;
  location_address?: string;
  is_public?: boolean;
}

export interface UpdateMapSpotData {
  name?: string;
  description?: string;
  category_id?: string;
  is_public?: boolean;
}

export interface CreateSpotRatingData {
  spot_id: string;
  rating: number;
  comment?: string;
}

export interface CreateSpotNoteData {
  spot_id: string;
  note: string;
  is_private?: boolean;
}

// マップ関連の新しい型定義
export interface Post {
  id: string;
  title: string;
  content: string;
  summary?: string | null;
  location_lat: number;
  location_lng: number;
  location_address?: string;
  category_id: string;
  created_at: string;
}

export interface Location {
  lat: number;
  lng: number;
  address?: string;
}

export interface MapConfig {
  center: [number, number];
  zoom: number;
  minZoom: number;
  maxZoom: number;
  style: string;
}

export interface CategoryInfo {
  color: string;
  name_ja: string;
}
