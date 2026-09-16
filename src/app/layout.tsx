import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider, Show, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import { frFR } from "@clerk/localizations";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Polyglotte",
  description: "Apprentissage de langues, méthode Pareto.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <ClerkProvider localization={frFR} afterSignOutUrl="/">
      <html
        lang="fr"
        className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      >
        <body className="min-h-full flex flex-col">
          <header className="border-b border-border">
            <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
              <Link href="/" className="text-sm font-semibold tracking-tight">
                Polyglotte
              </Link>
              <nav className="flex items-center gap-4">
                <Show when="signed-in">
                  <Link
                    href="/dashboard"
                    className="text-sm text-muted-foreground hover:text-foreground"
                  >
                    Tableau de bord
                  </Link>
                  <UserButton />
                </Show>
                <Show when="signed-out">
                  <SignInButton mode="modal">
                    <button className="text-sm text-muted-foreground hover:text-foreground">
                      Se connecter
                    </button>
                  </SignInButton>
                  <SignUpButton mode="modal">
                    <button className="rounded-[var(--radius-token)] bg-accent px-4 py-2 text-sm font-medium text-accent-foreground">
                      Créer un compte
                    </button>
                  </SignUpButton>
                </Show>
              </nav>
            </div>
          </header>
          <main className="flex-1">{children}</main>
        </body>
      </html>
    </ClerkProvider>
  );
}
