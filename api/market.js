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

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'application/json',
      },
    }, (res) => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => { try { resolve(JSON.parse(body)); } catch { reject(new Error('JSON')); } });
    });
    req.setTimeout(9000, () => { req.destroy(); reject(new Error('Timeout')); });
    req.on('error', reject);
  });
}

async function getQuote({ symbol, label, currency }) {
  try {
    const enc = encodeURIComponent(symbol);
    const d = await fetchJson(`https://query2.finance.yahoo.com/v8/finance/chart/${enc}?interval=1d&range=2d`);
    const meta = d?.chart?.result?.[0]?.meta;
    if (!meta?.regularMarketPrice) return null;
    const price = meta.regularMarketPrice;
    const prev = meta.chartPreviousClose || meta.previousClose || price;
    const pct = ((price - prev) / prev) * 100;
    return { symbol, label, price, pct, currency: currency || false };
  } catch { return null; }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'public, s-maxage=3600');

  const results = await Promise.allSettled(SYMBOLS.map(getQuote));
  const data = results.map(r => r.status === 'fulfilled' ? r.value : null).filter(Boolean);

  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ data, ts: Date.now() }));
}
