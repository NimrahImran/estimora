"use client";
import { useEffect, useRef, useState } from "react";

export const COLORS: Record<string, string> = { Manhattan: "#9B2C6E", Brooklyn: "#C58A12", Queens: "#0E8F7E", Bronx: "#D2553A", "Staten Island": "#3F74D9" };
export const CAT_COLORS = ["#9B2C6E", "#C58A12", "#0E8F7E", "#D2553A", "#3F74D9", "#7A6A73"];
const BASE = {
  paper_bgcolor: "rgba(0,0,0,0)", plot_bgcolor: "rgba(0,0,0,0)",
  font: { family: "Manrope, system-ui, sans-serif", size: 13, color: "#472D3B" },
  hoverlabel: { bgcolor: "#3F1029", bordercolor: "#3F1029", font: { color: "#fff", family: "Manrope, sans-serif", size: 13 } },
  legend: { orientation: "h", x: 0, y: 1.14, font: { size: 13 } },
  margin: { l: 58, r: 14, t: 34, b: 38 }, hovermode: "x unified",
  xaxis: { showgrid: false, linecolor: "#D9BFCB", fixedrange: true, tickcolor: "#D9BFCB" },
  yaxis: { gridcolor: "#F1E3E9", zeroline: false, fixedrange: true, automargin: true },
};

type P = { data: object[]; layout?: Record<string, unknown>; height?: number; file: string; label: string };
export default function Chart({ data, layout, height = 340, file, label }: P) {
  const el = useRef<HTMLDivElement>(null); const [failed, setFailed] = useState(false);
  useEffect(() => {
    let live = true; const node = el.current;
    import("plotly.js-cartesian-dist-min").then((m) => {
      if (!live || !node) return; const Plotly = (m.default ?? m) as PlotlyLib;
      const l = layout ?? {};
      Plotly.react(node, data, { ...BASE, height, ...l, xaxis: { ...BASE.xaxis, ...(l.xaxis as object) }, yaxis: { ...BASE.yaxis, ...(l.yaxis as object) }, margin: { ...BASE.margin, ...(l.margin as object) } }, {
        responsive: true, displaylogo: false, scrollZoom: false,
        modeBarButtons: [["toImage"]], toImageButtonOptions: { format: "png", filename: file, scale: 2 },
      });
    }).catch(() => live && setFailed(true));
    return () => { live = false; };
  }, [data, layout, height, file]);
  useEffect(() => { const node = el.current; return () => { import("plotly.js-cartesian-dist-min").then((m) => { if (node) ((m.default ?? m) as PlotlyLib).purge(node); }).catch(() => {}); }; }, []);
  if (failed) return <div className="state">This chart couldn't load. Refresh the page.</div>;
  return <div ref={el} className="chart" role="img" aria-label={label} style={{ minHeight: height }} />;
}
type PlotlyLib = { react: (n: HTMLElement, d: object[], l: object, c: object) => void; purge: (n: HTMLElement) => void };
