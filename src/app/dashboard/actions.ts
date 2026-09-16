"use server";

import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function addLanguageAction(languageId: string) {
  const { userId } = await auth.protect();
  const supabase = createSupabaseServerClient();

  const { error } = await supabase
    .from("user_languages")
    .insert({ user_id: userId, language_id: languageId });
  if (error && error.code !== "23505") {
    // 23505 = unique_violation (déjà suivie) : on l'ignore silencieusement
    throw error;
  }

  revalidatePath("/dashboard");
}
