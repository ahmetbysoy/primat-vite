// src/components/InfoStrip.jsx
import { useState, useEffect } from 'react';
import { STRIP_METRICS, generateMockMetrics } from '../utils/stripMetrics';

export default function InfoStrip({ liveMetrics }) {
  const [metrics, setMetrics] = useState(generateMockMetrics());

  useEffect(() => {
    if (liveMetrics && Object.keys(liveMetrics).length) {
      setMetrics(prev => ({ ...prev, ...liveMetrics }));
      return;
    }
    const interval = setInterval(() => {
      setMetrics(generateMockMetrics());
    }, 2200);
    return () => clearInterval(interval);
  }, [liveMetrics]);

  const renderItems = (suffix = '') => {
    return STRIP_METRICS.map((metric) => (
      <div
        key={`${metric.key}${suffix}`}
        className={`iCell ${metric.isSecondary ? 'secondary' : ''}`}
      >
        <span className="iIcon">{metric.icon}</span>
        <span className="iLbl">{metric.label}:</span>
        <span className="iVal">
          {metric.format(metrics[metric.key])}
        </span>
      </div>
    ));
  };

  // interleave separator
  const withSep = (nodes) => {
    const out = [];
    nodes.forEach((n, i) => {
      out.push(n);
      if (i < nodes.length - 1) out.push(<div key={`sep-${n.key}-${i}`} className="iSep" />);
    });
    return out;
  };

  return (
    <div className="infoStrip">
      <div className="infoStripTrack">
        {withSep(renderItems(''))}
        {withSep(renderItems('-clone'))}
      </div>
    </div>
  );
}
