"use client";

import { useEffect, useMemo, useState } from "react";

type Person = { userId: string; name: string; role: string; departmentId: string | null; online: boolean; avatarUrl?: string | null };
type Department = { id: string; name: string; color: string | null };

export function VirtualOfficeControls({ companyId, people, departments }: { companyId: string; people: Person[]; departments: Department[] }) {
  const [filter, setFilter] = useState<"all" | "online">("all");
  const [layout, setLayout] = useState<Record<string, string>>({});
  const [editMode, setEditMode] = useState(false);
  const [ready, setReady] = useState(false);
  const [dragged, setDragged] = useState<string | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(`office-layout:${companyId}`);
      if (saved) setLayout(JSON.parse(saved));
    } catch { /* Ignore an invalid local layout and use the default arrangement. */ }
    setReady(true);
  }, [companyId]);

  const visiblePeople = useMemo(() => people.filter((person) => filter === "all" || person.online), [people, filter]);
  const departmentFor = (person: Person) => layout[person.userId] ?? person.departmentId ?? "unassigned";
  const grouped = departments.map((department) => ({
    ...department,
    people: visiblePeople.filter((person) => departmentFor(person) === department.id),
  }));
  const unassigned = visiblePeople.filter((person) => !departments.some((department) => department.id === departmentFor(person)));

  function movePerson(userId: string, departmentId: string) {
    const next = { ...layout, [userId]: departmentId };
    setLayout(next);
    try { localStorage.setItem(`office-layout:${companyId}`, JSON.stringify(next)); } catch { /* Storage may be unavailable. */ }
  }

  function renderPerson(person: Person) {
    return <div className={`seat-person ${person.online ? "seat-online" : ""}`} key={person.userId}
      draggable={editMode}
      onDragStart={() => setDragged(person.userId)}
      onDragEnd={() => setDragged(null)}
      title={editMode ? "اسحب العضو إلى قسم آخر" : person.name}>
      <span className="seat-avatar">{person.avatarUrl ? <img src={person.avatarUrl} alt="" /> : person.name.slice(0, 1)}</span>
      <span className="seat-person-copy"><strong>{person.name}</strong><small>{person.role}</small></span>
      <i className="seat-status" />
    </div>;
  }

  return <section className="office-arrangement">
    <div className="arrangement-heading">
      <div><span className="eyebrow">TEAM WORKSPACE</span><h3>توزيع الفريق على الأقسام</h3><p>رتّب أماكن أعضاء الفريق واسحبهم بين الأقسام.</p></div>
      <div className="arrangement-actions">
        <button className={filter === "all" ? "arrangement-filter active" : "arrangement-filter"} onClick={() => setFilter("all")}>كل الفريق</button>
        <button className={filter === "online" ? "arrangement-filter active" : "arrangement-filter"} onClick={() => setFilter("online")}>المتصلون</button>
        <button className={editMode ? "arrangement-edit active" : "arrangement-edit"} onClick={() => setEditMode(!editMode)}>{editMode ? "إنهاء الترتيب" : "↗ ترتيب المقاعد"}</button>
      </div>
    </div>
    {editMode && <div className="arrangement-hint">وضع الترتيب مفعّل: اسحب أي عضو وأفلته داخل القسم المطلوب. يُحفظ ترتيب العرض على هذا الجهاز.</div>}
    {!ready ? <div className="arrangement-loading">جارٍ تجهيز مساحة الفريق...</div> : <div className="department-seating">
      {grouped.map((department) => <div className="department-seat" key={department.id}
        onDragOver={(event) => { if (editMode) event.preventDefault(); }}
        onDrop={() => { if (editMode && dragged) movePerson(dragged, department.id); }}>
        <div className="department-seat-heading"><i style={{ background: department.color || "#8174df" }} /><strong>{department.name}</strong><span>{department.people.length} أعضاء</span></div>
        <div className="department-seat-people">{department.people.map(renderPerson)}{!department.people.length && <span className="seat-empty">اسحب عضوًا إلى هنا</span>}</div>
      </div>)}
      <div className="department-seat unassigned-seat" onDragOver={(event) => { if (editMode) event.preventDefault(); }} onDrop={() => { if (editMode && dragged) movePerson(dragged, "unassigned"); }}>
        <div className="department-seat-heading"><i /><strong>مساحة مشتركة</strong><span>{unassigned.length} أعضاء</span></div>
        <div className="department-seat-people">{unassigned.map(renderPerson)}{!unassigned.length && <span className="seat-empty">لا يوجد أعضاء هنا</span>}</div>
      </div>
    </div>}
  </section>;
}
