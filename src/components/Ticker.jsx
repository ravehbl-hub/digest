import { useState, useEffect } from 'react';

function fmt(n, decimals = 2) {
  return n.toLocaleString('he-IL', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function TickerItem({ item }) {
  const isCurrency = item.symbol?.endsWith('=X');
  const up = item.pct >= 0;
  return (
    <span className="ticker-item">
      <span className="ticker-label">{item.label}</span>
      {isCurrency ? (
        <span className="ticker-value">₪{fmt(item.price, 3)}</span>
      ) : (
        <>
          <span className="ticker-value">{fmt(item.price, item.price > 1000 ? 0 : 2)}</span>
          <span className={`ticker-pct ${up ? 'up' : 'down'}`}>
            {up ? '▲' : '▼'}{Math.abs(item.pct).toFixed(2)}%
          </span>
        </>
      )}
    </span>
  );
}

const SEP = <span className="ticker-sep">•</span>;

export default function Ticker() {
  const [items, setItems] = useState([]);

  const load = () => {
    fetch('/api/market')
      .then(r => r.json())
      .then(d => setItems(d.data || []))
      .catch(() => {});
  };

  useEffect(() => {
    load();
    const id = setInterval(load, 60 * 60 * 1000); // refresh every 1h
    return () => clearInterval(id);
  }, []);

  if (items.length === 0) return null;

  const nodes = items.flatMap((item, i) => [
    <TickerItem key={i} item={item} />,
    i < items.length - 1 ? <span key={`s${i}`} className="ticker-sep">•</span> : null,
  ]).filter(Boolean);

  return (
    <div className="ticker-wrap">
      <div className="ticker-track">
        <span className="ticker-content">{nodes}</span>
        <span className="ticker-content" aria-hidden="true">{nodes}</span>
      </div>
    </div>
  );
}
