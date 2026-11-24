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
 const {data:space}=await supabase.from("office_spaces").select("floor_number,door_number,area_sqm,tier").eq("company_id",id).maybeSingle();
 const people=members.data??[],depts=departments.data??[],live=new Set((presence.data??[]).map(p=>p.user_id));
 const profile=(m:any)=>Array.isArray(m.profiles)?m.profiles[0]:m.profiles;
 const avatar=(p:any)=><span className="real-avatar">{p?.avatar_url?.startsWith("http")?<img src={p.avatar_url} alt=""/>:p?.avatar_url||"🙂"}</span>;
 const roleNames:Record<string,string>={owner:"رئيس الشركة",admin:"مدير الشركة",department_head:"مدير قسم",member:"موظف"};
 return <main className="office-rebuild"><PresenceHeartbeat companyId={id}/><div className="office-rebuild-wrap">
  <header className="or-topbar"><Link href="/" className="or-brand"><span>م</span> المكتب</Link><nav><Link href="/">مكاتبي</Link><Link href="/neighbors">الجيران</Link><Link href={`/offices/${id}/virtual`} className="selected">المكتب</Link><Link href={`/offices/${id}/work`}>المشاريع</Link><Link href={`/offices/${id}/team`}>الفريق</Link><Link href={`/offices/${id}/chat`}>المحادثة</Link></nav><form action={signOut}><button>خروج</button></form></header>
  {q.joined&&<div className="or-notice">أهلًا بك في مكتب {company.data.name}.</div>}
  <section className="or-heading"><div><span className="or-kicker">مساحة العمل · THE OFFICE</span><h1>{company.data.name}</h1><p>{company.data.description||"مساحة فريقك اليومية؛ كل قسم في مكانه، وكل زميل حاضر بشخصيته."}</p></div><div className="or-live"><i/>{live.size} متصل الآن</div></section>
  <section className="or-stats"><div><b>{people.length}</b><span>أعضاء الفريق</span></div><div><b>{depts.length}</b><span>الأقسام</span></div><div><b>{projects.data?.length??0}</b><span>المشاريع</span></div><div><b>{tasks.data?.length??0}</b><span>المهام</span></div><div className="or-location"><b>مكتب {space?.door_number??"—"}</b><span>الطابق {space?.floor_number??"—"} · {space?.area_sqm??"—"} م²</span></div></section>
  <section className="or-plan-section"><div className="or-section-head"><div><span className="or-kicker">01 / مخطط المكتب</span><h2>مساحة العمل من الداخل</h2><p>مخطط علوي واضح يبيّن الأقسام ومحطات العمل والمساحات المشتركة.</p></div><span className="or-plan-key"><i/> متصل <i className="offline"/> غير متصل</span></div>
   <div className="or-plan">
    <div className="or-plan-top"><span>THE OFFICE</span><b>المدخل الرئيسي</b><span>الطابق {space?.floor_number??"—"}</span></div>
    <div className="or-plan-inner">
     <aside className="or-shared-column"><div className="or-room or-reception"><small>WELCOME</small><b>الاستقبال</b><div className="or-reception-desk">مكتب الاستقبال</div><span className="or-plant">✳</span></div><div className="or-room or-lounge"><small>LOUNGE</small><b>استراحة الفريق</b><div className="or-sofa"><i/><i/><i/></div><span className="or-coffee">☕</span></div><div className="or-room or-meeting"><small>MEETING ROOM</small><b>غرفة الاجتماعات</b><div className="or-table"><i/><i/><i/><i/><i/><i/></div></div></aside>
     <div className="or-work-wing"><div className="or-wing-title"><b>منطقة الأقسام</b><span>{depts.length||1} مساحة عمل</span></div><div className="or-department-grid">{(depts.length?depts:[{id:"general",name:"المساحة المشتركة",color:"#82917d"}]).map((d:any,idx:number)=>{const group=people.filter((m:any)=>m.department_id===d.id);const assigned=group.length?group:(depts.length?[]:people);return <article className="or-department" key={d.id} style={{"--dept-accent":d.color||["#82917d","#bd9874","#8799a9","#b58c88"][idx%4]} as React.CSSProperties}><div className="or-dept-head"><span>القسم {String(idx+1).padStart(2,"0")}</span><b>{d.name}</b><small>{assigned.length} موظف</small></div><div className="or-desk-grid">{assigned.slice(0,12).map((m:any)=>{const p=profile(m);return <div className="or-workstation" key={m.user_id} title={p?.full_name||"موظف"}><div className="or-person"><span className={live.has(m.user_id)?"online":""}>{avatar(p)}</span><i/></div><div className="or-desk"><span/><b/></div><small>{p?.full_name||p?.username||"عضو الفريق"}</small></div>})}{!assigned.length&&<div className="or-empty-desks"><span>＋</span><b>مساحة جاهزة لفريقك</b><small>أضف أعضاء لهذا القسم ليظهروا هنا</small></div>}</div><div className="or-room-door">باب القسم</div></article>})}</div></div>
    </div><div className="or-plan-bottom"><span>ممر الحركة الداخلي</span><i/><span>مساحات مشتركة · مكاتب · اجتماعات</span><i/><span>←</span></div>
   </div><p className="or-plan-caption">تظهر صورة أو إيموجي كل موظف على محطة عمله. مؤشر أخضر يعني أن الموظف نشط داخل المكتب خلال آخر خمس دقائق.</p>
  </section>
  <section className="or-people-section"><div className="or-section-head"><div><span className="or-kicker">02 / PEOPLE</span><h2>زملاؤك في المكتب</h2><p>حالة الحضور والقسم والمسمى الوظيفي لكل عضو.</p></div><Link href={`/offices/${id}/team`}>إدارة الفريق ←</Link></div><div className="or-people-grid">{people.map((m:any)=>{const p=profile(m);return <article className="or-person-card" key={m.user_id}>{avatar(p)}<div><b>{p?.full_name||"عضو الفريق"}</b><span>{p?.job_title||roleNames[m.role]||"موظف"}</span><small>{depts.find((d:any)=>d.id===m.department_id)?.name||"بدون قسم"}</small></div><i className={live.has(m.user_id)?"online":""}/></article>})}</div></section>
  <footer className="or-footer"><span>المكتب</span><span>مساحة عمل تجمع الفريق، حتى عن بُعد.</span></footer>
 </div></main>;
}
