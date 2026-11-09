import Link from "next/link";
import Shell from "@/components/Shell";
export default function NotFound() { return <Shell title="This page doesn't exist" intro="The link may be old or mistyped."><p style={{ paddingBottom: 60 }}><Link className="pill" href="/">Go to the home page</Link></p></Shell>; }
