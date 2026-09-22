export default function BottomNav({ active, onChange, counts }) {
  const tabs = [
    { id: 'dashboard', label: 'Panel', icon: '◈', aria: 'Panel sekmesi' },
    { id: 'whales', label: 'Balina', icon: '🐋', aria: 'Balina akışı sekmesi' },
    { id: 'signals', label: 'Sinyal', icon: '◉', aria: 'Sinyal sekmesi', badge: counts?.signals },
    { id: 'plan', label: 'Plan', icon: '◎', aria: 'Trade plan sekmesi' },
    { id: 'arbitrage', label: 'Arbitraj', icon: '⚡', aria: 'Arbitraj sekmesi', badge: counts?.arb },
  ];
  return (
    <nav className="bottom-nav" aria-label="Alt navigasyon">
      {tabs.map(t => (
        <button key={t.id} onClick={() => onChange(t.id)} className={active === t.id ? 'active' : ''} aria-label={t.aria} aria-current={active===t.id?'page':undefined}>
          <span className="ic" aria-hidden="true">{t.icon}</span>
          <span>{t.label}</span>
          {t.badge ? <span className="dot-badge">{t.badge}</span> : null}
        </button>
      ))}
    </nav>
  );
}
