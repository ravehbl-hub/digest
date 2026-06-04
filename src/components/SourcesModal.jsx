import { useState } from 'react';
import { t } from '../i18n';
import { CATEGORIES } from '../sources';

const SOURCE_TYPES = [
  { id: 'rss',      icon: '📡', labelEn: 'RSS Feed',  labelHe: 'RSS' },
  { id: 'telegram', icon: '✈️', labelEn: 'Telegram',  labelHe: 'טלגרם' },
  { id: 'twitter',  icon: '𝕏',  labelEn: 'X / Twitter', labelHe: 'X / טוויטר' },
];

function detectType(url) {
  if (!url) return 'rss';
  if (url.includes('t.me/')) return 'telegram';
  if (url.includes('nitter.')) return 'twitter';
  return 'rss';
}

function buildUrl(type, handle) {
  const h = handle.replace(/^@/, '').trim();
  if (!h) return '';
  if (type === 'telegram') return `https://t.me/s/${h}`;
  if (type === 'twitter')  return `https://nitter.net/${h}/rss`;
  return handle; // RSS: raw URL
}

function extractHandle(type, url) {
  if (type === 'telegram') return url.replace('https://t.me/s/', '');
  if (type === 'twitter')  return url.replace('https://nitter.net/', '').replace('/rss', '');
  return url;
}

function SourceForm({ source, lang, onSave, onCancel }) {
  const isRtl = lang === 'he';
  const initialType = source ? detectType(source.url) : 'rss';
  const [type, setType] = useState(initialType);
  const [handle, setHandle] = useState(source ? extractHandle(initialType, source.url) : '');
  const [form, setForm] = useState(source || {
    id: '', name: '', nameHe: '', url: '', category: 'news', active: true,
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const onTypeChange = (newType) => {
    setType(newType);
    setHandle('');
    set('url', '');
  };

  const onHandleChange = (val) => {
    setHandle(val);
    if (type !== 'rss') {
      set('url', buildUrl(type, val));
    } else {
      set('url', val);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const url = type === 'rss' ? handle : buildUrl(type, handle);
    if (!form.name || !url) return;
    const id = form.id || form.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    onSave({ ...form, url, id });
  };

  const placeholder = type === 'rss'
    ? 'https://example.com/feed.xml'
    : type === 'telegram'
    ? isRtl ? 'שם הערוץ (ללא @)' : 'channel_name'
    : isRtl ? 'שם המשתמש (ללא @)' : 'username';

  const handleLabel = type === 'rss'
    ? t('feedUrl', lang)
    : type === 'telegram'
    ? (isRtl ? 'שם ערוץ טלגרם' : 'Telegram channel')
    : (isRtl ? 'שם משתמש X' : 'X username');

  return (
    <form className="source-form" onSubmit={handleSubmit} dir={isRtl ? 'rtl' : 'ltr'}>

      {/* Source type selector */}
      <div className="source-type-picker">
        {SOURCE_TYPES.map(st => (
          <button
            key={st.id}
            type="button"
            className={`source-type-btn ${type === st.id ? 'active' : ''}`}
            onClick={() => onTypeChange(st.id)}
          >
            <span className="st-icon">{st.icon}</span>
            <span>{isRtl ? st.labelHe : st.labelEn}</span>
          </button>
        ))}
      </div>

      {/* Handle / URL input */}
      <label>{handleLabel}
        <input
          value={handle}
          onChange={e => onHandleChange(e.target.value)}
          placeholder={placeholder}
          required
        />
        {type !== 'rss' && handle && (
          <span className="url-preview">{buildUrl(type, handle)}</span>
        )}
      </label>

      <label>{t('sourceName', lang)}
        <input value={form.name} onChange={e => set('name', e.target.value)} required />
      </label>
      <label>{t('sourceNameHe', lang)}
        <input value={form.nameHe} onChange={e => set('nameHe', e.target.value)} />
      </label>
      <label>{t('category', lang)}
        <select value={form.category} onChange={e => set('category', e.target.value)}>
          {Object.entries(CATEGORIES).filter(([k]) => k !== 'all').map(([k, v]) => (
            <option key={k} value={k}>{lang === 'he' ? v.he : v.en}</option>
          ))}
        </select>
      </label>
      <label className="toggle-row">
        <input type="checkbox" checked={form.active} onChange={e => set('active', e.target.checked)} />
        {t('active', lang)}
      </label>
      <div className="form-actions">
        <button type="submit" className="btn-primary">{t('save', lang)}</button>
        <button type="button" className="btn-ghost" onClick={onCancel}>{t('cancel', lang)}</button>
      </div>
    </form>
  );
}

export default function SourcesModal({ sources, lang, onClose, onUpdate }) {
  const [editing, setEditing] = useState(null);
  const isRtl = lang === 'he';

  const handleSave = (saved) => {
    if (editing === 'new') {
      onUpdate([...sources, saved]);
    } else {
      onUpdate(sources.map(s => s.id === saved.id ? saved : s));
    }
    setEditing(null);
  };

  const handleDelete = (id) => {
    if (!window.confirm(t('confirmDelete', lang))) return;
    onUpdate(sources.filter(s => s.id !== id));
  };

  const handleToggle = (id) => {
    onUpdate(sources.map(s => s.id === id ? { ...s, active: !s.active } : s));
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" dir={isRtl ? 'rtl' : 'ltr'}>
        <div className="modal-header">
          <h2>{editing ? t(editing === 'new' ? 'addSource' : 'editSource', lang) : t('sources', lang)}</h2>
          <button className="close-btn" onClick={editing ? () => setEditing(null) : onClose}>✕</button>
        </div>

        {editing ? (
          <SourceForm
            source={editing === 'new' ? null : editing}
            lang={lang}
            onSave={handleSave}
            onCancel={() => setEditing(null)}
          />
        ) : (
          <div className="sources-list">
            <button className="btn-primary add-btn" onClick={() => setEditing('new')}>
              + {t('addSource', lang)}
            </button>
            {sources.map(s => (
              <div key={s.id} className={`source-row ${!s.active ? 'inactive' : ''}`}>
                <button
                  className={`source-toggle ${s.active ? 'on' : 'off'}`}
                  onClick={() => handleToggle(s.id)}
                  title={t('active', lang)}
                />
                <div className="source-info" onClick={() => setEditing(s)}>
                  <span className="source-row-name">{isRtl ? s.nameHe || s.name : s.name}</span>
                  <span className="source-row-url">{s.url}</span>
                </div>
                <button className="btn-danger-sm" onClick={() => handleDelete(s.id)}>✕</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
