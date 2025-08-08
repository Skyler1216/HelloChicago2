export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          name: string;
          email: string;
          avatar_url: string | null;
          is_approved: boolean;
          role: 'user' | 'admin';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          name: string;
          email: string;
          avatar_url?: string | null;
          is_approved?: boolean;
          role?: 'user' | 'admin';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          email?: string;
          avatar_url?: string | null;
          is_approved?: boolean;
          role?: 'user' | 'admin';
          created_at?: string;
          updated_at?: string;
        };
      };
      categories: {
        Row: {
          id: string;
          name: string;
          name_ja: string;
          icon: string;
          color: string;
        };
        Insert: {
          id: string;
          name: string;
          name_ja: string;
          icon: string;
          color: string;
        };
        Update: {
          id?: string;
          name?: string;
          name_ja?: string;
          icon?: string;
          color?: string;
        };
      };
      posts: {
        Row: {
          id: string;
          title: string;
          content: string;
          summary: string | null;
          type: 'post' | 'consultation' | 'transfer';
          status: 'open' | 'in_progress' | 'closed' | null;
          category_id: string;
          location_lat: number;
          location_lng: number;
          location_address: string;
          images: string[];
          author_id: string;
          likes: number;
          replies: number;
          approved: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          content: string;
          summary?: string | null;
          type: 'post' | 'consultation' | 'transfer';
          status?: 'open' | 'in_progress' | 'closed' | null;
          category_id: string;
          location_lat: number;
          location_lng: number;
          location_address: string;
          images?: string[];
          author_id: string;
          likes?: number;
          replies?: number;
          approved?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          content?: string;
          summary?: string | null;
          type?: 'post' | 'consultation' | 'transfer';
          status?: 'open' | 'in_progress' | 'closed' | null;
          category_id?: string;
          location_lat?: number;
          location_lng?: number;
          location_address?: string;
          images?: string[];
          author_id?: string;
          likes?: number;
          replies?: number;
          approved?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      comments: {
        Row: {
          id: string;
          post_id: string;
          author_id: string;
          content: string;
          parent_id: string | null;
          approved: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          post_id: string;
          author_id: string;
          content: string;
          parent_id?: string | null;
          approved?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          post_id?: string;
          author_id?: string;
          content?: string;
          parent_id?: string | null;
          approved?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
}
