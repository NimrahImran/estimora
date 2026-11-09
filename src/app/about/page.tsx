import type { Metadata } from "next";
import Shell from "@/components/Shell";
import ContactForm from "@/components/ContactForm";
export const metadata: Metadata = { title: "About and contact" };
export default function Page() {
  return (
    <Shell title="About Estimora" intro="A sales dashboard and forecasting project built to turn raw records into decisions.">
      <div className="grid2">
        <div className="panel prose">
          <h3>Built by Nimra Imran</h3>
          <p>I&apos;m an AI Engineer who builds forecasting models, data dashboards, chatbots, and AI automation for businesses.</p>
          <p>Estimora takes about 1.6 million public property records, removes what isn&apos;t a real sale, tests three forecasting models, and explains the result in plain language.</p>
          <p>Have your own sales data? I can build this for your business.</p>
          <p><a href="https://github.com/NimrahImran/estimora">View the code on GitHub</a></p>
          <h3 style={{ marginTop: 24 }}>Data source</h3>
          <p>New York City Department of Finance sales records, 2003 to 2019, from a public cleaned copy of the official files. Estimora is an independent portfolio project and isn&apos;t affiliated with New York City.</p>
        </div>
        <div className="panel" id="contact"><h2 style={{ fontSize: 30 }}>Start a project</h2><p className="sub" style={{ marginBottom: 18 }}>Tell me what you need, and I&apos;ll reply by email.</p><ContactForm /></div>
      </div>
    </Shell>
  );
}
