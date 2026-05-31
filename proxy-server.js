import { createServer } from 'http';
import https from 'https';
import http from 'http';
import zlib from 'zlib';
import { URL } from 'url';

const PORT = process.env.PORT || 3001;

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'application/rss+xml,application/xml;q=0.9,text/html;q=0.8,*/*;q=0.5',
  'Accept-Language': 'he-IL,he;q=0.9,en-US;q=0.8',
  'Accept-Encoding': 'gzip, deflate, br',
  'Cache-Control': 'no-cache',
  'Pragma': 'no-cache',
  'Sec-Fetch-Dest': 'document',
  'Sec-Fetch-Mode': 'navigate',
  'Sec-Fetch-Site': 'none',
  'Upgrade-Insecure-Requests': '1',
};

function decompress(upstream) {
  const enc = upstream.headers['content-encoding'] || '';
  if (enc.includes('br')) return upstream.pipe(zlib.createBrotliDecompress());
  if (enc.includes('gzip')) return upstream.pipe(zlib.createGunzip());
  if (enc.includes('deflate')) return upstream.pipe(zlib.createInflate());
  return upstream;
}

function fetchUrl(targetUrl, redirectsLeft) {
  return new Promise((resolve, reject) => {
    let target;
    try { target = new URL(targetUrl); } catch (e) { return reject(e); }

    const mod = target.protocol === 'https:' ? https : http;
    const req = mod.request({
      hostname: target.hostname,
      port: target.port || (target.protocol === 'https:' ? 443 : 80),
      path: target.pathname + target.search,
      method: 'GET',
      headers: {
        ...HEADERS,
        'Host': target.hostname,
        'Referer': `${target.protocol}//${target.hostname}/`,
        'Origin': `${target.protocol}//${target.hostname}`,
      },
    }, (upstream) => {
      const { statusCode, headers } = upstream;
      if ([301, 302, 307, 308].includes(statusCode) && headers.location && redirectsLeft > 0) {
        upstream.resume();
        fetchUrl(new URL(headers.location, targetUrl).href, redirectsLeft - 1).then(resolve).catch(reject);
        return;
      }
      resolve({ statusCode, headers, stream: decompress(upstream) });
    });

    req.setTimeout(15000, () => { req.destroy(); reject(new Error('Timeout')); });
    req.on('error', reject);
    req.end();
  });
}

createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  if (req.method !== 'GET') { res.writeHead(405); res.end(); return; }

  const parsed = new URL(req.url, `http://localhost:${PORT}`);

  // Health check — any path except /rss
  if (!parsed.pathname.startsWith('/rss')) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', service: 'Digest RSS Proxy', path: parsed.pathname }));
    return;
  }

  const targetUrl = parsed.searchParams.get('url');
  if (!targetUrl) { res.writeHead(400); res.end('Missing url'); return; }

  try {
    const { statusCode, headers, stream } = await fetchUrl(targetUrl, 5);
    const ct = (headers['content-type'] || 'application/xml; charset=utf-8')
      .replace(/;\s*charset=[^;]*/i, '; charset=utf-8');
    res.writeHead(statusCode, { 'Content-Type': ct });
    stream.pipe(res);
    stream.on('error', () => { if (!res.headersSent) res.end(); });
  } catch (e) {
    if (!res.headersSent) { res.writeHead(502); res.end(e.message); }
  }
}).listen(PORT, () => console.log(`RSS proxy on port ${PORT}`));
