"use client";

import { useSession } from "@clerk/nextjs";
import { createClient } from "@supabase/supabase-js";
import { useMemo } from "react";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/**
 * Client Supabase côté navigateur, authentifié avec le token de session
 * Clerk de l'utilisateur courant. À utiliser dans les composants client
 * (ex: soumission d'une réponse d'exercice).
 */
export function useSupabaseClient() {
  const { session } = useSession();

  return useMemo(
    () =>
      createClient(supabaseUrl, supabaseAnonKey, {
        async accessToken() {
          return session?.getToken() ?? null;
        },
      }),
    [session],
  );
}
