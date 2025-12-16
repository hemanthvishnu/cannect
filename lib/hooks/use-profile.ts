import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/query-client";
import type { Profile } from "@/lib/types/database";

// Fetch profile by ID
export function useProfile(userId: string) {
  return useQuery({
    queryKey: queryKeys.profiles.detail(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();

      if (error) throw error;
      return data as Profile;
    },
    enabled: !!userId,
  });
}

// Update profile
export function useUpdateProfile() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Profile> }) => {
      const { error } = await supabase
        .from("profiles")
        .update(updates)
        .eq("id", id);
      
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.profiles.detail(variables.id) 
      });
    },
  });
}

// Fetch profile by username
export function useProfileByUsername(username: string) {
  return useQuery({
    queryKey: queryKeys.profiles.byUsername(username),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("username", username)
        .single();

      if (error) throw error;
      return data as Profile;
    },
    enabled: !!username,
  });
}

// Check if current user follows target user
export function useIsFollowing(targetUserId: string) {
  return useQuery({
    queryKey: queryKeys.follows.isFollowing("current", targetUserId),
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return false;
      const user = session.user;

      const { data, error } = await supabase
        .from("follows")
        .select("id")
        .eq("follower_id", user.id)
        .eq("following_id", targetUserId)
        .maybeSingle();

      if (error) throw error;
      return !!data;
    },
    enabled: !!targetUserId,
  });
}

// Follow a user
export function useFollowUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (targetUserId: string) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error("Not authenticated");
      const user = session.user;

      const { error } = await supabase.from("follows").insert({
        follower_id: user.id,
        following_id: targetUserId,
      });

      if (error) throw error;
      return targetUserId;
    },
    onSuccess: (targetUserId) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.follows.isFollowing("current", targetUserId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.profiles.detail(targetUserId),
      });
    },
  });
}

// Unfollow a user
export function useUnfollowUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (targetUserId: string) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error("Not authenticated");
      const user = session.user;

      const { error } = await supabase
        .from("follows")
        .delete()
        .eq("follower_id", user.id)
        .eq("following_id", targetUserId);

      if (error) throw error;
      return targetUserId;
    },
    onSuccess: (targetUserId) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.follows.isFollowing("current", targetUserId),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.profiles.detail(targetUserId),
      });
    },
  });
}

// Get followers
export function useFollowers(userId: string) {
  return useQuery({
    queryKey: queryKeys.follows.followers(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("follows")
        .select(`
          *,
          follower:profiles!follower_id(*)
        `)
        .eq("following_id", userId);

      if (error) throw error;
      return data.map((f) => f.follower) as Profile[];
    },
    enabled: !!userId,
  });
}

// Get following
export function useFollowing(userId: string) {
  return useQuery({
    queryKey: queryKeys.follows.following(userId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("follows")
        .select(`
          *,
          following:profiles!following_id(*)
        `)
        .eq("follower_id", userId);

      if (error) throw error;
      return data.map((f) => f.following) as Profile[];
    },
    enabled: !!userId,
  });
}

// Search users by name or username
export function useSearchUsers(query: string) {
  return useQuery({
    queryKey: ["profiles", "search", query],
    queryFn: async () => {
      if (!query || query.length < 2) return [];
      
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .or(`username.ilike.%${query}%,display_name.ilike.%${query}%`)
        .limit(20);

      if (error) throw error;
      return data as Profile[];
    },
    enabled: query.length >= 2,
  });
}
