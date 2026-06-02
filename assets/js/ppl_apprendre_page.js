/**
 * Page Apprendre — encyclopédie PPL (compilations, thèmes, QCM, formules).
 */
(function () {
  'use strict';

  const MOD_ORDER = ['C', 'A', 'M', 'R'];
  const MOD_LABEL = { C: 'Communications (091)', A: 'Aéronef (020)', M: 'Météo (050)', R: 'Réglementation (010)', all: 'Tous les modules' };
  const MOD_ICON = { C: '📡', A: '✈', M: '🌤', R: '📋' };

  let tab = 'home';
  let mod = 'all';
  let search = '';
  let selectedKey = '';
  let selectedQIdx = -1;
  let docView = 'both';

  const root = document.getElementById('learn-root');

  function esc(s) {
    return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function api() {
    return window.PPLFichesAPI || {};
  }

  function norm(s) {
    return String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
  }

  function matchSearch(text) {
    if (!search.trim()) return true;
    return norm(text).includes(norm(search));
  }

  function corpusBodyHtml(body) {
    if (!body) return '';
    const blocks = body.split(/\n\n+/);
    return blocks.map((block) => {
      const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
      const isList = lines.length > 1 && lines.every((l) => /^[•\-–—]\s/.test(l) || /^\d+[.)]\s/.test(l));
      if (isList) {
        return '<ul class="learn-ul">' + lines.map((l) => {
          const t = l.replace(/^[•\-–—]\d*[.)]?\s*/, '');
          return '<li>' + esc(t) + '</li>';
        }).join('') + '</ul>';
      }
      return '<p class="learn-p">' + esc(block.trim()).replace(/\n/g, '<br>') + '</p>';
    }).join('');
  }

  function getStats() {
    const topics = typeof Q !== 'undefined' ? new Set(Q.map((q) => q.r)).size : 0;
    const qs = typeof Q !== 'undefined' ? Q.length : 0;
    const fm = typeof FORMULA_META !== 'undefined' ? FORMULA_META.total : (typeof FORMULAS !== 'undefined' ? FORMULAS.length : 145);
    const docs = window.LEARN_CORPUS ? window.LEARN_CORPUS.sources.reduce((n, s) => n + s.sectionCount, 0) : 0;
    const pages = window.LEARN_CORPUS ? window.LEARN_CORPUS.sources.reduce((n, s) => n + (s.pageCount || 0), 0) : 0;
    return { topics, qs, fm, docs, pages };
  }

  function getTopics() {
    const kb = api().initTopicKB ? api().initTopicKB() : {};
    return Object.keys(kb).sort((a, b) => a.localeCompare(b, 'fr')).map((ref) => ({
      ref,
      mod: kb[ref].module,
      count: kb[ref].idxs.length,
    }));
  }

  function filteredTopics() {
    return getTopics().filter((t) => (mod === 'all' || t.mod === mod) && matchSearch(t.ref));
  }

  function filteredQuestions() {
    if (typeof Q === 'undefined') return [];
    return Q.map((q, i) => ({ q, i })).filter(({ q }) => {
      if (mod !== 'all' && q.m !== mod) return false;
      const blob = [q.q, q.e, q.r, ...(q.o || [])].join(' ');
      return matchSearch(blob);
    });
  }

  function renderHero() {
    const st = getStats();
    return `<div class="learn-hero">
      <h2>Apprendre — encyclopédie PPL</h2>
      <p class="learn-hero-sub">Toutes les compilations Aérogligli (${st.pages ? st.pages + ' pages originales · ' : ''}${st.docs} sections), les ${st.topics} thèmes, ${st.qs} fiches QCM et ${st.fm} formules — ultra-développé, 100 % local.</p>
      <div class="learn-stats">
        ${st.pages ? `<span class="learn-stat">${st.pages} pages PDF</span>` : ''}
        <span class="learn-stat">${st.docs} sections source</span>
        <span class="learn-stat">${st.topics} thèmes</span>
        <span class="learn-stat">${st.qs} questions</span>
        <span class="learn-stat">${st.fm} formules</span>
      </div>
    </div>`;
  }

  function renderToolbar() {
    const tabs = [
      ['home', 'Accueil'],
      ['docs', 'Compilations'],
      ['topics', 'Thèmes'],
      ['questions', 'Questions'],
      ['formulas', 'Formules'],
    ];
    return `<div class="learn-toolbar">
      <div class="learn-search-wrap">
        <span class="learn-search-ico" aria-hidden="true">🔍</span>
        <input type="search" class="learn-search" id="learn-search" placeholder="Rechercher dans tout le contenu…" value="${esc(search)}" autocomplete="off">
      </div>
      <div class="learn-tabs" role="tablist">${tabs.map(([id, lbl]) =>
        `<button type="button" class="learn-tab${tab === id ? ' on' : ''}" data-learn-tab="${id}" role="tab">${lbl}</button>`
      ).join('')}</div>
      ${tab !== 'home' ? `<div class="learn-mod-bar">${['all', ...MOD_ORDER].map((m) =>
        `<button type="button" class="learn-mod-btn${mod === m ? ' on' : ''}" data-learn-mod="${m}">${m === 'all' ? 'Tous' : MOD_ICON[m] + ' ' + m}</button>`
      ).join('')}</div>` : ''}
    </div>`;
  }

  function renderDocPagesHtml(src, opts) {
    if (!src?.pages?.length) {
      return '<div class="learn-empty">Pages originales non disponibles. Regénérez avec <code>npm run learn:pages</code>.</div>';
    }
    const start = opts?.pageStart || 1;
    const end = opts?.pageEnd || src.pages.length;
    const slice = src.pages.filter((p) => p.n >= start && p.n <= end);
    return slice.map((p) =>
      `<figure class="learn-page-fig" id="learn-page-${src.id}-${p.n}">
        <div class="learn-page-hd"><span class="learn-page-n">Page ${p.n}</span><span class="learn-page-dim">${p.w}×${p.h}</span></div>
        <img class="learn-page-img" src="${esc(p.file)}" alt="${esc(src.title)} — page ${p.n}" loading="lazy" width="${p.w}" height="${p.h}">
      </figure>`
    ).join('');
  }

  function renderDocViewTabs(srcId, active) {
    return `<div class="learn-doc-view-tabs" role="tablist">
      <button type="button" class="learn-doc-view-tab${active === 'text' ? ' on' : ''}" data-doc-view="text" data-doc-src="${esc(srcId)}">Texte intégral</button>
      <button type="button" class="learn-doc-view-tab${active === 'pages' ? ' on' : ''}" data-doc-view="pages" data-doc-src="${esc(srcId)}">Fiche originale (images)</button>
      <button type="button" class="learn-doc-view-tab${active === 'both' ? ' on' : ''}" data-doc-view="both" data-doc-src="${esc(srcId)}">Complet texte + images</button>
    </div>`;
  }

  function renderSidebarItems() {
    if (tab === 'docs' && window.LEARN_CORPUS) {
      return window.LEARN_CORPUS.sources
        .filter((s) => mod === 'all' || s.mod === mod)
        .map((src) => {
          const fullKey = 'docfull:' + src.id;
          const pagesKey = 'docpages:' + src.id;
          const fullBtn = `<button type="button" class="learn-nav-item learn-nav-full${selectedKey === fullKey ? ' on' : ''}" data-learn-key="${esc(fullKey)}">
            <span>📄 Complet — ${esc(src.title.length > 36 ? src.title.slice(0, 34) + '…' : src.title)}</span>
            <span class="learn-nav-meta">${src.sectionCount} sections${src.pageCount ? ' · ' + src.pageCount + ' p.' : ''} · ${MOD_ICON[src.mod]}</span>
          </button>`;
          const pagesBtn = src.pageCount ? `<button type="button" class="learn-nav-item learn-nav-pages${selectedKey === pagesKey ? ' on' : ''}" data-learn-key="${esc(pagesKey)}">
            <span>🖼 Fiche originale — ${esc(src.id)}</span>
            <span class="learn-nav-meta">${src.pageCount} pages · ${MOD_ICON[src.mod]}</span>
          </button>` : '';
          const secs = src.sections
            .map((sec, i) => {
              const key = 'doc:' + src.id + ':' + i;
              if (!matchSearch(sec.title + ' ' + sec.body)) return '';
              return `<button type="button" class="learn-nav-item${selectedKey === key ? ' on' : ''}" data-learn-key="${esc(key)}">
              <span>${esc(sec.title.length > 48 ? sec.title.slice(0, 46) + '…' : sec.title)}</span>
              <span class="learn-nav-meta">${esc(src.id)} · ${MOD_ICON[src.mod]}</span>
            </button>`;
            })
            .join('');
          return fullBtn + pagesBtn + secs;
        })
        .join('');
    }
    if (tab === 'topics') {
      return filteredTopics().map((t) => {
        const key = 'topic:' + t.ref;
        return `<button type="button" class="learn-nav-item${selectedKey === key ? ' on' : ''}" data-learn-key="${esc(key)}">
          <span>${esc(t.ref)}</span>
          <span class="learn-nav-meta">${MOD_ICON[t.mod]} · ${t.count} Q</span>
        </button>`;
      }).join('');
    }
    if (tab === 'questions') {
      const list = filteredQuestions();
      return list.map(({ q, i }) => {
        const key = 'q:' + i;
        return `<button type="button" class="learn-nav-item${selectedKey === key ? ' on' : ''}" data-learn-key="${esc(key)}">
          <span>Q${i + 1} · ${esc(q.r || 'Thème')}</span>
          <span class="learn-nav-meta">${esc(q.q.slice(0, 60))}${q.q.length > 60 ? '…' : ''}</span>
        </button>`;
      }).join('');
    }
    if (tab === 'formulas') {
      const list = getFormulasList();
      return list.map((f) => {
        const key = 'f:' + f.id;
        return `<button type="button" class="learn-nav-item${selectedKey === key ? ' on' : ''}" data-learn-key="${esc(key)}">
          <span>${esc(f.title)}</span>
          <span class="learn-nav-meta">${MOD_ICON[f.m]} · ${esc(f.cat || '')}</span>
        </button>`;
      }).join('');
    }
    return '';
  }

  function getFormulasList() {
    const bank = typeof FORMULAS !== 'undefined' ? FORMULAS : [];
    return bank.filter((f) => {
      if (mod !== 'all' && f.m !== mod) return false;
      const blob = [f.title, f.formula, f.explain, f.utility, f.cat, ...(f.tags || [])].join(' ');
      return matchSearch(blob);
    });
  }

  function renderFormulaCard(f) {
    const A = api();
    const mc = A.modClass ? A.modClass(f.m) : '';
    const ms = A.modStr ? A.modStr(f.m) : f.m;
    const calc = typeof renderFormulaCalc === 'function' && f.calc ? renderFormulaCalc(f) : '';
    return `<div class="formula-card open">
      <div class="formula-card-hd"><div class="formula-card-title">${esc(f.title)}</div>
        <div class="formula-card-meta"><span class="bd ${mc}">${esc(ms)}</span> · ${esc(f.cat || '')}</div>
        <div class="formula-eq">${esc(f.formula)}</div></div>
      <div class="formula-card-bd">
        ${f.units ? `<div class="formula-sec"><strong>Unités</strong> ${esc(f.units)}</div>` : ''}
        ${f.explain ? `<div class="formula-sec"><strong>Explication</strong> ${esc(f.explain)}</div>` : ''}
        ${f.utility ? `<div class="formula-sec formula-sec-util"><strong>Utilité pilote</strong> ${esc(f.utility)}</div>` : ''}
        ${f.mnemonic ? `<div class="formula-mnemo">💡 ${esc(f.mnemonic)}</div>` : ''}
        ${(f.worked || []).length ? `<div class="formula-sec"><strong>Calcul pas à pas</strong><ol class="formula-worked">${f.worked.map((w) => `<li>${esc(w)}</li>`).join('')}</ol></div>` : ''}
        ${calc}
        <div class="formula-quiz-row"><a href="index.html?topic=${encodeURIComponent(f.quizRef || f.title)}" class="formula-quiz-btn">▶ Quiz lié</a></div>
      </div>
    </div>`;
  }

  function renderMainContent() {
    if (tab === 'home') {
      return `<div class="learn-home-grid">
        <button type="button" class="learn-home-card" data-learn-goto="docs">
          <div class="learn-home-card-ico">📚</div><h4>Compilations Aérogligli</h4><p>4 documents · ${getStats().docs} sections + ${getStats().pages || 0} pages originales avec schémas et tableaux</p>
        </button>
        <button type="button" class="learn-home-card" data-learn-goto="topics">
          <div class="learn-home-card-ico">🎯</div><h4>${getStats().topics} thèmes</h4><p>Fiches ultra-développées : règles, pièges, formules, QCM du thème</p>
        </button>
        <button type="button" class="learn-home-card" data-learn-goto="questions">
          <div class="learn-home-card-ico">❓</div><h4>${getStats().qs} fiches question</h4><p>Chaque QCM avec analyse A–D, mnémotechniques et conseils examen</p>
        </button>
        <button type="button" class="learn-home-card" data-learn-goto="formulas">
          <div class="learn-home-card-ico">📐</div><h4>${getStats().fm} formules</h4><p>Explications, calculs pas à pas, calculateurs et liens quiz</p>
        </button>
      </div>`;
    }

    if (!selectedKey) {
      return `<div class="learn-panel"><div class="learn-empty">Sélectionnez un élément dans la liste ← ou lancez une recherche.</div></div>`;
    }

    if (selectedKey.startsWith('docfull:')) {
      const srcId = selectedKey.slice(8);
      const src = window.LEARN_CORPUS?.sources.find((s) => s.id === srcId);
      if (!src) return '<div class="learn-empty">Document introuvable.</div>';
      const sections = (docView === 'pages' ? '' : src.sections.map((sec) =>
        `<section class="learn-doc-block"><h4 class="learn-doc-h4">${esc(sec.title)}</h4>${corpusBodyHtml(sec.body)}</section>`
      ).join(''));
      const pages = (docView === 'text' ? '' : `<div class="learn-doc-pages">${renderDocPagesHtml(src)}</div>`);
      return `<div class="learn-panel learn-panel-full">
        <div class="learn-panel-hd"><h3>${esc(src.title)}</h3><p>Compilation intégrale · ${src.sectionCount} sections${src.pageCount ? ' · ' + src.pageCount + ' pages originales' : ''} · source Aérogligli ${esc(src.id)}</p></div>
        ${src.pageCount ? renderDocViewTabs(srcId, docView) : ''}
        ${docView !== 'pages' ? `<div class="learn-doc-full">${sections}</div>` : ''}
        ${pages}
      </div>`;
    }

    if (selectedKey.startsWith('docpages:')) {
      const srcId = selectedKey.slice(9);
      const src = window.LEARN_CORPUS?.sources.find((s) => s.id === srcId);
      if (!src) return '<div class="learn-empty">Document introuvable.</div>';
      return `<div class="learn-panel learn-panel-full">
        <div class="learn-panel-hd"><h3>${esc(src.title)}</h3><p>Fiche originale Aérogligli · ${src.pageCount || 0} pages · schémas, tableaux et illustrations</p></div>
        <div class="learn-doc-pages learn-doc-pages-only">${renderDocPagesHtml(src)}</div>
      </div>`;
    }

    if (selectedKey.startsWith('doc:')) {
      const [, srcId, idxStr] = selectedKey.split(':');
      const src = window.LEARN_CORPUS?.sources.find((s) => s.id === srcId);
      const sec = src?.sections[parseInt(idxStr, 10)];
      if (!sec) return '<div class="learn-empty">Section introuvable.</div>';
      const secIdx = parseInt(idxStr, 10);
      const pageHint = src.pageCount ? `<p class="learn-sec-page-hint">Consultez aussi la <button type="button" class="learn-inline-link" data-learn-key="docpages:${esc(srcId)}">fiche originale (${src.pageCount} pages)</button> pour les schémas et tableaux.</p>` : '';
      return `<div class="learn-panel">
        <div class="learn-panel-hd"><h3>${esc(sec.title)}</h3><p>${esc(src.title)} · section ${secIdx + 1}/${src.sectionCount} · source Aérogligli</p>${pageHint}</div>
        <div class="learn-doc-section">${corpusBodyHtml(sec.body)}</div>
      </div>`;
    }

    if (selectedKey.startsWith('topic:')) {
      const ref = selectedKey.slice(6);
      const A = api();
      if (!A.renderTopicFicheHTML) return '<div class="learn-empty">Moteur fiches indisponible.</div>';
      const idxs = typeof getTopicQuestionIndices === 'function' ? getTopicQuestionIndices(ref) : [];
      const sampleQ = idxs.length && typeof Q !== 'undefined' ? Q[idxs[0]] : null;
      let html = A.renderTopicFicheHTML(ref, { sampleQ, showFoot: true, full: true });
      const refBlock = typeof renderFicheReferenceHTML === 'function' ? renderFicheReferenceHTML(ref) : '';
      const qList = typeof renderFicheQuestionsList === 'function' ? renderFicheQuestionsList(ref, {
        esc, modStr: A.modStr, modClass: A.modClass, diffStr: A.diffStr, diffClass: A.diffClass,
      }) : '';
      html = `<div class="learn-topic-full">${html}${refBlock ? `<div class="fiche-block"><div class="fiche-block-hd"><span class="fiche-block-ico">📖</span> Référence programme</div><div class="fiche-block-bd">${refBlock}</div></div>` : ''}${qList ? `<div class="fiche-block"><div class="fiche-block-hd"><span class="fiche-block-ico">📋</span> Toutes les questions du thème</div><div class="fiche-block-bd">${qList}</div></div>` : ''}</div>`;
      return `<div class="learn-panel"><div class="learn-panel-hd"><h3>${esc(ref)}</h3><p>Fiche thème complète · ${idxs.length} question(s)</p></div>${html}</div>`;
    }

    if (selectedKey.startsWith('q:')) {
      const i = parseInt(selectedKey.slice(2), 10);
      const q = typeof Q !== 'undefined' ? Q[i] : null;
      if (!q) return '<div class="learn-empty">Question introuvable.</div>';
      return `<div class="learn-panel"><div class="learn-panel-hd"><h3>Question ${i + 1}</h3><p>${esc(q.r)} · ${MOD_ICON[q.m] || ''} ${esc(q.m)}</p></div>
        <div class="learn-q-detail" id="learn-q-detail"><div class="fiche-lazy-spin">Chargement fiche…</div></div></div>`;
    }

    if (selectedKey.startsWith('f:')) {
      const id = selectedKey.slice(2);
      const f = getFormulasList().find((x) => x.id === id) || (typeof FORMULAS !== 'undefined' ? FORMULAS.find((x) => x.id === id) : null);
      if (!f) return '<div class="learn-empty">Formule introuvable.</div>';
      return `<div class="learn-panel learn-formula-panel"><div class="learn-panel-hd"><h3>${esc(f.title)}</h3><p>${esc(f.cat || '')}</p></div>${renderFormulaCard(f)}</div>`;
    }

    return '';
  }

  function renderAll() {
    if (!root) return;
    const sidebarItems = renderSidebarItems();
    root.innerHTML = renderHero() + renderToolbar()
      + (tab === 'home' ? `<div class="learn-main">${renderMainContent()}</div>`
        : `<div class="learn-layout">
            <aside class="learn-sidebar" aria-label="Navigation"><div class="learn-sidebar-hd">Sommaire</div>${sidebarItems || '<p class="learn-empty">Aucun résultat</p>'}</aside>
            <div class="learn-main" id="learn-main">${renderMainContent()}</div>
          </div>`);
    bindEvents();
    if (tab !== 'home' && !selectedKey) {
      const first = root.querySelector('[data-learn-key]');
      if (first) {
        selectedKey = first.dataset.learnKey;
        const main = document.getElementById('learn-main');
        if (main) main.innerHTML = renderMainContent();
        root.querySelectorAll('[data-learn-key]').forEach((b) => b.classList.toggle('on', b.dataset.learnKey === selectedKey));
      }
    }
    hydrateSelection();
  }

  function hydrateSelection() {
    if (selectedKey.startsWith('q:')) {
      const i = parseInt(selectedKey.slice(2), 10);
      const q = Q[i];
      const slot = document.getElementById('learn-q-detail');
      if (!slot || !q) return;
      const render = () => {
        if (typeof renderQuestionErrorFicheHTML === 'function') {
          slot.innerHTML = renderQuestionErrorFicheHTML(q, { idx: i, chosenIdx: -1 });
        } else {
          slot.innerHTML = '<p class="learn-p">' + esc(q.e || q.q) + '</p>';
        }
      };
      if (window.PPLQuestionFicheLazy) {
        PPLQuestionFicheLazy.ensureBankForQuestion(q, i).then(render).catch(render);
      } else render();
    }
    if (selectedKey.startsWith('topic:') && window.PPLFormulasLazy) {
      const main = document.getElementById('learn-main');
      if (main) PPLFormulasLazy.hydrateFicheFormulaSlots(main);
    }
  }

  function bindEvents() {
    root.querySelectorAll('[data-learn-tab]').forEach((btn) => {
      btn.onclick = () => {
        tab = btn.dataset.learnTab;
        selectedKey = '';
        renderAll();
      };
    });
    root.querySelectorAll('[data-learn-mod]').forEach((btn) => {
      btn.onclick = () => {
        mod = btn.dataset.learnMod;
        selectedKey = '';
        renderAll();
      };
    });
    root.querySelectorAll('[data-learn-goto]').forEach((btn) => {
      btn.onclick = () => {
        tab = btn.dataset.learnGoto;
        selectedKey = '';
        renderAll();
      };
    });
    if (!root.dataset.learnDelegated) {
      root.dataset.learnDelegated = '1';
      root.addEventListener('click', (e) => {
        const docViewBtn = e.target.closest('[data-doc-view]');
        if (docViewBtn) {
          docView = docViewBtn.dataset.docView;
          const main = document.getElementById('learn-main');
          if (main) main.innerHTML = renderMainContent();
          return;
        }
        const keyBtn = e.target.closest('[data-learn-key]');
        if (!keyBtn) return;
        selectedKey = keyBtn.dataset.learnKey;
        if (selectedKey.startsWith('docfull:')) docView = 'both';
        selectedQIdx = selectedKey.startsWith('q:') ? parseInt(selectedKey.slice(2), 10) : -1;
        const main = document.getElementById('learn-main');
        if (main) main.innerHTML = renderMainContent();
        root.querySelectorAll('.learn-nav-item[data-learn-key]').forEach((b) => b.classList.toggle('on', b.dataset.learnKey === selectedKey));
        hydrateSelection();
        main?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
    const inp = document.getElementById('learn-search');
    if (inp) {
      let t;
      inp.addEventListener('input', () => {
        search = inp.value;
        clearTimeout(t);
        t = setTimeout(() => { selectedKey = ''; renderAll(); }, 280);
      });
    }
  }

  function boot() {
    if (typeof Q === 'undefined') {
      root.innerHTML = '<div class="learn-empty">Banque questions non chargée.</div>';
      return;
    }
    const params = new URLSearchParams(location.search);
    const t = params.get('tab');
    const topic = params.get('topic');
    if (t && ['docs', 'topics', 'questions', 'formulas'].includes(t)) tab = t;
    if (topic) {
      tab = 'topics';
      selectedKey = 'topic:' + topic;
    }
    if (tab === 'formulas' && window.PPLFormulasLazy) {
      PPLFormulasLazy.ensureFormulasEngine().then(renderAll).catch(renderAll);
      return;
    }
    renderAll();
  }

  function init() {
    if (!root) return;
    if (window.PPLSettings?.hasPrivacyConsent?.()) {
      if (typeof requestIdleCallback === 'function') requestIdleCallback(boot, { timeout: 1200 });
      else setTimeout(boot, 40);
      return;
    }
    root.innerHTML = '<div class="learn-empty">Validez vos préférences de confidentialité pour charger l\'encyclopédie.</div>';
    window.addEventListener('ppl-privacy-consent', boot, { once: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
