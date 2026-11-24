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
          <p className="eyebrow">مرحبًا بك من جديد</p><h2>ابدأ من هنا.</h2><p className="auth-description">سجّل الدخول إلى مساحة عملك أو أنشئ حسابًا جديدًا.</p>
          {!configured ? <div className="notice notice-error">إعدادات الاتصال بقاعدة البيانات غير مكتملة.</div> : <>
            {params.message === "check-email" && <div className="notice notice-success">أرسلنا رسالة تأكيد إلى بريدك. بعد التأكيد ستعود إلى الخطوة التي بدأت منها.</div>}
            {params.error && <div className="notice notice-error">{params.error === "credentials" ? "البريد أو كلمة المرور غير صحيحة." : "تعذر إكمال العملية. راجع البيانات وحاول مجددًا."}</div>}
            <form action={signIn} className="auth-form"><input type="hidden" name="next" value={next}/><label>البريد الإلكتروني</label><input className="field" type="email" name="email" autoComplete="email" placeholder="name@company.com" required/><label>كلمة المرور</label><input className="field" type="password" name="password" autoComplete="current-password" placeholder="••••••••" minLength={8} required/><button className="primary-button w-full" type="submit">تسجيل الدخول <span className="mr-2">←</span></button></form>
            <div className="auth-divider"><span/> أو أنشئ حسابًا جديدًا <span/></div>
            <form action={signUp} className="auth-form"><input type="hidden" name="next" value={next}/><label>الاسم الكامل</label><input className="field" name="fullName" autoComplete="name" placeholder="اسمك" required minLength={2}/><label>البريد الإلكتروني</label><input className="field" type="email" name="email" autoComplete="email" placeholder="name@company.com" required/><label>كلمة المرور</label><input className="field" type="password" name="password" autoComplete="new-password" placeholder="8 أحرف على الأقل" minLength={8} required/><button className="secondary-button w-full" type="submit">إنشاء حساب</button></form>
          </>}
          <Link href="/" className="auth-back">العودة إلى الصفحة الرئيسية</Link>
        </div>
      </section>
    </div>
  </main>;
}
