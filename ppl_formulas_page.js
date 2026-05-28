const MOD_ORDER=['C','A','M','R'];
function esc(s){return String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function barColor(p){ return p>=75?'#34d3a8':p>=50?'#f0b040':'#f06060'; }
function diffStr(d){ return['','★ Facile','★★ Moyen','★★★ Difficile','★★★★ Expert'][d]; }
function modStr(m){ return{C:'Communications',A:'Aéronef',M:'Météorologie',R:'Réglementation'}[m]; }
function modClass(m){ return{C:'bd-comm',A:'bd-aero',M:'bd-met',R:'bd-reg'}[m]; }
function diffClass(d){ return['','bd-f','bd-m','bd-d','bd-e'][d]; }


/* Formules : formulas_engine.js (externe) */
function goQuizTopic(ref){window.location.href='index.html?topic='+encodeURIComponent(ref);}
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
