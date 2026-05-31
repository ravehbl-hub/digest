import https from 'https';

const LABELS = {
  'USDILS=X':  { label: 'דולר/ש"ח',       currency: true },
  'EURILS=X':  { label: 'יורו/ש"ח',        currency: true },
  '^TA35.TA':  { label: 'ת"א 35' },
  '^TA125.TA': { label: 'ת"א 125' },
  'SKBN.TA':   { label: 'שיכון ובינוי' },
  'ASHG.TA':   { label: 'אשטרום' },
  'CANA.TA':   { label: 'קנדה ישראל' },
  'SPEN.TA':   { label: 'שפיר' },
  'AZRG.TA':   { label: 'עזריאלי' },
  'GVYM.TA':   { label: 'גב ים' },
  'AMOT.TA':   { label: 'אמות' },
  'ESLT.TA':   { label: 'אלביט מערכות' },
  '^GSPC':     { label: 'S&P 500' },
  '^IXIC':     { label: 'נאסד"ק' },
  'GOOGL':     { label: 'Google' },
  'AMZN':      { label: 'Amazon' },
  'META':      { label: 'Meta' },
  'NVDA':      { label: 'Nvidia' },
  'INTC':      { label: 'Intel' },
  'MSFT':      { label: 'Microsoft' },
  'WIX':       { label: 'Wix' },
  'SEDG':      { label: 'SolarEdge' },
};

const SYMBOLS = Object.keys(LABELS).join(',');

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    }, (res) => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => { try { resolve(JSON.parse(body)); } catch { reject(new Error('JSON')); } });
    });
    req.setTimeout(10000, () => { req.destroy(); reject(new Error('Timeout')); });
    req.on('error', reject);
  });
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'public, s-maxage=3600');

  try {
    const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${SYMBOLS}&fields=regularMarketPrice,regularMarketChangePercent,regularMarketPreviousClose`;
    const d = await fetchJson(url);
    const quotes = d?.quoteResponse?.result || [];

    const data = quotes.map(q => {
      const meta = LABELS[q.symbol];
      if (!meta || !q.regularMarketPrice) return null;
      return {
        symbol: q.symbol,
        label: meta.label,
        price: q.regularMarketPrice,
        pct: q.regularMarketChangePercent || 0,
        currency: meta.currency || false,
      };
    }).filter(Boolean);

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ data, ts: Date.now() }));
  } catch (e) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ data: [], error: e.message }));
  }
}
