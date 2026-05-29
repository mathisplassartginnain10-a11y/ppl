/* Liaison thèmes ↔ questions banque PPL */
(function () {
  'use strict';

  function norm(s) {
    return String(s || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }

  function matchTopic(qRef, filter) {
    if (!filter) return true;
    const a = norm(qRef);
    const b = norm(filter);
    if (!a || !b) return false;
    if (a === b) return true;
    if (a.includes(b) || b.includes(a)) return true;
    const strip = (x) => x.replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
    const sa = strip(a);
    const sb = strip(b);
    return sa === sb || sa.includes(sb) || sb.includes(sa);
  }

  function getTopicQuestionIndices(ref) {
    if (typeof Q === 'undefined' || !ref) return [];
    const out = [];
    Q.forEach((q, i) => {
      if (matchTopic(q.r, ref)) out.push(i);
    });
    return out;
  }

  function getTopicQuestionCount(ref) {
    return getTopicQuestionIndices(ref).length;
  }

  function resolveTopicRef(ref) {
    if (typeof Q === 'undefined' || !ref) return ref;
    const exact = Q.find((q) => q.r === ref);
    if (exact) return exact.r;
    const idx = getTopicQuestionIndices(ref)[0];
    return idx != null ? Q[idx].r : ref;
  }

  function renderFicheQuestionsList(ref, helpers) {
    if (typeof Q === 'undefined') return '';
    const esc = helpers?.esc || ((s) => String(s ?? ''));
    const modStr = helpers?.modStr || ((m) => m);
    const modClass = helpers?.modClass || (() => '');
    const diffStr = helpers?.diffStr || ((d) => String(d));
    const diffClass = helpers?.diffClass || (() => '');
    const hist = typeof window.hist !== 'undefined' ? window.hist : {};
    const idxs = getTopicQuestionIndices(ref);
    if (!idxs.length) return '';

    const items = idxs
      .map((idx, i) => {
        const q = Q[idx];
        if (!q) return '';
        const st = hist[idx] === true ? 'ok' : hist[idx] === false ? 'ko' : 'new';
        const ans = q.o[q.a];
        return `<article class="fiche-q-item fiche-q-${st}" data-q-idx="${idx}">
        <div class="fiche-q-head">
          <span class="fiche-q-num">${i + 1}</span>
          <span class="bd ${modClass(q.m)}">${esc(modStr(q.m))}</span>
          <span class="bd ${diffClass(q.d)}">${esc(diffStr(q.d))}</span>
          ${st === 'ok' ? '<span class="fiche-q-status ok">✓</span>' : st === 'ko' ? '<span class="fiche-q-status ko">✗</span>' : ''}
        </div>
        <p class="fiche-q-text">${esc(q.q)}</p>
        <details class="fiche-q-options"><summary>Toutes les options QCM</summary>
          <ul class="fiche-opt-list">${q.o.map((o, j) => `<li class="fiche-opt-item${j === q.a ? ' fiche-opt-ok' : ''}"><span class="fiche-opt-letter">${String.fromCharCode(65 + j)}</span> ${esc(o)}${j === q.a ? ' ✓' : ''}</li>`).join('')}</ul>
        </details>
        <details class="fiche-q-answer"><summary>Réponse & explication</summary><p class="fiche-q-ans">✓ ${esc(ans)}</p>${q.e ? `<p class="fiche-q-exp">${esc(q.e)}</p>` : ''}</details>
        <div class="fiche-q-actions">
          <a href="index.html?q=${idx}" class="rev-btn-sm">Refaire cette question</a>
        </div>
      </article>`;
      })
      .join('');

    return `<div class="fiche-q-list" data-topic="${esc(ref)}">${items}</div>`;
  }

  window.matchTopic = matchTopic;
  window.getTopicQuestionIndices = getTopicQuestionIndices;
  window.getTopicQuestionCount = getTopicQuestionCount;
  window.resolveTopicRef = resolveTopicRef;
  window.renderFicheQuestionsList = renderFicheQuestionsList;
})();
