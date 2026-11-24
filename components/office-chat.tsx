"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Message = { id:string; body:string; created_at:string; sender_id:string; department_id:string|null; profile?:{full_name:string|null;avatar_url:string|null} };
type Department = { id:string; name:string };

export function OfficeChat({ companyId, userId, initialMessages, departments }: {
  companyId:string; userId:string; initialMessages:Message[]; departments:Department[];
}) {
  const supabase = useMemo(()=>createClient(),[]);
  const [messages,setMessages] = useState(initialMessages);
  const [body,setBody] = useState("");
  const [departmentId,setDepartmentId] = useState("");
  const [sending,setSending] = useState(false);
  const [error,setError] = useState("");
  const bottom = useRef<HTMLDivElement>(null);

  useEffect(()=>{
    const channel=supabase.channel("office-chat-"+companyId)
      .on("postgres_changes",{event:"INSERT",schema:"public",table:"messages",filter:"company_id=eq."+companyId},async(payload)=>{
        const row=payload.new as Omit<Message,"profile">;
        const {data:profile}=await supabase.from("profiles").select("full_name,avatar_url").eq("id",row.sender_id).maybeSingle();
        setMessages(current=>current.some(m=>m.id===row.id)?current:[...current,{...row,profile:profile??undefined}]);
      }).subscribe();
    return ()=>{void supabase.removeChannel(channel);};
  },[companyId,supabase]);

  useEffect(()=>{bottom.current?.scrollIntoView({behavior:"smooth",block:"end"});},[messages]);

  async function send(e:FormEvent<HTMLFormElement>){
    e.preventDefault(); const clean=body.trim(); if(!clean||sending)return;
    setSending(true);setError("");
    const {data,error:insertError}=await supabase.from("messages").insert({
      company_id:companyId,department_id:departmentId||null,sender_id:userId,body:clean
    }).select("id,body,created_at,sender_id,department_id").single();
    if(insertError){setError("تعذر إرسال الرسالة. تأكد من اتصالك وعضويتك في المكتب.");}
    else{
      const {data:profile}=await supabase.from("profiles").select("full_name,avatar_url").eq("id",userId).maybeSingle();
      if(data)setMessages(current=>current.some(m=>m.id===data.id)?current:[...current,{...data,profile:profile??undefined}]);
      setBody("");
    }
    setSending(false);
  }

  const fmt=(d:string)=>new Intl.DateTimeFormat("ar-SA",{hour:"2-digit",minute:"2-digit",day:"numeric",month:"short"}).format(new Date(d));
  return <section className="office-chat-shell">
    <div className="office-chat-top"><div><span className="chat-live-dot"/> مساحة تواصل الفريق <small>محادثة مباشرة</small></div><span>{messages.length} رسالة</span></div>
    <div className="office-chat-feed">{messages.map(m=><article key={m.id} className={m.sender_id===userId?"chat-message mine":"chat-message"}>
      <div className="chat-avatar">{m.profile?.avatar_url?.startsWith("http")?<img src={m.profile.avatar_url} alt=""/>:m.profile?.avatar_url||"🙂"}</div>
      <div className="chat-bubble"><div className="chat-message-meta"><strong>{m.sender_id===userId?"أنت":m.profile?.full_name||"عضو الفريق"}</strong><time>{fmt(m.created_at)}</time></div><p>{m.body}</p>{m.department_id&&<small>{departments.find(d=>d.id===m.department_id)?.name||"قسم"}</small>}</div>
    </article>)}{!messages.length&&<div className="chat-empty"><span>✳</span><h3>ابدأ الحديث من هنا</h3><p>رسالتك الأولى ستظهر لكل أعضاء المكتب مباشرة.</p></div>}<div ref={bottom}/></div>
    <form className="office-chat-composer" onSubmit={send}>
      <select value={departmentId} onChange={e=>setDepartmentId(e.target.value)} aria-label="القسم"><option value="">كل المكتب</option>{departments.map(d=><option key={d.id} value={d.id}>{d.name}</option>)}</select>
      <textarea value={body} onChange={e=>setBody(e.target.value)} maxLength={4000} rows={2} placeholder="اكتب رسالة للفريق…" required/>
      <button disabled={sending||!body.trim()}>{sending?"جارٍ الإرسال…":"إرسال الرسالة ↗"}</button>
      {error&&<p className="chat-error">{error}</p>}
    </form>
  </section>;
}
