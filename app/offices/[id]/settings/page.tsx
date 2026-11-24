import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOut, updateCompanyProfile, updateDepartment, deleteDepartment, updateMemberName, createPortfolioItem, deletePortfolioItem } from "@/app/actions";

type Props={params:Promise<{id:string}>;searchParams:Promise<{error?:string;saved?:string}>};
export default async function OfficeSettingsPage({params,searchParams}:Props){
 const {id}=await params; const query=await searchParams; const supabase=await createClient();
 const {data:auth}=await supabase.auth.getClaims(); const userId=auth?.claims?.sub; if(!userId) redirect("/login");
 const [company,membership,departments,members,portfolio]=await Promise.all([
  supabase.from("companies").select("id,name,description,logo_url,website_url,contact_email,social_links,slug").eq("id",id).maybeSingle(),
  supabase.from("company_members").select("role").eq("company_id",id).eq("user_id",userId).maybeSingle(),
  supabase.from("departments").select("id,name").eq("company_id",id).order("name"),
  supabase.from("company_members").select("user_id,role,profiles(full_name)").eq("company_id",id).order("joined_at"),
  supabase.from("company_portfolio").select("id,title,description,image_url,project_url").eq("company_id",id).order("sort_order"),
 ]);
 if(!company.data||!membership.data) notFound();
 const office=company.data; const role=membership.data.role; const canManage=role==="owner"||role==="admin";
 const social=(office.social_links??{}) as Record<string,string|null>;
 const roleNames:Record<string,string>={owner:"رئيس الشركة",admin:"مدير الشركة",department_head:"مدير قسم",member:"موظف"};
 return <main className="app-shell"><div className="mx-auto max-w-7xl">
  <header className="app-header"><Link href="/" className="brand-lockup"><span className="brand-mark">◈</span><span>المكتب</span></Link><nav className="flex flex-wrap items-center gap-4"><Link className="nav-link" href={`/offices/${id}/virtual`}>المكتب الافتراضي</Link><Link className="nav-link" href={`/offices/${id}/team`}>الفريق</Link><Link className="nav-link" href={`/offices/${id}/work`}>العمل</Link><form action={signOut}><button className="nav-link">خروج</button></form></nav></header>
  <section className="page-heading"><div><p className="eyebrow">إدارة وتخصيص المكتب</p><h1>إعدادات {office.name}</h1><p>عدّل هوية الشركة، الأقسام، بيانات الفريق وملف الأعمال من مكان واحد.</p></div><span className="role-pill">{roleNames[role]??role}</span></section>
  {query.error&&<div className="notice notice-error">تعذر حفظ التعديل. تحقق من البيانات والصلاحيات والروابط.</div>}
  {query.saved&&<div className="notice notice-success">تم حفظ التغييرات بنجاح.</div>}
  <div className="settings-grid">
   <section className="panel settings-section"><div className="panel-heading"><div><h2>هوية الشركة</h2><p>هذه البيانات ستظهر في صفحة المكتب العامة.</p></div><span className="panel-icon">✦</span></div>
    {canManage?<form action={updateCompanyProfile} className="settings-form"><input type="hidden" name="companyId" value={id}/>
     <label>اسم الشركة / المكتب</label><input className="field" name="name" defaultValue={office.name} required minLength={2} maxLength={80}/>
     <label>نبذة تعريفية</label><textarea className="field min-h-28" name="description" defaultValue={office.description??""} maxLength={1000} placeholder="عرّف الزوار بشركتك ومجال عملها..."/>
     <label>رابط الشعار</label><input className="field" name="logoUrl" type="url" defaultValue={office.logo_url??""} placeholder="https://..."/>
     <label>الموقع الإلكتروني</label><input className="field" name="websiteUrl" type="url" defaultValue={office.website_url??""} placeholder="https://company.com"/>
     <label>البريد العام للتواصل</label><input className="field" name="contactEmail" type="email" defaultValue={office.contact_email??""} placeholder="hello@company.com"/>
     <div className="settings-subtitle">حسابات التواصل الاجتماعي</div>
     <div className="settings-social-grid">
      <label>Instagram<input className="field" name="instagram" type="url" defaultValue={social.instagram??""} placeholder="https://instagram.com/..."/></label>
      <label>LinkedIn<input className="field" name="linkedin" type="url" defaultValue={social.linkedin??""} placeholder="https://linkedin.com/..."/></label>
      <label>X<input className="field" name="x" type="url" defaultValue={social.x??""} placeholder="https://x.com/..."/></label>
      <label>YouTube<input className="field" name="youtube" type="url" defaultValue={social.youtube??""} placeholder="https://youtube.com/..."/></label>
      <label>TikTok<input className="field" name="tiktok" type="url" defaultValue={social.tiktok??""} placeholder="https://tiktok.com/@..."/></label>
     </div>
     <button className="primary-button" type="submit">حفظ بيانات الشركة</button>
    </form>:<p className="permission-note">تعديل بيانات الشركة متاح لرئيس الشركة ومديرها.</p>}
   </section>
   <section className="panel settings-section"><div className="panel-heading"><div><h2>الأقسام</h2><p>تعديل أسماء الأقسام أو حذف الأقسام غير المستخدمة.</p></div><span className="count-badge">{departments.data?.length??0}</span></div>
    {(departments.data??[]).map(d=><div className="settings-row" key={d.id}>{canManage?<><form action={updateDepartment} className="settings-inline"><input type="hidden" name="companyId" value={id}/><input type="hidden" name="departmentId" value={d.id}/><input className="field" name="name" defaultValue={d.name} required minLength={2} maxLength={60}/><button className="icon-action">حفظ</button></form><form action={deleteDepartment}><input type="hidden" name="companyId" value={id}/><input type="hidden" name="departmentId" value={d.id}/><button className="remove-action">حذف</button></form></>:<strong>{d.name}</strong>}</div>)}
    {!departments.data?.length&&<div className="empty-state">لا توجد أقسام بعد.</div>}
   </section>
   <section className="panel settings-section settings-wide"><div className="panel-heading"><div><h2>أسماء أعضاء الفريق</h2><p>يمكن للإدارة تصحيح أسماء الأعضاء الظاهرة في المكتب.</p></div><span className="count-badge">{members.data?.length??0} أعضاء</span></div>
    {(members.data??[]).map((m:any)=>{const profile=Array.isArray(m.profiles)?m.profiles[0]:m.profiles;return <div className="settings-member" key={m.user_id}><div><strong>{profile?.full_name??"عضو"}</strong><small>{roleNames[m.role]??m.role}</small></div>{canManage&&m.role!=="owner"&&m.user_id!==userId?<form action={updateMemberName} className="settings-inline"><input type="hidden" name="companyId" value={id}/><input type="hidden" name="userId" value={m.user_id}/><input className="field" name="fullName" defaultValue={profile?.full_name??""} minLength={2} maxLength={80} required/><button className="icon-action">تحديث الاسم</button></form>:<span className="member-role">—</span>}</div>})}
   </section>
   <section className="panel settings-section settings-wide"><div className="panel-heading"><div><h2>ملف الأعمال</h2><p>أضف مشاريع مختارة لتظهر في صفحة تعريف الشركة.</p></div><span className="count-badge">{portfolio.data?.length??0} أعمال</span></div>
    {(portfolio.data??[]).map(item=><div className="settings-row" key={item.id}><div className="portfolio-mini"><strong>{item.title}</strong><small>{item.description}</small></div>{canManage&&<form action={deletePortfolioItem}><input type="hidden" name="companyId" value={id}/><input type="hidden" name="itemId" value={item.id}/><button className="remove-action">إزالة</button></form>}</div>)}
    {canManage&&<form action={createPortfolioItem} className="settings-form settings-portfolio-form"><input type="hidden" name="companyId" value={id}/><div className="settings-subtitle">إضافة عمل جديد</div><label>اسم المشروع</label><input className="field" name="title" required minLength={2} maxLength={100}/><label>وصف مختصر</label><textarea className="field" name="description" maxLength={600}/><label>رابط صورة المشروع</label><input className="field" name="imageUrl" type="url" placeholder="https://..."/><label>رابط المشروع</label><input className="field" name="projectUrl" type="url" placeholder="https://..."/><button className="secondary-button" type="submit">إضافة إلى ملف الأعمال</button></form>}
   </section>
  </div>
  <div className="page-footer"><Link className="secondary-button" href={`/company/${office.slug}`}>معاينة صفحة الشركة العامة ←</Link></div>
 </div></main>;
}
