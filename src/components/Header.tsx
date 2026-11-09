"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import Logo from "./Logo";

const LINKS = [["/", "Home"], ["/dashboard", "Dashboard"], ["/forecast", "Forecast"], ["/developers", "Developers"], ["/about", "About"]];

export default function Header({ solid = false }: { solid?: boolean }) {
  const path = usePathname(); const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [path]);
  return (
    <header className={`nav${solid ? " solid" : ""}`}>
      <Link className="brand" href="/" aria-label="Estimora home"><Logo /><b>Estimora</b></Link>
      <nav id="site-links" className={`links${open ? " open" : ""}`} aria-label="Main">
        {LINKS.map(([href, label]) => <Link key={href} href={href} aria-current={path === href ? "page" : undefined}>{label}</Link>)}
      </nav>
      <div className="nav-actions">
        <Link className="pill" href="/about#contact">Contact us</Link>
        <button className="burger" aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} aria-controls="site-links" onClick={() => setOpen(!open)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">{open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}</svg>
        </button>
      </div>
    </header>
  );
}
