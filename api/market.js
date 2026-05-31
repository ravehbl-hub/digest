import https from 'https';

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' },
    }, (res) => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => { try { resolve(JSON.parse(body)); } catch { reject(new Error('JSON')); } });
    });
    req.setTimeout(8000, () => { req.destroy(); reject(new Error('Timeout')); });
    req.on('error', reject);
  });
}

async function getStock(symbol, label) {
  try {
    const enc = encodeURIComponent(symbol);
    const d = await fetchJson(`https://query1.finance.yahoo.com/v8/finance/chart/${enc}?interval=1d&range=2d`);
    const meta = d?.chart?.result?.[0]?.meta;
    if (!meta?.regularMarketPrice) return null;
    const price = meta.regularMarketPrice;
    const prev = meta.chartPreviousClose || meta.previousClose || price;
    const pct = ((price - prev) / prev) * 100;
    return { symbol, label, price, pct };
  } catch { return null; }
}

async function getCurrency(base, to, label) {
  try {
    const d = await fetchJson(`https://api.frankfurter.app/latest?base=${base}&symbols=${to}`);
    const rate = d?.rates?.[to];
    if (!rate) return null;
    return { label, rate, from: base, to };
  } catch { return null; }
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'public, s-maxage=3600');

  const symbols = [
    // Currencies via Yahoo Finance FX pairs
    () => getStock('USDILS=X', 'דולר/ש"ח'),
    () => getStock('EURILS=X', 'יורו/ש"ח'),

    // Israeli indices
    () => getStock('^TA35.TA',  'ת"א 35'),
    () => getStock('^TA125.TA', 'ת"א 100'),

    // Israeli stocks (TASE)
    () => getStock('SKBN.TA', 'שיכון ובינוי'),
    () => getStock('ASHG.TA', 'אשטרום'),
    () => getStock('CANA.TA', 'קנדה ישראל'),
    () => getStock('SPEN.TA', 'שפיר'),
    () => getStock('AZRG.TA', 'עזריאלי'),
    () => getStock('GVYM.TA', 'גב ים'),
    () => getStock('AMOT.TA', 'אמות'),
    () => getStock('ESLT.TA', 'אלביט מערכות'),

    // Global indices
    () => getStock('^GSPC',  'S&P 500'),
    () => getStock('^IXIC',  'נאסד"ק'),

    // US tech
    () => getStock('GOOGL', 'Google'),
    () => getStock('AMZN',  'Amazon'),
    () => getStock('META',  'Meta'),
    () => getStock('NVDA',  'Nvidia'),
    () => getStock('INTC',  'Intel'),
    () => getStock('MSFT',  'Microsoft'),
    () => getStock('WIX',   'Wix'),
    () => getStock('SEDG',  'SolarEdge'),
  ];

  const results = await Promise.allSettled(symbols.map(fn => fn()));
  const data = results.map(r => r.status === 'fulfilled' ? r.value : null).filter(Boolean);

  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ data, ts: Date.now() }));
}
