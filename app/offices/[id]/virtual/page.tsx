import Link from "next/link";
import {notFound,redirect} from "next/navigation";
import {createClient} from "@/lib/supabase/server";
import {PresenceHeartbeat} from "@/components/presence-heartbeat";
import {signOut} from "@/app/actions";
type Props={params:Promise<{id:string}>;searchParams:Promise<{joined?:string}>};
export default async function VirtualOfficePage({params,searchParams}:Props){
 const {id}=await params;const q=await searchParams;const supabase=await createClient();const {data:auth}=await supabase.auth.getClaims();const userId=auth?.claims?.sub;if(!userId)redirect("/login");
 const [company,membership,departments,members,presence,projects,tasks]=await Promise.all([
  supabase.from("companies").select("id,name,description,logo_url,slug").eq("id",id).maybeSingle(),
  supabase.from("company_members").select("role,department_id").eq("company_id",id).eq("user_id",userId).maybeSingle(),
  supabase.from("departments").select("id,name,color").eq("company_id",id).order("created_at"),
  supabase.from("company_members").select("user_id,role,department_id,profiles(full_name,username,avatar_url,job_title)").eq("company_id",id).order("joined_at"),
  supabase.from("office_presence").select("user_id,last_seen_at").eq("company_id",id).gte("last_seen_at",new Date(Date.now()-300000).toISOString()),
  supabase.from("projects").select("id,status").eq("company_id",id),
  supabase.from("tasks").select("id,status").eq("company_id",id)
 ]);
 if(!company.data||!membership.data)notFound();
 const {data:leasedSpace}=await supabase.from("office_spaces").select("floor_number,door_number,area_sqm,tier").eq("company_id",id).maybeSingle();
 const office=company.data;const people=members.data??[];const live=new Set((presence.data??[]).map(p=>p.user_id));const depts=departments.data??[];
 const label=(m:any)=>Array.isArray(m.profiles)?m.profiles[0]:m.profiles;
 const roleNames:Record<string,string>={owner:"رئيس الشركة",admin:"مدير الشركة",department_head:"مدير قسم",member:"موظف"};
 const renderAvatar=(p:any)=>p?.avatar_url?.startsWith("http")?<img src={p.avatar_url} alt=""/>:<span>{p?.avatar_url||"🙂"}</span>;
 return <main className="vintage-office-shell"><PresenceHeartbeat companyId={id}/><div className="vintage-office-wrap">
  <header className="vintage-appbar"><Link href="/" className="brand-lockup"><span className="brand-mark">◈</span><span>المكتب</span></Link><nav className="office-main-nav"><Link href="/">مكاتبي</Link><Link href="/neighbors">الجيران</Link><Link href={`/offices/${id}/virtual`} className="active">المكتب الافتراضي</Link><Link href={`/offices/${id}/work`}>الأعمال</Link><Link href={`/offices/${id}/team`}>الفريق</Link><Link href={`/offices/${id}/announcements`}>الإعلانات</Link><Link href={`/offices/${id}/chat`}>المحادثة</Link><Link href="/profile">ملفي</Link><Link href="/notifications">الوارد</Link></nav><form action={signOut}><button className="vintage-text-link">خروج</button></form></header>
  {q.joined&&<div className="notice notice-success">مرحبًا بك في فريق {office.name}.</div>}
  <section className="vintage-office-title"><div><span className="eyebrow">THE OFFICE · YOUR FLOOR</span><h1>{office.name}</h1><p>{office.description||"مساحة فريقك، بتفاصيلها وأقسامها وأماكن اللقاء."}</p></div><div className="office-presence-card"><i/><strong>{live.size}</strong><span>متصل الآن</span></div></section>
  <section className="floor-overview-strip"><div><small>أعضاء المكتب</small><strong>{people.length}</strong></div><div><small>الأقسام</small><strong>{depts.length}</strong></div><div><small>المشاريع</small><strong>{projects.data?.length??0}</strong></div><div><small>المهام</small><strong>{tasks.data?.length??0}</strong></div><div className="floor-open-hours"><span>{leasedSpace?`الطابق ${leasedSpace.floor_number} · مكتب ${leasedSpace.door_number}`:"موقع المكتب"}</span><b>{leasedSpace?`${leasedSpace.area_sqm} م² · ${leasedSpace.tier==="corner"?"زاوية مميزة":leasedSpace.tier==="premium"?"مساحة مميزة":"مكتب قياسي"}`:"مخطط المكتب الداخلي"}</b></div></section>
  <section className="office-floor-layout"><div className="floor-board-heading"><div><span className="eyebrow">01 / FLOOR PLAN</span><h2>مخطط الطابق</h2><p>الممر الرئيسي يربط الأقسام والاستقبال وغرف الاجتماعات.</p></div><span className="floor-stamp">THE OFFICE · EST. 2026</span></div>
   <div className="architectural-floor"><div className="floor-exterior-label">الواجهة الشرقية · المدخل الرئيسي</div><div className="floor-entry"><span>المدخل</span><i>⌂</i></div>
    <div className="floor-room-grid">
     {(depts.length?depts:[{id:"main",name:"المساحة المشتركة",color:"#637b62"}]).map((d:any,index:number)=>{const group=people.filter((m:any)=>m.department_id===d.id);const membersForRoom=group.length?group:(!depts.length?people:[]);return <article className={`floor-office-room room-${index%4+1}`} key={d.id}><div className="room-header"><span>مكتب {String(index+1).padStart(2,"0")}</span><h3>{d.name}</h3></div><div className="room-window-line"/><div className="room-desk-grid">{membersForRoom.slice(0,8).map((m:any)=>{const p=label(m);return <div className="room-workstation" key={m.user_id}><div className={`workstation-person ${live.has(m.user_id)?"person-online":""}`}>{renderAvatar(p)}<i/></div><div className="workstation-desk"><span/><b/></div><small>{p?.full_name||"عضو الفريق"}</small></div>})}{!membersForRoom.length&&<div className="room-vacancy"><span>＋</span><small>مقاعد شاغرة</small></div>}</div><div className="room-door"><span>باب القسم</span></div></article>})}
     <article className="floor-meeting-room"><span className="room-kicker">MEETING ROOM</span><h3>غرفة الاجتماعات</h3><div className="meeting-table"><i/><i/><i/><i/><span/></div><small>اجتماع الفريق · نقاش · تخطيط</small></article>
     <article className="floor-reception"><span className="room-kicker">RECEPTION</span><h3>الاستقبال</h3><div className="reception-counter">◈ <small>{office.name}</small></div><span className="plant plant-one">✿</span><span className="plant plant-two">✿</span></article>
     <article className="floor-lounge"><span className="room-kicker">LOUNGE</span><h3>استراحة الفريق</h3><div className="lounge-furniture"><span/><i/><b/></div><small>مساحة غير رسمية للقاءات السريعة</small></article>
    </div><div className="floor-corridor"><span>الممر الرئيسي</span><i/><b/><i/><b/><i/></div><div className="floor-exterior-label floor-bottom-label">الواجهة الغربية · منطقة العمل</div>
   </div>
   <div className="floor-map-legend"><span><i className="legend-live"/> متصل الآن</span><span><i className="legend-away"/> غير متصل</span><span><i className="legend-door"/> مدخل القسم</span><small>يتم تحديث الحضور تلقائيًا أثناء وجود العضو في المكتب.</small></div>
  </section>
  <section className="office-team-board"><div className="floor-board-heading"><div><span className="eyebrow">02 / THE PEOPLE</span><h2>أهل المكتب</h2><p>كل عضو يظهر بشخصيته وصورته التي اختارها.</p></div><Link href={`/offices/${id}/team`} className="vintage-outline-button">إدارة الفريق ←</Link></div><div className="office-people-grid">{people.map((m:any)=>{const p=label(m);return <article className="office-person-card" key={m.user_id}><div className="person-card-avatar">{renderAvatar(p)}<i className={live.has(m.user_id)?"is-online":""}/></div><div><h3>{p?.full_name||"عضو الفريق"}</h3><p>{p?.job_title||roleNames[m.role]||"عضو"}</p><small>@{p?.username||"member"}</small></div><span className={live.has(m.user_id)?"person-status online":"person-status"}>{live.has(m.user_id)?"متصل":"غير متصل"}</span></article>})}</div></section>
  <section className="office-shortcuts"><Link href={`/offices/${id}/work`}><span>01</span><b>المشاريع والمهام</b><small>مساحة إنجاز الفريق</small></Link><Link href={`/offices/${id}/chat`}><span>02</span><b>محادثة المكتب</b><small>تواصل يومي مباشر</small></Link><Link href={`/offices/${id}/announcements`}><span>03</span><b>لوحة الإعلانات</b><small>أخبار الشركة والجيران</small></Link><Link href="/neighbors"><span>04</span><b>الجيران</b><small>اكتشف المكاتب المجاورة</small></Link></section>
  <footer className="vintage-office-footer">المكتب · مساحة عمل تنبض بالحياة</footer>
 </div></main>;
}
