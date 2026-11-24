import Link from "next/link";
import {redirect} from "next/navigation";
import {createClient} from "@/lib/supabase/server";
type Row={id:string;company_id:string;title:string;body:string|null;read_at:string|null;created_at:string};
export default async function NotificationsPage(){
 const supabase=await createClient();const {data:auth}=await supabase.auth.getClaims();const uid=auth?.claims?.sub;if(!uid)redirect("/login");
 const {data}=await supabase.from("notifications").select("id,company_id,title,body,read_at,created_at").eq("user_id",uid).order("created_at",{ascending:false}).limit(50);
 const rows=(data??[]) as Row[];const ids=[...new Set(rows.map(r=>r.company_id))];
 const {data:companies}=ids.length?await supabase.from("companies").select("id,name").in("id",ids):{data:[]};
 const names=new Map((companies??[]).map(c=>[c.id,c.name]));
 return <main className="chat-page-shell"><div className="chat-page-wrap">
  <header className="chat-page-nav"><Link href="/" className="brand-lockup"><span className="brand-mark">◈</span> المكتب</Link><nav><Link href="/">مكاتبي</Link><Link href="/neighbors">الجيران</Link><Link href="/profile">ملفي</Link></nav></header>
  <section className="chat-page-heading"><div><span className="eyebrow">THE OFFICE / YOUR UPDATES</span><h1>صندوق الوارد</h1><p>كل ما يخص عضويتك ومكاتبك في مكان واحد.</p></div></section>
  <section className="inbox-list">{rows.map(r=><article className={r.read_at?"inbox-row":"inbox-row unread"} key={r.id}><span className="inbox-icon">✳</span><div><strong>{r.title}</strong><p>{r.body}</p><small>{names.get(r.company_id)||"المكتب"} · {new Intl.DateTimeFormat("ar-SA",{dateStyle:"medium",timeStyle:"short"}).format(new Date(r.created_at))}</small></div><div className="inbox-actions"><Link href={`/offices/${r.company_id}/virtual`}>افتح المكتب</Link><Link href={`/offices/${r.company_id}/chat`}>تواصل مع الفريق</Link></div></article>)}{!rows.length&&<div className="chat-empty"><span>✧</span><h3>صندوقك هادئ الآن</h3><p>ستظهر هنا إشعارات انضمامك وتحديثات مكاتبك.</p></div>}</section>
 </div></main>;
}
