import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import Decisions from "@/components/Decisions";
import { meta } from "@/lib/data";
import { monthName, num, pct, usd } from "@/lib/format";

const ic = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" } as const;
export default function Home() {
  const k = meta.kpis, i = meta.insights;
  const rows = Object.entries(meta.byBoroughYear);
  return (
    <>
      <section className="hero">
        <img className="hero-photo" src="/hero.webp" srcSet="/hero-1440.webp 1440w, /hero.webp 2880w" sizes="100vw" fetchPriority="high" alt="A modern two-story house with warm lights at dusk" />
        <div className="hero-veil" /><div className="corner" />
        <Header />
        <div className="body">
          <p className="kicker">New York City property sales</p>
          <h1>Know the market <span>before it moves</span></h1>
          <p className="lede">See what sold, where prices are heading, and what to do about it over the next three months.</p>
          <div className="cta">
            <Link className="pill" href="/forecast">View the forecast</Link>
            <Link className="ghost" href="/forecast#upload"><svg viewBox="0 0 24 24" {...ic} strokeWidth={2} aria-hidden="true"><path d="M12 16V5M7 10l5-5 5 5M5 19h14" /></svg>Upload your sales file</Link>
          </div>
        </div>
        <nav className="steps" aria-label="What Estimora does">
          <Link href="/dashboard"><i><svg viewBox="0 0 32 32" {...ic} aria-hidden="true"><circle cx="14" cy="14" r="9" /><path d="M21 21l7 7M10 17v-3M14 17v-7M18 17v-5" /></svg></i><span><b>Explore past sales</b><small>What sold, and for how much</small></span></Link>
          <Link href="/dashboard#trends"><i><svg viewBox="0 0 32 32" {...ic} aria-hidden="true"><rect x="4" y="5" width="24" height="22" rx="3" /><path d="M4 12h24M10 22v-5M16 22v-7M22 22v-3" /></svg></i><span><b>Compare boroughs</b><small>Prices across all five</small></span></Link>
          <Link href="/forecast"><i><svg viewBox="0 0 32 32" {...ic} aria-hidden="true"><path d="M4 25l7-8 6 4 11-13" /><path d="M21 8h7v7" /></svg></i><span><b>Forecast three months</b><small>Where sales go next</small></span></Link>
        </nav>
        <a className="scroll" href="#overview">Scroll down<svg viewBox="0 0 20 30" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><rect x="2" y="1" width="16" height="28" rx="8" /><path d="M10 8v6" strokeLinecap="round" /></svg></a>
      </section>
      <main>
        <section className="section wrap" id="overview">
          <div className="stat-line">
            <div>
              <p className="big-num">{num(k.sales)}</p>
              <h2 style={{ marginTop: 12 }}>real property sales, cleaned and ready to read</h2>
              <p className="lede">January 2003 to December 2019, worth {usd(k.value * 1000)} in total.</p>
              <div className="cta"><Link className="pill" href="/dashboard">Open the dashboard</Link></div>
            </div>
            <div>
              <h3>What 17 years of sales show</h3>
              <ul className="findings">
                <li><b>{monthName(i.busiestMonth)} is the busiest month</b>, about {(i.busiestIndex - 100).toFixed(0)}% above an average month. {monthName(i.quietMonth)} is the quietest.</li>
                <li><b>Sales peaked in {i.peakYear}</b> at {num(i.peakSales)}, then fell to {num(i.lowSales)} in {i.lowYear}.</li>
                <li><b>{i.topBorough} took {i.topBoroughShare.toFixed(0)}% of all money</b> spent in {k.lastYear}.</li>
                <li><b>The typical sale in {k.lastYear} was {usd(k.lastYearMedian)}</b>, {pct(k.medianYoY)} on the year before.</li>
              </ul>
            </div>
          </div>
        </section>
        <section className="wrap"><div className="panel">
          <h3>Boroughs in {k.lastYear}</h3>
          <div className="table-wrap"><table><thead><tr><th>Borough</th><th className="n">Sales</th><th className="n">Total value</th><th className="n">Typical price</th></tr></thead>
            <tbody>{rows.map(([b, r]) => <tr key={b}><td>{b}</td><td className="n">{num(r.sales)}</td><td className="n">{usd(r.value * 1000)}</td><td className="n">{usd(r.median)}</td></tr>)}</tbody></table></div>
        </div></section>
        <section className="section wrap">
          <h2>What to do next</h2>
          <p className="lede">Each borough&apos;s next three months, turned into one plain decision.</p>
          <div style={{ marginTop: 24 }}><Decisions /></div>
        </section>
      </main>
      <Footer />
    </>
  );
}
