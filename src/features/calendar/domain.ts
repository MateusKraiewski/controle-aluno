export type TimeInterval = { startsAt: string; endsAt: string };

function minutes(time: string) {
  const match = /^(\d{2}):(\d{2})$/.exec(time);
  if (!match) throw new Error("invalid_time_format");
  const hours = Number(match[1]); const minute = Number(match[2]);
  if (hours > 23 || minute > 59) throw new Error("invalid_time_format");
  return hours * 60 + minute;
}

export function intervalsOverlap(left: TimeInterval, right: TimeInterval) {
  const leftStart = minutes(left.startsAt); const leftEnd = minutes(left.endsAt);
  const rightStart = minutes(right.startsAt); const rightEnd = minutes(right.endsAt);
  if (leftStart >= leftEnd || rightStart >= rightEnd) throw new Error("invalid_time_interval");
  // Half-open intervals: a class ending at 10:00 may be followed by one starting at 10:00.
  return leftStart < rightEnd && rightStart < leftEnd;
}

export type WeeklyRule = { startDate: string; endDate: string; weekdays: number[]; everyWeeks?: number };

export function generateWeeklyDates(rule: WeeklyRule) {
  const { startDate, endDate } = rule;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate) || endDate < startDate) throw new Error("invalid_date_range");
  const start = new Date(`${startDate}T00:00:00.000Z`);
  const end = new Date(`${endDate}T00:00:00.000Z`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start.toISOString().slice(0, 10) !== startDate || end.toISOString().slice(0, 10) !== endDate) throw new Error("invalid_date_range");
  if (rule.weekdays.length === 0 || new Set(rule.weekdays).size !== rule.weekdays.length || rule.weekdays.some((day) => !Number.isInteger(day) || day < 1 || day > 7)) throw new Error("invalid_weekdays");
  const everyWeeks = rule.everyWeeks ?? 1;
  if (!Number.isInteger(everyWeeks) || everyWeeks < 1 || everyWeeks > 52) throw new Error("invalid_interval");
  const selected = new Set(rule.weekdays);
  const firstOccurrence = new Date(start);
  while (firstOccurrence <= end && !selected.has(firstOccurrence.getUTCDay() || 7)) firstOccurrence.setUTCDate(firstOccurrence.getUTCDate() + 1);
  if (firstOccurrence > end) return [];
  const monday = new Date(start);
  monday.setTime(firstOccurrence.getTime());
  monday.setUTCDate(monday.getUTCDate() - ((monday.getUTCDay() + 6) % 7));
  const dates: string[] = [];
  for (const day = new Date(firstOccurrence); day <= end; day.setUTCDate(day.getUTCDate() + 1)) {
    const weekday = day.getUTCDay() === 0 ? 7 : day.getUTCDay();
    const week = Math.floor((day.getTime() - monday.getTime()) / (7 * 24 * 60 * 60 * 1000));
    if (selected.has(weekday) && week % everyWeeks === 0) dates.push(day.toISOString().slice(0, 10));
  }
  return dates;
}
