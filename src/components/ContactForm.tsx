"use client";
import { FormEvent, useState } from "react";
const SERVICES = ["Sales dashboard", "Forecasting model", "AI automation or chatbot", "Data analysis", "Something else"];
const EMPTY = { name: "", email: "", service: "", message: "", company: "" };
export default function ContactForm() {
  const [v, setV] = useState(EMPTY), [errs, setErrs] = useState<Record<string, string>>({}), [state, setState] = useState<"idle" | "busy" | "sent">("idle"), [msg, setMsg] = useState<string | null>(null);
  const set = (k: keyof typeof EMPTY, x: string) => { setV((o) => ({ ...o, [k]: x })); setErrs((e) => ({ ...e, [k]: "" })); if (state === "sent") setState("idle"); };
  const submit = async (e: FormEvent) => {
    e.preventDefault(); setState("busy"); setMsg(null); setErrs({});
    try {
      const r = await fetch("/api/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(v) });
      const j = await r.json().catch(() => ({ error: "The server sent an unreadable reply. Try again." }));
      if (!r.ok) { setErrs(j.errors ?? {}); setMsg(j.error); setState("idle"); return; }
      setV(EMPTY); setState("sent");
    } catch { setMsg("Couldn't reach the server. Check your connection and try again."); setState("idle"); }
  };
  const f = (k: "name" | "email", label: string, type: string, auto: string, ph: string) => (
    <div className="field"><label htmlFor={k}>{label}</label><input id={k} className={`input${errs[k] ? " bad" : ""}`} type={type} autoComplete={auto} placeholder={ph} value={v[k]} onChange={(e) => set(k, e.target.value)} aria-invalid={!!errs[k]} aria-describedby={errs[k] ? `${k}-e` : undefined} />{errs[k] && <span id={`${k}-e`} className="err">{errs[k]}</span>}</div>
  );
  return (
    <form className="contact" onSubmit={submit} noValidate>
      <div className="two">{f("name", "Your name", "text", "name", "Sara Khan")}{f("email", "Your email", "email", "email", "sara@company.com")}</div>
      <div className="field"><label htmlFor="service">Service</label><select id="service" className={`input${errs.service ? " bad" : ""}`} value={v.service} onChange={(e) => set("service", e.target.value)} aria-invalid={!!errs.service}><option value="">Choose a service</option>{SERVICES.map((s) => <option key={s}>{s}</option>)}</select>{errs.service && <span className="err">{errs.service}</span>}</div>
      <div className="field"><label htmlFor="message">Message</label><textarea id="message" className={`input${errs.message ? " bad" : ""}`} rows={6} placeholder="What would you like to build?" value={v.message} onChange={(e) => set("message", e.target.value)} aria-invalid={!!errs.message} maxLength={3000} />{errs.message && <span className="err">{errs.message}</span>}</div>
      <input className="hp" tabIndex={-1} autoComplete="off" aria-hidden="true" value={v.company} onChange={(e) => set("company", e.target.value)} name="company" />
      {msg && <p className="bad-box" role="alert">{msg}</p>}
      {state === "sent" && <p className="ok" role="status">Message sent. You&apos;ll get a reply by email.</p>}
      <div><button className="pill" disabled={state === "busy"}>{state === "busy" ? "Sending" : "Send message"}</button></div>
    </form>
  );
}
