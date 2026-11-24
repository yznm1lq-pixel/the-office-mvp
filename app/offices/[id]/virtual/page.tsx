import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PresenceHeartbeat } from "@/components/presence-heartbeat";
import { VirtualOfficeControls } from "@/components/virtual-office-controls";
import { signOut } from "@/app/actions";

type Props={params:Promise<{id:string}>;searchParams:Promise<{joined?:string}>};
export default async function VirtualOfficePage({params,searchParams}:Props){
 const {id}=await params;const query=await searchParams;const supabase=await createClient();
 const {data:auth}=await supabase.auth.getClaims();const userId=auth?.claims?.sub;if(!userId)redirect("/login");
 const [company,membership,departments,members,presence,projects,tasks]=await Promise.all([
  supabase.from("companies").select("id,name,description,logo_url,slug").eq("id",id).maybeSingle(),
  supabase.from("company_members").select("role,department_id").eq("company_id",id).eq("user_id",userId).maybeSingle(),
  supabase.from("departments").select("id,name,color").eq("company_id",id).order("created_at"),
  supabase.from("company_members").select("user_id,role,department_id,profiles(full_name,avatar_url)").eq("company_id",id).order("joined_at"),
  supabase.from("office_presence").select("user_id,last_seen_at").eq("company_id",id).gte("last_seen_at",new Date(Date.now()-5*60*1000).toISOString()),
  supabase.from("projects").select("id,status").eq("company_id",id),
  supabase.from("tasks").select("id,status").eq("company_id",id),
 ]);
 if(!company.data||!membership.data)notFound();
 const office=company.data;const people=members.data??[];const live=new Set((presence.data??[]).map(p=>p.user_id));
 const departmentsList=departments.data??[];const projectsList=projects.data??[];const tasksList=tasks.data??[];
 const roleNames:Record<string,string>={owner:"رئيس الشركة",admin:"مدير الشركة",department_head:"مدير قسم",member:"موظف"};
 return <main className="virtual-shell"><PresenceHeartbeat companyId={id}/><div className="virtual-wrap">
  <header className="virtual-topbar"><Link href="/" className="brand-lockup"><span className="brand-mark">◈</span><span>المكتب</span></Link><div className="virtual-nav"><Link href={`/offices/${id}/work`}>مساحة العمل</Link><Link href={`/offices/${id}/team`}>الفريق</Link><Link href={`/offices/${id}/settings`}>الإعدادات</Link><Link href={`/company/${office.slug}`}>صفحة الشركة</Link><form action={signOut}><button>خروج</button></form></div></header>
  {query.joined&&<div className="notice notice-success">أهلًا بك في المكتب! تم قبول دعوتك بنجاح.</div>}
  <section className="virtual-heading"><div><p className="eyebrow">مساحتكم الرقمية</p><h1>{office.name}</h1><p>{office.description||"مساحة تجمع فريقكم، أقسامكم وأعمالكم في مكان واحد."}</p></div><div className="virtual-live-pill"><i/> {live.size} متصل الآن</div></section>
  <section className="virtual-dashboard">
   <div className="virtual-floor-panel">
    <div className="floor-label"><div><span className="eyebrow">THE OFFICE / LIVE SPACE</span><h2>المكتب الافتراضي</h2></div><span className="floor-chip">المساحة الرئيسية</span></div>
    <div className="isometric-scene"><div className="iso-floor">
      <div className="floor-grid"/>
      {departmentsList.slice(0,6).map((d,index)=><div className={`iso-zone zone-${index+1}`} key={d.id} style={{["--zone-color" as any]:d.color}}><span>{d.name}</span><div className="iso-desk"><i/><i/></div><div className="iso-desk second"><i/><i/></div></div>)}
      <div className="iso-lounge"><span>مساحة اللقاء</span><div className="lounge-sofa"/><div className="lounge-table"/></div>
    </div></div>
    <div className="floor-legend"><span><i className="legend-online"/> متصل الآن</span><span><i className="legend-offline"/> غير متصل</span><span>تتحدث حالة الحضور تلقائيًا</span></div>
   </div>
   <aside className="virtual-side">
    <section className="virtual-side-card"><div className="side-card-title"><div><h3>الفريق داخل المكتب</h3><p>{people.length} أعضاء</p></div><Link href={`/offices/${id}/team`}>إدارة الفريق ←</Link></div>
     <div className="virtual-people">{people.map((m:any)=>{const profile=Array.isArray(m.profiles)?m.profiles[0]:m.profiles;return <div className="virtual-person" key={m.user_id}><div className="virtual-avatar">{profile?.avatar_url?<img src={profile.avatar_url} alt=""/>:(profile?.full_name??"ع").slice(0,1)}<i className={live.has(m.user_id)?"is-online":""}/></div><div><strong>{profile?.full_name??"عضو الفريق"}</strong><small>{roleNames[m.role]??m.role}</small></div><span className={live.has(m.user_id)?"presence-text online":"presence-text"}>{live.has(m.user_id)?"متصل":"غير متصل"}</span></div>})}</div>
    </section>
    <section className="virtual-side-card"><div className="side-card-title"><div><h3>مساحات الأقسام</h3><p>تنظيم الفريق حسب التخصص</p></div><Link href={`/offices/${id}/settings`}>تعديل</Link></div>
     <div className="virtual-departments">{departmentsList.map(d=><div key={d.id}><i style={{background:d.color}}/><span>{d.name}</span><b>{people.filter((m:any)=>m.department_id===d.id).length}</b></div>)}</div>
    </section>
   </aside>
  </section>
  <VirtualOfficeControls companyId={id} departments={departmentsList.map((d:any)=>({id:d.id,name:d.name,color:d.color}))} people={people.map((m:any)=>{const profile=Array.isArray(m.profiles)?m.profiles[0]:m.profiles;return {userId:m.user_id,name:profile?.full_name??"عضو الفريق",role:roleNames[m.role]??m.role,departmentId:m.department_id,online:live.has(m.user_id),avatarUrl:profile?.avatar_url??null};})}/>
  <section className="virtual-quick-stats"><Link href={`/offices/${id}/work`}><span>◫</span><div><small>المشاريع</small><strong>{projectsList.length}</strong></div><b>فتح مساحة العمل ←</b></Link><Link href={`/offices/${id}/work`}><span>✓</span><div><small>المهام</small><strong>{tasksList.length}</strong></div><b>متابعة الإنجاز ←</b></Link><Link href={`/offices/${id}/settings`}><span>✦</span><div><small>هوية المكتب</small><strong>إعدادات الشركة</strong></div><b>تخصيص ←</b></Link></section>
  <footer className="virtual-footer">مساحة عملكم، أينما كان فريقكم · المكتب الافتراضي</footer>
 </div></main>;
}
