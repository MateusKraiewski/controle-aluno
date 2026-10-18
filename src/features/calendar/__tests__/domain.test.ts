import { describe, expect, it } from "vitest";
import { generateWeeklyDates, intervalsOverlap } from "../domain";

describe("intervalos da agenda", () => {
  it("permite várias aulas no mesmo dia quando os horários não se cruzam", () => {
    expect(intervalsOverlap({ startsAt: "08:00", endsAt: "09:00" }, { startsAt: "09:00", endsAt: "10:30" })).toBe(false);
  });

  it("identifica sobreposição parcial e aula contida", () => {
    expect(intervalsOverlap({ startsAt: "08:00", endsAt: "10:00" }, { startsAt: "09:30", endsAt: "10:30" })).toBe(true);
    expect(intervalsOverlap({ startsAt: "08:00", endsAt: "11:00" }, { startsAt: "09:00", endsAt: "10:00" })).toBe(true);
  });

  it("rejeita intervalos inválidos", () => {
    expect(() => intervalsOverlap({ startsAt: "13:00", endsAt: "13:00" }, { startsAt: "14:00", endsAt: "15:00" })).toThrow("invalid_time_interval");
    expect(() => intervalsOverlap({ startsAt: "25:00", endsAt: "26:00" }, { startsAt: "14:00", endsAt: "15:00" })).toThrow("invalid_time_format");
  });
});

describe("ocorrências semanais", () => {
  it("gera múltiplos dias da semana dentro dos limites civis informados", () => {
    expect(generateWeeklyDates({ startDate: "2026-10-19", endDate: "2026-10-26", weekdays: [1, 3] }))
      .toEqual(["2026-10-19", "2026-10-21", "2026-10-26"]);
  });

  it("gera semanas alternadas sem deslocamento de dia", () => {
    expect(generateWeeklyDates({ startDate: "2026-10-19", endDate: "2026-11-02", weekdays: [1, 4], everyWeeks: 2 }))
      .toEqual(["2026-10-19", "2026-10-22", "2026-11-02"]);
  });

  it("ancora a quinzena na primeira ocorrência possível após a data inicial", () => {
    expect(generateWeeklyDates({ startDate: "2026-10-20", endDate: "2026-11-10", weekdays: [1], everyWeeks: 2 }))
      .toEqual(["2026-10-26", "2026-11-09"]);
  });

  it("valida período, dias e intervalo de recorrência", () => {
    expect(() => generateWeeklyDates({ startDate: "2026-10-25", endDate: "2026-10-24", weekdays: [1] })).toThrow("invalid_date_range");
    expect(() => generateWeeklyDates({ startDate: "2026-10-19", endDate: "2026-10-26", weekdays: [0] })).toThrow("invalid_weekdays");
    expect(() => generateWeeklyDates({ startDate: "2026-10-19", endDate: "2026-10-26", weekdays: [1, 1] })).toThrow("invalid_weekdays");
    expect(() => generateWeeklyDates({ startDate: "2026-02-31", endDate: "2026-03-26", weekdays: [1] })).toThrow("invalid_date_range");
    expect(() => generateWeeklyDates({ startDate: "2026-10-19", endDate: "2026-10-26", weekdays: [1], everyWeeks: 0 })).toThrow("invalid_interval");
  });
});
