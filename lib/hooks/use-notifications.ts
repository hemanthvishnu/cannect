import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

interface Notification {
  id: string;
  user_id: string;
  actor_id: string;
  type: "like" | "comment" | "follow" | "repost";
  post_id?: string;
  is_read: boolean;
  created_at: string;
  actor?: {
    id: string;
    display_name: string;
    username: string;
    avatar_url?: string;
  };
}

// Fetch user's notifications
export function useNotifications() {
  return useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return [];
      const user = session.user;

      const { data, error } = await supabase
        .from("notifications")
        .select(`
          *,
          actor:profiles!actor_id(id, display_name, username, avatar_url)
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as Notification[];
    },
  });
}

// Get unread notification count
export function useUnreadNotificationCount() {
  return useQuery({
    queryKey: ["notifications", "unread-count"],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return 0;
      const user = session.user;

      const { count, error } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_read", false);

      if (error) throw error;
      return count || 0;
    },
  });
}

// Mark notifications as read
export function useMarkNotificationsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationIds?: string[]) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error("Not authenticated");
      const user = session.user;

      let query = supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", user.id);

      if (notificationIds && notificationIds.length > 0) {
        query = query.in("id", notificationIds);
      }

      const { error } = await query;
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}
