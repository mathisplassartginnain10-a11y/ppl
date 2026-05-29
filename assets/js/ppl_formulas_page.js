const MOD_ORDER = ['C', 'A', 'M', 'R'];
let formulaTab = 'all';
let formulaSearch = '';
let formulaCat = 'all';
let formulaSort = 'prio';
let formulaShowTables = false;

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
function barColor(p) {
  return p >= 75 ? '#34d3a8' : p >= 50 ? '#f0b040' : '#f06060';
}
function diffStr(d) {
  return ['', '★ Facile', '★★ Moyen', '★★★ Difficile', '★★★★ Expert'][d];
}
function modStr(m) {
  return { C: 'Communications', A: 'Aéronef', M: 'Météorologie', R: 'Réglementation' }[m];
}
function modClass(m) {
  return { C: 'bd-comm', A: 'bd-aero', M: 'bd-met', R: 'bd-reg' }[m];
}
function diffClass(d) {
  return ['', 'bd-f', 'bd-m', 'bd-d', 'bd-e'][d];
}

function getFormulaBank() {
  return typeof FORMULAS !== 'undefined' ? FORMULAS : window.FORMULAS || [];
}

function formulaCategories(list) {
  const bank = list || getFormulaBank();
  const cats = new Set();
  bank.forEach((f) => {
    if (f.cat) cats.add(f.cat);
  });
  return [...cats].sort((a, b) => a.localeCompare(b, 'fr'));
}

function filterFormulas() {
  const bank = typeof FORMULAS !== 'undefined' ? FORMULAS : window.FORMULAS;
  if (!bank || !bank.length) return [];
  const q = formulaSearch.trim().toLowerCase();
  let list = bank.filter((f) => {
    if (formulaTab === 'exam' && !(f.tags || []).includes('examen')) return false;
    if (formulaTab === 'calc' && !f.calc) return false;
    if (formulaTab !== 'all' && formulaTab !== 'exam' && formulaTab !== 'calc' && f.m !== formulaTab)
      return false;
    if (formulaCat !== 'all' && f.cat !== formulaCat) return false;
    if (!q) return true;
    const hay = [f.title, f.formula, f.cat, f.explain, f.quizRef, f.utility, f.mnemonic, ...(f.examples || []), ...(f.tags || [])]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return hay.includes(q);
  });
  if (formulaSort === 'title') list = list.slice().sort((a, b) => a.title.localeCompare(b.title, 'fr'));
  else if (formulaSort === 'cat') list = list.slice().sort((a, b) => (a.cat || '').localeCompare(b.cat || '', 'fr') || a.title.localeCompare(b.title, 'fr'));
  else list = list.slice().sort((a, b) => (b.prio || 0) - (a.prio || 0) || a.title.localeCompare(b.title, 'fr'));
  return list;
}

function renderFormulaCard(f) {
  const badges = [];
  if ((f.tags || []).includes('examen')) badges.push('<span class="formula-badge formula-badge-exam">Examen</span>');
  if (f.calc) badges.push('<span class="formula-badge formula-badge-calc">Calculateur</span>');
  if ((f.tags || []).includes('calcul')) badges.push('<span class="formula-badge">Calcul</span>');
  const varsHtml = (f.vars || []).length
    ? `<div class="formula-vars">${f.vars.map((v) => `<span>${esc(v.s)}</span>${esc(v.d)}`).join(' · ')}</div>`
    : '';
  const workedHtml = (f.worked || []).length
    ? `<div class="formula-sec"><strong>Calcul pas à pas</strong><ol class="formula-worked">${f.worked.map((w) => `<li>${esc(w)}</li>`).join('')}</ol></div>`
    : '';
  const exHtml = (f.examples || []).length
    ? `<div class="formula-sec"><strong>Exemples</strong>${f.examples.map((e) => `<div class="formula-ex">→ ${esc(e)}</div>`).join('')}</div>`
    : '';
  const utilHtml = f.utility
    ? `<div class="formula-sec formula-sec-util"><strong>Utilité pilote</strong>${esc(f.utility)}</div>`
    : '';
  const mnHtml = f.mnemonic ? `<div class="formula-mnemo">💡 ${esc(f.mnemonic)}</div>` : '';
  const calcHtml = typeof renderFormulaCalc === 'function' && f.calc ? renderFormulaCalc(f) : '';
  const quizRef = f.quizRef || f.cat || f.title;
  const actions = `<div class="formula-quiz-row">
    <button type="button" class="formula-quiz-btn" data-formula-quiz="${esc(quizRef)}">▶ Quiz « ${esc(quizRef)} »</button>
    <a href="fiches.html?topic=${encodeURIComponent(quizRef)}" class="formula-fiche-link">📚 Fiche thème</a>
  </div>`;

  return `<div class="formula-card open" data-formula-id="${esc(f.id)}">
    <button type="button" class="formula-card-hd" data-formula-toggle="${esc(f.id)}">
      <div class="formula-card-hd-left">
        ${badges.length ? `<div class="formula-card-badges">${badges.join('')}</div>` : ''}
        <div class="formula-card-title">${esc(f.title)}</div>
        <div class="formula-card-meta"><span class="bd ${modClass(f.m)}">${modStr(f.m)}</span> · ${esc(f.cat || '')}</div>
        <div class="formula-eq">${esc(f.formula)}</div>
      </div>
      <span class="formula-chevron">▾</span>
    </button>
    <div class="formula-card-bd">
      ${f.units ? `<div class="formula-sec"><strong>Unités</strong>${esc(f.units)}</div>` : ''}
      ${f.explain ? `<div class="formula-sec"><strong>Explication</strong>${esc(f.explain)}</div>` : ''}
      ${utilHtml}${varsHtml}${mnHtml}${workedHtml}${exHtml}${calcHtml}${actions}
    </div>
  </div>`;
}

function renderFormulaGrid(list) {
  if (!list.length) return '<div class="rev-empty">Aucune formule ne correspond aux filtres.</div>';
  if (formulaShowTables || formulaSort === 'cat') {
    const byCat = {};
    list.forEach((f) => {
      const c = f.cat || 'Autre';
      if (!byCat[c]) byCat[c] = [];
      byCat[c].push(f);
    });
    return `<div class="formula-grid formula-grid-grouped">${Object.entries(byCat)
      .sort(([a], [b]) => a.localeCompare(b, 'fr'))
      .map(
        ([cat, items]) => `<section class="formula-cat-group">
      <div class="formula-cat-hd"><span>${esc(cat)}</span><span class="formula-cat-n">${items.length}</span></div>
      <div class="formula-grid-inner">${items.map(renderFormulaCard).join('')}</div>
    </section>`
      )
      .join('')}</div>`;
  }
  return `<div class="formula-grid">${list.map(renderFormulaCard).join('')}</div>`;
}

function buildFormulasPanel() {
  const panel = document.getElementById('formulas-panel');
  if (!panel) return;
  const bank = getFormulaBank();
  if (!bank.length) {
    panel.innerHTML = '<div class="rev-empty">Banque de formules non chargée — vérifiez formulas_bank.js.</div>';
    return;
  }
  try {
  const meta = typeof FORMULA_META !== 'undefined' ? FORMULA_META : window.FORMULA_META || { total: bank.length, calcCount: 0, examEssential: 0, categories: 0 };
  const list = filterFormulas();
  const cats = formulaCategories(bank);
  const tabs = [
    ['all', 'Toutes'],
    ...MOD_ORDER.map((m) => [m, modStr(m)]),
    ['exam', '★ Examen'],
    ['calc', '🧮 Calc.'],
  ];
  const tabHtml = tabs
    .map(
      ([id, lbl]) =>
        `<button type="button" class="formula-tab${formulaTab === id ? ' on' : ''}" data-ftab="${id}">${esc(lbl)}</button>`
    )
    .join('');

  panel.innerHTML = `
    <div class="formulas-hero">
      <div class="formulas-hero-stat"><span class="formulas-hero-n">${meta.total || bank.length}</span><span class="formulas-hero-l">Formules</span></div>
      <div class="formulas-hero-stat"><span class="formulas-hero-n">${meta.calcCount || bank.filter((f) => f.calc).length}</span><span class="formulas-hero-l">Calculateurs</span></div>
      <div class="formulas-hero-stat"><span class="formulas-hero-n">${meta.examEssential || bank.filter((f) => (f.tags || []).includes('examen')).length}</span><span class="formulas-hero-l">Essentielles examen</span></div>
      <div class="formulas-hero-stat"><span class="formulas-hero-n">${meta.categories || cats.length}</span><span class="formulas-hero-l">Catégories</span></div>
    </div>
    <div class="formulas-hd">
      <div class="formulas-tabs formula-tabs">${tabHtml}</div>
      <div class="formulas-toolbar">
        <input type="search" id="formula-search" class="formulas-search" placeholder="Rechercher une formule…" value="${esc(formulaSearch)}" autocomplete="off">
        <select id="formula-cat" class="formulas-select" aria-label="Catégorie">
          <option value="all"${formulaCat === 'all' ? ' selected' : ''}>Toutes catégories</option>
          ${cats.map((c) => `<option value="${esc(c)}"${formulaCat === c ? ' selected' : ''}>${esc(c)}</option>`).join('')}
        </select>
        <select id="formula-sort" class="formulas-select" aria-label="Tri">
          <option value="prio"${formulaSort === 'prio' ? ' selected' : ''}>Priorité examen</option>
          <option value="title"${formulaSort === 'title' ? ' selected' : ''}>Titre A→Z</option>
          <option value="cat"${formulaSort === 'cat' ? ' selected' : ''}>Par catégorie</option>
        </select>
        <label class="formulas-toggle"><input type="checkbox" id="formula-group-cat"${formulaShowTables ? ' checked' : ''}> Grouper par catégorie</label>
      </div>
    </div>
    <div class="formula-count-bar">${list.length} formule${list.length > 1 ? 's' : ''} affichée${list.length > 1 ? 's' : ''}</div>
    ${renderFormulaGrid(list)}`;

  document.getElementById('formula-cat')?.addEventListener('change', (e) => {
    formulaCat = e.target.value;
    buildFormulasPanel();
  });
  document.getElementById('formula-sort')?.addEventListener('change', (e) => {
    formulaSort = e.target.value;
    buildFormulasPanel();
  });
  document.getElementById('formula-group-cat')?.addEventListener('change', (e) => {
    formulaShowTables = e.target.checked;
    buildFormulasPanel();
  });
  } catch (err) {
    console.error('buildFormulasPanel', err);
    panel.innerHTML = `<div class="rev-empty">Erreur affichage formules : ${esc(err.message)}</div>`;
  }
}

function goQuizTopic(ref) {
  window.location.href = 'index.html?topic=' + encodeURIComponent(ref);
}
function launchTopicReview(ref) {
  goQuizTopic(ref);
}

document.getElementById('formulas-panel').addEventListener('click', (e) => {
  const tab = e.target.closest('[data-ftab]');
  if (tab) {
    formulaTab = tab.dataset.ftab;
    buildFormulasPanel();
    return;
  }
  const toggle = e.target.closest('[data-formula-toggle]');
  if (toggle) {
    toggle.closest('.formula-card')?.classList.toggle('open');
    return;
  }
  const quiz = e.target.closest('[data-formula-quiz]');
  if (quiz && quiz.dataset.formulaQuiz) {
    launchTopicReview(quiz.dataset.formulaQuiz);
    return;
  }
});
document.getElementById('formulas-panel').addEventListener('input', (e) => {
  if (e.target.id === 'formula-search') {
    formulaSearch = e.target.value;
    buildFormulasPanel();
    return;
  }
  if (typeof handleFormulaCalcInput === 'function') handleFormulaCalcInput(e);
});
document.addEventListener('input', (e) => {
  if (e.target.closest('[data-calc-type]') && typeof handleFormulaCalcInput === 'function') handleFormulaCalcInput(e);
});

function initFormulasPage() {
  buildFormulasPanel();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initFormulasPage);
} else {
  initFormulasPage();
}
window.addEventListener('ppl-data-erased', () => location.reload());
