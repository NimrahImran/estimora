import type { Metadata, Viewport } from "next";
import "./globals.css";
export const metadata: Metadata = {
  metadataBase: new URL("https://estimora.vercel.app"),
  title: { default: "Estimora | NYC property sales and forecasts", template: "%s | Estimora" },
  description: "Explore 17 years of New York City property sales and forecast the next three months.",
  openGraph: { title: "Estimora", description: "See what sold, where prices are heading, and what to do next.", images: ["/hero-1440.webp"] },
};
export const viewport: Viewport = { themeColor: "#5E1B41" };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
