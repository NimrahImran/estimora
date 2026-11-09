import salesJson from "@/data/sales.json";
import metaJson from "@/data/meta.json";
import forecastJson from "@/data/forecast.json";
import hoodsJson from "@/data/neighborhoods.json";

export type Metric = "count" | "value" | "median";
export type Series = { count: number[]; value: number[]; median: (number | null)[] };
export type Sales = { months: string[]; boroughs: string[]; categories: string[]; series: Record<string, Series> };
export type Target = {
  model: string; selection: Record<string, number>; holdout: Record<string, number>;
  holdoutMonths: string[]; holdoutActual: number[]; holdoutPredicted: number[];
  months: string[]; forecast: number[]; low: number[]; high: number[]; lastYear: number[];
  changePct: number; bandPct: number;
};
export type Decision = { borough: string; tag: string; action: string; salesChange: number; priceChange: number; bandPct: number; withinErrorRange: boolean };
export type Hood = { name: string; borough: string; count: number; value: number; median: number; change: number | null };

export const sales = salesJson as unknown as Sales;
export const meta = metaJson;
export const forecast = forecastJson as unknown as { horizon: number; areas: string[]; targets: Record<string, Record<Metric, Target>>; decisions: Decision[] };
export const hoods = hoodsJson as unknown as Record<string, Hood[]>;
export const METRICS: Metric[] = ["count", "value", "median"];

export function monthRange(from?: string | null, to?: string | null) {
  const m = sales.months;
  const start = from ? m.findIndex((x) => x >= from) : 0;
  let end = m.length;
  if (to) { const i = m.findIndex((x) => x > to); if (i !== -1) end = i; }
  return [start === -1 ? m.length : start, end] as const;
}
export const validMonth = (v: string | null) => v === null || /^\d{4}-(0[1-9]|1[0-2])$/.test(v);
