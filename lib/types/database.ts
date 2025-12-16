export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          username: string;
          display_name: string | null;
          avatar_url: string | null;
          bio: string | null;
          website: string | null;
          followers_count: number;
          following_count: number;
          posts_count: number;
          is_verified: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          username: string;
          display_name?: string | null;
          avatar_url?: string | null;
          bio?: string | null;
          website?: string | null;
          followers_count?: number;
          following_count?: number;
          posts_count?: number;
          is_verified?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          username?: string;
          display_name?: string | null;
          avatar_url?: string | null;
          bio?: string | null;
          website?: string | null;
          followers_count?: number;
          following_count?: number;
          posts_count?: number;
          is_verified?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      posts: {
        Row: {
          id: string;
          user_id: string;
          content: string;
          media_urls: string[] | null;
          likes_count: number;
          comments_count: number;
          reposts_count: number;
          is_reply: boolean;
          reply_to_id: string | null;
          is_repost: boolean;
          repost_of_id: string | null;
          type: 'post' | 'repost' | 'quote';
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          content: string;
          media_urls?: string[] | null;
          likes_count?: number;
          comments_count?: number;
          reposts_count?: number;
          is_reply?: boolean;
          reply_to_id?: string | null;
          is_repost?: boolean;
          repost_of_id?: string | null;
          type?: 'post' | 'repost' | 'quote';
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          content?: string;
          media_urls?: string[] | null;
          likes_count?: number;
          comments_count?: number;
          reposts_count?: number;
          is_reply?: boolean;
          reply_to_id?: string | null;
          is_repost?: boolean;
          repost_of_id?: string | null;
          type?: 'post' | 'repost' | 'quote';
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
      follows: {
        Row: {
          id: string;
          follower_id: string;
          following_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          follower_id: string;
          following_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          follower_id?: string;
          following_id?: string;
          created_at?: string;
        };
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          actor_id: string;
          type: "like" | "follow" | "comment" | "repost" | "mention";
          post_id: string | null;
          is_read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          actor_id: string;
          type: "like" | "follow" | "comment" | "repost" | "mention";
          post_id?: string | null;
          is_read?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          actor_id?: string;
          type?: "like" | "follow" | "comment" | "repost" | "mention";
          post_id?: string | null;
          is_read?: boolean;
          created_at?: string;
        };
      };
    };
    Views: {};
    Functions: {};
    Enums: {};
  };
}

// Helper types
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Post = Database["public"]["Tables"]["posts"]["Row"];
export type Like = Database["public"]["Tables"]["likes"]["Row"];
export type Follow = Database["public"]["Tables"]["follows"]["Row"];
export type Notification = Database["public"]["Tables"]["notifications"]["Row"];

// Extended types with relations
export type PostWithAuthor = Post & {
  author: Profile;
  is_liked?: boolean;
  quoted_post?: (Post & { author: Profile }) | null;
};

export type NotificationWithActor = Notification & {
  actor: Profile;
  post?: Post;
};
