import { fail, ok } from "@/lib/api";
import { hoods } from "@/lib/data";
export function GET(req: Request) {
  const q = new URL(req.url).searchParams; const b = q.get("borough") ?? "All"; const limit = Number(q.get("limit") ?? 10);
  if (!hoods[b]) return fail("Unknown borough.");
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) return fail("limit must be between 1 and 100.");
  return ok({ borough: b, period: "2015-2019", neighborhoods: hoods[b].slice(0, limit) });
}
