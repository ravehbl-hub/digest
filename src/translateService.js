// Translation cache + rate-limited queue using unofficial Google Translate API
const cache = new Map();
let inflight = 0;
const MAX_CONCURRENT = 5;
const pending = [];

function drain() {
  while (inflight < MAX_CONCURRENT && pending.length > 0) {
    const { text, from, to, resolve } = pending.shift();
    inflight++;

    fetch(`/api/translate?text=${encodeURIComponent(text)}&from=${from}&to=${to}`)
      .then(r => r.json())
      .then(data => {
        // Google Translate response: [[[translated, original, ...],...],...]
        const result = (data?.[0] || [])
          .map(chunk => chunk?.[0])
          .filter(Boolean)
          .join('') || text;
        const key = `${from}:${to}:${text}`;
        cache.set(key, result);
        resolve(result);
      })
      .catch(() => resolve(text))
      .finally(() => { inflight--; drain(); });
  }
}

export function translate(text, from = 'he', to = 'en') {
  if (!text?.trim()) return Promise.resolve(text);
  const key = `${from}:${to}:${text}`;
  if (cache.has(key)) return Promise.resolve(cache.get(key));
  return new Promise(resolve => {
    pending.push({ text, from, to, resolve });
    drain();
  });
}

export function clearTranslationCache() {
  cache.clear();
}
