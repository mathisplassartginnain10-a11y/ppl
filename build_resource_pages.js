const fs = require('fs');
const path = require('path');
const dir = __dirname;
const html = fs.readFileSync(path.join(dir, 'ppl_quiz_ultra.html'), 'utf8');
const script = html.match(/<script>\s*([\s\S]*?)<\/script>\s*<\/body>/)[1];
const fullCss = fs.readFileSync(path.join(dir, 'ppl_theme.css'), 'utf8');

function slice(start, end) {
  const si = script.indexOf(start);
  if (si < 0) throw new Error('Start not found: ' + start);
  const ei = end ? script.indexOf(end, si + start.length) : script.length;
  return script.slice(si, ei < 0 ? script.length : ei);
}

// CSS ressources
const cssParts = [
  fullCss.match(/:root[\s\S]*?\.wrap\{[^}]+\}/)?.[0],
  fullCss.match(/\.noise\{[\s\S]*?\}/)?.[0],
  fullCss.match(/\.glows\{[\s\S]*?\.g2\{[^}]+\}/)?.[0],
  fullCss.match(/\.bd\{[\s\S]*?\.bd-ex\{[^}]+\}/)?.[0],
  fullCss.match(/\.rev-panel\{[\s\S]*?\.rev-bar-fi\{[^}]+\}/)?.[0],
  fullCss.match(/\.fiche-sheet\{[\s\S]*?\.fiche-const strong\{[^}]+\}/)?.[0],
  fullCss.match(/\.mastery-bar\{[\s\S]*?\.study-plan-txt strong\{[^}]+\}/)?.[0],
  fullCss.match(/\.rev-list\.tall\{[\s\S]*?\.rev-toggle\{[^}]+\}/)?.[0],
  fullCss.match(/\/\* Formules PPL \*\/[\s\S]*?\.formula-count\{[^}]+\}/)?.[0],
  fullCss.match(/\/\* Hub ressources[\s\S]*?\.resource-actions\{[^}]+\}/)?.[0],
  fullCss.match(/@media\(max-width:520px\)\{[\s\S]*?\.fiche-stats\{[^}]+\}\s*\}/)?.[0],
].filter(Boolean);
fs.writeFileSync(path.join(dir, 'ppl_resources.css'), '/* PPL Quiz — formules & fiches */\n' + cssParts.join('\n') + '\na.btn-back{text-decoration:none;display:inline-block}\n');

const storageInit = `
let hist={}, weak=new Set(), revLog={entries:{}};
try{hist=JSON.parse(localStorage.getItem('ppl4h')||'{}')}catch(e){}
try{const w=JSON.parse(localStorage.getItem('ppl4w')||'[]');weak=new Set(w)}catch(e){}
try{revLog=JSON.parse(localStorage.getItem('ppl4rev')||'{"entries":{}}')}catch(e){revLog={entries:{}}}
if(!revLog.entries) revLog.entries={};
`;

const sharedUtils = [
  "const MOD_ORDER=['C','A','M','R'];",
  'function esc(s){return String(s??\'\').replace(/&/g,\'&amp;\').replace(/</g,\'&lt;\').replace(/>/g,\'&gt;\').replace(/"/g,\'&quot;\');}',
  slice('function barColor', 'let mode='),
].join('\n');

const formulaBlock = slice('// FORMULES PPL — RÉFÉRENTIEL + CALCULATEURS', "document.getElementById('formulas-panel')?.addEventListener('click'");

const ficheBlock = [
  slice('function analyzeTraps', 'function probaPct'),
  slice('function learnObjectives', 'function buildExamDash'),
  slice('function buildFichesPanel()', 'function buildRevisionPanel'),
].join('\n').replace(
  /document\.getElementById\('h-weak'\)\.textContent=nRev;\s*/g,
  ''
).replace(
  /const hubR=document\.getElementById\('hub-fiches-n'\);\s*if\(hubR\) hubR\.textContent=[^;]+;\s*/g,
  ''
);

const fichesShared = [
  "const MOD_ORDER=['C','A','M','R'];",
  "let TOPIC_KB=null;",
  slice('const STOP_WORDS', 'const QBehavior='),
  slice('function initTopicKB()', 'function getModuleAccuracy'),
  'function bayesianRate(ok,n,priorOk=0.5,priorN=4){if(n<=0)return priorOk;const a=priorOk*priorN+ok,b=(1-priorOk)*priorN+(n-ok);return a/(a+b);}',
  'function clampProba(p){return Math.min(0.97,Math.max(0.03,p));}',
  slice('function barColor', 'let mode='),
  'function esc(s){return String(s??\'\').replace(/&/g,\'&amp;\').replace(/</g,\'&lt;\').replace(/>/g,\'&gt;\').replace(/"/g,\'&quot;\');}',
].join('\n');

const formulasPageJs = sharedUtils + '\n' + formulaBlock + `
function goQuizTopic(ref){window.location.href='ppl_quiz_ultra.html?topic='+encodeURIComponent(ref);}
function launchTopicReview(ref){ goQuizTopic(ref); }

document.getElementById('formulas-panel').addEventListener('click',e=>{
  const tab=e.target.closest('[data-ftab]');
  if(tab){formulaTab=tab.dataset.ftab;buildFormulasPanel();return;}
  const toggle=e.target.closest('[data-formula-toggle]');
  if(toggle){toggle.closest('.formula-card')?.classList.toggle('open');return;}
  const quiz=e.target.closest('[data-formula-quiz]');
  if(quiz&&quiz.dataset.formulaQuiz){launchTopicReview(quiz.dataset.formulaQuiz);return;}
});
document.getElementById('formulas-panel').addEventListener('input',e=>{
  if(e.target.id==='formula-search'){formulaSearch=e.target.value;buildFormulasPanel();return;}
  handleFormulaCalcInput(e);
});
document.addEventListener('input',e=>{if(e.target.closest('[data-calc-type]')) handleFormulaCalcInput(e);});
buildFormulasPanel();
`;

const fichesPageJs = fichesShared + storageInit + '\n' + formulaBlock + '\n' + ficheBlock + `
let revTab='library', ficheLibSearch='', ficheLibMod='all';

function goQuizTopic(ref){window.location.href='ppl_quiz_ultra.html?topic='+encodeURIComponent(ref);}
function launchTopicReview(ref){ goQuizTopic(ref); }
function launchRevision(){
  window.location.href='ppl_quiz_ultra.html?mode=weak';
}
function launchSingleQuestion(idx){
  window.location.href='ppl_quiz_ultra.html?q='+idx;
}

const revPanel=document.getElementById('rev-panel');
revPanel.addEventListener('click',e=>{
  const tab=e.target.closest('[data-rev-tab]');
  if(tab){revTab=tab.dataset.revTab;buildFichesPanel();return;}
  const fmod=e.target.closest('[data-fmod]');
  if(fmod){ficheLibMod=fmod.dataset.fmod;buildFichesPanel();return;}
  const ficheToggle=e.target.closest('[data-fiche-toggle]');
  if(ficheToggle){ficheToggle.closest('.fiche-card')?.classList.toggle('open');return;}
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
  if(e.target.id==='fiche-lib-search'){ficheLibSearch=e.target.value;buildFichesPanel();}
});
const btnAll=document.getElementById('btn-rev-all');
if(btnAll) btnAll.addEventListener('click', launchRevision);
buildFichesPanel();
`;

fs.writeFileSync(path.join(dir, 'ppl_formulas_page.js'), formulasPageJs);
fs.writeFileSync(path.join(dir, 'ppl_fiches_page.js'), fichesPageJs);

const formulesHtml = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Formules PPL — Quiz PPL</title>
<link rel="stylesheet" href="ppl_theme.css?v=20260528c">
<link rel="stylesheet" href="ppl_theme_enhance.css?v=20260528c">
<link rel="stylesheet" href="ppl_resources.css?v=20260528c">
</head>
<body>
<div class="mesh-bg"></div>
<div class="grid-overlay"></div>
<div class="noise"></div>
<div class="glows"><div class="g1"></div><div class="g2"></div><div class="g3"></div></div>
<div class="wrap app-shell">
<header class="app-header">
  <a href="ppl_quiz_ultra.html" class="app-brand"><span class="app-brand-icon">✈</span><span class="app-brand-text">PPL <em>Quiz</em></span></a>
  <nav class="app-nav">
    <a href="ppl_quiz_ultra.html" class="app-nav-link">Quiz</a>
    <a href="formules.html" class="app-nav-link on">Formules</a>
    <a href="fiches.html" class="app-nav-link">Fiches</a>
  </nav>
</header>
  <div class="resource-screen">
    <div class="resource-top">
      <a href="ppl_quiz_ultra.html" class="btn-back">← Quiz PPL</a>
      <h2>📐 Formules PPL</h2>
    </div>
    <div class="resource-body formulas-panel" id="formulas-panel"></div>
  </div>
</div>
<script src="formulas_bank.js?v=20260528d"></script>
<script src="formulas_engine.js?v=20260528d"></script>
<script src="questions_bank.js?v=20260528f"></script>
<script src="topics_utils.js?v=20260528e"></script>
<script src="ppl_formulas_page.js"></script>
</body>
</html>
`;

const fichesHtml = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Fiches explicatives — Quiz PPL</title>
<link rel="stylesheet" href="ppl_theme.css?v=20260528c">
<link rel="stylesheet" href="ppl_theme_enhance.css?v=20260528c">
<link rel="stylesheet" href="ppl_resources.css?v=20260528c">
</head>
<body>
<div class="mesh-bg"></div>
<div class="grid-overlay"></div>
<div class="noise"></div>
<div class="glows"><div class="g1"></div><div class="g2"></div><div class="g3"></div></div>
<div class="wrap app-shell">
<header class="app-header">
  <a href="ppl_quiz_ultra.html" class="app-brand"><span class="app-brand-icon">✈</span><span class="app-brand-text">PPL <em>Quiz</em></span></a>
  <nav class="app-nav">
    <a href="ppl_quiz_ultra.html" class="app-nav-link">Quiz</a>
    <a href="formules.html" class="app-nav-link">Formules</a>
    <a href="fiches.html" class="app-nav-link on">Fiches</a>
  </nav>
</header>
  <div class="resource-screen">
    <div class="resource-top">
      <a href="ppl_quiz_ultra.html" class="btn-back">← Quiz PPL</a>
      <h2>📚 Fiches explicatives</h2>
    </div>
    <div class="resource-body">
      <div class="resource-actions">
        <button type="button" class="btn-rev" id="btn-rev-all" hidden>📚 Réviser toutes mes erreurs</button>
      </div>
      <div id="rev-panel" class="rev-panel"></div>
    </div>
  </div>
</div>
<script src="questions_bank.js?v=20260528f"></script>
<script src="formulas_bank.js?v=20260528d"></script>
<script src="formulas_engine.js?v=20260528d"></script>
<script src="topics_utils.js?v=20260528e"></script>
<script src="ppl_fiches_page.js"></script>
</body>
</html>
`;

fs.writeFileSync(path.join(dir, 'formules.html'), formulesHtml);
fs.writeFileSync(path.join(dir, 'fiches.html'), fichesHtml);

// Validate generated JS
try { new Function(formulasPageJs); console.log('formulas JS OK'); } catch (e) { console.error('formulas JS ERR', e.message); process.exit(1); }
try { new Function(fichesPageJs); console.log('fiches JS OK'); } catch (e) { console.error('fiches JS ERR', e.message); process.exit(1); }
console.log('Generated: ppl_resources.css, ppl_formulas_page.js, ppl_fiches_page.js, formules.html, fiches.html');
