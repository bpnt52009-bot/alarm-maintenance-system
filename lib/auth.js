import { supabase } from "./supabaseClient";

/** ดึง user ที่ login อยู่ (หรือ null) */
export async function getCurrentUser() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

/** ดึง profile (role, email) ของ user */
export async function fetchProfile(userId) {
  if (!userId) return null;
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();
  if (error) return null;
  return data;
}

/** true ถ้าเป็น Admin */
export async function isAdmin(userId) {
  const profile = await fetchProfile(userId);
  return profile?.role === "Admin";
}

/** ออกจากระบบ */
export async function signOut() {
  const { error } = await supabase.auth.signOut();
  return { error };
}