import Link from "next/link";
import { createCompany, signOut } from "./actions";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { DashboardRefresh } from "@/components/dashboard-refresh";

type Company = { id: string; name: string; slug: string; created_at: string };
type OfficeStats = Company & { employees: number; activeEmployees: number };

export default async function HomePage({ searchParams }: { searchParams: Promise<{ error?: string; department?: string }> }) {
  const params = await searchParams;
  const configured = isSupabaseConfigured();
  let userEmail: string | null = null;
  let userId: string | null = null;
  let isPlatformAdmin = false;
  let offices: OfficeStats[] = [];

  if (configured) {
    const supabase = await createClient();
    const { data } = await supabase.auth.getClaims();
    userEmail = typeof data?.claims?.email === "string" ? data.claims.email : null;
    userId = typeof data?.claims?.sub === "string" ? data.claims.sub : null;
    if (userEmail) {
      const { data: adminFlag } = await supabase.rpc("is_platform_admin");
      isPlatformAdmin = adminFlag === true;
    }

    if (userId) {
      // لا تعرض أي شركة إلا إذا كان المستخدم عضوًا فيها.
      const { data: memberships } = await supabase.from("company_members").select("company_id").eq("user_id", userId);
      const companyIds = [...new Set((memberships ?? []).map((membership) => membership.company_id))];
      const { data: rows } = companyIds.length
        ? await supabase.from("companies").select("id,name,slug,created_at").in("id", companyIds).order("created_at", { ascending: false })
        : { data: [] };
      const companies = (rows ?? []) as Company[];
      const activeSince = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      offices = await Promise.all(companies.map(async (company) => {
        const [members, active] = await Promise.all([
          supabase.from("company_members").select("user_id", { count: "exact", head: true }).eq("company_id", company.id),
          supabase.from("office_presence").select("user_id", { count: "exact", head: true }).eq("company_id", company.id).gte("last_seen_at", activeSince),
        ]);
        return { ...company, employees: members.count ?? 0, activeEmployees: active.count ?? 0 };
      }));
    }
  }

  if (!userEmail) {
    return (
      <main className="min-h-screen px-5 py-16">
        <nav className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/" className="font-black text-xl tracking-tight">◈ المكتب</Link>
          <Link href="/login" className="primary-button">ابدأ الآن</Link>
        </nav>
        <section className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-12 items-center pt-16 md:pt-24">
          <div>
            <p className="text-violet-700 font-bold text-sm mb-5">مساحة عمل افتراضية للفِرق العربية</p>
            <h1 className="text-5xl md:text-6xl font-black leading-[1.2] tracking-tight">مكتبك، فريقك،<br /><span className="text-violet-700">كل شغلك.</span></h1>
            <p className="text-slate-500 text-lg leading-9 mt-7 max-w-xl">اجمع فريقك ومشاريعك ومهامك ومحادثاتك في مساحة عمل واحدة. ابدأ ببناء مكتبك الافتراضي، واترك الباقي يكبر مع فريقك.</p>
            <div className="flex flex-wrap gap-3 mt-9">
              <Link href="/login" className="primary-button">أنشئ مكتبك مجانًا <span className="mr-2">←</span></Link>
              <a href="#features" className="rounded-xl border border-slate-200 bg-white px-5 py-3 font-bold text-slate-600">اكتشف الفكرة</a>
            </div>
          </div>
          <div className="office-hero-art">
            <div className="office-art-grid" />
            <div className="office-art-floor"><span>◈</span><span>▦</span><span>⌘</span></div>
            <div className="office-art-label">مساحة فريقك تبدأ من هنا</div>
          </div>
        </section>
        <section id="features" className="max-w-6xl mx-auto grid md:grid-cols-3 gap-4 mt-20">
          {[
            ["01", "مكتب تفاعلي", "مساحة مرئية تقرّب الفريق وتمنح العمل مكانًا."],
            ["02", "مشاريع ومهام", "نظّم العمل وتابع تقدّمه من مكان واحد."],
            ["03", "تواصل الفريق", "محادثات داخلية تجمع الشركة وأقسامها."],
          ].map(([n, title, desc]) => <article key={n} className="surface rounded-2xl p-6"><span className="text-xs font-bold text-violet-600">{n}</span><h2 className="font-black text-lg mt-4">{title}</h2><p className="text-sm text-slate-500 leading-7 mt-2">{desc}</p></article>)}
        </section>
        <footer className="max-w-6xl mx-auto text-xs text-slate-400 mt-20 pb-8">المكتب · نسخة أولية قيد التطوير</footer>
      </main>
    );
  }

  const officeCount = offices.length;
  const employeeTotal = offices.reduce((sum, office) => sum + office.employees, 0);
  const activeOfficeCount = offices.filter((office) => office.activeEmployees > 0).length;

  return (
    <main className="min-h-screen px-4 py-6 md:px-8 md:py-9">
      <DashboardRefresh />
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-3 font-black text-xl"><span className="brand-mark">◈</span> المكتب</Link>
          <div className="flex items-center gap-4">{isPlatformAdmin && <Link href="/platform-admin" className="secondary-button">إدارة المنصة</Link>}<span className="hidden text-sm text-slate-500 sm:block">{userEmail}</span><form action={signOut}><button className="text-sm font-semibold text-slate-500 hover:text-rose-600">تسجيل الخروج</button></form></div>
        </header>

        <section className="mt-9 flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div><p className="text-sm font-bold text-violet-700">{officeCount ? "مساحة فريقك" : "مرحبًا بك في المكتب"}</p><h1 className="mt-2 text-3xl font-black tracking-tight md:text-4xl">{officeCount ? "مساحة عملك من مكان واحد" : "ابدأ بإنشاء شركتك أو انضم إلى فريقك"}</h1><p className="mt-3 text-sm leading-7 text-slate-500">{officeCount ? "هذه هي الشركات التي أنت عضو فيها فقط." : "لن نعرض لك لوحة إدارة قبل أن تنشئ شركة أو تقبل دعوة للانضمام إلى شركة."}</p></div>
          <span className="rounded-full border border-violet-100 bg-violet-50 px-4 py-2 text-xs font-bold text-violet-700">الباقة المجانية · مكتب واحد</span>
        </section>

        {params.error === "company-limit" && <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">وصلت إلى الحد المسموح في الباقة المجانية. يمكنك إدارة مكاتبك الحالية من هذه الصفحة.</div>}
        {params.error && params.error !== "company-limit" && <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">لم نتمكن من إكمال العملية. حاول مرة أخرى.</div>}

        <section className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <article className="stat-card"><span className="stat-icon">▦</span><p className="mt-4 text-sm text-slate-500">إجمالي المكاتب</p><p className="mt-1 text-3xl font-black tabular-nums">{officeCount}</p></article>
          <article className="stat-card"><span className="stat-icon">♙</span><p className="mt-4 text-sm text-slate-500">إجمالي الموظفين والأعضاء</p><p className="mt-1 text-3xl font-black tabular-nums">{employeeTotal}</p></article>
          <article className="stat-card"><span className="stat-icon stat-icon-live">●</span><p className="mt-4 text-sm text-slate-500">مكاتب نشطة الآن</p><p className="mt-1 text-3xl font-black tabular-nums">{activeOfficeCount}</p><p className="mt-2 text-xs text-slate-400">نشط = عضو واحد على الأقل خلال آخر 5 دقائق</p></article>
        </section>

        <section className="mt-10">
          <div className="mb-5 flex items-center justify-between"><div><h2 className="text-xl font-black">مكاتبي</h2><p className="mt-1 text-sm text-slate-500">ادخل إلى مكتبك الافتراضي، وتابع فريقك وأعمالك وإعداداتك.</p></div><span className="text-xs text-slate-400">{officeCount} مكتب</span></div>
          {offices.length ? (
            <div className="grid gap-4 lg:grid-cols-2">
              {offices.map((office) => (
                <Link href={`/offices/${office.id}/virtual`} key={office.id} className="office-card group">
                  <div className="flex items-start justify-between gap-3"><div className="flex items-center gap-3"><span className="office-card-mark">◈</span><div><h3 className="font-black">{office.name}</h3><p className="mt-1 text-xs text-slate-400">أنشئ في {new Date(office.created_at).toLocaleDateString("ar-SA")}</p></div></div><span className={office.activeEmployees ? "status-live" : "status-idle"}><i />{office.activeEmployees ? "نشط الآن" : "غير نشط"}</span></div>
                  <div className="mt-7 flex items-center gap-7 border-t border-slate-100 pt-5"><div><p className="text-xs text-slate-400">الأعضاء</p><p className="mt-1 text-lg font-black tabular-nums">{office.employees}</p></div><div><p className="text-xs text-slate-400">متصلون الآن</p><p className="mt-1 text-lg font-black tabular-nums">{office.activeEmployees}</p></div><span className="mr-auto text-sm font-bold text-violet-700 transition group-hover:-translate-x-1">دخول المكتب الافتراضي ←</span></div>
                </Link>
              ))}
            </div>
          ) : <div className="empty-state"><span className="text-3xl">◈</span><h3 className="mt-3 font-black">لم تنشئ مكتبك بعد</h3><p className="mt-2 text-sm text-slate-500">ابدأ بإنشاء مساحة عملك الأولى.</p></div>}
        </section>

        {officeCount === 0 && <section className="mt-7 rounded-3xl border border-violet-100 bg-white p-6 md:p-8"><div className="max-w-xl"><h2 className="text-xl font-black">ابدأ مساحة عملك</h2><p className="mt-2 text-sm leading-7 text-slate-500">أنشئ شركتك لتصبح رئيسها، أو افتح رابط دعوة وصلك من مدير شركتك للانضمام كموظف.</p><form action={createCompany} className="mt-5 flex flex-col gap-3 sm:flex-row"><input className="field flex-1" name="companyName" placeholder="اسم الشركة أو الفريق" minLength={2} maxLength={80} required /><button className="primary-button whitespace-nowrap" type="submit">إنشاء المكتب</button></form></div></section>}
        <p className="mt-10 text-center text-xs text-slate-400">يتم تحديث مؤشرات النشاط تلقائيًا كل 30 ثانية.</p>
      </div>
    </main>
  );
}
