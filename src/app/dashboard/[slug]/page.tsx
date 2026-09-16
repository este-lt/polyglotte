import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  getLanguageBySlug,
  getPillarStats,
  isFollowingLanguage,
  PILLAR_LABELS,
  REALISM_LABELS,
} from "@/lib/queries";
import { addLanguageAction } from "../actions";

export default async function LanguageDashboardPage(props: PageProps<"/dashboard/[slug]">) {
  await auth.protect();
  const { slug } = await props.params;
  const supabase = createSupabaseServerClient();

  const language = await getLanguageBySlug(supabase, slug);
  if (!language) notFound();

  const [stats, following] = await Promise.all([
    getPillarStats(supabase, language.id),
    isFollowingLanguage(supabase, language.id),
  ]);

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <div className="flex items-baseline justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{language.name_fr}</h1>
          <p className="text-muted-foreground">{language.name_native}</p>
        </div>
        {!following && (
          <form action={addLanguageAction.bind(null, language.id)}>
            <button
              type="submit"
              className="rounded-[var(--radius-token)] bg-accent px-4 py-2 text-sm font-medium text-accent-foreground"
            >
              Suivre cette langue
            </button>
          </form>
        )}
      </div>

      <div className="mt-6 rounded-[var(--radius-token)] border border-border bg-muted p-5">
        <p className="text-sm">
          Objectif par défaut : niveau B2 en {language.b2_target_months} mois, à{" "}
          {language.daily_minutes_target} minutes de pratique par jour.
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Estimation honnête pour cette langue : environ {language.estimated_hours_to_b2}{" "}
          heures — statut{" "}
          <span className="font-medium">{REALISM_LABELS[language.realism_status]}</span>.
        </p>
      </div>

      {following && (
        <Link
          href={`/dashboard/${language.slug}/practice`}
          className="mt-6 inline-block rounded-[var(--radius-token)] bg-accent px-5 py-2.5 text-sm font-medium text-accent-foreground"
        >
          Commencer une session
        </Link>
      )}

      <h2 className="mt-10 text-sm font-medium text-muted-foreground">Progression par pilier</h2>
      <div className="mt-3 space-y-3">
        {stats.map((stat) => (
          <div key={stat.pillar} className="rounded-[var(--radius-token)] border border-border p-4">
            <div className="flex items-baseline justify-between">
              <span className="font-medium">{PILLAR_LABELS[stat.pillar]}</span>
              <span className="text-sm text-muted-foreground">
                {stat.maitrise} / {stat.total} maîtrisés
              </span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-accent"
                style={{ width: `${Math.round(stat.masteryRatio * 100)}%` }}
              />
            </div>
            {stat.total === 0 && (
              <p className="mt-2 text-sm text-muted-foreground">Contenu à venir.</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
