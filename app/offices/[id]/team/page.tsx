import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createInvitation, removeMember, signOut, updateMemberRole } from "@/app/actions";
import { CopyInviteLink } from "@/components/copy-invite-link";
import { createClient } from "@/lib/supabase/server";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; inviteToken?: string; updated?: string; removed?: string }> };

export default async function TeamPage({ params, searchParams }: Props) {
  const { id } = await params;
  const query = await searchParams;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  const userId = auth?.claims?.sub;
  if (!userId) redirect("/login");

  const [companyResult, myRoleResult, membersResult, departmentsResult] = await Promise.all([
    supabase.from("companies").select("id,name").eq("id", id).maybeSingle(),
    supabase.from("company_members").select("role").eq("company_id", id).eq("user_id", userId).maybeSingle(),
    supabase.from("company_members").select("user_id,role,department_id,joined_at,profiles(full_name)").eq("company_id", id).order("joined_at"),
    supabase.from("departments").select("id,name").eq("company_id", id).order("name"),
  ]);
  if (!companyResult.data || !myRoleResult.data) notFound();
  const role = myRoleResult.data.role as string;
  const canManage = role === "owner" || role === "admin";
  const canAssignAdmin = role === "owner";
  const members = membersResult.data ?? [];
  const departments = departmentsResult.data ?? [];
  const roleLabels: Record<string,string> = { owner: "رئيس الشركة", admin: "مدير الشركة", department_head: "مدير قسم", member: "موظف" };

  return <main className="app-shell">
    <div className="mx-auto max-w-7xl">
      <header className="app-header"><Link href="/" className="brand-lockup"><span className="brand-mark">◈</span><span>المكتب</span></Link><div className="flex items-center gap-4"><Link href={`/offices/${id}/virtual`} className="nav-link">المكتب الافتراضي</Link><Link href={`/offices/${id}`} className="nav-link">الأقسام</Link><Link href={`/offices/${id}/settings`} className="nav-link">الإعدادات</Link><Link href={`/offices/${id}/work`} className="nav-link">مساحة العمل</Link><form action={signOut}><button className="nav-link">خروج</button></form></div></header>
      <section className="page-heading"><div><p className="eyebrow">إدارة الفريق / {companyResult.data.name}</p><h1>فريقك، بصلاحيات واضحة.</h1><p>أضف أعضاء الفريق وحدد مسؤولياتهم، واحتفظ بقرار الإدارة بيد أصحاب الصلاحية.</p></div><span className="role-pill">{roleLabels[role] ?? role}</span></section>
      <div className="stepper"><Link className="step complete" href={`/offices/${id}`}><b>1</b><span>إنشاء الأقسام</span></Link><span className="step-line"/><span className="step current"><b>2</b><span>دعوة الفريق</span></span><span className="step-line"/><Link className="step" href={`/offices/${id}/work`}><b>3</b><span>بدء العمل</span></Link></div>
      {query.inviteToken && <CopyInviteLink token={query.inviteToken}/>}
      {(query.error || query.updated || query.removed) && <div className={query.error ? "notice notice-error" : "notice notice-success"}>{query.error ? "لم نتمكن من تنفيذ العملية. تحقق من صلاحياتك والبيانات." : query.updated ? "تم تحديث صلاحيات العضو." : "تمت إزالة العضو من المكتب."}</div>}
      <div className="team-layout">
        <section className="panel">
          <div className="panel-heading"><div><h2>أعضاء المكتب</h2><p>{members.length} عضو في مساحة العمل</p></div><span className="count-badge">{members.length}</span></div>
          <div className="member-list">
            {members.map((member: any) => {
              const profile = Array.isArray(member.profiles) ? member.profiles[0] : member.profiles;
              const isOwner = member.role === "owner";
              return <article className="member-row" key={member.user_id}>
                <div className="member-avatar">{(profile?.full_name ?? "ع").slice(0,1)}</div>
                <div className="member-meta"><strong>{profile?.full_name ?? "عضو في الفريق"}</strong><span>{roleLabels[member.role] ?? member.role}{member.department_id ? " · مرتبط بقسم" : ""}</span></div>
                {canManage && !isOwner && member.user_id !== userId ? <div className="member-actions">
                  <form action={updateMemberRole} className="flex flex-wrap items-center gap-2">
                    <input type="hidden" name="companyId" value={id}/><input type="hidden" name="userId" value={member.user_id}/>
                    <select name="role" defaultValue={member.role} className="compact-select">
                      {canAssignAdmin && <option value="admin">مدير الشركة</option>}
                      {departments.length > 0 && <option value="department_head">مدير قسم</option>}<option value="member">موظف</option>
                    </select>
                    <select name="departmentId" defaultValue={member.department_id ?? departments[0]?.id ?? ""} className="compact-select" aria-label="القسم">
                      <option value="">اختر القسم</option>{departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                    <button className="icon-action" type="submit">حفظ</button>
                  </form>
                  <form action={removeMember}><input type="hidden" name="companyId" value={id}/><input type="hidden" name="userId" value={member.user_id}/><button className="remove-action" type="submit">إزالة</button></form>
                </div> : <span className="member-role">{roleLabels[member.role] ?? member.role}</span>}
              </article>;
            })}
            {!members.length && <div className="empty-state">لا يوجد أعضاء حتى الآن.</div>}
          </div>
        </section>
        <aside className="panel invite-panel">
          <span className="panel-icon">✳</span><h2>وجّه دعوة لفريقك</h2><p>أدخل بريد الموظف، وحدد دوره والقسم الذي سينضم إليه. سيُنشأ رابط دعوة خاص صالح لمدة 7 أيام.</p>
          {canManage ? <form action={createInvitation} className="invite-form">
            <input type="hidden" name="companyId" value={id}/>
            <label>البريد الإلكتروني</label><input className="field" name="email" type="email" placeholder="name@company.com" required/>
            <label>الصلاحية</label><select className="field" name="role" defaultValue="member"><option value="member">موظف</option>{departments.length > 0 && <option value="department_head">مدير قسم</option>}{canAssignAdmin && <option value="admin">مدير الشركة</option>}</select>
            <label>القسم</label><select className="field" name="departmentId" defaultValue=""><option value="">بدون قسم</option>{departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select>
            <button className="primary-button w-full" type="submit">إنشاء رابط الدعوة</button>
          </form> : <div className="permission-note">إدارة الدعوات وتغيير الصلاحيات متاحة لمدير الشركة ورئيسها فقط.</div>}
          <div className="permission-note"><strong>تدرّج الصلاحيات</strong><br/>رئيس الشركة ← مدير الشركة ← مدير قسم ← موظف</div>
        </aside>
      </div>
      <div className="page-footer"><Link className="primary-button" href={`/offices/${id}/work`}>متابعة إلى مساحة العمل <span className="mr-2">←</span></Link></div>
    </div>
  </main>;
}
