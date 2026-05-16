import { createClient } from "@supabase/supabase-js";

// Cliente con service_role para operaciones de Admin API (nunca exponer al cliente)
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
