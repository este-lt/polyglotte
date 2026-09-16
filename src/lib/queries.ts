import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export type Language = {
  id: string;
  slug: string;
  name_fr: string;
  name_native: string;
  has_distinct_script: boolean;
  daily_minutes_target: number;
  b2_target_months: number;
  estimated_hours_to_b2: number;
  realism_status: "realiste" | "tendu" | "tres_tendu";
};

export type PillarKey = "vocabulaire" | "conjugaison" | "grammaire" | "syntaxe" | "expressions";

export const PILLAR_LABELS: Record<PillarKey, string> = {
  vocabulaire: "Vocabulaire",
  conjugaison: "Conjugaison",
  grammaire: "Grammaire",
  syntaxe: "Syntaxe",
  expressions: "Expressions courantes",
};

const PILLAR_TABLE: Record<PillarKey, string> = {
  vocabulaire: "vocab_items",
  conjugaison: "conjugation_forms",
  grammaire: "grammar_rules",
  syntaxe: "syntax_patterns",
  expressions: "expressions",
};

export type PillarStat = {
  pillar: PillarKey;
  total: number;
  maitrise: number;
  enRevision: number;
  aApprendre: number;
  masteryRatio: number;
};

export async function getLanguages(supabase: SupabaseClient): Promise<Language[]> {
  const { data, error } = await supabase.from("languages").select("*").order("name_fr");
  if (error) throw error;
  return data;
}

export async function getLanguageBySlug(
  supabase: SupabaseClient,
  slug: string,
): Promise<Language | null> {
  const { data, error } = await supabase
    .from("languages")
    .select("*")
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getUserLanguages(
  supabase: SupabaseClient,
): Promise<{ started_at: string; language: Language }[]> {
  const { data, error } = await supabase
    .from("user_languages")
    .select("started_at, language:languages(*)")
    .order("started_at");
  if (error) throw error;
  return (data ?? []) as unknown as { started_at: string; language: Language }[];
}

export async function isFollowingLanguage(
  supabase: SupabaseClient,
  languageId: string,
): Promise<boolean> {
  const { count, error } = await supabase
    .from("user_languages")
    .select("*", { count: "exact", head: true })
    .eq("language_id", languageId);
  if (error) throw error;
  return (count ?? 0) > 0;
}

async function countByLanguage(supabase: SupabaseClient, table: string, languageId: string) {
  const { count, error } = await supabase
    .from(table)
    .select("*", { count: "exact", head: true })
    .eq("language_id", languageId);
  if (error) throw error;
  return count ?? 0;
}

export async function getPillarStats(
  supabase: SupabaseClient,
  languageId: string,
): Promise<PillarStat[]> {
  const pillars = Object.keys(PILLAR_LABELS) as PillarKey[];
  const totals = await Promise.all(
    pillars.map((pillar) => countByLanguage(supabase, PILLAR_TABLE[pillar], languageId)),
  );

  const { data: progressRows, error } = await supabase
    .from("user_progress")
    .select("pillar, status")
    .eq("language_id", languageId);
  if (error) throw error;

  return pillars.map((pillar, i) => {
    const total = totals[i];
    const rows = (progressRows ?? []).filter((r) => r.pillar === pillar);
    const maitrise = rows.filter((r) => r.status === "maitrise").length;
    const enRevision = rows.filter((r) => r.status === "en_revision").length;
    return {
      pillar,
      total,
      maitrise,
      enRevision,
      aApprendre: Math.max(total - maitrise - enRevision, 0),
      masteryRatio: total > 0 ? maitrise / total : 0,
    };
  });
}

export const REALISM_LABELS: Record<Language["realism_status"], string> = {
  realiste: "Réaliste",
  tendu: "Tendu",
  tres_tendu: "Très tendu",
};
