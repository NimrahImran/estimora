import Papa from "papaparse";
import { fail } from "@/lib/api";
import { forecastMonthly, parseDate, parseNumber, toMonthly } from "@/lib/forecast";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
const MAX = 4 * 1024 * 1024;

export async function POST(req: Request) {
  let form: FormData;
  try { form = await req.formData(); } catch { return fail("Send the file as multipart form data."); }
  const file = form.get("file"), dateColumn = String(form.get("dateColumn") ?? ""), valueColumn = String(form.get("valueColumn") ?? "");
  if (!(file instanceof File)) return fail("Choose a CSV file first.");
  if (file.size === 0) return fail("That file is empty.");
  if (file.size > MAX) return fail("That file is larger than 4 MB. Group it by day or month and upload it again.", 413);
  if (!dateColumn || !valueColumn) return fail("Choose the date column and the sales column.");
  if (dateColumn === valueColumn) return fail("The date column and the sales column must be different.");
  const parsed = Papa.parse<Record<string, string>>(await file.text(), { header: true, skipEmptyLines: true });
  const fields = parsed.meta.fields ?? [];
  if (!fields.includes(dateColumn) || !fields.includes(valueColumn)) return fail("Those columns are not in this file.");
  const rows: { date: string; value: number }[] = []; let skipped = 0;
  for (const r of parsed.data) {
    const date = parseDate(String(r[dateColumn] ?? "")), value = parseNumber(String(r[valueColumn] ?? ""));
    if (date === null || value === null) skipped++; else rows.push({ date, value });
  }
  if (rows.length === 0) return fail("No usable rows found. Check that the columns hold dates and numbers.", 422);
  const { series, notes } = toMonthly(rows);
  if (series.length < 15) return fail(`This file covers ${series.length} month(s). A forecast needs at least 15 months of sales.`, 422);
  if (series.length > 600) return fail("This file covers more than 50 years. Upload a shorter period.", 422);
  const result = forecastMonthly(series);
  if (skipped) result.notes.unshift(`${skipped.toLocaleString("en-US")} row(s) were skipped because the date or number could not be read.`);
  result.notes.push(...notes);
  return NextResponse.json({ ...result, rowsUsed: rows.length });
}
