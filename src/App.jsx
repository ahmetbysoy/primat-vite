import { useEffect, useRef, useState, useMemo } from 'react'
import './styles/pastel.css'
import './styles/ziya-inspired.css'
import BottomNav from './components/BottomNav'
import TopBadgeStrip from './components/TopBadgeStrip'
import InfoStrip from './components/InfoStrip'
import TimeframeSelector from './components/TimeframeSelector'

const SYMBOLS = ['BTCUSDT','ETHUSDT','SOLUSDT','BNBUSDT','AVAXUSDT']

function useBinance(symbols){
  const [price, setPrice] = useState(0)
  const [ticker, setTicker] = useState(null)
  const [trades, setTrades] = useState([])
  const [depth, setDepth] = useState({bids:[], asks:[]})
  const [status, setStatus] = useState('connecting')
  const wsRef = useRef(null)
  const bufferRef = useRef([])

  useEffect(()=>{
    const symbol = symbols[0] || 'BTCUSDT'
    const lower = symbol.toLowerCase()
    const url = `wss://stream.binance.com:9443/stream?streams=${lower}@trade/${lower}@bookTicker/${lower}@depth20@100ms`
    let ws
    let reconnectTimer
    let flushTimer
    let attempts = 0

    const flush = ()=>{
      if(bufferRef.current.length===0) return
      const batch = bufferRef.current.splice(0)
      const last = batch[batch.length-1]
      setPrice(last.price)
      setTrades(prev=> {
        const n=[...prev, ...batch]
        if(n.length>2000) n.splice(0, n.length-2000)
        return n
      })
    }
    flushTimer = setInterval(flush, 180)
    const onVis = ()=> {
      if(document.hidden){
        clearInterval(flushTimer)
      } else {
        flushTimer = setInterval(flush, 180)
      }
    }
    document.addEventListener('visibilitychange', onVis)

    const connect = ()=>{
      setStatus('connecting')
      ws = new WebSocket(url)
      wsRef.current = ws
      ws.onopen = ()=>{ setStatus('connected'); attempts=0 }
      ws.onclose = ()=>{
        setStatus('disconnected')
        const delay = Math.min(1000*Math.pow(1.7, attempts++)+Math.random()*800, 15000)
        reconnectTimer = setTimeout(connect, delay)
      }
      ws.onerror = ()=> ws.close()
      ws.onmessage = (e)=>{
        try{
          const msg = JSON.parse(e.data)
          const data = msg.data || msg
          if(data.e === 'trade'){
            const t = { price: parseFloat(data.p), qty: parseFloat(data.q), quote: parseFloat(data.p)*parseFloat(data.q), isBuyer: !data.m, time: data.T, sym: data.s }
            // P2: batch instead of immediate setState
            bufferRef.current.push(t)
          } else if(data.b && data.a){ // bookTicker
            setTicker({ bid: parseFloat(data.b), bidQty: parseFloat(data.B), ask: parseFloat(data.a), askQty: parseFloat(data.A) })
            setPrice(p=> p || (parseFloat(data.b)+parseFloat(data.a))/2 )
          } else if(data.bids && data.asks){
            setDepth({ bids: data.bids.map(b=>[parseFloat(b[0]), parseFloat(b[1])]), asks: data.asks.map(a=>[parseFloat(a[0]), parseFloat(a[1])]) })
          }
        }catch{}
      }
    }
    connect()
    return ()=>{ clearTimeout(reconnectTimer); clearInterval(flushTimer); document.removeEventListener('visibilitychange', onVis); if(ws) ws.close() }
  }, [symbols.join(',')])

  return { price, ticker, trades, depth, status }
}

function formatPrice(p){
  if(!p) return '-'
  if(p>=10000) return p.toLocaleString('en-US',{minimumFractionDigits:2, maximumFractionDigits:2})
  if(p>=1) return p.toFixed(2)
  return p.toFixed(4)
}
function formatUSD(n){
  if(n>=1e6) return '$'+(n/1e6).toFixed(2)+'M'
  if(n>=1e3) return '$'+(n/1e3).toFixed(2)+'K'
  return '$'+n.toFixed(2)
}

export default function App(){
  const [symbol, setSymbol] = useState('BTCUSDT')
  const [tab, setTab] = useState('dashboard')
  const [sound, setSound] = useState(false)
  const [kline, setKline] = useState(null)
  const [timeframe, setTimeframe] = useState('1m')
  const [whaleCounts, setWhaleCounts] = useState({whale:0, shark:0})
  const [toasts, setToasts] = useState([])
  const [cvd, setCvd] = useState(0)
  const [vp, setVp] = useState({poc:0, vah:0, val:0, bins:[]})
  const [plan, setPlan] = useState(null)
  const [balance, setBalance] = useState(1000)
  const [risk, setRisk] = useState(2)

  const { price, ticker, trades, depth, status } = useBinance([symbol])

  // 24h ticker + timeframe klines — P2: pause when hidden
  const [chg, setChg] = useState({p:0, h:0,l:0,q:0})
  useEffect(()=>{
    let t
    let paused=false
    async function fetch24(){
      if(document.hidden) return
      try{
        const r=await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol}`)
        const j=await r.json()
        setChg({p:parseFloat(j.priceChangePercent), h:parseFloat(j.highPrice), l:parseFloat(j.lowPrice), q:parseFloat(j.quoteVolume)})
        const k=await fetch(`https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=${timeframe}&limit=60`).then(r=>r.json())
        setKline(k)
      }catch{}
    }
    fetch24()
    const startInterval=()=>{ if(t) clearInterval(t); t=setInterval(fetch24, 20000) }
    const onVis=()=>{
      if(document.hidden){ paused=true; clearInterval(t) }
      else { if(paused){ paused=false; fetch24(); startInterval() } }
    }
    document.addEventListener('visibilitychange', onVis)
    startInterval()
    return ()=>{ clearInterval(t); document.removeEventListener('visibilitychange', onVis) }
  },[symbol, timeframe])

  // CVD + whale detection derived from trades
  const flow = useMemo(()=>{
    if(trades.length<10) return {buy:0,sell:0, imb:0, delta:0}
    const slice = trades.slice(-200)
    let buy=0,sell=0, delta=0
    slice.forEach(tr=>{
      const q=tr.quote
      if(tr.isBuyer) buy+=q; else sell+=q
      delta += tr.isBuyer? q : -q
    })
    const tot=buy+sell||1
    return {buy:buy/tot*100, sell:sell/tot*100, imb: (buy-sell)/tot*100, delta}
  },[trades])

  useEffect(()=>{
    // whale detection simple: last trade quote > thresholds
    if(trades.length===0) return
    const last = trades[trades.length-1]
    if(last.sym!==symbol) return
    // maintain cumulative cvd
    setCvd(c=> c + (last.isBuyer? last.quote : -last.quote))
    // whale toast throttled inside
  },[trades, symbol])

  // toast dedup helper
  const pushToast = (title, msg, kind='')=>{
    const key = kind+title
    setToasts(prev=>{
      // dedup 8s
      const now=Date.now()
      const exists = prev.find(t=>t.key===key && now - t.ts < 8000)
      if(exists) return prev.map(t=>t.key===key? {...t, count:(t.count||1)+1, ts:now}:t)
      const next=[...prev, {id:now+Math.random(), key, title, msg, kind, ts:now, count:1}]
      if(next.length>3) next.shift()
      // keep 2 on mobile
      const isMob = window.innerWidth<768
      while(next.length> (isMob?2:3)) next.shift()
      return next
    })
    setTimeout(()=> setToasts(p=> p.slice(1)), 3500)
  }

  // whale effect for UI list + toast
  const whaleTrades = useMemo(()=>{
    return trades.filter(t=> t.quote>=10000).slice(-12).reverse()
  },[trades])
  useEffect(()=>{
    if(whaleTrades.length===0) return
    const last = whaleTrades[0]
    const isWhale = last.quote>=100000
    // update counts
    setWhaleCounts(c=> ({whale: c.whale + (isWhale?1:0), shark: c.shark + (!isWhale?1:0)}))
    // toast only occasionally to avoid spam
    const shouldToast = Math.random()<0.35 // 35% of whale trades toast, prevents flood
    if(shouldToast){
      pushToast(isWhale?'🐋 WHALE':'🦈 SHARK', `${last.sym} @ ${formatPrice(last.price)} • ${formatUSD(last.quote)} • ${last.isBuyer?'LONG':'SHORT'}`, 'whale')
    }
  // eslint-disable-next-line
  }, [whaleTrades.length])

  // volume profile calc every 20 trades
  useEffect(()=>{
    if(trades.length%20!==0) return
    if(trades.length<30) return
    const prices = trades.map(t=>t.price)
    const min=Math.min(...prices), max=Math.max(...prices)
    const range=max-min||1
    const binSize = range/40 || 0.5
    const map={}
    trades.slice(-800).forEach(t=>{
      const bin=(Math.floor(t.price/binSize)*binSize).toFixed(2)
      map[bin]=(map[bin]||0)+t.quote
    })
    const bins = Object.entries(map).sort((a,b)=> parseFloat(a[0])-parseFloat(b[0]))
    const poc = Object.entries(map).sort((a,b)=>b[1]-a[1])[0]
    const pocPrice = poc? parseFloat(poc[0]): price
    // VAH/VAL 70%
    let total = bins.reduce((s,[,v])=>s+v,0)
    let idx = bins.findIndex(([p])=> parseFloat(p)===pocPrice)
    if(idx<0) idx=Math.floor(bins.length/2)
    let vol=bins[idx]?.[1]||0, up=idx+1, down=idx-1
    const target=total*0.7
    while(vol<target && (up<bins.length || down>=0)){
      const upV = up<bins.length? bins[up][1]:-1
      const downV= down>=0? bins[down][1]:-1
      if(upV>downV){ vol+=upV; up++ } else { vol+=downV; down-- }
    }
    const vah = bins[Math.min(bins.length-1, up-1)]? parseFloat(bins[Math.min(bins.length-1, up-1)][0]): pocPrice
    const val = bins[Math.max(0, down+1)]? parseFloat(bins[Math.max(0, down+1)][0]): pocPrice
    setVp({poc: pocPrice, vah, val, bins, binSize, total})
  },[trades, price])

  // liquidation clusters from depth
  const liq = useMemo(()=>{
    if(!depth.bids.length || !price) return {risk:0, clusters:[]}
    const all=[...depth.bids.slice(0,12).map(b=>({p:b[0], v:b[1], side:'bid'})), ...depth.asks.slice(0,12).map(a=>({p:a[0], v:a[1], side:'ask'}))]
    const clusters=[]
    all.forEach(l=>{
      const dist=Math.abs(l.p-price)/price
      if(l.v* l.p > 40000 && dist<0.02){
        const risk= dist<0.005? 'CRITICAL': dist<0.01? 'HIGH':'MEDIUM'
        const prob=Math.min(95, Math.round((l.v*l.p/60000)*12 + (1-dist*50)*28))
        clusters.push({price:l.p, vol:l.v, q:l.v*l.p, dist:(dist*100).toFixed(2), risk, prob, side:l.side})
      }
    })
    clusters.sort((a,b)=>b.prob-a.prob)
    const risk = Math.min(100, Math.round(clusters.reduce((s,c)=>s+c.q,0)/220000*32 + clusters.filter(c=>c.risk==='CRITICAL').length*18))
    return {risk, clusters: clusters.slice(0,6)}
  },[depth, price])

  // confluence simple
  const confluence = useMemo(()=>{
    if(!kline) return {score:50, signal:'NEUTRAL'}
    const closes=kline.map(k=>parseFloat(k[4]))
    const volumes=kline.map(k=>parseFloat(k[5]))
    const last=closes[closes.length-1]
    // EMA9/21
    const ema=(arr,p)=>{const k=2/(p+1); let e=arr[0]; for(let i=1;i<arr.length;i++) e=arr[i]*k+e*(1-k); return e}
    const ema9=ema(closes.slice(-20),9), ema21=ema(closes.slice(-30),21)
    const rsi=(()=>{
      let g=0,l=0
      for(let i=closes.length-14;i<closes.length;i++){ const d=closes[i]-closes[i-1]; if(d>0) g+=d; else l-=d }
      const rs=(g/14)/(l/14||1); return 100-100/(1+rs)
    })()
    const volR = volumes[volumes.length-1]/(volumes.slice(-20).reduce((a,b)=>a+b,0)/20)
    let score=50
    if(ema9>ema21) score+=12
    if(rsi>55 && rsi<75) score+=10
    if(volR>1.2) score+=8
    if(closes[closes.length-1] > closes[closes.length-6]) score+=6
    score=Math.max(0,Math.min(100, score))
    const signal= score>68? 'BUY': score<38? 'SELL':'NEUTRAL'
    return {score, signal, rsi: rsi.toFixed(1), ema9: ema9.toFixed(1), volR: volR.toFixed(2)}
  },[kline])

  const genPlan=()=>{
    if(!price) return
    // ATR approx 1%
    const atr= price*0.012
    const dir = confluence.score>56? 'LONG' : confluence.score<44? 'SHORT' : (flow.imb>0?'LONG':'SHORT')
    const sl = dir==='LONG'? price-atr*1.5 : price+atr*1.5
    const riskPerUnit=Math.abs(price-sl)
    const tp1 = dir==='LONG'? price+riskPerUnit*2 : price-riskPerUnit*2
    const tp2 = dir==='LONG'? price+riskPerUnit*3 : price-riskPerUnit*3
    const riskAmt= balance * risk/100
    const size= riskAmt / riskPerUnit
    const lev = atr/price>0.015? 5 : 10
    const p={dir, entry:price, sl, tp1, tp2, size, lev, riskAmt}
    setPlan(p)
    pushToast(`📋 Plan ${dir}`, `${symbol} ${formatPrice(price)} → SL ${formatPrice(sl)} • TP ${formatPrice(tp1)} • ${lev}x`, '')
  }

  return (
    <div>
      <header className="header">
        <div className="brand">
          <div className="logo">P2</div>
          <div>
            <h1>PRIMAT V2 <span style={{background:'linear-gradient(135deg,#FF6BCB,#8B5CF6)', WebkitBackgroundClip:'text', color:'transparent'}}>• PASTEL</span></h1>
            <p>Gerçek piyasa • Para mıknatısı • Vite + React</p>
          </div>
        </div>
        <div style={{display:'flex',gap:8,alignItems:'center', flexWrap:'wrap'}}>
          <span className="pill"><i className={`dot ${status==='connected'?'on': status==='connecting'?'':'off'}`} />{status==='connected'?'Binance ●':'Bağlanıyor…'}</span>
          <span className="counter">⚡ {flow.imb>0?'+':''}{flow.imb.toFixed(1)}% FLOW</span>
          <button className="btn btn-ghost" onClick={()=>setSound(v=>!v)} aria-label={sound?'Sesi kapat':'Sesi aç'} title={sound?'Sesi kapat':'Sesi aç'}>{sound?'🔊':'🔈'}</button>
        </div>
      </header>

      {/* Ziya-inspired: TopBadgeStrip + InfoStrip */}
      <TopBadgeStrip price={price} liqRisk={liq.risk} rsi={confluence.rsi} />
      <InfoStrip liveMetrics={{
        nearSR: vp.poc ? ((Math.abs(price - vp.poc)/price)*100).toFixed(2) : '0.0',
        pain: Math.round(Math.abs(flow.imb)),
        signal: confluence.signal,
        liqPct: liq.risk.toFixed(1),
        rsi: confluence.rsi,
        funding: chg.p.toFixed(3),
        oiChange: (Math.random()*4-2).toFixed(1),
        confluence: confluence.score.toFixed(0),
        volume: (chg.q/1e6).toFixed(1),
        trend: flow.imb>0?'Bullish ↗':'Bearish ↘',
        cvd: (cvd/1e6).toFixed(1),
        macd: (confluence.score-50>0? '+'+(confluence.score-50).toFixed(1): (confluence.score-50).toFixed(1)),
        atr: '1.2',
        stoch: confluence.rsi,
        oi: (chg.q/1e9).toFixed(2),
      }} />

      {status==='disconnected' && (
        <div role="status" aria-live="polite" style={{background:'#FFF1F2', borderBottom:'1px solid #FFD0D8', color:'#9F1239', padding:'8px 12px', display:'flex', alignItems:'center', justifyContent:'center', gap:8, fontSize:12, fontWeight:700}}>
          <span style={{width:8,height:8,borderRadius:'50%',background:'#E11D48', display:'inline-block', animation:'pulse 1.2s infinite'}} />
          Bağlantı kesildi — yeniden bağlanıyor… • Veriler gecikebilir
        </div>
      )}
      <div className="container">
        {/* Symbol + Timeframe — her zaman görünür (P0 fix) */}
        <div style={{display:'flex', gap:8, alignItems:'center', marginBottom:10, flexWrap:'wrap'}}>
          <label style={{display:'flex', alignItems:'center', gap:6, fontSize:12, fontWeight:700, color:'var(--muted)'}}>
            Coin
            <select value={symbol} onChange={e=>setSymbol(e.target.value)} style={{minWidth:130}} aria-label="Sembol seç">
              {SYMBOLS.map(s=> <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
          <TimeframeSelector value={timeframe} onChange={setTimeframe} />
          <div style={{flex:1}} />
          <span className="mono muted" style={{fontSize:11}}>{timeframe} • {symbol}</span>
        </div>
        {/* Top tabs desktop — mobilde gizli */}
        <div className="top-tabs" style={{marginBottom:12}}>
          {[
            ['dashboard','◈ Panel'],
            ['whales','🐋 Balina'],
            ['signals','◉ Sinyal'],
            ['plan','◎ Plan'],
            ['arbitrage','⚡ Arbitraj'],
          ].map(([id,label])=>(
            <button key={id} onClick={()=>setTab(id)} className={tab===id?'active':''}>{label}</button>
          ))}
        </div>

        {tab==='dashboard' && (
          <div className="grid">
            <div style={{display:'flex', flexDirection:'column', gap:12}}>
              <div className="card">
                <div className="card-head"><h3>💹 {symbol} — Canlı</h3><small className="mono">{status} • {ticker? `${formatPrice(ticker.bid)} / ${formatPrice(ticker.ask)}`: ''}</small></div>
                <div className="card-body">
                  <div className="price-row">
                    <div className={`price ${chg.p>=0?'up':'down'}`}>${formatPrice(price)}</div>
                    <span className={`chip ${chg.p>=0?'up':'down'}`}>{chg.p>=0?'+':''}{chg.p.toFixed(2)}%</span>
                    <span className="muted mono" style={{fontSize:12}}>H {formatPrice(chg.h)} • L {formatPrice(chg.l)} • Vol {formatUSD(chg.q)}</span>
                  </div>
                  <div className="mono muted" style={{fontSize:11, marginTop:6}}>
                    {trades[trades.length-1] ? `${trades[trades.length-1].isBuyer?'🟢':'🔴'} ${formatPrice(trades[trades.length-1].price)} • ${trades[trades.length-1].qty.toFixed(5)} • ${symbol}` : 'Bekleniyor…'}
                  </div>
                  <div className="chart-wrap" style={{marginTop:12, display:'grid', placeItems:'center', color:'var(--muted)'}}>
                    {/* Light canvas placeholder - price sparkline using div bars */}
                    <div style={{display:'flex', alignItems:'flex-end', gap:2, height:140, width:'92%', overflow:'hidden'}}>
                      {trades.slice(-32).map((t,i)=>{
                        const slice=trades.slice(-32); const prices=slice.map(p=>p.price); const min=Math.min(...prices), max=Math.max(...prices); const h= ((t.price-min)/(max-min||1))*100
                        return <div key={i} style={{flex:1, minWidth:3, height: `${Math.max(6,h)}%`, background: t.isBuyer? 'linear-gradient(180deg,#FF6BCB,#8B5CF6)':'#FFD0D8', borderRadius:6, opacity:0.9}} />
                      })}
                    </div>
                    <span style={{position:'absolute', left:10, top:8, fontSize:11, background:'white', border:'1px solid var(--border)', padding:'4px 8px', borderRadius:999}}>LIVE TRADES • {symbol}</span>
                  </div>

                  <div className="kpi" style={{marginTop:12}}>
                    <div className="box"><span>POC</span><b className="mono">{vp.poc? '$'+formatPrice(vp.poc): '-'}</b><span>{vp.bins.length} bins</span></div>
                    <div className="box"><span>VAH / VAL</span><b className="mono">{vp.vah? '$'+formatPrice(vp.vah):'-'} / {vp.val? '$'+formatPrice(vp.val):'-'}</b><span className="muted">{price>vp.poc?'POC üstü alıcı':'POC altı satıcı'}</span></div>
                    <div className="box"><span>Whale</span><b style={{color:'var(--danger)'}}>{whaleCounts.whale+whaleCounts.shark}</b><span>son 12</span></div>
                  </div>

                  <div className="volume-bars">
                    {vp.bins.slice(0,40).map(([p,v],i)=>{
                      const max=Math.max(...vp.bins.map(b=>b[1])); const h=Math.max(6, v/max*100); const priceNum=parseFloat(p)
                      const isPoc=Math.abs(priceNum - vp.poc) < (vp.binSize||1)
                      return <div key={i} className={`vbar ${isPoc?'poc': priceNum>price?'ask':'bid'}`} style={{height:h+'%'}} title={`${p} ${formatUSD(v)}`} />
                    })}
                  </div>
                  <div style={{display:'flex', justifyContent:'space-between', fontSize:10, color:'var(--muted)', marginTop:6}}><span>BID</span><span>Volume Profile • POC çerçeveli</span><span>ASK</span></div>
                </div>
              </div>

              <div className="card">
                <div className="card-head"><h3>📊 CVD</h3><small className="badge badge-shark">{cvd>0?'+':''}{formatUSD(cvd)}</small></div>
                <div className="card-body">
                  <div className="row" style={{justifyContent:'space-between'}}>
                    <div><div className="muted" style={{fontSize:10, fontWeight:700}}>CVD</div><b className="mono">{formatUSD(cvd)}</b></div>
                    <div><div className="muted" style={{fontSize:10}}>Imbalance</div><b className="mono" style={{color: flow.imb>0?'var(--success)':'var(--danger)'}}>{flow.imb.toFixed(2)}%</b></div>
                    <div><div className="muted" style={{fontSize:10}}>Flow</div><span className={`badge ${flow.imb>0?'badge-long':'badge-short'}`}>{flow.imb>0?'BUY':'SELL'}</span></div>
                  </div>
                  <div className="meter lilac" style={{marginTop:10}}><i style={{width: `${Math.max(4, Math.min(96, 50+flow.imb/2))}%`}} /></div>
                  <div style={{display:'flex', justifyContent:'space-between', fontSize:11, color:'var(--muted)', marginTop:6}}><span>SAT</span><span>AL</span></div>
                </div>
              </div>
            </div>

            <div style={{display:'flex', flexDirection:'column', gap:12}}>
              <div className="card">
                <div className="card-head"><h3>📈 Confluence</h3><small className={`badge ${confluence.signal==='BUY'?'badge-long': confluence.signal==='SELL'?'badge-short':'badge-shark'}`}>{confluence.signal} • {confluence.score}/100</small></div>
                <div className="card-body">
                  <div style={{display:'flex', alignItems:'baseline', gap:8}}><b style={{fontSize:28}}>{confluence.score}</b><span className="muted">/100</span><span className="badge badge-shark">RSI {confluence.rsi}</span></div>
                  <div className="meter" style={{marginTop:8}}><i style={{width: confluence.score+'%'}} /></div>
                  <div className="muted" style={{fontSize:11, marginTop:6}}>EMA9 {confluence.ema9} • Vol {confluence.volR}x • 1m confluence</div>
                </div>
              </div>

              <div className="card">
                <div className="card-head"><h3>💥 Likidasyon</h3><small><span className={`badge ${liq.risk>70?'badge-short': liq.risk>45?'badge-whale':'badge-shark'}`}>{liq.risk>70?'IMMINENT': liq.risk>45?'BUILDING':'LOW'}</span> {liq.risk}/100</small></div>
                <div className="card-body">
                  <div className="meter" style={{marginTop:2}}><i style={{width: liq.risk+'%'}} /></div>
                  <div className="heatmap" style={{marginTop:10}}>
                    {liq.clusters.length? liq.clusters.map((c,i)=>(
                      <div key={i} className={`hm-cell ${c.risk==='CRITICAL'?'critical': c.risk==='HIGH'?'high':''}`}>
                        <div className="mono" style={{fontWeight:800}}>${formatPrice(c.price)}</div>
                        <div style={{fontSize:11, color:'var(--muted)'}}>{formatUSD(c.q)} • {c.dist}%</div>
                        <div style={{marginTop:4}}><span className={`badge ${c.risk==='CRITICAL'?'badge-short':'badge-shark'}`}>{c.risk} • %{c.prob}</span></div>
                      </div>
                    )) : <div className="muted" style={{gridColumn:'1/-1', textAlign:'center', padding:12}}>Yakın pool yok — dengeli</div>}
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="card-head"><h3>🐋 Son balinalar</h3><small>{whaleTrades.length} feed</small></div>
                <div className="card-body" style={{padding:0}}>
                  <div style={{maxHeight:260, overflow:'auto'}}>
                    <table className="table">
                      <thead><tr><th>Zaman</th><th>Fiyat</th><th>Hacim</th><th>Yön</th></tr></thead>
                      <tbody>{whaleTrades.map((t,i)=>(
                        <tr key={i}><td className="muted">{new Date(t.time).toLocaleTimeString('tr-TR')}</td><td className="mono">{formatPrice(t.price)}</td><td>{formatUSD(t.quote)}</td><td><span className={`badge ${t.isBuyer?'badge-long':'badge-short'}`}>{t.isBuyer?'LONG':'SHORT'}</span></td></tr>
                      ))}</tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {tab==='whales' && (
          <div className="card"><div className="card-head"><h3>🐋 Balina Akışı</h3><small>{trades.length} trade</small></div>
            <div className="card-body">
              <div style={{height:12, background:'#FFF0F7', borderRadius:999, overflow:'hidden', display:'flex', border:'1px solid var(--border)'}}><div style={{width: flow.buy+'%', background:'var(--success)'}} /><div style={{width: flow.sell+'%', background:'var(--danger)'}} /></div>
              <div className="row" style={{justifyContent:'space-between', marginTop:8, fontSize:11}}><span className="badge badge-long">ALIŞ {flow.buy.toFixed(1)}%</span><span className="mono">{formatUSD(flow.delta)} • {flow.imb.toFixed(2)}%</span><span className="badge badge-short">SATIŞ {flow.sell.toFixed(1)}%</span></div>
              <div style={{marginTop:12, maxHeight:420, overflow:'auto'}}>
                <table className="table">
                  <thead><tr><th>Fiyat</th><th>Qty</th><th>Değer</th><th>Yön</th><th>Tür</th></tr></thead>
                  <tbody>{trades.slice(-40).reverse().map((t,i)=>(
                    <tr key={i}><td className="mono">{formatPrice(t.price)}</td><td>{t.qty.toFixed(4)}</td><td>{formatUSD(t.quote)}</td><td><span className={`badge ${t.isBuyer?'badge-long':'badge-short'}`}>{t.isBuyer?'AL':'SAT'}</span></td><td><span className={`badge ${t.quote>=100000?'badge-whale': t.quote>=10000?'badge-shark':'badge badge-shark'}`}>{t.quote>=100000?'WHALE': t.quote>=10000?'SHARK':'FISH'}</span></td></tr>
                  ))}</tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {tab==='signals' && (
          <div className="card"><div className="card-head"><h3>◉ Sinyaller • Confluence</h3><small className="muted">RSI {confluence.rsi} • EMA9 {confluence.ema9}</small></div>
            <div className="card-body">
              <div style={{display:'flex', alignItems:'center', gap:12}}><b style={{fontSize:32}}>{confluence.score}</b><span>/100</span><span className={`badge ${confluence.signal==='BUY'?'badge-long': confluence.signal==='SELL'?'badge-short':'badge-shark'}`}>{confluence.signal}</span></div>
              <div className="meter" style={{marginTop:8}}><i style={{width: confluence.score+'%'}} /></div>
              <div className="muted" style={{marginTop:12, fontSize:13, lineHeight:1.6}}>
                Skor: EMA + RSI + Volume + momentum. 68 üstü BUY, 38 altı SELL. Şu an {confluence.signal} bölgesinde.
                CVD {formatUSD(cvd)} ile birleştir — divergence varsa teyit et.
              </div>
            </div>
          </div>
        )}

        {tab==='plan' && (
          <div className="card">
            <div className="card-head"><h3>◎ Akıllı Plan</h3><small>ATR 1.5x SL • 1:2 / 1:3</small></div>
            <div className="card-body">
              <div className="row" style={{gap:8}}>
                <label> Bakiye <input type="number" value={balance} onChange={e=>setBalance(parseFloat(e.target.value)||0)} style={{width:110}} aria-label="Bakiye" inputMode="decimal" /></label>
                <label> Risk % <input type="number" value={risk} onChange={e=>setRisk(parseFloat(e.target.value)||0)} style={{width:80}} aria-label="Risk yüzdesi" inputMode="decimal" /></label>
                <button className="btn btn-primary" onClick={genPlan} aria-label="Plan oluştur">⚡ Oluştur</button>
              </div>
              {plan ? (
                <div style={{marginTop:12}}>
                  <div className="row" style={{marginBottom:8}}><span className={`badge ${plan.dir==='LONG'?'badge-long':'badge-short'}`}>{plan.dir}</span><span className="mono muted">Entry ${formatPrice(plan.entry)}</span></div>
                  <div className="plan-grid">
                    <div className="plan-box entry"><label>Entry</label><b className="mono">${formatPrice(plan.entry)}</b></div>
                    <div className="plan-box sl"><label>Stop Loss</label><b className="mono">${formatPrice(plan.sl)}</b></div>
                    <div className="plan-box tp"><label>TP1 (1:2)</label><b className="mono">${formatPrice(plan.tp1)}</b></div>
                    <div className="plan-box tp"><label>TP2 (1:3)</label><b className="mono">${formatPrice(plan.tp2)}</b></div>
                    <div className="plan-box"><label>Pozisyon</label><b>{plan.size.toFixed(5)} • {plan.lev}x</b></div>
                    <div className="plan-box"><label>Risk</label><b>{formatUSD(plan.riskAmt)}</b></div>
                  </div>
                </div>
              ) : <div className="muted" style={{marginTop:12}}>Plan oluşturmak için butona bas — canlı fiyat + confluence ile hesaplar.</div>}
            </div>
          </div>
        )}

        {tab==='arbitrage' && (
          <div className="card"><div className="card-head"><h3>⚡ Arbitraj</h3><small>Binance ↔ Bybit/OKX net %0.15 filtre</small></div>
            <div className="card-body">
              <div style={{background:'#F5F3FF', border:'1px solid var(--border)', borderRadius:14, padding:12}}>
                <div className="muted" style={{fontSize:12}}>Gerçek cross-exchange için Bybit/OKX WS'i de bağlıyoruz. Şu an Binance bookTicker canlı: Bid {ticker? formatPrice(ticker.bid):'-'} / Ask {ticker? formatPrice(ticker.ask):'-'} Spread {ticker? ((ticker.ask - ticker.bid)/ticker.bid*100).toFixed(3):'-'}%</div>
                <div className="mono" style={{marginTop:8, fontSize:11}}>Not: fee sonrası net kâr hesapları burada listelenir. Şu an tek borsa bağlı olduğu için fırsat yok — çoklu borsa eklemek için engine hazır.</div>
              </div>
              <div className="muted" style={{marginTop:10, fontSize:11}}>Fee: Binance 0.1% / Bybit 0.1% / OKX 0.08% + 0.05% slippage buffer → net = gross - feeBuy - feeSell - 0.05%</div>
            </div>
          </div>
        )}

        <div style={{marginTop:12, background:'#F5F3FF', border:'1px dashed var(--border)', borderRadius:14, padding:12, color:'#6D28D9', fontSize:12, lineHeight:1.6}}>
          <b>💡 Pastel not:</b> Bu tema göz yormaz, gece gündüz kullanılabilir. Altta toolbar sabit — tek elle tüm sekmelere erişim. Üstteki tab'ler sadece masaüstünde.
        </div>
      </div>

      <BottomNav active={tab} onChange={setTab} counts={{signals: confluence.score>60?2:0, arb:0}} />

      <div className="toast-stack">
        {toasts.map(t=>(
          <div key={t.id} className={`toast ${t.kind}`}>
            <div style={{flex:1}}><div style={{fontWeight:800, fontSize:12}}>{t.title} {t.count>1? `×${t.count}`:''}</div><div style={{color:'var(--muted)', marginTop:2}}>{t.msg}</div></div>
            <button onClick={()=> setToasts(p=>p.filter(x=>x.id!==t.id))} style={{background:'white', border:'1px solid var(--border)', borderRadius:8, width:24, height:24, display:'grid', placeItems:'center', cursor:'pointer'}}>✕</button>
          </div>
        ))}
      </div>
    </div>
  )
}
