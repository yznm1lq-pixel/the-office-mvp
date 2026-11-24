"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function value(formData: FormData, key: string) { return String(formData.get(key) ?? "").trim(); }
function safeNext(raw: string) { return raw.startsWith("/") && !raw.startsWith("//") ? raw : "/"; }

export async function signIn(formData: FormData) {
  const email = value(formData, "email");
  const password = value(formData, "password");
  const next = safeNext(value(formData, "next"));
  if (!email || !password) redirect("/login?error=missing");
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) redirect("/login?error=credentials");
  redirect(next);
}

export async function signUp(formData: FormData) {
  const fullName = value(formData, "fullName");
  const email = value(formData, "email");
  const password = value(formData, "password");
  const next = safeNext(value(formData, "next"));
  if (!fullName || !email || password.length < 8) redirect("/login?error=signup");
  const supabase = await createClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://the-office-mvp.vercel.app";
  const { data, error } = await supabase.auth.signUp({
    email, password,
    options: { data: { full_name: fullName }, emailRedirectTo: `${siteUrl}/auth/callback?next=${encodeURIComponent(next)}` },
  });
  if (error) redirect("/login?error=signup");
  if (data.session) redirect(next);
  redirect(`/login?message=check-email&next=${encodeURIComponent(next)}`);
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
