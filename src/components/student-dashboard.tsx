"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createLesson, updateAttendance, updateStudyRecord } from "@/app/actions/lessons";
import { authClient } from "@/lib/auth-client";
import { generateWeeklyDates } from "@/features/calendar/domain";
import { localeOptions, type Locale, translate } from "@/lib/locales";
import { getServerUiPreferencesSnapshot, getUiPreferencesSnapshot, parseUiPreferences, saveUiPreferences, subscribeUiPreferences } from "@/lib/preferences";

type View = "overview" | "calendar" | "history" | "subjects";
type Status = "upcoming" | "attended" | "student-absent" | "teacher-absent";
export type DashboardLesson = { id: string; subject: string; date: Date | string; time: string; topic: string; teacher: string; status: Status };
type Lesson = Omit<DashboardLesson, "date"> & { date: Date };

const statusLabels: Record<Status, string> = { upcoming: "Agendada", attended: "Presença", "student-absent": "Faltei", "teacher-absent": "Relatei falta do professor" };
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

function asLocalDate(value: Date | string) {
  if (value instanceof Date) return value;
  const [datePart, timePart = "00:00"] = value.split("T");
  const [year, month, day] = datePart!.split("-").map(Number); const [hours, minutes] = timePart.split(":").map(Number);
  return new Date(year ?? 2026, (month ?? 1) - 1, day ?? 1, hours ?? 0, minutes ?? 0);
}
function formatDate(date: Date | string, options: Intl.DateTimeFormatOptions, locale: Locale) { return new Intl.DateTimeFormat(locale, options).format(asLocalDate(date)); }
function localDateKey(date: Date) { return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`; }

function Navigation({ active, onChange, locale, mobile = false }: { active: View; onChange: (view: View) => void; locale: Locale; mobile?: boolean }) {
  const t = (text: string) => translate(locale, text);
  return <nav className={mobile ? "mobile-nav" : "side-nav"} aria-label={t("Navegação principal")}>
    {navItems.map((item) => <button key={item.id} className={`nav-item ${active === item.id ? "is-active" : ""}`} onClick={() => onChange(item.id)} aria-current={active === item.id ? "page" : undefined}>
      <span className="nav-icon" aria-hidden="true">{item.icon}</span><span>{t(item.label)}</span>
    </button>)}
  </nav>;
}

function StatusPill({ status, locale }: { status: Status; locale: Locale }) {
  return <span className={`status-pill status-${status}`}><span className="status-dot" />{translate(locale, statusLabels[status])}</span>;
}

function LessonRow({ lesson, editable, locale, persisted = false, onChange, onContentChange }: { lesson: Lesson; editable?: boolean; locale: Locale; persisted?: boolean; onChange?: (value: Status) => void; onContentChange?: (value: string) => void }) {
  const t = (text: string) => translate(locale, text);
  const [editingContent, setEditingContent] = useState(false);
  const [content, setContent] = useState(lesson.topic);
  const [contentNotice, setContentNotice] = useState("");
  async function saveContent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const result = await updateStudyRecord(lesson.id, content);
    if (!result.ok) { setContentNotice(result.error); return; }
    onContentChange?.(content); setContentNotice(t("Conteúdo estudado salvo.")); setEditingContent(false);
  }
  return <article className="lesson-row"><span className={`subject-mark mark-${lesson.subject.toLowerCase()}`} aria-hidden="true">{lesson.subject.slice(0, 1)}</span>
    <div className="lesson-main"><div className="lesson-title-line"><strong>{lesson.subject}</strong><StatusPill status={lesson.status} locale={locale} /></div><p>{lesson.topic}</p>
      <span className="lesson-meta">{formatDate(lesson.date, { weekday: "short", day: "numeric", month: "short" }, locale)} · {lesson.time} · {lesson.teacher}</span></div>
    {editable ? <label className="status-select"><span className="sr-only">{t("Situação de")} {lesson.subject}</span><select value={lesson.status} aria-label={`${t("Registrar situação de")} ${lesson.subject}`} onChange={(event) => onChange?.(event.target.value as Status)}>
      <option value="attended">{t("Presença")}</option><option value="student-absent">{t("Faltei")}</option><option value="teacher-absent">{t("Relatei falta do professor")}</option><option value="upcoming">{t("Agendada")}</option>
    </select></label> : <span className="row-time">◷ {lesson.time}</span>}
    {editable && persisted ? <div className="study-record-actions">{editingContent ? <form className="study-record-form" onSubmit={(event) => { void saveContent(event); }}><label>{t("O que foi estudado?")}<textarea value={content} onChange={(event) => setContent(event.target.value)} maxLength={2000} rows={3} /></label><button className="text-button" type="submit">{t("Salvar conteúdo")}</button><button className="text-button" type="button" onClick={() => { setContent(lesson.topic); setEditingContent(false); }}>{t("Cancelar")}</button></form> : <button className="text-button" type="button" onClick={() => setEditingContent(true)}>{t("Registrar conteúdo estudado")}</button>}{contentNotice ? <span className="study-record-notice" role="status">{contentNotice}</span> : null}</div> : null}
  </article>;
}

function WeekGrid({ days, lessons, locale }: { days: Date[]; lessons: Lesson[]; locale: Locale }) {
  return <div className="week-grid">{days.map((day) => {
    const events = lessons.filter((lesson) => lesson.date.toDateString() === day.toDateString());
    return <article className={`day-column ${day.toDateString() === new Date().toDateString() ? "day-today" : ""}`} key={day.toISOString()}>
      <div className="day-label"><span>{formatDate(day, { weekday: "short" }, locale).replace(".", "")}</span><strong>{formatDate(day, { day: "2-digit" }, locale)}</strong></div>
      <div className="day-events">{events.length ? events.map((lesson) => <div className={`day-event event-${lesson.status}`} key={lesson.id}><span>{lesson.time}</span><strong>{lesson.subject}</strong><small>{lesson.topic}</small></div>) : <span className="no-class">—</span>}</div>
    </article>;
  })}</div>;
}

export default function StudentDashboard({ initialLessons, persisted = false, displayName }: { initialLessons?: DashboardLesson[]; persisted?: boolean; displayName?: string }) {
  const router = useRouter();
  const newLessonButtonRef = useRef<HTMLButtonElement>(null);
  const lessonDialogRef = useRef<HTMLElement>(null);
  const preferencesSnapshot = useSyncExternalStore(subscribeUiPreferences, getUiPreferencesSnapshot, getServerUiPreferencesSnapshot);
  const preferences = parseUiPreferences(preferencesSnapshot);
  const locale = preferences.locale ?? "pt-BR";
  const theme = preferences.theme ?? "light";
  const t = (text: string) => translate(locale, text);
  const [active, setActive] = useState<View>("overview");
  const [lessons, setLessons] = useState<Lesson[]>(() => initialLessons?.map((lesson) => ({ ...lesson, date: asLocalDate(lesson.date) })) ?? demoLessons());
  const [weekOffset, setWeekOffset] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const [repeatChoice, setRepeatChoice] = useState("none");
  const [notice, setNotice] = useState("");
  const [historySearch, setHistorySearch] = useState("");
  const [historySubject, setHistorySubject] = useState("all");
  const [historyFrom, setHistoryFrom] = useState("");
  const [historyTo, setHistoryTo] = useState("");
  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute("content", theme === "dark" ? "#171d19" : "#243d34");
  }, [locale, theme]);
  useEffect(() => {
    if (!formOpen) return;
    const previouslyFocused = document.activeElement;
    const dialog = lessonDialogRef.current;
    const trigger = newLessonButtonRef.current;
    const focusable = () => [...(dialog?.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), a[href]') ?? [])];
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") { event.preventDefault(); setFormOpen(false); return; }
      if (event.key !== "Tab") return;
      const items = focusable(); const first = items[0]; const last = items.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }
    focusable()[0]?.focus();
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      if (previouslyFocused instanceof HTMLElement) previouslyFocused.focus();
      else trigger?.focus();
    };
  }, [formOpen]);
  function changeLocale(value: Locale) { saveUiPreferences({ locale: value, theme }); }
  function changeTheme() {
    const nextTheme = theme === "light" ? "dark" : "light";
    saveUiPreferences({ locale, theme: nextTheme });
  }
  const days = useMemo(() => Array.from({ length: 7 }, (_, index) => { const day = new Date(); day.setHours(0, 0, 0, 0); day.setDate(day.getDate() + weekOffset * 7 + index); return day; }), [weekOffset]);
  const ordered = [...lessons].toSorted((a, b) => a.date.getTime() - b.date.getTime());
  const nextLesson = ordered.find((lesson) => lesson.status === "upcoming" && lesson.date >= (days[0] ?? new Date(0)));
  const history = [...lessons].filter((lesson) => lesson.status !== "upcoming").toSorted((a, b) => b.date.getTime() - a.date.getTime());
  const filteredHistory = [...lessons].toSorted((a, b) => b.date.getTime() - a.date.getTime()).filter((lesson) => {
    const matchesSubject = historySubject === "all" || lesson.subject === historySubject;
    const query = historySearch.trim().toLocaleLowerCase("pt-BR");
    const searchable = `${lesson.subject} ${lesson.topic} ${lesson.teacher} ${t(statusLabels[lesson.status])}`.toLocaleLowerCase(locale);
    const lessonDate = localDateKey(lesson.date);
    const matchesPeriod = (!historyFrom || lessonDate >= historyFrom) && (!historyTo || lessonDate <= historyTo);
    return matchesSubject && matchesPeriod && (!query || searchable.includes(query));
  });
  const subjects = [...new Set(lessons.map((lesson) => lesson.subject))];
  const absences = lessons.filter((lesson) => lesson.status === "student-absent" || lesson.status === "teacher-absent").length;
  const viewTitle = t(active === "overview" ? "Olá, estudante." : active === "calendar" ? "Seu calendário." : active === "history" ? "Seu histórico." : "Suas matérias.");
  const viewSubtitle = t(active === "overview" ? "Tudo o que você precisa para chegar bem à próxima aula." : active === "calendar" ? "Uma semana de cada vez, organizada do seu jeito." : active === "history" ? "Um registro do que você já aprendeu e viveu." : "Acompanhe cada matéria e o que está estudando.");
  const from = days[0] ?? new Date(); const to = days[6] ?? new Date();

  async function changeStatus(id: string, status: Status) {
    if (!persisted) { setLessons((current) => current.map((lesson) => lesson.id === id ? { ...lesson, status } : lesson)); setNotice("Registro atualizado nesta demonstração."); return; }
    const saved = await updateAttendance(id, status === "student-absent" ? "student_absent" : status === "teacher-absent" ? "teacher_absent" : status === "attended" ? "attended" : "unrecorded");
    if (!saved.ok) { setNotice(saved.error); return; }
    setLessons((current) => current.map((lesson) => lesson.id === id ? { ...lesson, status } : lesson));
    setNotice("Presença salva no seu histórico.");
  }
  async function addLesson(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget);
    const subject = String(form.get("subject")).trim(); const topic = String(form.get("topic")).trim();
    const dateValue = String(form.get("date")); const time = String(form.get("time")); const endsAt = String(form.get("endsAt"));
    const repeat = String(form.get("repeat") || "none"); const weekdays = form.getAll("weekdays").map(Number); const endsOn = String(form.get("endsOn") || "");
    let lessonDates = [dateValue];
    if (repeat !== "none") {
      try { lessonDates = generateWeeklyDates({ startDate: dateValue, endDate: endsOn, weekdays, everyWeeks: repeat === "biweekly" ? 2 : 1 }); }
      catch { setNotice(t("Confira os dias e o período da recorrência.")); return; }
      if (lessonDates.length === 0 || lessonDates.length > 300) { setNotice(t("A série precisa gerar entre 1 e 300 aulas.")); return; }
    }
    if (persisted) {
      const saved = await createLesson({
        subject, topic, date: dateValue, startsAt: time, endsAt,
        repeat, weekdays, endsOn,
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
      if (!saved.ok) { setNotice(saved.error); return; }
      const occurrences = saved.occurrences.map((occurrence) => {
        const [year, month, day] = occurrence.date.split("-").map(Number); const [hours, minutes] = occurrence.time.split(":").map(Number);
        return { id: occurrence.id, subject, date: new Date(year ?? 2026, (month ?? 1) - 1, day ?? 1, hours ?? 9, minutes ?? 0), time: occurrence.time, topic, teacher: "Professor(a) a definir", status: "upcoming" as const };
      });
      setLessons((current) => [...current, ...occurrences]);
      setFormOpen(false); setNotice(t(saved.occurrences.length > 1 ? "Série e aulas salvas no calendário." : "Aula salva no seu calendário.")); setActive("calendar"); return;
    }
    const newLessons = lessonDates.map((lessonDate, index) => { const [year, month, day] = lessonDate.split("-").map(Number); const [hours, minutes] = time.split(":").map(Number); return { id: `demo-${Date.now()}-${index}`, subject, date: new Date(year ?? 2026, (month ?? 1) - 1, day ?? 1, hours ?? 9, minutes ?? 0), time, topic, teacher: "Professor(a) a definir", status: "upcoming" as const }; });
    setLessons((current) => [...current, ...newLessons]);
    setFormOpen(false); setNotice(t("Aula adicionada à demonstração desta sessão. Crie uma conta para salvar seus registros.")); setActive("calendar");
  }

  return <div className="app-shell"><a className="skip-link" href="#conteudo-principal">{t("Pular para o conteúdo")}</a>
    <aside className="sidebar"><a className="brand" href="#inicio" onClick={(event) => { event.preventDefault(); setActive("overview"); }}><span className="brand-mark">a.</span><span>Aula em Dia<small>seu espaço de estudos</small></span></a>
      <div className="nav-section-label">{t("MENU")}</div><Navigation active={active} onChange={setActive} locale={locale} />
      <div className="sidebar-bottom"><div className="help-card"><span className="help-spark">✳</span><strong>{t("Um passo de cada vez.")}</strong><p>{t("Seu progresso também conta nos dias sem aula.")}</p></div><div className="profile-mini"><div className="avatar">AL</div><div><strong>{t("Perfil aluno")}</strong><span>{t("Meu espaço")}</span></div><span className="profile-menu">···</span></div></div>
    </aside>
    <main id="conteudo-principal" tabIndex={-1} className="main-content"><header className="topbar"><div className="mobile-brand"><span className="brand-mark">a.</span><strong>Aula em Dia</strong></div><div className="breadcrumb">{t("Meu espaço")} <span>/</span> <strong>{t(navItems.find((item) => item.id === active)?.label ?? "Visão geral")}</strong></div><div className="topbar-right"><select className="language-select" aria-label={t("Idioma da interface")} value={locale} onChange={(event) => changeLocale(event.target.value as Locale)}>{localeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select><button className="theme-toggle" onClick={changeTheme} aria-label={theme === "light" ? t("Ativar tema escuro") : t("Ativar tema claro")} title={theme === "light" ? t("Tema escuro") : t("Tema claro")}>{theme === "light" ? "☾" : "☀"}</button>{persisted ? <><span className="demo-tag"><span />{displayName || t("Perfil aluno")}</span><button className="login-link" onClick={() => { void (async () => { await authClient.signOut(); router.refresh(); })(); }}>{t("Sair")}</button></> : <><a className="login-link" href="/entrar">{t("Entrar")}</a><span className="demo-tag"><span />{t("Modo demonstração")}</span></>}<div className="avatar top-avatar">{persisted ? (displayName?.slice(0, 2).toUpperCase() || "AL") : "AL"}</div></div></header>
      <div className="content-wrap"><div className="page-heading"><div><p className="eyebrow">{t("SEU RITMO, SEU CAMINHO")}</p><h1>{viewTitle}</h1><p className="heading-subtitle">{viewSubtitle}</p></div><button ref={newLessonButtonRef} className="primary-button" onClick={() => setFormOpen(true)}><span aria-hidden="true">＋</span>{t("Nova aula")}</button></div>
        {notice ? <p className="notice" role="status">{notice}<button onClick={() => setNotice("")} aria-label="Fechar aviso">×</button></p> : null}
        {active === "overview" ? <>
          <section className="welcome-card"><div className="welcome-copy"><span className="welcome-kicker">✳ &nbsp;{t("UM BOM DIA COMEÇA COM CALMA")}</span><h2>{t("Pequenos passos.")}<br /><em>{t("Grandes aprendizados.")}</em></h2><p>{t("Organize suas aulas e acompanhe tudo o que está construindo, no seu tempo.")}</p><button className="welcome-link" onClick={() => setActive("calendar")}>{t("Ver meu calendário")} <span>→</span></button></div><div className="welcome-art" aria-hidden="true"><div className="sun-disc" /><div className="book-shape book-back" /><div className="book-shape book-front"><span>{t("aprendizado")}<br />{t("em progresso")}</span><i>✳</i></div><span className="art-spark spark-one">✳</span><span className="art-spark spark-two">·</span></div></section>
          <section className="stats-grid" aria-label={t("Resumo de aulas")}><article className="stat-card"><span className="stat-icon stat-lime">▦</span><div><span>{t("Próximas aulas")}</span><strong>{String(lessons.filter((lesson) => lesson.status === "upcoming").length).padStart(2, "0")}</strong></div><small>{t("na sua agenda")}</small></article><article className="stat-card"><span className="stat-icon stat-peach">✓</span><div><span>{t("Registros de falta")}</span><strong>{String(absences).padStart(2, "0")}</strong></div><small>{t("no seu histórico")}</small></article><article className="stat-card"><span className="stat-icon stat-lilac">▤</span><div><span>{t("Matérias")}</span><strong>{String(subjects.length).padStart(2, "0")}</strong></div><small>{t("em acompanhamento")}</small></article></section>
          <div className="dashboard-grid"><section className="panel calendar-panel"><div className="panel-heading"><div><p className="eyebrow">{t("AGENDA")}</p><h2>{t("Próximos 7 dias")}</h2></div><WeekControls from={from} to={to} locale={locale} onBack={() => setWeekOffset((offset) => offset - 1)} onForward={() => setWeekOffset((offset) => offset + 1)} /></div><WeekGrid days={days} lessons={ordered} locale={locale} /></section>
            <section className="panel next-panel"><div className="panel-heading"><div><p className="eyebrow">{t("SEGUINTE")}</p><h2>{t("Próxima aula")}</h2></div><span className="next-chip"><span />{t("A caminho")}</span></div>{nextLesson ? <div className="next-lesson-card"><div className="next-date"><strong>{formatDate(nextLesson.date, { day: "2-digit" }, locale)}</strong><span>{formatDate(nextLesson.date, { month: "short" }, locale).replace(".", "")}</span></div><div className="next-lesson-info"><span className={`subject-mark mark-${nextLesson.subject.toLowerCase()}`}>{nextLesson.subject.slice(0, 1)}</span><div><strong>{nextLesson.subject}</strong><span>{nextLesson.topic}</span></div></div><div className="next-time">◷ &nbsp;{nextLesson.time}</div><div className="teacher-line"><div className="teacher-avatar">{nextLesson.teacher.split(" ").map((part) => part[0]).slice(0, 2).join("")}</div><div><span>{t("Com")}</span><strong>{nextLesson.teacher}</strong></div><button aria-label={t("Detalhes da próxima aula")} onClick={() => setActive("calendar")}>→</button></div></div> : <p className="empty-note">{t("Nenhuma aula agendada. Adicione uma aula para começar.")}</p>}</section></div>
          <section className="panel history-panel"><div className="panel-heading"><div><p className="eyebrow">{t("RECENTEMENTE")}</p><h2>{t("Últimos registros")}</h2></div><button className="text-button" onClick={() => setActive("history")}>{t("Ver histórico")} <span>→</span></button></div><div className="lesson-list">{history.length ? history.slice(0, 3).map((lesson) => <LessonRow key={lesson.id} lesson={lesson} locale={locale} />) : <p className="empty-note">{t("Suas aulas registradas vão aparecer aqui.")}</p>}</div></section>
        </> : null}
        {active === "calendar" ? <section className="panel full-panel"><div className="panel-heading"><div><p className="eyebrow">{t("AGENDA DO ALUNO")}</p><h2>{t("Próximos 7 dias")}</h2></div><WeekControls from={from} to={to} locale={locale} onBack={() => setWeekOffset((offset) => offset - 1)} onForward={() => setWeekOffset((offset) => offset + 1)} /></div><WeekGrid days={days} lessons={ordered} locale={locale} /></section> : null}
        {active === "history" ? <section className="panel full-panel"><div className="panel-heading"><div><p className="eyebrow">{t("SEU CAMINHO ATÉ AQUI")}</p><h2>{t("Aulas e presenças")}</h2></div><span className="demo-tag"><span />{t(persisted ? "Dados salvos" : "Dados de exemplo")}</span></div><div className="history-filters" role="search" aria-label={t("Filtrar histórico")}><label>{t("Buscar no histórico")}<input type="search" value={historySearch} onChange={(event) => setHistorySearch(event.target.value)} placeholder={t("Matéria, conteúdo ou professor")} /></label><label>{t("Matéria")}<select value={historySubject} onChange={(event) => setHistorySubject(event.target.value)}><option value="all">{t("Todas as matérias")}</option>{subjects.toSorted().map((subject) => <option key={subject} value={subject}>{subject}</option>)}</select></label><label>{t("De")}<input type="date" value={historyFrom} onChange={(event) => setHistoryFrom(event.target.value)} /></label><label>{t("Até")}<input type="date" value={historyTo} onChange={(event) => setHistoryTo(event.target.value)} /></label></div><div className="lesson-list history-list">{filteredHistory.length ? filteredHistory.map((lesson) => <LessonRow key={lesson.id} lesson={lesson} locale={locale} editable persisted={persisted} onChange={(status) => { void changeStatus(lesson.id, status); }} onContentChange={(topic) => setLessons((current) => current.map((item) => item.id === lesson.id ? { ...item, topic } : item))} />) : <p className="empty-note">{lessons.length ? t("Nenhum registro corresponde aos filtros.") : t("Nenhuma aula registrada ainda.")}</p>}</div><p className="history-hint">{filteredHistory.length} {t(filteredHistory.length === 1 ? "registro" : "registros")} · {t(persisted ? "Atualize a situação para registrar presença ou falta no seu histórico." : "Os dados de demonstração não são salvos depois que a página fecha.")}</p></section> : null}
        {active === "subjects" ? <section className="subjects-grid">{subjects.map((subject, index) => { const related = lessons.filter((lesson) => lesson.subject === subject); const recent = related.filter((lesson) => lesson.status !== "upcoming").length; return <article className={`subject-card subject-card-${index % 4}`} key={subject}><div className="subject-card-top"><span className={`subject-mark mark-${subject.toLowerCase()}`}>{subject.slice(0, 1)}</span><span className="subject-count">{related.length} aulas</span></div><h2>{subject}</h2><p>{related[0]?.topic ?? "Sem tópico anotado"}</p><div className="subject-progress"><span style={{ width: `${Math.max(22, Math.min(100, 24 + recent * 22))}%` }} /></div><div className="subject-foot"><span>{recent} {recent === 1 ? "registro" : "registros"}</span><button onClick={() => setActive("history")}>Ver histórico <span>→</span></button></div></article>; })}</section> : null}
        <footer className="demo-footnote">{t(persisted ? "Seus registros são salvos com segurança na sua conta." : "Demonstração inicial · crie uma conta para salvar seus registros")}</footer>
      </div><Navigation active={active} onChange={setActive} locale={locale} mobile />
      {formOpen ? <div className="dialog-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setFormOpen(false); }}><section ref={lessonDialogRef} className="lesson-dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title"><div className="dialog-heading"><div><p className="eyebrow">{t("AGENDA DO ALUNO")}</p><h2 id="dialog-title">{t("Adicionar aula")}</h2></div><button className="dialog-close" type="button" onClick={() => setFormOpen(false)} aria-label={t("Fechar")}>×</button></div><p className="dialog-help">{t(persisted ? "A aula será salva no seu calendário." : "Crie uma conta para salvar suas aulas.")}</p><form onSubmit={(event) => { void addLesson(event); }}><label>{t("Matéria")}<input name="subject" autoComplete="off" placeholder={t("Ex.: História…")} required maxLength={48} /></label><label>{t("O que você vai estudar?")}<input name="topic" autoComplete="off" placeholder={t("Ex.: Brasil Colônia…")} required maxLength={500} /></label><div className="form-row"><label>{t("Data")}<input name="date" type="date" required defaultValue={localDateKey(dateAt(1, "09:00"))} /></label><label>{t("Início")}<input name="time" type="time" required defaultValue="09:00" /></label><label>{t("Fim")}<input name="endsAt" type="time" required defaultValue="10:00" /></label></div><label>{t("Repetir")}<select name="repeat" value={repeatChoice} onChange={(event) => setRepeatChoice(event.target.value)}><option value="none">{t("Uma vez")}</option><option value="weekly">{t("Toda semana")}</option><option value="biweekly">{t("A cada duas semanas")}</option></select></label>{repeatChoice !== "none" ? <><fieldset className="weekday-options"><legend>{t("Dias da semana")}</legend>{[[1,"Segunda"],[2,"Terça"],[3,"Quarta"],[4,"Quinta"],[5,"Sexta"],[6,"Sábado"],[7,"Domingo"]].map(([day, name]) => <label key={day}><input type="checkbox" name="weekdays" value={day} />{t(String(name))}</label>)}</fieldset><label>{t("Repetir até")}<input name="endsOn" type="date" required defaultValue={localDateKey(dateAt(85, "09:00"))} min={localDateKey(dateAt(1, "09:00"))} /></label></> : null}<div className="dialog-actions"><button type="button" className="secondary-button" onClick={() => setFormOpen(false)}>{t("Cancelar")}</button><button type="submit" className="primary-button">{t("Adicionar à agenda")}</button></div></form></section></div> : null}
    </main>
  </div>;
}

function WeekControls({ from, to, locale, onBack, onForward }: { from: Date; to: Date; locale: Locale; onBack: () => void; onForward: () => void }) {
  const t = (text: string) => translate(locale, text);
  return <div className="week-controls"><button onClick={onBack} aria-label={t("Sete dias anteriores")}>‹</button><span>{formatDate(from, { day: "numeric" }, locale)} — {formatDate(to, { day: "numeric", month: "long" }, locale)}</span><button onClick={onForward} aria-label={t("Sete dias seguintes")}>›</button></div>;
}
