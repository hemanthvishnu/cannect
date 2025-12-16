import { create } from "zustand";
import type { Session, User } from "@supabase/supabase-js";
import type { Profile } from "@/lib/types/database";

interface AuthState {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  
  // Actions
  setSession: (session: Session | null) => void;
  setProfile: (profile: Profile | null) => void;
  setLoading: (loading: boolean) => void;
  clear: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  user: null,
  profile: null,
  isLoading: true,
  isAuthenticated: false,
  
  setSession: (session) =>
    set({
      session,
      user: session?.user ?? null,
      isAuthenticated: !!session,
      isLoading: false,
    }),
    
  setProfile: (profile) => set({ profile }),
  
  setLoading: (isLoading) => set({ isLoading }),
  
  clear: () =>
    set({
      session: null,
      user: null,
      profile: null,
      isAuthenticated: false,
    }),
}));
