// src/components/InfoStrip.jsx
import { useState, useEffect } from 'react';
import { STRIP_METRICS, generateMockMetrics } from '../utils/stripMetrics';

export default function InfoStrip({ liveMetrics }) {
  const [metrics, setMetrics] = useState(generateMockMetrics());
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (liveMetrics && Object.keys(liveMetrics).length) {
      setMetrics(prev => ({ ...prev, ...liveMetrics }));
      return;
    }
    let interval
    const start=()=>{
      interval = setInterval(() => {
        if(document.hidden) return
        setMetrics(generateMockMetrics());
      }, 2200);
    }
    start()
    const onVis=()=>{
      if(document.hidden){ setPaused(true); clearInterval(interval)}
      else { setPaused(false); clearInterval(interval); start()}
    }
    document.addEventListener('visibilitychange', onVis)
    // prefers-reduced-motion also pauses
    if(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) setPaused(true)
    return () => { clearInterval(interval); document.removeEventListener('visibilitychange', onVis) }
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
      <div className={`infoStripTrack ${paused?'paused':''}`}>
        {withSep(renderItems(''))}
        {withSep(renderItems('-clone'))}
      </div>
    </div>
  );
}
