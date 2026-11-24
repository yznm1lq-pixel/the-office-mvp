import Link from "next/link";
import { acceptInvitation } from "@/app/actions";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

type Props = { params: Promise<{ token: string }>; searchParams: Promise<{ error?: string }> };

export default async function InvitePage({ params, searchParams }: Props) {
  const { token } = await params;
  const query = await searchParams;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  if (!auth?.claims?.sub) redirect(`/login?next=/invite/${encodeURIComponent(token)}`);
  return <main className="min-h-screen flex items-center justify-center p-5"><section className="panel invite-accept-card">
    <span className="brand-mark">◈</span><p className="eyebrow mt-6">دعوة للانضمام</p><h1 className="mt-2 text-3xl font-black">أنت مدعو إلى فريق عمل.</h1><p className="mt-3 text-sm leading-7 text-slate-500">إذا كان بريد حسابك هو البريد الذي استقبل الدعوة، يمكنك الانضمام الآن.</p>
    {query.error && <div className="notice notice-error">الرابط غير صالح أو انتهت صلاحيته أو أن البريد لا يطابق الدعوة.</div>}
    <form action={acceptInvitation} className="mt-7"><input type="hidden" name="token" value={token}/><button className="primary-button w-full" type="submit">قبول الدعوة والانضمام</button></form>
    <Link href="/" className="block mt-5 text-center text-sm font-semibold text-violet-700">العودة إلى المكتب</Link>
  </section></main>;
}
