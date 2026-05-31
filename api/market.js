import https from 'https';

// Stooq — US stocks & FX (always available, no key, fast)
const STOOQ = [
  { s: 'usdils',   label: 'דולר/ש"ח', currency: true },
  { s: 'eurils',   label: 'יורו/ש"ח', currency: true },
  { s: '^spx',     label: 'S&P 500' },
  { s: '^ndq',     label: 'נאסד"ק' },
  { s: 'msft.us',  label: 'Microsoft' },
  { s: 'googl.us', label: 'Google' },
  { s: 'amzn.us',  label: 'Amazon' },
  { s: 'meta.us',  label: 'Meta' },
  { s: 'nvda.us',  label: 'Nvidia' },
  { s: 'intc.us',  label: 'Intel' },
  { s: 'wix.us',   label: 'Wix' },
  { s: 'sedg.us',  label: 'SolarEdge' },
];

// Yahoo Finance v8 — TASE stocks (returns last known price even when market closed)
const TASE = [
  { s: 'TA35.TA',  label: 'ת"א 35' },
  { s: '^TA125.TA', label: 'ת"א 125' },
  { s: 'SKBN.TA',  label: 'שיכון ובינוי' },
  { s: 'ASHG.TA',  label: 'אשטרום' },
  { s: 'SPEN.TA',   label: 'שפיר' },
  { s: 'AZRG.TA',   label: 'עזריאלי' },
  { s: 'GVYM.TA',   label: 'גב ים' },
  { s: 'AMOT.TA',   label: 'אמות' },
  { s: 'ESLT.TA',   label: 'אלביט מערכות' },
];

function get(url, ms = 6000) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': '*/*',
      },
    }, res => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => resolve(body));
    });
    req.setTimeout(ms, () => { req.destroy(); reject(new Error('Timeout')); });
    req.on('error', reject);
  });
}

async function stooqQuote({ s, label, currency }) {
  try {
    const csv = await get(`https://stooq.com/q/l/?s=${encodeURIComponent(s)}&f=sd2t2ohlcv&h&e=csv`);
    const lines = csv.trim().split('\n');
    if (lines.length < 2) return null;
    const p = lines[1].split(',');
    if (p.length < 7 || p[1] === 'N/D' || p[6] === 'N/D') return null;
    const close = parseFloat(p[6]), open = parseFloat(p[3]);
    if (isNaN(close) || isNaN(open) || open === 0) return null;
    return { label, price: close, pct: ((close - open) / open) * 100, currency: !!currency };
  } catch { return null; }
}

async function taseQuote({ s, label }) {
  try {
    const body = await get(`https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(s)}?interval=1d&range=2d`);
    const meta = JSON.parse(body)?.chart?.result?.[0]?.meta;
    if (!meta?.regularMarketPrice) return null;
    const price = meta.regularMarketPrice;
    const prev = meta.chartPreviousClose || price;
    return { label, price, pct: ((price - prev) / prev) * 100, currency: false };
  } catch { return null; }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'public, s-maxage=3600');

  const [stooqResults, taseResults] = await Promise.all([
    Promise.all(STOOQ.map(stooqQuote)),
    Promise.all(TASE.map(taseQuote)),
  ]);

  const data = [...stooqResults, ...taseResults].filter(Boolean);

res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ data, ts: Date.now() }));
}
