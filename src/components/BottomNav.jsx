export default function BottomNav({ active, onChange, counts }) {
  const tabs = [
    { id: 'dashboard', label: 'Panel', icon: '◈' },
    { id: 'whales', label: 'Balina', icon: '🐋' },
    { id: 'signals', label: 'Sinyal', icon: '◉', badge: counts?.signals },
    { id: 'plan', label: 'Plan', icon: '◎' },
    { id: 'arbitrage', label: 'Arbitraj', icon: '⚡', badge: counts?.arb },
  ];
  return (
    <nav className="bottom-nav">
      {tabs.map(t => (
        <button key={t.id} onClick={() => onChange(t.id)} className={active === t.id ? 'active' : ''}>
          <span className="ic">{t.icon}</span>
          <span>{t.label}</span>
          {t.badge ? <span className="dot-badge">{t.badge}</span> : null}
        </button>
      ))}
    </nav>
  );
}
