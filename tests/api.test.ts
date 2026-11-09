import { afterEach, describe, expect, it } from "vitest";
import { GET as compare } from "@/app/api/compare/route";
import { POST as contact } from "@/app/api/contact/route";
import { GET as forecast } from "@/app/api/forecast/route";
import { POST as upload } from "@/app/api/forecast/upload/route";
import { GET as health } from "@/app/api/health/route";
import { GET as neighborhoods } from "@/app/api/neighborhoods/route";
import { GET as sales } from "@/app/api/sales/route";

const get = (path: string) => new Request(`http://test${path}`);
const post = (body: string) => new Request("http://test/api/contact", { method: "POST", body, headers: { "Content-Type": "application/json", "x-forwarded-for": `10.0.0.${Math.floor(Math.random() * 250)}` } });
const valid = { name: "Sara Khan", email: "sara@company.com", service: "Data analysis", message: "I need a forecast for my shop." };

function csv(text: string, dateColumn = "date", valueColumn = "sales") {
  const form = new FormData();
  form.set("file", new File([text], "sales.csv", { type: "text/csv" }));
  form.set("dateColumn", dateColumn);
  form.set("valueColumn", valueColumn);
  return new Request("http://test/api/forecast/upload", { method: "POST", body: form });
}
const months = (n: number) => ["date,sales", ...Array.from({ length: n }, (_, i) => `${new Date(Date.UTC(2020, i, 1)).toISOString().slice(0, 10)},${100 + i}`)].join("\n");

afterEach(() => { delete process.env.GMAIL_USER; delete process.env.GMAIL_APP_PASSWORD; });

describe("data endpoints", () => {
  it("reports health", async () => {
    const body = await health().json();
    expect(body).toMatchObject({ status: "ok", dataFrom: "2003-01", dataTo: "2019-12", emailConfigured: false });
  });
  it("filters sales by month range", async () => {
    const body = await sales(get("/api/sales?borough=Queens&category=Condos&from=2019-01&to=2019-12")).json();
    expect(body.months).toHaveLength(12);
    expect(body.count).toHaveLength(12);
  });
  it("rejects bad sales filters", async () => {
    expect(sales(get("/api/sales?borough=Nope")).status).toBe(400);
    expect(sales(get("/api/sales?from=2019")).status).toBe(400);
  });
  it("compares boroughs by year", async () => {
    const body = await compare(get("/api/compare?by=borough&metric=count&fromYear=2018&toYear=2019")).json();
    expect(body.years).toEqual([2018, 2019]);
    expect(Object.keys(body.series)).toHaveLength(5);
  });
  it("limits neighborhoods", async () => {
    const body = await neighborhoods(get("/api/neighborhoods?borough=Brooklyn&limit=3")).json();
    expect(body.neighborhoods).toHaveLength(3);
    expect(neighborhoods(get("/api/neighborhoods?limit=999")).status).toBe(400);
  });
  it("returns a three-month forecast", async () => {
    const body = await forecast(get("/api/forecast?area=All&target=count")).json();
    expect(body.months).toEqual(["2020-01", "2020-02", "2020-03"]);
    expect(forecast(get("/api/forecast?area=Nope")).status).toBe(400);
  });
});

describe("CSV upload", () => {
  it("forecasts a valid file", async () => {
    const res = await upload(csv(months(36)));
    expect(res.status).toBe(200);
    expect((await res.json()).forecast).toHaveLength(3);
  });
  it("rejects a short history", async () => {
    expect((await upload(csv(months(6)))).status).toBe(422);
  });
  it("rejects unknown columns", async () => {
    expect((await upload(csv(months(36), "date", "missing"))).status).toBe(400);
  });
});

describe("contact form", () => {
  it("reports each invalid field", async () => {
    const res = await contact(post(JSON.stringify({ name: "", email: "x", service: "", message: "" })));
    expect(res.status).toBe(400);
    expect(Object.keys((await res.json()).errors)).toEqual(["name", "email", "service", "message"]);
  });
  it("rejects broken JSON", async () => {
    expect((await contact(post("{bad"))).status).toBe(400);
  });
  it("quietly accepts bot submissions without sending", async () => {
    const res = await contact(post(JSON.stringify({ ...valid, company: "spam" })));
    expect(await res.json()).toEqual({ ok: true });
  });
  it("explains when email is not configured", async () => {
    expect((await contact(post(JSON.stringify(valid)))).status).toBe(503);
  });
});
