import Link from "next/link";
import {redirect} from "next/navigation";
import {createClient} from "@/lib/supabase/server";
import ProfileEditor from "@/components/profile-editor";
type Props={searchParams:Promise<{saved?:string;error?:string}>};
export default async function ProfilePage({searchParams}:Props){
 const q=await searchParams;const supabase=await createClient();const {data:auth}=await supabase.auth.getClaims();const id=auth?.claims?.sub;if(!id)redirect("/login");
 const {data:p}=await supabase.from("profiles").select("full_name,job_title,bio,avatar_url,website_url,social_links").eq("id",id).maybeSingle();
 return <main className="onboarding-shell"><div className="onboarding-frame"><header className="onboarding-header"><Link href="/" className="brand-lockup"><span className="brand-mark">◈</span> المكتب</Link><Link href="/" className="vintage-text-link">العودة إلى مكاتبي</Link></header><section className="onboarding-intro"><p className="eyebrow">بطاقة الموظف</p><h1>ملفك الشخصي.</h1><p>حدّث بياناتك وصورتك وشخصيتك التي تظهر للفريق داخل المكتب.</p></section>{q.saved&&<div className="notice notice-success">تم حفظ ملفك الشخصي.</div>}{q.error&&<div className="notice notice-error">تعذر حفظ التغييرات. تحقق من البيانات.</div>}<ProfileEditor userId={id} profile={p??{}}/></div></main>;
}