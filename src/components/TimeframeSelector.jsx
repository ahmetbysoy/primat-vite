// src/components/TimeframeSelector.jsx
const TIMEFRAMES = [
  { value: '1m', label: '1m' },
  { value: '5m', label: '5m' },
  { value: '15m', label: '15m' },
  { value: '1h', label: '1h' },
  { value: '4h', label: '4h' },
  { value: '1d', label: '1D' },
];

export default function TimeframeSelector({ value, onChange }) {
  return (
    <div className="tfRow">
      {TIMEFRAMES.map(tf => {
        const active = value === tf.value;
        return (
          <button
            key={tf.value}
            onClick={() => onChange(tf.value)}
            className={`tfBtn ${active ? 'active tf-active' : ''}`}
          >
            {tf.label}
          </button>
        );
      })}
    </div>
  );
}
