"use client";

import { useMemo, useState, type FormEvent } from "react";

type View = "overview" | "calendar" | "history" | "subjects";
type Status = "upcoming" | "attended" | "student-absent" | "teacher-absent";
type Lesson = { id: string; subject: string; date: Date; time: string; topic: string; teacher: string; status: Status };

const labels: Record<Status, string> = { upcoming: "Agendada", attended: "Presença", "student-absent": "Faltei", "teacher-absent": "Professor faltou" };
const navItems: { id: View; label: string; icon: string }[] = [
  { id: "overview", label: "Visão geral", icon: "⌂" }, { id: "calendar", label: "Calendário", icon: "▦" },
  { id: "history", label: "Meu histórico", icon: "▤" }, { id: "subjects", label: "Matérias", icon: "▱" },
];

function dateAt(offset: number, time: string) {
  const date = new Date(); date.setHours(0, 0, 0, 0); date.setDate(date.getDate() + offset);
  const [hours, minutes] = time.split(":").map(Number); date.setHours(hours ?? 9, minutes ?? 0); return date;
}

function demoLessons(): Lesson[] {
  return [
    { id: "demo-1", subject: "Inglês", date: dateAt(-2, "10:00"), time: "10:00", topic: "Conversação: viagens", teacher: "Carolina Martins", status: "attended" },
    { id: "demo-2", subject: "Matemática", date: dateAt(-5, "14:30"), time: "14:30", topic: "Funções do 2º grau", teacher: "Rafael Costa", status: "teacher-absent" },
    { id: "demo-3", subject: "Biologia", date: dateAt(1, "09:00"), time: "09:00", topic: "Ecossistemas", teacher: "Marina Alves", status: "upcoming" },
    { id: "demo-4", subject: "Inglês", date: dateAt(2, "16:00"), time: "16:00", topic: "Simple past", teacher: "Carolina Martins", status: "upcoming" },
    { id: "demo-5", subject: "Matemática", date: dateAt(4, "14:30"), time: "14:30", topic: "Geometria plana", teacher: "Rafael Costa", status: "upcoming" },
    { id: "demo-6", subject: "Redação", date: dateAt(6, "11:00"), time: "11:00", topic: "Texto argumentativo", teacher: "Joana Lima", status: "upcoming" },
  ];
}

function formatDate(date: Date, options: Intl.DateTimeFormatOptions) { return new Intl.DateTimeFormat("pt-BR", options).format(date); }
function localDateKey(date: Date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; }

function Navigation({ active, onChange, mobile = false }: { active: View; onChange: (view: View) => void; mobile?: boolean }) {
  return <nav className={mobile ? "mobile-nav" : "side-nav"} aria-label="Navegação principal">
    {navItems.map((item) => <button key={item.id} className={`nav-item ${active === item.id ? "is-active" : ""}`} onClick={() => onChange(item.id)} aria-current={active === item.id ? "page" : undefined}>
      <span className="nav-icon" aria-hidden="true">{item.icon}</span><span>{item.label}</span>
    </button>)}
  </nav>;
}

function StatusPill({ status }: { status: Status }) {
  return <span className={`status-pill status-${status}`}><span className="status-dot" />{labels[status]}</span>;
}

function LessonRow({ lesson, editable, onChange }: { lesson: Lesson; editable?: boolean; onChange?: (value: Status) => void }) {
  return <article className="lesson-row"><span className={`subject-mark mark-${lesson.subject.toLowerCase()}`} aria-hidden="true">{lesson.subject.slice(0, 1)}</span>
    <div className="lesson-main"><div className="lesson-title-line"><strong>{lesson.subject}</strong><StatusPill status={lesson.status} /></div><p>{lesson.topic}</p>
      <span className="lesson-meta">{formatDate(lesson.date, { weekday: "short", day: "numeric", month: "short" })} · {lesson.time} · {lesson.teacher}</span></div>
    {editable ? <label className="status-select"><span className="sr-only">Situação de {lesson.subject}</span><select value={lesson.status} aria-label={`Registrar situação de ${lesson.subject}`} onChange={(event) => onChange?.(event.target.value as Status)}>
      <option value="attended">Presença</option><option value="student-absent">Faltei</option><option value="teacher-absent">Professor faltou</option><option value="upcoming">Agendada</option>
    </select></label> : <span className="row-time">◷ {lesson.time}</span>}
  </article>;
}

function WeekGrid({ days, lessons }: { days: Date[]; lessons: Lesson[] }) {
  return <div className="week-grid">{days.map((day) => {
    const events = lessons.filter((lesson) => lesson.date.toDateString() === day.toDateString());
    return <article className={`day-column ${day.toDateString() === new Date().toDateString() ? "day-today" : ""}`} key={day.toISOString()}>
      <div className="day-label"><span>{formatDate(day, { weekday: "short" }).replace(".", "")}</span><strong>{formatDate(day, { day: "2-digit" })}</strong></div>
      <div className="day-events">{events.length ? events.map((lesson) => <div className={`day-event event-${lesson.status}`} key={lesson.id}><span>{lesson.time}</span><strong>{lesson.subject}</strong><small>{lesson.topic}</small></div>) : <span className="no-class">—</span>}</div>
    </article>;
  })}</div>;
}

export default function StudentDashboard() {
  const [active, setActive] = useState<View>("overview");
  const [lessons, setLessons] = useState<Lesson[]>(demoLessons);
  const [weekOffset, setWeekOffset] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const [historySearch, setHistorySearch] = useState("");
  const [historySubject, setHistorySubject] = useState("all");
  const [historyFrom, setHistoryFrom] = useState("");
  const [historyTo, setHistoryTo] = useState("");
  const days = useMemo(() => Array.from({ length: 7 }, (_, index) => { const day = new Date(); day.setHours(0, 0, 0, 0); day.setDate(day.getDate() + weekOffset * 7 + index); return day; }), [weekOffset]);
  const ordered = [...lessons].toSorted((a, b) => a.date.getTime() - b.date.getTime());
  const nextLesson = ordered.find((lesson) => lesson.status === "upcoming" && lesson.date.getTime() >= Date.now());
  const history = [...lessons].filter((lesson) => lesson.status !== "upcoming").toSorted((a, b) => b.date.getTime() - a.date.getTime());
  const filteredHistory = history.filter((lesson) => {
    const matchesSubject = historySubject === "all" || lesson.subject === historySubject;
    const query = historySearch.trim().toLocaleLowerCase("pt-BR");
    const searchable = `${lesson.subject} ${lesson.topic} ${lesson.teacher} ${labels[lesson.status]}`.toLocaleLowerCase("pt-BR");
    const lessonDate = localDateKey(lesson.date);
    const matchesPeriod = (!historyFrom || lessonDate >= historyFrom) && (!historyTo || lessonDate <= historyTo);
    return matchesSubject && matchesPeriod && (!query || searchable.includes(query));
  });
  const subjects = [...new Set(lessons.map((lesson) => lesson.subject))];
  const absences = lessons.filter((lesson) => lesson.status === "student-absent" || lesson.status === "teacher-absent").length;
  const viewTitle = active === "overview" ? "Olá, estudante." : active === "calendar" ? "Seu calendário." : active === "history" ? "Seu histórico." : "Suas matérias.";
  const viewSubtitle = active === "overview" ? "Tudo o que você precisa para chegar bem à próxima aula." : active === "calendar" ? "Uma semana de cada vez, organizada do seu jeito." : active === "history" ? "Um registro do que você já aprendeu e viveu." : "Acompanhe cada matéria e o que está estudando.";
  const from = days[0] ?? new Date(); const to = days[6] ?? new Date();

  function changeStatus(id: string, status: Status) { setLessons((current) => current.map((lesson) => lesson.id === id ? { ...lesson, status } : lesson)); setNotice("Registro de demonstração atualizado nesta sessão."); }
  function addLesson(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget); const [year, month, day] = String(form.get("date")).split("-").map(Number);
    const time = String(form.get("time")); const [hours, minutes] = time.split(":").map(Number);
    const date = new Date(year ?? 2026, (month ?? 1) - 1, day ?? 1, hours ?? 9, minutes ?? 0);
    setLessons((current) => [...current, { id: `demo-${Date.now()}`, subject: String(form.get("subject")).trim(), date, time, topic: String(form.get("topic")).trim(), teacher: "Professor(a) a definir", status: "upcoming" }]);
    setFormOpen(false); setNotice("Aula adicionada à demonstração desta sessão. Ela não foi salva no servidor."); setActive("calendar");
  }

  return <div className="app-shell">
    <aside className="sidebar"><a className="brand" href="#inicio" onClick={(event) => { event.preventDefault(); setActive("overview"); }}><span className="brand-mark">a.</span><span>Aula em Dia<small>seu espaço de estudos</small></span></a>
      <div className="nav-section-label">MENU</div><Navigation active={active} onChange={setActive} />
      <div className="sidebar-bottom"><div className="help-card"><span className="help-spark">✳</span><strong>Um passo de cada vez.</strong><p>Seu progresso também conta nos dias sem aula.</p></div><div className="profile-mini"><div className="avatar">AL</div><div><strong>Perfil aluno</strong><span>Meu espaço</span></div><span className="profile-menu">···</span></div></div>
    </aside>
    <main className="main-content"><header className="topbar"><div className="mobile-brand"><span className="brand-mark">a.</span><strong>Aula em Dia</strong></div><div className="breadcrumb">Meu espaço <span>/</span> <strong>{navItems.find((item) => item.id === active)?.label}</strong></div><div className="topbar-right"><span className="demo-tag"><span />Modo demonstração</span><div className="avatar top-avatar">AL</div></div></header>
      <div className="content-wrap"><div className="page-heading"><div><p className="eyebrow">SEU RITMO, SEU CAMINHO</p><h1>{viewTitle}</h1><p className="heading-subtitle">{viewSubtitle}</p></div><button className="primary-button" onClick={() => setFormOpen(true)}><span aria-hidden="true">＋</span>Nova aula</button></div>
        {notice ? <p className="notice" role="status">{notice}<button onClick={() => setNotice("")} aria-label="Fechar aviso">×</button></p> : null}
        {active === "overview" ? <>
          <section className="welcome-card"><div className="welcome-copy"><span className="welcome-kicker">✳ &nbsp;UM BOM DIA COMEÇA COM CALMA</span><h2>Pequenos passos.<br /><em>Grandes aprendizados.</em></h2><p>Organize suas aulas e acompanhe tudo o que está construindo, no seu tempo.</p><button className="welcome-link" onClick={() => setActive("calendar")}>Ver meu calendário <span>→</span></button></div><div className="welcome-art" aria-hidden="true"><div className="sun-disc" /><div className="book-shape book-back" /><div className="book-shape book-front"><span>aprendizado<br />em progresso</span><i>✳</i></div><span className="art-spark spark-one">✳</span><span className="art-spark spark-two">·</span></div></section>
          <section className="stats-grid" aria-label="Resumo de aulas"><article className="stat-card"><span className="stat-icon stat-lime">▦</span><div><span>Próximas aulas</span><strong>{String(lessons.filter((lesson) => lesson.status === "upcoming").length).padStart(2, "0")}</strong></div><small>na sua agenda</small></article><article className="stat-card"><span className="stat-icon stat-peach">✓</span><div><span>Registros de falta</span><strong>{String(absences).padStart(2, "0")}</strong></div><small>no seu histórico</small></article><article className="stat-card"><span className="stat-icon stat-lilac">▤</span><div><span>Matérias</span><strong>{String(subjects.length).padStart(2, "0")}</strong></div><small>em acompanhamento</small></article></section>
          <div className="dashboard-grid"><section className="panel calendar-panel"><div className="panel-heading"><div><p className="eyebrow">AGENDA</p><h2>Próximos 7 dias</h2></div><WeekControls from={from} to={to} onBack={() => setWeekOffset((offset) => offset - 1)} onForward={() => setWeekOffset((offset) => offset + 1)} /></div><WeekGrid days={days} lessons={ordered} /></section>
            <section className="panel next-panel"><div className="panel-heading"><div><p className="eyebrow">SEGUINTE</p><h2>Próxima aula</h2></div><span className="next-chip"><span />A caminho</span></div>{nextLesson ? <div className="next-lesson-card"><div className="next-date"><strong>{formatDate(nextLesson.date, { day: "2-digit" })}</strong><span>{formatDate(nextLesson.date, { month: "short" }).replace(".", "")}</span></div><div className="next-lesson-info"><span className={`subject-mark mark-${nextLesson.subject.toLowerCase()}`}>{nextLesson.subject.slice(0, 1)}</span><div><strong>{nextLesson.subject}</strong><span>{nextLesson.topic}</span></div></div><div className="next-time">◷ &nbsp;{nextLesson.time}</div><div className="teacher-line"><div className="teacher-avatar">{nextLesson.teacher.split(" ").map((part) => part[0]).slice(0, 2).join("")}</div><div><span>Com</span><strong>{nextLesson.teacher}</strong></div><button aria-label="Detalhes da próxima aula" onClick={() => setActive("calendar")}>→</button></div></div> : <p className="empty-note">Nenhuma aula agendada. Adicione uma aula para começar.</p>}</section></div>
          <section className="panel history-panel"><div className="panel-heading"><div><p className="eyebrow">RECENTEMENTE</p><h2>Últimos registros</h2></div><button className="text-button" onClick={() => setActive("history")}>Ver histórico <span>→</span></button></div><div className="lesson-list">{history.length ? history.slice(0, 3).map((lesson) => <LessonRow key={lesson.id} lesson={lesson} />) : <p className="empty-note">Suas aulas registradas vão aparecer aqui.</p>}</div></section>
        </> : null}
        {active === "calendar" ? <section className="panel full-panel"><div className="panel-heading"><div><p className="eyebrow">AGENDA DO ALUNO</p><h2>Próximos 7 dias</h2></div><WeekControls from={from} to={to} onBack={() => setWeekOffset((offset) => offset - 1)} onForward={() => setWeekOffset((offset) => offset + 1)} /></div><WeekGrid days={days} lessons={ordered} /></section> : null}
        {active === "history" ? <section className="panel full-panel"><div className="panel-heading"><div><p className="eyebrow">SEU CAMINHO ATÉ AQUI</p><h2>Aulas e ocorrências</h2></div><span className="demo-tag"><span />Dados de exemplo</span></div><div className="history-filters" role="search" aria-label="Filtrar histórico"><label>Buscar no histórico<input type="search" value={historySearch} onChange={(event) => setHistorySearch(event.target.value)} placeholder="Matéria, conteúdo ou professor" /></label><label>Matéria<select value={historySubject} onChange={(event) => setHistorySubject(event.target.value)}><option value="all">Todas as matérias</option>{subjects.toSorted().map((subject) => <option key={subject} value={subject}>{subject}</option>)}</select></label><label>De<input type="date" value={historyFrom} onChange={(event) => setHistoryFrom(event.target.value)} /></label><label>Até<input type="date" value={historyTo} onChange={(event) => setHistoryTo(event.target.value)} /></label></div><div className="lesson-list history-list">{filteredHistory.length ? filteredHistory.map((lesson) => <LessonRow key={lesson.id} lesson={lesson} editable onChange={(status) => changeStatus(lesson.id, status)} />) : <p className="empty-note">{history.length ? "Nenhum registro corresponde aos filtros." : "Nenhuma aula registrada ainda."}</p>}</div><p className="history-hint">{filteredHistory.length} {filteredHistory.length === 1 ? "registro" : "registros"} · Edite a situação nos dados de demonstração; ela não será salva depois que esta página fechar.</p></section> : null}
        {active === "subjects" ? <section className="subjects-grid">{subjects.map((subject, index) => { const related = lessons.filter((lesson) => lesson.subject === subject); const recent = related.filter((lesson) => lesson.status !== "upcoming").length; return <article className={`subject-card subject-card-${index % 4}`} key={subject}><div className="subject-card-top"><span className={`subject-mark mark-${subject.toLowerCase()}`}>{subject.slice(0, 1)}</span><span className="subject-count">{related.length} aulas</span></div><h2>{subject}</h2><p>{related[0]?.topic ?? "Sem tópico anotado"}</p><div className="subject-progress"><span style={{ width: `${Math.max(22, Math.min(100, 24 + recent * 22))}%` }} /></div><div className="subject-foot"><span>{recent} {recent === 1 ? "registro" : "registros"}</span><button onClick={() => setActive("history")}>Ver histórico <span>→</span></button></div></article>; })}</section> : null}
        <footer className="demo-footnote">Demonstração inicial · seus registros ainda não são salvos</footer>
      </div><Navigation active={active} onChange={setActive} mobile />
      {formOpen ? <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setFormOpen(false); }}><section className="lesson-dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title"><div className="dialog-heading"><div><p className="eyebrow">AGENDA DO ALUNO</p><h2 id="dialog-title">Adicionar aula</h2></div><button className="dialog-close" onClick={() => setFormOpen(false)} aria-label="Fechar">×</button></div><p className="dialog-help">Este registro fica apenas nesta demonstração.</p><form onSubmit={addLesson}><label>Matéria<input name="subject" placeholder="Ex.: História" required maxLength={48} /></label><label>O que você vai estudar?<input name="topic" placeholder="Ex.: Brasil Colônia" required maxLength={80} /></label><div className="form-row"><label>Data<input name="date" type="date" required defaultValue={localDateKey(dateAt(1, "09:00"))} /></label><label>Horário<input name="time" type="time" required defaultValue="09:00" /></label></div><div className="dialog-actions"><button type="button" className="secondary-button" onClick={() => setFormOpen(false)}>Cancelar</button><button type="submit" className="primary-button">Adicionar à agenda</button></div></form></section></div> : null}
    </main>
  </div>;
}

function WeekControls({ from, to, onBack, onForward }: { from: Date; to: Date; onBack: () => void; onForward: () => void }) {
  return <div className="week-controls"><button onClick={onBack} aria-label="Sete dias anteriores">‹</button><span>{formatDate(from, { day: "numeric" })} — {formatDate(to, { day: "numeric", month: "long" })}</span><button onClick={onForward} aria-label="Sete dias seguintes">›</button></div>;
}
