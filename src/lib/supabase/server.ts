import "server-only";
import { auth } from "@clerk/nextjs/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Client Supabase côté serveur, authentifié avec le token de session Clerk.
 * Les policies RLS lisent le claim `sub` de ce token comme user_id.
 */
export function createSupabaseServerClient(): SupabaseClient {
  return createClient(supabaseUrl, supabaseAnonKey, {
    async accessToken() {
      return (await auth()).getToken();
    },
  });
}

/**
 * Client admin (service role) — contourne RLS. Réservé au script de seed et
 * aux tâches serveur de confiance, jamais exposé au client.
 */
export function createSupabaseAdminClient(): SupabaseClient {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });
}
