import { useState, useEffect } from "react";
import newsData from "./data/news.json";

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

const sentimentStyle = { positive: "#1a6b2e", negative: "#8b1a1a", neutral: "#5a5040" };
const sentimentLabel = { positive: "▲", negative: "▼", neutral: "—" };

export default function App() {
    const [filter, setFilter] = useState("All");

    const today = newsData.date || new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
    const lastUpdated = newsData.lastUpdated;
    const visible = Object.entries(stocks).filter(([, info]) => filter === "All" || info.sector === filter);

    return (
        <div style={{ background: "#f9f6ef", minHeight: "100vh", fontFamily: "'Times New Roman', Times, serif", color: "#1a1a1a" }}>
            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=UnifrakturMaguntia&family=IM+Fell+English:ital@0;1&family=Libre+Baskerville:ital,wght@0,400;0,700;1,400&family=Source+Serif+4:ital,opsz,wght@0,8..60,300;0,8..60,400;0,8..60,600;0,8..60,700;1,8..60,400&family=DM+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #f9f6ef; }
        @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
        a { color: inherit; text-decoration: none; }
        a:hover { text-decoration: underline; text-underline-offset: 2px; }
        .rule-heavy { border: none; border-top: 3px double #1a1a1a; margin: 0; }
        .rule-thin  { border: none; border-top: 1px solid #1a1a1a; margin: 0; }
        .rule-mid   { border: none; border-top: 2px solid #1a1a1a; margin: 0; }
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
      `}</style>

            {/* ── TOP STRIP ── */}
            <div style={{ background: "#1a1a1a", color: "#f9f6ef", textAlign: "center", padding: "5px 20px", fontFamily: "'DM Mono', monospace", fontSize: "0.62rem", letterSpacing: "0.15em" }}>
                FINANCIAL MARKETS EDITION &nbsp;·&nbsp; ALL PRICES INDICATIVE &nbsp;·&nbsp; FREE EDITION
            </div>

            <div style={{ maxWidth: "1340px", margin: "0 auto", padding: "0 32px" }}>

                {/* ── MASTHEAD ── */}
                <div style={{ padding: "28px 0 0", textAlign: "center" }}>
                    <div style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.6rem", letterSpacing: "0.2em", textTransform: "uppercase", color: "#7a6e5a", marginBottom: "10px", display: "flex", justifyContent: "space-between" }}>
                        <span>Est. {new Date().getFullYear()} · Vol. I</span>
                        <span>{today}</span>
                        <span>Updated {lastUpdated}</span>
                    </div>

                    <hr className="rule-thin" />
                    <div style={{ padding: "18px 0 14px" }}>
                        <div style={{ fontFamily: "'UnifrakturMaguntia', cursive", fontSize: "clamp(2.8rem, 7vw, 5.8rem)", lineHeight: 1, color: "#1a1a1a", letterSpacing: "1px" }}>
                            The Market Gazette
                        </div>
                        <div style={{ fontFamily: "'IM Fell English', serif", fontStyle: "italic", fontSize: "0.95rem", color: "#5a5040", marginTop: "6px", letterSpacing: "0.08em" }}>
                            "All the financial news that's fit to print — 100% Free Daily Digest"
                        </div>
                    </div>
                    <hr className="rule-heavy" />
                    <div style={{ height: "3px" }} />
                    <hr className="rule-thin" />
                </div>

                {/* ── FILTERS ── */}
                <div style={{ padding: "10px 0", display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", borderBottom: "1px solid #c8c0b0" }}>
                    <span style={{ fontFamily: "'DM Mono', monospace", fontSize: "0.6rem", color: "#7a6e5a", letterSpacing: "0.12em", textTransform: "uppercase", marginRight: "4px" }}>Section:</span>
                    {SECTORS.map(s => (
                        <button key={s} className={`filter-pill${filter === s ? " active" : ""}`} onClick={() => setFilter(s)}>{s}</button>
                    ))}
                    <div style={{ marginLeft: "auto", fontFamily: "'DM Mono', monospace", fontSize: "0.6rem", color: "#8b1a1a", letterSpacing: "0.05em" }}>
                        AUTOREFRESH EVERY 4H
                    </div>
                </div>

                {/* ── NEWSPAPER GRID ── */}
                <div style={{
                    columns: "3 320px",
                    columnGap: "0",
                    padding: "0 0 60px",
                }}>
                    {visible.map(([sym, info], idx) => {
                        const news = newsData.news[sym] || [];
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
                                {news.length === 0 && (
                                    <div style={{ fontFamily: "'IM Fell English', serif", fontStyle: "italic", color: "#9a8e7a", fontSize: "0.88rem", textAlign: "center", padding: "16px 0" }}>
                                        No dispatches found for this edition.
                                    </div>
                                )}

                                {news.map((item, i) => (
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
                THE MARKET GAZETTE · POWERED BY YFINANCE · 100% FREE EDITION · © {new Date().getFullYear()}
            </div>
        </div>
    );
}
