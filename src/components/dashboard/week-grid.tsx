"use client";

import { intervalsOverlap } from "@/features/calendar/domain";
import { translate, type Locale } from "@/lib/locales";
import { formatDate, lessonSummary, statusLabels, type Lesson } from "./lesson-model";

function overlapsAnother(lesson: Lesson, sameDay: Lesson[]) {
  if (lesson.status === "cancelled") return false;
  return sameDay.some((other) => other.id !== lesson.id && other.status !== "cancelled"
    && intervalsOverlap({ startsAt: lesson.time, endsAt: lesson.endTime }, { startsAt: other.time, endsAt: other.endTime }));
}

export function WeekGrid({ days, lessons, locale, onOpen }: { days: Date[]; lessons: Lesson[]; locale: Locale; onOpen: (lesson: Lesson) => void }) {
  const t = (text: string) => translate(locale, text);
  const today = new Date().toDateString();
  return <div className="week-grid">{days.map((day) => {
    const events = lessons.filter((lesson) => lesson.date.toDateString() === day.toDateString());
    return <article className={`day-column ${day.toDateString() === today ? "day-today" : ""}`} key={day.toISOString()}>
      <div className="day-label"><span>{formatDate(day, { weekday: "short" }, locale).replace(".", "")}</span><strong>{formatDate(day, { day: "2-digit" }, locale)}</strong></div>
      <div className="day-events">{events.length ? events.map((lesson) => {
        const conflict = overlapsAnother(lesson, events);
        return <button type="button" className={`day-event event-${lesson.status} ${conflict ? "has-conflict" : ""}`} key={lesson.id} onClick={() => onOpen(lesson)}
          aria-label={`${lesson.subject}, ${lesson.time}–${lesson.endTime}, ${t(statusLabels[lesson.status])}${conflict ? `, ${t("horário sobreposto")}` : ""}. ${t("Abrir detalhes")}`}>
          <span>{lesson.time}–{lesson.endTime}{conflict ? " ⚠" : ""}</span><strong>{lesson.subject}</strong><small>{lesson.status === "cancelled" ? t("Cancelada") : lessonSummary(lesson) || t("Aula sem conteúdo registrado")}</small>
        </button>;
      }) : <span className="no-class">—</span>}</div>
    </article>;
  })}</div>;
}

export function WeekControls({ from, to, locale, onBack, onForward, onToday }: { from: Date; to: Date; locale: Locale; onBack: () => void; onForward: () => void; onToday?: () => void }) {
  const t = (text: string) => translate(locale, text);
  return <div className="week-controls"><button onClick={onBack} aria-label={t("Sete dias anteriores")}>‹</button><span>{formatDate(from, { day: "numeric" }, locale)} — {formatDate(to, { day: "numeric", month: "long" }, locale)}</span><button onClick={onForward} aria-label={t("Sete dias seguintes")}>›</button>{onToday ? <button className="today-button" onClick={onToday}>{t("Hoje")}</button> : null}</div>;
}
