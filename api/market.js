import https from 'https';

const SYMBOLS = [
  { symbol: 'USDILS=X',   label: 'דולר/ש"ח',       currency: true },
  { symbol: 'EURILS=X',   label: 'יורו/ש"ח',        currency: true },
  { symbol: '^TA35.TA',   label: 'ת"א 35' },
  { symbol: '^TA125.TA',  label: 'ת"א 125' },
  { symbol: 'SKBN.TA',    label: 'שיכון ובינוי' },
  { symbol: 'ASHG.TA',    label: 'אשטרום' },
  { symbol: 'CANA.TA',    label: 'קנדה ישראל' },
  { symbol: 'SPEN.TA',    label: 'שפיר' },
  { symbol: 'AZRG.TA',    label: 'עזריאלי' },
  { symbol: 'GVYM.TA',    label: 'גב ים' },
  { symbol: 'AMOT.TA',    label: 'אמות' },
  { symbol: 'ESLT.TA',    label: 'אלביט מערכות' },
  { symbol: '^GSPC',      label: 'S&P 500' },
  { symbol: '^IXIC',      label: 'נאסד"ק' },
  { symbol: 'GOOGL',      label: 'Google' },
  { symbol: 'AMZN',       label: 'Amazon' },
  { symbol: 'META',       label: 'Meta' },
  { symbol: 'NVDA',       label: 'Nvidia' },
  { symbol: 'INTC',       label: 'Intel' },
  { symbol: 'MSFT',       label: 'Microsoft' },
  { symbol: 'WIX',        label: 'Wix' },
  { symbol: 'SEDG',       label: 'SolarEdge' },
];

function fetchWithTimeout(url, ms) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
      },
    }, (res) => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => { try { resolve(JSON.parse(body)); } catch { reject(new Error('JSON')); } });
    });
    req.setTimeout(ms, () => { req.destroy(); reject(new Error('Timeout')); });
    req.on('error', reject);
  });
}

// Wrap each quote with its own timeout so slow ones don't block others
function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise(resolve => setTimeout(() => resolve(null), ms)),
  ]);
}

async function getQuote({ symbol, label, currency }) {
  try {
    const enc = encodeURIComponent(symbol);
    const d = await fetchWithTimeout(
      `https://query2.finance.yahoo.com/v8/finance/chart/${enc}?interval=1d&range=2d`,
      4500,
    );
    const meta = d?.chart?.result?.[0]?.meta;
    if (!meta?.regularMarketPrice) return null;
    const price = meta.regularMarketPrice;
    const prev = meta.chartPreviousClose || price;
    return { symbol, label, price, pct: ((price - prev) / prev) * 100, currency: !!currency };
  } catch { return null; }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'public, s-maxage=3600');

  // Each quote times out at 4.5s; overall deadline 8s (Vercel limit is 10s)
  const results = await Promise.all(
    SYMBOLS.map(s => withTimeout(getQuote(s), 4500))
  );
  const data = results.filter(Boolean);

  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ data, ts: Date.now() }));
}
