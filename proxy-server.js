import { createServer } from 'http';
import https from 'https';
import http from 'http';
import { URL } from 'url';

const PORT = 3001;

createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  if (req.method !== 'GET') {
    res.writeHead(405); res.end(); return;
  }

  const parsed = new URL(req.url, `http://localhost:${PORT}`);
  if (parsed.pathname !== '/rss') {
    res.writeHead(404); res.end('Not found'); return;
  }

  const targetUrl = parsed.searchParams.get('url');
  if (!targetUrl) {
    res.writeHead(400); res.end('Missing url param'); return;
  }

  let target;
  try { target = new URL(targetUrl); }
  catch { res.writeHead(400); res.end('Invalid url'); return; }

  const mod = target.protocol === 'https:' ? https : http;

  const options = {
    hostname: target.hostname,
    port: target.port || (target.protocol === 'https:' ? 443 : 80),
    path: target.pathname + target.search,
    method: 'GET',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Accept': 'application/rss+xml,application/xml;q=0.9,text/xml;q=0.8,*/*;q=0.5',
      'Accept-Language': 'he-IL,he;q=0.9,en-US;q=0.8',
      'Cache-Control': 'no-cache',
    },
  };

  const proxyReq = mod.request(options, (proxyRes) => {
    const ct = proxyRes.headers['content-type'] || 'application/xml; charset=utf-8';
    res.writeHead(proxyRes.statusCode, { 'Content-Type': ct });
    proxyRes.pipe(res);
  });

  proxyReq.setTimeout(12000, () => {
    proxyReq.destroy();
    if (!res.headersSent) { res.writeHead(504); res.end('Timeout'); }
  });

  proxyReq.on('error', (e) => {
    if (!res.headersSent) { res.writeHead(502); res.end(e.message); }
  });

  proxyReq.end();

}).listen(PORT, () => console.log(`RSS proxy on http://localhost:${PORT}`));
