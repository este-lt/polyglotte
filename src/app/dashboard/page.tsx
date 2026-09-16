import { auth } from "@clerk/nextjs/server";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getLanguages, getUserLanguages, REALISM_LABELS } from "@/lib/queries";
import { addLanguageAction } from "./actions";

export default async function DashboardPage() {
  await auth.protect();
  const supabase = createSupabaseServerClient();

  const [userLanguages, allLanguages] = await Promise.all([
    getUserLanguages(supabase),
    getLanguages(supabase),
  ]);

  const followedIds = new Set(userLanguages.map((ul) => ul.language.id));
  const availableLanguages = allLanguages.filter((lang) => !followedIds.has(lang.id));

  return (
    <div className="mx-auto max-w-5xl px-6 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">Tableau de bord</h1>

      {userLanguages.length === 0 ? (
        <p className="mt-2 text-muted-foreground">
          Tu ne suis encore aucune langue. Choisis-en une ci-dessous pour commencer.
        </p>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {userLanguages.map(({ language }) => (
            <Link
              key={language.id}
              href={`/dashboard/${language.slug}`}
              className="rounded-[var(--radius-token)] border border-border p-5 transition-colors hover:border-accent"
            >
              <div className="flex items-baseline justify-between">
                <h2 className="text-lg font-medium">{language.name_fr}</h2>
                <span className="text-sm text-muted-foreground">{language.name_native}</span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                Objectif : B2 en {language.b2_target_months} mois à {language.daily_minutes_target}{" "}
                min/jour — {REALISM_LABELS[language.realism_status].toLowerCase()}
              </p>
            </Link>
          ))}
        </div>
      )}

      {availableLanguages.length > 0 && (
        <div className="mt-10">
          <h2 className="text-sm font-medium text-muted-foreground">
            {userLanguages.length === 0 ? "Langues disponibles" : "Ajouter une autre langue"}
          </h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {availableLanguages.map((language) => (
              <form
                key={language.id}
                action={addLanguageAction.bind(null, language.id)}
                className="flex items-center justify-between rounded-[var(--radius-token)] border border-border p-4"
              >
                <div>
                  <p className="font-medium">{language.name_fr}</p>
                  <p className="text-sm text-muted-foreground">{language.name_native}</p>
                </div>
                <button
                  type="submit"
                  className="rounded-[var(--radius-token)] bg-accent px-4 py-2 text-sm font-medium text-accent-foreground"
                >
                  Suivre
                </button>
              </form>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
