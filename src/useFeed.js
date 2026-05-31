import { useState, useCallback } from 'react';

const CACHE_TTL = 5 * 60 * 1000;
const cache = new Map();
const BATCH_SIZE = 3;
const BATCH_DELAY = 600;

// --- Helpers ---

function stripHtml(str) {
  return (str || '')
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ').trim();
}

function extractImage(html) {
  const m = (html || '').match(/<img[^>]+src=["']([^"']+)["']/i);
  return m ? m[1] : null;
}

function parsePubDate(str) {
  if (!str) return null;
  const d = new Date(str.trim());
  return isNaN(d.getTime()) ? null : d;
}

function firstTag(el, ...names) {
  for (const name of names) {
    const found = el.getElementsByTagName(name)[0];
    if (found) return found.textContent || '';
  }
  return '';
}

// --- RSS / Atom XML parser ---

function parseXML(xmlText) {
  const doc = new DOMParser().parseFromString(xmlText, 'text/xml');
  if (doc.querySelector('parsererror')) throw new Error('XML parse error');

  // RSS 2.0
  const rssItems = Array.from(doc.querySelectorAll('item')).slice(0, 15);
  if (rssItems.length > 0) {
    return {
      title: doc.querySelector('channel > title')?.textContent?.trim() || '',
      items: rssItems.map(item => {
        const rawDesc = firstTag(item, 'description', 'content:encoded', 'content');
        const rawLink = item.querySelector('link')?.textContent?.trim()
          || item.querySelector('link')?.getAttribute('href') || '';
        // Rewrite nitter links → x.com
        const link = rawLink.replace(/^https?:\/\/nitter\.[^/]+\//, 'https://x.com/');
        return {
          id: firstTag(item, 'guid') || link,
          title: stripHtml(firstTag(item, 'title')),
          description: stripHtml(rawDesc).slice(0, 230),
          link,
          pubDate: parsePubDate(firstTag(item, 'pubDate', 'dc:date')),
          thumbnail:
            item.querySelector('enclosure[type^="image"]')?.getAttribute('url') ||
            item.getElementsByTagName('media:thumbnail')[0]?.getAttribute('url') ||
            item.getElementsByTagName('media:content')[0]?.getAttribute('url') ||
            extractImage(rawDesc),
        };
      }),
    };
  }

  // Atom
  const entries = Array.from(doc.querySelectorAll('entry')).slice(0, 15);
  if (entries.length > 0) {
    return {
      title: doc.querySelector('feed > title')?.textContent?.trim() || '',
      items: entries.map(entry => {
        const content = firstTag(entry, 'content', 'summary');
        const link =
          entry.querySelector('link[rel="alternate"]')?.getAttribute('href') ||
          entry.querySelector('link:not([rel])')?.getAttribute('href') ||
          entry.querySelector('link')?.getAttribute('href') || '';
        return {
          id: firstTag(entry, 'id') || link,
          title: stripHtml(firstTag(entry, 'title')),
          description: stripHtml(content).slice(0, 230),
          link,
          pubDate: parsePubDate(firstTag(entry, 'published', 'updated')),
          thumbnail: extractImage(content),
        };
      }),
    };
  }

  throw new Error('Empty feed');
}

// --- Telegram channel HTML parser ---
// Parses https://t.me/s/<channel> web preview pages

function isTelegramUrl(url) {
  return /^https?:\/\/t\.me\/s\//i.test(url);
}

function parseTelegram(html) {
  const doc = new DOMParser().parseFromString(html, 'text/html');

  const channelName =
    doc.querySelector('.tgme_channel_info_header_title')?.textContent?.trim() ||
    doc.querySelector('meta[property="og:title"]')?.getAttribute('content') ||
    'Telegram';

  const messages = Array.from(
    doc.querySelectorAll('.tgme_widget_message_wrap')
  ).reverse().slice(0, 15); // newest first

  const items = messages.map(wrap => {
    const msgEl = wrap.querySelector('.tgme_widget_message');
    const postId = msgEl?.getAttribute('data-post') || '';

    // Permalink and date
    const dateLink = wrap.querySelector('a.tgme_widget_message_date');
    const permalink = dateLink?.href || (postId ? `https://t.me/${postId}` : '');
    const datetime = wrap.querySelector('time')?.getAttribute('datetime');

    const msgText = wrap.querySelector('.tgme_widget_message_text');

    // Find article link:
    // 1. link_preview card (image/card preview)
    // 2. First external <a> link inside message text (e.g. "קישור לכתבה", highlighted title)
    const previewLink = wrap.querySelector('a.tgme_widget_message_link_preview');
    const inlineLinks = Array.from(
      (msgText || wrap).querySelectorAll('a[href]')
    ).filter(a => {
      const href = a.getAttribute('href') || '';
      return href.startsWith('http') &&
        !href.includes('t.me/') &&
        !href.includes('telegram.org') &&
        !href.includes('t.co/');
    });
    const inlineArticleLink = inlineLinks[0]?.getAttribute('href') || null;
    const articleLink = previewLink?.href || inlineArticleLink || null;

    // Title: link_preview_title → inline link text (e.g. highlighted article title) → first bold → message text
    const previewTitle = wrap.querySelector('.link_preview_title')?.textContent?.trim();
    const inlineLinkText = inlineLinks[0]?.textContent?.trim();
    const firstBold = msgText?.querySelector('b')?.textContent?.trim();
    const title = previewTitle ||
      (inlineLinkText && inlineLinkText.length > 5 ? inlineLinkText : null) ||
      firstBold ||
      stripHtml(msgText?.innerHTML || '').slice(0, 80) || 'הודעה';

    // Description: link_preview_description → message text
    const previewDesc = wrap.querySelector('.link_preview_description')?.textContent?.trim();
    const msgBody = stripHtml(msgText?.innerHTML || '').slice(0, 230);
    const description = previewDesc || msgBody;

    // Thumbnail: link_preview_image background-image → photo wrap
    let thumbnail = null;
    const previewImg = wrap.querySelector('.link_preview_image');
    if (previewImg) {
      const style = previewImg.getAttribute('style') || '';
      const m = style.match(/url\(['"]?([^'")\s]+)['"]?\)/);
      if (m) thumbnail = m[1].replace(/^\/\//, 'https://');
    }
    if (!thumbnail) {
      const photoWrap = wrap.querySelector('.tgme_widget_message_photo_wrap');
      if (photoWrap) {
        const style = photoWrap.getAttribute('style') || '';
        const m = style.match(/url\(['"]?([^'")\s]+)['"]?\)/);
        if (m) thumbnail = m[1].replace(/^\/\//, 'https://');
      }
    }

    return {
      id: permalink || postId,
      title,
      description,
      link: permalink,        // card opens Telegram post
      articleLink,            // "Read more" opens the actual article
      pubDate: parsePubDate(datetime),
      thumbnail,
    };
  }).filter(item => item.title);

  return { title: channelName, items };
}

// --- Timeout fetch ---

function fetchWithTimeout(url, ms = 12000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  return fetch(url, { signal: controller.signal }).finally(() => clearTimeout(id));
}

// --- Proxy strategies ---

// Vercel serverless function / Vite dev middleware
async function tryLocalProxy(feedUrl) {
  const res = await fetchWithTimeout(`/api/rss?url=${encodeURIComponent(feedUrl)}`);
  if (!res.ok) throw new Error(`local proxy ${res.status}`);
  const text = await res.text();
  if (!text.trim()) throw new Error('local proxy empty');
  if (isTelegramUrl(feedUrl)) return parseTelegram(text);
  return parseXML(text);
}


async function tryCorsproxy(feedUrl) {
  const res = await fetchWithTimeout(`https://corsproxy.io/?${encodeURIComponent(feedUrl)}`);
  if (!res.ok) throw new Error(`corsproxy ${res.status}`);
  const text = await res.text();
  if (isTelegramUrl(feedUrl)) return parseTelegram(text);
  return parseXML(text);
}

async function tryAllOrigins(feedUrl) {
  const res = await fetchWithTimeout(`https://api.allorigins.win/raw?url=${encodeURIComponent(feedUrl)}`);
  if (!res.ok) throw new Error(`allorigins ${res.status}`);
  const text = await res.text();
  if (!text.trim()) throw new Error('allorigins empty');
  if (isTelegramUrl(feedUrl)) return parseTelegram(text);
  return parseXML(text);
}

async function tryRss2Json(feedUrl) {
  if (isTelegramUrl(feedUrl)) throw new Error('rss2json cannot handle Telegram');
  const res = await fetchWithTimeout(
    `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(feedUrl)}&count=15`
  );
  if (!res.ok) throw new Error(`rss2json ${res.status}`);
  const j = await res.json();
  if (j.status !== 'ok') throw new Error(j.message || 'rss2json error');
  return {
    title: j.feed?.title || '',
    items: (j.items || []).map(it => ({
      id: it.guid || it.link,
      title: it.title,
      description: stripHtml(it.description || it.content || '').slice(0, 230),
      link: it.link,
      pubDate: it.pubDate ? new Date(it.pubDate) : null,
      thumbnail: it.thumbnail || extractImage(it.description || ''),
    })),
  };
}

async function fetchFeed(url) {
  const cached = cache.get(url);
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.data;

  for (const strategy of [tryLocalProxy, tryCorsproxy, tryAllOrigins, tryRss2Json]) {
    try {
      const data = await strategy(url);
      cache.set(url, { ts: Date.now(), data });
      return data;
    } catch (_) { /* try next */ }
  }
  throw new Error('All proxies failed');
}

// --- Hook ---

export function useFeed() {
  const [feedData, setFeedData] = useState({});
  const [loading, setLoading] = useState({});
  const [errors, setErrors] = useState({});

  const loadSource = useCallback(async (source) => {
    setLoading(prev => ({ ...prev, [source.id]: true }));
    setErrors(prev => { const n = { ...prev }; delete n[source.id]; return n; });
    try {
      const data = await fetchFeed(source.url);
      setFeedData(prev => ({ ...prev, [source.id]: data }));
    } catch (e) {
      setErrors(prev => ({ ...prev, [source.id]: e.message }));
    } finally {
      setLoading(prev => { const n = { ...prev }; delete n[source.id]; return n; });
    }
  }, []);

  const loadAll = useCallback(async (sources) => {
    const active = sources.filter(s => s.active);
    for (let i = 0; i < active.length; i += BATCH_SIZE) {
      const batch = active.slice(i, i + BATCH_SIZE);
      await Promise.all(batch.map(loadSource));
      if (i + BATCH_SIZE < active.length) {
        await new Promise(r => setTimeout(r, BATCH_DELAY));
      }
    }
  }, [loadSource]);

  const clearCache = useCallback(() => cache.clear(), []);

  return { feedData, loading, errors, loadSource, loadAll, clearCache };
}
