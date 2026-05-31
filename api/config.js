export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.writeHead(200, { 'Content-Type': 'application/json' });
  // PROXY_URL env var set in Vercel dashboard (no rebuild needed when changed)
  res.end(JSON.stringify({ proxyUrl: process.env.PROXY_URL || '' }));
}
