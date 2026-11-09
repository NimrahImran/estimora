"use client";
export default function Error({ reset }: { reset: () => void }) {
  return <main className="wrap"><div className="page-head"><h1>This page didn&apos;t load</h1><p>Try loading it again.</p><p style={{ marginTop: 20 }}><button className="pill" onClick={reset}>Try again</button></p></div></main>;
}
