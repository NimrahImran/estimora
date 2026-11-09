"use client";
import Papa from "papaparse";
import { useMemo, useRef, useState } from "react";
import Chart from "./Chart";
import { monthLabel } from "@/lib/format";

type R = { history: { month: string; value: number }[]; forecast: { month: string; value: number; low: number; high: number }[]; model: string; holdoutError: number | null; baselineError: number | null; notes: string[]; rowsUsed: number };
const money = (v: number) => v.toLocaleString("en-US", { maximumFractionDigits: 2 });
export default function Upload() {
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null), [cols, setCols] = useState<string[]>([]), [dc, setDc] = useState(""), [vc, setVc] = useState("");
  const [busy, setBusy] = useState(false), [err, setErr] = useState<string | null>(null), [res, setRes] = useState<R | null>(null);
  const choose = (f?: File) => {
    setErr(null); setRes(null); if (!f) return;
    if (!/\.csv$/i.test(f.name)) { setFile(null); setCols([]); return setErr("Choose a file that ends in .csv."); }
    if (f.size > 4 * 1024 * 1024) { setFile(null); setCols([]); return setErr("That file is larger than 4 MB. Group it by day or month and try again."); }
    Papa.parse<string[]>(f, { preview: 1, complete: (r) => {
      const h = (r.data[0] ?? []).map((x) => String(x).trim()).filter(Boolean);
      if (h.length < 2) { setFile(null); setCols([]); return setErr("The file needs at least a date column and a sales column."); }
      setFile(f); setCols(h); setDc(h.find((x) => /date|month|time|period/i.test(x)) ?? h[0]);
      setVc(h.find((x) => /sale|revenue|amount|total|value|price/i.test(x) && !/date/i.test(x)) ?? h.find((x) => !/date|month|time|period/i.test(x)) ?? h[1]);
    }, error: () => setErr("That file couldn't be read.") });
  };
  const send = async () => {
    if (!file) return; setBusy(true); setErr(null); setRes(null);
    const f = new FormData(); f.set("file", file); f.set("dateColumn", dc); f.set("valueColumn", vc);
    try { const r = await fetch("/api/forecast/upload", { method: "POST", body: f }); const j = await r.json().catch(() => ({ error: "The server sent an unreadable reply. Try again." })); if (!r.ok) throw new Error(j.error); setRes(j); }
    catch (e) { setErr(e instanceof Error && e.message !== "Failed to fetch" ? e.message : "Couldn't reach the server. Check your connection and try again."); }
    finally { setBusy(false); }
  };
  const data = useMemo(() => {
    if (!res) return []; const h = res.history.slice(-36), f = res.forecast, d = (m: string) => `${m}-01`, l = h[h.length - 1];
    return [
      { x: f.map((p) => d(p.month)).concat([...f].reverse().map((p) => d(p.month))), y: f.map((p) => p.high).concat([...f].reverse().map((p) => p.low)), fill: "toself", fillcolor: "rgba(197,138,18,.22)", line: { color: "rgba(0,0,0,0)" }, type: "scatter", name: "Likely range", hoverinfo: "skip" },
      { x: h.map((p) => d(p.month)), y: h.map((p) => p.value), type: "scatter", mode: "lines", name: "Your sales", line: { color: "#5E1B41", width: 2.2 }, hovertemplate: "%{y:,.2f}<extra>Your sales</extra>" },
      { x: [d(l.month), ...f.map((p) => d(p.month))], y: [l.value, ...f.map((p) => p.value)], type: "scatter", mode: "lines+markers", name: "Forecast", line: { color: "#C58A12", width: 2.6 }, marker: { size: 9, line: { color: "#fff", width: 2 } }, hovertemplate: "%{y:,.2f}<extra>Forecast</extra>" },
    ];
  }, [res]);
  const layout = useMemo(() => ({ xaxis: { type: "date", hoverformat: "%b %Y" }, yaxis: { tickformat: "~s" } }), []);
  const dl = () => { if (!res) return; const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([["month,forecast,low,high", ...res.forecast.map((p) => `${p.month},${p.value},${p.low},${p.high}`)].join("\n")], { type: "text/csv" })); a.download = "estimora-forecast.csv"; a.click(); URL.revokeObjectURL(a.href); };
  return (
    <div className="stack"><div className="panel">
      <div className="drop">
        <input ref={input} className="hp" type="file" accept=".csv,text/csv" tabIndex={-1} aria-label="Sales CSV file" onChange={(e) => { choose(e.target.files?.[0]); e.target.value = ""; }} />
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" }}>
          <button className="pill" onClick={() => input.current?.click()}>Choose a CSV file</button>
          <a className="link" href="/sample-sales.csv" download>Download a sample file</a>
        </div>
        <p className="sub">{file ? <>Selected: <b>{file.name}</b></> : "CSV only, up to 4 MB, with at least 15 months of sales."}</p>
      </div>
      {cols.length > 0 && <div className="filters" style={{ marginTop: 16, marginBottom: 0 }}>
        <div className="field" style={{ flex: "1 1 180px" }}><label htmlFor="dc">Date column</label><select id="dc" className="input" value={dc} onChange={(e) => setDc(e.target.value)}>{cols.map((c) => <option key={c}>{c}</option>)}</select></div>
        <div className="field" style={{ flex: "1 1 180px" }}><label htmlFor="vc">Sales column</label><select id="vc" className="input" value={vc} onChange={(e) => setVc(e.target.value)}>{cols.map((c) => <option key={c}>{c}</option>)}</select></div>
        <button className="pill" onClick={send} disabled={busy}>{busy ? "Forecasting" : "Forecast my sales"}</button>
      </div>}
      {err && <p className="bad-box" role="alert" style={{ marginTop: 14 }}>{err}</p>}
    </div>
    {res && <div className="panel" aria-live="polite">
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 10 }}><div><h3>Your next three months</h3><p className="sub">{res.rowsUsed.toLocaleString("en-US")} rows used. Model: {res.model}.{res.holdoutError !== null ? ` Test error: ${res.holdoutError.toFixed(1)}%.` : ""}</p></div><button className="btn2" onClick={dl}>Download forecast</button></div>
      <Chart data={data} layout={layout} height={340} file="estimora-your-forecast" label="Your sales history and forecast" />
      <div className="table-wrap"><table><thead><tr><th>Month</th><th className="n">Forecast</th><th className="n">Likely range</th></tr></thead><tbody>{res.forecast.map((p) => <tr key={p.month}><td>{monthLabel(p.month)}</td><td className="n">{money(p.value)}</td><td className="n">{money(p.low)} to {money(p.high)}</td></tr>)}</tbody></table></div>
      {res.notes.map((n) => <p key={n} className="sub" style={{ marginTop: 8 }}>{n}</p>)}
    </div>}</div>
  );
}
