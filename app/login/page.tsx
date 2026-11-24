import Link from "next/link";
import { signIn, signUp } from "./actions";
import { isSupabaseConfigured } from "@/lib/env";

type Props = { searchParams: Promise<{ error?: string; message?: string }> };

export default async function LoginPage({ searchParams }: Props) {
  const params = await searchParams;
  const configured = isSupabaseConfigured();

  return (
    <main className="min-h-screen px-5 py-12 flex items-center justify-center">
      <div className="w-full max-w-5xl grid md:grid-cols-2 gap-6 items-stretch">
        <section className="rounded-[30px] p-9 md:p-12 text-white relative overflow-hidden"
          style={{ background: "linear-gradient(145deg,#29264f,#5549a9 65%,#8177e5)" }}>
          <div className="absolute -left-20 -bottom-24 w-72 h-72 rounded-full border border-white/15" />
          <div className="absolute left-8 bottom-8 w-44 h-44 rounded-full border border-white/10" />
          <Link href="/" className="text-white/90 font-bold tracking-wide">◈ المكتب</Link>
          <div className="mt-24 relative">
            <p className="text-sm text-violet-200 mb-4">مساحة واحدة. فريق أقرب.</p>
            <h1 className="text-4xl md:text-5xl font-black leading-tight">خلّ الشغل<br />يمشي مع فريقك.</h1>
            <p className="text-white/70 leading-8 mt-6 max-w-sm">مكتب افتراضي يجمع الأشخاص والمشاريع والمهام والتواصل في تجربة عمل واحدة.</p>
          </div>
          <div className="mt-20 text-xs text-white/45">THE OFFICE · WORKSPACE MVP</div>
        </section>

        <section className="surface rounded-[30px] p-7 md:p-10">
          <p className="text-sm text-violet-700 font-bold">أهلًا بك في المكتب</p>
          <h2 className="text-2xl font-black mt-2">ابدأ مساحة عملك</h2>
          <p className="text-sm text-slate-500 mt-2 mb-7">سجّل الدخول أو أنشئ حسابك للبدء.</p>

          {!configured ? (
            <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 text-sm leading-7 text-amber-900">
              لم يتم ربط مفاتيح Supabase بعد. أضف المتغيرات الموجودة في ملف <code>.env.example</code> إلى إعدادات البيئة.
            </div>
          ) : (
            <>
              {params.message === "check-email" && <p className="mb-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">تحقق من بريدك الإلكتروني لتأكيد الحساب، ثم سجّل الدخول.</p>}
              {params.error && <p className="mb-4 rounded-xl bg-rose-50 p-3 text-sm text-rose-700">تعذّر إكمال العملية. تحقق من البيانات وحاول مرة أخرى.</p>}

              <form action={signIn} className="space-y-3">
                <label className="block text-sm font-semibold">البريد الإلكتروني</label>
                <input className="field" type="email" name="email" placeholder="name@example.com" required />
                <label className="block text-sm font-semibold pt-2">كلمة المرور</label>
                <input className="field" type="password" name="password" placeholder="••••••••" minLength={8} required />
                <button className="primary-button w-full mt-3" type="submit">تسجيل الدخول</button>
              </form>

              <div className="flex items-center gap-3 my-6 text-xs text-slate-400"><span className="h-px bg-slate-200 flex-1" /> حساب جديد <span className="h-px bg-slate-200 flex-1" /></div>

              <form action={signUp} className="space-y-3">
                <input className="field" name="fullName" placeholder="الاسم الكامل" required minLength={2} />
                <input className="field" type="email" name="email" placeholder="البريد الإلكتروني" required />
                <input className="field" type="password" name="password" placeholder="كلمة مرور (8 أحرف على الأقل)" required minLength={8} />
                <button className="w-full rounded-xl border border-violet-200 bg-violet-50 py-3 font-bold text-violet-800 hover:bg-violet-100" type="submit">إنشاء حساب جديد</button>
              </form>
            </>
          )}
          <Link href="/" className="block text-center text-xs text-slate-400 mt-7">العودة إلى الرئيسية</Link>
        </section>
      </div>
    </main>
  );
}