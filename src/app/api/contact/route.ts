import nodemailer from "nodemailer";
import { NextResponse } from "next/server";
import { fail } from "@/lib/api";

export const runtime = "nodejs";
const SERVICES = ["Sales dashboard", "Forecasting model", "AI automation or chatbot", "Data analysis", "Something else"];
const hits = new Map<string, number[]>();
const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const clean = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export async function POST(req: Request) {
  let b: Record<string, unknown>;
  try { b = await req.json(); } catch { return fail("The form could not be read. Refresh the page and try again."); }
  if (clean(b.company, 100)) return NextResponse.json({ ok: true });
  const name = clean(b.name, 80).replace(/[\r\n]+/g, " "), email = clean(b.email, 120), service = clean(b.service, 60), message = clean(b.message, 3000);
  const errors: Record<string, string> = {};
  if (name.length < 2) errors.name = "Enter your name.";
  if (!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]{2,}$/.test(email)) errors.email = "Enter a valid email address.";
  if (!SERVICES.includes(service)) errors.service = "Choose a service.";
  if (message.length < 10) errors.message = "Write at least 10 characters.";
  if (Object.keys(errors).length) return NextResponse.json({ error: "Check the highlighted fields.", errors }, { status: 400 });

  const ip = (req.headers.get("x-forwarded-for") ?? "local").split(",")[0].trim(), now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < 3_600_000);
  if (recent.length >= 5) return fail("Too many messages in one hour. Try again later.", 429);

  const user = process.env.GMAIL_USER, pass = process.env.GMAIL_APP_PASSWORD?.replace(/\s/g, "");
  if (!user || !pass) return fail("The contact form isn't connected yet. Email nimrahimran28@gmail.com instead.", 503);
  try {
    const t = nodemailer.createTransport({ service: "gmail", auth: { user, pass } });
    await t.sendMail({
      from: `"Estimora contact form" <${user}>`, to: user, replyTo: `"${name.replace(/"/g, "")}" <${email}>`,
      subject: `New Estimora enquiry: ${service} from ${name}`,
      text: `Name: ${name}\nEmail: ${email}\nService: ${service}\n\n${message}`,
      html: `<div style="font-family:Arial,sans-serif;color:#33202B;max-width:560px"><h2 style="color:#5E1B41;margin:0 0 16px">New enquiry from Estimora</h2><p><b>Name:</b> ${esc(name)}</p><p><b>Email:</b> ${esc(email)}</p><p><b>Service:</b> ${esc(service)}</p><p><b>Message:</b></p><p style="white-space:pre-wrap;background:#F6E7EA;padding:14px;border-radius:8px">${esc(message)}</p></div>`,
    });
  } catch (e) {
    console.error("contact mail failed", e instanceof Error ? e.message : "unknown");
    return fail("The message couldn't be sent. Try again, or email nimrahimran28@gmail.com.", 502);
  }
  recent.push(now); hits.set(ip, recent);
  return NextResponse.json({ ok: true });
}
