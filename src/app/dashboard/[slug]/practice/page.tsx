import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getLanguageBySlug } from "@/lib/queries";
import { buildPracticeSession } from "@/lib/exercises";
import { PracticeSession } from "./PracticeSession";

export default async function PracticePage(props: PageProps<"/dashboard/[slug]/practice">) {
  await auth.protect();
  const { slug } = await props.params;
  const supabase = createSupabaseServerClient();

  const language = await getLanguageBySlug(supabase, slug);
  if (!language) notFound();

  const exercises = await buildPracticeSession(supabase, language.id);

  if (exercises.length === 0) {
    return (
      <div className="mx-auto max-w-xl px-6 py-16 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Rien à réviser pour l&apos;instant</h1>
        <p className="mt-2 text-muted-foreground">
          Reviens plus tard, ou attends que du nouveau contenu soit ajouté.
        </p>
        <Link
          href={`/dashboard/${language.slug}`}
          className="mt-6 inline-block rounded-[var(--radius-token)] bg-accent px-5 py-2.5 text-sm font-medium text-accent-foreground"
        >
          Retour au tableau de bord
        </Link>
      </div>
    );
  }

  return (
    <PracticeSession languageId={language.id} languageSlug={language.slug} exercises={exercises} />
  );
}
