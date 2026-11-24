"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function createCompany(formData: FormData) {
  const name = String(formData.get("companyName") ?? "").trim();
  if (name.length < 2 || name.length > 80) redirect("/?error=company-name");

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims?.sub) redirect("/login");

  const { data: companyId, error } = await supabase.rpc("create_company", { company_name: name });
  if (error) {
    if (error.message.includes("COMPANY_LIMIT_REACHED")) redirect("/?error=company-limit");
    redirect("/?error=company-create");
  }
  if (!companyId) redirect("/?error=company-create");
  redirect(`/offices/${companyId}`);
}

export async function createDepartment(formData: FormData) {
  const companyId = String(formData.get("companyId") ?? "");
  const name = String(formData.get("departmentName") ?? "").trim();
  if (!companyId || name.length < 2 || name.length > 60) redirect(`/offices/${companyId}?error=department`);

  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  const userId = auth?.claims?.sub;
  if (!userId) redirect("/login");

  const { error } = await supabase.from("departments").insert({
    company_id: companyId,
    name,
    created_by: userId,
  });
  if (error) redirect(`/offices/${companyId}?error=department`);

  revalidatePath(`/offices/${companyId}`);
  redirect(`/offices/${companyId}?department=created`);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
