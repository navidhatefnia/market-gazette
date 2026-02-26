import yfinance as yf
import json
import os
from datetime import datetime

# Shared stock list
STOCKS = {
    "NVDA":     {"name": "NVIDIA",              "sector": "Semiconductors",  "kw": "AI chips GPU data center earnings"},
    "AMD":      {"name": "AMD",                 "sector": "Semiconductors",  "kw": "CPU GPU AI chips competition"},
    "MU":       {"name": "Micron",              "sector": "Semiconductors",  "kw": "memory chips DRAM HBM AI"},
    "SMCI":     {"name": "Super Micro",         "sector": "Servers",         "kw": "AI servers data center rack"},
    "CENX":     {"name": "Century Aluminum",    "sector": "Materials",       "kw": "aluminum tariffs energy costs"},
    "WPM":      {"name": "Wheaton Precious Metals", "sector": "Precious Metals", "kw": "gold silver streaming royalties"},
    "ENR.DE":   {"name": "Siemens Energy",      "sector": "Energy",          "kw": "energy transition Europe grid"},
    "ASME.DE":  {"name": "ASML",               "sector": "Semiconductors",  "kw": "EUV lithography chip manufacturing"},
    "HT3.DE":   {"name": "AngloGold Ashanti",  "sector": "Precious Metals", "kw": "gold mining production"},
    "PTX.DE":   {"name": "Palantir",           "sector": "Software",        "kw": "AI data analytics government contracts"},
    "NS7.DE":   {"name": "Northern Star",      "sector": "Precious Metals", "kw": "gold mining Australia production"},
    "CDM1.DE":  {"name": "Coeur Mining",       "sector": "Precious Metals", "kw": "silver gold mining operations"},
    "PA2.DE":   {"name": "Pan American Silver","sector": "Precious Metals", "kw": "silver gold mining Latin America"},
    "RG3.DE":   {"name": "Royal Gold",         "sector": "Precious Metals", "kw": "gold royalties streaming"},
    "USAU":     {"name": "US Gold Corp",        "sector": "Precious Metals", "kw": "gold exploration mining development"},
    "APC.DE":   {"name": "Apple",              "sector": "Technology",      "kw": "iPhone supply chain China tariffs"},
    "ABEC.DE":  {"name": "Alphabet C",         "sector": "Technology",      "kw": "Google AI cloud advertising search"},
    "ABEA.DE":  {"name": "Alphabet A",         "sector": "Technology",      "kw": "Google AI cloud advertising antitrust"},
    "AMS1.DE":  {"name": "American Superconductor", "sector": "Technology", "kw": "power electronics clean energy grid"},
    "AP2.DE":   {"name": "Applied Materials",  "sector": "Semiconductors",  "kw": "chip equipment manufacturing semiconductor"},
}

def get_sentiment(text):
    positive_words = ['up', 'growth', 'rise', 'profit', 'buy', 'positive', 'win', 'beat', 'bullish', 'increase']
    negative_words = ['down', 'fall', 'loss', 'sell', 'negative', 'drop', 'miss', 'bearish', 'decrease', 'warn']
    
    text = text.lower()
    pos_count = sum(1 for word in positive_words if word in text)
    neg_count = sum(1 for word in negative_words if word in text)
    
    if pos_count > neg_count:
        return "positive"
    elif neg_count > pos_count:
        return "negative"
    else:
        return "neutral"

def fetch_all_news():
    print(f"[{datetime.now()}] Starting news fetch for {len(STOCKS)} stocks...")
    news_data = {}
    
    for sym, info in STOCKS.items():
        print(f"Fetching {sym}...")
        try:
            ticker = yf.Ticker(sym)
            try:
                raw_news = ticker.news
            except Exception as e:
                print(f"yfinance error for {sym}: {e}")
                raw_news = []
            
            formatted_news = []
            
            # Use top 4 news items
            if not raw_news:
                print(f"No news found for {sym}")
                news_data[sym] = []
                continue

            for item in raw_news[:10]: # Fetch more items since we filter
                if not isinstance(item, dict):
                    continue
                
                content = item.get('content')
                pub_date_dt = None
                
                if not content:
                    # Sometimes news structure varies
                    title = item.get('title', 'No Title')
                    url = item.get('link', '#')
                    source = item.get('publisher', 'Unknown')
                    date_str = "Recent"
                else:
                    title = content.get('title', 'No Title')
                    url = content.get('clickThroughUrl', {}).get('url', '#')
                    source = content.get('provider', {}).get('displayName', 'Unknown')
                    
                    # Handle publication date
                    pub_date = content.get('pubDate', '')
                    try:
                        # e.g. '2026-02-26T11:48:04Z' -> datetime object
                        pub_date_dt = datetime.strptime(pub_date.replace('Z', '+0000'), '%Y-%m-%dT%H:%M:%S%z')
                        date_str = pub_date_dt.strftime('%b %d, %H:%M')
                    except Exception as e:
                        date_str = pub_date[:10] if pub_date else "Today"
                
                # Strict filter by date (last 48 hours)
                is_recent = False
                if pub_date_dt:
                    now = datetime.now(pub_date_dt.tzinfo)
                    delta = now - pub_date_dt
                    if delta.total_seconds() < 172800: # 48 hours in seconds
                        is_recent = True
                
                if not is_recent:
                    continue # Skip if not verified as recent

                formatted_news.append({
                    "title": title,
                    "summary": "", 
                    "source": source,
                    "url": url,
                    "date": date_str,
                    "sentiment": get_sentiment(title)
                })
                
                if len(formatted_news) >= 4:
                    break # Only need top 4 fresh items
            
            news_data[sym] = formatted_news
        except Exception as e:
            print(f"Error fetching {sym}: {e}")
            news_data[sym] = []

    output = {
        "lastUpdated": datetime.now().strftime('%I:%M %p'),
        "date": datetime.now().strftime('%A, %B %d, %Y'),
        "news": news_data
    }
    
    # Ensure directory exists
    os.makedirs('src/data', exist_ok=True)
    
    with open('src/data/news.json', 'w') as f:
        json.dump(output, f, indent=2)
    
    print(f"[{datetime.now()}] Success! News saved to src/data/news.json")

if __name__ == "__main__":
    fetch_all_news()
