/**
 * Seed le contenu complet (5 piliers) d'une langue dans Supabase, à partir
 * de content/<slug>.json. Idempotent : re-seeder une langue met à jour le
 * contenu existant (upsert sur clés naturelles) sans casser les id déjà
 * référencés par user_progress.
 *
 * Usage :
 *   npm run seed:lang -- --lang=russe          (seed réel)
 *   npm run seed:lang -- --lang=russe --dry-run (valide le JSON, sans DB)
 */
import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

type Example = { target: string; transliteration?: string; fr: string };

type VocabItem = {
  target_text: string;
  transliteration?: string;
  translation_fr: string;
};

type VocabContext = {
  context_slug: string;
  context_name_fr: string;
  items: VocabItem[];
};

type ExpressionItem = VocabItem & { usage_note?: string };

type ExpressionContext = {
  context_slug: string;
  context_name_fr: string;
  items: ExpressionItem[];
};

type ContentFile = {
  slug: string;
  name_fr: string;
  name_native: string;
  has_distinct_script: boolean;
  daily_minutes_target: number;
  b2_target_months: number;
  estimated_hours_to_b2: number;
  realism_status: "realiste" | "tendu" | "tres_tendu";
  vocab: VocabContext[];
  conjugation: {
    tenses: { slug: string; name_fr: string; formation_rule_fr: string }[];
    verbs: {
      infinitive_target: string;
      infinitive_transliteration?: string;
      infinitive_fr: string;
      is_survival_verb?: boolean;
    }[];
    forms: {
      verb_infinitive_target: string;
      tense_slug: string;
      person_label: string;
      form_target: string;
      form_transliteration?: string;
    }[];
  };
  grammar: {
    category_slug: string;
    category_name_fr: string;
    rules: { explanation_fr: string; examples: Example[] }[];
  }[];
  syntax: {
    name_fr: string;
    explanation_fr: string;
    complexity_level: number;
    examples: Example[];
  }[];
  expressions: ExpressionContext[];
};

function parseArgs() {
  const langArg = process.argv.find((a) => a.startsWith("--lang="));
  const dryRun = process.argv.includes("--dry-run");
  if (!langArg) {
    console.error("Usage: npm run seed:lang -- --lang=<slug> [--dry-run]");
    process.exit(1);
  }
  return { slug: langArg.split("=")[1], dryRun };
}

function loadContent(slug: string): ContentFile {
  const path = resolve(process.cwd(), "content", `${slug}.json`);
  if (!existsSync(path)) {
    console.error(`Fichier de contenu introuvable : ${path}`);
    process.exit(1);
  }
  return JSON.parse(readFileSync(path, "utf-8"));
}

function validate(content: ContentFile) {
  const errors: string[] = [];
  const tenseSlugs = new Set(content.conjugation.tenses.map((t) => t.slug));
  const verbInfinitives = new Set(content.conjugation.verbs.map((v) => v.infinitive_target));

  for (const form of content.conjugation.forms) {
    if (!tenseSlugs.has(form.tense_slug)) {
      errors.push(`Forme "${form.form_target}" référence un temps inconnu : ${form.tense_slug}`);
    }
    if (!verbInfinitives.has(form.verb_infinitive_target)) {
      errors.push(`Forme "${form.form_target}" référence un verbe inconnu : ${form.verb_infinitive_target}`);
    }
  }

  const summary = {
    langue: `${content.name_fr} (${content.name_native})`,
    vocabulaire: `${content.vocab.length} contextes, ${content.vocab.reduce((n, c) => n + c.items.length, 0)} mots`,
    verbes: content.conjugation.verbs.length,
    temps: content.conjugation.tenses.length,
    formes_conjuguees: content.conjugation.forms.length,
    grammaire: `${content.grammar.length} catégories, ${content.grammar.reduce((n, c) => n + c.rules.length, 0)} règles`,
    syntaxe: content.syntax.length,
    expressions: `${content.expressions.length} contextes, ${content.expressions.reduce((n, c) => n + c.items.length, 0)} expressions`,
    estimation_b2: `${content.estimated_hours_to_b2}h (${content.realism_status})`,
  };

  console.log("Résumé du contenu :", summary);

  if (errors.length > 0) {
    console.error(`\n${errors.length} erreur(s) de référence :`);
    for (const e of errors) console.error(` - ${e}`);
    process.exit(1);
  }
  console.log("\nStructure valide.");
}

async function seed(content: ContentFile) {
  process.loadEnvFile(resolve(process.cwd(), ".env.local"));
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    console.error(
      "NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY doivent être définis dans .env.local",
    );
    process.exit(1);
  }
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const { data: language, error: langErr } = await supabase
    .from("languages")
    .upsert(
      {
        slug: content.slug,
        name_fr: content.name_fr,
        name_native: content.name_native,
        has_distinct_script: content.has_distinct_script,
        daily_minutes_target: content.daily_minutes_target,
        b2_target_months: content.b2_target_months,
        estimated_hours_to_b2: content.estimated_hours_to_b2,
        realism_status: content.realism_status,
      },
      { onConflict: "slug" },
    )
    .select()
    .single();
  if (langErr) throw langErr;
  const languageId: string = language.id;

  // Vocabulaire
  for (const ctx of content.vocab) {
    const { data: context, error } = await supabase
      .from("vocab_contexts")
      .upsert(
        { language_id: languageId, slug: ctx.context_slug, name_fr: ctx.context_name_fr },
        { onConflict: "language_id,slug" },
      )
      .select()
      .single();
    if (error) throw error;
    const rows = ctx.items.map((item, i) => ({
      language_id: languageId,
      context_id: context.id,
      target_text: item.target_text,
      transliteration: item.transliteration ?? null,
      translation_fr: item.translation_fr,
      sort_order: i,
    }));
    const { error: itemsErr } = await supabase
      .from("vocab_items")
      .upsert(rows, { onConflict: "context_id,target_text" });
    if (itemsErr) throw itemsErr;
  }
  console.log(`Vocabulaire : ${content.vocab.length} contextes seedés.`);

  // Conjugaison : temps puis verbes puis formes (dépendent des deux)
  const tenseIdBySlug = new Map<string, string>();
  for (const [i, tense] of content.conjugation.tenses.entries()) {
    const { data, error } = await supabase
      .from("conjugation_tenses")
      .upsert(
        {
          language_id: languageId,
          slug: tense.slug,
          name_fr: tense.name_fr,
          formation_rule_fr: tense.formation_rule_fr,
          sort_order: i,
        },
        { onConflict: "language_id,slug" },
      )
      .select()
      .single();
    if (error) throw error;
    tenseIdBySlug.set(tense.slug, data.id);
  }

  const verbIdByInfinitive = new Map<string, string>();
  for (const [i, verb] of content.conjugation.verbs.entries()) {
    const { data, error } = await supabase
      .from("verbs")
      .upsert(
        {
          language_id: languageId,
          infinitive_target: verb.infinitive_target,
          infinitive_transliteration: verb.infinitive_transliteration ?? null,
          infinitive_fr: verb.infinitive_fr,
          is_survival_verb: verb.is_survival_verb ?? false,
          sort_order: i,
        },
        { onConflict: "language_id,infinitive_target" },
      )
      .select()
      .single();
    if (error) throw error;
    verbIdByInfinitive.set(verb.infinitive_target, data.id);
  }

  const formRows = content.conjugation.forms.map((f, i) => ({
    verb_id: verbIdByInfinitive.get(f.verb_infinitive_target),
    tense_id: tenseIdBySlug.get(f.tense_slug),
    person_label: f.person_label,
    form_target: f.form_target,
    form_transliteration: f.form_transliteration ?? null,
    sort_order: i,
  }));
  const { error: formsErr } = await supabase
    .from("conjugation_forms")
    .upsert(formRows, { onConflict: "verb_id,tense_id,person_label" });
  if (formsErr) throw formsErr;
  console.log(
    `Conjugaison : ${content.conjugation.verbs.length} verbes, ${content.conjugation.tenses.length} temps, ${formRows.length} formes seedées.`,
  );

  // Grammaire
  for (const [ci, cat] of content.grammar.entries()) {
    const { data: category, error } = await supabase
      .from("grammar_categories")
      .upsert(
        {
          language_id: languageId,
          slug: cat.category_slug,
          name_fr: cat.category_name_fr,
          sort_order: ci,
        },
        { onConflict: "language_id,slug" },
      )
      .select()
      .single();
    if (error) throw error;
    const ruleRows = cat.rules.map((r, ri) => ({
      category_id: category.id,
      explanation_fr: r.explanation_fr,
      examples: r.examples,
      sort_order: ri,
    }));
    const { error: rulesErr } = await supabase
      .from("grammar_rules")
      .upsert(ruleRows, { onConflict: "category_id,explanation_fr" });
    if (rulesErr) throw rulesErr;
  }
  console.log(`Grammaire : ${content.grammar.length} catégories seedées.`);

  // Syntaxe
  const syntaxRows = content.syntax.map((s, i) => ({
    language_id: languageId,
    name_fr: s.name_fr,
    explanation_fr: s.explanation_fr,
    examples: s.examples,
    complexity_level: s.complexity_level ?? 1,
    sort_order: i,
  }));
  const { error: syntaxErr } = await supabase
    .from("syntax_patterns")
    .upsert(syntaxRows, { onConflict: "language_id,name_fr" });
  if (syntaxErr) throw syntaxErr;
  console.log(`Syntaxe : ${content.syntax.length} patterns seedés.`);

  // Expressions
  for (const ctx of content.expressions) {
    const { data: context, error } = await supabase
      .from("expression_contexts")
      .upsert(
        { language_id: languageId, slug: ctx.context_slug, name_fr: ctx.context_name_fr },
        { onConflict: "language_id,slug" },
      )
      .select()
      .single();
    if (error) throw error;
    const rows = ctx.items.map((item, i) => ({
      language_id: languageId,
      context_id: context.id,
      target_text: item.target_text,
      transliteration: item.transliteration ?? null,
      translation_fr: item.translation_fr,
      usage_note: item.usage_note ?? null,
      sort_order: i,
    }));
    const { error: itemsErr } = await supabase
      .from("expressions")
      .upsert(rows, { onConflict: "context_id,target_text" });
    if (itemsErr) throw itemsErr;
  }
  console.log(`Expressions : ${content.expressions.length} contextes seedés.`);

  console.log(`\n"${content.name_fr}" seedée avec succès.`);
}

async function main() {
  const { slug, dryRun } = parseArgs();
  const content = loadContent(slug);
  validate(content);
  if (dryRun) {
    console.log("\n(--dry-run : rien n'a été écrit en base)");
    return;
  }
  await seed(content);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
