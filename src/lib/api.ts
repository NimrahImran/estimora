import { NextResponse } from "next/server";
export const fail = (error: string, status = 400) => NextResponse.json({ error }, { status });
export const ok = (data: unknown, cache = true) => NextResponse.json(data, cache ? { headers: { "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800" } } : undefined);
