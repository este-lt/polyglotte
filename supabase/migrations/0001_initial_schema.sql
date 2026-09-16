-- Polyglotte — schéma initial : contenu pédagogique partagé (5 piliers)
-- + suivi de progression par utilisateur. À exécuter dans Supabase > SQL Editor.

create extension if not exists pgcrypto;

-- ============================================================
-- Langues
-- ============================================================

create table languages (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name_fr text not null,
  name_native text not null,
  has_distinct_script boolean not null default false,
  daily_minutes_target int not null default 45,
  b2_target_months int not null default 6,
  estimated_hours_to_b2 int not null,
  realism_status text not null check (realism_status in ('realiste', 'tendu', 'tres_tendu')),
  created_at timestamptz not null default now()
);

-- ============================================================
-- Pilier 1 : Vocabulaire
-- ============================================================

create table vocab_contexts (
  id uuid primary key default gen_random_uuid(),
  language_id uuid not null references languages(id) on delete cascade,
  slug text not null,
  name_fr text not null,
  sort_order int not null default 0,
  unique (language_id, slug)
);

create table vocab_items (
  id uuid primary key default gen_random_uuid(),
  language_id uuid not null references languages(id) on delete cascade,
  context_id uuid not null references vocab_contexts(id) on delete cascade,
  target_text text not null,
  transliteration text,
  translation_fr text not null,
  sort_order int not null default 0
);

-- ============================================================
-- Pilier 2 : Conjugaison
-- ============================================================

create table verbs (
  id uuid primary key default gen_random_uuid(),
  language_id uuid not null references languages(id) on delete cascade,
  infinitive_target text not null,
  infinitive_transliteration text,
  infinitive_fr text not null,
  is_survival_verb boolean not null default false,
  sort_order int not null default 0
);

create table conjugation_tenses (
  id uuid primary key default gen_random_uuid(),
  language_id uuid not null references languages(id) on delete cascade,
  name_fr text not null,
  formation_rule_fr text not null,
  sort_order int not null default 0
);

create table conjugation_forms (
  id uuid primary key default gen_random_uuid(),
  verb_id uuid not null references verbs(id) on delete cascade,
  tense_id uuid not null references conjugation_tenses(id) on delete cascade,
  person_label text not null,
  form_target text not null,
  form_transliteration text,
  sort_order int not null default 0,
  unique (verb_id, tense_id, person_label)
);

-- ============================================================
-- Pilier 3 : Grammaire
-- ============================================================

create table grammar_categories (
  id uuid primary key default gen_random_uuid(),
  language_id uuid not null references languages(id) on delete cascade,
  name_fr text not null,
  sort_order int not null default 0
);

create table grammar_rules (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references grammar_categories(id) on delete cascade,
  explanation_fr text not null,
  examples jsonb not null default '[]'::jsonb,
  sort_order int not null default 0
);

-- ============================================================
-- Pilier 4 : Syntaxe
-- ============================================================

create table syntax_patterns (
  id uuid primary key default gen_random_uuid(),
  language_id uuid not null references languages(id) on delete cascade,
  name_fr text not null,
  explanation_fr text not null,
  examples jsonb not null default '[]'::jsonb,
  complexity_level int not null default 1,
  sort_order int not null default 0
);

-- ============================================================
-- Pilier 5 : Expressions courantes
-- ============================================================

create table expression_contexts (
  id uuid primary key default gen_random_uuid(),
  language_id uuid not null references languages(id) on delete cascade,
  slug text not null,
  name_fr text not null,
  sort_order int not null default 0,
  unique (language_id, slug)
);

create table expressions (
  id uuid primary key default gen_random_uuid(),
  language_id uuid not null references languages(id) on delete cascade,
  context_id uuid not null references expression_contexts(id) on delete cascade,
  target_text text not null,
  transliteration text,
  translation_fr text not null,
  usage_note text,
  sort_order int not null default 0
);

-- ============================================================
-- Données utilisateur (une ligne par utilisateur Clerk)
-- ============================================================

create table user_languages (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  language_id uuid not null references languages(id) on delete cascade,
  started_at timestamptz not null default now(),
  unique (user_id, language_id)
);

-- Progression unifiée à travers les 5 piliers (item_id pointe vers la ligne
-- correspondante de vocab_items / conjugation_forms / grammar_rules /
-- syntax_patterns / expressions selon la valeur de "pillar").
create table user_progress (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  language_id uuid not null references languages(id) on delete cascade,
  pillar text not null check (pillar in ('vocabulaire', 'conjugaison', 'grammaire', 'syntaxe', 'expressions')),
  item_id uuid not null,
  status text not null default 'a_apprendre' check (status in ('a_apprendre', 'en_revision', 'maitrise')),
  times_seen int not null default 0,
  times_correct int not null default 0,
  last_reviewed_at timestamptz,
  next_review_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, pillar, item_id)
);

create index user_progress_due_idx on user_progress (user_id, language_id, next_review_at);
create index user_progress_status_idx on user_progress (user_id, language_id, status);

-- Journal d'activité pour le calcul du streak (une ligne par jour pratiqué).
create table user_activity_log (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  activity_date date not null,
  created_at timestamptz not null default now(),
  unique (user_id, activity_date)
);

-- ============================================================
-- Row Level Security
-- ============================================================

alter table languages enable row level security;
alter table vocab_contexts enable row level security;
alter table vocab_items enable row level security;
alter table verbs enable row level security;
alter table conjugation_tenses enable row level security;
alter table conjugation_forms enable row level security;
alter table grammar_categories enable row level security;
alter table grammar_rules enable row level security;
alter table syntax_patterns enable row level security;
alter table expression_contexts enable row level security;
alter table expressions enable row level security;
alter table user_languages enable row level security;
alter table user_progress enable row level security;
alter table user_activity_log enable row level security;

-- Contenu pédagogique : lecture ouverte à tout utilisateur authentifié
-- (via Clerk), écriture réservée au script de seed (clé service_role,
-- qui contourne RLS) — donc aucune policy d'écriture ci-dessous.
create policy "content_read" on languages for select to authenticated using (true);
create policy "content_read" on vocab_contexts for select to authenticated using (true);
create policy "content_read" on vocab_items for select to authenticated using (true);
create policy "content_read" on verbs for select to authenticated using (true);
create policy "content_read" on conjugation_tenses for select to authenticated using (true);
create policy "content_read" on conjugation_forms for select to authenticated using (true);
create policy "content_read" on grammar_categories for select to authenticated using (true);
create policy "content_read" on grammar_rules for select to authenticated using (true);
create policy "content_read" on syntax_patterns for select to authenticated using (true);
create policy "content_read" on expression_contexts for select to authenticated using (true);
create policy "content_read" on expressions for select to authenticated using (true);

-- Données utilisateur : chacun ne voit/modifie que ses propres lignes,
-- identifiées par le "sub" (user_id Clerk) du token de session.
create policy "own_rows" on user_languages for all
  to authenticated
  using (user_id = (select auth.jwt()) ->> 'sub')
  with check (user_id = (select auth.jwt()) ->> 'sub');

create policy "own_rows" on user_progress for all
  to authenticated
  using (user_id = (select auth.jwt()) ->> 'sub')
  with check (user_id = (select auth.jwt()) ->> 'sub');

create policy "own_rows" on user_activity_log for all
  to authenticated
  using (user_id = (select auth.jwt()) ->> 'sub')
  with check (user_id = (select auth.jwt()) ->> 'sub');
