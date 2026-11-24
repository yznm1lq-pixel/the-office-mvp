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
  const { data: resolved } = await supabase.rpc("resolve_username_login", { p_username: username });
  const email = typeof resolved === "string" ? resolved : (username.includes("@") ? username : null);
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

export async function signInFromInvitation(formData: FormData) {
  const token = value(formData, "token");
  const email = value(formData, "email");
  const password = value(formData, "password");
  if (!token || !email || !password) redirect(`/invite/${encodeURIComponent(token)}?error=credentials`);
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) redirect(`/invite/${encodeURIComponent(token)}?error=credentials`);
  redirect(`/invite/${encodeURIComponent(token)}`);
}

export async function signUpFromInvitation(formData: FormData) {
  const token = value(formData, "token");
  const fullName = value(formData, "fullName");
  const email = value(formData, "email").toLowerCase();
  const password = value(formData, "password");
  if (!token || fullName.length < 2 || !email || password.length < 8) redirect(`/invite/${encodeURIComponent(token)}?error=signup`);
  const supabase = await createClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://the-office-mvp.vercel.app";
  const next = `/invite/${encodeURIComponent(token)}`;
  const { data, error } = await supabase.auth.signUp({
    email, password,
    options: {
      data: { full_name: fullName },
      emailRedirectTo: `${siteUrl}/auth/callback?next=${encodeURIComponent(next)}`,
    },
  });
  if (error) redirect(`/invite/${encodeURIComponent(token)}?error=signup`);
  if (data.session) redirect(next);
  redirect(`/invite/${encodeURIComponent(token)}?message=check-email`);
}
