import type { Metadata } from "next";
import Shell from "@/components/Shell";
import ForecastExplorer from "@/components/ForecastExplorer";
import Upload from "@/components/Upload";
import Decisions from "@/components/Decisions";
export const metadata: Metadata = { title: "Forecast" };
export default function Page() {
  return (
    <Shell title="Three-month forecast" intro="The next three months after the data ends, tested against real sales before you see it.">
      <p className="note">The data ends in December 2019, so this forecast covers January to March 2020. It knows nothing about later events, including COVID-19. To see a current forecast, upload your own sales below.</p>
      <div style={{ marginTop: 18 }}><ForecastExplorer /></div>
      <section className="section" id="decisions"><h2>Decisions by borough</h2><p className="lede">Change compares January to March 2020 with the same months of 2019.</p><div style={{ marginTop: 22 }}><Decisions /></div></section>
      <section id="upload"><h2>Forecast your own sales</h2><p className="lede">Upload a CSV with a date column and a sales column, and get your next three months.</p><div style={{ marginTop: 22 }}><Upload /></div></section>
    </Shell>
  );
}
