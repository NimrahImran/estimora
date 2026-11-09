"use client";
import { useMemo, useState } from "react";
import Chart from "./Chart";
import { useApi } from "@/lib/useApi";
import { monthLabel, num, pct, usd } from "@/lib/format";

type D = { historyMonths: string[]; history: (number | null)[]; model: string; selection: Record<string, number>; holdout: Record<string, number>; holdoutMonths: string[]; holdoutActual: number[]; holdoutPredicted: number[]; months: string[]; forecast: number[]; low: number[]; high: number[]; changePct: number; bandPct: number };
type M = "count" | "value" | "median";
const LABEL: Record<M, string> = { count: "Sales", median: "Typical price", value: "Total value" };
const AREAS = ["All", "Manhattan", "Brooklyn", "Queens", "Bronx", "Staten Island"];
const d = (m: string) => `${m}-01`;
const NOTE: Record<string, string> = { "Seasonal naive": "Repeats the same month from last year", "Holt-Winters": "Tracks level, trend, and season", SARIMA: "Statistical model of trend and seasons" };

export default function ForecastExplorer() {
  const [area, setArea] = useState("All"), [t, setT] = useState<M>("count");
  const r = useApi<D>(`/api/forecast?area=${encodeURIComponent(area)}&target=${t}`);
  const s = t === "value" ? 1000 : 1, f = (v: number) => (t === "count" ? num(v) : usd(v * s));
  const data = useMemo(() => {
    if (!r.data) return [];
    const x = r.data, lastH = x.historyMonths[x.historyMonths.length - 1], lastV = x.history[x.history.length - 1];
    const fx = [lastH, ...x.months].map(d), hv = m(t);
    return [
      { x: x.months.map(d).concat([...x.months].reverse().map(d)), y: x.high.map((v) => v * s).concat([...x.low].reverse().map((v) => v * s)), fill: "toself", fillcolor: "rgba(197,138,18,.22)", line: { color: "rgba(0,0,0,0)" }, type: "scatter", name: "Likely range", hoverinfo: "skip" },
      { x: x.historyMonths.map(d), y: x.history.map((v) => (v === null ? null : v * s)), type: "scatter", mode: "lines", name: "Actual", line: { color: "#5E1B41", width: 2.2 }, hovertemplate: `${hv}%{y:,.0f}<extra>Actual</extra>` },
      { x: x.holdoutMonths.map(d), y: x.holdoutPredicted.map((v) => v * s), type: "scatter", mode: "lines+markers", name: "Test prediction", line: { color: "#0E8F7E", width: 2, dash: "dot" }, marker: { size: 8, line: { color: "#fff", width: 2 } }, hovertemplate: `${hv}%{y:,.0f}<extra>Test prediction</extra>` },
      { x: fx.slice(0, 2), y: [lastV === null ? null : lastV * s, x.forecast[0] * s], type: "scatter", mode: "lines", showlegend: false, hoverinfo: "skip", line: { color: "#C58A12", width: 2.6 } },
      { x: x.months.map(d), y: x.forecast.map((v) => v * s), type: "scatter", mode: "lines+markers", name: "Forecast", line: { color: "#C58A12", width: 2.6 }, marker: { size: 9, line: { color: "#fff", width: 2 } }, hovertemplate: `${hv}%{y:,.0f}<extra>Forecast</extra>` },
    ];
  }, [r.data, t, s]);
  const layout = useMemo(() => ({ yaxis: { tickprefix: t === "count" ? "" : "$", tickformat: "~s" }, xaxis: { type: "date", hoverformat: "%b %Y" }, legend: { orientation: "h", x: 0, y: 1.14 } }), [t]);
  const x = r.data, models = x ? Object.keys(x.holdout) : [];
  return (
    <div className="stack">
      <div className="panel"><div className="filters">
        <div className="field" style={{ flex: "1 1 180px", maxWidth: 280 }}><label htmlFor="fa">Area</label><select id="fa" className="input" value={area} onChange={(e) => setArea(e.target.value)}>{AREAS.map((a) => <option key={a} value={a}>{a === "All" ? "All of New York City" : a}</option>)}</select></div>
        <div className="field"><span>Forecast</span><div className="seg">{(Object.keys(LABEL) as M[]).map((k) => <button key={k} aria-pressed={t === k} onClick={() => setT(k)}>{LABEL[k]}</button>)}</div></div>
      </div>
        {x ? <Chart data={data} layout={layout} height={420} file={`estimora-forecast-${area}-${t}`.replace(/\s/g, "-")} label={`${LABEL[t]} history and forecast`} /> : <div className="state" style={{ minHeight: 420 }}>{r.error ? <div>{r.error}<br /><button className="btn2" style={{ marginTop: 12 }} onClick={r.retry}>Try again</button></div> : "Loading forecast"}</div>}
      </div>
      {x && <div className="grid2">
        <div className="panel"><h3>The next three months</h3><p className="sub">The likely range covers about 80% of past test errors.</p>
          <div className="table-wrap"><table><thead><tr><th>Month</th><th className="n">Forecast</th><th className="n">Likely range</th></tr></thead><tbody>{x.months.map((mo, i) => <tr key={mo}><td>{monthLabel(mo)}</td><td className="n">{f(x.forecast[i])}</td><td className="n">{f(x.low[i])} to {f(x.high[i])}</td></tr>)}</tbody></table></div>
          <p className="sub" style={{ marginTop: 12 }}>{t === "median" ? "Against the same months a year earlier" : "Three-month total against a year earlier"}: {pct(x.changePct)}.</p></div>
        <div className="panel"><h3>How accurate is it?</h3><p className="sub">Each model predicted October to December 2019 without seeing those months. Lower error is better.</p>
          <div className="table-wrap"><table><thead><tr><th>Model</th><th className="n">Error</th></tr></thead><tbody>{models.map((mo) => <tr key={mo}><td>{mo}{mo === x.model ? " (chosen)" : ""}<div className="sub" style={{ whiteSpace: "normal" }}>{NOTE[mo]}</div></td><td className="n">{x.holdout[mo].toFixed(1)}%</td></tr>)}</tbody></table></div>
          <p className="sub" style={{ marginTop: 12 }}>The model was chosen on earlier test periods, so these three months stayed unseen.{t === "value" ? " Total value swings with a few huge deals, so expect a wider error." : ""}</p></div>
      </div>}
    </div>
  );
}
const m = (t: M) => (t === "count" ? "" : "$");
