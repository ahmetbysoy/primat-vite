// src/utils/stripMetrics.js
export const STRIP_METRICS = [
  // PRIMARY (her zaman görünür)
  { key: 'nearSR', icon: '📍', label: 'S/R', format: (v) => `${v}%`, isSecondary: false },
  { key: 'pain', icon: '⚡', label: 'Pain', format: (v) => v, isSecondary: false },
  { key: 'signal', icon: '🎯', label: 'Signal', format: (v) => v, isSecondary: false },
  { key: 'liqPct', icon: '💀', label: 'Liq%', format: (v) => `${v}%`, isSecondary: false },
  { key: 'rsi', icon: '📈', label: 'RSI', format: (v) => v, isSecondary: false },
  { key: 'funding', icon: '💰', label: 'Funding', format: (v) => `${v}%`, isSecondary: false },
  { key: 'oiChange', icon: '🔄', label: 'OI Δ', format: (v) => `${v}%`, isSecondary: false },
  { key: 'confluence', icon: '🧠', label: 'Conf', format: (v) => v, isSecondary: false },
  { key: 'volume', icon: '📦', label: 'Vol', format: (v) => `$${v}M`, isSecondary: false },
  { key: 'trend', icon: '📊', label: 'Trend', format: (v) => v, isSecondary: false },
  // SECONDARY (sm:flex, mobilde gizli)
  { key: 'cvd', icon: '🌊', label: 'CVD', format: (v) => `$${v}M`, isSecondary: true },
  { key: 'macd', icon: '📉', label: 'MACD', format: (v) => v, isSecondary: true },
  { key: 'atr', icon: '📏', label: 'ATR', format: (v) => `${v}%`, isSecondary: true },
  { key: 'stoch', icon: '🎲', label: 'Stoch', format: (v) => v, isSecondary: true },
  { key: 'oi', icon: '📊', label: 'OI', format: (v) => `$${v}B`, isSecondary: true },
];

// Mock data generator (gerçek veri gelene kadar)
export const generateMockMetrics = () => ({
  nearSR: (Math.random() * 5).toFixed(1),
  pain: Math.floor(Math.random() * 100),
  signal: Math.random() > 0.5 ? '🟢 Long' : '🔴 Short',
  liqPct: (Math.random() * 3).toFixed(2),
  rsi: Math.floor(Math.random() * 100),
  funding: (Math.random() * 0.1 - 0.05).toFixed(4),
  oiChange: (Math.random() * 10 - 5).toFixed(1),
  confluence: Math.floor(Math.random() * 100),
  volume: (Math.random() * 500).toFixed(1),
  trend: Math.random() > 0.5 ? 'Bullish ↗' : 'Bearish ↘',
  cvd: (Math.random() * 100 - 50).toFixed(1),
  macd: (Math.random() * 20 - 10).toFixed(2),
  atr: (Math.random() * 2).toFixed(2),
  stoch: Math.floor(Math.random() * 100),
  oi: (Math.random() * 5).toFixed(2),
});
