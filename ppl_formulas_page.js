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

function formulaCategories(list) {
  const cats = new Set();
  list.forEach((f) => {
    if (f.tags?.includes('table') && !formulaShowTables) return;
    cats.add(f.cat);
  });
  return [...cats].sort((a, b) => a.localeCompare(b, 'fr'));
}

function filterFormulas() {
  const q = formulaSearch.toLowerCase();
  return FORMULAS.filter((f) => {
    if (formulaTab !== 'all' && f.m !== formulaTab) return false;
    if (formulaCat !== 'all' && f.cat !== formulaCat) return false;
    if (!formulaShowTables && f.tags?.includes('table')) return false;
    if (formulaTab === 'exam' && (f.prio || 2) < 3) return false;
    if (!q) return true;
    const hay = (
      f.title +
      f.formula +
      f.explain +
      f.cat +
      (f.examples || []).join('') +
      (f.tags || []).join('') +
      (f.quizRef || '')
    ).toLowerCase();
    return hay.includes(q);
  });
}

function sortFormulas(list) {
  const arr = [...list];
  if (formulaSort === 'prio')
    arr.sort((a, b) => (b.prio || 2) - (a.prio || 2) || a.title.localeCompare(b.title, 'fr'));
  else if (formulaSort === 'alpha') arr.sort((a, b) => a.title.localeCompare(b.title, 'fr'));
  else if (formulaSort === 'cat')
    arr.sort((a, b) => a.cat.localeCompare(b.cat, 'fr') || (b.prio || 2) - (a.prio || 2));
  return arr;
}

function renderFormulaCard(f) {
  const vars = f.vars
    ? `<div class="formula-vars">${f.vars.map((v) => `<span>${esc(v.s)}</span>${esc(v.d)}`).join(' · ')}</div>`
    : '';
  const ex = f.examples
    ? f.examples.map((e) => `<div class="formula-ex">→ ${esc(e)}</div>`).join('')
    : '';
  const qCount = f.quizRef && typeof getTopicQuestionCount === 'function' ? getTopicQuestionCount(f.quizRef) : 0;
  const quiz =
    f.quizRef && qCount
      ? `<div class="formula-quiz-row">
          <button type="button" class="formula-quiz-btn" data-formula-quiz="${esc(f.quizRef)}">🎯 Quiz thème (${qCount} q)</button>
          <a href="fiches.html?topic=${encodeURIComponent(f.quizRef)}" class="formula-fiche-link">📚 Fiche + toutes les questions</a>
        </div>`
      : f.quizRef
        ? `<button type="button" class="formula-quiz-btn" data-formula-quiz="${esc(f.quizRef)}">🎯 Quiz : ${esc(f.quizRef)}</button>`
        : '';
  const prioBadge =
    (f.prio || 2) >= 3
      ? '<span class="formula-badge formula-badge-exam">Examen</span>'
      : (f.prio || 2) === 2
        ? '<span class="formula-badge">Standard</span>'
        : '';
  const calcBadge = f.calc ? '<span class="formula-badge formula-badge-calc">Calculateur</span>' : '';
  const tableBadge = f.tags?.includes('table') ? '<span class="formula-badge formula-badge-table">Table</span>' : '';

  return `<div class="formula-card" data-formula-id="${f.id}">
    <button type="button" class="formula-card-hd" data-formula-toggle="${f.id}">
      <div>
        <div class="formula-card-badges">${prioBadge}${calcBadge}${tableBadge}</div>
        <div class="formula-card-title">${esc(f.title)}</div>
        <div class="formula-card-meta"><span class="bd ${modClass(f.m)}">${modStr(f.m)}</span> · ${esc(f.cat)}</div>
        <div class="formula-eq">${esc(f.formula)}</div>
      </div>
      <span class="formula-chevron">▾</span>
    </button>
    <div class="formula-card-bd">
      ${f.units ? `<div class="formula-sec"><strong>Unités</strong>${esc(f.units)}</div>` : ''}
      <div class="formula-sec"><strong>Explication</strong>${esc(f.explain || '')}</div>
      ${vars}
      ${f.mnemonic ? `<div class="formula-mnemo">💡 ${esc(f.mnemonic)}</div>` : ''}
      ${ex ? `<div class="formula-sec"><strong>Exemples</strong>${ex}</div>` : ''}
      ${renderFormulaCalc(f)}
      ${quiz}
    </div>
  </div>`;
}

function renderFormulaGroups(filtered) {
  if (formulaSort !== 'cat') return filtered.map(renderFormulaCard).join('');
  const groups = {};
  filtered.forEach((f) => {
    if (!groups[f.cat]) groups[f.cat] = [];
    groups[f.cat].push(f);
  });
  return Object.entries(groups)
    .sort(([a], [b]) => a.localeCompare(b, 'fr'))
    .map(
      ([cat, items]) =>
        `<div class="formula-cat-group">
      <div class="formula-cat-hd"><span>${esc(cat)}</span><span class="formula-cat-n">${items.length}</span></div>
      <div class="formula-grid formula-grid-inner">${items.map(renderFormulaCard).join('')}</div>
    </div>`
    )
    .join('');
}

function buildFormulasPanel() {
  const panel = document.getElementById('formulas-panel');
  if (!panel || typeof FORMULAS === 'undefined') return;
  const meta = typeof FORMULA_META !== 'undefined' ? FORMULA_META : { total: FORMULAS.length };
  const filtered = sortFormulas(filterFormulas());
  const cats = formulaCategories(FORMULAS.filter((f) => formulaTab === 'all' || formulaTab === 'exam' || f.m === formulaTab));
  const calcN = filtered.filter((f) => f.calc).length;
  const examN = filtered.filter((f) => (f.prio || 2) >= 3).length;

  panel.innerHTML = `
    <div class="formulas-hero">
      <div class="formulas-hero-stat"><span class="formulas-hero-n">${meta.total || FORMULAS.length}</span><span class="formulas-hero-l">formules</span></div>
      <div class="formulas-hero-stat"><span class="formulas-hero-n">${meta.calcCount || calcN}</span><span class="formulas-hero-l">calculateurs</span></div>
      <div class="formulas-hero-stat"><span class="formulas-hero-n">${meta.examEssential || examN}</span><span class="formulas-hero-l">essentielles examen</span></div>
      <div class="formulas-hero-stat"><span class="formulas-hero-n">${meta.categories || cats.length}</span><span class="formulas-hero-l">catégories</span></div>
    </div>
    <div class="formulas-hd">
      <input type="search" class="formulas-search" id="formula-search" placeholder="Rechercher (Vp, ISA, VHF, QNH, 1:60…)" value="${esc(formulaSearch)}">
      <div class="formulas-toolbar">
        <select class="formulas-select" id="formula-cat" aria-label="Catégorie">
          <option value="all"${formulaCat === 'all' ? ' selected' : ''}>Toutes catégories</option>
          ${cats.map((c) => `<option value="${esc(c)}"${formulaCat === c ? ' selected' : ''}>${esc(c)}</option>`).join('')}
        </select>
        <select class="formulas-select" id="formula-sort" aria-label="Tri">
          <option value="prio"${formulaSort === 'prio' ? ' selected' : ''}>Priorité examen</option>
          <option value="alpha"${formulaSort === 'alpha' ? ' selected' : ''}>Alphabétique</option>
          <option value="cat"${formulaSort === 'cat' ? ' selected' : ''}>Par catégorie</option>
        </select>
        <label class="formulas-toggle"><input type="checkbox" id="formula-tables"${formulaShowTables ? ' checked' : ''}> Tables ISA/VHF</label>
      </div>
    </div>
    <div class="formula-tabs">
      <button type="button" class="formula-tab${formulaTab === 'all' ? ' on' : ''}" data-ftab="all">Toutes (${FORMULAS.length})</button>
      <button type="button" class="formula-tab${formulaTab === 'exam' ? ' on' : ''}" data-ftab="exam">⭐ Essentiel examen</button>
      ${MOD_ORDER.map((m) => {
        const n = FORMULAS.filter((f) => f.m === m && (!f.tags?.includes('table') || formulaShowTables)).length;
        return `<button type="button" class="formula-tab${formulaTab === m ? ' on' : ''}" data-ftab="${m}">${modStr(m)} (${n})</button>`;
      }).join('')}
    </div>
    <div class="formula-count-bar">${filtered.length} formule${filtered.length > 1 ? 's' : ''} affichée${filtered.length > 1 ? 's' : ''}${calcN ? ` · ${calcN} avec calculateur` : ''}</div>
    <div class="formula-grid${formulaSort === 'cat' ? ' formula-grid-grouped' : ''}">${renderFormulaGroups(filtered) || '<div class="rev-empty">Aucune formule trouvée.</div>'}</div>`;
}

function goQuizTopic(ref) {
  const r = typeof resolveTopicRef === 'function' ? resolveTopicRef(ref) : ref;
  window.location.href = 'ppl_quiz_ultra.html?topic=' + encodeURIComponent(r);
}
function launchTopicReview(ref) {
  goQuizTopic(ref);
}

document.getElementById('formulas-panel').addEventListener('click', (e) => {
  const tab = e.target.closest('[data-ftab]');
  if (tab) {
    formulaTab = tab.dataset.ftab;
    formulaCat = 'all';
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
  handleFormulaCalcInput(e);
});

document.getElementById('formulas-panel').addEventListener('change', (e) => {
  if (e.target.id === 'formula-cat') {
    formulaCat = e.target.value;
    buildFormulasPanel();
    return;
  }
  if (e.target.id === 'formula-sort') {
    formulaSort = e.target.value;
    buildFormulasPanel();
    return;
  }
  if (e.target.id === 'formula-tables') {
    formulaShowTables = e.target.checked;
    buildFormulasPanel();
  }
});

document.addEventListener('input', (e) => {
  if (e.target.closest('[data-calc-type]')) handleFormulaCalcInput(e);
});

buildFormulasPanel();
