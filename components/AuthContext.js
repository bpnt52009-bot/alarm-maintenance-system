"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { getCurrentUser, fetchProfile } from "@/lib/auth";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    const refresh = async () => {
      const u = await getCurrentUser();
      setUser(u);
      if (u) setProfile(await fetchProfile(u.id));
      else setProfile(null);
    };

    refresh().finally(() => setLoading(false));

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id).then(setProfile);
      else setProfile(null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const isAdminUser = profile?.role === "Admin";

  return (
    <AuthContext.Provider value={{ loading, user, profile, isAdminUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth ต้องใช้งานภายใน <AuthProvider>");
  return ctx;
}