import { fail, ok } from "@/lib/api";
import { forecast, Metric, METRICS, sales } from "@/lib/data";
export function GET(req: Request) {
  const q = new URL(req.url).searchParams; const area = q.get("area") ?? "All", target = (q.get("target") ?? "count") as Metric;
  if (!forecast.targets[area]) return fail(`area must be one of: ${forecast.areas.join(", ")}.`);
  if (!METRICS.includes(target)) return fail("target must be count, value or median.");
  const s = sales.series[`${area}|All`][target], n = sales.months.length;
  return ok({ area, target, historyMonths: sales.months.slice(n - 48), history: s.slice(n - 48), ...forecast.targets[area][target], decisions: forecast.decisions });
}
