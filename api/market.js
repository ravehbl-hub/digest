import https from 'https';

// Twelve Data symbols
// US stocks & indices use plain tickers; TASE needs :TASE suffix; forex uses slash format
const SYMBOLS = [
  { key: 'USD/ILS',      label: 'דולר/ש"ח',       currency: true },
  { key: 'EUR/ILS',      label: 'יורו/ש"ח',        currency: true },
  { key: 'SPX',          label: 'S&P 500' },
  { key: 'IXIC',         label: 'נאסד"ק' },
  { key: 'MSFT',         label: 'Microsoft' },
  { key: 'GOOGL',        label: 'Google' },
  { key: 'AMZN',         label: 'Amazon' },
  { key: 'META',         label: 'Meta' },
  { key: 'NVDA',         label: 'Nvidia' },
  { key: 'INTC',         label: 'Intel' },
  { key: 'WIX',          label: 'Wix' },
  { key: 'SEDG',         label: 'SolarEdge' },
  { key: 'AZRG:TASE',    label: 'עזריאלי' },
  { key: 'ESLT:TASE',    label: 'אלביט מערכות' },
  { key: 'SKBN:TASE',    label: 'שיכון ובינוי' },
  { key: 'ASHG:TASE',    label: 'אשטרום' },
  { key: 'CANA:TASE',    label: 'קנדה ישראל' },
  { key: 'SPEN:TASE',    label: 'שפיר' },
  { key: 'GVYM:TASE',    label: 'גב ים' },
  { key: 'AMOT:TASE',    label: 'אמות' },
  { key: 'TA35:TASE',    label: 'ת"א 35' },
  { key: 'TA125:TASE',   label: 'ת"א 125' },
];

const LABEL_MAP = Object.fromEntries(SYMBOLS.map(s => [s.key, s]));

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' },
    }, res => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => { try { resolve(JSON.parse(body)); } catch { reject(new Error('JSON parse')); } });
    });
    req.setTimeout(25000, () => { req.destroy(); reject(new Error('Timeout')); });
    req.on('error', reject);
  });
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'public, s-maxage=3600');

  const apiKey = process.env.TWELVE_DATA_KEY;
  if (!apiKey) {
    res.writeHead(500);
    res.end(JSON.stringify({ error: 'TWELVE_DATA_KEY not set', data: [] }));
    return;
  }

  const symbolList = SYMBOLS.map(s => s.key).join(',');
  const url = `https://api.twelvedata.com/quote?symbol=${encodeURIComponent(symbolList)}&apikey=${apiKey}&dp=2`;

  try {
    const raw = await fetchJson(url);

    // Debug: return raw response when ?debug=1
    if (new URL(req.url, 'https://x').searchParams.get('debug') === '1') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(raw, null, 2));
      return;
    }

    const data = SYMBOLS.map(({ key, label, currency }) => {
      const q = raw[key];
      if (!q || q.status === 'error' || !q.close) return null;
      const price = parseFloat(q.close);
      const pct = parseFloat(q.percent_change || 0);
      if (isNaN(price)) return null;
      return { label, price, pct, currency: !!currency };
    }).filter(Boolean);

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ data, ts: Date.now() }));
  } catch (e) {
    res.writeHead(502, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: e.message, data: [] }));
  }
}
