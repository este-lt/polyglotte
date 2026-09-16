-- Clés naturelles pour permettre au script de seed de faire des upserts
-- idempotents (re-seeder une langue met à jour le contenu existant au lieu
-- de le dupliquer, et préserve les id référencés par user_progress).

alter table conjugation_tenses add column slug text;
alter table conjugation_tenses alter column slug set not null;
alter table conjugation_tenses add constraint conjugation_tenses_language_slug_key unique (language_id, slug);

alter table grammar_categories add column slug text;
alter table grammar_categories alter column slug set not null;
alter table grammar_categories add constraint grammar_categories_language_slug_key unique (language_id, slug);

alter table vocab_items add constraint vocab_items_context_target_key unique (context_id, target_text);
alter table verbs add constraint verbs_language_infinitive_key unique (language_id, infinitive_target);
alter table grammar_rules add constraint grammar_rules_category_explanation_key unique (category_id, explanation_fr);
alter table syntax_patterns add constraint syntax_patterns_language_name_key unique (language_id, name_fr);
alter table expressions add constraint expressions_context_target_key unique (context_id, target_text);
