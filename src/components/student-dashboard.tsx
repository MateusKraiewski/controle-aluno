"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { updateAttendance } from "@/app/actions/lessons";
import { authClient } from "@/lib/auth-client";
import { localeOptions, type Locale, translate } from "@/lib/locales";
import { saveUiPreferences } from "@/lib/preferences";
import { useUiPreferences } from "./use-ui-preferences";
import { BreakPanel } from "./dashboard/break-panel";
import { LessonDialog } from "./dashboard/lesson-dialog";
import { demoLessons, formatDate, lessonSummary, localDateKey, statusLabels, toLessons, type AttendanceStatus, type DashboardLesson, type Lesson, type View } from "./dashboard/lesson-model";
import { LessonRow } from "./dashboard/lesson-row";
import { WeekControls, WeekGrid } from "./dashboard/week-grid";

export type { DashboardLesson } from "./dashboard/lesson-model";

const navItems: { id: View; label: string; icon: string }[] = [
  { id: "overview", label: "Visão geral", icon: "⌂" }, { id: "calendar", label: "Calendário", icon: "▦" },
  { id: "history", label: "Meu histórico", icon: "▤" }, { id: "subjects", label: "Matérias", icon: "▱" },
];
const attendanceValue: Record<AttendanceStatus, "unrecorded" | "attended" | "student_absent" | "teacher_absent"> = {
  upcoming: "unrecorded", attended: "attended", "student-absent": "student_absent", "teacher-absent": "teacher_absent",
};

function Navigation({ active, onChange, locale, mobile = false }: { active: View; onChange: (view: View) => void; locale: Locale; mobile?: boolean }) {
  const t = (text: string) => translate(locale, text);
  return <nav className={mobile ? "mobile-nav" : "side-nav"} aria-label={t("Navegação principal")}>
    {navItems.map((item) => <button key={item.id} className={`nav-item ${active === item.id ? "is-active" : ""}`} onClick={() => onChange(item.id)} aria-current={active === item.id ? "page" : undefined}>
      <span className="nav-icon" aria-hidden="true">{item.icon}</span><span>{t(item.label)}</span>
    </button>)}
  </nav>;
}

export default function StudentDashboard({ initialLessons, persisted = false, displayName }: { initialLessons?: DashboardLesson[]; persisted?: boolean; displayName?: string }) {
  const router = useRouter();
  const { locale, theme, t } = useUiPreferences();
  const [active, setActive] = useState<View>("overview");
  const [lessons, setLessons] = useState<Lesson[]>(() => initialLessons ? toLessons(initialLessons) : demoLessons());
  // Server actions refresh the page after mutations; adopt the fresh server rows when they arrive.
  const [sourceLessons, setSourceLessons] = useState(initialLessons);
  if (initialLessons !== sourceLessons) { setSourceLessons(initialLessons); if (initialLessons) setLessons(toLessons(initialLessons)); }
  const [weekOffset, setWeekOffset] = useState(0);
  const [dialog, setDialog] = useState<"create" | Lesson | null>(null);
  const [notice, setNotice] = useState("");
  const [historySearch, setHistorySearch] = useState("");
  const [historySubject, setHistorySubject] = useState("all");
  const [historyFrom, setHistoryFrom] = useState("");
  const [historyTo, setHistoryTo] = useState("");
  function changeLocale(value: Locale) { saveUiPreferences({ locale: value, theme }); }
  function changeTheme() { saveUiPreferences({ locale, theme: theme === "light" ? "dark" : "light" }); }
  const days = useMemo(() => Array.from({ length: 7 }, (_, index) => { const day = new Date(); day.setHours(0, 0, 0, 0); day.setDate(day.getDate() + weekOffset * 7 + index); return day; }), [weekOffset]);
  const ordered = lessons.toSorted((a, b) => a.date.getTime() - b.date.getTime());
  const now = new Date();
  const nextLesson = ordered.find((lesson) => lesson.status === "upcoming" && lesson.date >= now);
  const history = lessons.filter((lesson) => lesson.status !== "upcoming").toSorted((a, b) => b.date.getTime() - a.date.getTime());
  const query = historySearch.trim().toLocaleLowerCase(locale);
  const filteredHistory = lessons.toSorted((a, b) => b.date.getTime() - a.date.getTime()).filter((lesson) => {
    const matchesSubject = historySubject === "all" || lesson.subject === historySubject;
    const searchable = `${lesson.subject} ${lesson.plannedContent} ${lesson.studiedContent ?? ""} ${lesson.nextStep ?? ""} ${lesson.privateNote ?? ""} ${lesson.teacher} ${t(statusLabels[lesson.status])}`.toLocaleLowerCase(locale);
    const lessonDate = localDateKey(lesson.date);
    const matchesPeriod = (!historyFrom || lessonDate >= historyFrom) && (!historyTo || lessonDate <= historyTo);
    return matchesSubject && matchesPeriod && (!query || searchable.includes(query));
  });
  const subjects = [...new Set(lessons.map((lesson) => lesson.subject))];
  const absences = lessons.filter((lesson) => lesson.status === "student-absent" || lesson.status === "teacher-absent").length;
  const viewTitle = t(active === "overview" ? "Olá, estudante." : active === "calendar" ? "Seu calendário." : active === "history" ? "Seu histórico." : "Suas matérias.");
  const viewSubtitle = t(active === "overview" ? "Tudo o que você precisa para chegar bem à próxima aula." : active === "calendar" ? "Uma semana de cada vez, organizada do seu jeito." : active === "history" ? "Um registro do que você já aprendeu e viveu." : "Acompanhe cada matéria e o que está estudando.");
  const from = days[0] ?? new Date(); const to = days[6] ?? new Date();
  const weekControls = <WeekControls from={from} to={to} locale={locale} onBack={() => setWeekOffset((offset) => offset - 1)} onForward={() => setWeekOffset((offset) => offset + 1)} onToday={weekOffset !== 0 ? () => setWeekOffset(0) : undefined} />;

  async function changeStatus(id: string, status: AttendanceStatus) {
    if (!persisted) { setLessons((current) => current.map((lesson) => lesson.id === id ? { ...lesson, status } : lesson)); setNotice(t("Registro atualizado nesta demonstração.")); return; }
    const saved = await updateAttendance(id, attendanceValue[status]);
    if (!saved.ok) { setNotice(t(saved.error)); return; }
    setLessons((current) => current.map((lesson) => lesson.id === id ? { ...lesson, status } : lesson));
    setNotice(t("Presença salva no seu histórico."));
  }

  return <div className="app-shell"><a className="skip-link" href="#conteudo-principal">{t("Pular para o conteúdo")}</a>
    <aside className="sidebar"><a className="brand" href="#inicio" onClick={(event) => { event.preventDefault(); setActive("overview"); }}><span className="brand-mark">a.</span><span>Aula em Dia<small>seu espaço de estudos</small></span></a>
      <div className="nav-section-label">{t("MENU")}</div><Navigation active={active} onChange={setActive} locale={locale} />
      <div className="sidebar-bottom"><div className="help-card"><span className="help-spark">✳</span><strong>{t("Um passo de cada vez.")}</strong><p>{t("Seu progresso também conta nos dias sem aula.")}</p></div><div className="profile-mini"><div className="avatar">AL</div><div><strong>{t("Perfil aluno")}</strong><span>{t("Meu espaço")}</span></div><span className="profile-menu">···</span></div></div>
    </aside>
    <main id="conteudo-principal" tabIndex={-1} className="main-content"><header className="topbar"><div className="mobile-brand"><span className="brand-mark">a.</span><strong>Aula em Dia</strong></div><div className="breadcrumb">{t("Meu espaço")} <span>/</span> <strong>{t(navItems.find((item) => item.id === active)?.label ?? "Visão geral")}</strong></div><div className="topbar-right"><select className="language-select" aria-label={t("Idioma da interface")} value={locale} onChange={(event) => changeLocale(event.target.value as Locale)}>{localeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select><button className="theme-toggle" onClick={changeTheme} aria-label={theme === "light" ? t("Ativar tema escuro") : t("Ativar tema claro")} title={theme === "light" ? t("Tema escuro") : t("Tema claro")}>{theme === "light" ? "☾" : "☀"}</button>{persisted ? <><span className="demo-tag"><span />{displayName || t("Perfil aluno")}</span><button className="login-link" onClick={() => { void (async () => { await authClient.signOut(); router.refresh(); })(); }}>{t("Sair")}</button></> : <><a className="login-link" href="/entrar">{t("Entrar")}</a><span className="demo-tag"><span />{t("Modo demonstração")}</span></>}<div className="avatar top-avatar">{persisted ? (displayName?.slice(0, 2).toUpperCase() || "AL") : "AL"}</div></div></header>
      <div className="content-wrap"><div className="page-heading"><div><p className="eyebrow">{t("SEU RITMO, SEU CAMINHO")}</p><h1>{viewTitle}</h1><p className="heading-subtitle">{viewSubtitle}</p>{persisted ? <nav className="collab-links" aria-label={t("Colaboração com professores")}><Link href="/vinculos">{t("Meus professores")}</Link><Link href="/professor">{t("Área do professor")}</Link></nav> : null}</div><button className="primary-button" onClick={() => setDialog("create")}><span aria-hidden="true">＋</span>{t("Nova aula")}</button></div>
        {notice ? <p className="notice" role="status">{notice}<button onClick={() => setNotice("")} aria-label={t("Fechar aviso")}>×</button></p> : null}
        {active === "overview" ? <>
          <section className="welcome-card"><div className="welcome-copy"><span className="welcome-kicker">✳ &nbsp;{t("UM BOM DIA COMEÇA COM CALMA")}</span><h2>{t("Pequenos passos.")}<br /><em>{t("Grandes aprendizados.")}</em></h2><p>{t("Organize suas aulas e acompanhe tudo o que está construindo, no seu tempo.")}</p><button className="welcome-link" onClick={() => setActive("calendar")}>{t("Ver meu calendário")} <span>→</span></button></div><div className="welcome-art" aria-hidden="true"><div className="sun-disc" /><div className="book-shape book-back" /><div className="book-shape book-front"><span>{t("aprendizado")}<br />{t("em progresso")}</span><i>✳</i></div><span className="art-spark spark-one">✳</span><span className="art-spark spark-two">·</span></div></section>
          <section className="stats-grid" aria-label={t("Resumo de aulas")}><article className="stat-card"><span className="stat-icon stat-lime">▦</span><div><span>{t("Próximas aulas")}</span><strong>{String(lessons.filter((lesson) => lesson.status === "upcoming" && lesson.date >= now).length).padStart(2, "0")}</strong></div><small>{t("na sua agenda")}</small></article><article className="stat-card"><span className="stat-icon stat-peach">✓</span><div><span>{t("Registros de falta")}</span><strong>{String(absences).padStart(2, "0")}</strong></div><small>{t("no seu histórico")}</small></article><article className="stat-card"><span className="stat-icon stat-lilac">▤</span><div><span>{t("Matérias")}</span><strong>{String(subjects.length).padStart(2, "0")}</strong></div><small>{t("em acompanhamento")}</small></article></section>
          <div className="dashboard-grid"><section className="panel calendar-panel"><div className="panel-heading"><div><p className="eyebrow">{t("AGENDA")}</p><h2>{t("Próximos 7 dias")}</h2></div>{weekControls}</div><WeekGrid days={days} lessons={ordered} locale={locale} onOpen={setDialog} /></section>
            <section className="panel next-panel"><div className="panel-heading"><div><p className="eyebrow">{t("SEGUINTE")}</p><h2>{t("Próxima aula")}</h2></div><span className="next-chip"><span />{t("A caminho")}</span></div>{nextLesson ? <div className="next-lesson-card"><div className="next-date"><strong>{formatDate(nextLesson.date, { day: "2-digit" }, locale)}</strong><span>{formatDate(nextLesson.date, { month: "short" }, locale).replace(".", "")}</span></div><div className="next-lesson-info"><span className={`subject-mark mark-${nextLesson.subject.toLowerCase()}`}>{nextLesson.subject.slice(0, 1)}</span><div><strong>{nextLesson.subject}</strong><span>{lessonSummary(nextLesson) || t("Aula sem conteúdo registrado")}</span></div></div><div className="next-time">◷ &nbsp;{nextLesson.time}–{nextLesson.endTime}</div><div className="teacher-line"><div className="teacher-avatar">{nextLesson.teacher.split(" ").map((part) => part[0]).slice(0, 2).join("")}</div><div><span>{t("Com")}</span><strong>{nextLesson.teacher}</strong></div><button aria-label={t("Detalhes da próxima aula")} onClick={() => setDialog(nextLesson)}>→</button></div></div> : <p className="empty-note">{t("Nenhuma aula agendada. Adicione uma aula para começar.")}</p>}</section></div>
          <section className="panel history-panel"><div className="panel-heading"><div><p className="eyebrow">{t("RECENTEMENTE")}</p><h2>{t("Últimos registros")}</h2></div><button className="text-button" onClick={() => setActive("history")}>{t("Ver histórico")} <span>→</span></button></div><div className="lesson-list">{history.length ? history.slice(0, 3).map((lesson) => <LessonRow key={lesson.id} lesson={lesson} locale={locale} />) : <p className="empty-note">{t("Suas aulas registradas vão aparecer aqui.")}</p>}</div></section>
        </> : null}
        {active === "calendar" ? <section className="panel full-panel"><div className="panel-heading"><div><p className="eyebrow">{t("AGENDA DO ALUNO")}</p><h2>{t("Próximos 7 dias")}</h2></div>{weekControls}</div><WeekGrid days={days} lessons={ordered} locale={locale} onOpen={setDialog} /><p className="history-hint">{t("Toque numa aula para editar, cancelar ou excluir. ⚠ indica horário sobreposto.")}</p><BreakPanel lessons={lessons} persisted={persisted} locale={locale} onLocalChange={setLessons} onDone={setNotice} /></section> : null}
        {active === "history" ? <section className="panel full-panel"><div className="panel-heading"><div><p className="eyebrow">{t("SEU CAMINHO ATÉ AQUI")}</p><h2>{t("Aulas e presenças")}</h2></div><span className="demo-tag"><span />{t(persisted ? "Dados salvos" : "Dados de exemplo")}</span></div><div className="history-filters" role="search" aria-label={t("Filtrar histórico")}><label>{t("Buscar no histórico")}<input type="search" value={historySearch} onChange={(event) => setHistorySearch(event.target.value)} placeholder={t("Matéria, conteúdo ou professor")} /></label><label>{t("Matéria")}<select value={historySubject} onChange={(event) => setHistorySubject(event.target.value)}><option value="all">{t("Todas as matérias")}</option>{subjects.toSorted().map((subject) => <option key={subject} value={subject}>{subject}</option>)}</select></label><label>{t("De")}<input type="date" value={historyFrom} onChange={(event) => setHistoryFrom(event.target.value)} /></label><label>{t("Até")}<input type="date" value={historyTo} onChange={(event) => setHistoryTo(event.target.value)} /></label></div><div className="lesson-list history-list">{filteredHistory.length ? filteredHistory.map((lesson) => <LessonRow key={`${lesson.id}-${lesson.studiedContent ?? ""}-${lesson.privateNote ?? ""}-${lesson.nextStep ?? ""}`} lesson={lesson} locale={locale} editable persisted={persisted} onChange={(status) => { void changeStatus(lesson.id, status); }} onRecordChange={(record) => setLessons((current) => current.map((item) => item.id === lesson.id ? { ...item, ...record } : item))} onOpen={() => setDialog(lesson)} />) : <p className="empty-note">{lessons.length ? t("Nenhum registro corresponde aos filtros.") : t("Nenhuma aula registrada ainda.")}</p>}</div><p className="history-hint">{filteredHistory.length} {t(filteredHistory.length === 1 ? "registro" : "registros")} · {t(persisted ? "Atualize a situação para registrar presença ou falta no seu histórico." : "Os dados de demonstração não são salvos depois que a página fecha.")}</p></section> : null}
        {active === "subjects" ? <section className="subjects-grid">{subjects.map((subject, index) => { const related = lessons.filter((lesson) => lesson.subject === subject); const recent = related.filter((lesson) => lesson.status !== "upcoming" && lesson.status !== "cancelled").length; return <article className={`subject-card subject-card-${index % 4}`} key={subject}><div className="subject-card-top"><span className={`subject-mark mark-${subject.toLowerCase()}`}>{subject.slice(0, 1)}</span><span className="subject-count">{related.length} {t(related.length === 1 ? "aula" : "aulas")}</span></div><h2>{subject}</h2><p>{(related[0] && lessonSummary(related[0])) || t("Sem tópico anotado")}</p><div className="subject-progress"><span style={{ width: `${Math.max(22, Math.min(100, 24 + recent * 22))}%` }} /></div><div className="subject-foot"><span>{recent} {t(recent === 1 ? "registro" : "registros")}</span><button onClick={() => { setHistorySubject(subject); setActive("history"); }}>{t("Ver histórico")} <span>→</span></button></div></article>; })}</section> : null}
        <footer className="demo-footnote">{t(persisted ? "Seus registros são salvos com segurança na sua conta." : "Demonstração inicial · crie uma conta para salvar seus registros")}</footer>
      </div><Navigation active={active} onChange={setActive} locale={locale} mobile />
      {dialog ? <LessonDialog key={dialog === "create" ? "create" : dialog.id} mode={dialog} persisted={persisted} locale={locale} existing={lessons} onClose={() => setDialog(null)} onLocalChange={setLessons}
        onDone={(message) => { setDialog(null); setNotice(message); if (dialog === "create") setActive("calendar"); }} /> : null}
    </main>
  </div>;
}
