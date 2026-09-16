# Polyglotte

Mini-SaaS personnel d'apprentissage de langues (méthode Pareto — communiquer
avec des natifs dans la vie courante), avec 5 piliers par langue :
vocabulaire, conjugaison, grammaire, syntaxe, expressions courantes.

## Stack

- Next.js (App Router, TypeScript) + Tailwind CSS
- [Clerk](https://clerk.com) — authentification multi-utilisateurs
- [Supabase](https://supabase.com) (Postgres + RLS) — contenu pédagogique partagé, progression par utilisateur
- Vercel — hébergement

## Démarrer en local

1. Copier `.env.example` vers `.env.local` et renseigner les clés Clerk et Supabase.
2. `npm install`
3. `npm run dev` puis ouvrir [http://localhost:3000](http://localhost:3000).

## Ajouter une langue

`npm run seed:lang -- --lang=<nom>` (à venir à l'étape 3) génère et insère en
base les 5 piliers de contenu pour une langue donnée, selon la méthodologie
définie dans le skill `/langue`.
