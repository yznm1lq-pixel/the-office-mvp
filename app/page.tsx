import Link from "next/link";
import { createCompany, signOut } from "./actions";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";

type Company = { id: string; name: string; slug: string; created_at: string };

function OfficePreview() {
  return (
    <div className="relative h-[270px] md:h-[340px] rounded-3xl overflow-hidden"
      style={{ background: "radial-gradient(ellipse at 50% 48%,#e4e1ff 0%,#f2f1ff 42%,#f8f8fc 78%)" }}>
      <div className="absolute inset-0 opacity-40" style={{ backgroundImage: "linear-gradient(30deg,#d8d5f0 1px,transparent 1px),linear-gradient(150deg,#d8d5f0 1px,transparent 1px)", backgroundSize: "34px 20px" }} />
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[280px] h-[160px] md:w-[390px] md:h-[210px]">
        <div className="absolute left-1/2 top-0 -translate-x-1/2 w-1/2 h-1/2 bg-[#d9d5fb] border border-[#b9b2ef] rotate-45 skew-x-[-0deg] rounded-lg shadow-sm" />
        <div className="absolute left-0 top-1/2 w-1/2 h-1/2 bg-[#c8c2f3] border border-[#aaa2e8] -rotate-[0deg] skew-y-[-0deg] rounded-lg shadow-sm" />
        <div className="absolute right-0 top-1/2 w-1/2 h-1/2 bg-[#b9b1ed] border border-[#9c92df] rounded-lg shadow-sm" />
        {[
          ["left-[12%] top-[26%]","👩🏻‍💻","#fff"],
          ["right-[12%] top-[26%]","👨🏽‍💻","#fff"],
          ["left-[42%] bottom-[2%]","🧑🏻‍🎨","#fff"],
        ].map(([pos,emoji,bg]) => <div key={pos} className={`absolute ${pos} z-10 w-12 h-12 rounded-2xl shadow-lg flex items-center justify-center text-2xl border-2 border-white`} style={{background:bg}}>{emoji}</div>)}
        <div className="absolute left-1/2 top-[44%] -translate-x-1/2 z-20 rounded-xl bg-white px-3 py-2 shadow-lg text-xs font-bold text-violet-700">مساحة فريقك</div>
      </div>
      <div className="absolute bottom-4 right-5 rounded-full bg-white/80 px-3 py-1.5 text-[11px] text-violet-700 border border-white">تصوّر المكتب التفاعلي</div>
    </div>
  );
}

export default async function HomePage({ searchParams }: { searchParams: Promise<{ created?: string; error?: string }> }) {
  const params = await searchParams;
  const configured = isSupabaseConfigured();
  let userEmail: string | null = null;
  let companies: Company[] = [];

  if (configured) {
    const supabase = await createClient();
    const { data } = await supabase.auth.getClaims();
    userEmail = typeof data?.claims?.email === "string" ? data.claims.email : null;
    if (userEmail) {
      const { data: rows } = await supabase.from("companies").select("id,name,slug,created_at").order("created_at", { ascending: false });
      companies = (rows ?? []) as Company[];
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
            <div className="flex gap-7 mt-12 text-sm text-slate-500"><span>✦ عربي من البداية</span><span>✦ مصمم للفِرق</span><span>✦ مساحة واحدة</span></div>
          </div>
          <OfficePreview />
        </section>
        <section id="features" className="max-w-6xl mx-auto grid md:grid-cols-3 gap-4 mt-20">
          {[
            ["01","مكتب تفاعلي","مساحة مرئية تقرّب الفريق وتمنح العمل مكانًا."],
            ["02","مشاريع ومهام","نظّم العمل وتابع تقدّمه من مكان واحد."],
            ["03","تواصل الفريق","محادثات داخلية تجمع الشركة وأقسامها."],
          ].map(([n,title,desc]) => <article key={n} className="surface rounded-2xl p-6"><span className="text-xs font-bold text-violet-600">{n}</span><h2 className="font-black text-lg mt-4">{title}</h2><p className="text-sm text-slate-500 leading-7 mt-2">{desc}</p></article>)}
        </section>
        <footer className="max-w-6xl mx-auto text-xs text-slate-400 mt-20 pb-8">المكتب · نسخة أولية قيد التطوير</footer>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="surface rounded-2xl px-5 py-4 flex items-center justify-between">
          <Link href="/" className="font-black text-xl">◈ المكتب</Link>
          <div className="flex items-center gap-4"><span className="hidden sm:block text-sm text-slate-500">{userEmail}</span><form action={signOut}><button className="text-sm text-slate-500 hover:text-rose-600">تسجيل الخروج</button></form></div>
        </header>
        <section className="mt-8 grid lg:grid-cols-[1fr_320px] gap-6">
          <div className="surface rounded-3xl p-7 md:p-9">
            <p className="text-sm font-bold text-violet-700">مساحة العمل</p>
            <h1 className="text-3xl font-black mt-2">أهلًا بك في المكتب 👋</h1>
            <p className="text-slate-500 mt-3 leading-7">حسابك جاهز. الخطوة التالية هي إنشاء شركتك وتجهيز مساحتك الافتراضية.</p>
            {params.created === "1" && <p className="mt-5 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">تم إنشاء الشركة بنجاح.</p>}
            {params.error && <p className="mt-5 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">تعذّر إكمال العملية. تحقق من البيانات وحاول مرة أخرى.</p>}
            <div className="mt-8">
              <h2 className="font-bold mb-4">شركاتك</h2>
              {companies.length ? <div className="grid sm:grid-cols-2 gap-3">{companies.map((company) => <div key={company.id} className="rounded-2xl border border-slate-200 bg-white p-5"><div className="w-10 h-10 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center font-black">م</div><h3 className="font-bold mt-3">{company.name}</h3><p className="text-xs text-slate-400 mt-1">مساحة عمل نشطة</p></div>)}</div> : <div className="rounded-2xl border border-dashed border-violet-200 bg-violet-50/60 p-6"><p className="font-bold">لم تنشئ شركتك بعد</p><p className="text-sm text-slate-500 mt-1">أنشئ أول مساحة عمل لتبدأ بإضافة الأقسام والمشاريع.</p></div>}
            </div>
            <form action={createCompany} className="mt-7 flex flex-col sm:flex-row gap-3">
              <input className="field flex-1" name="companyName" placeholder="اسم الشركة أو الفريق" minLength={2} maxLength={80} required />
              <button className="primary-button whitespace-nowrap" type="submit">إنشاء شركة جديدة</button>
            </form>
          </div>
          <aside className="surface rounded-3xl p-6">
            <p className="text-xs font-bold text-slate-400">الخطوة التالية</p>
            <h2 className="font-black text-xl mt-2">تجهيز المكتب</h2>
            <div className="space-y-4 mt-6">
              {["إنشاء الشركة","إضافة الأقسام","دعوة أعضاء الفريق","إطلاق أول مشروع"].map((step,i)=><div key={step} className="flex items-center gap-3"><span className="w-8 h-8 rounded-full bg-violet-50 text-violet-700 flex items-center justify-center text-xs font-bold">{i+1}</span><span className="text-sm text-slate-600">{step}</span></div>)}
            </div>
            <div className="mt-8 rounded-2xl bg-slate-50 p-4"><p className="text-xs text-slate-500 leading-6">نبني المكتب على مراحل. سنفعّل كل جزء بعد ربطه بقاعدة البيانات والصلاحيات، دون أزرار شكلية.</p></div>
          </aside>
        </section>
      </div>
    </main>
  );
}