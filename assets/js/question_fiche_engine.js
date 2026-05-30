/**
 * Fiches erreur — affichage et hydratation (moteur dans question_fiche_core.js).
 */
(function (global) {
  'use strict';

  const Core = global.PPLQuestionFicheCore;
  if (!Core) {
    console.error('[PPL] question_fiche_core.js doit être chargé avant question_fiche_engine.js');
    return;
  }

  function esc(s) {
    return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function modStr(m) {
    return Core.modLabel(m);
  }

  function modClass(m) {
    return { C: 'bd-comm', A: 'bd-aero', M: 'bd-met', R: 'bd-reg' }[m] || '';
  }

  function resolveQIdx(q, idx) {
    if (idx != null && idx >= 0) return idx;
    if (typeof qIdx === 'function') return qIdx(q);
    if (typeof Q !== 'undefined' && Array.isArray(Q)) return Q.indexOf(q);
    return -1;
  }

  function getChunkFiche(idx, q, chosenIdx) {
    const mod = q.m;
    const bucket = global['Q_FICHES_' + mod];
    if (!bucket) return null;
    const raw = bucket[idx];
    if (!raw) return null;
    return Core.expandCompactFiche(raw, q, chosenIdx);
  }

  function getQuestionFiche(idx, q, chosenIdx) {
    chosenIdx = chosenIdx == null ? -1 : chosenIdx;
    if (chosenIdx >= 0) return Core.buildQuestionErrorFiche(q, chosenIdx);
    const chunk = getChunkFiche(idx, q, chosenIdx);
    if (chunk) return chunk;
    return Core.buildQuestionErrorFiche(q, chosenIdx);
  }

  function renderBehCompact(beh, logEntry) {
    const b = beh || logEntry?.beh || {};
    const rows = [];
    if (b.reactionSec != null) rows.push(['Réaction', b.reactionSec.toFixed(1) + ' s']);
    if (b.decisionSec != null) rows.push(['Décision', b.decisionSec.toFixed(1) + ' s']);
    if (b.readSec != null) rows.push(['Lecture', b.readSec.toFixed(1) + ' s']);
    if (b.hoverSwitches != null) rows.push(['Survols / hésitations', (b.hoverSwitches || 0) + ' / ' + (b.vacillations || 0)]);
    if (b.wrongHoverCount != null) rows.push(['Temps sur mauvaises options', Math.round((b.wrongDwellRatio || 0) * 100) + '%']);
    if (logEntry?.reactScore != null) rows.push(['Score réaction', logEntry.reactScore + '%']);
    if (!rows.length) return '';
    return '<div class="fiche-pro-beh">' + rows.map(([k, v]) =>
      '<div class="fiche-pro-beh-it"><span>' + esc(k) + '</span><strong>' + esc(v) + '</strong></div>'
    ).join('') + '</div>';
  }

  function renderOptRow(o) {
    const cls = 'fiche-pro-opt'
      + (o.ok ? ' fiche-pro-opt--ok' : '')
      + (o.chosen ? ' fiche-pro-opt--chosen' : '');
    const badge = o.ok
      ? '<span class="fiche-pro-opt-badge fiche-pro-opt-badge--ok">Correcte</span>'
      : (o.chosen ? '<span class="fiche-pro-opt-badge fiche-pro-opt-badge--ko">Ta réponse</span>' : '');
    return '<div class="' + cls + '">'
      + '<span class="fiche-pro-opt-l">' + esc(o.l) + '</span>'
      + '<div class="fiche-pro-opt-body">'
      + '<div class="fiche-pro-opt-txt">' + esc(o.t) + badge + '</div>'
      + '<div class="fiche-pro-opt-why">' + esc(o.w) + '</div>'
      + '</div></div>';
  }

  function renderCard(icon, iconMod, title, body) {
    return '<section class="fiche-pro-card">'
      + '<div class="fiche-pro-card-hd">'
      + '<span class="fiche-pro-card-icon' + (iconMod ? ' fiche-pro-card-icon--' + iconMod : '') + '">' + icon + '</span>'
      + '<h4 class="fiche-pro-card-title">' + esc(title) + '</h4>'
      + '</div>'
      + '<div class="fiche-pro-card-bd">' + body + '</div>'
      + '</section>';
  }

  function renderQuestionErrorFicheHTML(q, opts) {
    opts = opts || {};
    const idx = opts.idx != null ? opts.idx : resolveQIdx(q, -1);
    const chosenIdx = opts.chosenIdx != null ? opts.chosenIdx : -1;
    const entry = opts.entry;
    const beh = opts.beh || entry?.lastBeh;
    const logEntry = opts.logEntry;
    const f = getQuestionFiche(idx, q, chosenIdx);
    const isWrong = chosenIdx >= 0 && chosenIdx !== q.a;
    const repeat = isWrong ? (entry?.wrongChoices?.[chosenIdx] || 0) : 0;

    const tags = [
      '<span class="bd ' + modClass(f.mod || q.m) + '">' + esc(modStr(f.mod || q.m)) + '</span>',
      repeat > 1 ? '<span class="fiche-pro-tag fiche-pro-tag--warn">Même erreur ×' + repeat + '</span>' : '',
      (entry?.failCount || 0) > 1 ? '<span class="fiche-pro-tag fiche-pro-tag--warn">' + entry.failCount + ' erreurs</span>' : '',
    ].filter(Boolean).join('');

    const compareHtml = isWrong
      ? '<div class="fiche-pro-compare">'
        + '<div class="fiche-pro-ans fiche-pro-ans--wrong"><strong>Ta réponse</strong>' + esc(q.o[chosenIdx]) + '</div>'
        + '<div class="fiche-pro-ans fiche-pro-ans--right"><strong>Bonne réponse</strong>' + esc(q.o[q.a]) + '</div>'
        + '</div>'
      : '';

    const optRows = (f.o || []).map(renderOptRow).join('');
    const retainHtml = (f.k || []).map((b) => '<li>' + esc(b) + '</li>').join('');
    const stepsHtml = (f.s || []).map((s) => '<li>' + esc(s) + '</li>').join('');
    const behHtml = renderBehCompact(beh, logEntry);
    const behBlock = behHtml ? renderCard('◷', '', 'Comportement', behHtml) : '';
    const oneliner = f.p ? '<p class="fiche-pro-oneliner">' + esc(f.p) + '</p>' : '';

    return '<article class="fiche-pro q-fiche-ultra fiche-error-ultra">'
      + '<header class="fiche-pro-head">'
      + '<div class="fiche-pro-top"><span class="fiche-pro-kicker">Fiche explicative</span>'
      + '<div class="fiche-pro-tags">' + tags + '</div></div>'
      + '<p class="fiche-pro-q q-fiche-question">' + esc(q.q) + '</p>'
      + compareHtml
      + '</header>'
      + '<div class="fiche-pro-lead">'
      + '<span class="fiche-pro-lead-label">Comprendre simplement</span>'
      + oneliner
      + '<p class="q-fiche-essentiel">' + esc(f.e) + '</p>'
      + '</div>'
      + '<div class="fiche-pro-body">'
      + renderCard('✓', 'ok', 'Pourquoi c\'est la bonne réponse', '<p class="q-fiche-why">' + esc(f.w) + '</p>')
      + renderCard('AB', '', 'Chaque option expliquée', '<div class="fiche-pro-opts err-opt-list">' + optRows + '</div>')
      + renderCard('•', '', 'À retenir pour l\'examen', '<ul class="fiche-pro-list q-fiche-retain">' + retainHtml + '</ul>')
      + (f.m ? renderCard('★', 'tip', 'Astuce mémo', '<div class="fiche-pro-highlight fiche-pro-highlight--memo fiche-mnemo">' + esc(f.m) + '</div>') : '')
      + renderCard('→', 'tip', 'Conseil examen', '<div class="fiche-pro-highlight fiche-pro-highlight--exam fiche-exam-tip">' + esc(f.t) + '</div>')
      + renderCard('≡', '', 'Plan de révision — ' + (f.s || []).length + ' étapes', '<ol class="fiche-pro-list fiche-pro-list--steps err-action-plan">' + stepsHtml + '</ol>')
      + behBlock
      + '</div>'
      + '<footer class="fiche-pro-foot q-fiche-ref">Thème : <strong>' + esc(f.r || q.r) + '</strong></footer>'
      + '</article>';
  }

  function hydrateErrorFicheSlot(slot, q, opts) {
    if (!slot || !q) return;
    const idx = opts && opts.idx != null ? opts.idx : resolveQIdx(q, -1);
    const render = function () {
      slot.innerHTML = renderQuestionErrorFicheHTML(q, opts);
    };
    const mod = q.m;
    if (global.PPLQuestionFicheLazy && global.PPLQuestionFicheLazy.isModLoaded
      && global.PPLQuestionFicheLazy.isModLoaded(mod)) {
      render();
      return;
    }
    const lazy = global.PPLQuestionFicheLazy;
    if (lazy && typeof lazy.ensureBankForQuestion === 'function') {
      lazy.ensureBankForQuestion(q, idx).then(render).catch(render);
    } else if (lazy && typeof lazy.ensureBank === 'function') {
      lazy.ensureBank(mod).then(render).catch(render);
    } else {
      render();
    }
  }

  global.buildQuestionErrorFiche = Core.buildQuestionErrorFiche;
  global.getQuestionFiche = getQuestionFiche;
  global.renderQuestionErrorFicheHTML = renderQuestionErrorFicheHTML;
  global.hydrateErrorFicheSlot = hydrateErrorFicheSlot;
  global.PPLQuestionFiche = {
    buildQuestionErrorFiche: Core.buildQuestionErrorFiche,
    getQuestionFiche,
    renderQuestionErrorFicheHTML,
    hydrateErrorFicheSlot,
  };
})(typeof window !== 'undefined' ? window : this);
