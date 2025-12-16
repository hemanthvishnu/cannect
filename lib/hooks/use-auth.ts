import { useEffect, useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { queryKeys } from "@/lib/query-client";
import type { Profile } from "@/lib/types/database";
import type { Session, User } from "@supabase/supabase-js";

// Auth state hook
export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  return {
    session,
    user: session?.user ?? null,
    isLoading,
    isAuthenticated: !!session,
  };
}

// Current user profile
export function useCurrentProfile() {
  const { user } = useAuth();

  return useQuery({
    queryKey: queryKeys.profiles.detail(user?.id ?? ""),
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (error) throw error;
      return data as Profile;
    },
    enabled: !!user,
  });
}

// Sign in with email
export function useSignIn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      email,
      password,
    }: {
      email: string;
      password: string;
    }) => {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.session });
    },
  });
}

// Sign up with email
export function useSignUp() {
  return useMutation({
    mutationFn: async ({
      email,
      password,
      username,
      name,
      displayName,
    }: {
      email: string;
      password: string;
      username: string;
      name?: string;
      displayName?: string;
    }) => {
      // Sign up the user with metadata
      // The database trigger will automatically create the profile
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username,
            display_name: displayName || name || username,
            avatar_url: `https://ui-avatars.com/api/?name=${encodeURIComponent(name || username)}&background=10B981&color=fff`,
          },
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("Failed to create user");

      // Check if email confirmation is required
      // If session is null but user exists, email confirmation is needed
      const needsEmailConfirmation = !authData.session && !!authData.user;

      // Profile is automatically created by database trigger (handle_new_user)
      // No manual insert needed!

      return { ...authData, needsEmailConfirmation };
    },
  });
}

// Sign out
export function useSignOut() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.clear();
    },
  });
}

// OAuth sign in
export function useOAuthSignIn() {
  return useMutation({
    mutationFn: async (provider: "google" | "apple" | "twitter") => {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: "cannect://auth/callback",
        },
      });

      if (error) throw error;
      return data;
    },
  });
}
