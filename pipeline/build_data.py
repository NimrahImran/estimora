"""Estimora data pipeline: clean NYC sales, build dashboard aggregates, backtest models, forecast 3 months.

Usage: python pipeline/build_data.py <path-to-parquet-folder>
"""
import json, re, sys, warnings
from pathlib import Path
import numpy as np, pandas as pd
from statsmodels.tsa.holtwinters import ExponentialSmoothing
from statsmodels.tsa.statespace.sarimax import SARIMAX

warnings.filterwarnings("ignore")
OUT = Path(__file__).resolve().parent.parent / "src" / "data"
H, MIN_PRICE, WINDOWS = 3, 10_000, 8
BOROUGHS = ["Manhattan", "Brooklyn", "Queens", "Bronx", "Staten Island"]


def category(raw: str) -> str:
    c = re.sub(r"^\d+\s*", "", str(raw).strip().upper())
    if "FAMILY" in c and "TAX" not in c:
        return "Family homes"
    if c.startswith("COOPS") or c.startswith("CONDOP") or c.startswith("CONDO COOP"):
        return "Co-ops"
    if c.startswith("COMMERCIAL CONDO") or "OFFICE" in c or "STORE" in c or "WAREHOUSE" in c or "FACTOR" in c or "COMMERCIAL GARAGE" in c or "HOTEL" in c:
        return "Commercial"
    if c.startswith("CONDO") or c == "TAX CLASS 1 CONDOS":
        return "Condos"
    if c.startswith("RENTALS"):
        return "Rental buildings"
    return "Other"


def clean(path):
    d = pd.read_parquet(path)
    report = {"rawRows": int(len(d))}
    d["date"] = pd.to_datetime(d["Sale Date"], errors="coerce")
    d = d[d["date"].notna() & d["Borough_Name"].isin(BOROUGHS)]
    keys = ["Borough", "Block", "Lot", "Apartment Number", "Sale Date", "Sale Price"]
    n = len(d); d = d.drop_duplicates(keys); report["duplicates"] = n - len(d)
    zero = int((d["Sale Price"] <= 0).sum()); low = int(((d["Sale Price"] > 0) & (d["Sale Price"] < MIN_PRICE)).sum())
    report["zeroPrice"], report["belowMinimum"] = zero, low
    d = d[d["Sale Price"] >= MIN_PRICE].copy()
    d["cat"] = d["Building Class Category"].map(category)
    d["month"] = d["date"].dt.to_period("M").dt.to_timestamp()
    d = d.rename(columns={"Sale Price": "price", "Borough_Name": "borough", "Neighborhood": "hood"})
    report["cleanRows"] = int(len(d))
    return d[["date", "month", "price", "borough", "hood", "cat"]], report


def aggregates(d):
    months = pd.date_range(d.month.min(), d.month.max(), freq="MS")
    cats = ["All"] + sorted(d.cat.unique())
    series = {}
    for b in ["All"] + BOROUGHS:
        for c in cats:
            s = d
            if b != "All": s = s[s.borough == b]
            if c != "All": s = s[s.cat == c]
            g = s.groupby("month").price.agg(["size", "sum", "median"]).reindex(months)
            series[f"{b}|{c}"] = {
                "count": g["size"].fillna(0).astype(int).tolist(),
                "value": (g["sum"].fillna(0) / 1e3).round().astype(np.int64).tolist(),
                "median": [None if pd.isna(x) else int(round(x)) for x in g["median"]],
            }
    return {"months": [m.strftime("%Y-%m") for m in months], "boroughs": BOROUGHS, "categories": cats, "series": series}


def title(x):
    name = re.sub(r"\s+", " ", str(x)).strip().title().replace("-", " ")
    return re.sub(r"\((\d+) (\d+)\)", r"(\1-\2)", name)


def change(early, late, hood):
    """Percent change, hidden when the building mix makes it meaningless."""
    if hood not in early or hood not in late:
        return None
    pct = round((late[hood] / early[hood] - 1) * 100, 1)
    return None if abs(pct) > 150 else pct


def neighborhoods(d):
    r = d[d.date.dt.year >= 2015]; out = {}
    for b in ["All"] + BOROUGHS:
        s = r if b == "All" else r[r.borough == b]
        g = s.groupby(["hood", "borough"]).price.agg(["size", "sum", "median"]).reset_index()
        g = g[g["size"] >= 200]
        early = s[s.date.dt.year == 2015].groupby("hood").price.median(); late = s[s.date.dt.year == 2019].groupby("hood").price.median()
        rows = [{"name": title(x.hood), "borough": x.borough, "count": int(x["size"]), "value": int(x["sum"] / 1e3), "median": int(x["median"]),
                 "change": change(early, late, x.hood)} for _, x in g.iterrows()]
        out[b] = sorted(rows, key=lambda x: -x["count"])
    return out


def seasonal_naive(y, h): return y.iloc[-12:-12 + h].values if h < 12 else y.iloc[-12:].values

def holt(y, h):
    f = ExponentialSmoothing(np.log(y), trend="add", damped_trend=True, seasonal="add", seasonal_periods=12, initialization_method="estimated").fit(optimized=True)
    return np.exp(f.forecast(h).values)

def sarima(y, h):
    f = SARIMAX(np.log(y), order=(1, 1, 1), seasonal_order=(0, 1, 1, 12), simple_differencing=False, enforce_stationarity=False, enforce_invertibility=False).fit(disp=False, maxiter=40, method="lbfgs")
    return np.exp(f.forecast(h).values)

MODELS = {"Seasonal naive": seasonal_naive, "Holt-Winters": holt, "SARIMA": sarima}

def mape(a, p): return float(np.mean(np.abs((a - p) / a)) * 100)


def evaluate(y):
    origins = [len(y) - H - 3 * i for i in range(WINDOWS - 1, -1, -1)]
    errors, preds = {m: [] for m in MODELS}, {}
    for o in origins:
        tr, te = y.iloc[:o], y.iloc[o:o + H]
        for m, fn in MODELS.items():
            try: p = fn(tr, H)
            except Exception: p = seasonal_naive(tr, H)
            errors[m].append((te.values, p))
            if o == origins[-1]: preds[m] = p
    # choose on earlier windows only; the final window stays an unseen holdout
    selection = {m: float(np.mean([mape(a, p) for a, p in e[:-1]])) for m, e in errors.items()}
    best = min(selection, key=selection.get)
    holdout = {m: mape(*e[-1]) for m, e in errors.items()}
    ape = np.concatenate([np.abs((a - p) / a) for a, p in errors[best]])
    band = float(np.quantile(ape, 0.8))
    return best, selection, holdout, band, preds[best]


def forecast(agg):
    months = pd.to_datetime(agg["months"]); out = {}; fm = pd.date_range(months[-1] + pd.offsets.MonthBegin(1), periods=H, freq="MS")
    for area in ["All"] + BOROUGHS:
        out[area] = {}
        for t in ["count", "median", "value"]:
            y = pd.Series(agg["series"][f"{area}|All"][t], index=months, dtype=float).asfreq("MS")
            best, sel, hold, band, hp = evaluate(y)
            try: p = MODELS[best](y, H)
            except Exception: p = seasonal_naive(y, H)
            band = max(band, 0.02)
            ly = y.iloc[-12:-12 + H].values
            out[area][t] = {"model": best, "selection": {k: round(v, 2) for k, v in sel.items()}, "holdout": {k: round(v, 2) for k, v in hold.items()},
                "holdoutMonths": [m.strftime("%Y-%m") for m in months[-H:]], "holdoutActual": [float(v) for v in y.iloc[-H:]], "holdoutPredicted": [round(float(v), 1) for v in hp],
                "months": [m.strftime("%Y-%m") for m in fm], "forecast": [round(float(v), 1) for v in p], "low": [round(float(v * (1 - band)), 1) for v in p], "high": [round(float(v * (1 + band)), 1) for v in p],
                "lastYear": [float(v) for v in ly], "changePct": round(float((p.sum() / ly.sum() - 1) * 100), 1), "bandPct": round(band * 100, 1)}
            print(area, t, best, sel[best], flush=True)
    return {"horizon": H, "areas": ["All"] + BOROUGHS, "targets": out}


def decisions(fc):
    out = []
    for b in BOROUGHS:
        c, m = fc["targets"][b]["count"], fc["targets"][b]["median"]
        dc, dm = c["changePct"], float((np.mean(m["forecast"]) / np.mean(m["lastYear"]) - 1) * 100)
        band = c["bandPct"]
        if dc >= 3 and dm >= 0: tag, act = "Grow", "Sales are expected to rise with prices holding. Add agents and listings here."
        elif dc >= 3: tag, act = "Push volume", "More deals are expected at softer prices. Focus on quick, fairly priced listings."
        elif dc <= -3 and dm >= 0: tag, act = "Be selective", "Fewer deals at firm prices. Prioritize higher-value listings over volume."
        elif dc <= -3: tag, act = "Hold back", "Sales and prices both look weaker. Hold new spending until demand returns."
        else: tag, act = "Maintain", "The market looks steady. Keep current staffing and listing plans."
        out.append({"borough": b, "tag": tag, "withinErrorRange": bool(abs(dc) < band), "action": act, "salesChange": round(dc, 1), "priceChange": round(dm, 1), "bandPct": band})
    return out


def summary(d, agg, report):
    s = agg["series"]["All|All"]; y = d.date.dt.year
    by_year = d.groupby(y).price.agg(["size", "sum", "median"])
    last = by_year.iloc[-1]; prev = by_year.iloc[-2]
    m = pd.Series(s["count"], index=pd.to_datetime(agg["months"])); idx = m.groupby(m.index.month).mean(); idx = idx / idx.mean() * 100
    peak_year = int(by_year["size"].idxmax()); low_year = int(by_year["size"].idxmin())
    bv = d[y == 2019].groupby("borough").price.sum().sort_values(ascending=False)
    return {"cleaning": report, "range": {"start": agg["months"][0], "end": agg["months"][-1]},
        "kpis": {"sales": int(len(d)), "value": int(d.price.sum() / 1e3), "median": int(d.price.median()), "lastYear": int(by_year.index[-1]), "lastYearSales": int(last["size"]), "lastYearValue": int(last["sum"] / 1e3), "lastYearMedian": int(last["median"]), "salesYoY": round(float(last["size"] / prev["size"] - 1) * 100, 1), "medianYoY": round(float(last["median"] / prev["median"] - 1) * 100, 1)},
        "insights": {"peakYear": peak_year, "peakSales": int(by_year["size"].max()), "lowYear": low_year, "lowSales": int(by_year["size"].min()), "busiestMonth": int(idx.idxmax()), "busiestIndex": round(float(idx.max()), 1), "quietMonth": int(idx.idxmin()), "quietIndex": round(float(idx.min()), 1), "topBorough": bv.index[0], "topBoroughShare": round(float(bv.iloc[0] / bv.sum() * 100), 1)},
        "byBoroughYear": {b: {"sales": int((d[(y == 2019) & (d.borough == b)]).shape[0]), "value": int(d[(y == 2019) & (d.borough == b)].price.sum() / 1e3), "median": int(d[(y == 2019) & (d.borough == b)].price.median())} for b in BOROUGHS}}


def main(path):
    d, report = clean(path); print(report, flush=True)
    agg = aggregates(d); hoods = neighborhoods(d); meta = summary(d, agg, report)
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "sales.json").write_text(json.dumps(agg, separators=(",", ":")))
    (OUT / "neighborhoods.json").write_text(json.dumps(hoods, separators=(",", ":")))
    (OUT / "meta.json").write_text(json.dumps(meta, indent=1))
    pd.DataFrame({"date": [f"{m}-01" for m in agg["months"]], "sales": agg["series"]["All|All"]["count"]}).iloc[-120:].to_csv(OUT.parent.parent / "public" / "sample-sales.csv", index=False)
    fc = forecast(agg); fc["decisions"] = decisions(fc)
    (OUT / "forecast.json").write_text(json.dumps(fc, separators=(",", ":")))
    print("done", flush=True)

if __name__ == "__main__":
    main(sys.argv[1])
