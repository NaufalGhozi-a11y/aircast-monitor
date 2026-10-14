import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export type AppRole = "admin" | "user";

export type AppProfile = {
  id: string;
  full_name: string | null;
  role: AppRole;
  is_active: boolean;
};

export const supabaseService = createSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

export async function getCurrentAppUser() {
  // Periksa sesi login menggunakan cookie pengguna.
  const supabase = createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      user: null,
      profile: null,
      responseStatus: 401 as const,
    };
  }

  // Ambil profil menggunakan service role di sisi server.
  const { data: profile, error: profileError } =
    await supabaseService
      .from("profiles")
      .select("id, full_name, role, is_active")
      .eq("id", user.id)
      .maybeSingle();

  if (profileError || !profile) {
    return {
      user: null,
      profile: null,
      responseStatus: 403 as const,
    };
  }

  // Tolak akses jika akun dinonaktifkan.
  if (profile.is_active !== true) {
    await supabase.auth.signOut();

    return {
      user: null,
      profile: null,
      responseStatus: 403 as const,
    };
  }

  // Validasi role sebelum memberikan akses aplikasi.
  if (profile.role !== "admin" && profile.role !== "user") {
    return {
      user: null,
      profile: null,
      responseStatus: 403 as const,
    };
  }

  return {
    user,
    profile: profile as AppProfile,
    responseStatus: 200 as const,
  };
}

export async function requireAdmin() {
  const result = await getCurrentAppUser();

  if (result.responseStatus !== 200 || !result.profile) {
    return {
      ...result,
      authorized: false as const,
    };
  }

  if (result.profile.role !== "admin") {
    return {
      ...result,
      responseStatus: 403 as const,
      authorized: false as const,
    };
  }

  return {
    ...result,
    authorized: true as const,
  };
}
