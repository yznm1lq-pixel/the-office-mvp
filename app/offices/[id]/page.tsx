import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createDepartment, signOut } from "@/app/actions";
import { createClient } from "@/lib/supabase/server";
import { PresenceHeartbeat } from "@/components/presence-heartbeat";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; department?: string; stage?: string }> };

export default async function OfficePage({ params, searchParams }: Props) {
  const { id } = await params;
  const query = await searchParams;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  const userId = auth?.claims?.sub;
  if (!userId) redirect("/login");

  const [company, departments, membership, members] = await Promise.all([
    supabase.from("companies").select("id,name,created_at").eq("id",id).maybeSingle(),
    supabase.from("departments").select("id,name,color").eq("company_id",id).order("created_at"),
    supabase.from("company_members").select("role").eq("company_id",id).eq("user_id",userId).maybeSingle(),
    supabase.from("company_members").select("user_id",{count:"exact",head:true}).eq("company_id",id),
  ]);
  if (!company.data || !membership.data) notFound();
  const departmentRows = departments.data ?? [];
  const isReadyForTeam = departmentRows.length > 0;
  const stage = query.stage ?? (isReadyForTeam ? "team" : "departments");
  const role = membership.data.role;
  const canManage = role === "owner" || role === "admin";

  return <main className="app-shell"><PresenceHeartbeat companyId={id}/><div className="mx-auto max-w-7xl">
    <header className="app-header"><Link href="/" className="brand-lockup"><span className="brand-mark">◈</span><span>المكتب</span></Link><div className="flex items-center gap-4"><Link href="/" className="nav-link">لوحة المكاتب</Link><Link href={`/offices/${id}/virtual`} className="nav-link">المكتب الافتراضي</Link><Link href={`/offices/${id}/settings`} className="nav-link">الإعدادات</Link><Link href="/neighbors" className="nav-link">الجيران</Link><Link href="/profile" className="nav-link">ملفي</Link><form action={signOut}><button className="nav-link">خروج</button></form></div></header>
    <section className="page-heading"><div><p className="eyebrow">إعداد مساحة العمل</p><h1>نبني مكتب {company.data.name}.</h1><p>ثلاث خطوات قصيرة، وبعدها تبدأ مساحة العمل وتكون جاهزة لفريقك.</p></div><span className="role-pill">{role === "owner" ? "رئيس الشركة" : role === "admin" ? "مدير الشركة" : "عضو"}</span></section>
    <div className="stepper"><span className="step current"><b>1</b><span>إنشاء الأقسام</span></span><span className="step-line"/><Link className={isReadyForTeam ? "step complete" : "step"} href={`/offices/${id}/team`}><b>2</b><span>إضافة الأعضاء</span></Link><span className="step-line"/><Link className="step" href={`/offices/${id}/work`}><b>3</b><span>بدء العمل</span></Link></div>
    <div className="setup-layout">
      <section className="panel setup-main"><div className="panel-heading"><div><h2>ابدأ بتقسيم فريقك</h2><p>الأقسام تساعدك على تنظيم الموظفين والمشاريع حسب طبيعة العمل.</p></div><span className="count-badge">{departmentRows.length} أقسام</span></div>
        {query.error && <div className="notice notice-error">تعذّر إنشاء القسم. تحقق من الاسم وصلاحيتك.</div>}
        {query.department === "created" && <div className="notice notice-success">تم إنشاء القسم. يمكنك إضافة قسم آخر أو الانتقال للخطوة التالية.</div>}
        {departmentRows.length ? <div className="department-grid">{departmentRows.map((d)=><article className="department-card" key={d.id}><span className="department-dot" style={{backgroundColor:d.color}}/><div><strong>{d.name}</strong><small>قسم في المكتب</small></div></article>)}</div> : <div className="empty-state"><span className="empty-icon">▦</span><strong>لا توجد أقسام بعد</strong><p>ابدأ بقسم أو أكثر مثل الإدارة، التسويق، المحتوى أو التقنية.</p></div>}
        {canManage && <form action={createDepartment} className="create-form"><input type="hidden" name="companyId" value={id}/><label>اسم القسم الجديد</label><div className="inline-form"><input className="field" name="departmentName" placeholder="مثال: التسويق" minLength={2} maxLength={60} required/><button className="primary-button" type="submit">إضافة القسم</button></div></form>}
        {!canManage && <div className="permission-note">إضافة الأقسام متاحة لرئيس الشركة ومديرها.</div>}
        <div className="panel-footer"><span className="text-xs text-slate-400">يمكنك تعديل الأقسام لاحقًا من إعدادات المكتب.</span><Link className={isReadyForTeam ? "primary-button" : "button-disabled"} href={isReadyForTeam ? `/offices/${id}/team` : "#"}>التالي: إضافة الأعضاء <span className="mr-2">←</span></Link></div>
      </section>
      <aside className="panel setup-aside"><span className="panel-icon">✳</span><h3>مكتبك بدأ يتشكّل</h3><p>بعد الأقسام، أضف أعضاء الفريق وحدد لكل شخص دوره ومسؤوليته. ويمكنك إدارة الصلاحيات أو إزالة أي عضو لاحقًا.</p><div className="setup-mini-stat"><span>الأعضاء الحاليون</span><strong>{members.count ?? 1}</strong></div><div className="setup-mini-stat"><span>الأقسام المكتملة</span><strong>{departmentRows.length}</strong></div></aside>
    </div>
  </div></main>;
}
