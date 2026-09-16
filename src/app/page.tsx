import { Show, SignUpButton } from "@clerk/nextjs";
import Link from "next/link";

export default function Home() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-20">
      <h1 className="text-3xl font-semibold tracking-tight">
        Apprendre une langue pour de vrai, pas pour jouer.
      </h1>
      <p className="mt-4 text-muted-foreground">
        Vocabulaire, conjugaison, grammaire, syntaxe et expressions —
        priorisés par ce qui sert vraiment à communiquer avec des natifs au
        quotidien.
      </p>

      <div className="mt-8">
        <Show when="signed-in">
          <Link
            href="/dashboard"
            className="inline-block rounded-[var(--radius-token)] bg-accent px-5 py-2.5 text-sm font-medium text-accent-foreground"
          >
            Aller au tableau de bord
          </Link>
        </Show>
        <Show when="signed-out">
          <SignUpButton mode="modal">
            <button className="rounded-[var(--radius-token)] bg-accent px-5 py-2.5 text-sm font-medium text-accent-foreground">
              Commencer
            </button>
          </SignUpButton>
        </Show>
      </div>
    </div>
  );
}
