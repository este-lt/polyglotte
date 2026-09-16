"use server";

import { auth } from "@clerk/nextjs/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { computeNextProgress } from "@/lib/progress";
import type { PillarKey } from "@/lib/queries";

export async function submitAnswerAction(
  languageId: string,
  pillar: PillarKey,
  itemId: string,
  wasCorrect: boolean,
) {
  const { userId } = await auth.protect();
  const supabase = createSupabaseServerClient();

  const { data: existing, error: fetchErr } = await supabase
    .from("user_progress")
    .select("status, times_seen, times_correct")
    .eq("language_id", languageId)
    .eq("pillar", pillar)
    .eq("item_id", itemId)
    .maybeSingle();
  if (fetchErr) throw fetchErr;

  const next = computeNextProgress(existing, wasCorrect);
  const now = new Date().toISOString();

  const { error: upsertErr } = await supabase.from("user_progress").upsert(
    {
      user_id: userId,
      language_id: languageId,
      pillar,
      item_id: itemId,
      status: next.status,
      times_seen: next.timesSeen,
      times_correct: next.timesCorrect,
      last_reviewed_at: now,
      next_review_at: next.nextReviewAt.toISOString(),
      updated_at: now,
    },
    { onConflict: "user_id,pillar,item_id" },
  );
  if (upsertErr) throw upsertErr;

  await supabase
    .from("user_activity_log")
    .upsert(
      { user_id: userId, activity_date: now.slice(0, 10) },
      { onConflict: "user_id,activity_date", ignoreDuplicates: true },
    );
}
