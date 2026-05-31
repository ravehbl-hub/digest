import https from 'https';

// Stooq symbols — free, no API key, fast
const SYMBOLS = [
  { s: 'usdils',    label: 'דולר/ש"ח',       currency: true },
  { s: 'eurils',    label: 'יורו/ש"ח',        currency: true },
  { s: '^spx',      label: 'S&P 500' },
  { s: '^ndq',      label: 'נאסד"ק' },
  { s: 'ta35.tl',   label: 'ת"א 35' },
  { s: 'ta125.tl',  label: 'ת"א 125' },
  { s: 'msft.us',   label: 'Microsoft' },
  { s: 'googl.us',  label: 'Google' },
  { s: 'amzn.us',   label: 'Amazon' },
  { s: 'meta.us',   label: 'Meta' },
  { s: 'nvda.us',   label: 'Nvidia' },
  { s: 'intc.us',   label: 'Intel' },
  { s: 'wix.us',    label: 'Wix' },
  { s: 'sedg.us',   label: 'SolarEdge' },
  { s: 'skbn.il',   label: 'שיכון ובינוי' },
  { s: 'ashg.il',   label: 'אשטרום' },
  { s: 'cana.il',   label: 'קנדה ישראל' },
  { s: 'spen.il',   label: 'שפיר' },
  { s: 'azrg.il',   label: 'עזריאלי' },
  { s: 'gvym.il',   label: 'גב ים' },
  { s: 'amot.il',   label: 'אמות' },
  { s: 'eslt.il',   label: 'אלביט מערכות' },
];

function fetchText(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'text/csv,text/plain,*/*' },
    }, (res) => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => resolve(body));
    });
    req.setTimeout(5000, () => { req.destroy(); reject(new Error('Timeout')); });
    req.on('error', reject);
  });
}

// CSV: Symbol,Date,Time,Open,High,Low,Close,Volume
function parseCsv(csv) {
  const lines = csv.trim().split('\n');
  if (lines.length < 2) return null;
  const parts = lines[1].split(',');
  if (parts.length < 7) return null;
  if (parts[1] === 'N/D' || parts[6] === 'N/D') return null; // market closed
  const close = parseFloat(parts[6]);
  const open = parseFloat(parts[3]);
  if (isNaN(close) || isNaN(open) || open === 0) return null;
  return { close, pct: ((close - open) / open) * 100 };
}

async function getQuote({ s, label, currency }) {
  try {
    const csv = await fetchText(`https://stooq.com/q/l/?s=${encodeURIComponent(s)}&f=sd2t2ohlcv&h&e=csv`);
    const data = parseCsv(csv);
    if (!data) return null;
    return { symbol: s, label, price: data.close, pct: data.pct, currency: !!currency };
  } catch { return null; }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'public, s-maxage=3600');

  const results = await Promise.all(SYMBOLS.map(getQuote));
  const data = results.filter(Boolean);

  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ data, ts: Date.now() }));
}
