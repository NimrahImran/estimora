import type { Metadata } from "next";
import Shell from "@/components/Shell";
import Dashboard from "@/components/Dashboard";
import { meta, sales } from "@/lib/data";
import { num } from "@/lib/format";
export const metadata: Metadata = { title: "Dashboard" };
export default function Page() {
  const c = meta.cleaning;
  return (
    <Shell title="Sales dashboard" intro="Filter 17 years of New York City sales by borough, building type, and year. Every chart updates together.">
      <Dashboard boroughs={sales.boroughs} categories={sales.categories} />
      <section className="section"><div className="panel">
        <h3>How the data was cleaned</h3>
        <p className="sub">Many records are not real market sales, so they are removed before any chart is drawn.</p>
        <div className="table-wrap"><table><tbody>
          <tr><td>Records in the source file</td><td className="n">{num(c.rawRows)}</td></tr>
          <tr><td>Exact repeats removed</td><td className="n">−{num(c.duplicates)}</td></tr>
          <tr><td>$0 records removed (transfers, such as to family)</td><td className="n">−{num(c.zeroPrice)}</td></tr>
          <tr><td>Below $10,000 removed (not market prices)</td><td className="n">−{num(c.belowMinimum)}</td></tr>
          <tr><td><b>Sales used here</b></td><td className="n"><b>{num(c.cleanRows)}</b></td></tr>
        </tbody></table></div>
      </div></section>
    </Shell>
  );
}
