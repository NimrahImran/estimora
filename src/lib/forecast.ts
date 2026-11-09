export type Point = { month: string; value: number };
export type UploadResult = {
  history: Point[]; forecast: { month: string; value: number; low: number; high: number }[];
  model: string; holdoutError: number | null; baselineError: number | null; notes: string[]; aggregation: string;
};

const S = 12;
const nextMonth = (m: string, n = 1) => {
  const d = new Date(Date.UTC(Number(m.slice(0, 4)), Number(m.slice(5, 7)) - 1 + n, 1));
  return d.toISOString().slice(0, 7);
};

export function parseDate(raw: string): string | null {
  const v = raw.trim();
  let m = v.match(/^(\d{4})[-/.](\d{1,2})(?:[-/.](\d{1,2}))?/);
  if (m) return valid(+m[1], +m[2], m[3] ? +m[3] : 1);
  m = v.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})/);
  if (m) { const mo = +m[1] > 12 ? +m[2] : +m[1]; const da = +m[1] > 12 ? +m[1] : +m[2]; return valid(+m[3], mo, da); }
  if (!/[a-z]/i.test(v)) return null;
  const t = Date.parse(v);
  if (Number.isNaN(t)) return null;
  const d = new Date(t);
  return valid(d.getFullYear(), d.getMonth() + 1, d.getDate());
}
function valid(y: number, m: number, d: number) {
  if (y < 1900 || y > 2100 || m < 1 || m > 12 || d < 1 || d > 31) return null;
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}
export function parseNumber(raw: string): number | null {
  const v = raw.replace(/[$€£₨,\s]/g, "").replace(/^\((.*)\)$/, "-$1");
  if (v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export function toMonthly(rows: { date: string; value: number }[]) {
  const totals = new Map<string, number>(); let lastDay = "";
  for (const r of rows) { const k = r.date.slice(0, 7); totals.set(k, (totals.get(k) ?? 0) + r.value); if (r.date > lastDay) lastDay = r.date; }
  const keys = [...totals.keys()].sort(); const notes: string[] = [];
  let series: Point[] = []; let filled = 0;
  for (let m = keys[0]; m <= keys[keys.length - 1]; m = nextMonth(m)) {
    if (!totals.has(m)) filled++;
    series.push({ month: m, value: totals.get(m) ?? 0 });
  }
  if (filled) notes.push(`${filled} month(s) had no rows and were counted as zero.`);
  const dailyRows = rows.length > keys.length * 2;
  if (dailyRows && Number(lastDay.slice(8, 10)) < 20) { series = series.slice(0, -1); notes.push(`The last month looked incomplete, so it was left out.`); }
  return { series, notes };
}

function holtWinters(y: number[], a: number, b: number, g: number, h: number, phi = 0.95) {
  const n = y.length; const first = y.slice(0, S), second = y.slice(S, 2 * S);
  const m1 = mean(first), m2 = mean(second);
  let level = m1, trend = (m2 - m1) / S;
  const season = first.map((v) => v - m1);
  let sse = 0;
  for (let t = S; t < n; t++) {
    const s = season[t % S]; const fit = level + phi * trend + s; sse += (y[t] - fit) ** 2;
    const l = a * (y[t] - s) + (1 - a) * (level + phi * trend);
    trend = b * (l - level) + (1 - b) * phi * trend; level = l;
    season[t % S] = g * (y[t] - level) + (1 - g) * s;
  }
  const out: number[] = []; let d = 0, p = phi;
  for (let i = 1; i <= h; i++) { d += p; p *= phi; out.push(level + d * trend + season[(n + i - 1) % S]); }
  return { out, rmse: Math.sqrt(sse / Math.max(1, n - S)) };
}
const mean = (v: number[]) => v.reduce((x, y) => x + y, 0) / v.length;
function fit(y: number[], h: number) {
  let best = { out: [] as number[], rmse: Infinity };
  for (const a of [0.1, 0.3, 0.5, 0.8]) for (const b of [0.01, 0.1, 0.3]) for (const g of [0.1, 0.3, 0.5]) {
    const r = holtWinters(y, a, b, g, h); if (r.rmse < best.rmse) best = r;
  }
  return best;
}
const naive = (y: number[], h: number) => Array.from({ length: h }, (_, i) => y[y.length - S + i]);
function mape(a: number[], p: number[]) {
  const e = a.flatMap((v, i) => (v === 0 ? [] : [Math.abs((v - p[i]) / v)]));
  return e.length ? (mean(e) * 100) : null;
}

export function forecastMonthly(history: Point[], h = 3): UploadResult {
  const y = history.map((p) => p.value); const notes: string[] = [];
  const train = y.slice(0, -h), test = y.slice(-h);
  const canFit = train.length >= 2 * S + 1;
  const hw = canFit ? fit(train, h) : null;
  const baseE = mape(test, naive(train, h)); const hwE = hw ? mape(test, hw.out) : null;
  const useHw = hw !== null && hwE !== null && (baseE === null || hwE <= baseE);
  const final = useHw ? fit(y, h) : null;
  const out = final ? final.out : naive(y, h);
  const err = useHw ? hwE : baseE;
  const band = Math.max(0.05, Math.min(0.6, ((err ?? 15) / 100) * 1.3));
  const last = history[history.length - 1].month;
  if (!canFit) notes.push("At least 25 months of history unlocks the seasonal model. This forecast repeats last year's pattern.");
  return {
    history, model: useHw ? "Holt-Winters" : "Seasonal naive", holdoutError: err === null ? null : round(err), baselineError: baseE === null ? null : round(baseE), aggregation: "monthly total", notes,
    forecast: out.map((v, i) => { const value = Math.max(0, v); return { month: nextMonth(last, i + 1), value: round(value), low: round(Math.max(0, value * (1 - band))), high: round(value * (1 + band)) }; }),
  };
}
const round = (v: number) => Math.round(v * 100) / 100;
