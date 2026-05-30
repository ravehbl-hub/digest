import { useState } from 'react';
import { t } from '../i18n';
import { CATEGORIES } from '../sources';

function SourceForm({ source, lang, onSave, onCancel }) {
  const [form, setForm] = useState(source || {
    id: '', name: '', nameHe: '', url: '', category: 'news', active: true,
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name || !form.url) return;
    const id = form.id || form.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    onSave({ ...form, id });
  };

  return (
    <form className="source-form" onSubmit={handleSubmit} dir={lang === 'he' ? 'rtl' : 'ltr'}>
      <label>{t('sourceName', lang)}
        <input value={form.name} onChange={e => set('name', e.target.value)} required />
      </label>
      <label>{t('sourceNameHe', lang)}
        <input value={form.nameHe} onChange={e => set('nameHe', e.target.value)} />
      </label>
      <label>{t('feedUrl', lang)}
        <input value={form.url} onChange={e => set('url', e.target.value)} type="url" required placeholder="https://..." />
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
  const [editing, setEditing] = useState(null); // null = list, 'new' = add, source = edit
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
