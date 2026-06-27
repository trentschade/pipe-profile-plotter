export const S = {
  units:'imp', showGnd:true, showBsmt:false, showHGL:false, showGround:false,
  mh:[],
  pipe:[],
  street:[],
  gnd:[],
  hgls:[],
  bsmt:[],
  ground:[],
};

export let activeTab = 'mh';
export function setActiveTab(id){ activeTab = id; }

export const U = {
  isImp:()=>S.units==='imp',
  eu:()=>S.units==='imp'?'ft':'m',
  lu:()=>S.units==='imp'?'ft':'m',
  du:()=>S.units==='imp'?'in':'mm',
  defElev:()=>S.units==='imp'?100.0:30.0,
  defLen:()=>S.units==='imp'?300:100,
  defDia:()=>S.units==='imp'?8:200,
  rimOff:()=>S.units==='imp'?5.0:1.5,
  gndOff:()=>S.units==='imp'?2.0:0.6,
  slope:()=>0.003,
  bsmtAbove:()=>S.units==='imp'?3.0:1.0,
  bsmtDepth:()=>S.units==='imp'?8.0:2.5,
  fmt:(v,d=2)=>v==null||isNaN(+v)?'—':(+v).toFixed(d),
};

export function sta(i){ let s=0; for(let k=0;k<i;k++) s+=+(S.pipe[k]?.len||0); return s; }
export function totalLen(){ return S.pipe.reduce((s,p)=>s+(+p.len||0),0); }
export function esc(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

export const HGL_COLORS = ['#1565c0','#c62828','#e65100','#2e7d32','#6a1b9a','#00838f'];
