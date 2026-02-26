import { useState, useEffect, useCallback, useRef } from "react";

const stocks = {
    NVDA: { name: "NVIDIA", sector: "Semiconductors", kw: "AI chips GPU data center earnings" },
    AMD: { name: "AMD", sector: "Semiconductors", kw: "CPU GPU AI chips competition" },
    MU: { name: "Micron", sector: "Semiconductors", kw: "memory chips DRAM HBM AI" },
    SMCI: { name: "Super Micro", sector: "Servers", kw: "AI servers data center rack" },
    CENX: { name: "Century Aluminum", sector: "Materials", kw: "aluminum tariffs energy costs" },
    WPM: { name: "Wheaton Precious Metals", sector: "Precious Metals", kw: "gold silver streaming royalties" },
    "ENR.DE": { name: "Siemens Energy", sector: "Energy", kw: "energy transition Europe grid" },
    "ASME.DE": { name: "ASML", sector: "Semiconductors", kw: "EUV lithography chip manufacturing" },
    "HT3.DE": { name: "AngloGold Ashanti", sector: "Precious Metals", kw: "gold mining production" },
    "PTX.DE": { name: "Palantir", sector: "Software", kw: "AI data analytics government contracts" },
    "NS7.DE": { name: "Northern Star", sector: "Precious Metals", kw: "gold mining Australia production" },
    "CDM1.DE": { name: "Coeur Mining", sector: "Precious Metals", kw: "silver gold mining operations" },
    "PA2.DE": { name: "Pan American Silver", sector: "Precious Metals", kw: "silver gold mining Latin America" },
    "RG3.DE": { name: "Royal Gold", sector: "Precious Metals", kw: "gold royalties streaming" },
    USAU: { name: "US Gold Corp", sector: "Precious Metals", kw: "gold exploration mining development" },
    "APC.DE": { name: "Apple", sector: "Technology", kw: "iPhone supply chain China tariffs" },
    "ABEC.DE": { name: "Alphabet C", sector: "Technology", kw: "Google AI cloud advertising search" },
    "ABEA.DE": { name: "Alphabet A", sector: "Technology", kw: "Google AI cloud advertising antitrust" },
    "AMS1.DE": { name: "American Superconductor", sector: "Technology", kw: "power electronics clean energy grid" },
    "AP2.DE": { name: "Applied Materials", sector: "Semiconductors", kw: "chip equipment manufacturing semiconductor" },
};

const SECTORS = ["All", "Semiconductors", "Precious Metals", "Technology", "Software", "Energy", "Materials", "Servers"];

// The API key is injected at build time from your .env file (locally)
// or from the ANTHROPIC_API_KEY GitHub Actions secret (in CI).
const ANTHROPIC_API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY;

async function fetchNewsForStock(sym, name, sector, kw) {
    if (!ANTHROPIC_API_KEY) {
        console.error("No VITE_ANTHROPIC_API_KEY found. Check your .env file.");
        return [];
    }
    try {
        const today = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
        const prompt = `Search the web right now for the 4 most recent news headlines about "${name}" (stock ticker: ${sym}), a ${sector} company. Search terms to use: ${kw}. Today is ${today}.

Return ONLY a valid JSON array, no markdown, no explanation, no code fences. Format:
[{"title":"exact headline","summary":"one sentence","source":"Publisher Name","url":"https://actual-url.com","date":"Mon DD, YYYY","sentiment":"positive"}]

Sentiment must be "positive", "negative", or "neutral". Return [] if no news found.`;

        const res = await fetch("https://api.anthropic.com/v1/messages", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "x-api-key": ANTHROPIC_API_KEY,
                "anthropic-version": "2023-06-01",
                "anthropic-dangerous-direct-browser-access": "true",
            },
            body: JSON.stringify({
                model: "claude-sonnet-4-20250514",
                max_tokens: 1000,
                tools: [{ type: "web_search_20250305", name: "web_search" }],
                messages: [{ role: "user", content: prompt }],
            }),
        });

        if (!res.ok) throw new Error(`API error ${res.status}`);
        const data = await res.json();
        const text = (data.content || []).filter(b => b.type === "text").map(b => b.text).join("");
        const start = text.indexOf("[");
        const end = text.lastIndexOf("]");
        if (start === -1 || end === -1) return [];
        return JSON.parse(text.slice(start, end + 1));
    } catch (e) {
        console.error(sym, e);
        return [];
    }
}

const sentimentStyle = { positive: "#1a6b2e", negative: "#8b1a1a", neutral: "#5a5040" };
const sentimentLabel = { positive: "▲", negative: "▼", neutral: "—" };

export default function App() {
    const [cardStates, setCardStates] = useState(() =>
        Object.fromEntries(Object.keys(stocks).map(s => [s, { status: "loading", news: [] }]))
    );
    const [filter, setFilter] = useState("All");
    const [progress, setProgress] = useState({ done: 0, total: Object.keys(stocks).length });
    const [lastUpdated, setLastUpdated] = useState(null);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const hasFetched = useRef(false);

    const loadAll = useCallback(async () => {
        if (isRefreshing) return;
        setIsRefreshing(true);
        const syms = Object.keys(stocks);
        setProgress({ done: 0, total: syms.length });
        setCardStates(Object.fromEntries(syms.map(s => [s, { status: "loading", news: [] }])));

        const batchSize = 3;
        for (let i = 0; i < syms.length; i += batchSize) {
            const batch = syms.slice(i, i + batchSize);
            await Promise.all(batch.map(async sym => {
                const { name, sector, kw } = stocks[sym];
                const news = await fetchNewsForStock(sym, name, sector, kw);
                setCardStates(prev => ({ ...prev, [sym]: { status: "done", news } }));
                setProgress(prev => ({ ...prev, done: prev.done + 1 }));
            }));
            if (i + batchSize < syms.length) await new Promise(r => setTimeout(r, 200));
        }
        setLastUpdated(new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }));
        setIsRefreshing(false);
    }, [isRefreshing]);

    useEffect(() => {
        if (!hasFetched.current) {
            hasFetched.current = true;
            loadAll();
        }
    }, []);

    const today = new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
    const visible = Object.entries(stocks).filter(([, info]) => filter === "All" || info.sector === filter);

    return (
        <div style={{ background: "#f9f6ef", minHeight: "100vh", fontFamily: "'Times New Roman', Times, serif", color: "#1a1a1a" }}>
            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=UnifrakturMaguntia&family=IM+Fell+English:ital@0;1&family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&family=Source+Serif+4:ital,opsz,wght@0,8..60,300;0,8..60,400;0,8..60,600;0,8..60,700;1,8..60,400&family=DM+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #f9f6ef; }
        @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
        @keyframes shimmer { 0%,100% { background-color:#e8e2d4; } 50% { background-color:#d8d0c0; } }
        @keyframes spin { to { transform: rotate(360deg); } }
        a { color: inherit; text-decoration: none; }
        a:hover { text-decoration: underline; text-underline-offset: 2px; }
        .rule-heavy { border: none; border-top: 3px double #1a1a1a; margin: 0; }
        .rule-thin  { border: none; border-top: 1px solid #1a1a1a; margin: 0; }
        .rule-mid   { border: none; border-top: 2px solid #1a1a1a; margin: 0; }
        .sk { border-radius: 1px; animation: shimmer 1.2s ease infinite; }
        .filter-pill {
          font-family: 'DM Mono', monospace;
          font-size: 0.62rem;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          border: 1px solid #1a1a1a;
          background: transparent;
          color: #1a1a1a;
          padding: 4px 12px;
          cursor: pointer;
          transition: all 0.12s;
        }
        .filter-pill:hover, .filter-pill.active { background: #1a1a1a; color: #f9f6ef; }
        .card-col { break-inside: avoid; }
        .news-headline { font-family: 'Source Serif 4', 'Times New Roman', serif; font-size: 1.0rem; font-weight: 600; line-height: 1.38; }
        .news-headline a { color: #1a1a1a; }
        .news-headline a:hover { color: #8b1a1a; }
        .news-summary { font-family: 'Source Serif 4', 'Times New Roman', serif; font-size: 0.82rem; color: #4a4030; line-height: 1.5; font-style: italic; }
        .byline { font-family: 'DM Mono', monospace; font-size: 0.6rem; color: #7a6e5a; letter-spacing: 0.06em; }
        .ticker-sym { font-family: 'DM Mono', monospace; font-size: 0.65rem; font-weight: 500; color: #8b1a1a; background: #f9f6ef; border: 1px solid #8b1a1a; padding: 2px 7px; letter-spacing: 0.1em; }
        .sector-tag { font-family: 'DM Mono', monospace; font-size: 0.6rem; color: #7a6e5a; text-transform: uppercase; letter-spacing: 0.1em; }
        .company-name { font-family: 'Source Serif 4', serif; font-size: 1.15rem; font-weight: 700; line-height: 1.2; margin: 6px 0 2px; }
        .progress-bar { height: 2px; background: #d8d0c0; }
        .progress-fill { height: 100%; background: #8b1a1a; transition: width 0.3s ease; }

        /* Missing API key warning banner */
        .api-warning {
          background: #fff3cd;
          border: 1px solid #ffc107;
          color: #856404;
          text-align: center;
          padding: 12px 20px;
          font-family: 'DM Mono', monospace;
          font-size: 0.72rem;
          letter-spacing: 0.06em;
        }
      `}</style>

            {/* ── TOP STRIP ── */}
            <div style={{ background: "#1a1a1a", color: "#f9f6ef", textAlign: "center", padding: "5px 20px", fontFamily: "'DM Mono', monospace", fontSize: "0.62rem", letterSpacing: "0.15em" }}>
                FINANCIAL MARKETS EDITION &nbsp;·&nbsp; ALL PRICES INDICATIVE &nbsp;·&nbsp; NOT INVESTMENT ADVICE
            </div>

            {/* ── API KEY WARNING ── */}
            {!ANTHROPIC_API_KEY && (
                <div className="api-warning">
                    ⚠️ &nbsp;NO API KEY FOUND — Set <code>VITE_ANTHROPIC_API_KEY</code> in your <code>.env</code> file (locally) or as a GitHub Actions secret.
                </div>
            )}

            <div style={{ maxWidth: "1340px", margin: "0 auto", padding: "0 32px" }}>

                {/* ── MASTHEAD ── */}
                <div style={{ padding: "28px 0 0", textAlign: "center" }}>
                    <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.6rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "#7a6e5a", marginBottom: "10px", display: "flex", justifyContent: "space-between" }}>
                        <span>Est. {new Date().getFullYear()} · Vol. I</span>
                        <span>{today}</span>
                        <span>{lastUpdated ? `Updated ${lastUpdated}` : "Fetching latest…"}</span>
                    </div>

                    <hr className="rule-thin" />
                    <div style={{ padding: "18px 0 14px" }}>
                        <div style={{ fontFamily: "'UnifrakturMaguntia', cursive", fontSize: "clamp(2.8rem, 7vw, 5.8rem)", lineHeight: 1, color: "#1a1a1a", letterSpacing: "1px" }}>
                            The Market Gazette
                        </div>
                        <div style={{ fontFamily: "'IM Fell English', serif", fontStyle: "italic", fontSize: "0.95rem", color: "#5a5040", marginTop: "6px", letterSpacing: "0.08em" }}>
                            "All the financial news that's fit to print — fetched fresh, for your portfolio"
                        </div>
                    </div>
                    <hr className="rule-heavy" />
                    <div style={{ height: "3px" }} />
                    <hr className="rule-thin" />
                </div>

                {/* ── PROGRESS ── */}
                {isRefreshing && (
                    <div style={{ margin: "8px 0 0" }}>
                        <div className="progress-bar">
                            <div className="progress-fill" style={{ width: `${(progress.done / progress.total) * 100}%` }} />
                        </div>
                        <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.6rem", color: "#7a6e5a", textAlign: "center", marginTop: "4px", letterSpacing: "0.08em" }}>
                            FETCHING NEWS — {progress.done} of {progress.total} columns loaded
                        </div>
                    </div>
                )}

                {/* ── FILTERS + REFRESH ── */}
                <div style={{ padding: "10px 0", display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", borderBottom: "1px solid #c8c0b0" }}>
                    <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.6rem", color: "#7a6e5a", letterSpacing: "0.12em", textTransform: "uppercase", marginRight: "4px" }}>Section:</span>
                    {SECTORS.map(s => (
                        <button key={s} className={`filter-pill${filter === s ? " active" : ""}`} onClick={() => setFilter(s)}>{s}</button>
                    ))}
                    <button
                        onClick={loadAll}
                        disabled={isRefreshing}
                        style={{
                            marginLeft: "auto",
                            fontFamily: "'DM Mono', monospace",
                            fontSize: "0.62rem",
                            letterSpacing: "0.1em",
                            textTransform: "uppercase",
                            border: "1px solid #8b1a1a",
                            background: isRefreshing ? "transparent" : "#8b1a1a",
                            color: isRefreshing ? "#8b1a1a" : "#f9f6ef",
                            padding: "5px 16px",
                            cursor: isRefreshing ? "not-allowed" : "pointer",
                            display: "flex", alignItems: "center", gap: "7px",
                        }}
                    >
                        <span style={{ display: "inline-block", animation: isRefreshing ? "spin 0.9s linear infinite" : "none" }}>↻</span>
                        {isRefreshing ? `${progress.done}/${progress.total}` : "Refresh"}
                    </button>
                </div>

                {/* ── NEWSPAPER GRID ── */}
                <div style={{
                    columns: "3 320px",
                    columnGap: "0",
                    padding: "0 0 60px",
                }}>
                    {visible.map(([sym, info], idx) => {
                        const state = cardStates[sym];
                        return (
                            <div key={sym} className="card-col" style={{
                                breakInside: "avoid",
                                padding: "18px 22px",
                                borderRight: "1px solid #c8c0b0",
                                borderBottom: "1px solid #c8c0b0",
                                animation: "fadeIn 0.5s ease both",
                                animationDelay: `${idx * 0.03}s`,
                            }}>
                                {/* Stock header */}
                                <div style={{ marginBottom: "10px" }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "5px" }}>
                                        <span className="ticker-sym">{sym}</span>
                                        <span className="sector-tag">{info.sector}</span>
                                    </div>
                                    <div className="company-name">{info.name}</div>
                                    <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.58rem", color: "#9a8e7a", letterSpacing: "0.05em", marginTop: "2px" }}>{info.kw}</div>
                                </div>

                                <hr className="rule-mid" style={{ marginBottom: "12px" }} />

                                {/* News content */}
                                {state.status === "loading" && (
                                    <div>
                                        {[100, 85, 70, 90].map((w, i) => (
                                            <div key={i} style={{ marginBottom: "14px" }}>
                                                <div className="sk" style={{ height: "13px", width: `${w}%`, marginBottom: "5px" }} />
                                                <div className="sk" style={{ height: "13px", width: `${w - 15}%`, marginBottom: "5px" }} />
                                                <div className="sk" style={{ height: "10px", width: "55%", marginBottom: "12px" }} />
                                                {i < 3 && <hr style={{ border: "none", borderTop: "1px dashed #c8c0b0" }} />}
                                                {i < 3 && <div style={{ height: "10px" }} />}
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {state.status === "done" && state.news.length === 0 && (
                                    <div style={{ fontFamily: "'IM Fell English', serif", fontStyle: "italic", color: "#9a8e7a", fontSize: "0.88rem", textAlign: "center", padding: "16px 0" }}>
                                        No dispatches found for this edition.
                                    </div>
                                )}

                                {state.status === "done" && state.news.map((item, i) => (
                                    <div key={i}>
                                        {i > 0 && <hr style={{ border: "none", borderTop: "1px dashed #c8c0b0", margin: "12px 0" }} />}
                                        <div className="news-headline" style={{ marginBottom: "5px" }}>
                                            <a href={item.url || "#"} target="_blank" rel="noopener noreferrer">{item.title}</a>
                                        </div>
                                        {item.summary && (
                                            <div className="news-summary" style={{ marginBottom: "5px" }}>{item.summary}</div>
                                        )}
                                        <div className="byline" style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                                            {item.source && <span style={{ fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.08em" }}>{item.source}</span>}
                                            {item.date && <span>· {item.date}</span>}
                                            {item.sentiment && (
                                                <span style={{ marginLeft: "auto", color: sentimentStyle[item.sentiment] || "#7a6e5a", fontWeight: 600 }}>
                                                    {sentimentLabel[item.sentiment] || "—"}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Footer */}
            <div style={{ background: "#1a1a1a", color: "#7a6e5a", textAlign: "center", padding: "14px 20px", fontFamily: "'DM Mono', monospace", fontSize: "0.6rem", letterSpacing: "0.1em" }}>
                THE MARKET GAZETTE · POWERED BY CLAUDE AI + WEB SEARCH · FOR INFORMATIONAL PURPOSES ONLY · © {new Date().getFullYear()}
            </div>
        </div>
    );
}
