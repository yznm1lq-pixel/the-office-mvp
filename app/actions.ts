"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function createCompany(formData: FormData) {
  const name = String(formData.get("companyName") ?? "").trim();
  if (name.length < 2 || name.length > 80) redirect("/?error=company-name");

  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims?.sub) redirect("/login");

  const { error } = await supabase.rpc("create_company", { company_name: name });
  if (error) redirect("/?error=company-create");
  redirect("/?created=1");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}