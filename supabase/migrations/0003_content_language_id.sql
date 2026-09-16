-- Dénormalise language_id sur conjugation_forms et grammar_rules (au lieu
-- de le déduire via verbs / grammar_categories) : nécessaire pour que le
-- tableau de bord et le futur moteur d'exercices puissent filtrer chaque
-- pilier par langue sans jointure.

alter table conjugation_forms add column language_id uuid references languages(id) on delete cascade;
update conjugation_forms cf set language_id = v.language_id from verbs v where v.id = cf.verb_id;
alter table conjugation_forms alter column language_id set not null;
create index conjugation_forms_language_idx on conjugation_forms (language_id);

alter table grammar_rules add column language_id uuid references languages(id) on delete cascade;
update grammar_rules gr set language_id = gc.language_id from grammar_categories gc where gc.id = gr.category_id;
alter table grammar_rules alter column language_id set not null;
create index grammar_rules_language_idx on grammar_rules (language_id);
