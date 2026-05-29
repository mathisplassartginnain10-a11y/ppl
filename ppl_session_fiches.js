(function (global) {
  'use strict';

  var KEY = 'ppl4sessionFiches';
  var KEY_ERRORS = 'ppl4errorFiches';
  var MAX_ERRORS = 300;
  var sessionFiches = { sessions: [] };
  var errorFiches = { items: [] };

  var MODE_LABELS = {
    exam: 'Examen',
    train: 'Entraînement',
    speed: 'Vitesse',
    weak: 'Points faibles',
  };

  function load() {
    try {
      sessionFiches = JSON.parse(localStorage.getItem(KEY) || '{"sessions":[]}');
    } catch (e) {
      sessionFiches = { sessions: [] };
    }
    if (!sessionFiches.sessions) sessionFiches.sessions = [];
    return sessionFiches;
  }

  function loadErrors() {
    try {
      errorFiches = JSON.parse(localStorage.getItem(KEY_ERRORS) || '{"items":[]}');
    } catch (e) {
      errorFiches = { items: [] };
    }
    if (!errorFiches.items) errorFiches.items = [];
    return errorFiches;
  }

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(sessionFiches));
    } catch (e) { /* ignore */ }
  }

  function saveErrors() {
    try {
      localStorage.setItem(KEY_ERRORS, JSON.stringify(errorFiches));
    } catch (e) { /* ignore */ }
  }

  load();
  loadErrors();

  function sanitizeBeh(beh) {
    if (!beh) return null;
    return {
      reactionSec: beh.reactionSec,
      decisionSec: beh.decisionSec,
      readSec: beh.readSec,
      hoverSwitches: beh.hoverSwitches,
      wrongHoverCount: beh.wrongHoverCount,
      vacillations: beh.vacillations,
      dwellChosen: beh.dwellChosen,
      moveDist: beh.moveDist,
      wrongDwellRatio: beh.wrongDwellRatio,
      chosenIdx: beh.chosenIdx,
      longestWrongIdx: beh.longestWrongIdx,
      blurCount: beh.blurCount,
    };
  }

  function buildErrorItem(q, idx, el, beh, reactScore, mode) {
    return {
      id: Date.now() + '-' + Math.random().toString(36).slice(2, 8),
      t: Date.now(),
      mode: mode || 'train',
      idx: idx >= 0 ? idx : null,
      ok: false,
      el: el,
      ref: q.r,
      mod: q.m,
      diff: q.d,
      question: q.q,
      explain: q.e,
      options: q.o.slice(),
      correctIdx: q.a,
      chosenIdx: (beh && beh.chosenIdx != null) ? beh.chosenIdx : -1,
      reactScore: reactScore,
      beh: sanitizeBeh(beh),
    };
  }

  function archiveError(payload) {
    if (!payload || !payload.q) return;
    if (payload.ok === true) return;
    loadErrors();
    var idx = payload.idx;
    if (idx == null && typeof Q !== 'undefined') idx = Q.indexOf(payload.q);
    errorFiches.items.unshift(buildErrorItem(
      payload.q,
      idx,
      payload.el || 0,
      payload.beh,
      payload.reactScore,
      payload.mode
    ));
    if (errorFiches.items.length > MAX_ERRORS) {
      errorFiches.items = errorFiches.items.slice(0, MAX_ERRORS);
    }
    saveErrors();
  }

  function archiveSession(sData, meta) {
    if (!sData || !sData.length) return;
    load();
    var ok = sData.filter(function (d) { return d.ok; }).length;
    var session = {
      id: Date.now(),
      t: Date.now(),
      mode: (meta && meta.mode) || 'train',
      ok: meta && meta.ok != null ? meta.ok : ok,
      total: sData.length,
      pct: meta && meta.pct != null ? meta.pct : Math.round(ok / sData.length * 100),
      errCount: meta && meta.errCount != null ? meta.errCount : (sData.length - ok),
      pass: meta && meta.pass,
      avgReactScore: meta && meta.avgReactScore,
      avgMastery: meta && meta.avgMastery,
      examP: meta && meta.examP,
      items: sData.map(function (d, i) {
        var q = d.q;
        var idx = d.idx;
        if (idx == null && typeof Q !== 'undefined') idx = Q.indexOf(q);
        return {
          idx: idx >= 0 ? idx : null,
          qi: i,
          ok: d.ok,
          el: d.el,
          ref: q.r,
          mod: q.m,
          diff: q.d,
          question: q.q,
          explain: q.e,
          options: q.o.slice(),
          correctIdx: q.a,
          chosenIdx: (d.beh && d.beh.chosenIdx != null) ? d.beh.chosenIdx : -1,
          reactScore: d.reactScore,
          beh: sanitizeBeh(d.beh),
          t: Date.now(),
        };
      }),
    };
    sessionFiches.sessions.unshift(session);
    if (sessionFiches.sessions.length > 40) {
      sessionFiches.sessions = sessionFiches.sessions.slice(0, 40);
    }
    save();
  }

  function itemToQ(item) {
    if (item.idx != null && typeof Q !== 'undefined' && Q[item.idx]) return Q[item.idx];
    return {
      q: item.question,
      e: item.explain,
      o: item.options,
      a: item.correctIdx,
      r: item.ref,
      m: item.mod,
      d: item.diff,
    };
  }

  function fmtSessionDate(ts) {
    var diff = Date.now() - ts;
    if (diff < 86400000) {
      return "Aujourd'hui " + new Date(ts).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    }
    if (diff < 172800000) {
      return 'Hier ' + new Date(ts).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    }
    return new Date(ts).toLocaleDateString('fr-FR', {
      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  }

  function renderSessionRecapDetail(item, i) {
    var q = itemToQ(item);
    var chosenIdx = item.chosenIdx != null ? item.chosenIdx : -1;
    var entry = (typeof revLog !== 'undefined' && item.idx != null) ? revLog.entries[item.idx] : null;
    var beh = item.beh;
    var logEntry = {
      reactScore: item.reactScore,
      beh: item.beh,
      el: item.el,
      t: item.t,
    };
    var openAttr = !item.ok ? ' open' : '';
    var statsHref = item.idx != null ? 'stats.html?i=' + item.idx : 'stats.html';
    var summTitle = typeof summarizeKey === 'function'
      ? summarizeKey(q.q)
      : String(q.q || '').slice(0, 80);
    var modLabel = typeof modStr === 'function' ? modStr(q.m) : item.mod;
    var deepHtml = '';
    if (!item.ok && typeof renderDeepFicheHTML === 'function') {
      deepHtml = renderDeepFicheHTML(q, entry, chosenIdx, beh, logEntry);
    }

    return '<details class="recap-item ' + (item.ok ? 'recap-ok' : 'recap-ko') + '"' + openAttr + '>' +
      '<summary>' +
      '<span class="recap-num">Q' + (i + 1) + '</span>' +
      '<span class="recap-icon">' + (item.ok ? '✓' : '✗') + '</span>' +
      '<span class="recap-mod">' + esc(modLabel) + '</span>' +
      '<span class="recap-title">' + esc(summTitle) + '</span>' +
      '<span class="recap-meta">' + item.el.toFixed(1) + 's</span>' +
      '</summary>' +
      '<div class="recap-body">' +
      '<p class="recap-question">' + esc(q.q) + '</p>' +
      (!item.ok && chosenIdx >= 0
        ? '<p class="recap-wrong">✗ Ta réponse : <strong>' + esc(q.o[chosenIdx]) + '</strong></p>'
        : '') +
      '<p class="recap-correct">✓ Bonne réponse : <strong>' + esc(q.o[q.a]) + '</strong></p>' +
      '<div class="recap-exp">' + esc(q.e) + '</div>' +
      '<div class="recap-ref">📌 ' + esc(q.r) + '</div>' +
      deepHtml +
      '<a href="' + statsHref + '" class="fb-stats-link" target="_blank" rel="noopener">📊 Stats détaillées →</a>' +
      '</div></details>';
  }

  function renderSessionItemFiche(item) {
    var q = itemToQ(item);
    var entry = (typeof revLog !== 'undefined' && item.idx != null) ? revLog.entries[item.idx] : null;
    var chosenIdx = item.chosenIdx != null ? item.chosenIdx : -1;
    var beh = item.beh;

    if (!item.ok && typeof renderDeepFicheHTML === 'function') {
      return renderDeepFicheHTML(q, entry, chosenIdx, beh);
    }

    var summ = typeof summarizeKey === 'function'
      ? summarizeKey(q.e)
      : String(q.e || '').slice(0, 220);

    return '<div class="session-fiche-ok">' +
      '<div class="session-fiche-ok-hd">' +
      '<span class="bd ' + modClass(q.m) + '">' + modStr(q.m) + '</span>' +
      '<span class="recap-icon">✓</span> Correct · ' + item.el.toFixed(1) + 's' +
      (item.reactScore != null ? ' · réaction ' + item.reactScore + '%' : '') +
      '</div>' +
      '<p class="recap-question">' + esc(q.q) + '</p>' +
      '<p class="recap-correct">✓ ' + esc(q.o[q.a]) + '</p>' +
      '<div class="recap-exp">' + esc(summ) + '</div>' +
      '<div class="recap-ref">📌 ' + esc(q.r) + '</div>' +
      (typeof renderTopicFicheHTML === 'function'
        ? '<details class="fiche-theme-expand"><summary>📚 Fiche thème complète</summary><div class="fiche-theme-expand-bd">' +
          renderTopicFicheHTML(q.r, { sampleQ: q, entry: entry, showFoot: false, compact: true }) +
          '</div></details>'
        : '') +
      '</div>';
  }

  function renderSessionFichesTab() {
    load();
    var sessions = sessionFiches.sessions;
    if (!sessions.length) {
      return '<div class="rev-empty fiche-empty">' +
        '<span class="fiche-empty-ico">📋</span>' +
        '<p>Aucun résumé archivé — termine un quiz pour retrouver ici le résumé détaillé complet de chaque session.</p>' +
        '</div>';
    }
    var errTotal = sessions.reduce(function (n, s) {
      return n + (s.errCount != null ? s.errCount : s.items.filter(function (i) { return !i.ok; }).length);
    }, 0);
    var ficheTotal = sessions.reduce(function (n, s) { return n + s.items.length; }, 0);

    return '<div class="fiche-sticky-bar">' +
      '<span class="fiche-sort-lbl">' + sessions.length + ' résumé' + (sessions.length > 1 ? 's' : '') +
      ' archivé' + (sessions.length > 1 ? 's' : '') +
      ' · ' + ficheTotal + ' question' + (ficheTotal > 1 ? 's' : '') +
      ' · ' + errTotal + ' erreur' + (errTotal > 1 ? 's' : '') + '</span>' +
      '<button type="button" class="fiche-bar-btn" data-session-clear="all">Effacer les résumés</button>' +
      '</div>' +
      sessions.map(function (sess, si) {
        var errN = sess.errCount != null ? sess.errCount : sess.items.filter(function (i) { return !i.ok; }).length;
        var modeLabel = MODE_LABELS[sess.mode] || sess.mode || 'Quiz';
        var openSess = si === 0 ? ' open' : '';
        var passLabel = sess.pass === true ? ' · ✓ seuil atteint' : (sess.pass === false ? ' · ✗ sous le seuil' : '');
        var reactLabel = sess.avgReactScore != null ? ' · réact. ' + sess.avgReactScore + '%' : '';
        return '<details class="session-recap-stored session-fiche-group" data-session-id="' + sess.id + '"' + openSess + '>' +
          '<summary class="session-fiche-hd session-recap-summary">' +
          '<div class="session-fiche-hd-left">' +
          '<span class="session-fiche-date">📋 ' + fmtSessionDate(sess.t) + '</span>' +
          '<span class="session-fiche-meta">' + sess.pct + '% · ' + sess.ok + '/' + sess.total +
          ' · ' + errN + ' erreur' + (errN > 1 ? 's' : '') + passLabel + reactLabel + '</span>' +
          '</div>' +
          '<span class="bd">' + esc(modeLabel) + '</span>' +
          '</summary>' +
          '<div class="session-recap session-recap-stored-bd">' +
          '<p class="session-recap-sub">Résumé détaillé archivé — mêmes explications qu\'à la fin du quiz.</p>' +
          '<div class="recap-list">' +
          sess.items.map(function (item, i) { return renderSessionRecapDetail(item, i); }).join('') +
          '</div></div></details>';
      }).join('');
  }

  function renderErrorFicheBody(item) {
    var q = itemToQ(item);
    var entry = (typeof revLog !== 'undefined' && item.idx != null) ? revLog.entries[item.idx] : null;
    var chosenIdx = item.chosenIdx != null ? item.chosenIdx : -1;
    var beh = item.beh;
    var logEntry = {
      reactScore: item.reactScore,
      beh: item.beh,
      el: item.el,
      t: item.t,
    };

    if (typeof renderDeepFicheHTML === 'function') {
      return renderDeepFicheHTML(q, entry, chosenIdx, beh, logEntry);
    }

    return '<div class="session-fiche-ok">' +
      '<p class="recap-question">' + esc(q.q) + '</p>' +
      (chosenIdx >= 0
        ? '<p class="recap-wrong">✗ Ta réponse : <strong>' + esc(q.o[chosenIdx]) + '</strong></p>'
        : '') +
      '<p class="recap-correct">✓ Bonne réponse : <strong>' + esc(q.o[q.a]) + '</strong></p>' +
      '<div class="recap-exp">' + esc(q.e) + '</div>' +
      '<div class="recap-ref">📌 ' + esc(q.r) + '</div>' +
      '</div>';
  }

  function renderErrorsTab() {
    loadErrors();
    var items = errorFiches.items;
    if (!items.length) {
      return '<div class="rev-empty fiche-empty">' +
        '<span class="fiche-empty-ico">✕</span>' +
        '<p>Aucune fiche d\'erreur — chaque mauvaise réponse au quiz crée automatiquement une fiche ici.</p>' +
        '</div>';
    }

    return '<div class="fiche-sticky-bar">' +
      '<span class="fiche-sort-lbl">' + items.length + ' fiche' + (items.length > 1 ? 's' : '') +
      ' d\'erreur enregistrée' + (items.length > 1 ? 's' : '') + '</span>' +
      '<button type="button" class="fiche-bar-btn" data-error-clear="all">Effacer les fiches erreur</button>' +
      '</div>' +
      '<div class="session-fiche-list error-fiche-list">' +
      items.map(function (item, i) {
        var title = String(item.question || '');
        var modeLabel = MODE_LABELS[item.mode] || item.mode || 'Quiz';
        return '<details class="session-fiche-card session-fiche-card--ko error-fiche-card" open>' +
          '<summary>' +
          '<span class="recap-num">#' + (items.length - i) + '</span>' +
          '<span class="recap-icon">✗</span>' +
          '<span class="bd ' + modClass(item.mod) + '">' + modStr(item.mod) + '</span>' +
          '<span class="recap-title">' + esc(title.length > 90 ? title.slice(0, 87) + '…' : title) + '</span>' +
          '<span class="recap-meta">' + fmtSessionDate(item.t) + ' · ' + item.el.toFixed(1) + 's</span>' +
          '</summary>' +
          '<div class="session-fiche-body">' +
          '<div class="error-fiche-meta">' +
          '<span class="bd">' + esc(modeLabel) + '</span>' +
          '<span class="error-fiche-ref">📌 ' + esc(item.ref || '') + '</span>' +
          (item.idx != null
            ? '<a href="index.html?q=' + item.idx + '" class="fiche-link-btn">Refaire cette question →</a>'
            : '') +
          '</div>' +
          renderErrorFicheBody(item) +
          '</div>' +
          '</details>';
      }).join('') +
      '</div>';
  }

  function clearAll() {
    sessionFiches = { sessions: [] };
    save();
  }

  function clearErrors() {
    errorFiches = { items: [] };
    saveErrors();
  }

  function countErrors() {
    loadErrors();
    return errorFiches.items.length;
  }

  function countSessions() {
    load();
    return sessionFiches.sessions.length;
  }

  global.PPLSessionFiches = {
    archive: archiveSession,
    archiveError: archiveError,
    renderTab: renderSessionFichesTab,
    renderErrorsTab: renderErrorsTab,
    load: load,
    loadErrors: loadErrors,
    save: save,
    saveErrors: saveErrors,
    clear: clearAll,
    clearErrors: clearErrors,
    count: countSessions,
    countErrors: countErrors,
  };
})(typeof window !== 'undefined' ? window : globalThis);
