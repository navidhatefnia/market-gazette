import yfinance as yf
import json
import os
from datetime import datetime, timezone

# Shared stock list
STOCKS = {
    "NVDA":     {"name": "NVIDIA",                  "sector": "Semiconductors",  "kw": "AI chips GPU data center earnings"},
    "AMD":      {"name": "AMD",                     "sector": "Semiconductors",  "kw": "CPU GPU AI chips competition"},
    "MU":       {"name": "Micron",                  "sector": "Semiconductors",  "kw": "memory chips DRAM HBM AI"},
    "SMCI":     {"name": "Super Micro",             "sector": "Servers",         "kw": "AI servers data center rack"},
    "CENX":     {"name": "Century Aluminum",        "sector": "Materials",       "kw": "aluminum tariffs energy costs"},
    "WPM":      {"name": "Wheaton Precious Metals", "sector": "Precious Metals", "kw": "gold silver streaming royalties"},
    "ENR.DE":   {"name": "Siemens Energy",          "sector": "Energy",          "kw": "energy transition Europe grid"},
    "ASME.DE":  {"name": "ASML",                    "sector": "Semiconductors",  "kw": "EUV lithography chip manufacturing"},
    "HT3.DE":   {"name": "AngloGold Ashanti",       "sector": "Precious Metals", "kw": "gold mining production"},
    "PTX.DE":   {"name": "Palantir",                "sector": "Software",        "kw": "AI data analytics government contracts"},
    "NS7.DE":   {"name": "Northern Star",           "sector": "Precious Metals", "kw": "gold mining Australia production"},
    "CDM1.DE":  {"name": "Coeur Mining",            "sector": "Precious Metals", "kw": "silver gold mining operations"},
    "PA2.DE":   {"name": "Pan American Silver",     "sector": "Precious Metals", "kw": "silver gold mining Latin America"},
    "RG3.DE":   {"name": "Royal Gold",              "sector": "Precious Metals", "kw": "gold royalties streaming"},
    "USAU":     {"name": "US Gold Corp",            "sector": "Precious Metals", "kw": "gold exploration mining development"},
    "APC.DE":   {"name": "Apple",                   "sector": "Technology",      "kw": "iPhone supply chain China tariffs"},
    "ABEC.DE":  {"name": "Alphabet C",              "sector": "Technology",      "kw": "Google AI cloud advertising search"},
    "ABEA.DE":  {"name": "Alphabet A",              "sector": "Technology",      "kw": "Google AI cloud advertising antitrust"},
    "AMS1.DE":  {"name": "American Superconductor", "sector": "Technology",      "kw": "power electronics clean energy grid"},
    "AP2.DE":   {"name": "Applied Materials",       "sector": "Semiconductors",  "kw": "chip equipment manufacturing semiconductor"},
}


def get_sentiment(text):
    if not text:
        return "neutral"
    positive_words = ['up', 'growth', 'rise', 'profit', 'buy', 'positive', 'win', 'beat', 'bullish', 'increase', 'deal', 'success', 'record', 'surge', 'gain']
    negative_words = ['down', 'fall', 'loss', 'sell', 'negative', 'drop', 'miss', 'bearish', 'decrease', 'warn', 'risk', 'fail', 'cut', 'decline', 'slump']
    text = text.lower()
    pos_count = sum(1 for w in positive_words if w in text)
    neg_count = sum(1 for w in negative_words if w in text)
    if pos_count > neg_count:
        return "positive"
    elif neg_count > pos_count:
        return "negative"
    return "neutral"


def _parse_item(item):
    """
    Parse a single yfinance news item robustly.
    yfinance >= 0.2.50 wraps news inside item['content'] (dict).
    Older versions expose fields at the top level.
    Returns a dict or None if the item should be skipped.
    """
    if not isinstance(item, dict):
        return None

    title     = None
    url       = "#"
    source    = "Unknown"
    pub_date_dt = None

    # ── New format: item["content"] dict ──────────────────────────────────
    content = item.get("content")
    if isinstance(content, dict):
        title  = content.get("title") or content.get("headline")
        # clickThroughUrl is itself a dict {"url": "...", "displayUrl": "..."}
        ctu = content.get("clickThroughUrl") or content.get("canonicalUrl") or {}
        if isinstance(ctu, dict):
            url = ctu.get("url", "#")
        elif isinstance(ctu, str):
            url = ctu
        provider = content.get("provider") or {}
        if isinstance(provider, dict):
            source = provider.get("displayName") or provider.get("name") or "Unknown"
        elif isinstance(provider, str):
            source = provider

        pub_date = content.get("pubDate") or content.get("displayTime") or ""

    # ── Old / flat format ─────────────────────────────────────────────────
    else:
        title  = item.get("title")
        url    = item.get("link") or item.get("url") or "#"
        source = item.get("publisher") or item.get("source") or "Unknown"
        pub_date = item.get("providerPublishTime") or item.get("pubDate") or ""

    if not title:
        return None

    # ── Parse publication date ────────────────────────────────────────────
    if pub_date:
        # Could be an ISO string "2026-10-24T12:00:00Z" or a Unix timestamp int
        if isinstance(pub_date, (int, float)):
            try:
                pub_date_dt = datetime.fromtimestamp(pub_date, tz=timezone.utc)
            except Exception:
                pass
        elif isinstance(pub_date, str) and pub_date.strip():
            for fmt in (
                "%Y-%m-%dT%H:%M:%SZ",
                "%Y-%m-%dT%H:%M:%S%z",
                "%Y-%m-%d %H:%M:%S%z",
            ):
                try:
                    pub_date_dt = datetime.strptime(pub_date.replace("Z", "+0000").strip(), fmt)
                    break
                except ValueError:
                    continue

    return {
        "title":      title,
        "url":        url,
        "source":     source,
        "pub_date_dt": pub_date_dt,
    }


def fetch_all_news():
    now_utc = datetime.now(timezone.utc)
    print(f"[{now_utc}] Starting news fetch for {len(STOCKS)} stocks...")
    news_data = {}

    for sym, info in STOCKS.items():
        print(f"  Processing {sym}...", end=" ")
        temp_list = []
        try:
            ticker = yf.Ticker(sym)
            try:
                raw_news = ticker.news or []
            except Exception as e:
                print(f"yfinance API error: {e}")
                raw_news = []

            for item in raw_news[:40]:
                parsed = _parse_item(item)
                if not parsed:
                    continue

                pub_date_dt = parsed["pub_date_dt"]

                # 48-hour recency filter
                is_recent = False
                if pub_date_dt:
                    # Make sure both sides are timezone-aware
                    if pub_date_dt.tzinfo is None:
                        pub_date_dt = pub_date_dt.replace(tzinfo=timezone.utc)
                    delta = now_utc - pub_date_dt
                    is_recent = delta.total_seconds() < 172800  # 48 h

                # If no date at all, include it anyway (better than nothing)
                if is_recent or pub_date_dt is None:
                    date_str = pub_date_dt.strftime("%b %d, %H:%M") if pub_date_dt else "Recent"
                    temp_list.append({
                        "title":     parsed["title"],
                        "summary":   "",
                        "source":    parsed["source"],
                        "url":       parsed["url"],
                        "date":      date_str,
                        "sentiment": get_sentiment(parsed["title"]),
                        "_dt":       pub_date_dt,
                    })

            # Sort newest first
            temp_list.sort(key=lambda x: x["_dt"] or datetime.min.replace(tzinfo=timezone.utc), reverse=True)

            formatted = []
            for entry in temp_list[:10]:
                del entry["_dt"]
                formatted.append(entry)

            news_data[sym] = formatted
            print(f"{len(formatted)} articles")

        except Exception as e:
            print(f"Critical error: {e}")
            news_data[sym] = []

    output = {
        "lastUpdated": datetime.now().strftime("%I:%M %p"),
        "date":        datetime.now().strftime("%A, %B %d, %Y"),
        "news":        news_data,
    }

    os.makedirs("src/data", exist_ok=True)
    out_path = "src/data/news.json"
    with open(out_path, "w") as f:
        json.dump(output, f, indent=2)

    total = sum(len(v) for v in news_data.values())
    print(f"[{datetime.now()}] Done — {total} total articles saved to {out_path}")


if __name__ == "__main__":
    fetch_all_news()
