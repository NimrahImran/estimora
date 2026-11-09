import { fail, ok } from "@/lib/api";
import { Metric, METRICS, sales } from "@/lib/data";
export function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const by = q.get("by") ?? "borough", metric = (q.get("metric") ?? "count") as Metric, fixed = q.get("filter") ?? "All";
  const from = Number(q.get("fromYear") ?? 2003), to = Number(q.get("toYear") ?? 2019);
  if (by !== "borough" && by !== "category") return fail("by must be borough or category.");
  if (!METRICS.includes(metric)) return fail("metric must be count, value or median.");
  if (!Number.isInteger(from) || !Number.isInteger(to) || from > to) return fail("Check fromYear and toYear.");
  const names = by === "borough" ? sales.boroughs : sales.categories.filter((c) => c !== "All");
  const years = Array.from({ length: to - from + 1 }, (_, i) => from + i);
  const out: Record<string, (number | null)[]> = {};
  for (const n of names) {
    const s = sales.series[by === "borough" ? `${n}|${fixed}` : `${fixed}|${n}`];
    if (!s) return fail("Unknown filter.");
    out[n] = years.map((y) => {
      const idx = sales.months.flatMap((m, i) => (m.startsWith(`${y}-`) ? [i] : []));
      if (metric === "median") { const v = idx.flatMap((i) => (s.median[i] === null ? [] : [s.median[i] as number])); return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : null; }
      return idx.reduce((t, i) => t + s[metric][i], 0);
    });
  }
  return ok({ by, metric, years, series: out });
}
