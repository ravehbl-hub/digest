import https from 'https';
import http from 'http';
import { URL } from 'url';

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

function fetchUrl(targetUrl, redirectsLeft, timeoutMs) {
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
        fetchUrl(new URL(headers.location, targetUrl).href, redirectsLeft - 1, timeoutMs)
          .then(resolve).catch(reject);
        return;
      }
      resolve(upstream);
    });

    req.setTimeout(timeoutMs, () => { req.destroy(); reject(new Error('Timeout')); });
    req.on('error', reject);
    req.end();
  });
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');

  const { searchParams } = new URL(req.url, `https://${req.headers.host}`);
  const targetUrl = searchParams.get('url');
  if (!targetUrl) { res.writeHead(400); res.end('Missing url'); return; }

  try {
    const upstream = await fetchUrl(targetUrl, 5, 12000);
    res.writeHead(upstream.statusCode, {
      'Content-Type': upstream.headers['content-type'] || 'application/xml; charset=utf-8',
    });
    upstream.pipe(res);
  } catch (e) {
    if (!res.headersSent) { res.writeHead(502); res.end(e.message); }
  }
}
