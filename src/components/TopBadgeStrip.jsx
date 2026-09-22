// src/components/TopBadgeStrip.jsx
import { useState, useEffect } from 'react';

const BADGES = [
  { id: 'sr', icon: '📍', label: 'S/R' },
  { id: 'liq', icon: '💀', label: 'Liq' },
  { id: 'heat', icon: '🌡️', label: 'Heat' },
  { id: 'pain', icon: '⚡', label: 'Pain' },
  { id: 'cvd', icon: '🌊', label: 'CVD' },
  { id: 'mem', icon: '🧠', label: 'Mem' },
];

export default function TopBadgeStrip({ price, liqRisk, rsi }) {
  const [badgeData, setBadgeData] = useState({
    sr: { value: '2.3%', trend: 'up' },
    liq: { value: '1.2M', trend: 'down' },
    heat: { value: '78', trend: 'neutral' },
    pain: { value: '64', trend: 'up' },
    cvd: { value: '+12M', trend: 'up' },
    mem: { value: '0.85', trend: 'neutral' },
  });

  useEffect(() => {
    // price / liqRisk / rsi geldikçe badge'leri güncelle
    if (price) {
      setBadgeData(prev => ({
        ...prev,
        // Liq = risk metriği: yüksek risk KÖTÜ olduğu için trend rengi ters — yüksek risk kırmızı (down/danger)
        liq: { value: liqRisk ? `${liqRisk}%` : prev.liq.value, trend: liqRisk > 60 ? 'down' : 'up' },
        pain: { value: rsi ? `${rsi}` : prev.pain.value, trend: rsi > 55 ? 'up' : 'down' },
      }));
    }
  }, [price, liqRisk, rsi]);

  useEffect(() => {
    let interval
    const start=()=>{
      interval = setInterval(() => {
        if(document.hidden) return
        setBadgeData(prev => ({
          ...prev,
          heat: {
            value: `${Math.floor(60 + Math.random() * 30)}`,
            trend: Math.random() > 0.5 ? 'up' : 'down'
          }
        }));
      }, 3000);
    }
    start()
    const onVis=()=>{
      if(document.hidden){ clearInterval(interval) }
      else { clearInterval(interval); start() }
    }
    document.addEventListener('visibilitychange', onVis)
    return () => { clearInterval(interval); document.removeEventListener('visibilitychange', onVis) }
  }, []);

  return (
    <div className="top-badge-strip-wrap">
    <div className="top-badge-strip">
      {BADGES.map(badge => {
        const data = badgeData[badge.id];
        const trendColor =
          data.trend === 'up' ? 'var(--success)' :
          data.trend === 'down' ? 'var(--danger)' : 'var(--muted)';

        return (
          <div key={badge.id} className="tBadge pastel">
            <span>{badge.icon}</span>
            <span style={{fontWeight:600, fontSize:10}}>{badge.label}</span>
            <b style={{color: trendColor}}>{data.value}</b>
            {data.trend !== 'neutral' && (
              <span style={{fontSize:9}}>{data.trend === 'up' ? '↗' : '↘'}</span>
            )}
          </div>
        );
      })}
    </div>
    </div>
  );
}
