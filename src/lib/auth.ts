import { createClient } from "@/lib/supabase-server";

export async function getCurrentUserProfile() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { user: null, profile: null };
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, nombre, email, role")
    .eq("id", user.id)
    .single();

  if (error || !profile) {
    return { user: null, profile: null };
  }

  return { user, profile };
}