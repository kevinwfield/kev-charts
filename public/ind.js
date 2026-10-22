function sma(v,n){const o=new Array(v.length).fill(null);let s=0;for(let i=0;i<v.length;i++){s+=v[i];if(i>=n)s-=v[i-n];if(i>=n-1)o[i]=s/n;}return o;}
function ema(v,n){const o=new Array(v.length).fill(null);if(v.length<n)return o;const a=2/(n+1);let e=0;for(let i=0;i<n;i++)e+=v[i];e/=n;o[n-1]=e;for(let i=n;i<v.length;i++){e=a*v[i]+(1-a)*e;o[i]=e;}return o;}
function wma(v,n){const o=new Array(v.length).fill(null);const d=n*(n+1)/2;for(let i=n-1;i<v.length;i++){let s=0;for(let j=0;j<n;j++)s+=v[i-j]*(n-j);o[i]=s/d;}return o;}
function ma(type,v,n){return type==='EMA'?ema(v,n):type==='WMA'?wma(v,n):sma(v,n);}
function rsi(c,n){const o=new Array(c.length).fill(null);if(c.length<=n)return o;let g=0,l=0;for(let i=1;i<=n;i++){const d=c[i]-c[i-1];if(d>0)g+=d;else l-=d;}g/=n;l/=n;const f=(g,l)=>l===0?100:g===0?0:100-100/(1+g/l);o[n]=f(g,l);
 for(let i=n+1;i<c.length;i++){const d=c[i]-c[i-1];g=(g*(n-1)+Math.max(d,0))/n;l=(l*(n-1)+Math.max(-d,0))/n;o[i]=f(g,l);}return o;}
function smaN(v,n){/* sma over array with leading nulls */const o=new Array(v.length).fill(null);const st=v.findIndex(x=>x!=null);if(st<0)return o;const s=sma(v.slice(st),n);for(let i=0;i<s.length;i++)o[st+i]=s[i];return o;}
function stochRsi(c,rl=14,sl=14,kl=3,dl=3){const r=rsi(c,rl);const st=new Array(c.length).fill(null);for(let i=0;i<c.length;i++){if(i<rl+sl-1)continue;let lo=Infinity,hi=-Infinity;for(let j=i-sl+1;j<=i;j++){lo=Math.min(lo,r[j]);hi=Math.max(hi,r[j]);}st[i]=hi===lo?0:100*(r[i]-lo)/(hi-lo);}const k=smaN(st,kl),d=smaN(k,dl);return {k,d};}
if(typeof module!=='undefined')module.exports={sma,ema,wma,rsi,stochRsi};
