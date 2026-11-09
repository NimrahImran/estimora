"use client";
import { useMemo, useState } from "react";
import Chart, { CAT_COLORS, COLORS } from "./Chart";
import { useApi } from "@/lib/useApi";
import { num, pct, usd } from "@/lib/format";

type Sales = { months: string[]; count: number[]; valueThousands: number[]; median: (number | null)[] };
type Compare = { years: number[]; series: Record<string, (number | null)[]> };
type Hood = { name: string; borough: string; count: number; median: number; change: number | null };
type M = "count" | "value" | "median";
const LABEL: Record<M, string> = { count: "Sales", value: "Total value", median: "Typical price" };
const YEARS = Array.from({ length: 17 }, (_, i) => 2003 + i);
const MN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const scale = (m: M) => (m === "value" ? 1000 : 1);
const fmt = (m: M, v: number) => (m === "count" ? num(v) : usd(v));

function Status({ loading, error, retry, h = 300 }: { loading: boolean; error: string | null; retry: () => void; h?: number }) {
  return <div className="state" style={{ minHeight: h }}>{error ? <div>{error}<br /><button className="btn2" style={{ marginTop: 12 }} onClick={retry}>Try again</button></div> : loading ? "Loading data" : null}</div>;
}
export default function Dashboard({ boroughs, categories }: { boroughs: string[]; categories: string[] }) {
  const [b, setB] = useState("All"), [c, setC] = useState("All"), [from, setFrom] = useState(2003), [to, setTo] = useState(2019), [m, setM] = useState<M>("count");
  const s = useApi<Sales>(`/api/sales?borough=${encodeURIComponent(b)}&category=${encodeURIComponent(c)}&from=${from}-01&to=${to}-12`);
  const cb = useApi<Compare>(`/api/compare?by=borough&metric=${m}&filter=${encodeURIComponent(c)}&fromYear=${from}&toYear=${to}`);
  const cc = useApi<Compare>(`/api/compare?by=category&metric=${m}&filter=${encodeURIComponent(b)}&fromYear=${from}&toYear=${to}`);
  const h = useApi<{ neighborhoods: Hood[] }>(`/api/neighborhoods?borough=${encodeURIComponent(b)}&limit=10`);

  const view = useMemo(() => {
    if (!s.data) return null;
    const d = s.data, raw = m === "count" ? d.count : m === "value" ? d.valueThousands : d.median;
    const y = raw.map((v) => (v === null ? null : v * scale(m)));
    const roll = y.map((_, i) => { if (i < 11) return null; const w = y.slice(i - 11, i + 1).filter((v): v is number => v !== null); return w.length ? w.reduce((a, x) => a + x, 0) / w.length : null; });
    const x = d.months.map((v) => `${v}-01`);
    const sum = (a: number[]) => a.reduce((t, v) => t + v, 0);
    const meds = d.median.filter((v): v is number => v !== null);
    const mean = meds.length ? sum(meds) / meds.length : 0;
    const n = d.months.length, last = sum(d.count.slice(-12)), prev = sum(d.count.slice(-24, -12));
    const yrs = [...new Set(d.months.map((v) => v.slice(0, 4)))];
    const z = yrs.map((yr) => MN.map((_, i) => { const k = d.months.indexOf(`${yr}-${String(i + 1).padStart(2, "0")}`); return k < 0 ? null : d.count[k]; }));
    return { x, y, roll, sales: sum(d.count), value: sum(d.valueThousands) * 1000, mean, yoy: n >= 24 && prev ? (last / prev - 1) * 100 : null, yrs, z };
  }, [s.data, m]);

  const fixedTrend = useMemo(() => view ? [
    { x: view.x, y: view.y, type: "scatter", mode: "lines", name: `Monthly ${LABEL[m].toLowerCase()}`, line: { color: "#D9A9C2", width: 1.6 }, hovertemplate: m === "count" ? "%{y:,.0f}<extra>Month</extra>" : "$%{y:,.0f}<extra>Month</extra>" },
    { x: view.x, y: view.roll, type: "scatter", mode: "lines", name: "12-month average", line: { color: "#5E1B41", width: 2.6 }, connectgaps: false, hovertemplate: m === "count" ? "%{y:,.0f}<extra>12-mo avg</extra>" : "$%{y:,.0f}<extra>12-mo avg</extra>" },
  ] : [], [view, m]);
  const yFmt = useMemo(() => ({ yaxis: { tickprefix: m === "count" ? "" : "$", tickformat: "~s" }, xaxis: { type: "date", hoverformat: "%b %Y" } }), [m]);
  const lines = useMemo(() => cb.data ? Object.entries(cb.data.series).map(([n, v]) => ({ x: cb.data!.years, y: v.map((p) => p === null ? null : p * scale(m)), name: n, type: "scatter", mode: "lines+markers", marker: { size: 8, line: { color: "#fff", width: 2 } }, line: { color: COLORS[n], width: 2 }, hovertemplate: m === "count" ? "%{y:,.0f}" : "$%{y:,.0f}" })) : [], [cb.data, m]);
  const cats = useMemo(() => cc.data ? Object.entries(cc.data.series).map(([n, v], i) => { const nn = v.filter((p): p is number => p !== null); return { n, i, v: (m === "median" ? (nn.length ? nn.reduce((a, x) => a + x, 0) / nn.length : 0) : nn.reduce((a, x) => a + x, 0)) * scale(m) }; }).sort((a, b2) => a.v - b2.v) : [], [cc.data, m]);
  const catData = useMemo(() => [{ type: "bar", orientation: "h", x: cats.map((v) => v.v), y: cats.map((v) => v.n), marker: { color: "#8A4569" }, text: cats.map((v) => fmt(m, v.v)), textposition: "outside", textfont: { color: "#472D3B" }, cliponaxis: false, hovertemplate: "%{y}<extra></extra>" }], [cats, m]);
  const heat = useMemo(() => view ? [{ type: "heatmap", x: MN, y: view.yrs, z: view.z, colorscale: [[0, "#F8EEF2"], [0.5, "#B66A92"], [1, "#3F1029"]], xgap: 2, ygap: 2, colorbar: { thickness: 10, outlinewidth: 0 }, hovertemplate: "%{x} %{y}: %{z:,} sales<extra></extra>" }] : [], [view]);
  const hoodBars = useMemo(() => { const r = [...(h.data?.neighborhoods ?? [])].reverse(); return [{ type: "bar", orientation: "h", x: r.map((v) => v.count), y: r.map((v) => v.name), marker: { color: "#5E1B41" }, hovertemplate: "%{y}: %{x:,} sales<extra></extra>" }]; }, [h.data]);

  const download = () => {
    if (!s.data) return;
    const d = s.data; const csv = ["month,sales,total_value_usd,median_price_usd", ...d.months.map((mm, i) => `${mm},${d.count[i]},${d.valueThousands[i] * 1000},${d.median[i] ?? ""}`)].join("\n");
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" })); a.download = `estimora-${b}-${c}-${from}-${to}.csv`.replace(/\s+/g, "-").toLowerCase(); a.click(); URL.revokeObjectURL(a.href);
  };
  const reset = () => { setB("All"); setC("All"); setFrom(2003); setTo(2019); setM("count"); };

  return (
    <div className="stack" id="trends">
      <div className="panel"><div className="filters" style={{ marginBottom: 0 }}>
        <div className="field" style={{ flex: "1 1 160px" }}><label htmlFor="f-b">Borough</label><select id="f-b" className="input" value={b} onChange={(e) => setB(e.target.value)}><option value="All">All boroughs</option>{boroughs.map((x) => <option key={x}>{x}</option>)}</select></div>
        <div className="field" style={{ flex: "1 1 160px" }}><label htmlFor="f-c">Building type</label><select id="f-c" className="input" value={c} onChange={(e) => setC(e.target.value)}>{categories.map((x) => <option key={x} value={x}>{x === "All" ? "All building types" : x}</option>)}</select></div>
        <div className="field" style={{ flex: "1 1 100px" }}><label htmlFor="f-f">From</label><select id="f-f" className="input" value={from} onChange={(e) => { const v = +e.target.value; setFrom(v); if (v > to) setTo(v); }}>{YEARS.map((y) => <option key={y}>{y}</option>)}</select></div>
        <div className="field" style={{ flex: "1 1 100px" }}><label htmlFor="f-t">To</label><select id="f-t" className="input" value={to} onChange={(e) => { const v = +e.target.value; setTo(v); if (v < from) setFrom(v); }}>{YEARS.map((y) => <option key={y}>{y}</option>)}</select></div>
        <div className="field"><span>Show</span><div className="seg">{(Object.keys(LABEL) as M[]).map((k) => <button key={k} aria-pressed={m === k} onClick={() => setM(k)}>{LABEL[k]}</button>)}</div></div>
        <button className="btn2" onClick={reset}>Reset</button>
        <button className="btn2" onClick={download} disabled={!s.data}>Download CSV</button>
      </div></div>

      {view && <div className="kpis" style={{ marginBottom: 0 }}>
        <div className="kpi"><span>Sales</span><b>{num(view.sales)}</b><small>{from === to ? from : `${from} to ${to}`}</small></div>
        <div className="kpi"><span>Total value</span><b>{usd(view.value)}</b><small>All selected sales</small></div>
        <div className="kpi"><span>Typical price</span><b>{usd(view.mean)}</b><small>Average of monthly medians</small></div>
        <div className="kpi"><span>Last 12 months</span><b>{view.yoy === null ? "n/a" : pct(view.yoy)}</b><small>Sales against the 12 before</small></div>
      </div>}

      <div className="panel"><h3>{LABEL[m]} over time</h3><p className="sub">The dark line smooths out month-to-month noise.</p>
        {view ? <Chart data={fixedTrend} layout={yFmt} height={360} file="estimora-trend" label={`${LABEL[m]} by month`} /> : <Status {...s} />}</div>

      <div className="grid2">
        <div className="panel"><h3>{LABEL[m]} by borough</h3><p className="sub">{m === "median" ? "Yearly average of monthly medians." : "Yearly totals."}</p>
          {cb.data ? <Chart data={lines} layout={{ yaxis: yFmt.yaxis, xaxis: { dtick: Math.max(1, Math.ceil((to - from) / 6)) }, legend: { orientation: "h", x: 0, y: 1.22 }, margin: { t: 54 } }} file="estimora-boroughs" label={`${LABEL[m]} per year by borough`} /> : <Status {...cb} />}</div>
        <div className="panel"><h3>{LABEL[m]} by building type</h3><p className="sub">{b === "All" ? "All boroughs" : b}, {from} to {to}.</p>
          {cc.data ? <Chart data={catData} layout={{ hovermode: "closest", xaxis: { visible: false }, yaxis: { gridcolor: "rgba(0,0,0,0)", ticksuffix: "  " }, margin: { l: 118, r: 66, t: 10, b: 10 }, showlegend: false }} file="estimora-building-types" label={`${LABEL[m]} by building type`} /> : <Status {...cc} />}</div>
      </div>

      <div className="panel"><h3>When sales happen</h3><p className="sub">Darker squares mean more sales in that month.</p>
        {view ? <Chart data={heat} layout={{ hovermode: "closest", xaxis: { side: "top", tickangle: 0, tickvals: MN, ticktext: typeof window !== "undefined" && window.innerWidth < 560 ? MN.map((v) => v[0]) : MN }, yaxis: { autorange: "reversed", type: "category", dtick: 2, gridcolor: "rgba(0,0,0,0)" }, margin: { t: 30, l: 48, b: 10, r: 8 } }} height={Math.max(220, view.yrs.length * 25 + 50)} file="estimora-seasonality" label="Heatmap of sales by month and year" /> : <Status {...s} />}</div>

      <div className="grid2">
        <div className="panel"><h3>Busiest neighborhoods</h3><p className="sub">Sales from 2015 to 2019. Not affected by the year or building filters.</p>
          {h.data ? <Chart data={hoodBars} layout={{ hovermode: "closest", xaxis: { tickformat: "~s" }, yaxis: { gridcolor: "rgba(0,0,0,0)", ticksuffix: "  " }, margin: { l: 150, t: 8, b: 30 }, showlegend: false }} height={390} file="estimora-neighborhoods" label="Top neighborhoods by number of sales" /> : <Status {...h} />}</div>
        <div className="panel"><h3>Neighborhood prices</h3><p className="sub">Typical price and its change from 2015 to 2019.</p>
          {h.data ? <div className="table-wrap"><table><thead><tr><th>Neighborhood</th><th className="n">Typical price</th><th className="n">Change</th></tr></thead><tbody>{h.data.neighborhoods.map((r) => <tr key={r.name + r.borough}><td>{r.name}</td><td className="n">{usd(r.median)}</td><td className="n">{r.change === null ? "n/a" : pct(r.change)}</td></tr>)}</tbody></table></div> : <Status {...h} />}</div>
      </div>
    </div>
  );
}
