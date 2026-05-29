(function(){
'use strict';

const MOD_LABELS={C:'Communications',A:'Aéronef',M:'Météorologie',R:'Réglementation'};
const DIFF_LABELS={1:'Facile',2:'Moyen',3:'Difficile',4:'Expert'};

function loadLog(){
  try{
    const raw=localStorage.getItem('ppl4answers');
    if(raw) return JSON.parse(raw);
  }catch(e){}
  return {items:[]};
}

function probaColor(p){
  if(p>=75) return 'var(--green)';
  if(p>=50) return 'var(--amber)';
  return 'var(--red)';
}

function modStr(m){ return MOD_LABELS[m]||String(m||'—'); }
function diffStr(d){ return DIFF_LABELS[d]||('D'+d); }

function fmtDate(ts){
  const d=new Date(ts);
  return d.toLocaleDateString('fr-FR',{day:'2-digit',month:'short'})+' '+d.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'});
}

function avg(arr,fn){
  const vals=arr.map(fn).filter(v=>v!=null&&!isNaN(v));
  if(!vals.length) return null;
  return vals.reduce((a,b)=>a+b,0)/vals.length;
}

function round(v,d){ return v==null?null:Math.round(v*Math.pow(10,d||0))/Math.pow(10,d||0); }

function computeAverages(items){
  const n=items.length;
  const okN=items.filter(x=>x.ok).length;
  return {
    n,
    okRate:n?round(okN/n*100,1):0,
    avgEl:round(avg(items,x=>x.el),2),
    avgReactScore:round(avg(items,x=>x.reactScore),1),
    avgMastery:round(avg(items,x=>x.mastery),1),
    avgExam:round(avg(items,x=>x.examImpact),1),
    avgConf:round(avg(items,x=>x.confIdx),1),
    avgReactSec:round(avg(items,x=>x.reactSec),2),
    avgReadSec:round(avg(items,x=>x.readSec),2),
    avgDecideSec:round(avg(items,x=>x.decideSec),2),
    avgHovers:round(avg(items,x=>x.hoverSwitches),1),
    avgWrongH:round(avg(items,x=>x.wrongHoverCount),1),
    avgDist:round(avg(items,x=>x.moveDist),0),
    avgVac:round(avg(items,x=>x.vacillations),1)
  };
}

function renderDetail(item){
  if(!item) return '';
  const b=item.beh||{};
  const factors=(item.factors||[]).map(f=>`<div><span>${f.label||f.name}</span><span>${f.value!=null?f.value:''}${f.unit||''}</span></div>`).join('');
  const tags=(item.tags||[]).length?`<p style="font-size:11px;color:var(--t3);margin:.5rem 0 0">Tags : ${item.tags.join(' · ')}</p>`:'';
  return `<div class="stats-detail" id="stats-detail">
    <h3>Détail — ${item.ok?'✓ Correct':'✗ Incorrect'} · ${modStr(item.mod)} · ${diffStr(item.diff)}</h3>
    <p class="q-preview" style="margin:0 0 .75rem;font-size:13px;color:var(--t1)">${escapeHtml(item.question||'')}</p>
    ${item.explain?`<p style="font-size:12px;color:var(--t2);line-height:1.55;margin:0 0 .75rem">${escapeHtml(item.explain)}</p>`:''}
    <div class="stats-detail-grid">
      <div><span>Temps total</span><span>${(item.el||0).toFixed(1)} s</span></div>
      <div><span>Score réaction</span><span style="color:${probaColor(item.reactScore||50)}">${item.reactScore||'—'}%</span></div>
      <div><span>Maîtrise thème</span><span style="color:${probaColor(item.mastery||50)}">${item.mastery||'—'}%</span></div>
      <div><span>Confiance cognitive</span><span>${item.confIdx!=null?item.confIdx+'%':'—'}</span></div>
      <div><span>Impact examen</span><span>${item.examImpact!=null?(item.examImpact>=0?'+':'')+item.examImpact+' pts':'—'}</span></div>
      <div><span>Lecture</span><span>${(item.readSec||b.readSec||0).toFixed(1)} s</span></div>
      <div><span>Réaction</span><span>${(item.reactSec||b.reactionSec||0).toFixed(1)} s</span></div>
      <div><span>Décision</span><span>${(item.decideSec||b.decideSec||0).toFixed(1)} s</span></div>
      <div><span>Survols / vacillations</span><span>${item.hoverSwitches??b.hoverSwitches??0} / ${item.vacillations??b.vacillations??0}</span></div>
      <div><span>Mauvaises options survolées</span><span>${item.wrongHoverCount??b.wrongHoverCount??0}</span></div>
      <div><span>Dwell réponse choisie</span><span>${Math.round((item.dwellChosen??b.dwellChosen??0)/100)/10} s</span></div>
      <div><span>Distance souris</span><span>${item.moveDist??b.moveDist??0} px</span></div>
      <div><span>Décisivité</span><span>${Math.round((item.decisiveness??b.decisiveness??0)*100)}%</span></div>
      <div><span>Pertes de focus</span><span>${item.blurCount??b.blurCount??0}</span></div>
      <div><span>Référence</span><span style="white-space:normal;text-align:left;font-family:inherit">${escapeHtml(item.ref||'')}</span></div>
    </div>
    ${factors?`<div class="stats-detail-grid" style="margin-top:.75rem">${factors}</div>`:''}
    ${tags}
  </div>`;
}

function escapeHtml(s){
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function findHighlight(items, params){
  const iParam=params.get('i');
  const tParam=params.get('t');
  if(tParam){
    const t=parseInt(tParam,10);
    const found=items.findIndex(x=>x.t===t);
    if(found>=0) return {index:found, item:items[found]};
  }
  if(iParam!=null){
    const idx=parseInt(iParam,10);
    for(let j=items.length-1;j>=0;j--){
      if(items[j].idx===idx) return {index:j, item:items[j]};
    }
  }
  return null;
}

let filterMode='all';

function renderMobileCards(items, av, hl){
  const cards=items.map((it,i)=>{
    const isHl=hl&&hl.item&&hl.item.t===it.t;
    return `<article class="stats-m-card${isHl?' hl':''}" data-t="${it.t}" role="button" tabindex="0">
      <div class="stats-m-hd">
        <span class="stats-m-num">#${items.length-i} · ${modStr(it.mod)}</span>
        <span class="stats-m-res ${it.ok?'ok':'ko'}">${it.ok?'✓ Correct':'✗ Incorrect'}</span>
      </div>
      <div class="stats-m-q">${escapeHtml(it.question||'')}</div>
      <div class="stats-m-grid">
        <div class="stats-m-kpi"><div class="stats-m-kpi-v">${(it.el||0).toFixed(1)}s</div><div class="stats-m-kpi-l">Temps</div></div>
        <div class="stats-m-kpi"><div class="stats-m-kpi-v" style="color:${probaColor(it.reactScore||50)}">${it.reactScore??'—'}%</div><div class="stats-m-kpi-l">Réact.</div></div>
        <div class="stats-m-kpi"><div class="stats-m-kpi-v" style="color:${probaColor(it.mastery||50)}">${it.mastery??'—'}%</div><div class="stats-m-kpi-l">Maîtr.</div></div>
      </div>
      <div class="stats-m-meta">${fmtDate(it.t)} · réact. ${(it.reactSec||0).toFixed(1)}s · survols ${it.hoverSwitches??0}</div>
    </article>`;
  }).join('');
  const avg=`<div class="stats-avg-card">
    <h4>Moyennes (${av.n} réponses)</h4>
    <div class="stats-m-grid">
      <div class="stats-m-kpi"><div class="stats-m-kpi-v">${av.okRate}%</div><div class="stats-m-kpi-l">Réussite</div></div>
      <div class="stats-m-kpi"><div class="stats-m-kpi-v">${av.avgEl??'—'}s</div><div class="stats-m-kpi-l">Temps</div></div>
      <div class="stats-m-kpi"><div class="stats-m-kpi-v">${av.avgReactScore??'—'}%</div><div class="stats-m-kpi-l">Réact.</div></div>
      <div class="stats-m-kpi"><div class="stats-m-kpi-v">${av.avgMastery??'—'}%</div><div class="stats-m-kpi-l">Maîtr.</div></div>
      <div class="stats-m-kpi"><div class="stats-m-kpi-v">${av.avgReactSec??'—'}s</div><div class="stats-m-kpi-l">Réact.s</div></div>
      <div class="stats-m-kpi"><div class="stats-m-kpi-v">${av.avgConf??'—'}%</div><div class="stats-m-kpi-l">Conf.</div></div>
    </div>
  </div>`;
  return `<div class="stats-mobile-list">${cards}${avg}</div>`;
}

function bindAnswerClicks(root, log){
  function openDetail(t){
    const it=(log.items||[]).find(x=>x.t===t);
    if(!it) return;
    const det=document.getElementById('stats-detail');
    if(det&&det.closest('#stats-root')){
      det.outerHTML=renderDetail(it);
    }else{
      root.insertAdjacentHTML('beforeend',renderDetail(it));
    }
    const el=root.querySelector(`[data-t="${t}"]`);
    if(el) el.scrollIntoView({behavior:'smooth',block:'nearest'});
  }
  root.querySelectorAll('tbody tr:not(.avg-row), .stats-m-card').forEach(el=>{
    el.style.cursor='pointer';
    const t=parseInt(el.getAttribute('data-t'),10);
    el.addEventListener('click',()=>openDetail(t));
    if(el.classList.contains('stats-m-card')){
      el.addEventListener('keydown',e=>{
        if(e.key==='Enter'||e.key===' '){ e.preventDefault(); openDetail(t); }
      });
    }
  });
}

function render(){
  const log=loadLog();
  let items=(log.items||[]).slice().reverse();
  const params=new URLSearchParams(location.search);
  const hl=findHighlight((log.items||[]), params);

  if(filterMode==='ok') items=items.filter(x=>x.ok);
  else if(filterMode==='ko') items=items.filter(x=>!x.ok);

  const root=document.getElementById('stats-root');
  if(!root) return;

  if(!items.length){
    root.innerHTML=`<div class="stats-empty">
      <p>Aucune réponse enregistrée pour l’instant.</p>
      <p style="margin-top:.5rem"><a href="index.html" style="color:var(--acc)">Lancer une session quiz →</a></p>
    </div>`;
    return;
  }

  const av=computeAverages(items);
  const allItems=(log.items||[]);
  const globalAv=computeAverages(allItems);

  root.innerHTML=`
    <p class="stats-intro">Historique complet de chaque réponse : temps, réaction, maîtrise, comportement souris. Les moyennes portent sur le filtre actif (${items.length} réponse${items.length>1?'s':''}).</p>

    <div class="stats-summary">
      <div class="stats-card"><div class="stats-card-v">${globalAv.n}</div><div class="stats-card-l">Total enregistré</div></div>
      <div class="stats-card"><div class="stats-card-v" style="color:var(--green)">${globalAv.okRate}%</div><div class="stats-card-l">Réussite globale</div></div>
      <div class="stats-card"><div class="stats-card-v">${globalAv.avgReactScore||'—'}%</div><div class="stats-card-l">Réaction moy.</div></div>
      <div class="stats-card"><div class="stats-card-v">${globalAv.avgMastery||'—'}%</div><div class="stats-card-l">Maîtrise moy.</div></div>
      <div class="stats-card"><div class="stats-card-v">${globalAv.avgEl||'—'}s</div><div class="stats-card-l">Temps moy.</div></div>
      <div class="stats-card"><div class="stats-card-v">${globalAv.avgReactSec||'—'}s</div><div class="stats-card-l">Réact. moy.</div></div>
    </div>

    <div class="stats-toolbar">
      <button type="button" class="btn-rev ${filterMode==='all'?'on':''}" data-f="all">Toutes</button>
      <button type="button" class="btn-rev ${filterMode==='ok'?'on':''}" data-f="ok">Correctes</button>
      <button type="button" class="btn-rev ${filterMode==='ko'?'on':''}" data-f="ko">Incorrectes</button>
      <button type="button" class="btn-rev" id="btn-clear-stats" style="margin-left:auto;color:var(--red);border-color:rgba(240,96,96,.35)">Effacer l’historique</button>
    </div>

    <div class="stats-table-wrap">
      <table class="stats-table">
        <thead>
          <tr>
            <th>#</th><th>Date</th><th>Question</th><th>Module</th><th>Rés.</th>
            <th>Temps</th><th>Réact.%</th><th>Maîtr.%</th><th>Réact.s</th><th>Décis.s</th>
            <th>Survols</th><th>Mauv.opt</th><th>Conf.%</th>
          </tr>
        </thead>
        <tbody>
          ${items.map((it,i)=>{
            const isHl=hl&&hl.item&&hl.item.t===it.t;
            return `<tr class="${isHl?'hl':''}" data-t="${it.t}">
              <td class="num">${items.length-i}</td>
              <td>${fmtDate(it.t)}</td>
              <td class="q-preview">${escapeHtml((it.question||'').slice(0,80))}${(it.question||'').length>80?'…':''}</td>
              <td>${modStr(it.mod)}</td>
              <td class="${it.ok?'ok-cell':'ko-cell'}">${it.ok?'✓':'✗'}</td>
              <td class="num">${(it.el||0).toFixed(1)}s</td>
              <td class="num" style="color:${probaColor(it.reactScore||50)}">${it.reactScore??'—'}</td>
              <td class="num" style="color:${probaColor(it.mastery||50)}">${it.mastery??'—'}</td>
              <td class="num">${(it.reactSec||0).toFixed(1)}</td>
              <td class="num">${(it.decideSec||0).toFixed(1)}</td>
              <td class="num">${it.hoverSwitches??0}</td>
              <td class="num">${it.wrongHoverCount??0}</td>
              <td class="num">${it.confIdx??'—'}</td>
            </tr>`;
          }).join('')}
          <tr class="avg-row">
            <td colspan="4">Moyennes (${av.n})</td>
            <td>${av.okRate}%</td>
            <td class="num">${av.avgEl??'—'}s</td>
            <td class="num">${av.avgReactScore??'—'}</td>
            <td class="num">${av.avgMastery??'—'}</td>
            <td class="num">${av.avgReactSec??'—'}</td>
            <td class="num">${av.avgDecideSec??'—'}</td>
            <td class="num">${av.avgHovers??'—'}</td>
            <td class="num">${av.avgWrongH??'—'}</td>
            <td class="num">${av.avgConf??'—'}</td>
          </tr>
        </tbody>
      </table>
    </div>
    ${renderMobileCards(items,av,hl)}
    ${hl&&hl.item?renderDetail(hl.item):''}
  `;

  root.querySelectorAll('[data-f]').forEach(btn=>{
    btn.addEventListener('click',()=>{
      filterMode=btn.getAttribute('data-f');
      render();
    });
  });

  bindAnswerClicks(root, log);

  const clearBtn=document.getElementById('btn-clear-stats');
  if(clearBtn){
    clearBtn.addEventListener('click',()=>{
      if(confirm('Effacer tout l’historique des stats détaillées ?')){
        localStorage.removeItem('ppl4answers');
        render();
      }
    });
  }

  if(hl&&hl.item){
    const row=root.querySelector(`tr[data-t="${hl.item.t}"], .stats-m-card[data-t="${hl.item.t}"]`);
    if(row) row.scrollIntoView({behavior:'smooth',block:'center'});
  }
}

document.addEventListener('DOMContentLoaded',render);
window.addEventListener('resize',()=>{
  clearTimeout(window._pplStatsResize);
  window._pplStatsResize=setTimeout(render,200);
});
})();
