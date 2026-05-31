import { useState, useEffect, useCallback, useMemo } from 'react';
import { DEFAULT_SOURCES, CATEGORIES, SOURCES_VERSION } from './sources';
import { useFeed, initExternalProxy } from './useFeed';
import { t } from './i18n';
import NewsCard from './components/NewsCard';
import SourcesModal from './components/SourcesModal';
import './App.css';

const STORAGE_KEYS = { lang: 'digest_lang', sources: 'digest_sources', version: 'digest_sources_v' };

function loadStored(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : fallback;
  } catch { return fallback; }
}

function loadSources() {
  const storedVersion = loadStored(STORAGE_KEYS.version, 0);
  if (storedVersion !== SOURCES_VERSION) return DEFAULT_SOURCES;
  return loadStored(STORAGE_KEYS.sources, DEFAULT_SOURCES);
}

export default function App() {
  const [lang, setLang] = useState(() => loadStored(STORAGE_KEYS.lang, 'he'));
  const [sources, setSources] = useState(() => loadSources());
  const [activeCategory, setActiveCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [showSources, setShowSources] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(null);

  const { feedData, loading, errors, loadAll, clearCache } = useFeed();

  const isRtl = lang === 'he';

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.lang, JSON.stringify(lang));
    document.documentElement.dir = isRtl ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
  }, [lang, isRtl]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.sources, JSON.stringify(sources));
    localStorage.setItem(STORAGE_KEYS.version, JSON.stringify(SOURCES_VERSION));
  }, [sources]);

  const refresh = useCallback(() => {
    clearCache();
    loadAll(sources);
    setLastRefresh(new Date());
  }, [sources, loadAll, clearCache]);

  useEffect(() => {
    // Fetch Render proxy URL from /api/config, then load all feeds
    fetch('/api/config')
      .then(r => r.json())
      .then(d => initExternalProxy(d.proxyUrl))
      .catch(() => {})
      .finally(() => {
        loadAll(sources);
        setLastRefresh(new Date());
      });
  }, []);

  const activeSources = useMemo(
    () => sources.filter(s => s.active && (activeCategory === 'all' || s.category === activeCategory)),
    [sources, activeCategory]
  );

  const allArticles = useMemo(() => {
    const articles = [];
    activeSources.forEach(source => {
      const feed = feedData[source.id];
      if (!feed) return;
      feed.items.forEach(item => {
        const title = item.title?.toLowerCase() || '';
        const desc = item.description?.toLowerCase() || '';
        const q = search.toLowerCase();
        if (search && !title.includes(q) && !desc.includes(q)) return;
        articles.push({ ...item, sourceId: source.id, source });
      });
    });
    return articles.sort((a, b) => {
      if (!a.pubDate && !b.pubDate) return 0;
      if (!a.pubDate) return 1;
      if (!b.pubDate) return -1;
      return b.pubDate - a.pubDate;
    });
  }, [activeSources, feedData, search]);

  const isAnyLoading = Object.keys(loading).length > 0;
  const loadingCount = Object.keys(loading).length;

  return (
    <div className="app" dir={isRtl ? 'rtl' : 'ltr'}>
      <header className="header">
        <div className="header-top">
          <div className="brand">
            <h1>Digest</h1>
            <span className="brand-sub">{t('appSubtitle', lang)}</span>
          </div>
          <div className="header-actions">
            <button
              className="lang-toggle"
              onClick={() => setLang(l => l === 'he' ? 'en' : 'he')}
              title={t('language', lang)}
            >
              {lang === 'he' ? 'EN' : 'עב'}
            </button>
            <button className="icon-btn" onClick={() => setShowSources(true)} title={t('sources', lang)}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/>
                <line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/>
                <line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
              </svg>
            </button>
            <button
              className={`icon-btn${isAnyLoading ? ' spinning' : ''}`}
              onClick={refresh}
              disabled={isAnyLoading}
              title={t('refresh', lang)}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
                <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
              </svg>
            </button>
          </div>
        </div>

        <div className="search-bar">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={t('search', lang)}
            dir={isRtl ? 'rtl' : 'ltr'}
          />
          {search && <button className="clear-search" onClick={() => setSearch('')}>✕</button>}
        </div>

        <div className="category-tabs">
          {Object.entries(CATEGORIES).map(([key, val]) => (
            <button
              key={key}
              className={`cat-tab${activeCategory === key ? ' active' : ''}`}
              onClick={() => setActiveCategory(key)}
            >
              {lang === 'he' ? val.he : val.en}
            </button>
          ))}
        </div>
      </header>

      <div className="status-bar">
        {isAnyLoading ? (
          <span className="status-loading">
            <span className="dot-pulse" />
            {lang === 'he' ? `טוען ${loadingCount} מקורות...` : `Loading ${loadingCount} sources...`}
          </span>
        ) : (
          <span className="status-ok">
            {allArticles.length} {t('articles', lang)}
            {lastRefresh && ` · ${t('lastUpdated', lang)} ${lastRefresh.toLocaleTimeString(lang === 'he' ? 'he-IL' : 'en-US', { hour: '2-digit', minute: '2-digit' })}`}
          </span>
        )}
      </div>

      <main className="feed">
        {Object.entries(errors).map(([id, msg]) => {
          const src = sources.find(s => s.id === id);
          if (!src || !activeSources.find(s => s.id === id)) return null;
          return (
            <div key={id} className="error-chip">
              {t('errorLoading', lang)}: {isRtl ? src.nameHe || src.name : src.name}
            </div>
          );
        })}

        {allArticles.length === 0 && !isAnyLoading && (
          <div className="empty-state">
            <div className="empty-icon">📰</div>
            <p>{t('noArticles', lang)}</p>
          </div>
        )}

        {allArticles.map(article => (
          <NewsCard
            key={`${article.sourceId}-${article.id}`}
            item={article}
            source={article.source}
            lang={lang}
          />
        ))}
      </main>

      {showSources && (
        <SourcesModal
          sources={sources}
          lang={lang}
          onClose={() => setShowSources(false)}
          onUpdate={(updated) => {
            setSources(updated);
            setShowSources(false);
          }}
        />
      )}
    </div>
  );
}
