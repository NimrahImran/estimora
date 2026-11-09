import Link from "next/link";
export default function Footer() {
  return (
    <footer className="foot"><div className="wrap">
      <div><b>Estimora</b><p>Built by Nimra Imran, AI Engineer. Data: New York City Department of Finance property sales, 2003 to 2019. Forecasts are estimates, not financial advice.</p></div>
      <nav aria-label="Footer"><Link href="/dashboard">Dashboard</Link><Link href="/forecast">Forecast</Link><Link href="/developers">Developers</Link><Link href="/about#contact">Contact</Link><a href="https://github.com/NimrahImran/estimora">GitHub</a></nav>
    </div></footer>
  );
}
