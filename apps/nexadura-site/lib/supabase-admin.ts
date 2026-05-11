import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cachedClient: SupabaseClient | null | undefined;

const isConfiguredSecret = (value: string | undefined): value is string => {
  if (!value) return false;
  if (value === "your_service_role_key_here") return false;
  if (value.trim().startsWith("{")) return false;
  return value.trim().length >= 40;
};

export const getSupabaseAdmin = () => {
  if (cachedClient !== undefined) return cachedClient;

  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!supabaseUrl || !isConfiguredSecret(serviceRoleKey)) {
    cachedClient = null;
    return cachedClient;
  }

  try {
    new URL(supabaseUrl);
  } catch {
    cachedClient = null;
    return cachedClient;
  }

  cachedClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return cachedClient;
};
