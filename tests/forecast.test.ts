import { describe, expect, it } from "vitest";
import { forecastMonthly, parseDate, parseNumber, toMonthly } from "@/lib/forecast";

describe("parseDate", () => {
  it("reads common formats", () => {
    expect(parseDate("2024-03-15")).toBe("2024-03-15");
    expect(parseDate("2024-03")).toBe("2024-03-01");
    expect(parseDate("3/15/2024")).toBe("2024-03-15");
    expect(parseDate("15/3/2024")).toBe("2024-03-15");
  });
  it("rejects values that are not dates", () => {
    expect(parseDate("garbage")).toBeNull();
    expect(parseDate("2024-13-01")).toBeNull();
    expect(parseDate("12345")).toBeNull();
  });
});

describe("parseNumber", () => {
  it("cleans currency text", () => {
    expect(parseNumber("$1,234.50")).toBe(1234.5);
    expect(parseNumber("(250)")).toBe(-250);
  });
  it("rejects empty and non-numeric text", () => {
    expect(parseNumber("")).toBeNull();
    expect(parseNumber("abc")).toBeNull();
  });
});

describe("toMonthly", () => {
  it("adds rows within a month and fills gaps with zero", () => {
    const { series, notes } = toMonthly([
      { date: "2024-01-05", value: 10 },
      { date: "2024-01-20", value: 5 },
      { date: "2024-03-25", value: 7 },
    ]);
    expect(series).toEqual([
      { month: "2024-01", value: 15 },
      { month: "2024-02", value: 0 },
      { month: "2024-03", value: 7 },
    ]);
    expect(notes[0]).toContain("1 month");
  });
});

const seasonal = (months: number) =>
  Array.from({ length: months }, (_, i) => {
    const d = new Date(Date.UTC(2018, i, 1));
    return { month: d.toISOString().slice(0, 7), value: 1000 + 5 * i + 200 * Math.sin((2 * Math.PI * i) / 12) };
  });

describe("forecastMonthly", () => {
  it("returns three future months with ordered ranges", () => {
    const r = forecastMonthly(seasonal(60));
    expect(r.forecast.map((p) => p.month)).toEqual(["2023-01", "2023-02", "2023-03"]);
    for (const p of r.forecast) {
      expect(p.low).toBeLessThanOrEqual(p.value);
      expect(p.high).toBeGreaterThanOrEqual(p.value);
    }
  });
  it("tracks a clean seasonal pattern closely", () => {
    const history = seasonal(63);
    const r = forecastMonthly(history.slice(0, 60));
    r.forecast.forEach((p, i) => expect(Math.abs(p.value - history[60 + i].value) / history[60 + i].value).toBeLessThan(0.1));
  });
  it("falls back to last year's pattern on short history", () => {
    const r = forecastMonthly(seasonal(18));
    expect(r.model).toBe("Seasonal naive");
    expect(r.notes.join(" ")).toContain("25 months");
  });
});
