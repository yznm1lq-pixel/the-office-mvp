"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function value(formData: FormData, key: string) { return String(formData.get(key) ?? "").trim(); }
function safeNext(raw: string) { return raw.startsWith("/") && !raw.startsWith("//") ? raw : "/"; }

export async function signIn(formData: FormData) {
  const username = value(formData, "username").toLowerCase();
  const password = value(formData, "password");
  const next = safeNext(value(formData, "next"));
  if (!username || !password) redirect("/login?error=missing");
  const supabase = await createClient();
  const email = username.includes("@") ? username : `${username}@accounts.theoffice.invalid`;
  if (!email) redirect("/login?error=credentials");
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) redirect("/login?error=credentials");
  redirect(next);
}

export async function signUp(formData: FormData) {
  const username = value(formData, "username").toLowerCase().replace(/^@/, "");
  const password = value(formData, "password");
  if (!/^[a-z0-9_]{3,24}$/.test(username) || password.length < 8) redirect("/login?error=signup");
  const supabase = await createClient();
  const email = `${username}@accounts.theoffice.invalid`;
  const { error } = await supabase.auth.signUp({
    email, password,
    options: { data: { username } },
  });
  if (error) redirect("/login?error=signup");
  // بعض إعدادات Supabase لا تعيد جلسة في signUp؛ نجرّب الدخول مباشرة بعد تأكيد الحساب الآلي للحسابات الداخلية.
  const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });
  if (loginError) redirect("/login?error=auth-config");
  redirect("/onboarding/profile");
}

