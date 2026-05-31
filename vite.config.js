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

      // Market data: Stooq for US/FX, Yahoo Finance v8 for TASE
      server.middlewares.use('/api/market', async (req, res) => {
        res.setHeader('Access-Control-Allow-Origin', '*')
        const STOOQ = [
          { s: 'usdils', label: 'דולר/ש"ח', currency: true }, { s: 'eurils', label: 'יורו/ש"ח', currency: true },
          { s: '^spx', label: 'S&P 500' }, { s: '^ndq', label: 'נאסד"ק' },
          { s: 'msft.us', label: 'Microsoft' }, { s: 'googl.us', label: 'Google' },
          { s: 'amzn.us', label: 'Amazon' }, { s: 'meta.us', label: 'Meta' },
          { s: 'nvda.us', label: 'Nvidia' }, { s: 'intc.us', label: 'Intel' },
          { s: 'wix.us', label: 'Wix' }, { s: 'sedg.us', label: 'SolarEdge' },
        ]
        const TASE = [
          { s: 'TA35.TA', label: 'ת"א 35' }, { s: '^TA125.TA', label: 'ת"א 125' },
          { s: 'SKBN.TA', label: 'שיכון ובינוי' }, { s: 'ASHG.TA', label: 'אשטרום' },
          { s: 'ISCN.TA', label: 'ישראל קנדה' }, { s: 'SPEN.TA', label: 'שפיר' },
          { s: 'AZRG.TA', label: 'עזריאלי' }, { s: 'GVYM.TA', label: 'גב ים' },
          { s: 'AMOT.TA', label: 'אמות' }, { s: 'ESLT.TA', label: 'אלביט מערכות' },
        ]
        const readBody = upstream => new Promise(r => { let b = ''; upstream.on('data', c => b += c); upstream.on('end', () => r(b)); })
        const parseCsv = csv => {
          const p = csv.trim().split('\n')[1]?.split(',')
          if (!p || p.length < 7 || p[1] === 'N/D') return null
          const close = parseFloat(p[6]), open = parseFloat(p[3])
          return (!isNaN(close) && open > 0) ? { price: close, pct: ((close - open) / open) * 100 } : null
        }
        const stooqQ = async ({ s, label, currency }) => {
          try {
            const u = await fetchUrl(`https://stooq.com/q/l/?s=${encodeURIComponent(s)}&f=sd2t2ohlcv&h&e=csv`, 0, 5000)
            const d = parseCsv(await readBody(u)); if (!d) return null
            return { label, price: d.price, pct: d.pct, currency: !!currency }
          } catch { return null }
        }
        const taseQ = async ({ s, label }) => {
          try {
            const u = await fetchUrl(`https://query2.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(s)}?interval=1d&range=2d`, 1, 6000)
            const body = await readBody(u)
            const meta = JSON.parse(body)?.chart?.result?.[0]?.meta
            if (!meta?.regularMarketPrice) return null
            const price = meta.regularMarketPrice, prev = meta.chartPreviousClose || price
            return { label, price, pct: ((price - prev) / prev) * 100, currency: false }
          } catch { return null }
        }
        const [sr, tr] = await Promise.all([Promise.all(STOOQ.map(stooqQ)), Promise.all(TASE.map(taseQ))])
        const data = [...sr, ...tr].filter(Boolean)
        res.writeHead(200, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ data, ts: Date.now() }))
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
