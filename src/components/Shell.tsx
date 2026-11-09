import Header from "./Header";
import Footer from "./Footer";
export default function Shell({ title, intro, children }: { title: string; intro: string; children: React.ReactNode }) {
  return (<><Header solid /><main className="wrap"><div className="page-head"><h1>{title}</h1><p>{intro}</p></div>{children}</main><Footer /></>);
}
