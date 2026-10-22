const $=s=>document.querySelector(s);const LS={get:(k,d)=>{try{const v=localStorage.getItem('kc.'+k);return v?JSON.parse(v):d}catch{return d}},set:(k,v)=>localStorage.setItem('kc.'+k,JSON.stringify(v))};
const TFS=[['15m','15m',900],['1H','1h',3600],['4H','4h',14400],['1D','1d',86400],['1W','1w',604800],['1M','1M',2592000]];
const DEF_MA=[{on:true,type:'EMA',len:21,color:'#7CFC9A'},{on:true,type:'SMA',len:50,color:'#2196f3'},{on:true,type:'SMA',len:200,color:'#ef5350'}];
const DEF_ST={r:14,s:14,k:3,d:3};const FIBL=[0,0.236,0.382,0.5,0.618,0.786,0.886,1];
const FIBC=['#787b86','#f23645','#ff9800','#4caf50','#089981','#00bcd4','#2962ff','#787b86'];
let S={sym:LS.get('sym','XMRUSDT'),tf:LS.get('tf','1w'),mas:LS.get('mas',DEF_MA),st:LS.get('st',DEF_ST),wl:LS.get('wl',['XMRUSDT','BTCUSDT','ETHUSDT','SOLUSDT','GOLD','SILVER','OIL','NZDUSD','AUDUSD','EURUSD','AAPL'])};
let bars=[],tfSec=604800,fibs=LS.get('fibs',{}),sel=-1,mode=null,pending=null;
const opts={layout:{background:{color:'#0e1117'},textColor:'#b2b5be',fontSize:11},grid:{vertLines:{color:'#1a1e28'},horzLines:{color:'#1a1e28'}},rightPriceScale:{borderColor:'#2a2e39',minimumWidth:68},timeScale:{borderColor:'#2a2e39',rightOffset:6},crosshair:{mode:0},handleScale:{pinch:true,mouseWheel:true,axisPressedMouseMove:true},handleScroll:{horzTouchDrag:true,vertTouchDrag:false,pressedMouseMove:true}};
const ch=LightweightCharts.createChart($('#c1'),{...opts,autoSize:true,timeScale:{...opts.timeScale,visible:false}});
const ch2=LightweightCharts.createChart($('#c2'),{...opts,autoSize:true,timeScale:{...opts.timeScale,timeVisible:true}});
const cs=ch.addCandlestickSeries({upColor:'#26a69a',downColor:'#ef5350',borderVisible:false,wickUpColor:'#26a69a',wickDownColor:'#ef5350'});
let maS=[];const kS=ch2.addLineSeries({color:'#2962ff',lineWidth:1.5,priceLineVisible:false,lastValueVisible:false}),dS=ch2.addLineSeries({color:'#ff9800',lineWidth:1.5,priceLineVisible:false,lastValueVisible:false});
kS.createPriceLine({price:80,color:'#787b86',lineStyle:2,axisLabelVisible:false});kS.createPriceLine({price:20,color:'#787b86',lineStyle:2,axisLabelVisible:false});
ch2.priceScale('right').applyOptions({scaleMargins:{top:.08,bottom:.08}});[kS,dS].forEach(x=>x.applyOptions({autoscaleInfoProvider:()=>({priceRange:{minValue:0,maxValue:100}})}));
let syncing=false;function sync(a,b){a.timeScale().subscribeVisibleLogicalRangeChange(r=>{if(syncing||!r)return;syncing=true;b.timeScale().setVisibleLogicalRange(r);syncing=false;});}sync(ch,ch2);sync(ch2,ch);
ch.subscribeCrosshairMove(p=>legend(p.logical));ch2.subscribeCrosshairMove(p=>legend(p.logical));
function fmt(x){if(x==null||isNaN(x))return'–';const a=Math.abs(x);return x.toFixed(a>=1000?2:a>=10?2:a>=1?4:a>=0.01?5:8);}
// ---------- data ----------
let ind={},srcName='';
async function load(keepView){$('#status').style.display='flex';$('#status').textContent='Loading '+S.sym+'…';
 try{const r=await fetch(`/api/candles?sym=${encodeURIComponent(S.sym)}&tf=${S.tf}`);const d=await r.json();if(d.error)throw new Error(d.error);if(!d.bars.length)throw new Error('No data');
  bars=d.bars;cs.setData(bars);const p=Math.max(...bars.slice(-50).map(b=>b.close));cs.applyOptions({priceFormat:{type:'price',precision:p>=10?2:p>=1?4:6,minMove:p>=10?.01:p>=1?.0001:.000001}});
  srcName=d.src;$('#status').style.display='none';calc();if(!keepView){ch.timeScale().setVisibleLogicalRange({from:bars.length-(innerWidth<600?90:180),to:bars.length+5});}hdr();}
 catch(e){$('#status').textContent='⚠ '+S.sym+': '+e.message;bars=[];cs.setData([]);calc();}}
function calc(){const c=bars.map(b=>b.close);maS.forEach(s=>ch.removeSeries(s));maS=[];ind.ma=[];
 S.mas.forEach(m=>{if(!m.on)return;const v=ma(m.type,c,+m.len);const s=ch.addLineSeries({color:m.color,lineWidth:2,priceLineVisible:false,lastValueVisible:false,crosshairMarkerVisible:false});s.setData(bars.map((b,i)=>v[i]==null?{time:b.time}:{time:b.time,value:v[i]}));maS.push(s);ind.ma.push({m,v});});
 const st=stochRsi(c,+S.st.r,+S.st.s,+S.st.k,+S.st.d);ind.st=st;kS.setData(bars.map((b,i)=>st.k[i]==null?{time:b.time}:{time:b.time,value:st.k[i]}));dS.setData(bars.map((b,i)=>st.d[i]==null?{time:b.time}:{time:b.time,value:st.d[i]}));legend();}
function legend(li){const i=li==null||li>=bars.length||li<0?bars.length-1:Math.round(li);const b=bars[i];if(!b){$('#legend').innerHTML='';return;}
 $('#legend').innerHTML=`<b>${S.sym}</b> · ${TFS.find(t=>t[1]===S.tf)[0]} · <span>${srcName}</span><br>O ${fmt(b.open)} H ${fmt(b.high)} L ${fmt(b.low)} <span class="${b.close>=b.open?'up':'dn'}">C ${fmt(b.close)}</span><br>`+(ind.ma||[]).map(x=>`<span style="color:${x.m.color}">${x.m.type} ${x.m.len} ${fmt(x.v[i])}</span>`).join(' ');
 $('#legend2').innerHTML=`Stoch RSI ${S.st.k} ${S.st.d} ${S.st.r} ${S.st.s} <span style="color:#2962ff">${ind.st?.k[i]?.toFixed(2)??'–'}</span> <span style="color:#ff9800">${ind.st?.d[i]?.toFixed(2)??'–'}</span>`;}
function hdr(){const b=bars[bars.length-1],a=bars[bars.length-2];$('#symBtn').textContent=S.sym+' ▾';if(!b)return;const ch=a?(b.close/a.close-1)*100:0;$('#price').innerHTML=`${fmt(b.close)} <span class="${ch>=0?'up':'dn'}">${ch>=0?'+':''}${ch.toFixed(2)}%</span>`;document.title=S.sym+' '+fmt(b.close);}
async function live(){if(!bars.length||document.hidden)return;try{const d=await (await fetch(`/api/candles?sym=${encodeURIComponent(S.sym)}&tf=${S.tf}`)).json();const last=bars[bars.length-1].time;const nb=d.bars.filter(b=>b.time>=last);if(!nb.length)return;
 if(d.bars[d.bars.length-1].time-last>tfSec*3)return;nb.forEach(b=>{cs.update(b);const i=bars.findIndex(x=>x.time===b.time);if(i>=0)bars[i]=b;else bars.push(b);});
 const lr=ch.timeScale().getVisibleLogicalRange();calc();if(lr)ch.timeScale().setVisibleLogicalRange(lr);hdr();}catch{}}
setInterval(live,20000);
// ---------- timeframe ----------
TFS.forEach(([l,v,s])=>{const b=document.createElement('button');b.className='b';b.textContent=l;b.dataset.tf=v;b.onclick=()=>{S.tf=v;LS.set('tf',v);setTf();load();};$('#tfs').appendChild(b);});
function setTf(){tfSec=TFS.find(t=>t[1]===S.tf)[2];document.querySelectorAll('#tfs button').forEach(b=>b.classList.toggle('on',b.dataset.tf===S.tf));ch2.applyOptions({timeScale:{timeVisible:tfSec<86400}});}
// ---------- watchlist ----------
function renderWL(q={}){$('#wl').innerHTML='';S.wl.forEach(s=>{const r=document.createElement('div');r.className='row'+(s===S.sym?' act':'');const x=q[s];
 r.innerHTML=`<span class="s">${s}</span><span class="p">${x&&!x.err?fmt(x.last):x?.err?'n/a':'…'}</span><span class="c ${x?.chg>=0?'up':'dn'}">${x&&x.chg!=null&&!x.err?(x.chg>=0?'+':'')+x.chg.toFixed(2)+'%':''}</span><button class="x" title="Remove">×</button>`;
 r.onclick=e=>{if(e.target.classList.contains('x')){S.wl=S.wl.filter(y=>y!==s);LS.set('wl',S.wl);renderWL(lastQ);return;}pick(s);$('#side').classList.remove('open');};$('#wl').appendChild(r);});}
let lastQ={};async function quotes(){if(document.hidden)return;try{const d=await (await fetch('/api/quotes?syms='+S.wl.join(','))).json();lastQ={};d.forEach(x=>lastQ[x.sym]=x);renderWL(lastQ);}catch{}}
setInterval(quotes,30000);
$('#addf').onsubmit=e=>{e.preventDefault();const s=$('#addIn').value.trim().toUpperCase().replace(/[\s/]/g,'');if(s&&!S.wl.includes(s)){S.wl.push(s);LS.set('wl',S.wl);}$('#addIn').value='';renderWL(lastQ);quotes();pick(s);};
function pick(s){if(!s)return;S.sym=s;LS.set('sym',s);sel=-1;renderWL(lastQ);load();}
$('#wlBtn').onclick=$('#symBtn').onclick=()=>{$('#side').classList.add('open');quotes();};$('#wlClose').onclick=()=>$('#side').classList.remove('open');
// ---------- settings ----------
function openDlg(){const R=$('#maRows');R.innerHTML='';S.mas.forEach((m,i)=>{const d=document.createElement('div');d.className='r';d.innerHTML=`<input type="checkbox" ${m.on?'checked':''}><select>${['EMA','SMA','WMA'].map(t=>`<option ${t===m.type?'selected':''}>${t}</option>`).join('')}</select><input type="number" min="1" max="1000" value="${m.len}"><input type="color" value="${m.color}">`;R.appendChild(d);});
 $('#sR').value=S.st.r;$('#sS').value=S.st.s;$('#sK').value=S.st.k;$('#sD').value=S.st.d;$('#dlg').showModal();}
$('#maBtn').onclick=openDlg;$('#dReset').onclick=()=>{S.mas=JSON.parse(JSON.stringify(DEF_MA));S.st={...DEF_ST};openDlg();};
$('#dOk').onclick=()=>{S.mas=[...$('#maRows').children].map(r=>{const e=r.querySelectorAll('input,select');return{on:e[0].checked,type:e[1].value,len:Math.max(1,+e[2].value||1),color:e[3].value}});S.st={r:+$('#sR').value||14,s:+$('#sS').value||14,k:+$('#sK').value||3,d:+$('#sD').value||3};LS.set('mas',S.mas);LS.set('st',S.st);$('#dlg').close();calc();};
// ---------- fib tool ----------
const svg=$('#ovl'),NS='http://www.w3.org/2000/svg';
function t2x(t){if(!bars.length)return null;const n=bars.length;let li;if(t>=bars[n-1].time)li=n-1+(t-bars[n-1].time)/tfSec;else if(t<=bars[0].time)li=(t-bars[0].time)/tfSec;else{let lo=0,hi=n-1;while(hi-lo>1){const m=(lo+hi)>>1;bars[m].time<=t?lo=m:hi=m;}li=lo+(t-bars[lo].time)/(bars[hi].time-bars[lo].time);}return ch.timeScale().logicalToCoordinate(li);}
function x2t(x){const li=ch.timeScale().coordinateToLogical(x);if(li==null||!bars.length)return null;const n=bars.length;if(li>=n-1)return bars[n-1].time+(li-(n-1))*tfSec;if(li<=0)return bars[0].time+li*tfSec;const lo=Math.floor(li);return bars[lo].time+(li-lo)*(bars[lo+1].time-bars[lo].time);}
const p2y=p=>cs.priceToCoordinate(p),y2p=y=>cs.coordinateToPrice(y);
const myF=()=>fibs[S.sym]||(fibs[S.sym]=[]);const saveF=()=>LS.set('fibs',fibs);
function el(tag,a,parent){const e=document.createElementNS(NS,tag);for(const k in a)e.setAttribute(k,a[k]);(parent||svg).appendChild(e);return e;}
let sig='';function draw(force){const F=myF(),W=svg.clientWidth;const all=pending?[...F,pending]:F;
 const geo=all.map(f=>[t2x(f.t1),p2y(f.p1),t2x(f.t2),p2y(f.p2)]);const s=JSON.stringify(geo)+sel+W+svg.clientHeight;if(s===sig&&!force)return;sig=s;svg.innerHTML='';
 all.forEach((f,i)=>{const [x1,y1,x2,y2]=geo[i];if(x1==null||x2==null||y1==null||y2==null)return;const g=el('g',{});const L=Math.min(x1,x2),R=Math.max(Math.max(x1,x2),W-ch.priceScale('right').width()-2);const on=i===sel;
  el('line',{x1,y1,x2,y2,stroke:'#787b86','stroke-dasharray':'4 4','stroke-width':1},g);
  FIBL.forEach((l,j)=>{const p=f.p2+(f.p1-f.p2)*l,y=p2y(p);if(y==null)return;el('line',{x1:L,x2:R,y1:y,y2:y,stroke:FIBC[j],'stroke-width':on?2:1.2},g);const hit=el('line',{x1:L,x2:R,y1:y,y2:y,stroke:'transparent','stroke-width':16,class:'h','data-i':i,'data-k':'m'},g);
   const tx=el('text',{x:L+3,y:y-3,fill:FIBC[j],'font-size':10.5},g);tx.textContent=`${l} (${fmt(p)})`;});
  if(on||i===F.length&&pending){[[x1,y1,'a'],[x2,y2,'b']].forEach(([cx,cy,k])=>el('circle',{cx,cy,r:9,fill:'#2962ff',stroke:'#fff','stroke-width':2,class:'h','data-i':i,'data-k':k},g));el('rect',{x:(x1+x2)/2-9,y:(y1+y2)/2-9,width:18,height:18,rx:4,fill:'#ff9800',stroke:'#fff','stroke-width':2,class:'h','data-i':i,'data-k':'m'},g);}});
 $('#fibbar').classList.toggle('show',sel>=0&&sel<F.length);}
(function loop(){draw();requestAnimationFrame(loop);})();
function pt(e){const r=svg.getBoundingClientRect();return [e.clientX-r.left,e.clientY-r.top];}
let drag=null;
svg.addEventListener('pointerdown',e=>{const [x,y]=pt(e);
 if(mode==='fib'){e.preventDefault();svg.setPointerCapture(e.pointerId);const t=x2t(x),p=y2p(y);if(t==null||p==null)return;
  if(pending&&pending.tap){pending.t2=t;pending.p2=p;finish();return;}pending={t1:t,p1:p,t2:t,p2:p,x0:x,y0:y};drag={k:'new',id:e.pointerId};return;}
 const h=e.target.closest?.('.h');if(!h)return;e.preventDefault();e.stopPropagation();const i=+h.dataset.i;sel=i;const f=myF()[i];svg.classList.add('draw');svg.setPointerCapture(e.pointerId);drag={k:h.dataset.k,i,id:e.pointerId,x,y,f0:{...f},moved:false};draw(true);});
svg.addEventListener('pointermove',e=>{if(!drag||e.pointerId!==drag.id)return;e.preventDefault();const [x,y]=pt(e);const t=x2t(x),p=y2p(y);if(t==null||p==null)return;
 if(drag.k==='new'){pending.t2=t;pending.p2=p;return;}const f=myF()[drag.i];drag.moved=true;
 if(drag.k==='a'){f.t1=t;f.p1=p;}else if(drag.k==='b'){f.t2=t;f.p2=p;}else{const dt=t-x2t(drag.x),dp=p-y2p(drag.y);f.t1=drag.f0.t1+dt;f.t2=drag.f0.t2+dt;f.p1=drag.f0.p1+dp;f.p2=drag.f0.p2+dp;}});
svg.addEventListener('pointerup',e=>{if(!drag||e.pointerId!==drag.id)return;const [x,y]=pt(e);
 if(drag.k==='new'){drag=null;if(Math.hypot(x-pending.x0,y-pending.y0)<12){pending.tap=true;$('#hint').textContent='Now tap the second point';return;}finish();return;}drag=null;lastAct=Date.now();if(mode!=='fib')svg.classList.remove('draw');saveF();});
svg.addEventListener('pointercancel',()=>{drag=null;if(mode!=='fib')svg.classList.remove('draw');});
function finish(){lastAct=Date.now();const f={t1:pending.t1,p1:pending.p1,t2:pending.t2,p2:pending.p2};pending=null;drag=null;myF().push(f);sel=myF().length-1;saveF();setMode(null);}
function setMode(m){mode=m;svg.classList.toggle('draw',m==='fib');$('#fibBtn').classList.toggle('on',m==='fib');$('#hint').style.display=m==='fib'?'block':'none';$('#hint').textContent='Drag between two points (or tap twice)';if(!m)pending=null;draw(true);}
$('#fibBtn').onclick=()=>setMode(mode==='fib'?null:'fib');
$('#fibDel').onclick=()=>{if(sel>=0){myF().splice(sel,1);sel=-1;saveF();draw(true);}};$('#fibClr').onclick=()=>{if(confirm('Remove all fibs on '+S.sym+'?')){fibs[S.sym]=[];sel=-1;saveF();draw(true);}};
let lastAct=0;ch.subscribeClick(()=>{if(Date.now()-lastAct<600)return;if(sel>=0&&!drag){sel=-1;draw(true);}});
// ---------- boot ----------
setTf();renderWL();load();quotes();if('serviceWorker'in navigator)navigator.serviceWorker.register('sw.js');
window.__kc={S,get bars(){return bars},ind,fibs,ch,cs};
