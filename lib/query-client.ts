import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes (formerly cacheTime)
      retry: 2,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 1,
    },
  },
});

// Query keys factory for type-safe query keys
export const queryKeys = {
  // Auth
  auth: {
    session: ["auth", "session"] as const,
    user: ["auth", "user"] as const,
  },
  
  // Profiles
  profiles: {
    all: ["profiles"] as const,
    detail: (id: string) => ["profiles", id] as const,
    byUsername: (username: string) => ["profiles", "username", username] as const,
  },
  
  // Posts / Feed
  posts: {
    all: ["posts"] as const,
    feed: (userId?: string) => ["posts", "feed", userId] as const,
    detail: (id: string) => ["posts", id] as const,
    byUser: (userId: string) => ["posts", "user", userId] as const,
    replies: (postId: string) => ["posts", "replies", postId] as const,
  },
  
  // Notifications
  notifications: {
    all: ["notifications"] as const,
    unreadCount: ["notifications", "unread"] as const,
  },
  
  // Search
  search: {
    users: (query: string) => ["search", "users", query] as const,
    posts: (query: string) => ["search", "posts", query] as const,
  },
  
  // Following / Followers
  follows: {
    followers: (userId: string) => ["follows", "followers", userId] as const,
    following: (userId: string) => ["follows", "following", userId] as const,
    isFollowing: (userId: string, targetId: string) =>
      ["follows", "isFollowing", userId, targetId] as const,
  },
};
