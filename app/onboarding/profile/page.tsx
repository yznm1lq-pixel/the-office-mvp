import Link from "next/link";
import {redirect} from "next/navigation";
import {createClient} from "@/lib/supabase/server";
import ProfileEditor from "@/components/profile-editor";
type Props={searchParams:Promise<{error?:string;next?:string}>};
export default async function OnboardingProfilePage({searchParams}:Props){
 const q=await searchParams;const supabase=await createClient();const {data:auth}=await supabase.auth.getClaims();const userId=auth?.claims?.sub;if(!userId)redirect("/login");
 const {data:profile}=await supabase.from("profiles").select("full_name,job_title,bio,avatar_url,website_url,social_links").eq("id",userId).maybeSingle();
 return <main className="onboarding-shell"><div className="onboarding-frame"><header className="onboarding-header"><Link href="/" className="brand-lockup"><span className="brand-mark">◈</span> المكتب</Link><span>الخطوة الأخيرة قبل مكتبك</span></header><section className="onboarding-intro"><p className="eyebrow">ملف الموظف · 01 / 01</p><h1>قبل أن تدخل،<br/><em>عرّفنا بنفسك.</em></h1><p>أكمل ملفك مرة واحدة. سيظهر اسمك وصورتك أو شخصيتك داخل المكتب الافتراضي.</p></section>{q.error&&<div className="notice notice-error">تعذر حفظ الملف. راجع الاسم والروابط ثم حاول مجددًا.</div>}<ProfileEditor userId={userId} profile={profile??{}} next={q.next==="/"?"/":"/"}/></div></main>;
}
