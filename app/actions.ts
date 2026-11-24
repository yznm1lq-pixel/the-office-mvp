"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

const uuidPattern = /^[0-9a-f-]{36}$/i;
const textValue = (formData: FormData, key: string) => String(formData.get(key) ?? "").trim();
const escapeHtml = (value: string) => value.replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" }[char] ?? char));
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
  const inviteeName = textValue(formData, "inviteeName");
  if (!uuidPattern.test(companyId) || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || inviteeName.length < 2 || inviteeName.length > 100) {
    redirect(`/offices/${companyId}/team?error=invite`);
  }

  // لا ننشئ دعوة معلقة إذا لم يكن إرسال البريد مهيأ.
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.INVITATION_FROM_EMAIL;
  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://the-office-mvp.vercel.app")).replace(/\/$/, "");
  if (!apiKey || !from) redirect(`/offices/${companyId}/team?error=email-config`);

  const { supabase } = await signedInClient();
  const [{ data: company }, { data: token, error }] = await Promise.all([
    supabase.from("companies").select("name").eq("id", companyId).maybeSingle(),
    supabase.rpc("create_company_invitation", {
      p_company_id: companyId, p_email: email, p_role: role, p_department_id: departmentId, p_invitee_name: inviteeName,
    }),
  ]);
  if (error || !token || !company) redirect(`/offices/${companyId}/team?error=invite`);

  const invitationUrl = `${baseUrl}/invite/${encodeURIComponent(token)}`;
  const safeName = escapeHtml(inviteeName);
  const safeCompany = escapeHtml(company.name);
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: [email],
      subject: `دعوة للانضمام إلى ${company.name}`,
      html: `<div dir="rtl" style="font-family:Arial,sans-serif;max-width:560px;margin:40px auto;padding:32px;border:1px solid #e5e2d8;border-radius:12px;color:#29352d"><h2>مرحبًا ${safeName}</h2><p>تمت دعوتك للانضمام إلى <strong>${safeCompany}</strong>.</p><p style="margin:28px 0"><a href="${invitationUrl}" style="background:#405d4d;color:white;padding:13px 22px;border-radius:7px;text-decoration:none">قبول الدعوة والانضمام</a></p><p style="color:#777;font-size:12px">صلاحية الدعوة 7 أيام. إذا لم تكن تتوقع هذه الدعوة، يمكنك تجاهل الرسالة.</p></div>`,
    }),
    cache: "no-store",
  });
  if (!response.ok) redirect(`/offices/${companyId}/team?error=email-send`);
  revalidatePath(`/offices/${companyId}/team`);
  redirect(`/offices/${companyId}/team?sent=1`);
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


export async function createNeighborRequest(formData: FormData) {
  const toCompanyId = textValue(formData, "toCompanyId");
  const fromCompanyId = textValue(formData, "fromCompanyId");
  const message = textValue(formData, "message").slice(0,1200);
  if (!uuidPattern.test(toCompanyId) || !uuidPattern.test(fromCompanyId) || toCompanyId === fromCompanyId || message.length < 10) redirect("/neighbors?error=request");
  const { supabase, userId } = await signedInClient();
  const { error } = await supabase.from("neighbor_requests").insert({ from_company_id: fromCompanyId, to_company_id: toCompanyId, requested_by: userId, message });
  if (error) redirect("/neighbors?error=request");
  revalidatePath("/neighbors");
  redirect("/neighbors?sent=1");
}

export async function respondNeighborRequest(formData: FormData) {
  const requestId = textValue(formData, "requestId");
  const status = textValue(formData, "status");
  if (!uuidPattern.test(requestId) || !["accepted","declined"].includes(status)) redirect("/neighbors?error=response");
  const { supabase } = await signedInClient();
  const { error } = await supabase.from("neighbor_requests").update({ status, updated_at: new Date().toISOString() }).eq("id", requestId);
  if (error) redirect("/neighbors?error=response");
  revalidatePath("/neighbors");
  redirect("/neighbors?updated=1");
}

export async function proposeNeighborMeeting(formData: FormData) {
  const requestId = textValue(formData, "requestId");
  const startsAt = textValue(formData, "startsAt");
  const agenda = textValue(formData, "agenda").slice(0,800);
  const date = new Date(startsAt);
  if (!uuidPattern.test(requestId) || !startsAt || Number.isNaN(date.getTime()) || date <= new Date()) redirect("/neighbors?error=meeting");
  const { supabase, userId } = await signedInClient();
  const { error } = await supabase.from("neighbor_meetings").insert({ request_id: requestId, proposed_by: userId, starts_at: date.toISOString(), agenda, duration_minutes: 30 });
  if (error) redirect("/neighbors?error=meeting");
  revalidatePath("/neighbors");
  redirect("/neighbors?meeting=proposed");
}


export async function respondNeighborMeeting(formData: FormData) {
  const meetingId = textValue(formData, "meetingId");
  const status = textValue(formData, "status");
  if (!uuidPattern.test(meetingId) || !["confirmed","declined"].includes(status)) redirect("/neighbors?error=meeting-response");
  const { supabase } = await signedInClient();
  const { error } = await supabase.from("neighbor_meetings").update({ status }).eq("id", meetingId);
  if (error) redirect("/neighbors?error=meeting-response");
  revalidatePath("/neighbors");
  redirect("/neighbors?meeting=updated");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}


export async function updateMyProfile(formData: FormData) {
 const fullName=textValue(formData,"fullName"); const avatarUrl=textValue(formData,"avatarUrl") || textValue(formData,"emoji");
 if(fullName.length<2||fullName.length>80||avatarUrl.length>500) redirect("/profile?error=profile");
 const {supabase,userId}=await signedInClient();
 const {error}=await supabase.from("profiles").update({full_name:fullName,avatar_url:avatarUrl||null,updated_at:new Date().toISOString()}).eq("id",userId);
 if(error) redirect("/profile?error=profile");
 revalidatePath("/profile"); revalidatePath("/");
 redirect("/profile?saved=1");
}

export async function createAnnouncement(formData: FormData) {
 const companyId=textValue(formData,"companyId"); const title=textValue(formData,"title"); const body=textValue(formData,"body"); const audience=textValue(formData,"audience")==="neighbors"?"neighbors":"company";
 if(!uuidPattern.test(companyId)||title.length<2||title.length>120||body.length<2||body.length>3000) redirect("/");
 const {supabase,userId}=await signedInClient();
 const {error}=await supabase.from("company_announcements").insert({company_id:companyId,author_id:userId,title,body,audience});
 if(error) redirect(`/offices/${companyId}/announcements?error=post`);
 revalidatePath(`/offices/${companyId}/announcements`); revalidatePath("/neighbors/announcements");
 redirect(`/offices/${companyId}/announcements?sent=1`);
}

export async function sendCompanyMessage(formData: FormData) {
 const companyId=textValue(formData,"companyId"); const body=textValue(formData,"body"); const departmentId=textValue(formData,"departmentId")||null;
 if(!uuidPattern.test(companyId)||body.length<1||body.length>3000) redirect("/");
 const {supabase,userId}=await signedInClient();
 const {error}=await supabase.from("messages").insert({company_id:companyId,department_id:departmentId,sender_id:userId,body});
 if(error) redirect(`/offices/${companyId}/chat?error=message`);
 revalidatePath(`/offices/${companyId}/chat`); redirect(`/offices/${companyId}/chat?sent=1`);
}
