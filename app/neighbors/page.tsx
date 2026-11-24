import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
type Props={searchParams:Promise<{office?:string}>};
export default async function NeighborsPage({searchParams}:Props){
 const {office}=await searchParams;const supabase=await createClient();
 const {data:auth}=await supabase.auth.getClaims();
 return <main className="app-shell"><div className="mx-auto max-w-5xl">
  <header className="app-header"><Link href="/" className="brand-lockup"><span className="brand-mark">◈</span><span>المكتب</span></Link><Link href={auth?.claims?.sub?"/":"/login"} className="nav-link">{auth?.claims?.sub?"العودة إلى مكاتبي":"تسجيل الدخول"}</Link></header>
  <section className="panel mx-auto mt-16 max-w-3xl p-8 text-center md:p-12">
   <span className="panel-icon mx-auto">✦</span><p className="eyebrow mt-5">THE NEIGHBOR NETWORK</p>
   <h1 className="mt-3 text-3xl font-black">الجيران… علاقات تبدأ من مكتبك.</h1>
   <p className="mx-auto mt-4 max-w-xl text-sm leading-8 text-slate-500">نعمل على بناء مساحة تجمع المكاتب والشركات، وتتيح لك اكتشاف جيرانك، التعرف على أعمالهم، طلب التواصل، وحجز المواعيد معهم.</p>
   <div className="neighbor-roadmap mt-8"><div><b>01</b><strong>اكتشف المكاتب</strong><small>تعرّف على الشركات القريبة وتخصصاتها.</small></div><div><b>02</b><strong>ابدأ التواصل</strong><small>اطلب التواصل مع المكتب المناسب.</small></div><div><b>03</b><strong>احجز موعدًا</strong><small>رتّب لقاءً وابدأ فرص التعاون.</small></div></div>
   {office&&<p className="mt-6 text-xs text-slate-400">جئت من صفحة المكتب: {office}</p>}
   <Link href="/" className="primary-button mt-8">العودة إلى المكتب</Link>
  </section>
 </div></main>;
}
