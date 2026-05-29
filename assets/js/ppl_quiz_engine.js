// ═══════════════════════════════════════════════════════
// MOTEUR PROBABILITÉ AVANCÉ + TRACKING COMPORTEMENTAL
// ═══════════════════════════════════════════════════════
let TOPIC_KB=null;
const STOP_WORDS=new Set('le la les un une des du de et en est sont pour par sur avec dans que qui dont cette ce ces leur leurs aux au ou si ne pas plus très tout tous toute'.split(' '));

const QBehavior={
  reset(){
    this.t0=Date.now();this.firstInteract=null;this.lastX=null;this.lastY=null;
    this.dist=0;this.moves=0;this.hovers={};this.currentHover=null;this.hoverSwitches=0;
    this.lastEvt=this.t0;this.idleMs=0;this.scrollCount=0;this.handlers=[];
    this.velSamples=[];this.vacillations=0;this.lastHoverLeave=null;this.prevHover=null;
    this.blurCount=0;this._blurAt=null;this.optsEnter=null;this.maxVel=0;this.pathDirect=0;this._moveThrottle=0;
    this._onMove=(e)=>{
      const now=Date.now();
      if(now-this._moveThrottle<50) return;
      this._moveThrottle=now;
      if(this.lastX!=null){
        const dx=e.clientX-this.lastX,dy=e.clientY-this.lastY,d=Math.hypot(dx,dy);
        this.dist+=d;
        const dt=Math.max(1,now-this.lastEvt);
        const v=d/dt*1000;
        if(v>this.maxVel) this.maxVel=v;
        if(this.velSamples.length<80) this.velSamples.push(v);
      }
      this.lastX=e.clientX;this.lastY=e.clientY;
      if(now-this.lastEvt>35){
        this.moves++;
        this.lastEvt=now;
      }
    };
    this._onScroll=()=>{this.scrollCount++;};
    this._onVis=()=>{
      if(document.hidden){this.blurCount++;this._blurAt=Date.now();}
      else if(this._blurAt){this.idleMs+=Date.now()-this._blurAt;this._blurAt=null;}
    };
  },
  attach(){
    const fine=window.matchMedia('(pointer: fine)').matches;
    if(fine) document.addEventListener('mousemove',this._onMove,{passive:true});
    window.addEventListener('scroll',this._onScroll,{passive:true});
    document.addEventListener('visibilitychange',this._onVis);
    document.querySelectorAll('.opt').forEach((el,i)=>{
      const enter=()=>this.hoverEnter(i);
      const leave=()=>this.hoverLeave(i);
      el.addEventListener('mouseenter',enter);
      el.addEventListener('mouseleave',leave);
      el.addEventListener('touchstart',enter,{passive:true});
      this.handlers.push({el,enter,leave});
    });
    const qtext=document.querySelector('.qtext');
    if(qtext) qtext.addEventListener('mouseenter',()=>{if(!this.optsEnter&&!this.firstInteract) this.readingStart=Date.now();},{once:true});
  },
  detach(){
    document.removeEventListener('mousemove',this._onMove);
    window.removeEventListener('scroll',this._onScroll);
    document.removeEventListener('visibilitychange',this._onVis);
    this.handlers.forEach(({el,enter,leave})=>{
      el.removeEventListener('mouseenter',enter);
      el.removeEventListener('mouseleave',leave);
    });
    this.handlers=[];
    if(this.currentHover!=null) this.hoverLeave(this.currentHover);
  },
  hoverEnter(i){
    const now=Date.now();
    if(!this.optsEnter) this.optsEnter=now;
    if(this.currentHover!=null&&this.currentHover!==i) this.hoverSwitches++;
    if(this.prevHover===i&&this.lastHoverLeave&&now-this.lastHoverLeave<800) this.vacillations++;
    this.currentHover=i;
    if(!this.hovers[i]) this.hovers[i]={ms:0,enter:now,visits:1};
    else{this.hovers[i].enter=now;this.hovers[i].visits++;}
  },
  hoverLeave(i){
    const h=this.hovers[i];
    if(h&&h.enter){h.ms+=(Date.now()-h.enter);h.enter=null;}
    if(this.currentHover===i){this.prevHover=i;this.lastHoverLeave=Date.now();this.currentHover=null;}
  },
  snapshot(chosenIdx,correctIdx){
    this.detach();
    const now=Date.now();
    if(this.currentHover!=null) this.hoverLeave(this.currentHover);
    const totalMs=now-this.t0;
    const clickMs=totalMs;
    const optsMs=this.optsEnter?(this.optsEnter-this.t0):null;
    const readMs=optsMs!=null?optsMs:Math.round(clickMs*0.65);
    const reactionMs=optsMs!=null?(now-this.optsEnter):clickMs;
    let decisionMs=reactionMs;
    if(chosenIdx>=0){
      const h=this.hovers[chosenIdx];
      if(h){
        const dwell=h.ms+(h.enter?now-h.enter:0);
        if(dwell>0) decisionMs=dwell;
      }
    }
    let wrongHoverCount=0,hoveredWrongMs=0,dwellChosen=0,maxWrongDwell=0,longestWrongIdx=-1;
    const dwellPerOpt={};
    Object.entries(this.hovers).forEach(([idx,h])=>{
      const ms=h.ms+(h.enter?now-h.enter:0);
      const i=parseInt(idx,10);
      dwellPerOpt[i]=ms;
      if(i===chosenIdx) dwellChosen=ms;
      if(i!==correctIdx){
        wrongHoverCount++;
        hoveredWrongMs+=ms;
        if(ms>maxWrongDwell){maxWrongDwell=ms;longestWrongIdx=i;}
      }
    });
    const activeMs=Math.max(1,totalMs-this.idleMs);
    const avgVel=this.velSamples.length?this.velSamples.reduce((a,b)=>a+b,0)/this.velSamples.length:0;
    const velStd=this.velSamples.length>1?Math.sqrt(this.velSamples.reduce((s,v)=>s+(v-avgVel)**2,0)/this.velSamples.length):0;
    const totalDwell=Object.values(dwellPerOpt).reduce((a,b)=>a+b,0)||1;
    const wrongDwellRatio=hoveredWrongMs/totalDwell;
    return{
      chosenIdx,correctIdx,
      totalMs,totalSec:clickMs/1000,
      chooseMs:reactionMs,chooseSec:reactionMs/1000,
      reactionMs:clickMs,reactionSec:clickMs/1000,
      decisionMs,decisionSec:decisionMs/1000,readMs,readSec:readMs/1000,
      moveDist:Math.round(this.dist),moveCount:this.moves,
      hoverSwitches:this.hoverSwitches,wrongHoverCount,hoveredWrongMs,
      dwellChosen,dwellPerOpt,scrollCount:this.scrollCount,
      jitter:this.moves>0?this.dist/this.moves:0,
      idleRatio:Math.min(1,this.idleMs/activeMs),
      vacillations:this.vacillations,blurCount:this.blurCount,
      maxVel:Math.round(this.maxVel),avgVel:Math.round(avgVel),velStd:Math.round(velStd),
      wrongDwellRatio,maxWrongDwell,longestWrongIdx,
      pathEfficiency:this.dist>0?Math.min(1,300/this.dist):1,
      decisiveness:dwellChosen/Math.max(1,totalDwell)
    };
  }
};

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

function getModuleAccuracy(m){
  let ok=0,t=0;
  Object.keys(hist).forEach(k=>{
    const i=parseInt(k,10),q=Q[i];
    if(!q||q.m!==m) return;
    t++; if(hist[i]) ok++;
  });
  return t?ok/t:0.5;
}

function bayesianRate(ok,n,priorOk=0.5,priorN=4){
  if(n<=0) return priorOk;
  const a=priorOk*priorN+ok, b=(1-priorOk)*priorN+(n-ok);
  return a/(a+b);
}

/* ── Modèle probabiliste examen PPL (64Q · 75%/épreuve) ── */
const EXAM_PRIOR={mean:0.62,n:8};
const EXAM_PASS_THRESHOLD=0.75;
const EXAM_MIN_ANSWERS_GLOBAL=20;
const EXAM_MIN_ANSWERS_MODULE=5;

function estimateModuleSkill(ok,t,globalRate,gs){
  const raw=t>0?ok/t:(globalRate??EXAM_PRIOR.mean);
  const bayes=bayesianRate(ok,t,EXAM_PRIOR.mean,EXAM_PRIOR.n);
  const wBayes=t>0?bayesianRate(Math.round((gs?.wRate??raw)*t)||ok,t,EXAM_PRIOR.mean,EXAM_PRIOR.n):(globalRate??EXAM_PRIOR.mean);
  const trust=Math.min(1,t/18);
  const globalMix=globalRate??EXAM_PRIOR.mean;
  let pEst;
  if(t>=EXAM_MIN_ANSWERS_MODULE){
    pEst=trust*(0.5*bayes+0.5*wBayes)+(1-trust)*globalMix;
  }else if(t>0){
    const blend=t/EXAM_MIN_ANSWERS_MODULE;
    pEst=blend*(0.55*bayes+0.45*raw)+(1-blend)*globalMix;
  }else{
    pEst=globalMix;
  }
  if(gs?.reactAvg!=null&&gs.reactAvg>0){
    pEst=clampProba(pEst+(gs.reactAvg-52)/380);
  }
  const {adj}=moduleExamAdjustments(gs||{weakN:0,fails:0,hes:0,sm2Due:0,hardGap:0,trend:{delta:0},reactAvg:null,sm2Reps:0,byDiff:{3:{t:0},4:{t:0}}});
  return clampProba(pEst+adj);
}

function modulePassProb(ok,t,nExam,globalRate,gs){
  const pSkill=estimateModuleSkill(ok,t,globalRate,gs);
  const strict=binomialPassProb(nExam,pSkill);
  if(t<3) return strict;
  const rate=ok/t;
  const margin=rate-EXAM_PASS_THRESHOLD;
  const direct=margin>=0
    ?Math.min(0.97,0.58+margin*2.8)
    :Math.max(0.18,0.52+margin*1.9);
  return Math.min(0.98,Math.max(0.10,0.20*strict+0.80*direct));
}

function comb(n,k){
  if(k<0||k>n) return 0;
  k=Math.min(k,n-k);
  let r=1;
  for(let i=1;i<=k;i++) r=r*(n-k+i)/i;
  return r;
}

function binomPMF(n,k,p){
  if(k<0||k>n||p<=0||p>=1) return k===0&&p<=0?1:(k===n&&p>=1?1:0);
  return comb(n,k)*Math.pow(p,k)*Math.pow(1-p,n-k);
}

function binomialPassProb(n,p,threshold=EXAM_PASS_THRESHOLD){
  if(n<=0) return 0;
  const kMin=Math.ceil(threshold*n);
  let sum=0;
  for(let k=kMin;k<=n;k++) sum+=binomPMF(n,k,p);
  return Math.min(0.999,Math.max(0.001,sum));
}

function wilsonInterval(ok,n,z=1.96){
  if(n<=0) return {low:EXAM_PRIOR.mean-0.18,high:EXAM_PRIOR.mean+0.18};
  const phat=ok/n;
  const z2=z*z;
  const denom=1+z2/n;
  const center=(phat+z2/(2*n))/denom;
  const margin=z*Math.sqrt((phat*(1-phat)+z2/(4*n))/n)/denom;
  return {low:Math.max(0.02,center-margin),high:Math.min(0.98,center+margin)};
}

function clampProba(p){return Math.min(0.97,Math.max(0.03,p));}

const DIFF_WEIGHT={1:0.85,2:1,3:1.15,4:1.3};

let _modBankCounts=null;
function getModBankCounts(){
  if(_modBankCounts) return _modBankCounts;
  if(typeof Q_BANK_META!=='undefined'&&Q_BANK_META.counts){
    _modBankCounts={C:Q_BANK_META.counts.C||0,A:Q_BANK_META.counts.A||0,M:Q_BANK_META.counts.M||0,R:Q_BANK_META.counts.R||0};
    return _modBankCounts;
  }
  _modBankCounts={C:0,A:0,M:0,R:0};
  if(typeof Q!=='undefined'&&Array.isArray(Q)) Q.forEach(q=>{if(_modBankCounts[q.m]!=null)_modBankCounts[q.m]++;});
  return _modBankCounts;
}
function modBankCount(m){return getModBankCounts()[m]||0;}

let _globalStatsCache=null;
let _revItemsCache=null;
let _familySizeMap=null;
let _examSimCache=null;

function invalidateExamCache(){
  _examSimCache=null;
  _globalStatsCache=null;
  _revItemsCache=null;
}

function moduleReactAvg(m,limit=80){
  const ans=(answerLog.items||[]).filter(h=>h.mod===m).slice(-limit);
  if(ans.length) return Math.round(ans.reduce((s,h)=>s+reactScoreFromLogItem(h),0)/ans.length);
  const legacy=(reactLog.history||[]).filter(h=>h.m===m).slice(-limit);
  if(!legacy.length) return null;
  return Math.round(legacy.reduce((s,h)=>s+reactScoreFromLogItem({
    ok:h.ok,diff:h.diff,el:h.totalSec||h.el,readSec:h.readSec,
    chooseSec:h.chooseSec,reactSec:h.reactSec,decideSec:h.decideSec
  }),0)/legacy.length);
}
function getDifficultyStats(m){
  const d={1:{ok:0,t:0},2:{ok:0,t:0},3:{ok:0,t:0},4:{ok:0,t:0}};
  Object.keys(hist).forEach(k=>{
    const i=+k,q=Q[i];
    if(!q||q.d<1||q.d>4) return;
    if(m&&q.m!==m) return;
    d[q.d].t++; if(hist[i]) d[q.d].ok++;
  });
  return d;
}

function getRecentTrend(m,limit=40){
  const rows=(reactLog.history||[]).filter(h=>!m||h.m===m).slice(-limit);
  if(rows.length<4) return {rate:null,n:rows.length,delta:0};
  const half=Math.floor(rows.length/2);
  const early=rows.slice(0,half),late=rows.slice(half);
  const r1=early.filter(x=>x.ok).length/(early.length||1);
  const r2=late.filter(x=>x.ok).length/(late.length||1);
  return {rate:r2,n:rows.length,delta:r2-r1};
}

function collectGlobalStats(){
  if(_globalStatsCache) return _globalStatsCache;
  const bankCounts=getModBankCounts();
  const revList=revItems();
  const weakByMod={C:0,A:0,M:0,R:0};
  revList.forEach(i=>{if(weakByMod[i.q.m]!=null)weakByMod[i.q.m]++;});
  const mods={};
  let totalOk=0,totalT=0,wOk=0,wT=0;
  let totalFails=0,totalHes=0,sm2Due=0,sm2Mastered=0;
  const byDiffAll={1:{ok:0,t:0},2:{ok:0,t:0},3:{ok:0,t:0},4:{ok:0,t:0}};
  MOD_ORDER.forEach(m=>{
    mods[m]={ok:0,t:0,mwOk:0,mwT:0,fails:0,hes:0,due:0,reps:0,
      byDiff:{1:{ok:0,t:0},2:{ok:0,t:0},3:{ok:0,t:0},4:{ok:0,t:0}},
      bankN:bankCounts[m]||0,weakN:weakByMod[m]||0};
  });
  Object.keys(hist).forEach(k=>{
    const i=+k,q=Q[i];
    if(!q) return;
    const md=mods[q.m];
    if(!md) return;
    md.t++;
    if(hist[i]) md.ok++;
    const w=DIFF_WEIGHT[q.d]||1;
    md.mwT+=w;
    if(hist[i]) md.mwOk+=w;
    const d=q.d;
    if(d>=1&&d<=4){
      md.byDiff[d].t++;
      if(hist[i]) md.byDiff[d].ok++;
      byDiffAll[d].t++;
      if(hist[i]) byDiffAll[d].ok++;
    }
  });
  Object.keys(revLog.entries||{}).forEach(k=>{
    const i=+k,q=Q[i],e=revLog.entries[i];
    if(!q||!e) return;
    const md=mods[q.m];
    if(!md) return;
    md.fails+=e.failCount||0;
    md.hes+=e.struggleCount||0;
    if(e.due&&e.due<=Date.now()) md.due++;
    if((e.sm2?.reps||0)>=2) md.reps++;
  });
  MOD_ORDER.forEach(m=>{
    const md=mods[m];
    const reactAvg=moduleReactAvg(m);
    const trend=getRecentTrend(m);
    const hardT=md.byDiff[3].t+md.byDiff[4].t,hardOk=md.byDiff[3].ok+md.byDiff[4].ok;
    const hardRate=hardT?hardOk/hardT:0.5;
    const easyT=md.byDiff[1].t+md.byDiff[2].t,easyOk=md.byDiff[1].ok+md.byDiff[2].ok;
    const easyRate=easyT?easyOk/easyT:0.5;
    md.wRate=md.mwT?md.mwOk/md.mwT:EXAM_PRIOR.mean;
    md.reactAvg=reactAvg;
    md.trend=trend;
    md.hardRate=hardRate;
    md.easyRate=easyRate;
    md.hardGap=easyRate-hardRate;
    md.sm2Due=md.due;
    md.sm2Reps=md.reps;
    totalOk+=md.ok;
    totalT+=md.t;
    wOk+=md.mwOk;
    wT+=md.mwT;
    totalFails+=md.fails;
    totalHes+=md.hes;
    sm2Due+=md.due;
    sm2Mastered+=md.reps;
  });
  const reactG=getReactStats();
  const trendAll=getRecentTrend(null);
  const hasData=totalT>0||reactG.n>0;
  const globalConf=hasData?Math.round(
    (reactG.n?reactG.avgScore*0.22:11)+
    (totalT?bayesianRate(totalOk,totalT,EXAM_PRIOR.mean,EXAM_PRIOR.n)*100*0.45:28)+
    (totalT?Math.min(100,totalT/3):0)*0.18+
    Math.max(0,30-(totalFails*0.4+totalHes*0.25))+
    (trendAll.delta>0?8:trendAll.delta<-0.12?-8:0)
  ):null;
  _globalStatsCache={
    mods,totalOk,totalT,wRate:wT?wOk/wT:EXAM_PRIOR.mean,byDiffAll,reactG,trendAll,
    totalFails,totalHes,sm2Due,sm2Mastered,
    globalConf:globalConf==null?null:Math.max(5,Math.min(98,globalConf)),
    weakN:revList.length,coverage:Q.length?totalT/Q.length:0
  };
  return _globalStatsCache;
}

function moduleExamAdjustments(gs){
  let adj=0; const f=[];
  const reactOk=(gs.reactAvg??50)>=72;
  const penScale=reactOk?0.55:1;
  if(gs.weakN>0){const p=-Math.min(0.06,gs.weakN*0.004)*penScale;adj+=p;f.push({name:`Points faibles (${gs.weakN})`,v:p});}
  if(gs.fails>0){const p=-Math.min(0.05,gs.fails*0.0025)*penScale;adj+=p;f.push({name:`Erreurs cumulées (${gs.fails})`,v:p});}
  if(gs.hes>0){const p=-Math.min(0.04,gs.hes*0.003)*penScale;adj+=p;f.push({name:`Hésitations (${gs.hes})`,v:p});}
  if(gs.sm2Due>0){const p=-Math.min(0.03,gs.sm2Due*0.006);adj+=p;f.push({name:`SM-2 en retard (${gs.sm2Due})`,v:p});}
  if(gs.hardGap>0.15&&gs.byDiff[3].t+gs.byDiff[4].t>=3){const p=-Math.min(0.04,gs.hardGap*0.16);adj+=p;f.push({name:'Écart facile/difficile',v:p});}
  if(gs.trend.rate!=null&&gs.trend.delta<-0.1){adj-=0.02;f.push({name:'Tendance récente ↓',v:-0.02});}
  else if(gs.trend.delta>0.08){adj+=0.02;f.push({name:'Tendance récente ↑',v:0.02});}
  if(gs.sm2Reps>=5){adj+=0.02;f.push({name:'Mémoire SM-2 solide',v:0.02});}
  adj=Math.max(-0.09,Math.min(0.08,adj));
  return {adj,f};
}

function getModuleExamStats(m,globalRate,gIn){
  const g=gIn||collectGlobalStats();
  const gs=g.mods[m];
  const globalMix=globalRate??g.wRate??EXAM_PRIOR.mean;
  let ok=0,t=0;
  Object.keys(hist).forEach(k=>{
    const i=+k,q=Q[i];
    if(q&&q.m===m){t++;if(hist[i])ok++;}
  });
  const bankN=gs?.bankN||modBankCount(m);
  const pExam=estimateModuleSkill(ok,t,globalMix,gs);
  const wi=wilsonInterval(ok,t);
  const nExam=(EXAM_WEIGHTS||{C:9,A:15,M:20,R:20})[m]||15;
  const kMin=Math.ceil(EXAM_PASS_THRESHOLD*nExam);
  const passProb=modulePassProb(ok,t,nExam,globalMix,gs);
  const passLow=modulePassProb(Math.max(0,Math.floor(wi.low*t)),t,nExam,globalMix,gs);
  const passHigh=modulePassProb(Math.min(t,Math.ceil(wi.high*t)),t,nExam,globalMix,gs);
  const covAdj=Math.min(1,Math.sqrt((gs?.t||t)/Math.max(50,bankN*0.05)));
  const {adjFactors}=moduleExamAdjustments(gs||{weakN:0,fails:0,hes:0,sm2Due:0,hardGap:0,trend:{delta:0},reactAvg:null,sm2Reps:0,byDiff:{3:{t:0},4:{t:0}}});
  return{ok,t,bankN,coverage:bankN?t/bankN:0,pEst:pExam,pExam,passProb,passLow,passHigh,nExam,kMin,
    weakN:gs?.weakN||0,reliable:t>=EXAM_MIN_ANSWERS_MODULE,adjFactors,hardRate:gs?.hardRate,easyRate:gs?.easyRate,trend:gs?.trend,covAdj};
}

function passProbFromCounts(m,ok,t,globalRate,gIn){
  const g=gIn||collectGlobalStats();
  const gs=g.mods[m];
  const globalMix=globalRate??g.wRate??EXAM_PRIOR.mean;
  const nExam=(EXAM_WEIGHTS||{C:9,A:15,M:20,R:20})[m]||15;
  return modulePassProb(ok,t,nExam,globalMix,gs);
}

/* ── Moteur réaction — facteur #1 ── */
const REACT_PROFILE={
  1:{reactSweet:[4,16],reactWarn:[1.5,28],decideSweet:[0.4,12],readMin:0.5},
  2:{reactSweet:[5,24],reactWarn:[2,38],decideSweet:[0.5,18],readMin:0.7},
  3:{reactSweet:[7,32],reactWarn:[2.5,50],decideSweet:[0.6,24],readMin:1},
  4:{reactSweet:[9,42],reactWarn:[3,62],decideSweet:[0.8,32],readMin:1.2},
};

function reactionEngine(correct,diff,beh){
  if(!beh) return {score:50,bonus:0,tags:[],label:'—',tier:'na',phase:{read:0,react:0,decide:0,total:0},confIdx:50,reactSweet:[5,24]};
  const prof=REACT_PROFILE[diff]||REACT_PROFILE[2];
  const choose=beh.chooseSec??beh.reactionSec??0;
  const total=(beh.totalMs||0)/1000||(beh.totalSec??((beh.readSec||0)+choose));
  const decide=beh.decisionSec||0,read=beh.readSec||0;
  const [rLo,rHi]=prof.reactSweet,[rMin,rMax]=prof.reactWarn;
  const [dLo,dHi]=prof.decideSweet;
  const tags=[]; let score=50;

  if(total>=rLo&&total<=rHi){
    const mid=(rLo+rHi)/2,dist=Math.abs(total-mid)/Math.max(0.01,(rHi-rLo)/2);
    score=74+Math.round(14*(1-Math.min(1,dist)));
    tags.push('réaction optimale');
  }else if(total<rMin){
    score=Math.max(30,48-Math.round((rMin-total)*5));
    tags.push('très rapide');
  }else if(total<rLo){
    score=62+Math.round((total-rMin)/(rLo-rMin)*12);
    tags.push('réaction rapide');
  }else if(total<=rMax){
    score=58-Math.round(((total-rHi)/(rMax-rHi))*20);
    tags.push('réaction lente');
  }else{
    score=Math.max(24,42-Math.round((total-rMax)*1.1));
    tags.push('sur-analyse');
  }

  if(decide>=dLo&&decide<=dHi){
    if(correct) score=Math.min(90,score+4);
  }else if(decide<0.4&&!correct){
    score=Math.max(20,score-10);
    tags.push('clic précipité');
  }else if(decide>dHi*1.6&&!correct){
    score=Math.max(20,score-10);
    tags.push('hésitation prolongée');
  }else if(decide<dLo&&correct&&total>=rLo){
    score=Math.min(88,score+3);
    tags.push('décision assurée');
  }

  if(read<prof.readMin&&total<rLo*0.55){
    score=Math.max(24,score-10);
    tags.push('lecture courte');
  }else if(read>=prof.readMin&&total>=rLo*0.8){
    score=Math.min(90,score+2);
  }

  if(correct){
    score=Math.min(92,score+2);
    if(total>=rMin&&total<=rMax) score=Math.max(score,68);
    if(total>=rLo&&total<=rHi) score=Math.max(score,78);
    if(score>=72) tags.push('réflexe sûr');
  }else{
    score=Math.max(26,score-16);
    if(total<rMin||decide<0.35) score=Math.max(20,score-10);
  }

  score=Math.max(18,Math.min(92,Math.round(score)));
  const bonus=Math.max(-40,Math.min(40,Math.round((score-50)*0.82)));
  const tier=score>=78?'optimal':score>=60?'good':score>=42?'warn':'bad';
  const label={optimal:'Réaction optimale — rythme examen',good:'Réaction correcte',warn:'Réaction à calibrer',bad:'Réaction problématique',na:'—'}[tier];
  return {score,bonus,tags,label,tier,phase:{read,react:choose,decide,total},confIdx:score,reactSweet:prof.reactSweet};
}

function behFromLogItem(it){
  const chooseSec=it.chooseSec??it.reactSec??0;
  const totalSec=it.el||it.totalSec||((it.readSec||0)+chooseSec)||chooseSec;
  return{
    totalMs:totalSec*1000,totalSec,
    readSec:it.readSec||0,chooseSec,
    reactionSec:chooseSec,decisionSec:it.decideSec||it.decisionSec||0
  };
}

function reactResultFromLogItem(it){
  if(!it) return {score:50,tier:'na',tags:[]};
  return reactionEngine(!!it.ok,it.diff||2,behFromLogItem(it));
}

function reactScoreFromLogItem(it){
  return reactResultFromLogItem(it).score;
}

function getReactStats(src){
  const ans=(answerLog.items||[]);
  const entries=ans.length?ans.slice(-400):(src||(reactLog.history||[]));
  if(!entries.length) return {avgScore:0,avgReact:0,avgTotal:0,optimal:0,impulsive:0,slow:0,n:0};
  let scoreSum=0,timeSum=0,optimal=0,impulsive=0,slow=0;
  entries.forEach(it=>{
    const res=ans.length?reactResultFromLogItem(it):reactResultFromLogItem({
      ok:it.ok,diff:it.diff,el:it.totalSec,readSec:it.readSec,
      chooseSec:it.chooseSec,reactSec:it.reactSec,decideSec:it.decideSec
    });
    const totalSec=behFromLogItem(it).totalMs/1000;
    scoreSum+=res.score;
    timeSum+=totalSec;
    if(res.tier==='optimal') optimal++;
    if((res.tags||[]).includes('très rapide')||(res.tags||[]).includes('impulsif')) impulsive++;
    if((res.tags||[]).includes('réaction lente')||(res.tags||[]).includes('sur-analyse')) slow++;
  });
  const n=entries.length;
  return{
    n,avgScore:Math.round(scoreSum/n),avgReact:timeSum/n,avgTotal:timeSum/n,
    optimal,impulsive,slow
  };
}
let reactInt=null,reactLiveOn=false,curQDiff=2;
function stopReactLive(){reactLiveOn=false;if(reactInt){clearInterval(reactInt);reactInt=null;}}
function updateReactLive(){
  if(document.hidden) return;
  const box=document.getElementById('react-live'),valEl=document.getElementById('react-val');
  if(!box||!valEl||!QBehavior.t0) return;
  const lblEl=box.querySelector('.rl-lbl');
  const prof=REACT_PROFILE[curQDiff]||REACT_PROFILE[2];
  const [rLo,rHi]=prof.reactSweet,[rMin,rMax]=prof.reactWarn;
  const totalSec=(Date.now()-QBehavior.t0)/1000;
  if(!QBehavior.optsEnter){
    lblEl.textContent='Lecture';
    valEl.textContent=totalSec<10?totalSec.toFixed(1)+'s':Math.round(totalSec)+'s';
    let cls='read';
    if(totalSec>=prof.readMin&&totalSec<=rHi*0.5) cls='good';
    else if(totalSec>rMax) cls='warn';
    box.className='react-live '+cls;
  }else{
    const choose=(Date.now()-QBehavior.optsEnter)/1000;
    lblEl.textContent='Choix '+totalSec.toFixed(1)+'s';
    valEl.textContent=choose.toFixed(1)+'s';
    let cls='wait';
    if(totalSec>=rLo&&totalSec<=rHi) cls='good';
    else if(totalSec<rMin) cls='warn';
    else if(totalSec<=rMax) cls='warn';
    else cls='bad';
    box.className='react-live '+cls;
  }
}
function startReactLive(diff){
  stopReactLive();
  curQDiff=diff||2;
  const box=document.getElementById('react-live');
  if(box){box.className='react-live wait';document.getElementById('react-val').textContent='—';}
  if(getSettings().showTimer===false){box&&(box.style.display='none');return;}
  if(box) box.style.display='';
  updateReactLive();
  reactLiveOn=true;
  reactInt=setInterval(()=>{if(reactLiveOn&&!document.hidden) updateReactLive();},400);
}

function trackReactLog(ok,diff,beh,reactRes,q,idx,el){
  if(!beh||!reactRes||!canPersist('reaction')) return;
  if(!reactLog.history) reactLog={history:[]};
  reactLog.history.push({
    t:Date.now(),ok,diff,m:q?.m,ref:q?.r,idx,
    el:el||beh.totalSec,
    totalSec:beh.totalSec||beh.reactionSec,
    chooseSec:beh.chooseSec,reactSec:beh.reactionSec,
    decideSec:beh.decisionSec,readSec:beh.readSec,
    score:reactRes.score,tier:reactRes.tier,tags:reactRes.tags
  });
  if(reactLog.history.length>400) reactLog.history=reactLog.history.slice(-400);
  saveReact();
}

let probaLog={snapshots:[]};
try{probaLog=JSON.parse(localStorage.getItem('ppl4proba')||'{"snapshots":[]}')}catch(e){probaLog={snapshots:[]}}
if(!probaLog.snapshots) probaLog.snapshots=[];

function saveProbaLog(){if(!canPersist('proba'))return;lsSet('ppl4proba',probaLog);}

function trackProbaSnapshot(){
  if(!canPersist('proba')) return;
  const ex=simulateExamReadiness();
  const g=ex.global;
  const last=probaLog.snapshots[probaLog.snapshots.length-1];
  if(last&&Date.now()-last.t<60000&&last.examP===ex.examP) return;
  probaLog.snapshots.push({
    t:Date.now(),examP:ex.examP,conf:g?.globalConf||0,
    mastery:Math.round((g?.wRate||0)*100),react:g?.reactG?.avgScore||0,weak:g?.weakN||0
  });
  if(probaLog.snapshots.length>80) probaLog.snapshots=probaLog.snapshots.slice(-80);
  saveProbaLog();
}

function saveReact(){if(!canPersist('reaction'))return;lsSet('ppl4react',reactLog);}

function buildReactDash(){
  const el=document.getElementById('react-dash');
  if(!el) return;
  const st=getReactStats();
  if(!st.n){
    el.innerHTML=`<div class="react-dash">
      <div class="react-dash-hd"><h2>⚡ Temps de réaction — facteur prioritaire</h2></div>
      <div style="font-size:12px;color:var(--t3);line-height:1.55">Chaque question mesure lecture → réaction → décision. Le score réaction pèse le plus dans la probabilité examen. Lance une session pour alimenter ce tableau.</div>
    </div>`;
    return;
  }
  const recent=(answerLog.items||[]).slice(-40);
  const recentLegacy=recent.length?recent:(reactLog.history||[]).slice(-40);
  const maxR=Math.max(...recentLegacy.map(h=>h.el||h.totalSec||h.reactSec||0),4);
  const bars=recentLegacy.map((h,i)=>{
    const t=h.el||h.totalSec||h.reactSec||0;
    const sc=recent.length?reactScoreFromLogItem(h):reactScoreFromLogItem({ok:h.ok,diff:h.diff,el:h.totalSec||h.el,readSec:h.readSec,chooseSec:h.chooseSec,reactSec:h.reactSec,decideSec:h.decideSec});
    const hpx=Math.max(4,Math.round(t/maxR*48));
    const col=probaColor(sc);
    return`<div class="ph-bar" style="height:${hpx}px;background:${col};opacity:${h.ok?1:.45}" title="Total ${t.toFixed(1)}s · score ${sc}"></div>`;
  }).join('');
  const sweet=REACT_PROFILE[2].reactSweet;
  el.innerHTML=`<div class="react-dash">
    <div class="react-dash-hd">
      <div><h2>⚡ Temps de réaction — facteur #1</h2>
        <div style="font-size:11px;color:var(--t3);margin-top:2px">Fenêtre idéale niveau moyen : ${sweet[0]}–${sweet[1]}s (temps total question) · ${st.n} mesures</div></div>
      <span class="rev-pill ok">Score moy. ${st.avgScore}%</span>
    </div>
    <div class="react-stat-grid">
      <div class="react-stat"><div class="react-stat-v" style="color:${probaColor(st.avgScore)}">${st.avgScore}%</div><div class="react-stat-l">Score réaction</div></div>
      <div class="react-stat"><div class="react-stat-v">${st.avgReact.toFixed(1)}s</div><div class="react-stat-l">Temps moy.</div></div>
      <div class="react-stat"><div class="react-stat-v" style="color:var(--green)">${st.optimal}</div><div class="react-stat-l">Optimales</div></div>
      <div class="react-stat"><div class="react-stat-v" style="color:var(--red)">${st.impulsive}</div><div class="react-stat-l">Impulsives</div></div>
    </div>
    ${recentLegacy.length>4?`<div class="ph-section" style="margin:0"><div style="font-size:10px;color:var(--t3);margin-bottom:4px">Historique récent (hauteur = temps total, couleur = score)</div><div class="ph-bars">${bars}</div></div>`:''}
  </div>`;
}

function behaviorFactor(correct,diff,beh){
  if(!beh) return {bonus:0,tags:[],confIdx:50};
  let bonus=0; const tags=[]; let confIdx=50;
  const hovers=beh.hoverSwitches||0,wrongH=beh.wrongHoverCount||0,wrongMs=beh.hoveredWrongMs||0;
  const dist=beh.moveDist||0,jitter=beh.jitter||0,dwell=beh.dwellChosen||0;
  const vac=beh.vacillations||0,blur=beh.blurCount||0,wdr=beh.wrongDwellRatio||0;
  const velStd=beh.velStd||0,deci=beh.decisiveness||0;

  if(correct){
    if(hovers>=4){bonus-=6;tags.push('hésitation souris');confIdx-=12;}
    else if(hovers>=2){bonus-=3;tags.push('hésitation');confIdx-=6;}
    if(wrongH>=2||wrongMs>2500){bonus-=8;tags.push('exploration d\'erreurs');confIdx-=14;}
    if(wdr>0.55&&wrongH>=1){bonus-=4;tags.push('temps sur mauvaises options');confIdx-=10;}
    if(vac>=2){bonus-=4;tags.push('indécision (allers-retours)');confIdx-=8;}
    if(dwell>1000&&wrongH===0&&deci>0.4){bonus+=4;tags.push('validation assurée');confIdx+=8;}
    if(dist>1500&&hovers>=2){bonus-=3;tags.push('mouvements erratiques');confIdx-=5;}
    if(jitter>40&&hovers>=2){bonus-=3;tags.push('stress moteur');confIdx-=6;}
    if(velStd>120&&hovers>=2){bonus-=2;tags.push('souris nerveuse');confIdx-=4;}
    if(beh.scrollCount>0){bonus+=1;tags.push('relecture active');confIdx+=3;}
    if(blur>0){bonus-=2;tags.push('perte de focus');confIdx-=8;}
  }else{
    if(hovers>=3&&wrongMs>dwell){bonus+=3;tags.push('proche — tu hésitais sur la bonne');}
    if(wrongH>=1&&dwell<400){bonus-=3;tags.push('clic précipité');confIdx-=10;}
    if(beh.longestWrongIdx===beh.chosenIdx&&beh.maxWrongDwell>1500){bonus+=3;tags.push('piège attractif identifié');}
    if(vac>=3){bonus-=3;tags.push('panique décisionnelle');confIdx-=10;}
    if(blur>0){bonus-=2;tags.push('distraction');}
  }
  if(hovers===0&&dist<60&&beh.reactionSec>4&&beh.readSec<2){bonus-=2;tags.push('peu d\'exploration');confIdx-=6;}
  if(deci<0.15&&beh.decisionSec>5){bonus-=2;tags.push('décision diffuse');confIdx-=5;}
  confIdx=Math.max(5,Math.min(95,confIdx+(bonus*0.6)));
  return {bonus:Math.max(-10,Math.min(10,bonus)),tags,confIdx:Math.round(confIdx)};
}

function calcProba(correct,elapsedSec,diff,sessionHistory,beh,ctx){
  ctx=ctx||{};
  const factors=[];
  const reactRes=reactionEngine(correct,diff,beh);
  const diffW=0.06+diff*0.018;
  const reactAdj=(reactRes.score-50)/500;
  const timeLimit={1:12,2:22,3:38,4:55};
  const lim=timeLimit[diff]||22;
  const ratio=Math.min(elapsedSec/lim,2.5);

  let p=EXAM_PRIOR.mean;
  if(ctx.q&&ctx.idx!=null){
    const modAcc=getModuleAccuracy(ctx.q.m);
    const topic=getTopicStats(ctx.q.r);
    const diffD=getDifficultyStats(ctx.q.m);
    const diffAcc=diffD[diff]?.t>=2?diffD[diff].ok/diffD[diff].t:modAcc;
    if(topic.n>=5) p=0.5*topic.accuracy+0.3*modAcc+0.2*diffAcc;
    else if(topic.n>=2) p=0.35*modAcc+0.45*topic.accuracy+0.2*diffAcc;
    else p=0.6*modAcc+0.4*diffAcc;
    factors.push({name:'Prior thème/module/diff.',value:Math.round(p*100),raw:p,type:'base'});
  }else{
    factors.push({name:'Prior maîtrise',value:Math.round(p*100),raw:p,type:'base'});
  }

  const pBefore=p;
  if(correct){
    p=p+(1-p)*(0.22+diffW+Math.max(0,reactAdj));
    if(reactRes.score>=75) p=Math.min(0.97,p+0.04);
    if(ratio>1.2) p=Math.max(0.03,p-0.02);
    else if(ratio<0.5&&reactRes.score>=60) p=Math.min(0.97,p+0.02);
  }else{
    p=p*(0.62-diffW*0.45);
    if(reactRes.score<35) p=Math.max(0.03,p-0.06);
    else if(reactRes.score>=70) p=Math.min(p,pBefore*0.92);
    if(ratio<0.3) p=Math.max(0.03,p-0.04);
  }
  p=clampProba(p+reactAdj*0.1);
  const ansDelta=Math.round((p-pBefore)*100);
  factors.unshift({name:correct?'Réponse correcte':'Réponse incorrecte',value:ansDelta,raw:ansDelta,type:ansDelta>=0?'pos':'neg'});
  factors.unshift({name:'⚡ Réaction',value:Math.round((reactRes.score-50)*0.25),raw:reactRes.score,type:reactRes.score>=55?'pos':'neg',reactMain:true});

  if(ratio>0){
    let tAdj=0;
    if(correct&&ratio>1.3) tAdj=-0.03;
    else if(!correct&&ratio<0.35) tAdj=-0.04;
    else if(correct&&ratio<=0.7) tAdj=0.015;
    if(tAdj){p=clampProba(p+tAdj);factors.push({name:'Temps vs difficulté',value:Math.round(tAdj*100),raw:tAdj,type:tAdj>=0?'pos':'neg'});}
  }

  const {confIdx:behConf,tags:behTags}=behaviorFactor(correct,diff,beh);
  const behP=(behConf-50)/400;
  if(Math.abs(behP)>=0.008){p=clampProba(p+behP);factors.push({name:'Comportement souris',value:Math.round(behP*100),raw:behP,type:behP>=0?'pos':'neg'});}

  if(sessionHistory.length>=3){
    const last=sessionHistory.slice(-5);
    const rate=last.filter(Boolean).length/last.length;
    const mom=(rate-0.75)*0.05;
    if(Math.abs(mom)>=0.008){
      p=clampProba(p+mom);
      factors.push({name:'Momentum session',value:Math.round(mom*100),raw:mom,type:mom>=0?'pos':'neg'});
    }
  }

  const e=ctx.idx!=null?revLog.entries?.[ctx.idx]:null;
  if(e){
    if(e.sm2){
      const daysSince=(Date.now()-(e.sm2.last||0))/86400000;
      let sp=0;
      if(daysSince>e.sm2.interval&&correct) sp=0.03;
      else if(daysSince>e.sm2.interval&&!correct) sp=-0.06;
      else if(daysSince<1&&e.sm2.reps>=1&&!correct) sp=-0.04;
      if(sp){p=clampProba(p+sp);factors.push({name:'Répétition espacée',value:Math.round(sp*100),raw:sp,type:sp>=0?'pos':'neg'});}
    }
    if((e.failCount||0)>=1&&!correct){p=clampProba(p-0.04);factors.push({name:'Antécédent erreurs',value:-4,raw:-0.04,type:'neg'});}
    if((e.struggleCount||0)>=2){p=clampProba(p-0.03);factors.push({name:'Hésitations passées',value:-3,raw:-0.03,type:'neg'});}
    if((e.okStreak||0)>=2&&correct){p=clampProba(p+0.03);factors.push({name:'Série correcte',value:3,raw:0.03,type:'pos'});}
  }

  if(ctx.q&&ctx.idx!=null){
    if(hist[ctx.idx]===false&&!correct) p=clampProba(p-0.04);
    else if(hist[ctx.idx]===true&&correct) p=clampProba(p+0.02);
  }

  const tags=[...(reactRes.tags||[]),...(behTags||[])].filter((t,i,a)=>a.indexOf(t)===i);
  const confIdx=Math.round((reactRes.confIdx||50)*0.55+(behConf||50)*0.2+p*100*0.25);

  let examImpact=null;
  if(ctx.q&&ctx.idx!=null){
    const m=ctx.q.m;
    const g=collectGlobalStats();
    let ok=0,t=0;
    Object.keys(hist).forEach(k=>{
      const i=+k,q=Q[i];
      if(i===ctx.idx||!q||q.m!==m) return;
      t++; if(hist[i]) ok++;
    });
    const ok2=ok+(correct?1:0), t2=t+1;
    examImpact=Math.round((passProbFromCounts(m,ok2,t2,g.wRate,g)-passProbFromCounts(m,ok,t,g.wRate,g))*100);
  }

  const scorePct=Math.round(p*100);
  const dataPts=(sessionHistory.length||0)+(e?.attempts||0)+(ctx.q?1:0);
  const uncertainty=Math.max(3,Math.round(15-dataPts*0.9-(confIdx/100)*3));
  const pLow=Math.max(2,scorePct-uncertainty);
  const pHigh=Math.min(97,scorePct+uncertainty);

  return{p:scorePct,pLow,pHigh,uncertainty,tags,factors,confIdx,knowledgeScore:scorePct,score:scorePct,
    reactScore:reactRes.score,reactRes,mastery:scorePct,examImpact};
}

function globalExamSkill(g){
  const priorN=Math.max(4,EXAM_PRIOR.n+Math.floor((g.totalT||0)/10));
  const base=g.totalT>=5
    ?bayesianRate(g.totalOk,g.totalT,EXAM_PRIOR.mean,priorN)
    :EXAM_PRIOR.mean;
  const react=g.reactG.n>=3?(g.reactG.avgScore-50)/260:0;
  const covBonus=Math.min(0.05,(g.coverage||0)*0.1);
  let pen=0;
  if(g.weakN>0) pen+=Math.min(0.07,g.weakN*0.0035);
  if(g.totalFails>0) pen+=Math.min(0.05,g.totalFails*0.002);
  if(g.totalHes>0) pen+=Math.min(0.04,g.totalHes*0.002);
  if(g.wRate>=0.72&&g.reactG.avgScore>=68) pen*=0.5;
  return clampProba(base+react+covBonus-pen);
}

function simulateExamReadiness(){
  if(_examSimCache) return _examSimCache;
  const g=collectGlobalStats();
  const globalRate=g.wRate??EXAM_PRIOR.mean;
  const gSkill=globalExamSkill(g);
  const mods={};
  let moduleProduct=1,globalPassLow=1,globalPassHigh=1,totalT=0,reliableModules=0;
  MOD_ORDER.forEach(m=>{
    const s=getModuleExamStats(m,globalRate,g);
    totalT+=s.t;
    const cov=Math.min(1,s.t/EXAM_MIN_ANSWERS_MODULE);
    const localPass=s.passProb;
    const fallback=binomialPassProb(s.nExam,gSkill);
    const blendedPass=Math.min(0.98,Math.max(0.10,cov*localPass+(1-cov)*fallback));
    if(s.reliable) reliableModules++;
    moduleProduct*=blendedPass;
    globalPassLow*=Math.max(0.05,cov*s.passLow+(1-cov)*fallback*0.85);
    globalPassHigh*=Math.min(0.999,cov*s.passHigh+(1-cov)*Math.min(0.999,fallback*1.08));
    mods[m]={
      rate:Math.round(s.pExam*100),
      passProb:Math.round(blendedPass*100),
      passLow:Math.round(Math.max(0,cov*s.passLow+(1-cov)*fallback*0.85)*100),
      passHigh:Math.round(Math.min(99,cov*s.passHigh+(1-cov)*Math.min(0.99,fallback*1.08))*100),
      coverage:Math.round(s.coverage*100),
      n:s.t,nExam:s.nExam,kMin:s.kMin,weak:s.weakN,reliable:s.reliable,
      hardRate:Math.round((s.hardRate||0)*100),easyRate:Math.round((s.easyRate||0)*100),
      adjFactors:s.adjFactors||[],trendDelta:s.trend?.delta!=null?Math.round(s.trend.delta*100):null
    };
  });
  const reliable=totalT>=EXAM_MIN_ANSWERS_GLOBAL;
  const fullExam=binomialPassProb(64,gSkill);
  const examPRaw=reliable?0.38*moduleProduct+0.62*fullExam:null;
  const examP=reliable?Math.round(Math.min(99,Math.max(5,examPRaw*100))):null;
  const examPLow=reliable?Math.round(Math.max(3,globalPassLow*100)):null;
  const examPHigh=reliable?Math.min(99,Math.round(globalPassHigh*100)):null;
  const verdict=!reliable?'na':examP>=80?'ready':examP>=55?'mid':'low';
  const vLabel=!reliable
    ?`${totalT}/${EXAM_MIN_ANSWERS_GLOBAL} réponses — estimation indisponible`
    :reliableModules<4
      ?`P(réussir les 4 épreuves) · ${reliableModules}/4 épreuves estimées (${examP}%)`
      :examP>=80?'Prêt pour l\'examen':examP>=55?'En progression — cible 80%+':'Révisions intensives requises';
  _examSimCache={examP,examPLow,examPHigh,mods,verdict,vLabel,reliable,reliableModules,totalT,global:g,
    riskFactors:buildRiskFactors(g,mods),byDiff:g.byDiffAll};
  return _examSimCache;
}

function buildRiskFactors(g,mods){
  const risks=[];
  if(g.weakN>=5) risks.push({t:`${g.weakN} points faibles actifs`,w:'high'});
  if(g.sm2Due>=3) risks.push({t:`${g.sm2Due} révisions SM-2 en retard`,w:'high'});
  if(g.trendAll.delta<-0.1) risks.push({t:'Précision en baisse sur les dernières réponses',w:'mid'});
  MOD_ORDER.forEach(m=>{
    const s=mods[m];
    if(s.reliable&&s.passProb<55) risks.push({t:`${modStr(m)} : P(réussite) ${s.passProb}%`,w:'high'});
    else if(s.reliable&&s.passProb<70) risks.push({t:`${modStr(m)} : marge faible (${s.passProb}%)`,w:'mid'});
    if(s.hardRate<60&&s.n>=8) risks.push({t:`${modStr(m)} : difficulté ★★★+ à ${s.hardRate}%`,w:'mid'});
  });
  if(g.reactG.avgScore<45&&g.reactG.n>=5) risks.push({t:'Réactions souvent impulsives ou lentes',w:'mid'});
  if(!risks.length&&g.totalT>=20) risks.push({t:'Aucun risque majeur détecté',w:'ok'});
  return risks.slice(0,8);
}

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
  if(r.includes('metar')||r.includes('taf')||r.includes('temsi'))
    return 'METAR = observation · TAF = prévision · croise les deux. Groupes vent/visi/nuages/T/QNH dans l\'ordre.';
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
  if(r.includes('metar')||r.includes('taf'))
    return 'Astuce examen : décode METAR/TAF groupe par groupe (vent → visi → temps → nuages → T/Td → QNH). Croise observation, prévision et SPECI/AMD.';
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
  const totalSec=beh?.totalMs?beh.totalMs/1000:((beh?.readSec||0)+(beh?.reactionSec||0));
  if(totalSec>0&&totalSec<2.5) steps.push('Prends le temps de lire : vise 3–35 s par question (niveau moyen).');
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
  const logEntry=opts.logEntry||getLastAnswerLogForIdx(qIdx(q));
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

function renderTopicFicheHTML(ref,opts={}){
  const f=buildTopicFiche(ref,opts.sampleQ,opts.entry,opts.chosenIdx);
  if(!f) return '';
  const mCol=f.mastery.pct>=65?'var(--green)':f.mastery.pct>=40?'var(--amber)':'var(--red)';
  const acc=f.topicStats.n?Math.round(f.topicStats.accuracy*100):'—';
  const cov=f.topicStats.n?Math.round(f.topicStats.coverage*100):0;
  const sampleIdx=opts.sampleQ?qIdx(opts.sampleQ):-1;
  let formulasBlock='';
  if(typeof getFormulasForQuestion==='function'&&typeof renderFicheFormulasSection==='function'){
    const fh=renderFicheFormulasSection(f.formulas,f.worked,f.essentials,f.module);
    if(fh) formulasBlock=`<div class="fiche-block"><div class="fiche-block-hd"><span class="fiche-block-ico">📐</span> Formules & calculs</div><div class="fiche-block-bd">${fh}</div></div>`;
  }else if(sampleIdx>=0){
    formulasBlock=`<div class="fiche-block fiche-formulas-lazy" data-fiche-formulas-q="${sampleIdx}" data-fiche-mod="${f.module}">
      <div class="fiche-block-hd"><span class="fiche-block-ico">📐</span> Formules & calculs</div>
      <div class="fiche-block-bd"><div class="fiche-formulas-slot"><div class="fiche-lazy-spin">Chargement formules…</div></div></div>
    </div>`;
  }
  const points=(f.allRules.length?f.allRules:f.allPoints.length?f.allPoints:f.keyPoints);
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
      ${formulasBlock}
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

function probaPct(args){ return typeof args==='number'?args:(args&&args.p!=null?args.p:0); }

function probaClass(p){ return p>=78?'ph':p>=55?'pm':'pl'; }
function probaColor(p){ return p>=78?'#34d3a8':p>=55?'#f0b040':'#f06060'; }
function barColor(p){ return p>=75?'#34d3a8':p>=50?'#f0b040':'#f06060'; }
function diffStr(d){ return['','★ Facile','★★ Moyen','★★★ Difficile','★★★★ Expert'][d]; }
function modStr(m){ return{C:'Communications',A:'Aéronef',M:'Météorologie',R:'Réglementation'}[m]; }
function modClass(m){ return{C:'bd-comm',A:'bd-aero',M:'bd-met',R:'bd-reg'}[m]; }
function diffClass(d){ return['','bd-f','bd-m','bd-d','bd-e'][d]; }

let mode='exam', queue=[], qi=0, answered=false, t0=0, tInt=null;
let curOptOrder=null, autoAdvTimer=null;
let paused=false, pauseAt=0, timerRem=null;
let sData=[], hist={}, weak=new Set(), sesHist=[], sessionPlan=null;
let revLog={entries:{}}, revisionTopicFilter=null, revisionSingleIdx=null;
let reactLog={history:[]};
try{hist=JSON.parse(localStorage.getItem('ppl4h')||'{}')}catch(e){}
window.hist=hist;
try{const w=JSON.parse(localStorage.getItem('ppl4w')||'[]');weak=new Set(w)}catch(e){}
try{revLog=JSON.parse(localStorage.getItem('ppl4rev')||'{"entries":{}}')}catch(e){revLog={entries:{}}}
try{reactLog=JSON.parse(localStorage.getItem('ppl4react')||'{"history":[]}')}catch(e){reactLog={history:[]}}
if(!revLog.entries) revLog.entries={};
if(!reactLog.history) reactLog.history=[];

const PPL_STORAGE_KEYS=['ppl4h','ppl4w','ppl4rev','ppl4react','ppl4proba','ppl4div','ppl4answers','ppl4sessionFiches','ppl4errorFiches'];

function lsSet(key,val){
  if(window.PPLStorage){PPLStorage.queue(key,val);return;}
  try{localStorage.setItem(key,typeof val==='string'?val:JSON.stringify(val));}catch(e){}
}

function canPersist(type){return window.PPLSettings?.canPersist?.(type)!==false;}

let answerLog={items:[]};
try{answerLog=JSON.parse(localStorage.getItem('ppl4answers')||'{"items":[]}')}catch(e){answerLog={items:[]}}
if(!answerLog.items) answerLog.items=[];

function saveAnswerLog(){if(!canPersist('detailed'))return;lsSet('ppl4answers',answerLog);}

function trackAnswerLog(ok,el,beh,reactRes,probaRes,q,idx,qi){
  if(!canPersist('detailed')) return;
  const b=beh||{};
  const entry={
    t:Date.now(),idx,qi,ok,el,diff:q.d,mod:q.m,ref:q.r,
    question:q.q,explain:q.e,
    reactScore:reactRes?.score,tier:reactRes?.tier,
    mastery:probaRes?.p,confIdx:probaRes?.confIdx,examImpact:probaRes?.examImpact,
    reactSec:b.reactionSec,readSec:b.readSec,decideSec:b.decisionSec,
    totalSec:b.totalSec||b.reactionSec,chooseSec:b.chooseSec,
    chosenIdx:b.chosenIdx,correctIdx:q.a,
    tags:[...(reactRes?.tags||[]),...(probaRes?.tags||[])],
    factors:(probaRes?.factors||[]).map(f=>({label:f.label||f.name,value:f.value,unit:f.unit||''}))
  };
  if(canPersist('behavior')){
    Object.assign(entry,{
      hoverSwitches:b.hoverSwitches,wrongHoverCount:b.wrongHoverCount,vacillations:b.vacillations,
      dwellChosen:b.dwellChosen,moveDist:b.moveDist,decisiveness:b.decisiveness,blurCount:b.blurCount,
      wrongDwellRatio:b.wrongDwellRatio,
      beh:{readSec:b.readSec,reactionSec:b.reactionSec,decisionSec:b.decisionSec,
        totalSec:b.totalSec,chooseSec:b.chooseSec,totalMs:b.totalMs,hoverSwitches:b.hoverSwitches,
        wrongHoverCount:b.wrongHoverCount,vacillations:b.vacillations,dwellChosen:b.dwellChosen,
        moveDist:b.moveDist,decisiveness:b.decisiveness,blurCount:b.blurCount,jitter:b.jitter,velStd:b.velStd}
    });
  }
  answerLog.items.push(entry);
  if(answerLog.items.length>500) answerLog.items=answerLog.items.slice(-500);
  saveAnswerLog();
}

function summarizeKey(text){
  if(!text) return '';
  const t=text.trim();
  const m=t.match(/^[^.!?]+[.!?]/);
  const s=m?m[0]:t;
  return s.length>200?s.slice(0,197)+'…':s;
}

function clearAllStorage(){
  if(window.PPLSettings&&typeof PPLSettings.wipeAllPplStorage==='function'){
    PPLSettings.wipeAllPplStorage({ keepSettings:true, keepAuth:true });
    return;
  }
  PPL_STORAGE_KEYS.forEach(k=>lsRemove(k));
  try{
    for(let i=localStorage.length-1;i>=0;i--){
      const k=localStorage.key(i);
      if(k&&k.startsWith('ppl4')) lsRemove(k);
    }
  }catch(e){}
  if(window.PPLStorage) PPLStorage.flushNow();
}

function resetAllMemory(){
  hist={};
  weak=new Set();
  revLog={entries:{}};
  reactLog={history:[]};
  probaLog={snapshots:[]};
  diversityLog={recent:[],seenIdx:{}};
  answerLog={items:[]};
}

function resetSessionState(){
  clearInterval(tInt);
  stopReactLive();
  hidePause();
  queue=[]; qi=0; answered=false; paused=false; pauseAt=0; timerRem=null;
  sData=[]; sesHist=[]; sessionPlan=null; sessionRecycle=false;
  revisionTopicFilter=null; revisionSingleIdx=null;
  QBehavior.reset();
}

function resetUIDefaults(){
  mode='exam';
  document.querySelectorAll('.mc').forEach(c=>c.classList.remove('on'));
  document.querySelector('[data-mode="exam"]')?.classList.add('on');
  const cfMod=document.getElementById('cf-mod');
  const cfDif=document.getElementById('cf-dif');
  const cfN=document.getElementById('cf-n');
  if(cfMod) cfMod.value='all';
  if(cfDif) cfDif.value='all';
  if(cfN) cfN.value='64';
  document.querySelectorAll('.n-pre').forEach(b=>b.classList.toggle('on',b.dataset.n==='64'));
}

function esc(s){return String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function save(){if(!canPersist('progress'))return;lsSet('ppl4h',hist);lsSet('ppl4w',[...weak]);lsSet('ppl4rev',revLog);}
function saveRev(){if(!canPersist('progress'))return;lsSet('ppl4rev',revLog);}

function isStruggle(ok,beh){
  if(!beh) return false;
  return beh.hoverSwitches>=3||beh.wrongHoverCount>=2||beh.hoveredWrongMs>2500||
    beh.vacillations>=2||beh.wrongDwellRatio>0.5||
    (!ok&&(beh.totalMs||0)<2500)||(!ok&&beh.decisionSec<2&&beh.hoverSwitches<=1)||
    (ok&&beh.wrongHoverCount>=2);
}

function renderDeepFicheHTML(q,entry,chosenIdx,beh,logEntry){
  const idx=qIdx(q);
  const ci=chosenIdx??entry?.lastWrongChoice??entry?.lastBeh?.chosenIdx??-1;
  const log=logEntry||getLastAnswerLogForIdx(idx>=0?idx:undefined);
  if(typeof renderQuestionErrorFicheHTML==='function'){
    return renderQuestionErrorFicheHTML(q,{idx,chosenIdx:ci,beh:beh||entry?.lastBeh,entry,logEntry:log});
  }
  return renderTopicFicheHTML(q.r,{sampleQ:q,entry,chosenIdx:ci,mode:'error',compact:true,showFoot:true,beh:beh||entry?.lastBeh,logEntry:log});
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
    e.lastBeh={hoverSwitches:beh.hoverSwitches,wrongHoverCount:beh.wrongHoverCount,reactionSec:beh.reactionSec,
      readSec:beh.readSec,decisionSec:beh.decisionSec,vacillations:beh.vacillations,chosenIdx:beh.chosenIdx,
      longestWrongIdx:beh.longestWrongIdx,hoveredWrongMs:beh.hoveredWrongMs,wrongDwellRatio:beh.wrongDwellRatio,
      dwellPerOpt:beh.dwellPerOpt,dwellChosen:beh.dwellChosen,moveDist:beh.moveDist,decisiveness:beh.decisiveness};
  }
  e.lastOk=ok;e.lastEl=el;
  updateSM2(e,ok,struggle);
  e.attempts=(e.attempts||0)+1;
  revLog.entries[idx]=e;
  saveRev();
}

function revItems(){
  if(_revItemsCache) return _revItemsCache;
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
  _revItemsCache=items.sort((a,b)=>b.priority-a.priority);
  return _revItemsCache;
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

function buildExamDash(ex){
  initTopicKB();
  ex=ex||simulateExamReadiness();
  const g=ex.global;
  const done=ex.totalT;
  document.getElementById('h-exam').textContent=ex.reliable&&ex.examP!=null?ex.examP+'%':'—';
  document.getElementById('h-conf').textContent=g?.globalConf!=null?g.globalConf+'%':'—';
  const rangeStr=ex.reliable&&ex.examPLow!=null?` · IC ${ex.examPLow}–${ex.examPHigh}%`:'';
  const confStr=g?.globalConf!=null?g.globalConf+'%':'—';
  document.getElementById('exam-dash').innerHTML=`
    <div class="exam-dash">
      <div class="exam-dash-hd">
        <div><h2>Simulateur de probabilité d'examen</h2>
          <div class="exam-dash-sub">4 épreuves ≥75% · 64 Q · ${done} réponses · confiance ${confStr}</div></div>
        <div style="text-align:right">
          <div class="exam-big" style="color:${ex.reliable&&ex.examP!=null?probaColor(ex.examP):'var(--t3)'}">${ex.reliable&&ex.examP!=null?ex.examP+'%':'—'}</div>
          <span class="exam-verdict ${ex.verdict}">${ex.vLabel}${rangeStr}</span>
        </div>
      </div>
      <div class="exam-grid">
        ${MOD_ORDER.map(m=>{
          const s=ex.mods[m];
          const col=probaColor(s.reliable?s.passProb:50);
          const adj=(s.adjFactors||[]).slice(0,2).map(f=>f.name.split('(')[0].trim()).join(' · ');
          return`<div class="exam-mod"><div class="exam-mod-n">${modStr(m)} · ${s.nExam} Q</div>
            <div class="exam-mod-v" style="color:${col}">${s.reliable?s.passProb+'%':'—'}</div>
            <div class="exam-mod-s">${s.reliable?`≥${s.kMin}/${s.nExam} · taux ${s.rate}% · ★★+ ${s.hardRate}%`:s.n+' rep.'}<br>couv. ${s.coverage}% · ${s.weak} faibles${s.reliable&&s.passLow?` · IC ${s.passLow}–${s.passHigh}%`:''}${adj?'<br><span style="opacity:.8">'+esc(adj)+'</span>':''}</div></div>`;
        }).join('')}
      </div>
    </div>`;
}

function buildProbaDash(ex){
  const el=document.getElementById('proba-dash');
  if(!el) return;
  ex=ex||simulateExamReadiness();
  const g=ex.global;
  if(!g||g.totalT<3){
    el.innerHTML=`<div class="proba-dash"><div class="proba-dash-hd"><h2>📊 Analyse probabiliste avancée</h2></div>
      <div style="font-size:12px;color:var(--t3)">Réponds à quelques questions pour activer l'analyse multi-stats : réaction, SM-2, difficulté, tendance, comportement, couverture…</div></div>`;
    return;
  }
  const difRows=[1,2,3,4].map(d=>{
    const s=g.byDiffAll[d];
    const p=s.t?Math.round(s.ok/s.t*100):0;
    return `<div class="react-stat"><div class="react-stat-v" style="color:${probaColor(p)}">${s.t?p+'%':'—'}</div><div class="react-stat-l">${diffStr(d)} (${s.t})</div></div>`;
  }).join('');
  const snaps=(probaLog.snapshots||[]).slice(-24);
  const trendBars=snaps.map(s=>{
    const h=Math.max(4,Math.round((s.examP||30)*0.36));
    return `<div class="proba-trend-bar" style="height:${h}px;background:${probaColor(s.examP||50)}" title="P(examen) ${s.examP||'—'}%"></div>`;
  }).join('');
  const risks=(ex.riskFactors||[]).map(r=>{
    const col=r.w==='high'?'var(--red)':r.w==='mid'?'var(--amber)':'var(--green)';
    return `<div class="proba-factor"><span>${esc(r.t)}</span><span style="color:${col}">${r.w==='ok'?'✓':r.w==='high'?'!':''}</span></div>`;
  }).join('');
  el.innerHTML=`<div class="proba-dash">
    <div class="proba-dash-hd">
      <div><h2>📊 Analyse probabiliste avancée</h2>
        <div style="font-size:11px;color:var(--t3);margin-top:2px">12+ signaux · historique · SM-2 · réaction · difficulté · tendance</div></div>
      ${g.globalConf!=null?`<span class="rev-pill ok">Confiance ${g.globalConf}%</span>`:''}
    </div>
    <div class="proba-stat-grid">
      <div class="react-stat"><div class="react-stat-v" style="color:${probaColor(Math.round(g.wRate*100))}">${Math.round(g.wRate*100)}%</div><div class="react-stat-l">Précision pondérée</div></div>
      <div class="react-stat"><div class="react-stat-v">${g.reactG.n?g.reactG.avgScore+'%':'—'}</div><div class="react-stat-l">Score réact. moy.</div></div>
      <div class="react-stat"><div class="react-stat-v" style="color:var(--red)">${g.weakN}</div><div class="react-stat-l">Points faibles</div></div>
      <div class="react-stat"><div class="react-stat-v" style="color:var(--amber)">${g.sm2Due}</div><div class="react-stat-l">SM-2 en retard</div></div>
      <div class="react-stat"><div class="react-stat-v">${Math.round(g.coverage*100)}%</div><div class="react-stat-l">Couverture</div></div>
    </div>
    <div class="proba-stat-grid">${difRows}</div>
    ${snaps.length>3?`<div style="font-size:10px;color:var(--t3);margin-top:4px">Évolution P(examen) — ${snaps.length} snapshots</div><div class="proba-trend">${trendBars}</div>`:''}
    <div class="proba-factor-list">${risks||'<div class="proba-factor"><span>Aucune donnée</span><span>—</span></div>'}</div>
  </div>`;
}

function buildHomeDashboards(){
  buildReactDash();
  const ex=simulateExamReadiness();
  buildExamDash(ex);
  buildProbaDash(ex);
  const nRev=revItems().length;
  document.getElementById('h-weak').textContent=nRev;
  const hubF=document.getElementById('hub-formula-n');
  const hubR=document.getElementById('hub-fiches-n');
  const nTopics=Object.keys(initTopicKB()).length;
  if(hubF){
    const fn=typeof FORMULA_META!=='undefined'?FORMULA_META.total:(typeof FORMULAS!=='undefined'?FORMULAS.length:0);
    const fc=typeof FORMULA_META!=='undefined'?FORMULA_META.calcCount:0;
    hubF.textContent=fn+' formules'+(fc?' · '+fc+' calc':'');
  }
  if(hubR) hubR.textContent=nRev?`${nRev} à réviser · ${nTopics} thèmes`:`${nTopics} thèmes`;
}

function launchRevision(){
  revisionTopicFilter=null;
  revisionSingleIdx=null;
  document.querySelectorAll('.mc').forEach(c=>c.classList.remove('on'));
  const wmc=document.querySelector('[data-mode="weak"]');
  if(wmc) wmc.classList.add('on');
  mode='weak';
  document.getElementById('cf-mod').value='all';
  const n=Math.max(revItems().length,1);
  document.getElementById('cf-n').value=Math.min(n,200);
  launch();
}

function launchSingleQuestion(idx){
  revisionTopicFilter=null;
  revisionSingleIdx=idx;
  mode='train';
  document.querySelectorAll('.mc').forEach(c=>c.classList.remove('on'));
  document.querySelector('[data-mode="train"]')?.classList.add('on');
  launch();
}

function launchTopicReview(ref){
  revisionTopicFilter=typeof resolveTopicRef==='function'?resolveTopicRef(ref):ref;
  revisionSingleIdx=null;
  mode='train';
  document.querySelectorAll('.mc').forEach(c=>c.classList.remove('on'));
  document.querySelector('[data-mode="train"]')?.classList.add('on');
  document.getElementById('cf-mod').value='all';
  const n=typeof getTopicQuestionCount==='function'?getTopicQuestionCount(revisionTopicFilter):Q.filter(q=>q.r===ref).length;
  document.getElementById('cf-n').value=Math.max(n,1);
  launch();
}

// ═══════════════════════════════════════════════════════
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


function show(id){document.querySelectorAll('.screen').forEach(s=>s.classList.remove('on'));document.getElementById(id).classList.add('on')}
function goHome(){clearInterval(tInt);paused=false;hidePause();revisionTopicFilter=null;revisionSingleIdx=null;show('sh');upHome()}

function hidePause(){
  paused=false;
  document.getElementById('pause-ov').hidden=true;
  const bp=document.getElementById('bpause');
  if(bp){bp.textContent='⏸ Pause';bp.classList.remove('on');}
}

function togglePause(){
  if(paused){
    if(!answered) t0+=Date.now()-pauseAt;
    hidePause();
    startTimer();
  }else{
    paused=true;
    pauseAt=Date.now();
    clearInterval(tInt);
    const lim=timerLimit();
    if(lim&&!answered) timerRem=Math.max(0,lim-Math.round((Date.now()-t0)/1000));
    document.getElementById('pause-ov').hidden=false;
    const bp=document.getElementById('bpause');
    bp.textContent='▶ Reprendre';
    bp.classList.add('on');
    const tb=document.getElementById('tb');
    tb.textContent='pause';
    tb.className='tbox w';
  }
}

function startTimer(){
  clearInterval(tInt);
  const lim=timerLimit();
  const showT=getSettings().showTimer!==false;
  if(!lim||answered||paused||!showT){
    if(!lim&&!paused){
      document.getElementById('tb').textContent=mode==='exam'?'examen':'libre';
      document.getElementById('tb').className='tbox';
    }
    if(!showT&&!lim){
      document.getElementById('tb').textContent='—';
      document.getElementById('tb').className='tbox';
    }
    return;
  }
  let rem=timerRem!=null?timerRem:lim-Math.round((Date.now()-t0)/1000);
  timerRem=null;
  if(rem<=0){if(!answered)autoTO();return;}
  setTb(rem);
  tInt=setInterval(()=>{
    if(paused) return;
    rem=Math.max(0,rem-1);
    if(rem<=0){clearInterval(tInt);if(!answered)autoTO();}
    else setTb(rem);
  },1000);
}

function bankTotal(){
  if(typeof Q!=='undefined'&&Array.isArray(Q)&&Q.length) return Q.length;
  if(typeof Q_BANK_META!=='undefined'&&Q_BANK_META.total) return Q_BANK_META.total;
  return 0;
}

function setBankTotalUI(total){
  const fmt=total>0?total.toLocaleString('fr-FR'):'—';
  ['h-total','bank-total-n','bank-hero-n'].forEach(id=>{
    const el=document.getElementById(id);
    if(el) el.textContent=fmt;
  });
  const cntAll=document.getElementById('cnt-all');
  if(cntAll) cntAll.textContent=total>0?fmt+' q':'—';
  const preAll=document.getElementById('n-pre-all');
  if(preAll) preAll.textContent='Max diversité';
  const sub=document.getElementById('h-sub');
  if(sub&&total>0) sub.textContent=fmt+' questions · tirage qualité & diversité · simulateur binomial · réaction · fiches SM-2.';
  const modEl=document.getElementById('bank-hero-mod');
  if(modEl&&total>0){
    const counts=typeof Q!=='undefined'&&Array.isArray(Q)
      ?{C:0,A:0,M:0,R:0}
      :(Q_BANK_META?.counts||{});
    if(typeof Q!=='undefined'&&Array.isArray(Q)){
      Q.forEach(q=>{if(counts[q.m]!=null)counts[q.m]++;});
    }
    modEl.innerHTML=['C','A','M','R'].map(m=>`<span>${m} ${(counts[m]||0).toLocaleString('fr-FR')}</span>`).join('');
  }
}

function upHomeHeavy(){
  try{
    initQIdx();
    if(typeof Q!=='undefined'&&Array.isArray(Q)){
      const modCounts=getModBankCounts();
      ['C','A','M','R'].forEach(m=>{
        const el=document.getElementById('cnt-'+m.toLowerCase());
        if(el) el.textContent=(modCounts[m]||0).toLocaleString('fr-FR')+' q';
      });
    }else if(Q_BANK_META?.counts){
      ['C','A','M','R'].forEach(m=>{
        const el=document.getElementById('cnt-'+m.toLowerCase());
        if(el) el.textContent=(Q_BANK_META.counts[m]||0).toLocaleString('fr-FR')+' q';
      });
    }
    buildHomeDashboards();
    updateDistPreview();
  }catch(e){console.warn('upHome:',e);}
}

function upHome(opts={}){
  let total=0;
  try{total=bankTotal();}catch(e){total=Q_BANK_META?.total||0;}
  setBankTotalUI(total);
  const done=Object.keys(hist).length, ok=Object.values(hist).filter(Boolean).length;
  const hDone=document.getElementById('h-done');
  const hOk=document.getElementById('h-ok');
  const hPct=document.getElementById('h-pct');
  const hReact=document.getElementById('h-react');
  if(hDone) hDone.textContent=done;
  if(hOk) hOk.textContent=ok;
  if(hPct) hPct.textContent=done>0?Math.round(ok/done*100)+'%':'—';
  const rs=getReactStats();
  if(hReact) hReact.textContent=rs.n?rs.avgScore+'%':'—';
  if(opts.lite) return;
  if(opts.deferHeavy){
    const run=()=>upHomeHeavy();
    if(typeof requestIdleCallback==='function') requestIdleCallback(run,{timeout:1500});
    else setTimeout(run,60);
    return;
  }
  upHomeHeavy();
}

const EXAM_WEIGHTS={C:9,A:15,M:20,R:20};
const MOD_ORDER=['C','A','M','R'];

function poolForModule(m,dif){
  return Q.filter(q=>q.m===m&&(dif==='all'||q.d===parseInt(dif)));
}

let QIDX=null;
function initQIdx(){
  if(QIDX) return;
  QIDX=new Map();
  Q.forEach((q,i)=>QIDX.set(q,i));
}
function qIdx(q){initQIdx();return QIDX.get(q);}

// ─── Diversité par répétition (qualité > quantité) ───
const DIVERSITY_RECENT_MAX=220;
const MAX_PER_FAMILY_SESSION=1;
let diversityLog={recent:[],seenIdx:{}}, sessionRecycle=false;
try{diversityLog=JSON.parse(localStorage.getItem('ppl4div')||'{"recent":[],"seenIdx":{}}')}catch(e){}
if(!diversityLog.recent) diversityLog.recent=[];
if(!diversityLog.seenIdx) diversityLog.seenIdx={};

function saveDiversityLog(){if(!canPersist('diversity'))return;lsSet('ppl4div',diversityLog);}

function templateKey(q){
  return String(q.q||'')
    .replace(/FL\d+/gi,'FL#')
    .replace(/\d+(?:[.,]\d+)?/g,'#')
    .replace(/\s+/g,' ').trim().toLowerCase().slice(0,96);
}

function topicKey(q){return String(q.r||'?').toLowerCase();}
function familyKey(q){return topicKey(q)+'::'+templateKey(q);}

function ensureFamilySizes(){
  if(_familySizeMap) return _familySizeMap;
  _familySizeMap=new Map();
  if(typeof Q!=='undefined'&&Array.isArray(Q)){
    Q.forEach(q=>{
      const fk=familyKey(q);
      _familySizeMap.set(fk,(_familySizeMap.get(fk)||0)+1);
    });
  }
  return _familySizeMap;
}

function familySize(fk){
  return ensureFamilySizes().get(fk)||0;
}

function trackDiversity(q,idx){
  const fk=familyKey(q), topic=topicKey(q);
  diversityLog.recent.push({fk,topic,idx,ts:Date.now()});
  if(diversityLog.recent.length>DIVERSITY_RECENT_MAX) diversityLog.recent=diversityLog.recent.slice(-DIVERSITY_RECENT_MAX);
  diversityLog.seenIdx[idx]=(diversityLog.seenIdx[idx]||0)+1;
  saveDiversityLog();
}

function recentFamilyWeight(fk){
  const r=diversityLog.recent||[];
  let w=0;
  for(let i=r.length-1;i>=0;i--){
    if(r[i].fk===fk) w+=Math.max(2,40-Math.floor((r.length-1-i)/2));
  }
  return w;
}

function recentTopicWeight(tk){
  const r=diversityLog.recent||[];
  let w=0;
  for(let i=r.length-1;i>=0;i--){
    if(r[i].topic===tk) w+=Math.max(2,24-Math.floor((r.length-1-i)/4));
  }
  return w;
}

function diversePool(candidates){
  if(!candidates.length) return [];
  const byFam=new Map();
  candidates.forEach(q=>{
    const fk=familyKey(q);
    if(!byFam.has(fk)) byFam.set(fk,{fk,qs:[]});
    byFam.get(fk).qs.push(q);
  });
  const out=[];
  byFam.forEach(fam=>{
    fam.qs.sort((a,b)=>{
      const ia=qIdx(a),ib=qIdx(b);
      const rank=v=>hist[v]===undefined?0:hist[v]===false?1:2;
      const ra=rank(ia),rb=rank(ib);
      if(ra!==rb) return ra-rb;
      return (diversityLog.seenIdx[ia]||0)-(diversityLog.seenIdx[ib]||0)||Math.random()-0.5;
    });
    out.push(fam.qs[0]);
  });
  return prioritizeStudyPool(out);
}

function countDiversePool(m,dif){
  const pool=poolForModule(m,dif);
  const fresh=pool.filter(q=>hist[qIdx(q)]!==true);
  const base=fresh.length?fresh:pool;
  return diversePool(base).length;
}

function pickDiverseQuestions(candidates,count){
  if(!candidates.length||count<=0) return [];
  count=Math.min(count,candidates.length);

  const byTopic=new Map();
  candidates.forEach(q=>{
    const tk=topicKey(q);
    if(!byTopic.has(tk)) byTopic.set(tk,{topic:tk,families:new Map()});
    const fk=familyKey(q);
    const fam=byTopic.get(tk).families;
    if(!fam.has(fk)) fam.set(fk,{fk,qs:[]});
    fam.get(fk).qs.push(q);
  });

  byTopic.forEach(topic=>{
    topic.families.forEach(fam=>{
      fam.qs.sort((a,b)=>{
        const ia=qIdx(a),ib=qIdx(b);
        const sa=diversityLog.seenIdx[ia]||0,sb=diversityLog.seenIdx[ib]||0;
        if(sa!==sb) return sa-sb;
        return Math.random()-0.5;
      });
    });
    topic.familiesArr=[...topic.families.values()].sort((a,b)=>
      recentFamilyWeight(a.fk)-recentFamilyWeight(b.fk)||Math.random()-0.5);
    topic.topicPrio=recentTopicWeight(topic.topic);
  });

  const topics=[...byTopic.values()].sort((a,b)=>a.topicPrio-b.topicPrio||Math.random()-0.5);
  const picked=[], usedIdx=new Set(), usedFam=new Set();

  let round=0;
  while(picked.length<count){
    let added=false;
    for(const topic of topics){
      if(picked.length>=count) break;
      const fams=topic.familiesArr.filter(f=>f.qs.length>0&&!usedFam.has(f.fk));
      if(!fams.length) continue;
      fams.sort((a,b)=>recentFamilyWeight(a.fk)-recentFamilyWeight(b.fk));
      const fam=fams[round<fams.length?round:0];
      while(fam.qs.length){
        const q=fam.qs.shift();
        const idx=qIdx(q), fk=familyKey(q);
        if(idx!=null&&usedIdx.has(idx)) continue;
        if(usedFam.has(fk)) continue;
        if(idx!=null) usedIdx.add(idx);
        usedFam.add(fk);
        picked.push(q);
        added=true;
        break;
      }
    }
    if(!added){
      for(const q of candidates){
        if(picked.length>=count) break;
        const idx=qIdx(q), fk=familyKey(q);
        if(idx!=null&&usedIdx.has(idx)) continue;
        if(usedFam.has(fk)) continue;
        if(idx!=null) usedIdx.add(idx);
        usedFam.add(fk);
        picked.push(q);
        added=true;
      }
      if(!added) break;
    }
    round++;
  }

  return interleaveByTopic(picked.slice(0,count));
}

function interleaveByTopic(arr){
  if(arr.length<=1) return arr;
  const result=[], rest=[...arr];
  let lastTopic=null;
  while(rest.length){
    let i=rest.findIndex(q=>topicKey(q)!==lastTopic);
    if(i<0) i=0;
    const q=rest.splice(i,1)[0];
    lastTopic=topicKey(q);
    result.push(q);
  }
  return result;
}

function diversityLabel(q){
  const fk=familyKey(q), n=familySize(fk);
  if(n<=1) return '';
  const seen=(diversityLog.seenIdx[qIdx(q)]||0)+1;
  return `🔄 variante · ${n} angles possibles · passage ${seen}`;
}

function isRevSession(){
  return mode==='weak'||revisionTopicFilter!=null||revisionSingleIdx!=null;
}

function studyPool(candidates){
  if(isRevSession()) return candidates;
  const fresh=candidates.filter(q=>hist[qIdx(q)]!==true);
  return diversePool(fresh.length?fresh:candidates);
}

function poolIsRecycling(candidates){
  if(isRevSession()) return false;
  return candidates.length>0&&candidates.every(q=>hist[qIdx(q)]===true);
}

function prioritizeStudyPool(candidates){
  return [...candidates].sort((a,b)=>{
    const ia=qIdx(a),ib=qIdx(b);
    const rank=v=>hist[v]===undefined?0:hist[v]===false?1:2;
    const ra=rank(ia),rb=rank(ib);
    if(ra!==rb) return ra-rb;
    const sa=diversityLog.seenIdx[ia]||0,sb=diversityLog.seenIdx[ib]||0;
    if(sa!==sb) return sa-sb;
    return recentFamilyWeight(familyKey(a))-recentFamilyWeight(familyKey(b))||Math.random()-0.5;
  });
}

function countStudyPool(m,dif){
  return studyPool(poolForModule(m,dif)).length;
}

function countFreshPool(m,dif){
  return poolForModule(m,dif).filter(q=>hist[qIdx(q)]!==true).length;
}

function countDiverseMaxAll(dif){
  return MOD_ORDER.reduce((s,m)=>s+countDiversePool(m,dif),0);
}

function distributeCount(n,mods,weights){
  const wSum=mods.reduce((s,m)=>s+weights[m],0);
  const counts={};
  let used=0;
  const rem=[];
  mods.forEach(m=>{
    const exact=n*weights[m]/wSum;
    counts[m]=Math.floor(exact);
    used+=counts[m];
    rem.push({m,f:exact-Math.floor(exact)});
  });
  rem.sort((a,b)=>b.f-a.f);
  for(let i=0;i<n-used;i++) counts[rem[i%rem.length].m]++;
  return counts;
}

function getSessionPlan(){
  const mod=document.getElementById('cf-mod').value;
  const dif=document.getElementById('cf-dif').value;
  let n=parseInt(document.getElementById('cf-n').value,10);
  if(isNaN(n)||n<0) n=64;

  if(mod!=='all'){
    const avail=countStudyPool(mod,dif);
    const take=n===0?avail:Math.min(n,avail);
    return {total:take, counts:{[mod]:take}, mods:[mod], allModules:false};
  }

  const avail={};
  MOD_ORDER.forEach(m=>{avail[m]=countStudyPool(m,dif);});
  const maxDiverse=countDiverseMaxAll(dif);

  if(n===0){
    return {total:maxDiverse, counts:distributeCount(maxDiverse,MOD_ORDER,EXAM_WEIGHTS), mods:MOD_ORDER, allModules:true, diverseCap:true};
  }

  n=Math.min(n,maxDiverse);
  const counts=distributeCount(n,MOD_ORDER,EXAM_WEIGHTS);
  MOD_ORDER.forEach(m=>{
    if(counts[m]>avail[m]) counts[m]=avail[m];
  });
  let sum=MOD_ORDER.reduce((s,m)=>s+counts[m],0);
  if(sum<n){
    const need=n-sum;
    const order=[...MOD_ORDER].sort((a,b)=>avail[b]-counts[b]-(avail[a]-counts[a]));
    for(let i=0;i<need;i++){
      const m=order[i%order.length];
      if(counts[m]<avail[m]){counts[m]++;sum++;}
    }
  }
  return {total:sum, counts, mods:MOD_ORDER, allModules:true};
}

function updateDistPreview(){
  const plan=getSessionPlan();
  const mod=document.getElementById('cf-mod').value;
  const inp=document.getElementById('cf-n');
  inp.max=plan.allModules?MOD_ORDER.reduce((s,m)=>s+countStudyPool(m,document.getElementById('cf-dif').value),0):countStudyPool(mod,document.getElementById('cf-dif').value);

  const labels={C:'Communications',A:'Aéronef',M:'Météorologie',R:'Réglementation'};
  const pct=(m,c)=>plan.total?Math.round(c/plan.total*100):0;
  const dif=document.getElementById('cf-dif').value;
  const rev=isRevSession();
  const recycling=!rev&&MOD_ORDER.some(m=>poolIsRecycling(poolForModule(m,dif)));
  const bankTotalN=bankTotal().toLocaleString('fr-FR');
  const poolHint=rev?' · révisions ciblées':recycling?' · recyclage (1 variante/thème max)':' · 1 famille/thème max · jamais vues en priorité';

  if(plan.allModules){
    document.getElementById('dist-preview').innerHTML=
      `<b>${plan.total.toLocaleString('fr-FR')} questions</b> / ${bankTotalN} en banque — répartition examen (9 · 15 · 20 · 20)${poolHint}<br>`+
      MOD_ORDER.map(m=>{
        const c=plan.counts[m]||0;
        const rest=countStudyPool(m,dif);
        const fresh=countFreshPool(m,dif);
        const extra=rev?'':fresh<rest?` · ${fresh} nouvelles · ${rest-fresh} variantes`:` · ${rest} dispo.`;
        return `<div class="dist-row"><span class="dist-lbl">${labels[m]}</span><span class="dist-val">${c} q · ${pct(m,c)}%${extra}</span></div>`;
      }).join('');
    MOD_ORDER.forEach(m=>{
      const el=document.getElementById('plan-'+m.toLowerCase());
      if(el) el.textContent=(plan.counts[m]||0)+' q';
    });
    document.getElementById('dist-pills').style.display='grid';
  }else{
    const m=plan.mods[0];
    const rest=countStudyPool(m,dif);
    const fresh=countFreshPool(m,dif);
    const rec=poolIsRecycling(poolForModule(m,dif));
    document.getElementById('dist-preview').innerHTML=
      `<b>${plan.total.toLocaleString('fr-FR')} questions</b> / ${bankTotalN} en banque — module : ${labels[m]}${poolHint}${rev?'':rec?` · recyclage (${fresh} nouvelles restantes)`:` · ${rest} restantes`}`;
    MOD_ORDER.forEach(x=>{
      const el=document.getElementById('plan-'+x.toLowerCase());
      if(el) el.textContent=x===m?(plan.total+' q'):'—';
    });
    document.getElementById('dist-pills').style.display='grid';
  }
  const preAll=document.getElementById('n-pre-all');
  if(preAll) preAll.textContent=`Max diversité (${countDiverseMaxAll(dif).toLocaleString('fr-FR')})`;
}

document.getElementById('cf-n').addEventListener('input',()=>{
  document.querySelectorAll('.n-pre').forEach(b=>b.classList.remove('on'));
  updateDistPreview();
});
document.getElementById('cf-mod').addEventListener('change',updateDistPreview);
document.getElementById('cf-dif').addEventListener('change',updateDistPreview);
document.getElementById('n-presets').addEventListener('click',e=>{
  const btn=e.target.closest('.n-pre');
  if(!btn) return;
  document.querySelectorAll('.n-pre').forEach(b=>b.classList.remove('on'));
  btn.classList.add('on');
  document.getElementById('cf-n').value=btn.dataset.n;
  updateDistPreview();
});

document.getElementById('mgg').addEventListener('click',e=>{
  const mc=e.target.closest('.mc');
  if(!mc) return;
  document.querySelectorAll('.mc').forEach(c=>c.classList.remove('on'));
  mc.classList.add('on');
  mode=mc.dataset.mode;
  updateDistPreview();
});

function buildQueue(plan,dif){
  let pool=[];
  const revMode=isRevSession();
  for(const m of plan.mods){
    const cnt=plan.counts[m]||0;
    if(cnt<=0) continue;
    let mp=poolForModule(m,dif);
    if(revisionSingleIdx!=null){
      const sq=Q[revisionSingleIdx];
      if(sq&&sq.m===m) return {pool:[sq]};
      continue;
    }
    if(mode==='weak'){
      const revIdx=new Set(revItems().map(i=>i.idx));
      mp=mp.filter(q=>{
        const idx=qIdx(q);
        return weak.has(idx)||revIdx.has(idx);
      });
    }else if(revisionTopicFilter){
      const ref=resolveTopicRef(revisionTopicFilter);
      mp=mp.filter(q=>matchTopic(q.r,ref));
      if(!mp.length) return {error:`Aucune question pour le thème « ${revisionTopicFilter} ».`};
    }else{
      mp=studyPool(mp);
    }
    mp=prioritizeStudyPool(mp);
    if(mp.length<cnt){
      if(revMode&&mp.length>0){
        pool.push(...pickDiverseQuestions(mp,mp.length));
        continue;
      }
      const mastered=poolForModule(m,dif).length-mp.length;
      const hint=mastered>0&&!revMode?` (${mastered} déjà réussies — active le recyclage diversifié)`:'';
      return {error:`Pas assez de questions ${modStr(m)} (${mp.length}/${cnt})${hint}.`};
    }
    pool.push(...pickDiverseQuestions(mp,cnt));
  }
  sessionRecycle=pool.some(q=>hist[qIdx(q)]===true);
  return {pool:(mode==='exam'&&plan.allModules)?pool:interleaveByTopic(pool)};
}

function launch(){
  const dif=document.getElementById('cf-dif').value;
  let plan=getSessionPlan();
  if(revisionSingleIdx!=null){
    const sq=Q[revisionSingleIdx];
    if(!sq){alert('Question introuvable.');revisionSingleIdx=null;return;}
    plan={total:1,counts:{[sq.m]:1},mods:[sq.m],allModules:false};
  }
  const built=buildQueue(plan,dif);
  if(built.error){alert(built.error);return;}
  if(!built.pool.length){alert('Aucune question pour ces critères.');return;}
  sessionPlan=plan;
  queue=built.pool; qi=0; answered=false; paused=false; timerRem=null; sData=[]; sesHist=[];
  hidePause(); show('sq'); renderQ();
}

function getSettings(){return window.PPLSettings?.get?.()||window.PPLSettings?.load?.()||{};}

function buildOptOrder(n,shuffle){
  const a=Array.from({length:n},(_,i)=>i);
  if(!shuffle) return a;
  for(let i=n-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]];}
  return a;
}

function clearAutoAdvance(){
  if(autoAdvTimer){clearTimeout(autoAdvTimer);autoAdvTimer=null;}
}

function scheduleAutoAdvance(){
  clearAutoAdvance();
  const s=getSettings();
  const sec=s.autoAdvance==='2'?2:s.autoAdvance==='4'?4:0;
  if(!sec||!answered) return;
  autoAdvTimer=setTimeout(()=>{
    autoAdvTimer=null;
    const btn=document.getElementById('bnxt');
    if(btn&&btn.style.display!=='none') btn.click();
  },sec*1000);
}

function timerLimit(){ return{exam:null,speed:25,train:null,weak:null}[mode]; }

function renderQ(){
  clearAutoAdvance();
  const q=queue[qi];
  const pct=Math.round(qi/queue.length*100);
  document.getElementById('qpf').style.width=pct+'%';
  document.getElementById('qct').textContent=(qi+1)+'/'+queue.length;
  document.getElementById('bnxt').style.display='none';
  document.getElementById('bsk').style.display='block';
  answered=false; paused=false; timerRem=null; t0=Date.now();
  hidePause();
  clearInterval(tInt);
  startTimer();
  const shuffle=getSettings().shuffleOptions;
  curOptOrder=buildOptOrder(q.o.length,shuffle);
  
  document.getElementById('qa').innerHTML=`
    <div class="qcard">
      <div class="qmeta">
        <span class="bd ${modClass(q.m)}">${modStr(q.m)}</span>
        <span class="bd ${diffClass(q.d)}">${diffStr(q.d)}</span>
        ${mode==='exam'?'<span class="bd bd-ex">EXAM</span>':''}
        ${sessionRecycle?'<span class="bd" style="border-color:var(--acc);color:var(--acc)">VARIANTES</span>':''}
        <span class="qnum">#${qi+1}</span>
      </div>
      <div class="qtext">${q.q}</div>
      ${diversityLabel(q)?`<div style="font-size:10px;color:var(--t3);margin:-.35rem 0 .5rem">${diversityLabel(q)}</div>`:''}
      <div class="opts">
        ${curOptOrder.map((oi,di)=>`<button class="opt" id="o${di}" onclick="doAns(${di})"><span class="olet">${String.fromCharCode(65+di)}</span><span class="otxt">${q.o[oi]}</span></button>`).join('')}
      </div>
      <div id="fb"></div>
    </div>`;
  QBehavior.reset();
  QBehavior.attach();
  startReactLive(q.d);
}

function setTb(v){
  const el=document.getElementById('tb');
  el.textContent=v+'s';
  el.className='tbox'+(v<=8?' d':v<=18?' w':'');
}

function autoTO(){
  answered=true;
  stopReactLive();
  const q=queue[qi];
  const correctDisp=curOptOrder?curOptOrder.indexOf(q.a):q.a;
  document.querySelectorAll('.opt').forEach(b=>b.disabled=true);
  if(correctDisp>=0) document.getElementById('o'+correctDisp).classList.add('sh');
  const el=(Date.now()-t0)/1000;
  const beh=QBehavior.snapshot(-1,q.a);
  record(false,el,beh); showFb(false,q,el,beh);
  document.getElementById('bnxt').style.display='block';
  document.getElementById('bsk').style.display='none';
  scheduleAutoAdvance();
}

function doAns(i){
  if(answered||paused) return;
  clearInterval(tInt);
  stopReactLive();
  answered=true;
  const q=queue[qi];
  const el=(Date.now()-t0)/1000;
  const realIdx=curOptOrder?curOptOrder[i]:i;
  const ok=realIdx===q.a;
  const beh=QBehavior.snapshot(realIdx,q.a);
  document.querySelectorAll('.opt').forEach(b=>b.disabled=true);
  document.getElementById('o'+i).classList.add(ok?'ok':'ko');
  if(!ok){
    const correctDisp=curOptOrder?curOptOrder.indexOf(q.a):q.a;
    if(correctDisp>=0) document.getElementById('o'+correctDisp).classList.add('sh');
  }
  record(ok,el,beh); showFb(ok,q,el,beh);
  document.getElementById('bnxt').style.display='block';
  document.getElementById('bsk').style.display='none';
  scheduleAutoAdvance();
}

function record(ok,el,beh){
  const q=queue[qi];
  const idx=qIdx(q);
  if(idx==null) return;
  hist[idx]=ok;
  if(!ok) weak.add(idx); else weak.delete(idx);
  const reactRes=reactionEngine(ok,q.d,beh);
  const probaRes=calcProba(ok,el,q.d,sesHist.slice(0,-1),beh,{q,idx,qi,total:queue.length});
  trackAnswerLog(ok,el,beh,reactRes,probaRes,q,idx,qi);
  trackReactLog(ok,q.d,beh,reactRes,q,idx,el);
  trackRevision(ok,el,beh,idx,q);
  if(!ok&&typeof PPLSessionFiches!=='undefined'&&PPLSessionFiches.archiveError&&canPersist('fiches')){
    PPLSessionFiches.archiveError({q,idx,ok:false,el,beh,reactScore:reactRes.score,mode});
  }
  save();
  if(window.PPLStorage) PPLStorage.flushNow();
  invalidateExamCache();
  trackProbaSnapshot();
  trackDiversity(q,idx);
  sesHist.push(ok);
  sData.push({q,ok,el,idx,beh:beh||{},reactScore:reactRes.score,reactRes});
}

function fmtBeh(beh){
  if(!beh||!(beh.totalMs||beh.reactionSec)) return '';
  const totalS=beh.totalSec||(beh.totalMs?beh.totalMs/1000:beh.reactionSec);
  return `<div class="beh-hd">Analyse comportementale avancée (12 métriques)</div>
    <div class="beh-grid wide">
      <div class="beh-it"><span>Lecture question</span><span>${(beh.readSec||0).toFixed(1)}s</span></div>
      <div class="beh-it"><span>Temps total</span><span>${totalS.toFixed(1)}s</span></div>
      <div class="beh-it"><span>Survol → clic</span><span>${(beh.chooseSec||0).toFixed(1)}s</span></div>
      <div class="beh-it"><span>Survols / vacillations</span><span>${beh.hoverSwitches||0} / ${beh.vacillations||0}</span></div>
      <div class="beh-it"><span>Mauvaises options</span><span>${beh.wrongHoverCount||0} (${Math.round((beh.wrongDwellRatio||0)*100)}% temps)</span></div>
      <div class="beh-it"><span>Dwell bonne rép.</span><span>${Math.round((beh.dwellChosen||0)/100)/10}s</span></div>
      <div class="beh-it"><span>Distance souris</span><span>${beh.moveDist||0}px</span></div>
      <div class="beh-it"><span>Vitesse max / σ</span><span>${beh.maxVel||0} / ${beh.velStd||0}</span></div>
      <div class="beh-it"><span>Décisivité</span><span>${Math.round((beh.decisiveness||0)*100)}%</span></div>
      <div class="beh-it"><span>Pertes de focus</span><span>${beh.blurCount||0}</span></div>
      <div class="beh-it"><span>Scroll</span><span>${beh.scrollCount||0}</span></div>
      <div class="beh-it"><span>Indice stress</span><span>${beh.jitter>40||beh.velStd>100?'élevé':beh.jitter>25?'moyen':'faible'}</span></div>
    </div>`;
}

function fmtReactHero(reactRes,beh){
  if(!reactRes||!beh) return '';
  const col=probaColor(reactRes.score);
  const circ=2*Math.PI*28,off=circ*(1-reactRes.score/100);
  const sweet=reactRes.reactSweet||[3,35];
  const totalSec=beh.totalSec||(beh.totalMs?beh.totalMs/1000:((beh.readSec||0)+(beh.chooseSec||0)));
  return`<div class="react-hero">
    <div class="react-ring">
      <svg width="72" height="72" viewBox="0 0 72 72">
        <circle cx="36" cy="36" r="28" fill="none" stroke="${col}22" stroke-width="5"/>
        <circle cx="36" cy="36" r="28" fill="none" stroke="${col}" stroke-width="5"
          stroke-dasharray="${circ}" stroke-dashoffset="${off}" stroke-linecap="round"/>
      </svg>
      <div class="react-ring-ctr"><div class="react-ring-v" style="color:${col}">${reactRes.score}</div><div class="react-ring-l">Réaction</div></div>
    </div>
    <div class="react-hero-txt">
      <strong>${reactRes.label}</strong>
      Fenêtre idéale ${sweet[0]}–${sweet[1]}s (temps total) · ${(reactRes.tags||[]).join(' · ')||'—'}
      <div class="react-phases">
        <div class="react-ph"><em>Lecture</em><span>${(beh.readSec||0).toFixed(1)}s</span></div>
        <div class="react-ph"><em>Choix</em><span>${(beh.chooseSec||0).toFixed(1)}s</span></div>
        <div class="react-ph"><em>Total</em><span>${totalSec.toFixed(1)}s</span></div>
      </div>
    </div>
  </div>`;
}

function fmtProbaBreakdown(res){
  if(!res.factors||!res.factors.length) return '';
  const rows=res.factors.map(f=>`<div class="pf-row${f.reactMain?' react-main':''}"><span>${f.name}</span><span class="${f.type||'neu'}">${f.value>=0?'+':''}${f.value}</span></div>`).join('');
  return`<div class="proba-breakdown"><div class="pf-hd">Maîtrise estimée (${res.factors.length} facteurs)</div>${rows}
    <div class="pf-total"><span>Score réaction</span><span style="color:${probaColor(res.reactScore||50)}">${res.reactScore||50}%</span></div>
    <div class="pf-total"><span>Maîtrise thème (P bonne rép.)</span><span style="color:${probaColor(res.p)}">${res.p}%</span></div>
    ${res.examImpact!=null?`<div class="pf-total"><span>Impact P(examen) module</span><span style="color:${res.examImpact>=0?'var(--green)':'var(--red)'}">${res.examImpact>=0?'+':''}${res.examImpact} pts</span></div>`:''}
    <div class="pf-range">Intervalle de confiance : ${res.pLow}% – ${res.pHigh}% (±${res.uncertainty})</div>
    <div class="conf-meter"><span style="font-size:10px;color:var(--t3);white-space:nowrap">Confiance cognitive</span>
      <div class="conf-bar"><div class="conf-bar-fi" style="width:${res.confIdx}%;background:${probaColor(res.confIdx)}"></div></div>
      <span style="font-family:'DM Mono',monospace;font-size:11px;color:${probaColor(res.confIdx)}">${res.confIdx}%</span></div>
  </div>`;
}

function showFb(ok,q,el,beh){
  const idx=qIdx(q);
  const res=calcProba(ok,el,q.d,sesHist.slice(0,-1),beh,{q,idx,qi,total:queue.length});
  const p=res.p,pc=probaClass(p);
  const examSim=simulateExamReadiness();
  const modPass=examSim.mods[q.m]?.passProb;
  const examTag=examSim.reliable&&examSim.examP!=null
    ?`<span class="proba-tag ${probaClass(examSim.examP)}" title="Probabilité estimée de réussir les 4 épreuves (≥75% chacune) — basée sur précision globale, réaction et couverture par matière">P(examen) ${examSim.examP}%</span>`
    :`<span class="proba-tag proba-tag-muted" title="Minimum ${EXAM_MIN_ANSWERS_GLOBAL} réponses pour estimer">P(examen) · ${examSim.totalT||0}/${EXAM_MIN_ANSWERS_GLOBAL} rép.</span>`;
  const tlim={1:12,2:22,3:38,4:55}[q.d];
  const r=el/tlim;
  const tl=r<0.35?'⚡ Très rapide':r<0.7?'✓ Rapide':r<1.1?'◎ Normal':'○ Long';
  const chosenIdx=beh?.chosenIdx??-1;
  const lastEntry=answerLog.items[answerLog.items.length-1];
  const statsHref=`stats.html?i=${idx>=0?idx:''}&t=${lastEntry?.t||Date.now()}`;
  let ansBlock='';
  if(!ok){
    if(chosenIdx>=0) ansBlock+=`<div class="fb-ans fb-wrong">✗ Ta réponse : ${esc(q.o[chosenIdx])}</div>`;
    ansBlock+=`<div class="fb-ans fb-correct">✓ Bonne réponse : ${esc(q.o[q.a])}</div>`;
  }

  const ficheSlot=!ok?`<div class="fb-fiche-wrap" id="fb-fiche-slot"><div class="fiche-lazy-spin">Préparation de la fiche…</div></div>`:'';

  document.getElementById('fb').innerHTML=`
    <div class="fb ${ok?'ok':'ko'} fb-brief">
      <div class="fb-hd">
        <span class="fb-st">${ok?'✓ Correct':'✗ Incorrect'} · ${el.toFixed(1)}s · ${tl}</span>
        <span class="proba-tag ${probaClass(res.reactScore||50)}" title="Rythme de lecture et de décision sur cette question">Réaction ${res.reactScore||50}%</span>
        <span class="proba-tag ${pc}" title="Estimation bayésienne sur ce thème précis (pas la probabilité d'examen)">Thème ${p}%</span>
        ${modPass!=null?`<span class="proba-tag ${probaClass(modPass)}" title="P(réussite) sur l'épreuve ${modStr(q.m)}">Épreuve ${modPass}%</span>`:''}
        ${examTag}
      </div>
      ${ansBlock}
      <div class="fb-txt fb-exp-full">${esc(q.e)}</div>
      <div class="fb-ref">📌 ${q.r}</div>
      ${ficheSlot}
      <p class="fb-end-hint">Résumé complet à la fin de la session →</p>
      <a href="${statsHref}" class="fb-stats-link" target="_blank" rel="noopener">📊 Stats détaillées de cette réponse →</a>
    </div>`;

  if(!ok&&typeof hydrateErrorFicheSlot==='function'){
    const slot=document.getElementById('fb-fiche-slot');
    hydrateErrorFicheSlot(slot,q,{idx,chosenIdx,beh,entry:revLog.entries?.[idx],logEntry:lastEntry});
  }
}

function renderSessionRecapHTML(sData){
  if(!sData.length) return '';
  const errCount=sData.filter(d=>!d.ok).length;
  const items=sData.map((d,i)=>{
    const q=d.q;
    const idx=d.idx??qIdx(q);
    const chosenIdx=d.beh?.chosenIdx??-1;
    const open=!d.ok?' open':'';
    const statsHref=`stats.html?i=${idx>=0?idx:''}`;
    return`<details class="recap-item ${d.ok?'recap-ok':'recap-ko'}"${open}>
      <summary>
        <span class="recap-num">Q${i+1}</span>
        <span class="recap-icon">${d.ok?'✓':'✗'}</span>
        <span class="recap-mod">${modStr(q.m)}</span>
        <span class="recap-title">${esc(summarizeKey(q.q))}</span>
        <span class="recap-meta">${d.el.toFixed(1)}s</span>
      </summary>
      <div class="recap-body">
        <p class="recap-question">${esc(q.q)}</p>
        ${!d.ok&&chosenIdx>=0?`<p class="recap-wrong">✗ Ta réponse : <strong>${esc(q.o[chosenIdx])}</strong></p>`:''}
        <p class="recap-correct">✓ Bonne réponse : <strong>${esc(q.o[q.a])}</strong></p>
        <div class="recap-exp">${esc(q.e)}</div>
        <div class="recap-ref">📌 ${esc(q.r)}</div>
        ${!d.ok?(typeof renderQuestionErrorFicheHTML==='function'?renderQuestionErrorFicheHTML(q,{idx,chosenIdx,beh:d.beh,entry:revLog.entries?.[idx]}):renderDeepFicheHTML(q,revLog.entries?.[idx],chosenIdx,d.beh)):''}
        <a href="${statsHref}" class="fb-stats-link" target="_blank" rel="noopener">📊 Stats détaillées →</a>
      </div>
    </details>`;
  }).join('');
  return`<div class="session-recap">
    <h3>📋 Résumé détaillé de la session</h3>
    <p class="session-recap-sub">${errCount} erreur${errCount>1?'s':''} · ${sData.length-errCount} correcte${sData.length-errCount>1?'s':''} — archivé dans Fiches · <a href="fiches.html?session=1" class="session-recap-link">Résumés de session →</a> · <a href="fiches.html?errors=1" class="session-recap-link">Fiches erreur →</a></p>
    <div class="recap-list">${items}</div>
  </div>`;
}

function next(){clearAutoAdvance();qi++;if(qi>=queue.length){finish();return;}renderQ();}
function skip(){
  if(paused) return;
  const s=getSettings();
  if(s.confirmSkip!==false&&!confirm('Passer cette question sans répondre ?')) return;
  stopReactLive();clearAutoAdvance();
  if(!answered){const el=(Date.now()-t0)/1000;const q=queue[qi];const beh=QBehavior.snapshot(-1,q.a);record(false,el,beh);}
  else QBehavior.detach();
  clearInterval(tInt);qi++;if(qi>=queue.length){finish();return;}renderQ();
}

function finish(){
  clearInterval(tInt);
  stopReactLive();
  hidePause();
  show('sr');
  buildResult();
}

function buildResult(){
  const total=sData.length;
  const ok=sData.filter(d=>d.ok).length;
  const pct=total>0?Math.round(ok/total*100):0;

  const mods={};
  sData.forEach(d=>{if(!mods[d.q.m])mods[d.q.m]={ok:0,t:0};mods[d.q.m].t++;if(d.ok)mods[d.q.m].ok++;});

  const pass=mode==='exam'&&sessionPlan&&sessionPlan.allModules
    ?Object.entries(mods).every(([m,s])=>{
        const expected=sessionPlan.counts[m]||0;
        return expected<1||Math.round(s.ok/s.t*100)>=75;
      })
    :pct>=75;
  const avgT=total>0?(sData.reduce((s,d)=>s+d.el,0)/total):0;
  const avgMastery=total>0?Math.round(sData.reduce((s,d)=>s+calcProba(d.ok,d.el,d.q.d,sData.slice(0,sData.indexOf(d)).map(x=>x.ok),d.beh,{q:d.q,idx:d.idx}).p,0)/total):0;
  const examSim=simulateExamReadiness();
  const C=probaColor;

  const avgReactScore=total?Math.round(sData.reduce((s,d)=>s+(d.reactScore||reactScoreFromLogItem({ok:d.ok,diff:d.q.d,el:d.el,readSec:d.beh?.readSec,chooseSec:d.beh?.chooseSec,reactSec:d.beh?.reactionSec,decideSec:d.beh?.decisionSec})),0)/total):0;
  const maxSessionT=Math.max(0.5,...sData.map(d=>d.el||d.beh?.totalSec||0));
  const sessionReactBars=sData.map((d,i)=>{
    const rs=d.reactScore||50;
    const col=C(rs);
    const t=d.el||d.beh?.totalSec||1;
    const h=Math.max(4,Math.round(t/maxSessionT*52));
    return `<div class="ph-bar" style="height:${h}px;background:${col};opacity:${d.ok?1:.45}" title="Q${i+1}: total ${t.toFixed(1)}s · score ${rs}"></div>`;
  }).join('');
  const reactOpt=sData.filter(d=>(d.reactScore||0)>=82).length;
  const reactImp=sData.filter(d=>(d.reactRes?.tags||[]).includes('très rapide')||(d.reactRes?.tags||[]).includes('impulsif')||(d.beh?.totalMs||99999)<800).length;
  const avgDecide=total?sData.reduce((s,d)=>s+(d.beh?.decisionSec||0),0)/total:0;
  const avgReact=total?sData.reduce((s,d)=>s+(d.el||d.beh?.totalSec||0),0)/total:0;
  const avgHovers=total?sData.reduce((s,d)=>s+(d.beh?.hoverSwitches||0),0)/total:0;
  const avgWrongHover=total?sData.reduce((s,d)=>s+(d.beh?.wrongHoverCount||0),0)/total:0;
  const avgDist=total?sData.reduce((s,d)=>s+(d.beh?.moveDist||0),0)/total:0;
  const hesitant=sData.filter(d=>d.beh&&(d.beh.hoverSwitches>=3||d.beh.wrongHoverCount>=2)).length;
  const confident=sData.filter(d=>d.ok&&d.beh&&d.beh.wrongHoverCount===0&&d.beh.hoverSwitches<=1).length;
  const sessionTopics=new Set(sData.map(d=>topicKey(d.q))).size;
  const sessionFamilies=new Set(sData.map(d=>familyKey(d.q))).size;
  const divScore=total?Math.round(sessionFamilies/total*100):0;
  // Anneau SVG
  const circ=2*Math.PI*60, off=circ*(1-pct/100);
  const rc=pct>=75?'#34d3a8':pct>=50?'#f0b040':'#f06060';

  if(typeof PPLSessionFiches!=='undefined'&&total>0){
    PPLSessionFiches.archive(sData,{
      mode,
      ok,
      total,
      pct,
      errCount: total-ok,
      pass,
      avgReactScore,
      avgMastery,
      examP: examSim.reliable&&examSim.examP!=null?examSim.examP:null,
    });
  }

  // Stats par difficulté
  const difs={};
  sData.forEach(d=>{if(!difs[d.q.d])difs[d.q.d]={ok:0,t:0};difs[d.q.d].t++;if(d.ok)difs[d.q.d].ok++;});
  // Stats par temps
  const avgTok=sData.filter(d=>d.ok).length?sData.filter(d=>d.ok).reduce((s,d)=>s+d.el,0)/sData.filter(d=>d.ok).length:0;
  const avgTko=sData.filter(d=>!d.ok).length?sData.filter(d=>!d.ok).reduce((s,d)=>s+d.el,0)/sData.filter(d=>!d.ok).length:0;
  
  // Graphique probabilité par question
  const phBars=sData.map((d,i)=>{
    const p=calcProba(d.ok,d.el,d.q.d,sData.slice(0,i).map(x=>x.ok),d.beh,{q:d.q,idx:d.idx,qi:i,total}).p;
    const col=C(p);
    const h=Math.round(20+p*0.4);
    return `<div class="ph-bar" style="height:${h}px;background:${col};opacity:${d.ok?1:.5}" title="Q${i+1}: ${p}%"></div>`;
  }).join('');

  const modRows=Object.entries(mods).map(([m,s])=>{
    const p=Math.round(s.ok/s.t*100);
    const ep=mode==='exam'&&sessionPlan&&sessionPlan.allModules?` ${p>=75?'✓':'✗'}`:'';
    return`<div class="brow"><span class="brlbl">${modStr(m)}${ep}</span><div class="brtr"><div class="brfi" style="width:${p}%;background:${barColor(p)}"></div></div><span class="brv" style="color:${barColor(p)}">${s.ok}/${s.t}</span></div>`;
  }).join('');
  const difRows=Object.entries(difs).map(([d,s])=>{
    const p=Math.round(s.ok/s.t*100);
    return`<div class="brow"><span class="brlbl">${diffStr(parseInt(d))}</span><div class="brtr"><div class="brfi" style="width:${p}%;background:${barColor(p)}"></div></div><span class="brv" style="color:${barColor(p)}">${p}%</span></div>`;
  }).join('');

  document.getElementById('rc').innerHTML=`
    <div class="rh">
      <div class="rring">
        <svg width="150" height="150" viewBox="0 0 150 150">
          <circle cx="75" cy="75" r="60" fill="none" stroke="${C(pct)}15" stroke-width="14"/>
          <circle cx="75" cy="75" r="60" fill="none" stroke="${rc}" stroke-width="14"
            stroke-dasharray="${circ}" stroke-dashoffset="${off}" stroke-linecap="round"/>
        </svg>
        <div class="rctr">
          <div class="rpct" style="color:${rc}">${pct}%</div>
          <div class="rlbl">Score</div>
        </div>
      </div>
      <div><span class="rverd ${pass?'pass':'fail'}">${pass?'✓ Examen réussi (75% par épreuve)':'✗ Révisions recommandées (seuil 75% par épreuve)'}</span></div>
      <div class="rsub">${ok}/${total} correctes · Score réact. <span style="color:${C(avgReactScore)};font-weight:600">${avgReactScore}%</span> · Temps moy. ${avgReact.toFixed(1)}s · Maîtrise session : <span style="color:${C(avgMastery)};font-weight:600">${avgMastery}%</span>${examSim.reliable&&examSim.examP!=null?` · P(examen) : <span style="color:${C(examSim.examP)};font-weight:600">${examSim.examP}%</span>`:''}${mode==='exam'&&sessionPlan&&sessionPlan.allModules?' · '+MOD_ORDER.map(m=>(sessionPlan.counts[m]||0)+' '+modStr(m).split(' ')[0].toLowerCase()).join(' · '):''}</div>
    </div>
    <div class="rkpis">
      <div class="kpi-c g"><div class="kpi-v" style="color:${C(avgReactScore)}">${avgReactScore}%</div><div class="kpi-l">Score réaction</div></div>
      <div class="kpi-c"><div class="kpi-v">${avgReact.toFixed(1)}s</div><div class="kpi-l">Temps moy.</div></div>
      <div class="kpi-c"><div class="kpi-v" style="color:var(--green)">${reactOpt}</div><div class="kpi-l">Optimales</div></div>
      <div class="kpi-c"><div class="kpi-v" style="color:var(--red)">${reactImp}</div><div class="kpi-l">Impulsives</div></div>
      <div class="kpi-c"><div class="kpi-v" style="color:${rc}">${pct}%</div><div class="kpi-l">Score QCM</div></div>
      <div class="kpi-c"><div class="kpi-v" style="color:${C(avgMastery)}">${avgMastery}%</div><div class="kpi-l">Maîtrise sess.</div></div>
      <div class="kpi-c"><div class="kpi-v" style="color:${examSim.reliable&&examSim.examP!=null?C(examSim.examP):'var(--t3)'}">${examSim.reliable&&examSim.examP!=null?examSim.examP+'%':'—'}</div><div class="kpi-l">P(examen)</div></div>
    </div>
    ${total>2?`<div class="ph-section"><h3>⚡ Temps de réaction par question (facteur prioritaire)</h3><div class="ph-bars">${sessionReactBars}</div></div>`:''}
    <div class="bkd">
      <div class="bcard"><h3>Par module</h3>${modRows||'—'}</div>
      <div class="bcard"><h3>Par difficulté</h3>${difRows||'—'}</div>
    </div>
    <div class="algo-box">
      <h3>Simulateur examen (modèle binomial)</h3>
      <div class="algo-row"><span class="algo-key">P(réussite examen complet)</span><span class="algo-val" style="color:${examSim.reliable&&examSim.examP!=null?C(examSim.examP):'var(--t3)'}">${examSim.reliable&&examSim.examP!=null?examSim.examP+'% ('+examSim.examPLow+'–'+examSim.examPHigh+'%)':'— (min. '+EXAM_MIN_ANSWERS_GLOBAL+' réponses)'}</span></div>
      <div class="algo-row"><span class="algo-key">Verdict</span><span class="algo-val">${examSim.vLabel}</span></div>
      ${MOD_ORDER.map(m=>{const s=examSim.mods[m];return`<div class="algo-row"><span class="algo-key">${modStr(m)} — P(≥${s.kMin}/${s.nExam})</span><span class="algo-val" style="color:${C(s.reliable?s.passProb:50)}">${s.reliable?s.passProb+'% (taux '+s.rate+'%)':'—'}</span></div>`;}).join('')}
      <div class="algo-row"><span class="algo-key">Score réaction session</span><span class="algo-val" style="color:${C(avgReactScore)}">${avgReactScore}%</span></div>
      <div class="algo-row"><span class="algo-key">Maîtrise moyenne session</span><span class="algo-val" style="color:${C(avgMastery)}">${avgMastery}%</span></div>
      <div class="algo-row"><span class="algo-key">Confiance moyenne (comportement)</span><span class="algo-val">${total?Math.round(sData.reduce((s,d)=>s+(calcProba(d.ok,d.el,d.q.d,[],d.beh,{q:d.q,idx:d.idx}).confIdx||0),0)/total):0}%</span></div>
      <div class="algo-row"><span class="algo-key">Diversité session (thèmes / familles)</span><span class="algo-val">${sessionTopics} thèmes · ${sessionFamilies} variantes uniques · ${divScore}% diversité${sessionRecycle?' · recyclage actif':''}</span></div>
      <div class="algo-row"><span class="algo-key">Réponses confiantes / hésitantes</span><span class="algo-val"><span style="color:var(--green)">${confident}</span> / <span style="color:var(--red)">${hesitant}</span></span></div>
      <div class="algo-row"><span class="algo-key">Survols · mauvaises options · distance</span><span class="algo-val">${avgHovers.toFixed(1)} · ${avgWrongHover.toFixed(1)} · ${Math.round(avgDist)}px</span></div>
      <div class="algo-row"><span class="algo-key">Vacillations totales</span><span class="algo-val">${sData.reduce((s,d)=>s+(d.beh?.vacillations||0),0)}</span></div>
      <div class="algo-row"><span class="algo-key">Tps correctes / incorrectes</span><span class="algo-val" style="color:var(--green)">${avgTok.toFixed(1)}s</span> / <span style="color:var(--red)">${avgTko.toFixed(1)}s</span></div>
    </div>
    ${total>3?`<div class="ph-section"><h3>Maîtrise par question (session)</h3><div class="ph-bars">${phBars}</div></div>`:''}
    ${renderSessionRecapHTML(sData)}`;
  const recapRoot=document.getElementById('rc');
  if(window.PPLFormulasLazy) PPLFormulasLazy.hydrateFicheFormulaSlots(recapRoot);
  if(sData.some(d=>!d.ok)){
    if(window.PPLFicheEnrichLazy) PPLFicheEnrichLazy.ensureFicheEnrich().catch(()=>{});
    if(window.PPLFormulasLazy){
      const preload=()=>PPLFormulasLazy.ensureFormulasEngine().catch(()=>{});
      if(typeof requestIdleCallback==='function') requestIdleCallback(preload,{timeout:3500});
      else setTimeout(preload,1200);
    }
  }
}

function resetAll(){
  if(!confirm(
    'Réinitialisation COMPLÈTE ?\n\n'
    +'• Historique, scores, erreurs & points faibles\n'
    +'• Fiches d\'erreur & révisions SM-2\n'
    +'• Temps de réaction & probabilités\n'
    +'• Journal détaillé & diversité\n'
    +'• Paramètres, thème & confidentialité\n'
    +'• Code d\'accès (à ressaisir)\n\n'
    +'L\'application sera rechargée à zéro.'
  )) return;
  resetSessionState();
  resetAllMemory();
  if(typeof PPLSessionFiches!=='undefined'){
    if(PPLSessionFiches.clearErrors) PPLSessionFiches.clearErrors();
    if(PPLSessionFiches.clear) PPLSessionFiches.clear();
  }
  if(window.PPLSettings&&typeof PPLSettings.factoryReset==='function'){
    PPLSettings.factoryReset();
    return;
  }
  clearAllStorage();
  try{localStorage.removeItem('ppl4settings');}catch(e){}
  try{localStorage.removeItem('ppl4gate');}catch(e){}
  resetUIDefaults();
  location.reload();
}

function handleDeepLink(){
  const p=new URLSearchParams(location.search);
  const topic=p.get('topic');
  const modeParam=p.get('mode');
  const qParam=p.get('q');
  if(qParam!=null&&!isNaN(parseInt(qParam,10))){
    revisionSingleIdx=parseInt(qParam,10);
    revisionTopicFilter=null;
    mode='train';
    document.querySelectorAll('.mc').forEach(c=>c.classList.remove('on'));
    document.querySelector('[data-mode="train"]')?.classList.add('on');
    history.replaceState({},'',location.pathname);
    launch();
    return;
  }
  if(modeParam==='weak'){
    revisionTopicFilter=null;
    revisionSingleIdx=null;
    mode='weak';
    document.querySelectorAll('.mc').forEach(c=>c.classList.remove('on'));
    document.querySelector('[data-mode="weak"]')?.classList.add('on');
    document.getElementById('cf-mod').value='all';
    document.getElementById('cf-n').value=Math.min(Math.max(revItems().length,1),200);
    history.replaceState({},'',location.pathname);
    launch();
    return;
  }
  if(topic){
    revisionTopicFilter=resolveTopicRef(topic);
    revisionSingleIdx=null;
    mode='train';
    document.querySelectorAll('.mc').forEach(c=>c.classList.remove('on'));
    document.querySelector('[data-mode="train"]')?.classList.add('on');
    document.getElementById('cf-mod').value='all';
    const n=getTopicQuestionCount(revisionTopicFilter);
    document.getElementById('cf-n').value=Math.max(n,1);
    history.replaceState({},'',location.pathname);
    launch();
  }
}
window.addEventListener('ppl-data-erased',()=>{location.reload();});
window.addEventListener('ppl-settings-changed',()=>{
  invalidateExamCache();
  if(document.getElementById('sq')?.classList.contains('on')){
    if(!answered) startTimer();
    else scheduleAutoAdvance();
    const showT=getSettings().showTimer!==false;
    const tb=document.getElementById('tb');
    const reactBox=document.getElementById('react-live');
    if(tb) tb.style.display=showT?'':'none';
    if(reactBox) reactBox.style.display=showT?'':'none';
  }
  if(document.getElementById('react-live')&&reactLiveOn) updateReactLive();
});
window.addEventListener('ppl-privacy-consent',()=>{
  invalidateExamCache();
  upHome({deferHeavy:true});
});
document.getElementById('rc')?.addEventListener('toggle',e=>{
  if(e.target.matches&&e.target.matches('details.recap-item')&&window.PPLFormulasLazy)
    PPLFormulasLazy.hydrateFicheFormulaSlots(e.target);
},true);
function bootQuiz(){
  const hasConsent=window.PPLSettings?.hasPrivacyConsent?.();
  upHome({deferHeavy:!!hasConsent,lite:!hasConsent});
  if(hasConsent) handleDeepLink();
  else window.addEventListener('ppl-privacy-consent',()=>{handleDeepLink();},{once:true});
  if(window.PPLModuleHost) PPLModuleHost.emit('onAppReady',{page:'quiz'});
}
bootQuiz();