import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createProject, createTask, signOut } from "@/app/actions";
import { createClient } from "@/lib/supabase/server";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ error?: string; project?: string; task?: string; joined?: string }> };

export default async function WorkPage({ params, searchParams }: Props) {
  const { id } = await params;
  const query = await searchParams;
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getClaims();
  const userId = auth?.claims?.sub;
  if (!userId) redirect("/login");

  const [company, membership, departments, projects, tasks, members] = await Promise.all([
    supabase.from("companies").select("id,name").eq("id",id).maybeSingle(),
    supabase.from("company_members").select("role,department_id").eq("company_id",id).eq("user_id",userId).maybeSingle(),
    supabase.from("departments").select("id,name").eq("company_id",id).order("name"),
    supabase.from("projects").select("id,name,status,department_id,created_at").eq("company_id",id).order("created_at",{ascending:false}),
    supabase.from("tasks").select("id,title,status,priority,project_id,assignee_id,due_date").eq("company_id",id).order("created_at",{ascending:false}).limit(50),
    supabase.from("company_members").select("user_id,profiles(full_name)").eq("company_id",id),
  ]);
  const office = company.data;
  const currentMembership = membership.data;
  if (!office || !currentMembership) notFound();
  const role = currentMembership.role;
  const canManage = role === "owner" || role === "admin" || role === "department_head";
  const allDepartments = departments.data ?? [];
  const departmentRows = currentMembership.role === "department_head" ? allDepartments.filter((d) => d.id === currentMembership.department_id) : allDepartments;
  const projectRows = projects.data ?? [];
  const taskRows = tasks.data ?? [];
  const memberRows = members.data ?? [];
  const memberName = (uid: string | null) => {
    const found = memberRows.find((m: any) => m.user_id === uid) as any;
    const profile = Array.isArray(found?.profiles) ? found.profiles[0] : found?.profiles;
    return profile?.full_name ?? "غير معيّن";
  };
  const statusLabels: Record<string,string> = { todo:"قيد الانتظار", in_progress:"قيد التنفيذ", review:"مراجعة", done:"مكتملة" };

  return <main className="app-shell"><div className="mx-auto max-w-7xl">
    <header className="app-header"><Link href="/" className="brand-lockup"><span className="brand-mark">◈</span><span>المكتب</span></Link><div className="flex items-center gap-4"><Link href={`/offices/${id}/virtual`} className="nav-link">المكتب الافتراضي</Link><Link href={`/offices/${id}/team`} className="nav-link">الفريق</Link><Link href={`/offices/${id}/settings`} className="nav-link">الإعدادات</Link><Link href="/neighbors" className="nav-link">الجيران</Link><Link href="/profile" className="nav-link">ملفي</Link><form action={signOut}><button className="nav-link">خروج</button></form></div></header>
    <section className="page-heading"><div><p className="eyebrow">مساحة العمل / {office.name}</p><h1>صباح الإنجاز.</h1><p>هنا تتحول الخطط إلى مشاريع ومهام واضحة للفريق.</p></div><span className="role-pill">{role === "owner" ? "رئيس الشركة" : role === "admin" ? "مدير الشركة" : role === "department_head" ? "رئيس قسم" : "موظف"}</span></section>
    <div className="stepper"><Link className="step complete" href={`/offices/${id}`}><b>1</b><span>إنشاء الأقسام</span></Link><span className="step-line"/><Link className="step complete" href={`/offices/${id}/team`}><b>2</b><span>دعوة الفريق</span></Link><span className="step-line"/><span className="step current"><b>3</b><span>بدء العمل</span></span></div>
    {query.joined && <div className="notice notice-success">انضممت إلى المكتب بنجاح. أهلًا بك في الفريق.</div>}
    {query.error && <div className="notice notice-error">تعذر حفظ العنصر. تأكد من البيانات والصلاحيات.</div>}
    <section className="work-stats"><article className="stat-card"><span className="stat-icon">▦</span><p>المشاريع</p><strong>{projectRows.length}</strong></article><article className="stat-card"><span className="stat-icon">✓</span><p>المهام</p><strong>{taskRows.length}</strong></article><article className="stat-card"><span className="stat-icon">♙</span><p>أعضاء الفريق</p><strong>{memberRows.length}</strong></article></section>
    <div className="work-layout">
      <section className="panel"><div className="panel-heading"><div><h2>المشاريع</h2><p>المشاريع النشطة داخل المكتب</p></div><span className="count-badge">{projectRows.length}</span></div>
        {projectRows.length ? <div className="project-grid">{projectRows.map((project) => <article className="project-card" key={project.id}><span className="project-mark">◈</span><h3>{project.name}</h3><p>{departmentRows.find((d) => d.id === project.department_id)?.name ?? "مشروع عام"}</p><span className="status-tag">{project.status === "completed" ? "مكتمل" : project.status === "on_hold" ? "متوقف" : "نشط"}</span></article>)}</div> : <div className="empty-state">لم تبدأ أي مشروع بعد. أنشئ مشروعك الأول.</div>}
        {canManage && <form action={createProject} className="create-form"><input type="hidden" name="companyId" value={id}/><h3>إضافة مشروع</h3><input className="field" name="name" placeholder="اسم المشروع" minLength={2} maxLength={100} required/><textarea className="field" name="description" placeholder="وصف مختصر (اختياري)" rows={2}/><select className="field" name="departmentId" defaultValue=""><option value="">مشروع عام</option>{departmentRows.map((d)=><option key={d.id} value={d.id}>{d.name}</option>)}</select><button className="primary-button" type="submit">إنشاء المشروع</button></form>}
      </section>
      <section className="panel"><div className="panel-heading"><div><h2>المهام</h2><p>آخر المهام المضافة</p></div><span className="count-badge">{taskRows.length}</span></div>
        {taskRows.length ? <div className="task-list">{taskRows.map((task)=><article className="task-row" key={task.id}><span className={task.status === "done" ? "task-check checked" : "task-check"}>{task.status === "done" ? "✓" : ""}</span><div className="min-w-0 flex-1"><strong>{task.title}</strong><p>{memberName(task.assignee_id)} · {statusLabels[task.status] ?? task.status}</p></div><span className={task.priority === "urgent" ? "priority urgent" : "priority"}>{task.priority === "urgent" ? "عاجلة" : task.priority === "high" ? "عالية" : "عادية"}</span></article>)}</div> : <div className="empty-state">لا توجد مهام بعد. أضف أول مهمة للفريق.</div>}
        <form action={createTask} className="create-form"><input type="hidden" name="companyId" value={id}/><h3>إضافة مهمة</h3><input className="field" name="title" placeholder="ما الذي يجب إنجازه؟" minLength={2} maxLength={180} required/><select className="field" name="projectId" defaultValue=""><option value="">بدون مشروع</option>{projectRows.map((p)=><option key={p.id} value={p.id}>{p.name}</option>)}</select><select className="field" name="assigneeId" defaultValue=""><option value="">غير معيّنة</option>{memberRows.map((m:any)=><option key={m.user_id} value={m.user_id}>{memberName(m.user_id)}</option>)}</select><button className="primary-button" type="submit">إضافة المهمة</button></form>
      </section>
    </div>
  </div></main>;
}
