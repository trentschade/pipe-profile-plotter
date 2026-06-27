import { S, U, sta, totalLen, HGL_COLORS } from './state.js';
import { saveLocal } from './persist.js';

export function groundAtSta(s){
  const src = S.showGnd&&S.gnd.length
    ? [...S.gnd].sort((a,b)=>a.sta-b.sta).map(g=>({elev:g.elev,s:g.sta}))
    : S.mh.map((m,i)=>({elev:m.rim,s:sta(i)}));
  for(let i=0;i<src.length-1;i++){
    if(s>=src[i].s&&s<=src[i+1].s){
      const t=(s-src[i].s)/(src[i+1].s-src[i].s);
      return src[i].elev+t*(src[i+1].elev-src[i].elev);
    }
  }
  return s<src[0].s ? src[0].elev : src[src.length-1].elev;
}

export function catmullRomPath(pts,tx,ty){
  if(pts.length<2) return '';
  if(pts.length===2) return `M ${tx(pts[0].sta)} ${ty(pts[0].elev)} L ${tx(pts[1].sta)} ${ty(pts[1].elev)}`;
  let d=`M ${tx(pts[0].sta)} ${ty(pts[0].elev)}`;
  for(let i=0;i<pts.length-1;i++){
    const p0=pts[Math.max(0,i-1)],p1=pts[i],p2=pts[i+1],p3=pts[Math.min(pts.length-1,i+2)];
    const c1x=tx(p1.sta)+(tx(p2.sta)-tx(p0.sta))/6;
    const c1y=ty(p1.elev)+(ty(p2.elev)-ty(p0.elev))/6;
    const c2x=tx(p2.sta)-(tx(p3.sta)-tx(p1.sta))/6;
    const c2y=ty(p2.elev)-(ty(p3.elev)-ty(p1.elev))/6;
    d+=` C ${c1x} ${c1y} ${c2x} ${c2y} ${tx(p2.sta)} ${ty(p2.elev)}`;
  }
  return d;
}

const M = {t:20, r:32, b:46, l:76};

function niceStep(r){
  const m=Math.pow(10,Math.floor(Math.log10(r||1)));
  const f=r/m;
  return f<1.5?m:f<3?2*m:f<7?5*m:10*m;
}

export function redraw(){
  const svg=document.getElementById('profile-svg');
  svg.innerHTML='';
  const W=svg.clientWidth, H=svg.clientHeight;
  if(W<40||H<40) return;
  const pw=W-M.l-M.r, ph=H-M.t-M.b;
  const tl=totalLen()||1;

  const ev=[];
  S.mh.forEach(m=>{ev.push(m.rim,m.inv)});
  if(S.showGnd) S.gnd.forEach(g=>ev.push(g.elev));
  if(S.showHGL) S.hgls.forEach(l=>l.pts.forEach(h=>ev.push(h.elev)));
  if(S.showBsmt) S.bsmt.forEach(b=>{ev.push(+b.elev||0);ev.push((+b.elev||0)-U.bsmtDepth())});
  if(S.showGround) S.ground.forEach(g=>ev.push(g.elev));
  let emin=Math.min(...ev), emax=Math.max(...ev);
  const er=emax-emin||5;
  emin-=er*0.12; emax+=er*0.18;

  const pad=tl*0.06, smin=-pad, smax=tl+pad;
  const tx=s=>M.l+(s-smin)/(smax-smin)*pw;
  const ty=e=>M.t+(1-(e-emin)/(emax-emin))*ph;

  function mk(tag,a={},txt){
    const el=document.createElementNS('http://www.w3.org/2000/svg',tag);
    Object.entries(a).forEach(([k,v])=>el.setAttribute(k,v));
    if(txt!==undefined) el.textContent=txt;
    return el;
  }

  svg.appendChild(mk('rect',{x:0,y:0,width:W,height:H,fill:'#fafbfc'}));
  svg.appendChild(mk('rect',{x:M.l,y:M.t,width:pw,height:ph,fill:'#fff',stroke:'#c8d4df','stroke-width':1}));

  const gc=mk('svg',{x:M.l,y:M.t,width:pw,height:ph,viewBox:`${M.l} ${M.t} ${pw} ${ph}`,overflow:'hidden'});
  const gl=mk('g');
  svg.appendChild(gc); svg.appendChild(gl);

  const gs=niceStep(er/5);
  const g0=Math.ceil(emin/gs)*gs;
  for(let e=g0;e<=emax+0.0001;e+=gs){
    const y=ty(e);
    gc.appendChild(mk('line',{x1:M.l,y1:y,x2:M.l+pw,y2:y,stroke:'#e8ecf0','stroke-width':1}));
    gl.appendChild(mk('text',{x:M.l-4,y:y+3.5,'text-anchor':'end','font-size':10,fill:'#888'},U.fmt(e)));
  }

  if(S.showGnd && S.gnd.length>1){
    const sgnd=[...S.gnd].sort((a,b)=>a.sta-b.sta);
    const fi=[
      `${tx(sgnd[0].sta)},${M.t+ph}`,
      ...sgnd.map(g=>`${tx(g.sta)},${ty(g.elev)}`),
      `${tx(sgnd[sgnd.length-1].sta)},${M.t+ph}`
    ].join(' ');
    gc.appendChild(mk('polygon',{points:fi,fill:'rgba(100,140,70,.09)',stroke:'none'}));
    gc.appendChild(mk('path',{d:catmullRomPath(sgnd,tx,ty),fill:'none',stroke:'#000','stroke-width':2}));
    gl.appendChild(mk('text',{x:tx(sgnd[0].sta)+6,y:ty(sgnd[0].elev)+10,'font-size':9,fill:'#000'},'ST'));
  }

  if(S.showGround && S.ground.length>1){
    const sorted=[...S.ground].sort((a,b)=>a.sta-b.sta);
    const ext=U.isImp()?5:1.5;
    const n=sorted.length;
    const sl0=sorted[1].sta>sorted[0].sta?(sorted[1].elev-sorted[0].elev)/(sorted[1].sta-sorted[0].sta):0;
    const sln=sorted[n-1].sta>sorted[n-2].sta?(sorted[n-1].elev-sorted[n-2].elev)/(sorted[n-1].sta-sorted[n-2].sta):0;
    const extended=[
      {sta:sorted[0].sta-ext, elev:sorted[0].elev-sl0*ext},
      ...sorted,
      {sta:sorted[n-1].sta+ext, elev:sorted[n-1].elev+sln*ext}
    ];
    gc.appendChild(mk('path',{d:catmullRomPath(extended,tx,ty),fill:'none',stroke:'#7a5c2e','stroke-width':2}));
    gl.appendChild(mk('text',{x:tx(extended[0].sta)+6,y:ty(extended[0].elev)+10,'font-size':9,fill:'#7a5c2e'},'GND'));
  }

  S.street.forEach(st=>{
    if(!st.name) return;
    const x=tx(+st.sta||0);
    gl.appendChild(mk('line',{x1:x,y1:M.t,x2:x,y2:M.t-12,stroke:'#b07020','stroke-width':1.5}));
    gl.appendChild(mk('text',{x:x+3,y:M.t-5,'text-anchor':'start','font-size':10,fill:'#b07020','font-weight':'700'},st.name));
  });

  if(S.showBsmt){
    const depth=U.bsmtDepth();
    S.bsmt.forEach(b=>{
      const x=tx(+b.sta||0);
      const houseBottomY=ty(+b.elev||0);
      const lineEndY=ty((+b.elev||0)-depth);
      const hw=10, bh=8, rh=6;
      gc.appendChild(mk('rect',{x:x-hw,y:houseBottomY,width:hw*2,height:lineEndY-houseBottomY,fill:'none',stroke:'#555','stroke-width':1,'stroke-dasharray':'4 3'}));
      let pipeCenterY=null;
      for(let pi=0;pi<S.pipe.length;pi++){
        const s0=sta(pi),s1=sta(pi+1);
        if(+b.sta>=s0&&+b.sta<=s1){
          const t=s1>s0?(+b.sta-s0)/(s1-s0):0;
          const inv=S.mh[pi].inv+t*(S.mh[pi+1].inv-S.mh[pi].inv);
          const diaElev=U.isImp()?(+S.pipe[pi].dia||0)/12:(+S.pipe[pi].dia||0)/1000;
          pipeCenterY=ty(inv+diaElev/2);
          break;
        }
      }
      if(pipeCenterY!==null){
        gc.appendChild(mk('line',{x1:x,y1:lineEndY,x2:x,y2:pipeCenterY,stroke:'#555','stroke-width':1}));
      }
      const d=`M ${x-hw} ${houseBottomY} L ${x-hw} ${houseBottomY-bh} L ${x} ${houseBottomY-bh-rh} L ${x+hw} ${houseBottomY-bh} L ${x+hw} ${houseBottomY} Z`;
      gc.appendChild(mk('path',{d,fill:'#dce8f5',stroke:'#1a3a5c','stroke-width':2}));
      gl.appendChild(mk('text',{x,y:houseBottomY+10,'text-anchor':'middle','font-size':9,fill:'#1a3a5c'},b.name));
    });
  }

  if(S.showHGL){
    S.hgls.forEach((line,li)=>{
      if(line.pts.length<2) return;
      const col=HGL_COLORS[li%HGL_COLORS.length];
      const pts=line.pts.map((h,i)=>`${tx(sta(i))},${ty(h.elev)}`).join(' ');
      gc.appendChild(mk('polyline',{points:pts,fill:'none',stroke:col,'stroke-width':2,'stroke-dasharray':'10 4'}));
      gl.appendChild(mk('text',{x:M.l+4,y:ty(line.pts[0].elev)-4-li*11,'font-size':9,fill:col},line.name));
    });
  }

  S.pipe.forEach((p,i)=>{
    const mu=S.mh[i], md=S.mh[i+1];
    if(!mu||!md) return;
    const x1=tx(sta(i)), x2=tx(sta(i+1));
    const ui=p.us_inv??mu.inv, di=p.ds_inv??md.inv;
    const y1=ty(ui), y2=ty(di);
    const diaElev=U.isImp()?(+p.dia||0)/12:(+p.dia||0)/1000;
    const y1t=ty(ui+diaElev), y2t=ty(di+diaElev);
    gc.appendChild(mk('polygon',{points:`${x1},${y1} ${x2},${y2} ${x2},${y2t} ${x1},${y1t}`,fill:'#cdd9e8',stroke:'none'}));
    gc.appendChild(mk('line',{x1,y1,x2,y2,stroke:'#1a3a5c','stroke-width':1,'stroke-linecap':'butt'}));
    gc.appendChild(mk('line',{x1,y1:y1t,x2,y2:y2t,stroke:'#1a3a5c','stroke-width':1,'stroke-linecap':'butt'}));

    const mx=(x1+x2)/2;
    const slope=+p.len>0?((ui-di)/+p.len*100):0;
    const line1=`${p.dia} ${U.du()} ${p.mat||''}`.trim();
    const line2=`S=${slope>=0?'':'-'}${Math.abs(slope).toFixed(2)}%`;
    const lw=Math.max(line1.length,line2.length)*5.6+8;
    const lg=mk('g',{transform:`translate(${mx},${M.t+ph-14})`});
    lg.appendChild(mk('rect',{x:-lw/2,y:-12,width:lw,height:22,fill:'rgba(255,255,255,.88)',rx:2,stroke:'#c8d4df','stroke-width':.5}));
    lg.appendChild(mk('text',{x:0,y:-2,'text-anchor':'middle','font-size':9,fill:'#1a3a5c'},line1));
    lg.appendChild(mk('text',{x:0,y:8,'text-anchor':'middle','font-size':9,fill:'#555'},line2));
    gc.appendChild(lg);
  });

  S.mh.forEach((m,i)=>{
    const x=tx(sta(i)), yr=ty(m.rim), yi=ty(m.inv);
    const mw=9;
    gc.appendChild(mk('rect',{x:x-mw/2,y:yr,width:mw,height:Math.max(1,yi-yr),fill:'#cdd9e8',stroke:'#1a3a5c','stroke-width':1.5}));
    gc.appendChild(mk('line',{x1:x-mw/2,y1:yr,x2:x+mw/2,y2:yr,stroke:'#1a3a5c','stroke-width':3}));
    gl.appendChild(mk('text',{x,y:yr-17,'text-anchor':'middle','font-size':10,fill:'#1a3a5c','font-weight':'700'},m.name));
    gl.appendChild(mk('text',{x,y:yr-6,'text-anchor':'middle','font-size':9,fill:'#444'},U.fmt(m.rim)));
    gl.appendChild(mk('text',{x,y:yi+13,'text-anchor':'middle','font-size':9,fill:'#555'},U.fmt(m.inv)));
  });

  const ss=niceStep(tl/6);
  for(let s=0;s<=tl+0.001;s+=ss){
    const x=tx(s);
    gl.appendChild(mk('line',{x1:x,y1:M.t+ph,x2:x,y2:M.t+ph+4,stroke:'#888','stroke-width':1}));
    gl.appendChild(mk('text',{x,y:M.t+ph+14,'text-anchor':'middle','font-size':10,fill:'#666'},U.fmt(s,0)));
  }

  gl.appendChild(mk('text',{x:M.l+pw/2,y:H-3,'text-anchor':'middle','font-size':11,fill:'#555'},`Station (${U.lu()})`));
  const eal=mk('text',{x:11,y:M.t+ph/2,'text-anchor':'middle','font-size':11,fill:'#555',
    transform:`rotate(-90,11,${M.t+ph/2})`},`Elevation (${U.eu()})`);
  gl.appendChild(eal);
  saveLocal();
}
