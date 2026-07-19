if (process.env.NODE_ENV !== "test" && !process.env.NODE_TEST_CONTEXT) {
  require("server-only");
}
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Creates a server-only Supabase client using the service role key.
 * This client bypasses Row Level Security (RLS).
 * MUST only be imported and called inside secure server-side routes/actions.
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL environment variable");
  }

  if (!serviceRoleKey) {
    throw new Error(
      "Missing SUPABASE_SERVICE_ROLE_KEY environment variable. Secure admin client requires server-role credentials."
    );
  }

  return createSupabaseClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: {
      fetch: (url, options) => {
        return fetch(url, { ...options, cache: "no-store" });
      },
    },
  });
}
