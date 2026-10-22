const http=require('http'),fs=require('fs'),path=require('path');
const PORT=process.env.PORT||8787,PUB=path.join(__dirname,'public');
const UA={'User-Agent':'Mozilla/5.0'};
const ALIAS={GOLD:'GC=F',XAUUSD:'GC=F',SILVER:'SI=F',XAGUSD:'SI=F',OIL:'CL=F',WTI:'CL=F',BRENT:'BZ=F',COPPER:'HG=F',NATGAS:'NG=F',SPX:'^GSPC',NASDAQ:'^IXIC',DXY:'DX-Y.NYB'};
const isCrypto=s=>/(USDT|USDC|BTC|FDUSD)$/.test(s)&&s.length>5&&!s.includes('=');
function ysym(s){if(ALIAS[s])return ALIAS[s];if(/^[A-Z]{6}$/.test(s)&&!isCrypto(s))return s+'=X';return s;}
const cache=new Map();
async function j(url,ttl=10000){const c=cache.get(url);if(c&&Date.now()-c.t<ttl)return c.v;const r=await fetch(url,{headers:UA});if(!r.ok)throw new Error(r.status+' '+url.split('?')[0]);const v=await r.json();cache.set(url,{t:Date.now(),v});return v;}
const BN='https://data-api.binance.vision/api/v3';
const MX='https://api.mexc.com/api/v3',MTF={'15m':'15m','1h':'60m','4h':'4h','1d':'1d','1w':'1W','1M':'1M'};
const live=new Map();async function binanceLive(sym){const c=live.get(sym);if(c&&Date.now()-c.t<3600e3)return c.v;let v=false;try{const t=await j(`${BN}/ticker/24hr?symbol=${sym}`,8000);v=Date.now()-t.closeTime<6*3600e3;}catch{}live.set(sym,{t:Date.now(),v});return v;}
const BTF={'15m':'15m','1h':'1h','4h':'4h','1d':'1d','1w':'1w','1M':'1M'};
const YTF={'15m':['15m','60d'],'1h':['60m','730d'],'4h':['60m','730d'],'1d':['1d','20y'],'1w':['1wk','20y'],'1M':['1mo','50y']};
async function candles(sym,tf){
 if(isCrypto(sym)){const map=k=>k.map(a=>({time:a[0]/1000,open:+a[1],high:+a[2],low:+a[3],close:+a[4],volume:+a[5]}));
  try{if(!(await binanceLive(sym)))throw 0;return {src:'Binance',bars:map(await j(`${BN}/klines?symbol=${sym}&interval=${BTF[tf]}&limit=1000`))};}
  catch{return {src:'MEXC',bars:map(await j(`${MX}/klines?symbol=${sym}&interval=${MTF[tf]}&limit=500`))};}}
 const [iv,rg]=YTF[tf];const d=await j(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ysym(sym))}?interval=${iv}&range=${rg}`,tf==='1d'||tf==='1w'||tf==='1M'?60000:15000);
 const r=d.chart.result[0],q=r.indicators.quote[0];let bars=[];
 (r.timestamp||[]).forEach((t,i)=>{if(q.open[i]==null||q.close[i]==null)return;bars.push({time:t,open:q.open[i],high:q.high[i],low:q.low[i],close:q.close[i],volume:q.volume[i]||0});});
 if(tf==='4h'){const m=new Map();for(const b of bars){const k=Math.floor(b.time/14400)*14400;const a=m.get(k);if(!a)m.set(k,{...b,time:k});else{a.high=Math.max(a.high,b.high);a.low=Math.min(a.low,b.low);a.close=b.close;a.volume+=b.volume;}}bars=[...m.values()];}
 const seen=new Set();bars=bars.filter(b=>!seen.has(b.time)&&seen.add(b.time));bars.sort((a,b)=>a.time-b.time);
 return {src:'Yahoo Finance ('+ysym(sym)+')',name:r.meta.shortName||r.meta.longName,bars};}
async function quote(sym){
 if(isCrypto(sym)){if(await binanceLive(sym)){const t=await j(`${BN}/ticker/24hr?symbol=${sym}`,8000);return {sym,last:+t.lastPrice,chg:+t.priceChangePercent,src:'Binance'};}
  const t=await j(`${MX}/ticker/24hr?symbol=${sym}`,8000);return {sym,last:+t.lastPrice,chg:+t.priceChangePercent*100,src:'MEXC'};}
 const d=await j(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ysym(sym))}?interval=1d&range=5d`,15000);const m=d.chart.result[0].meta;
 const prev=m.chartPreviousClose,closes=d.chart.result[0].indicators.quote[0].close.filter(x=>x!=null);const p2=closes.length>1?closes[closes.length-2]:prev;const last=m.regularMarketPrice;
 return {sym,last,chg:(last/p2-1)*100};}
const MIME={'.html':'text/html','.js':'text/javascript','.json':'application/json','.png':'image/png','.css':'text/css','.webmanifest':'application/manifest+json'};
http.createServer(async(req,res)=>{const u=new URL(req.url,'http://x');
 try{if(u.pathname==='/api/candles'){const s=(u.searchParams.get('sym')||'').toUpperCase(),tf=u.searchParams.get('tf');if(!BTF[tf])throw new Error('bad tf');const v=await candles(s,tf);res.writeHead(200,{'content-type':'application/json','cache-control':'no-store'});return res.end(JSON.stringify(v));}
 if(u.pathname==='/api/quotes'){const ss=(u.searchParams.get('syms')||'').toUpperCase().split(',').filter(Boolean).slice(0,40);const v=await Promise.all(ss.map(s=>quote(s).catch(e=>({sym:s,err:e.message}))));res.writeHead(200,{'content-type':'application/json','cache-control':'no-store'});return res.end(JSON.stringify(v));}
 let p=path.normalize(u.pathname==='/'?'/index.html':u.pathname);const f=path.join(PUB,p);if(!f.startsWith(PUB)||!fs.existsSync(f)){res.writeHead(404);return res.end('nf');}
 res.writeHead(200,{'content-type':MIME[path.extname(f)]||'application/octet-stream','cache-control':'no-cache'});fs.createReadStream(f).pipe(res);
 }catch(e){res.writeHead(502,{'content-type':'application/json'});res.end(JSON.stringify({error:e.message}));}}).listen(PORT,()=>console.log('on',PORT));
