import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export const supabaseService = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function getCurrentAppUser() {
  const supabase = createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return { user: null, profile: null, responseStatus: 401 as const };
  }

  const { data: profile, error: profileError } = await supabaseService
    .from("profiles")
    .select("id, full_name, role, is_active")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || !profile) {
    return { user, profile: null, responseStatus: 403 as const };
  }

  if (profile.is_active === false) {
    await supabase.auth.signOut();
    return { user: null, profile, responseStatus: 403 as const };
  }

  return { user, profile, responseStatus: 200 as const };
}
