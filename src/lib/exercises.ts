import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { PillarKey } from "./queries";

export type QcmExercise = {
  kind: "qcm";
  pillar: PillarKey;
  itemId: string;
  prompt: string;
  promptTransliteration: string | null;
  hint: string | null;
  options: string[];
  correctAnswer: string;
};

export type ReconstructionExercise = {
  kind: "reconstruction";
  pillar: PillarKey;
  itemId: string;
  translationHint: string;
  tokens: string[];
  correctSentence: string;
};

export type Exercise = QcmExercise | ReconstructionExercise;

const SESSION_SIZE = 8;

function shuffle<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function sample<T>(items: T[], count: number): T[] {
  return shuffle(items).slice(0, count);
}

type Candidate = { pillar: PillarKey; itemId: string; priority: number };

async function pickCandidates(
  supabase: SupabaseClient,
  languageId: string,
): Promise<Candidate[]> {
  const [progressRes, vocabRes, exprRes, conjRes, gramRes, synRes] = await Promise.all([
    supabase
      .from("user_progress")
      .select("pillar, item_id, status, next_review_at")
      .eq("language_id", languageId),
    supabase.from("vocab_items").select("id").eq("language_id", languageId),
    supabase.from("expressions").select("id").eq("language_id", languageId),
    supabase.from("conjugation_forms").select("id").eq("language_id", languageId),
    supabase.from("grammar_rules").select("id").eq("language_id", languageId),
    supabase.from("syntax_patterns").select("id").eq("language_id", languageId),
  ]);

  const progressByKey = new Map(
    (progressRes.data ?? []).map((r) => [`${r.pillar}:${r.item_id}`, r]),
  );
  const now = Date.now();

  const pillarRows: Record<PillarKey, { id: string }[]> = {
    vocabulaire: vocabRes.data ?? [],
    expressions: exprRes.data ?? [],
    conjugaison: conjRes.data ?? [],
    grammaire: gramRes.data ?? [],
    syntaxe: synRes.data ?? [],
  };

  const candidates: Candidate[] = [];
  for (const pillar of Object.keys(pillarRows) as PillarKey[]) {
    for (const row of pillarRows[pillar]) {
      const progress = progressByKey.get(`${pillar}:${row.id}`);
      if (!progress) {
        candidates.push({ pillar, itemId: row.id, priority: 1 });
      } else if (progress.status === "en_revision") {
        const due = !progress.next_review_at || new Date(progress.next_review_at).getTime() <= now;
        if (due) candidates.push({ pillar, itemId: row.id, priority: 0 });
      }
    }
  }

  candidates.sort((a, b) => a.priority - b.priority || Math.random() - 0.5);
  return candidates;
}

async function buildQcmExercise(
  supabase: SupabaseClient,
  pillar: "vocabulaire" | "expressions",
  itemId: string,
): Promise<QcmExercise | null> {
  const table = pillar === "vocabulaire" ? "vocab_items" : "expressions";
  const { data: item } = await supabase
    .from(table)
    .select("id, target_text, transliteration, translation_fr, usage_note, language_id")
    .eq("id", itemId)
    .maybeSingle();
  if (!item) return null;

  const { data: pool } = await supabase
    .from(table)
    .select("translation_fr")
    .eq("language_id", item.language_id)
    .neq("id", itemId)
    .limit(40);

  const distractors = sample(
    Array.from(new Set((pool ?? []).map((p) => p.translation_fr))).filter(
      (t) => t !== item.translation_fr,
    ),
    3,
  );

  return {
    kind: "qcm",
    pillar,
    itemId,
    prompt: item.target_text,
    promptTransliteration: item.transliteration,
    hint: "usage_note" in item ? (item.usage_note ?? null) : null,
    options: shuffle([item.translation_fr, ...distractors]),
    correctAnswer: item.translation_fr,
  };
}

async function buildConjugationExercise(
  supabase: SupabaseClient,
  itemId: string,
): Promise<QcmExercise | null> {
  const { data: item } = await supabase
    .from("conjugation_forms")
    .select(
      "id, person_label, form_target, tense_id, verb:verb_id(infinitive_fr, infinitive_target), tense:tense_id(name_fr)",
    )
    .eq("id", itemId)
    .maybeSingle();
  if (!item) return null;
  const verb = item.verb as unknown as { infinitive_fr: string; infinitive_target: string };
  const tense = item.tense as unknown as { name_fr: string };

  const { data: pool } = await supabase
    .from("conjugation_forms")
    .select("form_target")
    .eq("tense_id", item.tense_id)
    .neq("id", itemId)
    .limit(40);

  const distractors = sample(
    Array.from(new Set((pool ?? []).map((p) => p.form_target))).filter(
      (t) => t !== item.form_target,
    ),
    3,
  );
  if (distractors.length < 2) return null;

  return {
    kind: "qcm",
    pillar: "conjugaison",
    itemId,
    prompt: `« ${verb.infinitive_fr} » (${verb.infinitive_target}) — ${tense.name_fr}, ${item.person_label}`,
    promptTransliteration: null,
    hint: null,
    options: shuffle([item.form_target, ...distractors]),
    correctAnswer: item.form_target,
  };
}

async function buildReconstructionExercise(
  supabase: SupabaseClient,
  pillar: "grammaire" | "syntaxe",
  itemId: string,
): Promise<ReconstructionExercise | null> {
  const table = pillar === "grammaire" ? "grammar_rules" : "syntax_patterns";
  const { data: item } = await supabase
    .from(table)
    .select("id, examples")
    .eq("id", itemId)
    .maybeSingle();
  const examples = item?.examples as { target: string; fr: string }[] | undefined;
  if (!examples || examples.length === 0) return null;

  const example = examples[Math.floor(Math.random() * examples.length)];
  const tokens = example.target.split(/\s+/).filter(Boolean);
  if (tokens.length < 2) return null;

  return {
    kind: "reconstruction",
    pillar,
    itemId,
    translationHint: example.fr,
    tokens: shuffle(tokens),
    correctSentence: tokens.join(" "),
  };
}

export async function buildPracticeSession(
  supabase: SupabaseClient,
  languageId: string,
): Promise<Exercise[]> {
  const candidates = await pickCandidates(supabase, languageId);

  const byPillar = new Map<PillarKey, Candidate[]>();
  for (const c of candidates) {
    const list = byPillar.get(c.pillar) ?? [];
    list.push(c);
    byPillar.set(c.pillar, list);
  }

  const selected: Candidate[] = [];
  const pillars = Array.from(byPillar.keys());
  let round = 0;
  while (selected.length < SESSION_SIZE && pillars.some((p) => (byPillar.get(p)?.length ?? 0) > round)) {
    for (const pillar of pillars) {
      const list = byPillar.get(pillar) ?? [];
      if (list[round] && selected.length < SESSION_SIZE) selected.push(list[round]);
    }
    round++;
  }

  const exercises = await Promise.all(
    selected.map((c) => {
      if (c.pillar === "vocabulaire" || c.pillar === "expressions") {
        return buildQcmExercise(supabase, c.pillar, c.itemId);
      }
      if (c.pillar === "conjugaison") {
        return buildConjugationExercise(supabase, c.itemId);
      }
      return buildReconstructionExercise(supabase, c.pillar, c.itemId);
    }),
  );

  return exercises.filter((e): e is Exercise => e !== null);
}
