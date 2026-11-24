import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createDepartment, signOut } from "@/app/actions";
import { createClient } from "@/lib/supabase/server";
import { PresenceHeartbeat } from "@/components/presence-heartbeat";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; department?: string }> };

export default async function OfficePage({ params, searchParams }: Props) {
  const { id } = await params;
  const query = await searchParams;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims?.sub) redirect("/login");

  const [companyResult, departmentsResult, membersResult, projectsResult, tasksResult] = await Promise.all([
    supabase.from("companies").select("id,name,created_at").eq("id", id).maybeSingle(),
    supabase.from("departments").select("id,name,color,created_at").eq("company_id", id).order("created_at"),
    supabase.from("company_members").select("user_id", { count: "exact", head: true }).eq("company_id", id),
    supabase.from("projects").select("id", { count: "exact", head: true }).eq("company_id", id),
    supabase.from("tasks").select("id", { count: "exact", head: true }).eq("company_id", id),
  ]);

  const company = companyResult.data;
  if (!company) notFound();
  const departments = departmentsResult.data ?? [];

  return (
    <main className="min-h-screen px-4 py-6 md:px-8 md:py-9">
      <PresenceHeartbeat companyId={id} />
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3"><Link href="/" className="brand-mark">◈</Link><div><p className="text-xs text-slate-400">إدارة المكاتب /</p><h1 className="font-black">{company.name}</h1></div></div>
          <div className="flex items-center gap-4"><Link href="/" className="text-sm font-bold text-violet-700">لوحة المكاتب</Link><form action={signOut}><button className="text-sm text-slate-500">تسجيل الخروج</button></form></div>
        </header>

        <section className="mt-9 rounded-[28px] bg-gradient-to-l from-[#28234f] via-[#443b83] to-[#6558d3] p-7 text-white md:p-10">
          <p className="text-sm font-bold text-violet-200">مساحة العمل الخاصة بك</p>
          <div className="mt-3 flex flex-col justify-between gap-6 md:flex-row md:items-end"><div><h2 className="text-3xl font-black md:text-4xl">مرحبًا بك في {company.name}</h2><p className="mt-3 max-w-2xl text-sm leading-7 text-white/70">ابدأ بتجهيز بيئة فريقك. أنشئ الأقسام التي يعمل من خلالها فريقك، ثم انتقل إلى المشاريع والمهام.</p></div><span className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs">المكتب جاهز للإعداد</span></div>
        </section>

        <section className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          <article className="stat-card"><p className="text-sm text-slate-500">أعضاء المكتب</p><p className="mt-2 text-2xl font-black">{membersResult.count ?? 0}</p></article>
          <article className="stat-card"><p className="text-sm text-slate-500">الأقسام</p><p className="mt-2 text-2xl font-black">{departments.length}</p></article>
          <article className="stat-card"><p className="text-sm text-slate-500">المشاريع</p><p className="mt-2 text-2xl font-black">{projectsResult.count ?? 0}</p></article>
          <article className="stat-card"><p className="text-sm text-slate-500">المهام</p><p className="mt-2 text-2xl font-black">{tasksResult.count ?? 0}</p></article>
        </section>

        <div className="mt-9 grid gap-6 lg:grid-cols-[1fr_340px]">
          <section className="surface rounded-3xl p-6 md:p-8">
            <div className="flex items-center justify-between gap-3"><div><h3 className="text-xl font-black">أقسام المكتب</h3><p className="mt-1 text-sm text-slate-500">قسّم فريقك حسب طبيعة العمل.</p></div><span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-bold text-violet-700">{departments.length} أقسام</span></div>
            {query.error === "department" && <p className="mt-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">تعذّر إنشاء القسم. تأكد من الاسم وصلاحيتك.</p>}
            {query.department === "created" && <p className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">تم إنشاء القسم بنجاح.</p>}
            {departments.length ? <div className="mt-6 grid gap-3 sm:grid-cols-2">{departments.map((department) => <div key={department.id} className="rounded-2xl border border-slate-100 bg-white p-4"><div className="flex items-center gap-3"><span className="h-3 w-3 rounded-full" style={{ backgroundColor: department.color }} /><div><p className="font-bold">{department.name}</p><p className="mt-1 text-xs text-slate-400">قسم في المكتب</p></div></div></div>)}</div> : <div className="empty-state mt-6"><span className="text-3xl">▦</span><p className="mt-3 font-bold">ابدأ بأول قسم</p><p className="mt-1 text-sm text-slate-500">مثل: الإدارة، المحتوى، التسويق، التقنية.</p></div>}
            <form action={createDepartment} className="mt-6 flex flex-col gap-3 sm:flex-row"><input type="hidden" name="companyId" value={id} /><input className="field flex-1" name="departmentName" placeholder="اسم القسم الجديد" minLength={2} maxLength={60} required /><button className="primary-button" type="submit">إضافة قسم</button></form>
          </section>

          <aside className="surface rounded-3xl p-6">
            <h3 className="font-black">خطوات تجهيز المكتب</h3>
            <div className="mt-6 space-y-5">
              <div className="setup-step setup-step-done"><span>✓</span><div><p className="font-bold">إنشاء المكتب</p><p className="text-xs text-slate-400">اكتمل</p></div></div>
              <div className={departments.length ? "setup-step setup-step-done" : "setup-step"}><span>{departments.length ? "✓" : "2"}</span><div><p className="font-bold">إنشاء الأقسام</p><p className="text-xs text-slate-400">{departments.length ? `${departments.length} أقسام جاهزة` : "ابدأ بإضافة أقسام فريقك"}</p></div></div>
              <div className="setup-step"><span>3</span><div><p className="font-bold">دعوة أعضاء الفريق</p><p className="text-xs text-slate-400">الخطوة التالية بعد إعداد الأقسام</p></div></div>
              <div className="setup-step"><span>4</span><div><p className="font-bold">إطلاق أول مشروع</p><p className="text-xs text-slate-400">تنظيم العمل ومتابعة المهام</p></div></div>
            </div>
            <div className="mt-7 rounded-2xl bg-violet-50 p-4"><p className="text-sm font-bold text-violet-800">مكتبك بدأ يتشكل</p><p className="mt-2 text-xs leading-6 text-violet-700">كل قسم تضيفه سيظهر هنا، وستكون هذه الصفحة نقطة الدخول لإدارة مساحة فريقك.</p></div>
          </aside>
        </div>
      </div>
    </main>
  );
}
