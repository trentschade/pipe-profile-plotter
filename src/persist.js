import { S } from './state.js';

const LS_KEY = 'pipeProfile';

export function saveLocal(){
  try{ localStorage.setItem(LS_KEY, JSON.stringify({version:1,...S})); }catch(e){}
}

export function loadLocal(){
  try{
    const raw = localStorage.getItem(LS_KEY);
    if(!raw) return null;
    const parsed = JSON.parse(raw);
    const required = ['mh','pipe','street','gnd','bsmt','ground','units'];
    if(!required.every(k=>k in parsed)||(!('hgl' in parsed)&&!('hgls' in parsed))) return null;
    migrateProfile(parsed);
    return parsed;
  }catch(e){ return null; }
}

export function migrateProfile(p){
  if(!p.hgls && p.hgl) p.hgls = p.hgl.length ? [{name:'HGL 1', pts:p.hgl}] : [];
  delete p.hgl;
  if(!p.showHGL) p.showHGL = p.hgls && p.hgls.length > 0;
}
