import { forecast } from "@/lib/data";
import { pct } from "@/lib/format";
export default function Decisions() {
  return (
    <div className="dec">
      {forecast.decisions.map((d) => (
        <article key={d.borough}>
          <h3>{d.borough}</h3><span className="tag">{d.tag}</span>
          <p>{d.action}</p>
          <dl><div><dt>Sales</dt><dd>{pct(d.salesChange)}</dd></div><div><dt>Typical price</dt><dd>{pct(d.priceChange)}</dd></div></dl>
          {d.withinErrorRange && <p style={{ fontSize: 13, color: "#6A4A5B", fontWeight: 600 }}>Small change, inside the model&apos;s usual error of ±{d.bandPct.toFixed(0)}%.</p>}
        </article>
      ))}
    </div>
  );
}
