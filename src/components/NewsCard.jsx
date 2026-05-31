import { useState, useEffect } from 'react';
import { t } from '../i18n';
import { translate } from '../translateService';

function timeAgo(date, lang) {
  if (!date) return '';
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return lang === 'he' ? 'עכשיו' : 'just now';
  if (diff < 3600) {
    const m = Math.floor(diff / 60);
    return lang === 'he' ? `לפני ${m} דק'` : `${m}m ago`;
  }
  if (diff < 86400) {
    const h = Math.floor(diff / 3600);
    return lang === 'he' ? `לפני ${h} שע'` : `${h}h ago`;
  }
  const d = Math.floor(diff / 86400);
  return lang === 'he' ? `לפני ${d} ימים` : `${d}d ago`;
}

function formatTime(date, lang) {
  if (!date) return '';
  return date.toLocaleTimeString(lang === 'he' ? 'he-IL' : 'en-US', { hour: '2-digit', minute: '2-digit' });
}

function formatDate(date, lang) {
  if (!date) return '';
  return date.toLocaleDateString(lang === 'he' ? 'he-IL' : 'en-US', { day: 'numeric', month: 'short' });
}

export default function NewsCard({ item, source, lang }) {
  const isRtl = lang === 'he';
  const arrow = isRtl ? ' ←' : ' →';

  // articleLink: article page (from Telegram link_preview)
  // item.link:   Telegram post / X tweet / RSS article
  const primaryLink = item.articleLink || item.link;
  const sourceLink = item.link;

  const [displayTitle, setDisplayTitle] = useState(item.title);
  const [displayDesc, setDisplayDesc] = useState(item.description);

  useEffect(() => {
    if (lang !== 'en') {
      setDisplayTitle(item.title);
      setDisplayDesc(item.description);
      return;
    }
    let cancelled = false;
    translate(item.title, 'he', 'en').then(r => { if (!cancelled) setDisplayTitle(r); });
    if (item.description) translate(item.description, 'he', 'en').then(r => { if (!cancelled) setDisplayDesc(r); });
    return () => { cancelled = true; };
  }, [lang, item.title, item.description]);

  return (
    <div className="news-card" dir={isRtl ? 'rtl' : 'ltr'}>
      {item.thumbnail && (
        <a href={primaryLink} target="_blank" rel="noopener noreferrer" className="card-image">
          <img src={item.thumbnail} alt="" loading="lazy" onError={e => { e.target.parentNode.style.display = 'none'; }} />
        </a>
      )}
      <div className="card-body">
        <div className="card-meta">
          <span className="source-badge">{isRtl ? source.nameHe : source.name}</span>
          <span className="card-time">
            {formatDate(item.pubDate, lang)} · {formatTime(item.pubDate, lang)}
          </span>
          <span className="time-ago">{timeAgo(item.pubDate, lang)}</span>
        </div>

        {/* Title links to article (or primary link) */}
        <a href={primaryLink} target="_blank" rel="noopener noreferrer" className="card-title-link">
          <h3 className="card-title">{displayTitle}</h3>
        </a>

        {displayDesc && <p className="card-desc">{displayDesc}</p>}

        <div className="card-links">
          {/* "Read more" links to Telegram/X post when there's a separate article link */}
          {item.articleLink && item.articleLink !== sourceLink ? (
            <a href={sourceLink} target="_blank" rel="noopener noreferrer" className="read-more">
              {lang === 'he' ? `פתח בטלגרם${arrow}` : `Open source${arrow}`}
            </a>
          ) : (
            <a href={sourceLink} target="_blank" rel="noopener noreferrer" className="read-more">
              {t('readMore', lang)}{arrow}
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
