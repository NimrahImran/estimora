import { ok } from "@/lib/api";
import { meta } from "@/lib/data";
export const GET = () => ok({ status: "ok", dataFrom: meta.range.start, dataTo: meta.range.end, cleanRows: meta.cleaning.cleanRows, emailConfigured: Boolean(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) }, false);
