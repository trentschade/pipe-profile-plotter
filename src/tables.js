import { S, U, sta, totalLen, esc, activeTab, setActiveTab, HGL_COLORS } from './state.js';
import { redraw } from './drawing.js';

const TAB_DEF = [
  {id:'mh',label:'Manholes'},
  {id:'pipe',label:'Pipes'},
  {id:'street',label:'Streets'},
  {id:'gnd',label:'Street Surface',flag:'showGnd'},
  {id:'hgl',label:'HGL',flag:'showHGL'},
  {id:'bsmt',label:'Basements',flag:'showBsmt'},
  {id:'ground',label:'Ground',flag:'showGround'},
];

export function buildTabs(){
  const bar=document.getElementById('tabs');
  bar.innerHTML='';
  TAB_DEF.filter(t=>!t.flag||S[t.flag]).forEach(t=>{
    const b=document.createElement('button');
    b.textContent=t.label; b.dataset.id=t.id;
    if(t.id===activeTab) b.classList.add('on');
    b.onclick=()=>showTab(t.id);
    bar.appendChild(b);
  });
  if(!TAB_DEF.find(t=>t.id===activeTab&&(!t.flag||S[t.flag]))){
    setActiveTab('mh');
    bar.querySelector('button').classList.add('on');
  }
}

export function showTab(id){
  setActiveTab(id);
  document.querySelectorAll('#tabs button').forEach(b=>{
    b.classList.toggle('on',b.dataset.id===id);
  });
  const body=document.getElementById('tab-body');
  const renderers={mh:tblMH,pipe:tblPipe,street:tblStreet,gnd:tblGnd,hgl:tblHGL,bsmt:tblBsmt,ground:tblGround};
  body.innerHTML=(renderers[id]||tblMH)();
}

function ni(val,fn,d=2){
  const v=val==null||isNaN(+val)?'':(+val).toFixed(d);
  return `<input type="number" step="any" value="${v}" oninput="(${fn})(+this.value)">`;
}
function ti(val,fn){
  const v=String(val??'').replace(/"/g,'&quot;');
  return `<input type="text" value="${v}" oninput="(${fn})(this.value)">`;
}

function tblMH(){
  const eu=U.eu(),lu=U.lu();
  let h=`<table><thead><tr>
    <th>MH</th><th>Name</th>
    <th>Rim (${eu})</th><th>Invert (${eu})</th>
    <th>Depth (${eu})</th><th>Station (${lu})</th>
  </tr></thead><tbody>`;
  S.mh.forEach((m,i)=>{
    const dep=((+m.rim||0)-(+m.inv||0)).toFixed(2);
    h+=`<tr>
      <td class="lbl">MH-${i+1}</td>
      <td>${ti(m.name,`v=>{S.mh[${i}].name=v;redraw()}`)}</td>
      <td>${ni(m.rim,`v=>{S.mh[${i}].rim=v;updDepth(${i});redraw()}`)}</td>
      <td><input type="number" step="any" value="${(+m.inv).toFixed(2)}" oninput="S.mh[${i}].inv=+this.value;updDepth(${i});updSlope(${i-1});updSlope(${i});redraw()" onchange="checkMhInv(this,${i})"></td>
      <td class="ro" id="dep-${i}">${dep}</td>
      <td class="ro">${U.fmt(sta(i),2)}</td>
    </tr>`;
  });
  return h+'</tbody></table>';
}

export function updDepth(i){
  const c=document.getElementById('dep-'+i);
  if(c) c.textContent=((+S.mh[i].rim||0)-(+S.mh[i].inv||0)).toFixed(2);
}
export function updSlope(i){
  const c=document.getElementById('sl-'+i);
  if(!c) return;
  const p=S.pipe[i],mu=S.mh[i],md=S.mh[i+1];
  if(p&&mu&&md&&+p.len>0){
    const ui=p.us_inv??mu.inv, di=p.ds_inv??md.inv;
    c.textContent=((ui-di)/+p.len*100).toFixed(3);
  }
}
function lowestPipeInv(i){
  const invs=[];
  if(S.pipe[i-1]) invs.push(+(S.pipe[i-1].ds_inv??S.mh[i].inv));
  if(S.pipe[i])   invs.push(+(S.pipe[i].us_inv??S.mh[i].inv));
  return invs.length?Math.min(...invs):null;
}
export function checkMhInv(el,i){
  const mh=S.mh[i];
  const low=lowestPipeInv(i);
  if(low!==null&&+mh.inv>+low){
    alert(`${mh.name} invert (${U.fmt(mh.inv)}) cannot be above the lowest connecting pipe invert (${U.fmt(low)}).`);
    mh.inv=low;
    el.value=(+low).toFixed(2);
    updDepth(i); updSlope(i-1); updSlope(i);
    redraw();
  }
}
export function checkPipeInv(el,i,side){
  const p=S.pipe[i];
  const isUs=side==='us';
  const mhIdx=isUs?i:i+1;
  const mh=S.mh[mhIdx];
  const v=isUs?p.us_inv:p.ds_inv;
  if(+v<+mh.inv){
    const pipeName=`P-${i+1} ${isUs?'upstream':'downstream'}`;
    if(confirm(`${pipeName} invert (${U.fmt(+v)}) is below ${mh.name} invert (${U.fmt(mh.inv)}).\nLower ${mh.name} invert to ${U.fmt(+v)}?`)){
      mh.inv=+v;
      updDepth(mhIdx); updSlope(mhIdx-1); updSlope(mhIdx);
    }else{
      if(isUs) p.us_inv=mh.inv; else p.ds_inv=mh.inv;
      el.value=(+mh.inv).toFixed(2);
    }
  }
  redraw();
}

export function addPipe(){
  const last=S.pipe[S.pipe.length-1];
  const lastMH=S.mh[S.mh.length-1];
  const newDsInv=+(+(last.ds_inv??lastMH.inv)-(+(last.us_inv??S.mh[S.mh.length-2].inv)-+(last.ds_inv??lastMH.inv))).toFixed(3);
  const depth=+(lastMH.rim-lastMH.inv).toFixed(3);
  const newMH={name:`MH-${S.mh.length+1}`,inv:newDsInv,rim:+(newDsInv+depth).toFixed(3)};
  S.pipe.push({len:last.len,dia:last.dia,mat:last.mat,us_inv:+(last.ds_inv??lastMH.inv),ds_inv:newDsInv});
  S.mh.push(newMH);
  S.hgls.forEach(line=>{
    if(line.pts.length>=2){
      const d=line.pts[line.pts.length-1].elev-line.pts[line.pts.length-2].elev;
      line.pts.push({elev:+(line.pts[line.pts.length-1].elev+d).toFixed(3)});
    } else {
      line.pts.push({elev:newMH.inv});
    }
  });
  const newSta=sta(S.mh.length-1);
  if(S.showGnd&&S.gnd.length>0){
    const a=S.gnd[S.gnd.length-(S.gnd.length>=2?2:1)],b=S.gnd[S.gnd.length-1];
    const slope=b.sta!==a.sta?(b.elev-a.elev)/(b.sta-a.sta):0;
    S.gnd.push({sta:newSta,elev:+(b.elev+slope*(newSta-b.sta)).toFixed(3)});
  }
  if(S.showGround&&S.ground.length>0){
    const sorted=[...S.ground].sort((a,b)=>a.sta-b.sta);
    const a=sorted[sorted.length-(sorted.length>=2?2:1)],b=sorted[sorted.length-1];
    const slope=b.sta!==a.sta?(b.elev-a.elev)/(b.sta-a.sta):0;
    S.ground.push({sta:newSta,elev:+(b.elev+slope*(newSta-b.sta)).toFixed(3)});
  }
  showTab('pipe'); redraw();
}

export function removePipe(){
  if(S.pipe.length<=1) return;
  const removedSta=sta(S.mh.length-1);
  S.pipe.pop(); S.mh.pop();
  S.hgls.forEach(line=>{if(line.pts.length>S.mh.length) line.pts.pop()});
  if(S.gnd.length&&S.gnd[S.gnd.length-1].sta===removedSta) S.gnd.pop();
  if(S.ground.length&&S.ground[S.ground.length-1].sta===removedSta) S.ground.pop();
  showTab('pipe'); redraw();
}

function tblPipe(){
  const eu=U.eu(),lu=U.lu(),du=U.du();
  const last=S.pipe.length-1;
  let h=`<table><thead><tr>
    <th>Pipe</th><th>From → To</th>
    <th>Length (${lu})</th><th>Dia (${du})</th><th>Material</th>
    <th>Up Inv (${eu})</th><th>Dn Inv (${eu})</th><th>Slope (%)</th><th></th>
  </tr></thead><tbody>`;
  S.pipe.forEach((p,i)=>{
    const mu=S.mh[i],md=S.mh[i+1];
    const usInv=p.us_inv??mu?.inv, dsInv=p.ds_inv??md?.inv;
    const sl=+p.len>0&&mu&&md?(((+(usInv||0))-(+(dsInv||0)))/(+p.len)*100).toFixed(3):'—';
    const usV=usInv==null||isNaN(+usInv)?'':(+usInv).toFixed(2);
    const dsV=dsInv==null||isNaN(+dsInv)?'':(+dsInv).toFixed(2);
    const delBtn=i===last&&S.pipe.length>1?`<button onclick="removePipe()">×</button>`:'';
    h+=`<tr>
      <td class="lbl">P-${i+1}</td>
      <td class="ro">${esc(mu?.name||'MH-'+(i+1))} → ${esc(md?.name||'MH-'+(i+2))}</td>
      <td>${ni(p.len,`v=>{S.pipe[${i}].len=v;redraw()}`,0)}</td>
      <td>${ni(p.dia,`v=>{S.pipe[${i}].dia=v;redraw()}`,0)}</td>
      <td>${ti(p.mat,`v=>{S.pipe[${i}].mat=v;redraw()}`)}</td>
      <td><input type="number" step="any" value="${usV}" oninput="S.pipe[${i}].us_inv=+this.value;updSlope(${i});redraw()" onchange="checkPipeInv(this,${i},'us')"></td>
      <td><input type="number" step="any" value="${dsV}" oninput="S.pipe[${i}].ds_inv=+this.value;updSlope(${i});redraw()" onchange="checkPipeInv(this,${i},'ds')"></td>
      <td class="ro" id="sl-${i}">${sl}</td>
      <td>${delBtn}</td>
    </tr>`;
  });
  h+=`<tr><td colspan="9" style="padding:6px 8px">
    <button onclick="addPipe()">+ Add Pipe</button>
  </td></tr>`;
  return h+'</tbody></table>';
}

function tblStreet(){
  if(!S.street.length) return '<p class="empty">No streets configured. Start a new profile to add streets.</p>';
  const lu=U.lu();
  let h=`<table><thead><tr><th>#</th><th>Name</th><th>Station (${lu})</th></tr></thead><tbody>`;
  S.street.forEach((st,i)=>{
    h+=`<tr>
      <td class="ro">${i+1}</td>
      <td>${ti(st.name,`v=>{S.street[${i}].name=v;redraw()}`)}</td>
      <td>${ni(st.sta,`v=>{S.street[${i}].sta=v;redraw()}`,0)}</td>
    </tr>`;
  });
  return h+'</tbody></table>';
}

export function addGndRow(){ S.gnd.push({sta:totalLen()/2,elev:U.defElev()}); showTab('gnd'); redraw(); }
export function delGndRow(i){ S.gnd.splice(i,1); showTab('gnd'); redraw(); }
function tblGnd(){
  const eu=U.eu(),lu=U.lu();
  let h=`<table><thead><tr>
    <th>#</th><th>Station (${lu})</th><th>Street Elev (${eu})</th><th></th>
  </tr></thead><tbody>`;
  S.gnd.forEach((g,i)=>{
    h+=`<tr>
      <td class="ro">${i+1}</td>
      <td>${ni(g.sta,`v=>{S.gnd[${i}].sta=v;redraw()}`,0)}</td>
      <td>${ni(g.elev,`v=>{S.gnd[${i}].elev=v;redraw()}`)}</td>
      <td><button onclick="delGndRow(${i})">×</button></td>
    </tr>`;
  });
  h+=`<tr><td colspan="4" style="padding:6px 8px">
    <button onclick="addGndRow()">+ Add point</button>
  </td></tr>`;
  return h+'</tbody></table>';
}

export function addGroundRow(){ S.ground.push({sta:totalLen()/2,elev:U.defElev()}); showTab('ground'); redraw(); }
export function delGroundRow(i){ S.ground.splice(i,1); showTab('ground'); redraw(); }
function tblGround(){
  if(!S.ground.length) return '<p class="empty">No ground points. Add a point below.</p>';
  const eu=U.eu(),lu=U.lu();
  let h=`<table><thead><tr>
    <th>#</th><th>Station (${lu})</th><th>Ground Elev (${eu})</th><th></th>
  </tr></thead><tbody>`;
  S.ground.forEach((g,i)=>{
    h+=`<tr>
      <td class="ro">${i+1}</td>
      <td>${ni(g.sta,`v=>{S.ground[${i}].sta=v;redraw()}`,0)}</td>
      <td>${ni(g.elev,`v=>{S.ground[${i}].elev=v;redraw()}`)}</td>
      <td><button onclick="delGroundRow(${i})">×</button></td>
    </tr>`;
  });
  h+=`<tr><td colspan="4" style="padding:6px 8px">
    <button onclick="addGroundRow()">+ Add point</button>
  </td></tr>`;
  return h+'</tbody></table>';
}

export function addHGL(){
  const ro=U.rimOff();
  S.hgls.push({name:`HGL ${S.hgls.length+1}`,pts:S.mh.map(m=>({elev:+(m.inv+ro*0.5).toFixed(3)}))});
  if(!S.showHGL){S.showHGL=true; buildTabs();}
  showTab('hgl'); redraw();
}
export function removeHGL(li){
  S.hgls.splice(li,1);
  if(!S.hgls.length) S.showHGL=false;
  buildTabs(); showTab(S.hgls.length?'hgl':'mh'); redraw();
}

function tblHGL(){
  const eu=U.eu();
  let h='';
  S.hgls.forEach((line,li)=>{
    const col=HGL_COLORS[li%HGL_COLORS.length];
    const delBtn=S.hgls.length>1
      ?`<button onclick="removeHGL(${li})" style="float:right;margin-top:-1px">×</button>`:'';
    h+=`<div style="padding:6px 10px 2px;background:#f5f7fa;border-bottom:1px solid #c8d4df;display:flex;align-items:center;gap:8px">
      <span style="display:inline-block;width:20px;height:3px;background:${col};border-radius:2px;flex-shrink:0"></span>
      <input type="text" value="${esc(line.name)}" oninput="S.hgls[${li}].name=this.value;redraw()"
        style="flex:1;border:none;background:transparent;font-weight:600;font-size:13px;color:#333;padding:0">
      ${delBtn}
    </div>`;
    h+=`<table><thead><tr><th>MH</th><th>Name</th><th>HGL Elev (${eu})</th></tr></thead><tbody>`;
    line.pts.forEach((pt,i)=>{
      h+=`<tr>
        <td class="lbl">MH-${i+1}</td>
        <td class="ro">${esc(S.mh[i]?.name||'')}</td>
        <td>${ni(pt.elev,`v=>{S.hgls[${li}].pts[${i}].elev=v;redraw()}`)}</td>
      </tr>`;
    });
    h+='</tbody></table>';
  });
  h+=`<div style="padding:6px 10px"><button onclick="addHGL()">+ Add HGL</button></div>`;
  return h;
}

function tblBsmt(){
  if(!S.bsmt.length) return '<p class="empty">No basements configured. Start a new profile to add basements.</p>';
  const lu=U.lu(), eu=U.eu();
  let h=`<table><thead><tr><th>#</th><th>Name</th><th>Station (${lu})</th><th>House Elev (${eu})</th></tr></thead><tbody>`;
  S.bsmt.forEach((b,i)=>{
    h+=`<tr>
      <td class="ro">${i+1}</td>
      <td>${ti(b.name,`v=>{S.bsmt[${i}].name=v;redraw()}`)}</td>
      <td>${ni(b.sta,`v=>{S.bsmt[${i}].sta=v;redraw()}`,0)}</td>
      <td>${ni(b.elev,`v=>{S.bsmt[${i}].elev=v;redraw()}`)}</td>
    </tr>`;
  });
  return h+'</tbody></table>';
}
