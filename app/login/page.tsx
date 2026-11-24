import Link from "next/link";
import { signIn, signUp } from "./actions";
import { isSupabaseConfigured } from "@/lib/env";

type Props = { searchParams: Promise<{ error?: string; message?: string; next?: string }> };

export default async function LoginPage({ searchParams }: Props) {
  const params = await searchParams;
  const configured = isSupabaseConfigured();
  const next = params.next?.startsWith("/") && !params.next.startsWith("//") ? params.next : "/";
  return <main className="auth-shell">
    <div className="auth-orbit auth-orbit-one"/><div className="auth-orbit auth-orbit-two"/>
    <div className="auth-frame">
      <section className="auth-story">
        <Link href="/" className="brand-lockup brand-lockup-light"><span className="brand-mark">◈</span><span>المكتب</span></Link>
        <div className="auth-story-copy"><span className="eyebrow-light">مساحة عمل واحدة، إنجاز أكبر</span><h1>خلّ فريقك<br/><em>في قلب العمل.</em></h1><p>من أول قسم تنشئه، إلى آخر مهمة ينجزها فريقك؛ مساحة واضحة تجمع الأشخاص والعمل والتواصل.</p></div>
        <div className="auth-story-foot"><span>01 / WORKSPACE</span><span>THE OFFICE · 2026</span></div>
      </section>
      <section className="auth-form-panel">
        <div className="auth-form-inner">
          <p className="eyebrow">مساحة عملك تبدأ باسمك</p><h2>أهلًا بك.</h2><p className="auth-description">استخدم اسم المستخدم وكلمة المرور. لا نطلب بريدًا إلكترونيًا لإنشاء الحساب.</p>
          {!configured ? <div className="notice notice-error">إعدادات الاتصال بقاعدة البيانات غير مكتملة.</div> : <>
            {params.error === "auth-config" && <div className="notice notice-error">تعذر إنشاء جلسة الحساب. تحقق من إعدادات المصادقة ثم أعد المحاولة.</div>}{params.error === "signup" && <div className="notice notice-error">اسم المستخدم مستخدم أو كلمة المرور غير صالحة.</div>}
            {params.error && <div className="notice notice-error">{params.error === "credentials" ? "البريد أو كلمة المرور غير صحيحة." : "تعذر إكمال العملية. راجع البيانات وحاول مجددًا."}</div>}
            <form action={signIn} className="auth-form"><input type="hidden" name="next" value={next}/><label>اسم المستخدم</label><input className="field" name="username" autoComplete="username" placeholder="مثال: yazan_01" required minLength={3}/><label>كلمة المرور</label><input className="field" type="password" name="password" autoComplete="current-password" placeholder="••••••••" minLength={8} required/><button className="primary-button w-full" type="submit">دخول إلى المكتب <span className="mr-2">←</span></button></form><div className="auth-divider"><span/> حساب جديد <span/></div><form action={signUp} className="auth-form"><input type="hidden" name="next" value="/onboarding/profile"/><label>اسم المستخدم</label><input className="field" name="username" autoComplete="username" placeholder="حروف إنجليزية وأرقام و _" required minLength={3} maxLength={24} pattern="[a-zA-Z0-9_]{3,24}"/><label>كلمة المرور</label><input className="field" type="password" name="password" autoComplete="new-password" placeholder="8 أحرف على الأقل" minLength={8} required/><button className="secondary-button w-full" type="submit">إنشاء حساب جديد</button></form>
          </>}
          <Link href="/" className="auth-back">العودة إلى الصفحة الرئيسية</Link>
        </div>
      </section>
    </div>
  </main>;
}
