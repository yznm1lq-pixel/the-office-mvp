import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type Props={params:Promise<{slug:string}>};
type PortfolioItem={id:string;title:string;description:string;image_url:string|null;project_url:string|null};
type PublicOffice={id:string;name:string;slug:string;description:string;logo_url:string|null;website_url:string|null;contact_email:string|null;social_links:Record<string,string|null>;portfolio:PortfolioItem[]};
const socialLabels:Record<string,string>={instagram:"Instagram",linkedin:"LinkedIn",x:"X",youtube:"YouTube",tiktok:"TikTok"};
export default async function PublicCompanyPage({params}:Props){
 const {slug}=await params;const supabase=await createClient();
 const {data}=await supabase.rpc("public_company_profile",{p_slug:slug});
 const office=(data??null) as PublicOffice|null;if(!office)notFound();
 const socials=Object.entries(office.social_links??{}).filter(([,url])=>Boolean(url));
 return <main className="public-company-shell"><header className="public-company-nav"><Link href="/" className="brand-lockup"><span className="brand-mark">◈</span><span>المكتب</span></Link><Link href="/login" className="nav-link">انضم إلى المكتب</Link></header>
  <section className="public-company-hero"><div className="public-company-glow"/><div className="public-company-identity">{office.logo_url?<img src={office.logo_url} alt={office.name}/>:<span>◈</span>}</div><p className="eyebrow">مساحة عمل على منصة المكتب</p><h1>{office.name}</h1><p className="public-company-description">{office.description||"نرحب بكم في مساحة عملنا الافتراضية. تعرّفوا على فريقنا وأعمالنا وطرق التواصل معنا."}</p>
   <div className="public-company-actions">{office.website_url&&<a className="secondary-button" href={office.website_url} target="_blank" rel="noreferrer">زيارة الموقع ↗</a>}{office.contact_email&&<a className="primary-button" href={`mailto:${office.contact_email}`}>تواصل معنا</a>}</div>
   <div className="neighbor-cta"><div><span>🤝</span><div><strong>جارك في عالم الأعمال</strong><p>تعرّف علينا، وتواصل معنا، وافتح باب التعاون.</p></div></div><Link href={`/neighbors?office=${encodeURIComponent(office.slug)}`}>احجز موعدًا مع جارك ←</Link></div>
  </section>
  {socials.length>0&&<section className="public-company-section"><p className="eyebrow">CONNECT WITH US</p><h2>تواصل معنا</h2><div className="public-socials">{socials.map(([key,url])=><a key={key} href={url!} target="_blank" rel="noreferrer"><span>{key==="instagram"?"◎":key==="linkedin"?"in":key==="x"?"𝕏":key==="youtube"?"▶":"♪"}</span>{socialLabels[key]??key} ↗</a>)}</div></section>}
  <section className="public-company-section"><div className="public-section-heading"><div><p className="eyebrow">SELECTED WORK</p><h2>من ملف أعمالنا</h2></div><span>{office.portfolio?.length??0} مشاريع</span></div>
   {office.portfolio?.length?<div className="public-portfolio-grid">{office.portfolio.map(item=><article className="public-portfolio-card" key={item.id}>{item.image_url?<img src={item.image_url} alt={item.title}/>:<div className="portfolio-placeholder">✦</div>}<div><h3>{item.title}</h3><p>{item.description}</p>{item.project_url&&<a href={item.project_url} target="_blank" rel="noreferrer">استكشف المشروع ↗</a>}</div></article>)}</div>:<div className="empty-state"><span className="empty-icon">✦</span><strong>ملف الأعمال قيد الإعداد</strong><p>ستظهر هنا المشاريع والأعمال التي يشاركها المكتب.</p></div>}
  </section>
  <footer className="public-company-footer">هذه الصفحة جزء من منصة <strong>المكتب</strong> · مساحة عملك الافتراضية</footer>
 </main>;
}
