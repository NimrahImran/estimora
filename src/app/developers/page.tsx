import type { Metadata } from "next";
import Shell from "@/components/Shell";
export const metadata: Metadata = { title: "Developers" };
const EP = [
  ["GET", "/api/health", "Service status, data range, and whether email is configured."],
  ["GET", "/api/summary", "Cleaning report, headline numbers, and findings."],
  ["GET", "/api/sales?borough=Queens&category=Condos&from=2015-01&to=2019-12", "Monthly sales, value in thousands of dollars, and median price."],
  ["GET", "/api/compare?by=borough&metric=median&fromYear=2010&toYear=2019", "Yearly series by borough or building type."],
  ["GET", "/api/neighborhoods?borough=Brooklyn&limit=10", "Busiest neighborhoods, 2015 to 2019."],
  ["GET", "/api/forecast?area=All&target=count", "History, test results, three-month forecast, and decisions. target is count, median, or value."],
  ["POST", "/api/forecast/upload", "multipart form: file, dateColumn, valueColumn. Returns a three-month forecast for a CSV up to 4 MB."],
  ["POST", "/api/contact", "JSON: name, email, service, message. Sends the enquiry by Gmail."],
];
export default function Page() {
  return (
    <Shell title="For developers" intro="How Estimora is built, how the models are tested, and the API behind every chart.">
      <div className="stack">
        <div className="grid2">
          <div className="panel"><h3>Architecture</h3><div className="code" style={{ marginTop: 12 }}>{`Python pipeline (offline)
  raw sales → clean → aggregate
  → backtest models → JSON
        ↓
Next.js API routes (Vercel)
  validate → filter → cache
        ↓
React + Plotly dashboard`}</div>
            <p className="sub" style={{ marginTop: 12 }}>1.6 million rows are reduced offline, so each request reads small JSON files. That keeps responses fast on a serverless free tier.</p></div>
          <div className="panel"><h3>Model testing</h3><p className="sub">Three models compete for each of the 18 series: 6 areas and 3 targets.</p>
            <div className="table-wrap"><table><tbody>
              <tr><td>Candidates</td><td>Seasonal naive, Holt-Winters, SARIMA</td></tr>
              <tr><td>Method</td><td>Rolling 3-month windows, 8 origins</td></tr>
              <tr><td>Selection</td><td>Lowest MAPE on first 7 windows</td></tr>
              <tr><td>Reported test</td><td>Last window, Oct to Dec 2019</td></tr>
              <tr><td>Likely range</td><td>80th percentile of test error</td></tr>
            </tbody></table></div></div>
        </div>
        <div className="panel"><h3>API</h3><p className="sub">JSON responses. Errors return <code>{`{ "error": "message" }`}</code> with a 4xx or 5xx status.</p>
          <div style={{ marginTop: 14 }}>{EP.map(([m, p, d]) => <div className="ep" key={p}><em>{m}</em>{m === "GET" ? <a href={p} className="link"><code>{p}</code></a> : <code>{p}</code>}<p>{d}</p></div>)}</div></div>
        <div className="panel"><h3>Run it yourself</h3><div className="code" style={{ marginTop: 12 }}>{`git clone https://github.com/NimrahImran/estimora
cd estimora && npm install
npm run dev

# rebuild the data
pip install -r pipeline/requirements.txt
python pipeline/build_data.py <folder-of-sales-parquet>`}</div></div>
      </div>
    </Shell>
  );
}
