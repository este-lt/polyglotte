import { auth, currentUser } from "@clerk/nextjs/server";

export default async function DashboardPage() {
  await auth.protect();
  const user = await currentUser();

  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">
        Bonjour {user?.firstName ?? ""}
      </h1>
      <p className="mt-2 text-muted-foreground">
        Le tableau de bord de progression arrive à l&apos;étape 4 (sélection
        de langue et suivi par pilier).
      </p>
    </div>
  );
}
