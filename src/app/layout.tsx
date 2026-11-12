import type { Metadata, Viewport } from "next";
import "./globals.css";
export const metadata: Metadata = {
  metadataBase: new URL("https://estimora-analytics.vercel.app"),
  title: { default: "Estimora | NYC property sales and forecasts", template: "%s | Estimora" },
  description: "Explore 17 years of New York City property sales and forecast the next three months.",
  openGraph: {
    type: "website", siteName: "Estimora", url: "/", title: "Estimora | NYC property sales and forecasts",
    description: "See what sold, where prices are heading, and what to do next.",
    images: [{ url: "/og.jpg", width: 1200, height: 630, type: "image/jpeg", alt: "Estimora: Know the market before it moves" }],
  },
  twitter: { card: "summary_large_image", title: "Estimora | NYC property sales and forecasts", description: "See what sold, where prices are heading, and what to do next.", images: ["/og.jpg"] },
};
export const viewport: Viewport = { themeColor: "#5E1B41" };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
