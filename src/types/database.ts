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
          parent_comment_id: string | null;
          content: string;
          is_approved: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          post_id: string;
          author_id: string;
          parent_comment_id?: string | null;
          content: string;
          is_approved?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          post_id?: string;
          author_id?: string;
          parent_comment_id?: string | null;
          content?: string;
          is_approved?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      likes: {
        Row: {
          id: string;
          user_id: string;
          post_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          post_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          post_id?: string;
          created_at?: string;
        };
      };
      profile_details: {
        Row: {
          profile_id: string;
          bio: string | null;
          location_area: string | null;
          interests: string[] | null;
          languages: string[] | null;
          arrival_date: string | null;
          family_structure: string | null;
          privacy_settings: {
            profile_visible: boolean;
            posts_visible: boolean;
            activity_visible: boolean;
            contact_allowed: boolean;
          };
          created_at: string;
          updated_at: string;
        };
        Insert: {
          profile_id: string;
          bio?: string | null;
          location_area?: string | null;
          interests?: string[] | null;
          languages?: string[] | null;
          arrival_date?: string | null;
          family_structure?: string | null;
          privacy_settings?: {
            profile_visible?: boolean;
            posts_visible?: boolean;
            activity_visible?: boolean;
            contact_allowed?: boolean;
          };
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          profile_id?: string;
          bio?: string | null;
          location_area?: string | null;
          interests?: string[] | null;
          languages?: string[] | null;
          arrival_date?: string | null;
          family_structure?: string | null;
          privacy_settings?: {
            profile_visible?: boolean;
            posts_visible?: boolean;
            activity_visible?: boolean;
            contact_allowed?: boolean;
          };
          created_at?: string;
          updated_at?: string;
        };
      };
      notification_settings: {
        Row: {
          user_id: string;
          push_likes: boolean;
          push_comments: boolean;
          push_mentions: boolean;
          email_likes: boolean;
          email_comments: boolean;
          email_mentions: boolean;
          weekly_digest: boolean;
          important_updates: boolean;
          system_notifications: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          push_likes?: boolean;
          push_comments?: boolean;
          push_mentions?: boolean;
          email_likes?: boolean;
          email_comments?: boolean;
          email_mentions?: boolean;
          weekly_digest?: boolean;
          important_updates?: boolean;
          system_notifications?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          user_id?: string;
          push_likes?: boolean;
          push_comments?: boolean;
          push_mentions?: boolean;
          email_likes?: boolean;
          email_comments?: boolean;
          email_mentions?: boolean;
          weekly_digest?: boolean;
          important_updates?: boolean;
          system_notifications?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      system_notifications: {
        Row: {
          id: string;
          title: string;
          message: string;
          type: string;
          priority: string;
          expires_at: string | null;
          action_url: string | null;
          action_text: string | null;
          target_users: string[];
          total_recipients: number;
          delivered_count: number;
          read_count: number;
          status: string;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          message: string;
          type: string;
          priority?: string;
          expires_at?: string | null;
          action_url?: string | null;
          action_text?: string | null;
          target_users?: string[];
          total_recipients?: number;
          delivered_count?: number;
          read_count?: number;
          status?: string;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          message?: string;
          type?: string;
          priority?: string;
          expires_at?: string | null;
          action_url?: string | null;
          action_text?: string | null;
          target_users?: string[];
          total_recipients?: number;
          delivered_count?: number;
          read_count?: number;
          status?: string;
          created_by?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      notification_deliveries: {
        Row: {
          id: string;
          system_notification_id: string;
          recipient_id: string;
          user_notification_id: string;
          status: string;
          delivered_at: string | null;
          read_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          system_notification_id: string;
          recipient_id: string;
          user_notification_id: string;
          status?: string;
          delivered_at?: string | null;
          read_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          system_notification_id?: string;
          recipient_id?: string;
          user_notification_id?: string;
          status?: string;
          delivered_at?: string | null;
          read_at?: string | null;
          created_at?: string;
        };
      };
      notifications: {
        Row: {
          id: string;
          recipient_id: string;
          sender_id: string | null;
          type:
            | 'like'
            | 'comment'
            | 'mention'
            | 'system'
            | 'weekly_digest'
            | 'app_update'
            | 'system_maintenance'
            | 'feature_release'
            | 'community_event';
          title: string;
          message: string;
          metadata: Record<string, unknown>;
          related_post_id: string | null;
          related_comment_id: string | null;
          is_read: boolean;
          is_pushed: boolean;
          is_emailed: boolean;
          created_at: string;
          read_at: string | null;
          pushed_at: string | null;
          emailed_at: string | null;
          priority: 'low' | 'normal' | 'high' | 'urgent';
          expires_at: string | null;
          action_url: string | null;
          action_text: string | null;
        };
        Insert: {
          id?: string;
          recipient_id: string;
          sender_id?: string | null;
          type:
            | 'like'
            | 'comment'
            | 'mention'
            | 'system'
            | 'weekly_digest'
            | 'app_update'
            | 'system_maintenance'
            | 'feature_release'
            | 'community_event';
          title: string;
          message: string;
          metadata?: Record<string, unknown>;
          related_post_id?: string | null;
          related_comment_id?: string | null;
          is_read?: boolean;
          is_pushed?: boolean;
          is_emailed?: boolean;
          created_at?: string;
          read_at?: string | null;
          pushed_at?: string | null;
          emailed_at?: string | null;
          priority?: 'low' | 'normal' | 'high' | 'urgent';
          expires_at?: string | null;
          action_url?: string | null;
          action_text?: string | null;
        };
        Update: {
          id?: string;
          recipient_id?: string;
          sender_id?: string | null;
          type?:
            | 'like'
            | 'comment'
            | 'mention'
            | 'system'
            | 'weekly_digest'
            | 'app_update'
            | 'system_maintenance'
            | 'feature_release'
            | 'community_event';
          title?: string;
          message?: string;
          metadata?: Record<string, unknown>;
          related_post_id?: string | null;
          related_comment_id?: string | null;
          is_read?: boolean;
          is_pushed?: boolean;
          is_emailed?: boolean;
          created_at?: string;
          read_at?: string | null;
          pushed_at?: string | null;
          emailed_at?: string | null;
          priority?: 'low' | 'normal' | 'high' | 'urgent';
          expires_at?: string | null;
          action_url?: string | null;
          action_text?: string | null;
        };
      };
    };
  };
}
