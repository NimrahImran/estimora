import { fail, ok } from "@/lib/api";
import { monthRange, sales, validMonth } from "@/lib/data";
export function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const borough = q.get("borough") ?? "All", category = q.get("category") ?? "All", from = q.get("from"), to = q.get("to");
  const s = sales.series[`${borough}|${category}`];
  if (!s) return fail(`Unknown borough or category. Boroughs: All, ${sales.boroughs.join(", ")}. Categories: ${sales.categories.join(", ")}.`);
  if (!validMonth(from) || !validMonth(to)) return fail("Use YYYY-MM for from and to.");
  const [a, b] = monthRange(from, to);
  return ok({ borough, category, months: sales.months.slice(a, b), count: s.count.slice(a, b), valueThousands: s.value.slice(a, b), median: s.median.slice(a, b) });
}
