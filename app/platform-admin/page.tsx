import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "@/app/actions";

export default async function PlatformAdminPage() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims?.sub) redirect("/login");
  const { data: isAdmin, error: adminError } = await supabase.rpc("is_platform_admin");
  if (adminError || !isAdmin) notFound();
  const { data: offices, error } = await supabase.rpc("platform_admin_offices");
  if (error) throw new Error("تعذر تحميل بيانات إدارة المنصة.");

  const rows = offices ?? [];
  const totalEmployees = rows.reduce((sum: number, office: any) => sum + Number(office.employee_count ?? 0), 0);
  const activeOffices = rows.filter((office: any) => Number(office.active_employee_count ?? 0) > 0).length;
  const activePeople = rows.reduce((sum: number, office: any) => sum + Number(office.active_employee_count ?? 0), 0);

  return <main className="app-shell"><div className="mx-auto max-w-7xl">
    <header className="app-header"><Link href="/" className="brand-lockup"><span className="brand-mark">◈</span><span>المكتب</span></Link><div className="flex items-center gap-4"><Link href="/" className="nav-link">حسابي</Link><form action={signOut}><button className="nav-link">خروج</button></form></div></header>
    <section className="page-heading"><div><p className="eyebrow">مساحة خاصة بمالك المنصة</p><h1>مركز إدارة المكاتب.</h1><p>نظرة تشغيلية على جميع المكاتب المسجلة في المنصة.</p></div><span className="role-pill">مدير المنصة</span></section>
    <section className="work-stats">
      <article className="stat-card"><span className="stat-icon">▦</span><p>إجمالي المكاتب</p><strong>{rows.length}</strong></article>
      <article className="stat-card"><span className="stat-icon">♙</span><p>إجمالي الأعضاء</p><strong>{totalEmployees}</strong></article>
      <article className="stat-card"><span className="stat-icon">●</span><p>مكاتب نشطة الآن</p><strong>{activeOffices}</strong></article>
    </section>
    <section className="panel"><div className="panel-heading"><div><h2>جميع المكاتب</h2><p>{activePeople} عضو نشط حاليًا عبر المنصة</p></div><span className="count-badge">{rows.length} مكتب</span></div>
      <div className="admin-office-list">
        {rows.map((office: any)=><article className="admin-office-row" key={office.id}>
          <div className="office-card-mark">◈</div><div className="min-w-0 flex-1"><strong>{office.name}</strong><p>تاريخ الإنشاء: {new Date(office.created_at).toLocaleDateString("ar-SA")}</p></div>
          <div className="admin-metric"><strong>{office.employee_count}</strong><span>الأعضاء</span></div>
          <div className="admin-metric"><strong>{office.active_employee_count}</strong><span>نشطون الآن</span></div>
          <Link href={`/offices/${office.id}`} className="secondary-button">عرض المكتب</Link>
        </article>)}
        {!rows.length && <div className="empty-state">لا توجد مكاتب مسجلة حتى الآن.</div>}
      </div>
    </section>
    <p className="mt-5 text-xs text-slate-400">هذه الصفحة محمية بصلاحية مخزنة في قاعدة البيانات، ولا تظهر إلا للحساب المصرح له بامتلاك المنصة.</p>
  </div></main>;
}
