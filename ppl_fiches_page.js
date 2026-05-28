const MOD_ORDER=['C','A','M','R'];
const MOD_ICON={C:'📡',A:'✈',M:'🌤',R:'📋'};
const MOD_ACCENT={C:'#5b8af0',A:'#34d3a8',M:'#f0b040',R:'#c084fc'};
let TOPIC_KB=null;
let _answerLogByRef=null;
let _ficheSearchTimer=null;
const STOP_WORDS=new Set('le la les un une des du de et en est sont pour par sur avec dans que qui dont cette ce ces leur leurs aux au ou si ne pas plus très tout tous toute'.split(' '));


function initTopicKB(){
  if(TOPIC_KB) return TOPIC_KB;
  TOPIC_KB={};
  Q.forEach((q,i)=>{
    const r=q.r||'Autre';
    if(!TOPIC_KB[r]) TOPIC_KB[r]={ref:r,module:q.m,idxs:[],expl:[],kw:{}};
    const t=TOPIC_KB[r];
    t.idxs.push(i);
    if(q.e&&!t.expl.includes(q.e)) t.expl.push(q.e);
    extractKw(q.q+' '+q.e).forEach(w=>{t.kw[w]=(t.kw[w]||0)+1;});
  });
  return TOPIC_KB;
}

function extractKw(text){
  return (text||'').toLowerCase().replace(/[^\wàâäéèêëïîôùûüç\s]/gi,' ').split(/\s+/)
    .filter(w=>w.length>3&&!STOP_WORDS.has(w));
}

function textSim(a,b){
  const wa=new Set(extractKw(a)),wb=new Set(extractKw(b));
  if(!wa.size||!wb.size) return 0;
  let inter=0; wa.forEach(w=>{if(wb.has(w)) inter++;});
  return inter/(wa.size+wb.size-inter);
}

function getTopicStats(ref){
  const kb=initTopicKB()[ref];
  if(!kb) return {coverage:0,accuracy:0,n:0,total:0};
  const answered=kb.idxs.filter(i=>hist[i]!==undefined);
  const ok=answered.filter(i=>hist[i]).length;
  return {coverage:answered.length/kb.idxs.length,accuracy:answered.length?ok/answered.length:0,n:answered.length,total:kb.idxs.length};
}


function bayesianRate(ok,n,priorOk=0.5,priorN=4){if(n<=0)return priorOk;const a=priorOk*priorN+ok,b=(1-priorOk)*priorN+(n-ok);return a/(a+b);}
function clampProba(p){return Math.min(0.97,Math.max(0.03,p));}
function barColor(p){ return p>=75?'#34d3a8':p>=50?'#f0b040':'#f06060'; }
function diffStr(d){ return['','★ Facile','★★ Moyen','★★★ Difficile','★★★★ Expert'][d]; }
function modStr(m){ return{C:'Communications',A:'Aéronef',M:'Météorologie',R:'Réglementation'}[m]; }
function modClass(m){ return{C:'bd-comm',A:'bd-aero',M:'bd-met',R:'bd-reg'}[m]; }
function diffClass(d){ return['','bd-f','bd-m','bd-d','bd-e'][d]; }


function esc(s){return String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
let hist={}, weak=new Set(), revLog={entries:{}}, answerLog={items:[]};
try{hist=JSON.parse(localStorage.getItem('ppl4h')||'{}')}catch(e){}
try{const w=JSON.parse(localStorage.getItem('ppl4w')||'[]');weak=new Set(w)}catch(e){}
try{revLog=JSON.parse(localStorage.getItem('ppl4rev')||'{"entries":{}}')}catch(e){revLog={entries:{}}}
try{answerLog=JSON.parse(localStorage.getItem('ppl4answers')||'{"items":[]}')}catch(e){answerLog={items:[]}}
if(!revLog.entries) revLog.entries={};
if(!answerLog.items) answerLog.items=[];

/* Formules : formulas_engine.js (externe) */
function analyzeTraps(q,chosenIdx){
  const correct=q.o[q.a];
  return q.o.map((o,i)=>{
    if(i===q.a) return null;
    const traps=[];
    if(/\d/.test(o)&&/\d/.test(correct)) traps.push('Piège numérique — vérifie chaque chiffre');
    if(textSim(o,correct)>0.45) traps.push('Formulation proche — lis mot à mot');
    if(o.split(/[\s,]+/)[0]===correct.split(/[\s,]+/)[0]&&o!==correct) traps.push('Même mot-clé initial — la fin diffère');
    if(o.length>10&&correct.length>10&&o.substring(0,4)===correct.substring(0,4)) traps.push('Début identique — piège classique');
    if(chosenIdx===i) traps.push('← Tu as sélectionné ce piège');
    return{i,text:o,traps:traps.length?traps:['Distracteur : mémorise la bonne réponse par exclusion']};
  }).filter(Boolean);
}

function genMnemonic(q,topic){
  const r=(q.r||'').toLowerCase(),t=topic||{};
  if(r.includes('alphabet')||r.includes('oaci')) return 'Alfa (2 a) · Bravo · Charlie · Delta — récite l\'alphabet complet 2×/jour';
  if(r.includes('fréquence')||r.includes('frequence')){
    const nums=q.o.filter((o,i)=>i===q.a||/\d/.test(o)).map(o=>o.match(/[\d,\.]+/)?.[0]).filter(Boolean);
    if(nums.length) return 'Fréquences clés : '+nums.join(' · ')+' — associe usage + chiffre';
  }
  if(r.includes('phraséologie')||r.includes('phras')) return 'ROGER ≠ WILCO : Roger = reçu · Wilco = reçu ET exécuté';
  if(r.includes('portée')||r.includes('vhf')) return 'D = 1,23 × √h — h en pieds, D en NM';
  if(r.includes('lisibilité')) return '1=illisible → 5=parfait (mnémotechnique : plus le chiffre est grand, mieux c\'est)';
  const topKw=Object.entries(t.kw||{}).sort((a,b)=>b[1]-a[1]).slice(0,3).map(x=>x[0]);
  if(topKw.length>=2) return 'Mots-clés du thème : '+topKw.join(' · ');
  return null;
}

function aggregateThemeTraps(kb){
  const samples=new Set();
  kb.idxs.slice(0,4).forEach(i=>samples.add(i));
  kb.idxs.filter(i=>Q[i]?.d>=3).slice(0,2).forEach(i=>samples.add(i));
  kb.idxs.filter(i=>Q[i]?.d===4).slice(0,1).forEach(i=>samples.add(i));
  const trapMap=new Map();
  [...samples].forEach(idx=>{
    const q=Q[idx]; if(!q) return;
    analyzeTraps(q,-1).forEach(t=>{
      const key=t.text.trim();
      if(!trapMap.has(key)){
        trapMap.set(key,{i:t.i,text:t.text,traps:[...t.traps],count:1,from:q.q.substring(0,60)});
      }else{
        const e=trapMap.get(key);
        e.count++;
        t.traps.forEach(r=>{if(!e.traps.includes(r))e.traps.push(r);});
      }
    });
  });
  return[...trapMap.values()].sort((a,b)=>b.count-a.count).slice(0,14);
}

function aggregateTopicRevision(kb){
  let answered=0,ok=0,ko=0,dueSoon=0,sm2Reps=0;
  const behTags={};
  kb.idxs.forEach(idx=>{
    if(hist[idx]===true){answered++;ok++;}
    else if(hist[idx]===false){answered++;ko++;}
    const e=revLog.entries[idx];
    if(!e) return;
    sm2Reps+=e.sm2?.reps||0;
    if(e.due&&e.due<=Date.now()+86400000) dueSoon++;
    (e.tags||[]).forEach(t=>{behTags[t]=(behTags[t]||0)+1;});
  });
  return{
    answered,ok,ko,unanswered:Math.max(0,kb.idxs.length-answered),dueSoon,sm2Reps,
    behTags:Object.entries(behTags).sort((a,b)=>b[1]-a[1]).slice(0,10)
  };
}

function getRelatedTopics(ref,limit){
  const kb=initTopicKB();
  const cur=kb[ref]; if(!cur) return [];
  const curKw=new Set(Object.keys(cur.kw||{}));
  const scored=[];
  Object.entries(kb).forEach(([r,data])=>{
    if(r===ref||!data.idxs?.length) return;
    let score=0;
    Object.keys(data.kw||{}).forEach(w=>{if(curKw.has(w))score+=Math.min(cur.kw[w]||0,data.kw[w]||0);});
    if(data.module===cur.module) score+=2;
    if(score>0) scored.push({ref:r,count:data.idxs.length,module:data.module,score});
  });
  return scored.sort((a,b)=>b.score-a.score).slice(0,limit||5);
}

function aggregateWrongChoices(kb){
  const wrongTextAgg={};
  kb.idxs.forEach(idx=>{
    const e=revLog.entries[idx],q=Q[idx];
    if(!e||!q) return;
    Object.entries(e.wrongChoices||{}).forEach(([choIdx,c])=>{
      const i=parseInt(choIdx,10);
      const text=q.o[i]||('Option '+String.fromCharCode(65+i));
      wrongTextAgg[text]=(wrongTextAgg[text]||0)+c;
    });
  });
  return Object.entries(wrongTextAgg).sort((a,b)=>b[1]-a[1]).slice(0,6);
}

function genTopicSummary(ref,kb,stats){
  const n=kb.idxs.length,r=ref.toLowerCase();
  const cov=stats.n?Math.round(stats.coverage*100):0;
  const acc=stats.n?Math.round(stats.accuracy*100):null;
  const perf=acc!=null?` · ${acc}% de réussite sur ${stats.n} réponses`:'';
  if(r.includes('vhf')||r.includes('portée'))
    return `Propagation optique VHF : la portée dépend de la racine carrée de la hauteur d'antenne (D = 1,23 × √h). Thème à fort volume calcul (${n} questions)${perf}.`;
  if(r.includes('isa')||r.includes('atmosphère'))
    return `Atmosphère type ISA : référence +15°C / 1013,25 hPa au sol, −2°C par 1000 ft. ${n} questions${perf}.`;
  if(r.includes('vp')||r.includes('vitesse propre'))
    return `Vitesse propre (TAS) : Vi corrigée par altitude et température. Formule examen FL×10÷6 + |ΔT|÷4 en %. ${n} questions${perf}.`;
  if(r.includes('altim')||r.includes('calage'))
    return `Altimétrie : QNH, QFE, altitude pression et corrections température. Pièges numériques fréquents. ${n} questions${perf}.`;
  if(r.includes('phras')||r.includes('comm'))
    return `Communications aériennes : phraséologie standard OACI, précision terminologique exigée à l'examen. ${n} questions${perf}.`;
  if(r.includes('vfr')||r.includes('réglem')||r.includes('espace'))
    return `Réglementation VFR France : visibilités, distances aux nuages, espaces aériens. Mémorisation pure des seuils. ${n} questions${perf}.`;
  return `Notion clé du programme PPL « ${ref} » — ${n} questions${cov?`, ${cov}% de couverture`:''}${perf}.${kb.expl.length>1?` ${Math.min(kb.expl.length,20)} points distincts documentés.`:''}`;
}

function genExamTip(ref,mod){
  const r=ref.toLowerCase();
  if(r.includes('calcul')||r.includes('portée')||r.includes('vp')||r.includes('isa'))
    return 'Astuce examen : refais le calcul sur papier avant de valider. Les mauvaises réponses ne diffèrent souvent que d\'un chiffre ou d\'une unité.';
  if(r.includes('phras')||r.includes('alphabet'))
    return 'Astuce examen : récite la phraséologie à voix haute. Roger ≠ Wilco : Roger = reçu · Wilco = reçu ET exécuté.';
  if(r.includes('vfr')||r.includes('visibilit'))
    return 'Astuce examen : crée un tableau récap des minima VFR par espace aérien (A, C, D, E).';
  return ({C:'Module comm : mémorise fréquences + procédures mot pour mot.',
    A:'Module aéronef : vérifie unités (kt, ft, hPa) avant chaque réponse.',
    M:'Module météo : relie toujours phénomène → cause → conséquence pour pilote.',
    R:'Module réglem : les seuils chiffrés tombent souvent — fiche récap obligatoire.'})[mod]||'Relis la règle, puis enchaîne 5 questions du thème sans correction.';
}

function genTopicObjectives(ref,kb){
  const objs=[`Maîtriser le principe « ${ref} »`,
    `Réussir les ${kb.idxs.length} questions associées`,
    'Repérer les distracteurs typiques avant de répondre'];
  const r=ref.toLowerCase();
  if(r.includes('calcul')||r.includes('portée')||r.includes('vp')||r.includes('isa'))
    objs.push('Effectuer les calculs mentalement en moins de 30 secondes');
  if(r.includes('phras')||r.includes('comm'))
    objs.push('Reproduire la phraséologie exacte sans hésitation');
  return objs;
}

function buildTopicFiche(ref,sampleQ,entry,chosenIdx){
  const kb=initTopicKB()[ref]||{idxs:[],expl:[],kw:{},module:'R',ref};
  const q=sampleQ||Q[kb.idxs[0]];
  if(!q) return null;
  const base=buildDeepFiche(q,entry,chosenIdx??-1);
  const topicStats=getTopicStats(ref);
  let failTotal=0,struggleTotal=0;
  const wrongAgg={};
  kb.idxs.forEach(idx=>{
    const e=revLog.entries[idx];
    if(!e) return;
    failTotal+=e.failCount||0;
    struggleTotal+=e.struggleCount||0;
    Object.entries(e.wrongChoices||{}).forEach(([k,v])=>{wrongAgg[k]=(wrongAgg[k]||0)+v;});
  });
  const allPoints=[...new Set(kb.expl)];
  const byDiff={1:0,2:0,3:0,4:0};
  kb.idxs.forEach(i=>{const d=Q[i]?.d;if(d)byDiff[d]=(byDiff[d]||0)+1;});
  const workedExamples=[];
  for(const idx of kb.idxs){
    if(workedExamples.length>=8) break;
    const qq=Q[idx],w=typeof buildWorkedExample==='function'?buildWorkedExample(qq):null;
    if(w&&!workedExamples.some(x=>x.title===w.title&&x.result===w.result))
      workedExamples.push({...w,qPreview:qq.q.substring(0,120)+(qq.q.length>120?'…':''),qIdx:idx});
  }
  const previews=kb.idxs.slice(0,6).map(i=>Q[i]).filter(Boolean);
  const weakCount=kb.idxs.filter(i=>weak.has(i)||(revLog.entries[i]?.failCount||0)>0).length;
  const topWrong=Object.entries(wrongAgg).sort((a,b)=>b[1]-a[1]).slice(0,3);
  const topWrongDetailed=aggregateWrongChoices(kb);
  const themeTraps=aggregateThemeTraps(kb);
  const revStats=aggregateTopicRevision(kb);
  const relatedTopics=getRelatedTopics(ref,6);
  const refHtml=typeof renderFicheReferenceHTML==='function'?renderFicheReferenceHTML(ref):'';
  const allRules=allPoints.slice(0,25);
  return{
    ref,module:kb.module||q.m,
    sampleQ:q,entry,chosenIdx:chosenIdx??-1,
    ...base,
    topicStats,failTotal,struggleTotal,allPoints,byDiff,workedExamples,previews,
    weakCount,questionCount:kb.idxs.length,
    summary:genTopicSummary(ref,kb,topicStats),
    examTip:genExamTip(ref,kb.module||q.m),
    objectives:genTopicObjectives(ref,kb),
    topWrong,topWrongDetailed,themeTraps,revStats,relatedTopics,refHtml,allRules,
    topKw:base.topKw
  };
}

function summarizeKey(text){
  if(!text) return '';
  const t=text.trim();
  const m=t.match(/^[^.!?]+[.!?]/);
  const s=m?m[0]:t;
  return s.length>200?s.slice(0,197)+'…':s;
}

function getLastAnswerLogForIdx(idx){
  if(idx==null||idx<0) return null;
  for(let i=answerLog.items.length-1;i>=0;i--){
    if(answerLog.items[i].idx===idx) return answerLog.items[i];
  }
  return null;
}

function buildOptionAnalysis(q,chosenIdx){
  return q.o.map((text,i)=>{
    const letter=String.fromCharCode(65+i);
    const isCorrect=i===q.a;
    const isChosen=chosenIdx===i;
    let why=[];
    if(isCorrect) why.push('Conforme au programme et à l\'explication officielle.');
    else{
      const trap=analyzeTraps(q,chosenIdx).find(t=>t.i===i);
      if(trap) why=trap.traps.filter(t=>!t.startsWith('←'));
      if(isChosen&&!why.length) why.push('Option validée à tort — relire la règle fondamentale.');
      if(!why.length) why.push('Distracteur — éliminer par la règle et l\'exclusion.');
    }
    return{letter,text,isCorrect,isChosen,why};
  });
}

function buildRevisionActionPlan(q,entry,f,beh){
  const steps=['Relire la règle fondamentale ci-dessous mot pour mot.',
    'Analyser le tableau option par option — comprendre chaque piège.'];
  if(f.mnemo) steps.push('Mémoriser : '+f.mnemo);
  if(f.formulas?.linked?.length) steps.push('Refaire les '+f.formulas.linked.length+' formule(s) liées sur papier.');
  if(f.worked) steps.push('Refaire le calcul pas à pas de l\'exemple type.');
  steps.push('Enchaîner 3 questions du thème « '+q.r+' » sans correction.');
  if(entry?.sm2) steps.push('Prochaine révision SM-2 : dans '+entry.sm2.interval+' jour'+(entry.sm2.interval>1?'s':'')+'.');
  if(beh?.wrongHoverCount>=2) steps.push('À l\'examen : éliminer 2 options pièges avant de valider.');
  if(beh?.reactionSec<1.5) steps.push('Ralentir : minimum 5 s de lecture sur les questions difficiles.');
  return steps;
}

function renderBehCompact(beh,logEntry){
  const b=beh||logEntry?.beh||{};
  const rows=[];
  if(b.reactionSec!=null) rows.push(['Réaction',b.reactionSec.toFixed(1)+' s']);
  if(b.decisionSec!=null) rows.push(['Décision',b.decisionSec.toFixed(1)+' s']);
  if(b.readSec!=null) rows.push(['Lecture',b.readSec.toFixed(1)+' s']);
  if(b.hoverSwitches!=null) rows.push(['Survols / vacill.',(b.hoverSwitches||0)+' / '+(b.vacillations||0)]);
  if(b.wrongHoverCount!=null) rows.push(['Temps mauvaises opts',Math.round((b.wrongDwellRatio||0)*100)+'% · '+b.wrongHoverCount+' opts']);
  if(b.longestWrongIdx>=0) rows.push(['Piège consulté le plus longtemps','Option '+String.fromCharCode(65+b.longestWrongIdx)]);
  if(logEntry?.reactScore!=null) rows.push(['Score réaction',''+logEntry.reactScore+'%']);
  if(!rows.length) return '';
  return `<div class="err-beh-grid">${rows.map(([k,v])=>`<div class="err-beh-it"><span>${esc(k)}</span><strong>${esc(v)}</strong></div>`).join('')}</div>`;
}

function renderErrorUltraHTML(f,opts){
  const q=f.sampleQ,chosenIdx=f.chosenIdx??-1,entry=f.entry;
  const beh=opts.beh||entry?.lastBeh;
  const logEntry=opts.logEntry||getLastAnswerLogForIdx(Q.indexOf(q));
  const isWrong=chosenIdx>=0&&chosenIdx!==q.a;
  const repeat=entry?.wrongChoices?.[chosenIdx]||0;
  const wrongTrap=isWrong?analyzeTraps(q,chosenIdx).find(t=>t.i===chosenIdx):null;
  const optRows=buildOptionAnalysis(q,chosenIdx).map(o=>`
    <div class="err-opt-row${o.isCorrect?' err-opt-ok':''}${o.isChosen?' err-opt-chosen':''}">
      <span class="err-opt-l">${o.letter}</span>
      <div class="err-opt-body">
        <div class="err-opt-txt">${esc(o.text)}${o.isCorrect?' ✓':''}${o.isChosen&&!o.isCorrect?' ✗ (ta réponse)':''}</div>
        <div class="err-opt-why">${o.why.map(w=>esc(w)).join(' · ')}</div>
      </div>
    </div>`).join('');
  const plan=buildRevisionActionPlan(q,entry,f,beh);
  const behHtml=renderBehCompact(beh,logEntry);
  return `<div class="fiche-error-ultra">
    <div class="err-ultra-hd">
      <span class="err-ultra-badge">🔬 Fiche erreur ultra-détaillée</span>
      ${repeat>1?`<span class="err-ultra-badge warn">Même piège ${repeat}×</span>`:''}
      ${(entry?.failCount||0)>1?`<span class="err-ultra-badge warn">${entry.failCount} erreurs cumulées</span>`:''}
    </div>
    <div class="err-ultra-q">${esc(q.q)}</div>
    ${isWrong?`<div class="err-ultra-ans">
      <div class="err-ultra-wrong">✗ Ta réponse : <strong>${esc(q.o[chosenIdx])}</strong></div>
      <div class="err-ultra-correct">✓ Bonne réponse : <strong>${esc(q.o[q.a])}</strong></div>
      ${wrongTrap?`<div class="err-ultra-trap">${wrongTrap.traps.map(t=>esc(t)).join(' · ')}</div>`:''}
    </div>`:''}
    <div class="fiche-block err-block">
      <div class="fiche-block-hd"><span class="fiche-block-ico">🔍</span> Analyse option par option (A–D)</div>
      <div class="fiche-block-bd"><div class="err-opt-list">${optRows}</div></div>
    </div>
    ${behHtml?`<div class="fiche-block err-block"><div class="fiche-block-hd"><span class="fiche-block-ico">📊</span> Comportement lors de l'erreur</div><div class="fiche-block-bd">${behHtml}</div></div>`:''}
    <div class="fiche-block err-block">
      <div class="fiche-block-hd"><span class="fiche-block-ico">📝</span> Plan de révision express</div>
      <div class="fiche-block-bd"><ol class="err-action-plan">${plan.map(s=>`<li>${typeof s==='string'&&s.includes('<strong>')?s:esc(s)}</li>`).join('')}</ol></div>
    </div>
  </div>`;
}

function renderDeepFicheHTML(q,entry,chosenIdx,beh){
  const idx=Q.indexOf(q);
  const ci=chosenIdx??entry?.lastWrongChoice??entry?.lastBeh?.chosenIdx??-1;
  return renderTopicFicheHTML(q.r,{sampleQ:q,entry,chosenIdx:ci,mode:'error',compact:true,showFoot:true,beh:beh||entry?.lastBeh,logEntry:getLastAnswerLogForIdx(idx>=0?idx:undefined)});
}

function renderTopicFicheHTML(ref,opts={}){
  const f=opts.f||buildTopicFiche(ref,opts.sampleQ,opts.entry,opts.chosenIdx);
  if(!f) return '';
  const mCol=f.mastery.pct>=65?'var(--green)':f.mastery.pct>=40?'var(--amber)':'var(--red)';
  const acc=f.topicStats.n?Math.round(f.topicStats.accuracy*100):'—';
  const cov=f.topicStats.n?Math.round(f.topicStats.coverage*100):0;
  const formulasHtml=typeof renderFicheFormulasSection==='function'
    ?renderFicheFormulasSection(f.formulas,f.worked,f.essentials,f.module):'';
  const points=(f.allRules.length?f.allRules:f.allPoints.length?f.allPoints:f.keyPoints);
  const isError=opts.mode==='error';
  const errorUltra=isError?renderErrorUltraHTML(f,opts):'';
  const qTraps=f.traps.length?f.traps:(f.themeTraps.length?f.themeTraps.slice(0,6):[]);
  const trapsForDisplay=isError?qTraps:(f.themeTraps.length?f.themeTraps:f.traps);
  const trapsDisplayHtml=trapsForDisplay.map(t=>{
    const isCorrect=t.i===f.sampleQ.a;
    const isChosen=opts.chosenIdx===t.i;
    return`<div class="fiche-trap-item${isChosen?' chosen':''}${isCorrect?' correct':''}">
      <span class="fiche-trap-letter">${String.fromCharCode(65+t.i)}</span>
      <div><div class="fiche-trap-text">${esc(t.text)}${isCorrect?' ✓':''}${t.count>1?` <span class="fiche-trap-cnt">×${t.count}</span>`:''}</div>
        <div class="fiche-trap-why">${esc(t.traps.join(' · '))}</div></div></div>`;
  }).join('');
  const topWrongHtml=f.topWrongDetailed.length?`<ul class="fiche-wrong-list">${f.topWrongDetailed.map(([text,c])=>
    `<li class="fiche-wrong-item"><span class="fiche-wrong-txt">${esc(text)}</span><span class="fiche-wrong-cnt">${c}×</span></li>`).join('')}</ul>`:'';
  const revStatsHtml=f.revStats?`<div class="fiche-rev-grid">
    <div class="fiche-rev-stat"><span>Répondues</span><strong>${f.revStats.answered}/${f.questionCount}</strong></div>
    <div class="fiche-rev-stat"><span>Correctes</span><strong style="color:var(--green)">${f.revStats.ok}</strong></div>
    <div class="fiche-rev-stat"><span>Erreurs</span><strong style="color:var(--red)">${f.revStats.ko}</strong></div>
    <div class="fiche-rev-stat"><span>Hésitations</span><strong>${f.struggleTotal||0}</strong></div>
    <div class="fiche-rev-stat"><span>SM-2 reps</span><strong>${f.revStats.sm2Reps||0}</strong></div>
    <div class="fiche-rev-stat"><span>À réviser</span><strong style="color:var(--amber)">${f.revStats.dueSoon||0}</strong></div>
  </div>${f.revStats.behTags.length?`<div class="fiche-kw-row" style="margin-top:8px">${f.revStats.behTags.map(([t,c])=>`<span class="fiche-kw fiche-kw-beh">${esc(t)} (${c})</span>`).join('')}</div>`:''}`:'';
  const relatedHtml=f.relatedTopics.length?`<div class="fiche-related">${f.relatedTopics.map(rt=>
    `<a href="fiches.html?topic=${encodeURIComponent(rt.ref)}" class="fiche-related-link"><span>${esc(rt.ref)}</span><span class="fiche-related-meta">${modStr(rt.module)} · ${rt.count} q</span></a>`).join('')}</div>`:'';
  const workedMulti=f.workedExamples.length
    ?f.workedExamples.map(w=>`<div class="fiche-worked">
        <div class="fiche-worked-title">${esc(w.title)}</div>
        ${w.qPreview?`<div class="fiche-worked-q">Ex. : ${esc(w.qPreview)}</div>`:''}
        <ol>${w.steps.map(s=>`<li>${esc(s)}</li>`).join('')}</ol>
        ${w.result?`<div class="fiche-worked-result">→ ${esc(w.result)}</div>`:''}
      </div>`).join('')
    :'';
  const previewsHtml=typeof renderFicheQuestionsList==='function'
    ?renderFicheQuestionsList(ref,{esc,modStr,modClass,diffStr,diffClass})
    :f.previews.map((pq,i)=>`<div class="fiche-preview"><strong>Question type ${i+1}</strong>${esc(pq.q)}</div>`).join('');
  const diffHtml=Object.entries(f.byDiff).filter(([,n])=>n>0).map(([d,n])=>
    `<span class="fiche-diff-chip">${diffStr(parseInt(d,10))} · ${n}</span>`).join('');
  const showFoot=opts.showFoot!==false;
  const themeExpandBody=isError?`
      ${points.length?`<div class="fiche-block"><div class="fiche-block-hd"><span class="fiche-block-ico">📋</span> Synthèse thème (${points.length} points)</div><div class="fiche-block-bd"><ul class="fiche-points">${points.map(p=>`<li>${esc(p)}</li>`).join('')}</ul></div></div>`:''}
      <div class="fiche-block"><div class="fiche-block-hd"><span class="fiche-block-ico">❓</span> Toutes les questions (${f.questionCount})</div><div class="fiche-block-bd">${previewsHtml||'—'}</div></div>
      ${relatedHtml?`<div class="fiche-block"><div class="fiche-block-hd"><span class="fiche-block-ico">🔗</span> Thèmes liés</div><div class="fiche-block-bd">${relatedHtml}</div></div>`:''}
      ${diffHtml?`<div class="fiche-block"><div class="fiche-block-hd"><span class="fiche-block-ico">📊</span> Répartition difficulté</div><div class="fiche-block-bd"><div class="fiche-diff-row">${diffHtml}</div></div></div>`:''}`:'';

  return`<div class="fiche-sheet${isError?' fiche-sheet-error':''}">
    <div class="fiche-hero">
      <div class="fiche-hero-top">
        <h3 class="fiche-hero-title">${esc(f.ref)}</h3>
        <div class="fiche-hero-badges">
          <span class="bd ${modClass(f.module)}">${modStr(f.module)}</span>
          <span class="bd">${f.questionCount} questions</span>
          ${f.weakCount?`<span class="bd bd-e">${f.weakCount} faible${f.weakCount>1?'s':''}</span>`:''}
        </div>
      </div>
      <p class="fiche-hero-summary">${esc(f.summary)}</p>
      <div class="fiche-stats">
        <div class="fiche-stat"><div class="fiche-stat-v">${acc}${acc!=='—'?'%':''}</div><div class="fiche-stat-l">Réussite</div></div>
        <div class="fiche-stat"><div class="fiche-stat-v">${cov}%</div><div class="fiche-stat-l">Couverture</div></div>
        <div class="fiche-stat"><div class="fiche-stat-v">${f.failTotal||0}</div><div class="fiche-stat-l">Erreurs</div></div>
        <div class="fiche-stat"><div class="fiche-stat-v" style="color:${mCol}">${f.mastery.pct}%</div><div class="fiche-stat-l">Maîtrise</div></div>
        <div class="fiche-stat"><div class="fiche-stat-v">${f.struggleTotal||0}</div><div class="fiche-stat-l">Hésitations</div></div>
        <div class="fiche-stat"><div class="fiche-stat-v">${f.revStats?.answered||0}/${f.questionCount}</div><div class="fiche-stat-l">Vues</div></div>
      </div>
      ${f.concept?`<p class="fiche-concept">${esc(f.concept)}</p>`:''}
    </div>
    <div class="fiche-body">
      ${errorUltra}
      <div class="fiche-block">
        <div class="fiche-block-hd"><span class="fiche-block-ico">📌</span> Règle fondamentale</div>
        <div class="fiche-block-bd"><div class="fiche-rule-box">${esc(f.rule)}</div></div>
      </div>
      ${!isError?`<div class="fiche-block">
        <div class="fiche-block-hd"><span class="fiche-block-ico">🎯</span> Objectifs d'apprentissage</div>
        <div class="fiche-block-bd"><ul class="fiche-objectives">${f.objectives.map(o=>`<li>${esc(o)}</li>`).join('')}</ul></div>
      </div>`:''}
      ${!isError&&points.length?`<div class="fiche-block">
        <div class="fiche-block-hd"><span class="fiche-block-ico">📋</span> Synthèse complète (${points.length} points)</div>
        <div class="fiche-block-bd"><ul class="fiche-points">${points.map(p=>`<li>${esc(p)}</li>`).join('')}</ul></div>
      </div>`:''}
      <div class="fiche-block">
        <div class="fiche-block-hd"><span class="fiche-block-ico">⚠️</span> Pièges & distracteurs (${trapsForDisplay.length} analysés)</div>
        <div class="fiche-block-bd"><div class="fiche-trap-grid">${trapsDisplayHtml}</div></div>
      </div>
      ${f.refHtml?`<div class="fiche-block"><div class="fiche-block-hd"><span class="fiche-block-ico">📖</span> Référence programme</div><div class="fiche-block-bd">${f.refHtml}</div></div>`:''}
      ${formulasHtml?`<div class="fiche-block"><div class="fiche-block-hd"><span class="fiche-block-ico">📐</span> Formules & calculs</div><div class="fiche-block-bd">${formulasHtml}</div></div>`:''}
      ${workedMulti?`<div class="fiche-block"><div class="fiche-block-hd"><span class="fiche-block-ico">🔢</span> Calculs pas à pas (${f.workedExamples.length})</div><div class="fiche-block-bd">${workedMulti}</div></div>`:''}
      ${topWrongHtml?`<div class="fiche-block"><div class="fiche-block-hd"><span class="fiche-block-ico">❌</span> Erreurs les plus fréquentes sur ce thème</div><div class="fiche-block-bd">${topWrongHtml}</div></div>`:''}
      ${revStatsHtml?`<div class="fiche-block"><div class="fiche-block-hd"><span class="fiche-block-ico">📈</span> Ta progression sur ce thème</div><div class="fiche-block-bd">${revStatsHtml}</div></div>`:''}
      ${f.mnemo?`<div class="fiche-block"><div class="fiche-block-hd"><span class="fiche-block-ico">💡</span> Mnémotechnique</div><div class="fiche-block-bd"><div class="fiche-mnemo">${esc(f.mnemo)}</div></div></div>`:''}
      <div class="fiche-block">
        <div class="fiche-block-hd"><span class="fiche-block-ico">🎓</span> Conseil examen</div>
        <div class="fiche-block-bd"><div class="fiche-exam-tip">${esc(f.examTip)}</div></div>
      </div>
      ${isError&&themeExpandBody?`<details class="fiche-theme-expand"><summary>📚 Synthèse thème complète (${f.questionCount} questions)</summary><div class="fiche-theme-expand-bd">${themeExpandBody}</div></details>`:''}
      ${!isError?`
      ${f.topKw.length?`<div class="fiche-block">
        <div class="fiche-block-hd"><span class="fiche-block-ico">🔤</span> Vocabulaire clé</div>
        <div class="fiche-block-bd"><div class="fiche-kw-row">${f.topKw.map(w=>`<span class="fiche-kw">${esc(w)}</span>`).join('')}</div></div>
      </div>`:''}
      <div class="fiche-block">
        <div class="fiche-block-hd"><span class="fiche-block-ico">❓</span> Toutes les questions (${f.questionCount})</div>
        <div class="fiche-block-bd">${previewsHtml||'<div class="rev-empty">Aucune question liée.</div>'}</div>
      </div>
      ${relatedHtml?`<div class="fiche-block"><div class="fiche-block-hd"><span class="fiche-block-ico">🔗</span> Thèmes liés</div><div class="fiche-block-bd">${relatedHtml}</div></div>`:''}
      ${diffHtml?`<div class="fiche-block">
        <div class="fiche-block-hd"><span class="fiche-block-ico">📊</span> Répartition difficulté</div>
        <div class="fiche-block-bd"><div class="fiche-diff-row">${diffHtml}</div></div>
      </div>`:''}`:''}
    </div>
    ${showFoot?`<div class="fiche-foot">
      <div class="fiche-mastery-block">
        <div class="mastery-lbl"><span>Maîtrise estimée</span><span style="color:${mCol}">${f.mastery.label}</span></div>
        <div class="mastery-bar"><div class="mastery-fi" style="width:${f.mastery.pct}%;background:${mCol}"></div></div>
      </div>
      <div class="fiche-actions">
        <button type="button" class="rev-btn-sm primary" data-rev-action="topic" data-ref="${esc(ref)}">Quiz thème (${f.questionCount})</button>
        <a href="fiches.html?topic=${encodeURIComponent(ref)}" class="rev-btn-sm">📚 Fiche complète</a>
      </div>
    </div>`:''}
  </div>`;
}

function indexAnswerLog(){
  if(_answerLogByRef) return _answerLogByRef;
  _answerLogByRef={};
  (answerLog.items||[]).forEach(it=>{
    if(!it.ref) return;
    _answerLogByRef[it.ref]=Math.max(_answerLogByRef[it.ref]||0,it.t||0);
  });
  return _answerLogByRef;
}

function getTopicFailTotal(data){
  return (data.idxs||[]).reduce((s,i)=>s+(revLog.entries?.[i]?.failCount||0),0);
}

function getTopicLastActivity(ref,data){
  let last=indexAnswerLog()[ref]||0;
  (data.idxs||[]).forEach(idx=>{
    const e=revLog.entries?.[idx];
    if(!e) return;
    last=Math.max(last,e.lastFail||0,e.lastStruggle||0,e.sm2?.last||0);
  });
  return last;
}

function computeFicheStats(allThemes){
  _answerLogByRef=null;
  indexAnswerLog();
  const modCounts={C:0,A:0,M:0,R:0},modStudied={C:0,A:0,M:0,R:0};
  let studied=0,totalErr=0;
  allThemes.forEach(([ref,data])=>{
    const m=data.module||'R';
    modCounts[m]=(modCounts[m]||0)+1;
    const la=getTopicLastActivity(ref,data);
    const ft=getTopicFailTotal(data);
    if(la){studied++;modStudied[m]=(modStudied[m]||0)+1;}
    totalErr+=ft;
  });
  return{total:allThemes.length,studied,totalErr,modCounts,modStudied};
}

function renderFichesDashboard(stats,nRev){
  return`<div class="fiches-dashboard">
    <div class="fiches-hero">
      <div class="fiches-hero-stat"><span class="fiches-hero-n">${stats.total}</span><span class="fiches-hero-l">Thèmes</span></div>
      <div class="fiches-hero-stat accent-green"><span class="fiches-hero-n">${stats.studied}</span><span class="fiches-hero-l">Étudiés</span></div>
      <div class="fiches-hero-stat accent-red"><span class="fiches-hero-n">${stats.totalErr}</span><span class="fiches-hero-l">Erreurs</span></div>
      <div class="fiches-hero-stat accent-amber"><span class="fiches-hero-n">${nRev||0}</span><span class="fiches-hero-l">À réviser</span></div>
    </div>
    <div class="fiches-mod-grid">
      ${MOD_ORDER.map(m=>{
        const tot=stats.modCounts[m]||0,st=stats.modStudied[m]||0;
        const pct=tot?Math.round(st/tot*100):0;
        return`<button type="button" class="fiches-mod-chip${ficheLibMod===m?' on':''}" data-fmod="${m}" style="--mod-accent:${MOD_ACCENT[m]}">
          <span class="fiches-mod-chip-ico">${MOD_ICON[m]}</span>
          <span class="fiches-mod-chip-body">
            <span class="fiches-mod-chip-name">${modStr(m)}</span>
            <span class="fiches-mod-chip-meta">${st}/${tot} étudiés</span>
          </span>
          <span class="fiches-mod-chip-bar" aria-hidden="true"><span style="width:${pct}%"></span></span>
        </button>`;
      }).join('')}
      <button type="button" class="fiches-mod-chip all${ficheLibMod==='all'?' on':''}" data-fmod="all">
        <span class="fiches-mod-chip-ico">📚</span>
        <span class="fiches-mod-chip-body">
          <span class="fiches-mod-chip-name">Toutes matières</span>
          <span class="fiches-mod-chip-meta">${stats.total} fiches</span>
        </span>
      </button>
    </div>
  </div>`;
}

function hydrateFicheCard(card){
  if(!card||card.dataset.lazy!=='1') return;
  const ref=card.dataset.ficheRef;
  const idx=parseInt(card.dataset.ficheIdx,10);
  const bd=card.querySelector('.fiche-card-bd');
  if(!bd||!ref||!Q[idx]) return;
  bd.innerHTML='<div class="fiche-lazy-load"><span class="fiche-lazy-spin"></span> Chargement…</div>';
  requestAnimationFrame(()=>{
    bd.innerHTML=renderTopicFicheHTML(ref,{sampleQ:Q[idx],entry:revLog.entries?.[idx],showFoot:true});
    card.dataset.lazy='0';
  });
}

function fmtFicheDate(ts){
  if(!ts) return 'Jamais étudié';
  const diff=Date.now()-ts;
  if(diff<86400000) return "Aujourd'hui";
  if(diff<172800000) return 'Hier';
  return new Date(ts).toLocaleDateString('fr-FR',{day:'numeric',month:'short',year:'numeric'});
}

function sortFicheThemeEntries(entries){
  if(ficheDateSort==='alpha') return entries.sort((a,b)=>a.ref.localeCompare(b.ref,'fr'));
  if(ficheDateSort==='errors') return entries.sort((a,b)=>b.failTotal-a.failTotal||b.lastAct-a.lastAct||a.ref.localeCompare(b.ref,'fr'));
  return entries.sort((a,b)=>b.lastAct-a.lastAct||a.ref.localeCompare(b.ref,'fr'));
}

function renderFichesByModule(allThemes){
  const qSearch=ficheLibSearch.toLowerCase();
  const byMod={};
  MOD_ORDER.forEach(m=>{byMod[m]=[]});
  allThemes.forEach(([ref,data])=>{
    if(ficheLibMod!=='all'&&data.module!==ficheLibMod) return;
    if(qSearch&&!ref.toLowerCase().includes(qSearch)&&!modStr(data.module).toLowerCase().includes(qSearch)) return;
    const lastAct=getTopicLastActivity(ref,data);
    const failTotal=getTopicFailTotal(data);
    const m=data.module;
    if(!byMod[m]) byMod[m]=[];
    byMod[m].push({ref,data,lastAct,failTotal});
  });
  const studiedCount=MOD_ORDER.reduce((n,m)=>n+byMod[m].filter(t=>t.lastAct>0).length,0);
  const visibleCount=MOD_ORDER.reduce((n,m)=>n+byMod[m].length,0);
  let html=`<div class="fiche-sticky-bar">
    <div class="fiche-search-wrap">
      <span class="fiche-search-ico" aria-hidden="true">🔍</span>
      <input type="search" class="fiche-lib-search" id="fiche-lib-search" placeholder="Rechercher un thème (VHF, ISA, METAR…)" value="${esc(ficheLibSearch)}" autocomplete="off">
    </div>
    <div class="fiche-bar-actions">
      <label class="fiche-sort-label">Trier
        <select id="fiche-date-sort" class="fiche-sort-select">
          <option value="recent"${ficheDateSort==='recent'?' selected':''}>Plus récent</option>
          <option value="errors"${ficheDateSort==='errors'?' selected':''}>Erreurs</option>
          <option value="alpha"${ficheDateSort==='alpha'?' selected':''}>A → Z</option>
        </select>
      </label>
      <button type="button" class="fiche-bar-btn" data-fiche-expand="all">Tout ouvrir</button>
      <button type="button" class="fiche-bar-btn" data-fiche-expand="none">Tout fermer</button>
    </div>
  </div>
  <div class="fiche-results-bar">
    <span>${visibleCount} fiche${visibleCount>1?'s':''} affichée${visibleCount>1?'s':''}</span>
    <span class="fiche-results-dot">·</span>
    <span>${studiedCount} avec activité</span>
  </div>`;
  let any=false;
  MOD_ORDER.forEach(m=>{
    const themes=sortFicheThemeEntries([...byMod[m]]);
    if(!themes.length) return;
    any=true;
    const studied=themes.filter(t=>t.lastAct>0).length;
    html+=`<section class="fiche-mod-group fiche-mod-group--${m.toLowerCase()}" data-module="${m}" style="--mod-accent:${MOD_ACCENT[m]}">
      <div class="fiche-mod-hd">
        <div class="fiche-mod-hd-left">
          <span class="fiche-mod-ico">${MOD_ICON[m]}</span>
          <div>
            <span class="fiche-mod-title">${modStr(m)}</span>
            <span class="fiche-mod-count">${themes.length} fiche${themes.length>1?'s':''}${studied?` · ${studied} étudiée${studied>1?'s':''}`:''}</span>
          </div>
        </div>
        <span class="bd ${modClass(m)}">${Math.round(studied/themes.length*100)||0}%</span>
      </div>
      <div class="fiche-mod-list">
        ${themes.map(t=>renderTopicFicheCard(t.ref,t.data,{lastAct:t.lastAct,failTotal:t.failTotal,openByDefault:t.lastAct>0||t.failTotal>0})).join('')}
      </div>
    </section>`;
  });
  return html+(any?'':'<div class="rev-empty fiche-empty"><span class="fiche-empty-ico">📂</span><p>Aucune fiche ne correspond à ta recherche.</p></div>');
}

function renderTopicFicheCard(ref,data,opts={}){
  const sampleIdx=data.idxs[0];
  const entry=revLog.entries?.[sampleIdx];
  const f=opts.f||buildTopicFiche(ref,Q[sampleIdx],entry,-1);
  if(!f) return '';
  const acc=f.topicStats.n?Math.round(f.topicStats.accuracy*100):0;
  const lastAct=opts.lastAct??getTopicLastActivity(ref,data);
  const failTotal=opts.failTotal??getTopicFailTotal(data);
  const isOpen=!!(opts.openByDefault||lastAct>0||failTotal>0);
  const openCls=isOpen?' open':'';
  const mCol=f.mastery.pct>=65?'var(--green)':f.mastery.pct>=40?'var(--amber)':'var(--red)';
  const mod=data.module||'R';
  const bodyHtml=isOpen?renderTopicFicheHTML(ref,{sampleQ:Q[sampleIdx],entry,showFoot:true,f}):'';
  return`<article class="fiche-card fiche-card--${mod.toLowerCase()}${openCls}${failTotal?' has-errors':''}" data-fiche-ref="${esc(ref)}" data-fiche-idx="${sampleIdx}" data-last-act="${lastAct}" data-lazy="${isOpen?'0':'1'}">
    <button type="button" class="fiche-card-hd" data-fiche-toggle="${esc(ref)}" aria-expanded="${isOpen?'true':'false'}">
      <div class="fiche-card-ring" style="--pct:${f.mastery.pct};--ring-col:${mCol}" title="Maîtrise ${f.mastery.pct}%"><span>${f.mastery.pct}%</span></div>
      <div class="fiche-card-hd-left">
        <div class="fiche-card-title-row">
          <h3 class="fiche-card-title">${esc(ref)}</h3>
          ${failTotal?`<span class="fiche-pill err">${failTotal} err.</span>`:''}
        </div>
        <div class="fiche-card-meta">
          <span class="fiche-date-badge${lastAct?'':' none'}">${fmtFicheDate(lastAct)}</span>
          <span class="fiche-meta-sep">·</span>
          <span>${data.idxs.length} q</span>
          <span class="fiche-meta-sep">·</span>
          <span class="fiche-acc${acc>=65?' good':acc>0&&acc<50?' bad':''}">${acc?acc+'% réussite':'Non testé'}</span>
        </div>
      </div>
      <span class="fiche-card-chevron" aria-hidden="true"></span>
    </button>
    <div class="fiche-card-bd">${bodyHtml}</div>
  </article>`;
}

function buildDeepFiche(q,entry,chosenIdx){
  const topic=initTopicKB()[q.r]||{expl:[],kw:{},idxs:[]};
  const traps=analyzeTraps(q,chosenIdx??-1);
  const mnemo=genMnemonic(q,topic);
  const mastery=computeMastery(entry,topic);
  const keyPoints=[...new Set(topic.expl)];
  const topKw=Object.entries(topic.kw).sort((a,b)=>b[1]-a[1]).slice(0,12).map(x=>x[0]);
  const formulaData=typeof getFormulasForQuestion==='function'?getFormulasForQuestion(q):{linked:[],module:[]};
  const worked=typeof buildWorkedExample==='function'?buildWorkedExample(q):null;
  const essentials=typeof getModuleEssentials==='function'?getModuleEssentials(q.m):[];
  return{traps,mnemo,mastery,keyPoints,topKw,relatedCount:topic.idxs.length,
    concept:'Notion examen PPL · '+modStr(q.m)+' · '+q.r,
    rule:q.e||'Voir explication ci-dessus',formulas:formulaData,worked,essentials};
}

function computeMastery(entry,topic){
  if(!entry) return {pct:0,level:'Novice',label:'Non maîtrisé'};
  let bayesP=0.4;
  if(topic&&topic.idxs?.length){
    const ans=topic.idxs.filter(i=>hist[i]!==undefined);
    const ok=ans.filter(i=>hist[i]).length;
    bayesP=bayesianRate(ok,ans.length,0.45,6);
  }
  const fails=entry.failCount||0,hes=entry.struggleCount||0,reps=entry.sm2?.reps||0;
  const okStreak=entry.okStreak||0;
  let pct=Math.round(clampProba(bayesP+reps*0.04+okStreak*0.03-fails*0.06-hes*0.03)*100);
  if(entry.lastOk===true&&fails===0) pct=Math.min(100,pct+5);
  const level=pct>=85?'Expert':pct>=65?'Confirmé':pct>=40?'Intermédiaire':pct>=20?'Débutant':'Novice';
  return{pct,level,label:level+' ('+pct+'%)'};
}

function updateSM2(entry,ok,struggle){
  entry.sm2=entry.sm2||{interval:1,ease:2.5,reps:0,last:Date.now()};
  const s=entry.sm2;
  s.last=Date.now();
  if(ok&&!struggle){
    s.reps++;
    entry.okStreak=(entry.okStreak||0)+1;
    if(s.reps===1) s.interval=1;
    else if(s.reps===2) s.interval=3;
    else s.interval=Math.round(s.interval*s.ease);
    s.ease=Math.min(3, s.ease+0.1);
  }else{
    s.reps=0; s.interval=1; s.ease=Math.max(1.3,s.ease-0.2);
    entry.okStreak=0;
  }
  entry.sm2=s;
  entry.due=Date.now()+s.interval*86400000;
}


function learnObjectives(q,beh,ok,entry,chosenIdx){
  const items=[];
  const f=buildDeepFiche(q,entry,chosenIdx);
  items.push(`<strong>Objectif :</strong> maîtriser « ${esc(q.r)} » (${modStr(q.m)}) — ${f.relatedCount} questions liées dans la banque`);
  if(q.e) items.push(`<strong>Règle :</strong> ${esc(q.e)}`);
  if(!ok) items.push(`<strong>Tu as répondu :</strong> ${chosenIdx>=0?esc(q.o[chosenIdx]):'—'} → <strong>Bonne réponse :</strong> ${esc(q.o[q.a])}`);
  if(entry&&(entry.failCount||0)>=2) items.push(`Erreur répétée ${entry.failCount}× — ce thème est un point faible prioritaire.`);
  if(beh){
    if(beh.hoverSwitches>=3) items.push('Comportement : hésitation marquée — élimine 2 options évidentes avant de choisir.');
    if(beh.wrongHoverCount>=2) items.push('Comportement : tu as exploré des pièges — étudie la section « Analyse des pièges » ci-dessous.');
    if(beh.vacillations>=2) items.push('Comportement : allers-retours entre options — note la règle sur papier avant de re-tenter.');
    if(!ok&&beh.reactionSec<1.5) items.push('Comportement : réponse trop rapide — minimum 5 s de lecture sur les questions difficiles.');
    if(!ok&&beh.decisionSec>15) items.push('Comportement : longue réflexion mais erreur — la notion n\'est pas acquise, relis les points clés.');
    if(beh.longestWrongIdx>=0&&beh.longestWrongIdx!==q.a) items.push(`Piège le plus attractif : option ${String.fromCharCode(65+beh.longestWrongIdx)} — ${esc(q.o[beh.longestWrongIdx])}`);
  }
  if(f.mnemo) items.push(`Mnémotechnique : ${esc(f.mnemo)}`);
  if(f.worked) items.push(`<strong>Calcul :</strong> ${f.worked.steps.slice(-1)[0]}`);
  if(f.formulas?.linked?.length) items.push(`<strong>Formules liées :</strong> ${f.formulas.linked.map(x=>esc(x.title)).join(' · ')}`);
  if(entry?.sm2) items.push(`Prochaine révision SM-2 : dans ${entry.sm2.interval} jour${entry.sm2.interval>1?'s':''}`);
  return items;
}

function trackRevision(ok,el,beh,idx,q){
  if(!revLog.entries) revLog.entries={};
  const e=revLog.entries[idx]||{failCount:0,struggleCount:0,tags:[],wrongChoices:{}};
  const struggle=isStruggle(ok,beh);
  if(!ok){
    e.failCount=(e.failCount||0)+1;e.lastFail=Date.now();
    if(beh&&beh.chosenIdx>=0){
      e.wrongChoices=e.wrongChoices||{};
      e.wrongChoices[beh.chosenIdx]=(e.wrongChoices[beh.chosenIdx]||0)+1;
      e.lastWrongChoice=beh.chosenIdx;
    }
  }
  if(struggle){e.struggleCount=(e.struggleCount||0)+1;e.lastStruggle=Date.now();}
  if(beh){
    const reactRes=reactionEngine(ok,q.d,beh);
    const {tags}=behaviorFactor(ok,q.d,beh);
    [...(reactRes.tags||[]),...(tags||[])].forEach(t=>{if(!e.tags.includes(t))e.tags.push(t);});
    e.lastBeh={hoverSwitches:beh.hoverSwitches,wrongHoverCount:beh.wrongHoverCount,reactionSec:beh.reactionSec,vacillations:beh.vacillations,chosenIdx:beh.chosenIdx,longestWrongIdx:beh.longestWrongIdx};
  }
  e.lastOk=ok;e.lastEl=el;
  updateSM2(e,ok,struggle);
  e.attempts=(e.attempts||0)+1;
  revLog.entries[idx]=e;
  saveRev();
}

function revItems(){
  const items=[]; const seen=new Set();
  weak.forEach(idx=>{
    if(seen.has(idx)) return; seen.add(idx);
    const q=Q[idx]; if(!q) return;
    const e=revLog.entries[idx]||{failCount:1,struggleCount:0,tags:[]};
    items.push({idx,q,e,priority:computePriority(idx,e,q)});
  });
  Object.keys(revLog.entries).forEach(k=>{
    const idx=parseInt(k,10);
    if(seen.has(idx)||isNaN(idx)) return;
    const e=revLog.entries[idx];
    if(!e||((e.failCount||0)===0&&(e.struggleCount||0)===0)) return;
    const q=Q[idx]; if(!q) return;
    seen.add(idx);
    items.push({idx,q,e,priority:computePriority(idx,e,q)});
  });
  return items.sort((a,b)=>b.priority-a.priority);
}

function computePriority(idx,e,q){
  let p=(e.failCount||0)*12+(e.struggleCount||0)*5;
  if(hist[idx]===false) p+=8;
  if(e.due&&e.due<=Date.now()) p+=15;
  if(q.d>=3) p+=4;
  const ts=getTopicStats(q.r);
  if(ts.accuracy<0.5&&ts.n>=2) p+=10;
  return p;
}

function getStudyPlan(){
  const items=revItems();
  const due=items.filter(i=>i.e.due&&i.e.due<=Date.now()+86400000).slice(0,8);
  const weakTopics={};
  items.forEach(i=>{
    const r=i.q.r;
    if(!weakTopics[r]) weakTopics[r]={ref:r,count:0,fails:0,module:i.q.m};
    weakTopics[r].count++; weakTopics[r].fails+=(i.e.failCount||0);
  });
  const topThemes=Object.values(weakTopics).sort((a,b)=>(b.fails*10+b.count)-(a.fails*10+a.count)).slice(0,5);
  return{due,topThemes,total:items.length};
}

function renderRevCard(item,priority,expanded){
  const {idx,q,e}=item;
  const chosenIdx=e.lastWrongChoice??e.lastBeh?.chosenIdx??-1;
  const learn=learnObjectives(q,e.lastBeh?{...e.lastBeh,hoveredWrongMs:0,wrongDwellRatio:0}:null,e.lastOk===false,e,chosenIdx);
  const errN=e.failCount||0,hesN=e.struggleCount||0;
  const mastery=computeMastery(e,initTopicKB()[q.r]);
  const mCol=mastery.pct>=65?'var(--green)':mastery.pct>=40?'var(--amber)':'var(--red)';
  return`<article class="rev-card${priority?' priority':''}${expanded?' open':''}" data-rev-idx="${idx}">
    <div class="rev-card-hd">
      <span class="bd ${modClass(q.m)}">${modStr(q.m)}</span>
      <span class="bd ${diffClass(q.d)}">${diffStr(q.d)}</span>
      ${errN?`<span class="rev-badge err">${errN} err.</span>`:''}
      ${hesN?`<span class="rev-badge hes">${hesN} hésit.</span>`:''}
      <span class="rev-badge" style="color:${mCol}">${mastery.level}</span>
      ${(e.tags||[]).slice(0,2).map(t=>`<span class="rev-badge">${esc(t)}</span>`).join('')}
    </div>
    <div class="rev-topic">📌 ${esc(q.r)}</div>
    <p class="rev-q">${esc(q.q)}</p>
    <div class="rev-meta">Priorité ${item.priority} · ${e.attempts||1} tentative${(e.attempts||1)>1?'s':''}${e.due&&e.due<=Date.now()?' · <span style="color:var(--amber)">à réviser aujourd\'hui</span>':''}</div>
    <div class="rev-learn">
      <strong>Plan d'apprentissage</strong>
      <ul>${learn.map(li=>`<li>${li}</li>`).join('')}</ul>
      <div class="rev-ans">✓ ${esc(q.o[q.a])}</div>
    </div>
    ${renderTopicFicheHTML(q.r,{sampleQ:q,entry:e,chosenIdx,compact:true,showFoot:false})}
    <div class="rev-actions">
      <button type="button" class="rev-btn-sm primary" data-rev-action="one" data-idx="${idx}">Refaire</button>
      <button type="button" class="rev-btn-sm" data-rev-action="topic" data-ref="${esc(q.r)}">Thème (${initTopicKB()[q.r]?.idxs.length||'?'}q)</button>
      <button type="button" class="rev-btn-sm" data-rev-toggle="${idx}">${expanded?'Réduire':'Fiche complète ▾'}</button>
    </div>
  </article>`;
}


function buildFichesPanel(){
  initTopicKB();
  const panel=document.getElementById('rev-panel');
  const searchEl=document.getElementById('fiche-lib-search');
  const hadFocus=document.activeElement===searchEl;
  const selStart=searchEl?.selectionStart;
  const btnAll=document.getElementById('btn-rev-all');
  const items=revItems();
  const errItems=items.filter(i=>(i.e.failCount||0)>0);
  const hesItems=items.filter(i=>(i.e.struggleCount||0)>0);
  const nRev=items.length;
  const plan=getStudyPlan();
  const kb=initTopicKB();
  const allThemes=Object.entries(kb).sort((a,b)=>a[0].localeCompare(b[0],'fr'));
  const ficheStats=computeFicheStats(allThemes);

  if(btnAll){btnAll.hidden=nRev===0;btnAll.textContent=nRev?`📚 Réviser mes ${nRev} points faibles`:'';}

  const byTheme={};
  items.forEach(it=>{
    const r=it.q.r||'Autre';
    if(!byTheme[r]) byTheme[r]={items:[],fails:0,hes:0,module:it.q.m};
    byTheme[r].items.push(it); byTheme[r].fails+=(it.e.failCount||0); byTheme[r].hes+=(it.e.struggleCount||0);
  });
  const themes=Object.entries(byTheme).sort((a,b)=>(b[1].fails*10+b[1].hes)-(a[1].fails*10+a[1].hes));

  let listHtml='';
  if(revTab==='library'){
    const qSearch=ficheLibSearch.toLowerCase();
    const filteredThemes=allThemes.filter(([ref,data])=>{
      if(ficheLibMod!=='all'&&data.module!==ficheLibMod) return false;
      if(!qSearch) return true;
      return ref.toLowerCase().includes(qSearch)||modStr(data.module).toLowerCase().includes(qSearch);
    });
    listHtml=`
      <div class="fiche-sticky-bar">
        <div class="fiche-search-wrap">
          <span class="fiche-search-ico" aria-hidden="true">🔍</span>
          <input type="search" class="fiche-lib-search" id="fiche-lib-search" placeholder="Rechercher dans la bibliothèque…" value="${esc(ficheLibSearch)}" autocomplete="off">
        </div>
        <div class="fiche-bar-actions">
          <button type="button" class="fiche-bar-btn" data-fiche-expand="all">Tout ouvrir</button>
          <button type="button" class="fiche-bar-btn" data-fiche-expand="none">Tout fermer</button>
        </div>
      </div>
      <div class="fiche-results-bar"><span>${filteredThemes.length} thème${filteredThemes.length>1?'s':''}</span></div>
      ${filteredThemes.length?filteredThemes.map(([ref,data])=>renderTopicFicheCard(ref,data)).join('')
        :`<div class="rev-empty fiche-empty"><span class="fiche-empty-ico">🔎</span><p>Aucun thème trouvé.</p></div>`}`;
  }else if(revTab==='priority'){
    listHtml=nRev?items.slice(0,15).map((it,i)=>renderRevCard(it,i<5,false)).join(''):`<div class="rev-empty">Aucune priorité — consulte la <strong>Bibliothèque</strong> ou lance un quiz.</div>`;
  }else if(revTab==='errors'){
    listHtml=(errItems.length?errItems:items).map(it=>renderRevCard(it,false,false)).join('')||`<div class="rev-empty">Aucune erreur enregistrée.</div>`;
  }else if(revTab==='hesitations'){
    listHtml=(hesItems.length?hesItems:items).map(it=>renderRevCard(it,false,false)).join('')||`<div class="rev-empty">Aucune hésitation enregistrée.</div>`;
  }else if(revTab==='plan'){
    listHtml=`<div class="fiche-deep" style="margin-bottom:8px">
      <div class="fiche-sec-hd">Révisions dues (SM-2)</div>
      ${plan.due.length?plan.due.map(it=>`<div class="study-plan-item"><span class="study-plan-dot" style="background:var(--amber)"></span><div class="study-plan-txt"><strong>${esc(it.q.r)}</strong> — ${esc(it.q.q.substring(0,80))}…<br><span style="font-size:10px;color:var(--t3)">${it.e.failCount||0} err. · priorité ${it.priority}</span></div></div>`).join(''):'<div style="font-size:12px;color:var(--t3)">Aucune révision due aujourd\'hui — continue l\'entraînement.</div>'}
      <div class="fiche-sec-hd" style="margin-top:.75rem">Thèmes à attaquer en priorité</div>
      ${plan.topThemes.map(t=>`<div class="study-plan-item"><span class="study-plan-dot" style="background:var(--red)"></span><div class="study-plan-txt"><strong>${esc(t.ref)}</strong> (${modStr(t.module)}) — ${t.count} question${t.count>1?'s':''} · ${t.fails} erreur${t.fails>1?'s':''}<br><button type="button" class="rev-btn-sm primary" style="margin-top:4px" data-rev-action="topic" data-ref="${esc(t.ref)}">Plan de révision ciblé</button></div></div>`).join('')}
    </div>`;
  }else if(revTab==='fiches'){
    listHtml=renderFichesByModule(allThemes);
  }else if(revTab==='sessions'){
    listHtml=typeof PPLSessionFiches!=='undefined'?PPLSessionFiches.renderTab():'<div class="rev-empty">Chargement…</div>';
  }else{
    listHtml=themes.map(([ref,data])=>`
      <div class="rev-theme">
        <button type="button" class="rev-theme-hd" data-rev-action="topic" data-ref="${esc(ref)}">
          <span>📂 ${esc(ref)}</span><span>${data.items.length} q · ${data.fails} err. · ${modStr(data.module)}</span>
        </button>
        <div class="rev-theme-bd">${data.items.slice(0,4).map(it=>renderRevCard(it,false,false)).join('')}
          ${data.items.length>4?`<button type="button" class="rev-btn-sm primary" style="margin-top:6px" data-rev-action="topic" data-ref="${esc(ref)}">Tout réviser (${data.items.length})</button>`:''}
        </div></div>`).join('')||`<div class="rev-empty">Aucun thème en révision — consulte la Bibliothèque.</div>`;
  }

  const sessionCount=typeof PPLSessionFiches!=='undefined'?PPLSessionFiches.count():0;

  panel.innerHTML=`
    ${renderFichesDashboard(ficheStats,nRev)}
    <div class="fiche-tabs-wrap">
      <div class="rev-tabs fiche-tabs-inner">
        <button type="button" class="rev-tab${revTab==='fiches'?' on':''}" data-rev-tab="fiches"><span class="rev-tab-ico">📂</span> Par matière</button>
        <button type="button" class="rev-tab${revTab==='sessions'?' on':''}" data-rev-tab="sessions"><span class="rev-tab-ico">📋</span> Fin de session${sessionCount?` <em>${sessionCount}</em>`:''}</button>
        <button type="button" class="rev-tab${revTab==='library'?' on':''}" data-rev-tab="library"><span class="rev-tab-ico">📚</span> Bibliothèque</button>
        <button type="button" class="rev-tab${revTab==='priority'?' on':''}" data-rev-tab="priority"><span class="rev-tab-ico">⚡</span> Priorités</button>
        <button type="button" class="rev-tab${revTab==='plan'?' on':''}" data-rev-tab="plan"><span class="rev-tab-ico">📅</span> SM-2</button>
        <button type="button" class="rev-tab${revTab==='errors'?' on':''}" data-rev-tab="errors"><span class="rev-tab-ico">✕</span> Erreurs${errItems.length?` <em>${errItems.length}</em>`:''}</button>
        <button type="button" class="rev-tab${revTab==='hesitations'?' on':''}" data-rev-tab="hesitations"><span class="rev-tab-ico">?</span> Hésitations</button>
        <button type="button" class="rev-tab${revTab==='themes'?' on':''}" data-rev-tab="themes"><span class="rev-tab-ico">🏷</span> Par thème</button>
      </div>
    </div>
    <div class="rev-list tall">${listHtml}</div>`;

  if(hadFocus){
    const newSearch=document.getElementById('fiche-lib-search');
    if(newSearch){
      newSearch.focus();
      if(selStart!=null) newSearch.setSelectionRange(selStart,selStart);
    }
  }
}


function renderFicheFormulasSection(formulas,worked,essentials,m){
  const linked=formulas?.linked||[];
  const moduleAll=formulas?.module||[];
  if(!worked&&!linked.length&&!(essentials?.length)&&!moduleAll.length) return '';
  let html='';
  if(worked){
    html+=`<div class="fiche-sec"><div class="fiche-sec-hd">Calcul pas à pas — ${esc(worked.title)}</div>
      <div class="fiche-steps"><ol>${worked.steps.map(s=>`<li>${esc(s)}</li>`).join('')}</ol>
      ${worked.result?`<div style="font-size:12px;color:var(--acc);margin-top:6px;font-weight:600;font-family:'DM Mono',monospace">→ ${esc(worked.result)}</div>`:''}
      </div></div>`;
  }
  if(linked.length){
    html+=`<div class="fiche-sec"><div class="fiche-sec-hd">Formules liées au thème (${linked.length})</div><div class="fiche-sec-bd">${linked.map(f=>renderFicheFormulaBlock(f,false)).join('')}</div></div>`;
  }
  if(essentials?.length){
    html+=`<div class="fiche-sec"><div class="fiche-sec-hd">Constantes & rappels — ${modStr(m)}</div><div class="fiche-const-grid">${essentials.map(e=>`<div class="fiche-const"><strong>${esc(e.k)}</strong> ${esc(e.v)}</div>`).join('')}</div></div>`;
  }
  const linkedIds=new Set(linked.map(f=>f.id));
  const rest=moduleAll.filter(f=>!linkedIds.has(f.id));
  const restFull=rest.filter(f=>(f.prio||0)>=2||(f.tags||[]).includes('examen')).slice(0,8);
  const restCompact=rest.filter(f=>!restFull.some(x=>x.id===f.id));
  if(restFull.length){
    html+=`<div class="fiche-sec"><div class="fiche-sec-hd">Formules essentielles ${modStr(m)} (${restFull.length})</div><div class="fiche-sec-bd">${restFull.map(f=>renderFicheFormulaBlock(f,false)).join('')}</div></div>`;
  }
  if(restCompact.length){
    html+=`<div class="fiche-sec"><div class="fiche-sec-hd">Autres formules ${modStr(m)} (${restCompact.length})</div><div class="fiche-sec-bd fiche-formulas-compact">${restCompact.map(f=>renderFicheFormulaBlock(f,true)).join('')}</div></div>`;
  }
  return html;
}



let revTab='fiches', ficheLibSearch='', ficheLibMod='all', ficheDateSort='recent';

function goQuizTopic(ref){window.location.href='index.html?topic='+encodeURIComponent(ref);}
function launchTopicReview(ref){ goQuizTopic(ref); }
function launchRevision(){
  window.location.href='index.html?mode=weak';
}
function launchSingleQuestion(idx){
  window.location.href='index.html?q='+idx;
}

const revPanel=document.getElementById('rev-panel');
revPanel.addEventListener('click',e=>{
  const tab=e.target.closest('[data-rev-tab]');
  if(tab){revTab=tab.dataset.revTab;buildFichesPanel();return;}
  const fmod=e.target.closest('[data-fmod]');
  if(fmod){ficheLibMod=fmod.dataset.fmod;buildFichesPanel();return;}
  const sessionClear=e.target.closest('[data-session-clear]');
  if(sessionClear){
    if(confirm('Effacer toutes les fiches de fin de session enregistrées ?')){
      if(typeof PPLSessionFiches!=='undefined') PPLSessionFiches.clear();
      buildFichesPanel();
    }
    return;
  }
  const expandBtn=e.target.closest('[data-fiche-expand]');
  if(expandBtn){
    const mode=expandBtn.dataset.ficheExpand;
    revPanel.querySelectorAll('.fiche-card').forEach(card=>{
      const hd=card.querySelector('.fiche-card-hd');
      if(mode==='all'){
        card.classList.add('open');
        if(hd) hd.setAttribute('aria-expanded','true');
        hydrateFicheCard(card);
      }else{
        card.classList.remove('open');
        if(hd) hd.setAttribute('aria-expanded','false');
      }
    });
    return;
  }
  const ficheToggle=e.target.closest('[data-fiche-toggle]');
  if(ficheToggle){
    const card=ficheToggle.closest('.fiche-card');
    if(!card) return;
    const open=card.classList.toggle('open');
    ficheToggle.setAttribute('aria-expanded',open?'true':'false');
    if(open) hydrateFicheCard(card);
    return;
  }
  const toggle=e.target.closest('[data-rev-toggle]');
  if(toggle){
    const card=toggle.closest('.rev-card');
    if(card) card.classList.toggle('open');
    toggle.textContent=card?.classList.contains('open')?'Réduire ▴':'Fiche complète ▾';
    return;
  }
  const btn=e.target.closest('[data-rev-action]');
  if(!btn) return;
  if(btn.dataset.revAction==='topic') launchTopicReview(btn.dataset.ref);
  else if(btn.dataset.revAction==='one') launchSingleQuestion(parseInt(btn.dataset.idx,10));
  else if(btn.dataset.revAction==='all') launchRevision();
});
revPanel.addEventListener('input',e=>{
  if(e.target.id==='fiche-lib-search'){
    ficheLibSearch=e.target.value;
    clearTimeout(_ficheSearchTimer);
    _ficheSearchTimer=setTimeout(()=>buildFichesPanel(),260);
    return;
  }
  handleFormulaCalcInput(e);
});
revPanel.addEventListener('change',e=>{
  if(e.target.id==='fiche-date-sort'){ficheDateSort=e.target.value;buildFichesPanel();}
});
document.addEventListener('input',e=>{if(e.target.closest('[data-calc-type]')) handleFormulaCalcInput(e);});
function handleFicheDeepLink(){
  const params=new URLSearchParams(location.search);
  const topic=params.get('topic');
  const session=params.get('session');
  if(session!=null) revTab='sessions';
  if(!topic){
    if(session!=null) buildFichesPanel();
    return;
  }
  revTab='fiches';
  ficheLibSearch=topic;
  buildFichesPanel();
  setTimeout(()=>{
    const card=document.querySelector('[data-fiche-ref="'+CSS.escape(topic)+'"]')||document.querySelector('.fiche-card');
    if(card){
      card.classList.add('open');
      const hd=card.querySelector('.fiche-card-hd');
      if(hd) hd.setAttribute('aria-expanded','true');
      hydrateFicheCard(card);
      card.scrollIntoView({behavior:'smooth',block:'start'});
    }
  },120);
}
const btnAll=document.getElementById('btn-rev-all');
if(btnAll) btnAll.addEventListener('click', launchRevision);
buildFichesPanel();
handleFicheDeepLink();
