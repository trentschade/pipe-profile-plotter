import { S, U, sta, activeTab } from './state.js';
import { redraw, groundAtSta } from './drawing.js';
import { buildTabs, showTab, updDepth, updSlope, checkMhInv, checkPipeInv,
         addPipe, removePipe, addGndRow, delGndRow, addGroundRow, delGroundRow,
         addHGL, removeHGL } from './tables.js';
import { toggleExp, doExport, triggerLoad, loadJSON, saveJSON } from './export.js';
import { loadLocal } from './persist.js';
import { initAuth, getUser, signIn, signUp, signOut, setOnAuthChange } from './auth.js';
import { requirePremium } from './gating.js';

function boot(){
  const nPipe=Math.max(1,Math.min(20,+document.getElementById('s-pipes').value||3));
  const nSt=Math.max(0,Math.min(10,+document.getElementById('s-streets').value||0));
  const nBsmt=Math.max(0,Math.min(20,+document.getElementById('s-bsmt').value||0));
  S.units=document.getElementById('s-units').value;
  S.showGnd=document.getElementById('s-gnd').checked;
  S.showBsmt=nBsmt>0;
  S.showHGL=document.getElementById('s-hgl').checked;

  const nMH=nPipe+1, e0=U.defElev(), sl=U.slope(), len=U.defLen();
  const ro=U.rimOff();

  S.mh=Array.from({length:nMH},(_,i)=>{
    const inv=+(e0-i*sl*len).toFixed(3);
    return{name:`MH-${i+1}`,rim:+(inv+ro).toFixed(3),inv};
  });
  S.pipe=Array.from({length:nPipe},(_,i)=>({len,dia:U.defDia(),mat:'PVC',us_inv:S.mh[i].inv,ds_inv:S.mh[i+1].inv}));
  S.street=Array.from({length:nSt},(_,i)=>{
    const s=Math.round((i/nSt)*nPipe*len);
    return{name:`Street ${i+1}`,sta:s};
  });
  S.gnd=S.mh.map((m,i)=>({sta:sta(i),elev:+m.rim.toFixed(3)}));
  S.hgls=S.showHGL?[{name:'HGL 1',pts:S.mh.map(m=>({elev:+(m.inv+ro*0.5).toFixed(3)}))}]:[];
  S.bsmt=Array.from({length:nBsmt},(_,i)=>{
    const s=Math.round(((i+0.5)/nBsmt)*nPipe*len);
    const randAbove=U.isImp()?8+Math.random()*2:2.4+Math.random()*0.6;
    const elev=+(groundAtSta(s)+randAbove).toFixed(3);
    return{name:`House ${i+1}`,sta:s,elev};
  });
  S.showGround=nBsmt>0;
  const gndOff=U.isImp()?3.0:1.0;
  S.ground=S.bsmt.map(b=>({sta:+b.sta,elev:+(b.elev-gndOff).toFixed(3)}));

  enterMain();
}

function enterMain(){
  document.getElementById('setup-screen').style.display='none';
  document.getElementById('main-screen').style.display='flex';
  document.getElementById('u-imp').classList.toggle('on',S.units==='imp');
  document.getElementById('u-met').classList.toggle('on',S.units==='met');
  buildTabs(); showTab(activeTab); redraw();
  window.addEventListener('resize',redraw);
}

function goSetup(){
  window.removeEventListener('resize',redraw);
  document.getElementById('main-screen').style.display='none';
  document.getElementById('setup-screen').style.display='flex';
}

function setUnits(u){
  S.units=u;
  document.getElementById('u-imp').classList.toggle('on',u==='imp');
  document.getElementById('u-met').classList.toggle('on',u==='met');
  showTab(activeTab); redraw();
}

function initFromLocal(){
  const parsed = loadLocal();
  if(!parsed) return;
  const btn=document.createElement('button');
  btn.className='btn-go';
  btn.style.cssText='background:#2e7d32';
  btn.textContent='Resume Last Profile →';
  btn.onclick=()=>{
    Object.assign(S,parsed);
    enterMain();
  };
  document.getElementById('resume-wrap').appendChild(btn);
}

// ─── Auth UI ──────────────────────────────────────────────────────────────────
let authMode = 'signin';

function updateAuthUI(user){
  const btn = document.getElementById('auth-btn');
  const label = document.getElementById('auth-user-label');
  if(user){
    btn.textContent = 'Sign Out';
    label.textContent = user.email;
  } else {
    btn.textContent = 'Sign In';
    label.textContent = '';
  }
  document.getElementById('auth-dd').hidden = true;
}

function toggleAuth(e){
  e.stopPropagation();
  const user = getUser();
  if(user){
    signOut().then(()=> updateAuthUI(null)).catch(err => alert(err.message));
    return;
  }
  const dd = document.getElementById('auth-dd');
  dd.hidden = !dd.hidden;
  if(!dd.hidden){
    document.getElementById('auth-err').hidden = true;
    document.getElementById('auth-msg').hidden = true;
    document.getElementById('auth-email').value = '';
    document.getElementById('auth-pass').value = '';
    function close(ev){
      if(!ev.target.closest('.auth-wrap')){dd.hidden=true;document.removeEventListener('click',close)}
    }
    document.addEventListener('click',close);
  }
}

function flipAuthMode(){
  authMode = authMode==='signin' ? 'signup' : 'signin';
  document.getElementById('auth-title').textContent = authMode==='signin' ? 'Sign In' : 'Sign Up';
  document.getElementById('auth-toggle').textContent =
    authMode==='signin' ? 'Need an account? Sign up' : 'Already have an account? Sign in';
  document.querySelector('#auth-dd .btn-go').textContent = authMode==='signin' ? 'Sign In' : 'Sign Up';
  document.getElementById('auth-err').hidden = true;
  document.getElementById('auth-msg').hidden = true;
}

async function submitAuth(){
  const email = document.getElementById('auth-email').value.trim();
  const pass = document.getElementById('auth-pass').value;
  const errEl = document.getElementById('auth-err');
  const msgEl = document.getElementById('auth-msg');
  errEl.hidden = true;
  msgEl.hidden = true;

  if(!email || !pass){
    errEl.textContent = 'Email and password are required.';
    errEl.hidden = false;
    return;
  }

  try{
    if(authMode==='signup'){
      await signUp(email, pass);
      msgEl.textContent = 'Check your email to confirm your account.';
      msgEl.hidden = false;
    } else {
      await signIn(email, pass);
      document.getElementById('auth-dd').hidden = true;
    }
  }catch(err){
    errEl.textContent = err.message;
    errEl.hidden = false;
  }
}

// ─── Gated wrappers ──────────────────────────────────────────────────────────
function gatedSaveJSON(){
  requirePremium('Save JSON', ()=> saveJSON());
}

function gatedTriggerLoad(){
  requirePremium('Load JSON', ()=> triggerLoad());
}

setOnAuthChange((user)=>{
  updateAuthUI(user);
});

// Expose to inline event handlers in HTML
Object.assign(window, {
  S, redraw, boot, goSetup, setUnits,
  toggleExp, doExport,
  triggerLoad: gatedTriggerLoad,
  loadJSON, saveJSON,
  updDepth, updSlope, checkMhInv, checkPipeInv,
  addPipe, removePipe,
  addGndRow, delGndRow, addGroundRow, delGroundRow,
  addHGL, removeHGL,
  showTab, buildTabs,
  toggleAuth, flipAuthMode, submitAuth,
});

// ─── Init ─────────────────────────────────────────────────────────────────────
initAuth().then(()=>{
  updateAuthUI(getUser());
});
initFromLocal();
