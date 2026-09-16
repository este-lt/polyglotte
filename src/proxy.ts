import { clerkMiddleware } from "@clerk/nextjs/server";

// Le contrôle d'accès se fait au niveau de chaque route protégée (ex: auth.protect()
// dans src/app/dashboard/page.tsx), pas ici — voir la dépréciation de createRouteMatcher.
export default clerkMiddleware();

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
