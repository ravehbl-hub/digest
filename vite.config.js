import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import https from 'https'
import http from 'http'
import { URL } from 'url'

const BROWSER_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'application/rss+xml,application/xml;q=0.9,text/html;q=0.8,*/*;q=0.5',
  'Accept-Language': 'he-IL,he;q=0.9,en-US;q=0.8',
  'Cache-Control': 'no-cache',
}

function fetchUrl(targetUrl, redirectsLeft, timeoutMs) {
  return new Promise((resolve, reject) => {
    let target
    try { target = new URL(targetUrl) } catch (e) { return reject(e) }

    const mod = target.protocol === 'https:' ? https : http
    const options = {
      hostname: target.hostname,
      port: target.port || (target.protocol === 'https:' ? 443 : 80),
      path: target.pathname + target.search,
      method: 'GET',
      headers: { ...BROWSER_HEADERS, 'Host': target.hostname },
    }

    const req = mod.request(options, (res) => {
      const status = res.statusCode
      // Follow 301 / 302 / 307 / 308 redirects server-side
      if ((status === 301 || status === 302 || status === 307 || status === 308) && res.headers.location && redirectsLeft > 0) {
        res.resume() // discard body
        const next = new URL(res.headers.location, targetUrl).href
        fetchUrl(next, redirectsLeft - 1, timeoutMs).then(resolve).catch(reject)
        return
      }
      resolve(res)
    })

    req.setTimeout(timeoutMs, () => { req.destroy(); reject(new Error('Timeout')) })
    req.on('error', reject)
    req.end()
  })
}

function rssProxyPlugin() {
  return {
    name: 'rss-proxy',
    configureServer(server) {

      // Translation proxy — calls unofficial Google Translate API server-side (no CORS/key needed)
      server.middlewares.use('/api/translate', async (req, res) => {
        res.setHeader('Access-Control-Allow-Origin', '*')
        const parsed = new URL(req.url, 'http://localhost')
        const text = parsed.searchParams.get('text')
        const from = parsed.searchParams.get('from') || 'he'
        const to = parsed.searchParams.get('to') || 'en'
        if (!text) { res.writeHead(400); res.end('Missing text'); return }

        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${from}&tl=${to}&dt=t&q=${encodeURIComponent(text)}`
        try {
          const upstream = await fetchUrl(url, 2, 8000)
          res.setHeader('Content-Type', 'application/json; charset=utf-8')
          res.writeHead(upstream.statusCode)
          upstream.pipe(res)
        } catch (e) {
          if (!res.headersSent) { res.writeHead(502); res.end(e.message) }
        }
      })

      server.middlewares.use('/api/rss', async (req, res) => {
        res.setHeader('Access-Control-Allow-Origin', '*')
        res.setHeader('Access-Control-Allow-Methods', 'GET')

        if (req.method !== 'GET') { res.writeHead(405); res.end(); return }

        const parsed = new URL(req.url, 'http://localhost')
        const targetUrl = parsed.searchParams.get('url')
        if (!targetUrl) { res.writeHead(400); res.end('Missing url'); return }

        try {
          const upstream = await fetchUrl(targetUrl, 5, 12000)
          const ct = upstream.headers['content-type'] || 'application/xml; charset=utf-8'
          res.writeHead(upstream.statusCode, { 'Content-Type': ct })
          upstream.pipe(res)
        } catch (e) {
          if (!res.headersSent) { res.writeHead(502); res.end(e.message) }
        }
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), rssProxyPlugin()],
})
