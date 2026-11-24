"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const uuidPattern = /^[0-9a-f-]{36}$/i;
const textValue = (formData: FormData, key: string) => String(formData.get(key) ?? "").trim();

async function signedInClient() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) redirect("/login");
  return { supabase, userId };
}

export async function createCompany(formData: FormData) {
  const name = textValue(formData, "companyName");
  if (name.length < 2 || name.length > 80) redirect("/?error=company-name");
  const { supabase } = await signedInClient();
  const { data: companyId, error } = await supabase.rpc("create_company", { company_name: name });
  if (error) {
    if (error.message.includes("COMPANY_LIMIT_REACHED")) redirect("/?error=company-limit");
    redirect("/?error=company-create");
  }
  if (!companyId) redirect("/?error=company-create");
  redirect(`/offices/${companyId}?stage=departments`);
}

export async function createDepartment(formData: FormData) {
  const companyId = textValue(formData, "companyId");
  const name = textValue(formData, "departmentName");
  if (!uuidPattern.test(companyId) || name.length < 2 || name.length > 60) redirect("/");
  const { supabase, userId } = await signedInClient();
  const { error } = await supabase.from("departments").insert({ company_id: companyId, name, created_by: userId });
  if (error) redirect(`/offices/${companyId}?error=department`);
  revalidatePath(`/offices/${companyId}`);
  redirect(`/offices/${companyId}?stage=departments&department=created`);
}

export async function createInvitation(formData: FormData) {
  const companyId = textValue(formData, "companyId");
  const email = textValue(formData, "email").toLowerCase();
  const role = textValue(formData, "role") || "member";
  const departmentId = textValue(formData, "departmentId") || null;
  if (!uuidPattern.test(companyId) || !email.includes("@")) redirect(`/offices/${companyId}/team?error=invite`);
  const { supabase } = await signedInClient();
  const { data: token, error } = await supabase.rpc("create_company_invitation", {
    p_company_id: companyId, p_email: email, p_role: role, p_department_id: departmentId,
  });
  if (error || !token) redirect(`/offices/${companyId}/team?error=invite`);
  revalidatePath(`/offices/${companyId}/team`);
  redirect(`/offices/${companyId}/team?inviteToken=${encodeURIComponent(token)}`);
}

export async function acceptInvitation(formData: FormData) {
  const token = textValue(formData, "token");
  if (!token) redirect("/?error=invite");
  const { supabase } = await signedInClient();
  const { data: companyId, error } = await supabase.rpc("accept_company_invitation", { p_token: token });
  if (error || !companyId) redirect(`/invite/${encodeURIComponent(token)}?error=invalid`);
  redirect(`/offices/${companyId}/work?joined=1`);
}

export async function updateMemberRole(formData: FormData) {
  const companyId = textValue(formData, "companyId");
  const userId = textValue(formData, "userId");
  const role = textValue(formData, "role");
  const departmentId = textValue(formData, "departmentId") || null;
  if (!uuidPattern.test(companyId) || !uuidPattern.test(userId)) redirect("/");
  const { supabase } = await signedInClient();
  const { error } = await supabase.from("company_members").update({
    role, department_id: departmentId,
  }).eq("company_id", companyId).eq("user_id", userId);
  if (error) redirect(`/offices/${companyId}/team?error=permissions`);
  revalidatePath(`/offices/${companyId}/team`);
  redirect(`/offices/${companyId}/team?updated=1`);
}

export async function removeMember(formData: FormData) {
  const companyId = textValue(formData, "companyId");
  const userId = textValue(formData, "userId");
  if (!uuidPattern.test(companyId) || !uuidPattern.test(userId)) redirect("/");
  const { supabase } = await signedInClient();
  const { error } = await supabase.from("company_members").delete().eq("company_id", companyId).eq("user_id", userId);
  if (error) redirect(`/offices/${companyId}/team?error=remove`);
  revalidatePath(`/offices/${companyId}/team`);
  redirect(`/offices/${companyId}/team?removed=1`);
}

export async function createProject(formData: FormData) {
  const companyId = textValue(formData, "companyId");
  const name = textValue(formData, "name");
  const departmentId = textValue(formData, "departmentId") || null;
  const description = textValue(formData, "description");
  if (!uuidPattern.test(companyId) || name.length < 2 || name.length > 100) redirect("/");
  const { supabase, userId } = await signedInClient();
  const { error } = await supabase.from("projects").insert({
    company_id: companyId, department_id: departmentId, name, description: description || null, created_by: userId,
  });
  if (error) redirect(`/offices/${companyId}/work?error=project`);
  revalidatePath(`/offices/${companyId}/work`);
  redirect(`/offices/${companyId}/work?project=created`);
}

export async function createTask(formData: FormData) {
  const companyId = textValue(formData, "companyId");
  const title = textValue(formData, "title");
  const projectId = textValue(formData, "projectId") || null;
  const assigneeId = textValue(formData, "assigneeId") || null;
  if (!uuidPattern.test(companyId) || title.length < 2 || title.length > 180) redirect("/");
  const { supabase, userId } = await signedInClient();
  const { error } = await supabase.from("tasks").insert({
    company_id: companyId, project_id: projectId, title, assignee_id: assigneeId, created_by: userId,
  });
  if (error) redirect(`/offices/${companyId}/work?error=task`);
  revalidatePath(`/offices/${companyId}/work`);
  redirect(`/offices/${companyId}/work?task=created`);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
