import { isPremium } from './auth.js';

export function requirePremium(featureName, action){
  if(isPremium()){
    action();
  } else {
    showUpgradeModal(featureName);
  }
}

export function gateCheck(featureName){
  if(isPremium()) return true;
  showUpgradeModal(featureName);
  return false;
}

function showUpgradeModal(featureName){
  let overlay = document.getElementById('upgrade-overlay');
  if(overlay){ overlay.remove(); }

  overlay = document.createElement('div');
  overlay.id = 'upgrade-overlay';
  overlay.innerHTML = `
    <div class="upgrade-modal">
      <h2>Premium Feature</h2>
      <p><strong>${featureName}</strong> is available with a premium subscription.</p>
      <p style="color:#666;font-size:13px;margin-top:8px">Upgrade to unlock JSON save/load, multiple streets, cloud storage, and more.</p>
      <div style="display:flex;gap:8px;margin-top:20px">
        <button class="btn-go" style="flex:1" onclick="document.getElementById('upgrade-overlay').remove()">Maybe Later</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);
}
