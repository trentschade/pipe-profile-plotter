import PptxGenJS from 'pptxgenjs';
import { S } from './state.js';
import { redraw } from './drawing.js';
import { buildTabs, showTab } from './tables.js';
import { migrateProfile } from './persist.js';
import { isPremium } from './auth.js';
import { requirePremium } from './gating.js';

export function toggleExp(e){
  e.stopPropagation();
  const dd=document.getElementById('exp-dd');
  dd.hidden=!dd.hidden;
  if(!dd.hidden){
    function close(ev){
      if(!ev.target.closest('.exp-wrap')){dd.hidden=true;document.removeEventListener('click',close)}
    }
    document.addEventListener('click',close);
  }
}

async function svgToPNG(scale=2){
  const svg=document.getElementById('profile-svg');
  const W=svg.clientWidth, H=svg.clientHeight;
  const raw=new XMLSerializer().serializeToString(svg);
  const svgBlob=new Blob([raw],{type:'image/svg+xml;charset=utf-8'});
  const url=URL.createObjectURL(svgBlob);
  const canvas=document.createElement('canvas');
  canvas.width=W*scale; canvas.height=H*scale;
  const ctx=canvas.getContext('2d');
  ctx.fillStyle='#fff'; ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.scale(scale,scale);
  return new Promise((res,rej)=>{
    const img=new Image();
    img.onload=()=>{ctx.drawImage(img,0,0,W,H);URL.revokeObjectURL(url);res({dataUrl:canvas.toDataURL('image/png'),W,H})};
    img.onerror=(err)=>{URL.revokeObjectURL(url);rej(err)};
    img.src=url;
  });
}

function dlBlob(blob,name){
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url; a.download=name; a.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}

export function saveJSON(){
  const data=JSON.stringify({version:1,...S},null,2);
  dlBlob(new Blob([data],{type:'application/json'}),'pipe-profile.json');
}

export function triggerLoad(){
  document.getElementById('exp-dd').hidden=true;
  document.getElementById('json-file-in').value='';
  document.getElementById('json-file-in').click();
}

export function loadJSON(input){
  const file=input.files[0];
  if(!file) return;
  const reader=new FileReader();
  reader.onload=e=>{
    let parsed;
    try{parsed=JSON.parse(e.target.result)}
    catch{alert('Invalid JSON file.');return}
    const required=['mh','pipe','street','gnd','bsmt','ground','units'];
    if(!required.every(k=>k in parsed)||(!('hgl' in parsed)&&!('hgls' in parsed))){
      alert('File does not appear to be a valid pipe profile JSON.');return}
    migrateProfile(parsed);
    Object.assign(S,parsed);
    document.getElementById('setup-screen').style.display='none';
    document.getElementById('main-screen').style.display='flex';
    document.getElementById('u-imp').classList.toggle('on',S.units==='imp');
    document.getElementById('u-met').classList.toggle('on',S.units==='met');
    buildTabs(); showTab('mh'); redraw();
    window.addEventListener('resize',redraw);
  };
  reader.readAsText(file);
}

export async function doExport(type){
  document.getElementById('exp-dd').hidden=true;

  if(type==='json'){
    requirePremium('Save JSON', ()=> saveJSON());
    return;
  }

  if(type==='svg'){
    const svg=document.getElementById('profile-svg');
    const W=svg.clientWidth, H=svg.clientHeight;
    svg.setAttribute('width',W);
    svg.setAttribute('height',H);
    svg.setAttribute('viewBox',`0 0 ${W} ${H}`);
    const data=new XMLSerializer().serializeToString(svg);
    svg.removeAttribute('width');
    svg.removeAttribute('height');
    svg.removeAttribute('viewBox');
    dlBlob(new Blob([data],{type:'image/svg+xml'}),'pipe-profile.svg');
    return;
  }

  let pngResult;
  try{pngResult=await svgToPNG(type==='pptx'?3:2)}
  catch(e){alert('Export failed: '+e.message);return}
  const {dataUrl,W,H}=pngResult;

  if(type==='png'){
    const a=document.createElement('a');
    a.href=dataUrl; a.download='pipe-profile.png'; a.click();
    return;
  }

  if(type==='pptx'){
    const prs=new PptxGenJS();
    prs.layout='LAYOUT_WIDE';
    const slide=prs.addSlide();
    slide.background={color:'FFFFFF'};
    const sw=13.33, sh=7.5, pad=0.25;
    const aw=sw-pad*2, ah=sh-pad*2;
    const ar=W/H, sar=aw/ah;
    let iw,ih;
    if(ar>sar){iw=aw;ih=iw/ar}else{ih=ah;iw=ih*ar}
    slide.addImage({data:dataUrl, x:pad+(aw-iw)/2, y:pad+(ah-ih)/2, w:iw, h:ih});
    await prs.writeFile({fileName:'pipe-profile.pptx'});
  }
}
