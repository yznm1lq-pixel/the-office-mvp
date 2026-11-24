"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const uuidPattern = /^[0-9a-f-]{36}$/i;
const textValue = (formData: FormData, key: string) => String(formData.get(key) ?? "").trim();
const safeUrl = (value: string) => {
  if (!value) return null;
  try { const url = new URL(value); return ["https:","http:"].includes(url.protocol) ? url.toString() : null; }
  catch { return null; }
};

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
  redirect(`/offices/${companyId}/virtual?joined=1`);
}

export async function updateMemberRole(formData: FormData) {
  const companyId = textValue(formData, "companyId");
  const userId = textValue(formData, "userId");
  const role = textValue(formData, "role");
  const departmentId = textValue(formData, "departmentId") || null;
  if (!uuidPattern.test(companyId) || !uuidPattern.test(userId)) redirect("/");
  const { supabase } = await signedInClient();
  const { error } = await supabase.from("company_members").update({ role, department_id: departmentId })
    .eq("company_id", companyId).eq("user_id", userId);
  if (error) redirect(`/offices/${companyId}/team?error=permissions`);
  revalidatePath(`/offices/${companyId}/team`);
  redirect(`/offices/${companyId}/team?updated=1`);
}

export async function updateMemberName(formData: FormData) {
  const companyId = textValue(formData, "companyId");
  const userId = textValue(formData, "userId");
  const fullName = textValue(formData, "fullName");
  if (!uuidPattern.test(companyId) || !uuidPattern.test(userId)) redirect("/");
  const { supabase } = await signedInClient();
  const { error } = await supabase.rpc("admin_update_member_name", {
    p_company_id: companyId, p_user_id: userId, p_full_name: fullName,
  });
  if (error) redirect(`/offices/${companyId}/settings?error=member-name`);
  revalidatePath(`/offices/${companyId}/team`);
  revalidatePath(`/offices/${companyId}/settings`);
  redirect(`/offices/${companyId}/settings?saved=member`);
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

export async function updateCompanyProfile(formData: FormData) {
  const companyId = textValue(formData, "companyId");
  const name = textValue(formData, "name");
  const description = textValue(formData, "description");
  const logoUrl = safeUrl(textValue(formData, "logoUrl"));
  const websiteUrl = safeUrl(textValue(formData, "websiteUrl"));
  const contactEmail = textValue(formData, "contactEmail").toLowerCase();
  const socialLinks = {
    instagram: safeUrl(textValue(formData, "instagram")),
    linkedin: safeUrl(textValue(formData, "linkedin")),
    x: safeUrl(textValue(formData, "x")),
    youtube: safeUrl(textValue(formData, "youtube")),
    tiktok: safeUrl(textValue(formData, "tiktok")),
  };
  if (!uuidPattern.test(companyId) || name.length < 2 || name.length > 80) redirect("/");
  if ((textValue(formData, "logoUrl") && !logoUrl) || (textValue(formData, "websiteUrl") && !websiteUrl)) redirect(`/offices/${companyId}/settings?error=url`);
  const { supabase } = await signedInClient();
  const { error } = await supabase.from("companies").update({
    name, description: description.slice(0,1000), logo_url: logoUrl,
    website_url: websiteUrl, contact_email: contactEmail || null, social_links: socialLinks,
  }).eq("id", companyId);
  if (error) redirect(`/offices/${companyId}/settings?error=company`);
  revalidatePath(`/offices/${companyId}`);
  revalidatePath(`/offices/${companyId}/virtual`);
  redirect(`/offices/${companyId}/settings?saved=company`);
}

export async function updateDepartment(formData: FormData) {
  const companyId = textValue(formData, "companyId");
  const departmentId = textValue(formData, "departmentId");
  const name = textValue(formData, "name");
  if (!uuidPattern.test(companyId) || !uuidPattern.test(departmentId) || name.length < 2 || name.length > 60) redirect("/");
  const { supabase } = await signedInClient();
  const { error } = await supabase.from("departments").update({ name }).eq("id", departmentId).eq("company_id", companyId);
  if (error) redirect(`/offices/${companyId}/settings?error=department`);
  revalidatePath(`/offices/${companyId}`);
  redirect(`/offices/${companyId}/settings?saved=department`);
}

export async function deleteDepartment(formData: FormData) {
  const companyId = textValue(formData, "companyId");
  const departmentId = textValue(formData, "departmentId");
  if (!uuidPattern.test(companyId) || !uuidPattern.test(departmentId)) redirect("/");
  const { supabase } = await signedInClient();
  const { error } = await supabase.from("departments").delete().eq("id", departmentId).eq("company_id", companyId);
  if (error) redirect(`/offices/${companyId}/settings?error=department-delete`);
  revalidatePath(`/offices/${companyId}`);
  redirect(`/offices/${companyId}/settings?saved=department`);
}

export async function createPortfolioItem(formData: FormData) {
  const companyId = textValue(formData, "companyId");
  const title = textValue(formData, "title");
  const description = textValue(formData, "description");
  const imageUrl = safeUrl(textValue(formData, "imageUrl"));
  const projectUrl = safeUrl(textValue(formData, "projectUrl"));
  if (!uuidPattern.test(companyId) || title.length < 2 || title.length > 100) redirect("/");
  const { supabase } = await signedInClient();
  const { error } = await supabase.from("company_portfolio").insert({
    company_id: companyId, title, description: description.slice(0,600), image_url: imageUrl, project_url: projectUrl,
  });
  if (error) redirect(`/offices/${companyId}/settings?error=portfolio`);
  revalidatePath(`/offices/${companyId}/settings`);
  redirect(`/offices/${companyId}/settings?saved=portfolio`);
}

export async function deletePortfolioItem(formData: FormData) {
  const companyId = textValue(formData, "companyId");
  const itemId = textValue(formData, "itemId");
  if (!uuidPattern.test(companyId) || !uuidPattern.test(itemId)) redirect("/");
  const { supabase } = await signedInClient();
  const { error } = await supabase.from("company_portfolio").delete().eq("id", itemId).eq("company_id", companyId);
  if (error) redirect(`/offices/${companyId}/settings?error=portfolio`);
  revalidatePath(`/offices/${companyId}/settings`);
  redirect(`/offices/${companyId}/settings?saved=portfolio`);
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
