import Link from "next/link";
import {notFound,redirect} from "next/navigation";
import {createClient} from "@/lib/supabase/server";
import {OfficeChat} from "@/components/office-chat";

type Props={params:Promise<{id:string}>};
export default async function ChatPage({params}:Props){
 const {id}=await params;const supabase=await createClient();const {data:a}=await supabase.auth.getClaims();const uid=a?.claims?.sub;if(!uid)redirect("/login");
 const [co,mem,msg,departments]=await Promise.all([
  supabase.from("companies").select("name").eq("id",id).maybeSingle(),
  supabase.from("company_members").select("role").eq("company_id",id).eq("user_id",uid).maybeSingle(),
  supabase.from("messages").select("id,body,created_at,sender_id,department_id").eq("company_id",id).order("created_at",{ascending:true}).limit(200),
  supabase.from("departments").select("id,name").eq("company_id",id).order("name")
 ]);
 if(!co.data||!mem.data)notFound();
 const rows=msg.data??[];const ids=[...new Set(rows.map(m=>m.sender_id))];
 const {data:profiles}=ids.length?await supabase.from("profiles").select("id,full_name,avatar_url").in("id",ids):{data:[]};
 const profileMap=new Map((profiles??[]).map(p=>[p.id,p]));
 const initialMessages=rows.map(m=>({...m,profile:profileMap.get(m.sender_id)??undefined}));
 return <main className="chat-page-shell"><div className="chat-page-wrap">
  <header className="chat-page-nav"><Link href="/" className="brand-lockup"><span className="brand-mark">◈</span> المكتب</Link><nav><Link href={`/offices/${id}/virtual`}>المكتب</Link><Link href={`/offices/${id}/team`}>الفريق</Link><Link href="/neighbors">الجيران</Link><Link href={`/offices/${id}/work`}>الأعمال</Link></nav></header>
  <section className="chat-page-heading"><div><span className="eyebrow">THE OFFICE / TEAM MESSAGING</span><h1>مجلس المكتب</h1><p>مكان واحد يجمع أحاديث الفريق وتحديثاته، لحظة بلحظة.</p></div><div className="chat-heading-card"><span>المكتب</span><strong>{co.data.name}</strong><small>تواصل داخلي · مباشر</small></div></section>
  <OfficeChat companyId={id} userId={uid} initialMessages={initialMessages} departments={departments.data??[]}/>
 </div></main>;
}
