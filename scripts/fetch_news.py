"""
fetch_news.py – fetches stock news via Yahoo Finance RSS (no API key needed).
RSS URL: https://feeds.finance.yahoo.com/rss/2.0/headline?s=NVDA&region=US&lang=en-US
"""
import json
import os
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime

try:
    import requests
except ImportError:
    raise SystemExit("Install requests: pip install requests")

# ---------------------------------------------------------------------------
# Stock watchlist
# ---------------------------------------------------------------------------
STOCKS = {
    "NVDA":     {"name": "NVIDIA",                  "sector": "Semiconductors",  "kw": "AI chips GPU data center earnings"},
    "AMD":      {"name": "AMD",                     "sector": "Semiconductors",  "kw": "CPU GPU AI chips competition"},
    "MU":       {"name": "Micron",                  "sector": "Semiconductors",  "kw": "memory chips DRAM HBM AI"},
    "SMCI":     {"name": "Super Micro",             "sector": "Servers",         "kw": "AI servers data center rack"},
    "CENX":     {"name": "Century Aluminum",        "sector": "Materials",       "kw": "aluminum tariffs energy costs"},
    "WPM":      {"name": "Wheaton Precious Metals", "sector": "Precious Metals", "kw": "gold silver streaming royalties"},
    "ENR.DE":   {"name": "Siemens Energy",          "sector": "Energy",          "kw": "energy transition Europe grid"},
    "ASML":     {"name": "ASML",                    "sector": "Semiconductors",  "kw": "EUV lithography chip manufacturing"},
    "AU":       {"name": "AngloGold Ashanti",       "sector": "Precious Metals", "kw": "gold mining production"},
    "PLTR":     {"name": "Palantir",                "sector": "Software",        "kw": "AI data analytics government contracts"},
    "NST.AX":   {"name": "Northern Star",           "sector": "Precious Metals", "kw": "gold mining Australia production"},
    "CDE":      {"name": "Coeur Mining",            "sector": "Precious Metals", "kw": "silver gold mining operations"},
    "PAAS":     {"name": "Pan American Silver",     "sector": "Precious Metals", "kw": "silver gold mining Latin America"},
    "RGLD":     {"name": "Royal Gold",              "sector": "Precious Metals", "kw": "gold royalties streaming"},
    "USAU":     {"name": "US Gold Corp",            "sector": "Precious Metals", "kw": "gold exploration mining development"},
    "AAPL":     {"name": "Apple",                   "sector": "Technology",      "kw": "iPhone supply chain China tariffs"},
    "GOOGL":    {"name": "Alphabet",                "sector": "Technology",      "kw": "Google AI cloud advertising antitrust"},
    "AMSC":     {"name": "Amer. Superconductor",    "sector": "Technology",      "kw": "power electronics clean energy grid"},
    "AMAT":     {"name": "Applied Materials",       "sector": "Semiconductors",  "kw": "chip equipment manufacturing semiconductor"},
    "GLD":      {"name": "Gold ETF (GLD)",          "sector": "Precious Metals", "kw": "gold price ETF commodity"},
}

RSS_URL = "https://feeds.finance.yahoo.com/rss/2.0/headline?s={ticker}&region=US&lang=en-US"
HEADERS = {"User-Agent": "Mozilla/5.0 (compatible; MarketGazette/1.0)"}
MAX_AGE_DAYS = 7       # Show news up to 7 days old (covers weekends)
MAX_ARTICLES = 8       # Per stock


def get_sentiment(text: str) -> str:
    if not text:
        return "neutral"
    positive = ['up', 'growth', 'rise', 'profit', 'buy', 'win', 'beat', 'bullish',
                'surge', 'gain', 'record', 'strong', 'positive', 'increase', 'deal', 'success']
    negative = ['down', 'fall', 'loss', 'sell', 'drop', 'miss', 'bearish', 'warn',
                'risk', 'fail', 'cut', 'decline', 'slump', 'negative', 'decrease']
    t = text.lower()
    pos = sum(1 for w in positive if w in t)
    neg = sum(1 for w in negative if w in t)
    return "positive" if pos > neg else ("negative" if neg > pos else "neutral")


def fetch_rss(ticker: str) -> list:
    url = RSS_URL.format(ticker=ticker)
    try:
        r = requests.get(url, headers=HEADERS, timeout=10)
        r.raise_for_status()
    except Exception as e:
        print(f"    HTTP error: {e}")
        return []

    try:
        root = ET.fromstring(r.content)
    except ET.ParseError as e:
        print(f"    XML parse error: {e}")
        return []

    now_utc = datetime.now(timezone.utc)
    cutoff = MAX_AGE_DAYS * 86400  # seconds

    items = []
    for item in root.findall(".//item"):
        title   = (item.findtext("title") or "").strip()
        url_tag = (item.findtext("link")  or "").strip()
        source  = (item.findtext("source") or "Yahoo Finance").strip()
        pub_raw = (item.findtext("pubDate") or "").strip()

        if not title:
            continue

        pub_dt = None
        date_str = "Recent"
        if pub_raw:
            try:
                pub_dt = parsedate_to_datetime(pub_raw)
                if pub_dt.tzinfo is None:
                    pub_dt = pub_dt.replace(tzinfo=timezone.utc)
                age = (now_utc - pub_dt).total_seconds()
                if age > cutoff:
                    continue        # too old
                date_str = pub_dt.strftime("%b %d, %H:%M")
            except Exception:
                pass  # keep item, just no date filter

        items.append({
            "title":     title,
            "summary":   "",
            "source":    source,
            "url":       url_tag,
            "date":      date_str,
            "sentiment": get_sentiment(title),
            "_dt":       pub_dt,
        })

    # Sort newest first
    items.sort(key=lambda x: x["_dt"] or datetime.min.replace(tzinfo=timezone.utc), reverse=True)

    # Remove internal sort key
    for it in items:
        del it["_dt"]

    return items[:MAX_ARTICLES]


def fetch_all_news():
    now_utc = datetime.now(timezone.utc)
    print(f"[{now_utc}] Fetching news for {len(STOCKS)} stocks via Yahoo Finance RSS...")
    news_data = {}
    total = 0

    for sym, info in STOCKS.items():
        print(f"  {sym}...", end=" ", flush=True)
        articles = fetch_rss(sym)
        news_data[sym] = articles
        total += len(articles)
        print(f"{len(articles)} articles")

    output = {
        "lastUpdated": datetime.now().strftime("%I:%M %p"),
        "date":        datetime.now().strftime("%A, %B %d, %Y"),
        "news":        news_data,
    }

    os.makedirs("src/data", exist_ok=True)
    out_path = "src/data/news.json"
    with open(out_path, "w") as f:
        json.dump(output, f, indent=2)

    print(f"[{datetime.now()}] Done — {total} total articles saved to {out_path}")


if __name__ == "__main__":
    fetch_all_news()
