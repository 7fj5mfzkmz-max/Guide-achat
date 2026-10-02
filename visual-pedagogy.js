(function(){
  'use strict';
  function icon(kind){
    const common='viewBox="0 0 120 80" aria-hidden="true"';
    const icons={
      smartphone:`<svg ${common}><rect x="40" y="4" width="40" height="72" rx="9"/><rect x="44" y="14" width="32" height="48" rx="4"/><circle cx="60" cy="68" r="2"/><rect x="54" y="8" width="12" height="3" rx="1.5"/><path d="M49 22h22M49 29h14M49 38h22M49 45h10"/></svg>`,
      pc:`<svg ${common}><rect x="26" y="10" width="68" height="45" rx="4"/><rect x="33" y="16" width="54" height="33" rx="2"/><path d="M46 65h28M53 55v10m14-10v10"/></svg>`,
      battery:`<svg ${common}><rect x="25" y="24" width="68" height="32" rx="6"/><path d="M94 34h7v12h-7"/><path d="M45 32l-8 10h10l-4 8 14-14H47z"/></svg>`,
      earbuds:`<svg ${common}><path d="M40 20a12 12 0 0 1 12 12v18a7 7 0 0 1-14 0V33a2 2 0 0 0-4 0v8"/><path d="M80 20a12 12 0 0 0-12 12v18a7 7 0 0 0 14 0V33a2 2 0 0 1 4 0v8"/></svg>`,
      watch:`<svg ${common}><path d="M48 6h24v68H48z"/><rect x="35" y="22" width="50" height="36" rx="10"/><circle cx="60" cy="40" r="9"/></svg>`,
      projector:`<svg ${common}><rect x="25" y="25" width="70" height="30" rx="7"/><circle cx="40" cy="40" r="8"/><path d="M60 33h24M60 40h18M60 47h13"/></svg>`
    }; return icons[kind]||icons.smartphone;
  }
  function homeVisuals(){
    const map=[['cat-orbit-smartphone','smartphone','Écran · photo · batterie'],['cat-orbit-pc','pc','Processeur · RAM · stockage'],['cat-orbit-batterie','battery','Capacité · puissance · durée'],['cat-orbit-ecouteurs','earbuds','Autonomie · son · confort'],['cat-orbit-montre','watch','Écran · capteurs · autonomie'],['cat-orbit-projecteur','projector','Luminosité · image · distance']];
    map.forEach(([cls,k,label])=>document.querySelectorAll('.'+cls).forEach(el=>{el.innerHTML=`<div class="pv-category-icon">${icon(k)}</div><span class="pv-category-label">${label}</span>`;el.removeAttribute('aria-hidden');el.setAttribute('aria-label',label);}));
  }
  function hero(){
    const stage=document.querySelector('.smartphone-hero-stage .phone-swipe-demo'); if(!stage)return;
    stage.outerHTML=`<div class="pv-hero-demo pv-hero-phone" aria-label="Illustration d’un smartphone"><div class="pv-phone-static"><div class="pv-phone-screen-static"><div class="pv-status-row"></div><div class="pv-app-grid"><i></i><i></i><i></i><i></i><i></i><i></i></div><div class="pv-home-line"></div></div><span class="pv-phone-speaker"></span><span class="pv-phone-camera"></span></div><div class="pv-hero-label"><b>Un smartphone</b><span>Avant de regarder les chiffres, commencez par choisir l’écosystème et par définir ce qui mérite vraiment votre budget.</span></div></div>`;
  }
  function matrix(count){return new Array(count).fill('<i></i>').join('');}
  function pitfallVisuals(){
    document.querySelectorAll('.metric-camera').forEach(el=>el.innerHTML=`<div class="pv-camera-matrix"><div class="pv-camera-grid">${matrix(48)}</div><strong>200</strong><span>Mpx</span></div>`);
    document.querySelectorAll('.metric-battery').forEach(el=>el.innerHTML=`<div class="pv-battery-tank"><div class="pv-battery-cells"><i></i><i></i><i></i><i></i><i></i></div><b>5 000</b><span>mAh</span></div>`);
    document.querySelectorAll('.metric-ram').forEach(el=>el.innerHTML=`<div class="pv-ram-diagram"><div class="pv-apps"><span>Messages</span><span>Chrome</span><span>Photos</span><span>Jeu</span></div><div class="pv-ram-memory"><b>RAM</b><i></i><i></i><i></i><i></i><i></i></div><small>Plus de RAM = plus d’espace pour garder plusieurs tâches ouvertes.</small></div>`);
  }
  function displayCompare(){
    const root=document.getElementById('display-compare'); if(!root || root.querySelector('.display-compare-tab'))return;
    root.innerHTML=`<div class="pv-display-demo"><div class="pv-display-head"><div><span class="eyebrow">VOIR LA DIFFÉRENCE</span><h3>OLED ou LCD : que devient la lumière ?</h3></div><p>Même image, même zone noire. On regarde seulement ce que fait la dalle.</p></div><div class="pv-display-tabs" role="tablist"><button class="is-active" data-pv-display="oled" role="tab">OLED</button><button data-pv-display="lcd" role="tab">LCD</button><button data-pv-display="hz" role="tab">60 / 120 Hz</button></div><div class="pv-display-panels"><div class="pv-display-panel is-active" data-pv-panel="oled"><div class="pv-screen pv-screen-matrix"><div class="pv-oled-grid">${matrix(36)}</div><div class="pv-black-zone"></div></div><div class="pv-explanation"><b>OLED : chaque pixel fait sa propre lumière.</b><span>Dans la zone noire, les pixels s’éteignent. Il n’y a pas de lampe derrière cette zone.</span></div></div><div class="pv-display-panel" data-pv-panel="lcd"><div class="pv-screen pv-screen-matrix pv-lcd"><div class="pv-backlight"></div><div class="pv-oled-grid">${matrix(36)}</div><div class="pv-black-zone"></div></div><div class="pv-explanation"><b>LCD : une lumière reste derrière la dalle.</b><span>Les pixels modulent cette lumière, mais le rétroéclairage continue d’éclairer derrière l’image.</span></div></div><div class="pv-display-panel" data-pv-panel="hz"><div class="pv-hz-stage"><div class="pv-hz-track"></div><div class="pv-hz-object"></div><div class="pv-hz-label pv-hz-60">60</div><div class="pv-hz-label pv-hz-120">120</div></div><div class="pv-explanation"><b>120 Hz : plus de mises à jour de l’image.</b><span>Le même mouvement est découpé en davantage de positions intermédiaires. Cela peut rendre le déplacement plus fluide.</span></div></div></div></div>`;
    root.querySelectorAll('[data-pv-display]').forEach(btn=>btn.addEventListener('click',()=>{const target=btn.dataset.pvDisplay;root.querySelectorAll('[data-pv-display]').forEach(b=>b.classList.toggle('is-active',b===btn));root.querySelectorAll('[data-pv-panel]').forEach(p=>p.classList.toggle('is-active',p.dataset.pvPanel===target));}));
  }
  function init(){homeVisuals();hero();pitfallVisuals();displayCompare();}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init); else init();
})();
