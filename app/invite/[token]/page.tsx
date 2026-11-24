import Link from "next/link";
import { acceptInvitation } from "@/app/actions";
import { signInFromInvitation, signUpFromInvitation } from "@/app/login/actions";
import { createClient } from "@/lib/supabase/server";

type Props = { params: Promise<{ token: string }>; searchParams: Promise<{ error?: string; message?: string }> };

export default async function InvitePage({ params, searchParams }: Props) {
  const { token } = await params;
  const query = await searchParams;
  const supabase = await createClient();
  const [{ data: auth }, { data: preview }] = await Promise.all([
    supabase.auth.getClaims(),
    supabase.rpc("preview_company_invitation", { p_token: token }),
  ]);
  const invitation = Array.isArray(preview) ? preview[0] : preview;
  const isSignedIn = Boolean(auth?.claims?.sub);

  return <main className="auth-shell">
    <div className="auth-orbit auth-orbit-one"/><div className="auth-orbit auth-orbit-two"/>
    <section className="invite-page-card">
      <div className="invite-brand"><span className="brand-mark">◈</span><span>المكتب</span></div>
      {invitation ? <>
        <div className="invite-company-mark">{invitation.company_logo_url ? <img src={invitation.company_logo_url} alt="" /> : "◈"}</div>
        <p className="eyebrow">دعوة خاصة للانضمام</p>
        <h1>أهلًا بك في {invitation.company_name}</h1>
        <p className="invite-description">{invitation.company_description || "تمت دعوتك لتكون جزءًا من فريق هذا المكتب الافتراضي."}</p>
        <div className="invite-meta">
          <span>البريد المدعو</span><strong dir="ltr">{invitation.invited_email}</strong>
          <span>الدور</span><strong>{invitation.invited_role === "admin" ? "مدير الشركة" : invitation.invited_role === "department_head" ? "مدير قسم" : "موظف"}{invitation.department_name ? ` · ${invitation.department_name}` : ""}</strong>
        </div>
        {query.message === "check-email" && <div className="notice notice-success">أرسلنا رسالة تأكيد إلى بريدك. افتح الرسالة لتفعيل الحساب، وستعود إلى هذه الدعوة تلقائيًا.</div>}
        {query.error && <div className="notice notice-error">{query.error === "credentials" ? "بيانات الدخول غير صحيحة." : "تعذر إكمال العملية. تحقق من البريد وكلمة المرور أو اطلب دعوة جديدة."}</div>}
        {isSignedIn ? <form action={acceptInvitation} className="mt-7">
          <input type="hidden" name="token" value={token}/>
          <button className="primary-button w-full" type="submit">قبول الدعوة والانضمام إلى المكتب ←</button>
        </form> : <div className="invite-auth-grid">
          <form action={signUpFromInvitation} className="invite-auth-form">
            <h2>ليس لديك حساب؟</h2><p>أنشئ حسابك هنا، وسيُربط تلقائيًا بهذه الدعوة.</p>
            <input type="hidden" name="token" value={token}/>
            <label>الاسم الكامل</label><input className="field" name="fullName" autoComplete="name" minLength={2} placeholder="اكتب اسمك" required/>
            <label>البريد الإلكتروني</label><input className="field" name="email" type="email" autoComplete="email" defaultValue={invitation.invited_email} required/>
            <label>كلمة المرور</label><input className="field" name="password" type="password" autoComplete="new-password" minLength={8} placeholder="8 أحرف على الأقل" required/>
            <button className="primary-button w-full" type="submit">إنشاء الحساب والانضمام</button>
          </form>
          <form action={signInFromInvitation} className="invite-auth-form invite-existing">
            <h2>لديك حساب بالفعل؟</h2><p>سجّل الدخول وسيتم إكمال الانضمام من نفس الصفحة.</p>
            <input type="hidden" name="token" value={token}/>
            <label>البريد الإلكتروني</label><input className="field" name="email" type="email" autoComplete="email" defaultValue={invitation.invited_email} required/>
            <label>كلمة المرور</label><input className="field" name="password" type="password" autoComplete="current-password" required/>
            <button className="secondary-button w-full" type="submit">تسجيل الدخول</button>
          </form>
        </div>}
      </> : <>
        <p className="eyebrow">رابط الدعوة</p><h1>هذا الرابط غير صالح</h1>
        <p className="invite-description">قد تكون الدعوة انتهت صلاحيتها أو تم استخدامها. اطلب من مدير المكتب إنشاء رابط جديد.</p>
      </>}
      <Link href="/" className="auth-back">العودة إلى الصفحة الرئيسية</Link>
    </section>
  </main>;
}
