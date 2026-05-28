(function (global) {
  'use strict';

  var KEY = 'ppl4sessionFiches';
  var sessionFiches = { sessions: [] };

  function load() {
    try {
      sessionFiches = JSON.parse(localStorage.getItem(KEY) || '{"sessions":[]}');
    } catch (e) {
      sessionFiches = { sessions: [] };
    }
    if (!sessionFiches.sessions) sessionFiches.sessions = [];
    return sessionFiches;
  }

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(sessionFiches));
    } catch (e) { /* ignore */ }
  }

  load();

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

  function archiveSession(sData, meta) {
    if (!sData || !sData.length) return;
    load();
    var ok = sData.filter(function (d) { return d.ok; }).length;
    var session = {
      id: Date.now(),
      t: Date.now(),
      mode: (meta && meta.mode) || 'train',
      ok: ok,
      total: sData.length,
      pct: Math.round(ok / sData.length * 100),
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
        '<p>Aucune fiche de session — termine un quiz pour les retrouver ici.</p>' +
        '</div>';
    }
    var errTotal = sessions.reduce(function (n, s) {
      return n + s.items.filter(function (i) { return !i.ok; }).length;
    }, 0);
    var ficheTotal = sessions.reduce(function (n, s) { return n + s.items.length; }, 0);

    return '<div class="fiche-sticky-bar">' +
      '<span class="fiche-sort-lbl">' + sessions.length + ' session' + (sessions.length > 1 ? 's' : '') +
      ' · ' + ficheTotal + ' fiche' + (ficheTotal > 1 ? 's' : '') +
      ' · ' + errTotal + ' erreur' + (errTotal > 1 ? 's' : '') + '</span>' +
      '<button type="button" class="fiche-bar-btn" data-session-clear="all">Effacer l\'historique</button>' +
      '</div>' +
      sessions.map(function (sess) {
        var errN = sess.items.filter(function (i) { return !i.ok; }).length;
        return '<section class="session-fiche-group" data-session-id="' + sess.id + '">' +
          '<div class="session-fiche-hd">' +
          '<div class="session-fiche-hd-left">' +
          '<span class="session-fiche-date">' + fmtSessionDate(sess.t) + '</span>' +
          '<span class="session-fiche-meta">' + sess.pct + '% · ' + sess.ok + '/' + sess.total +
          ' · ' + errN + ' erreur' + (errN > 1 ? 's' : '') + '</span>' +
          '</div>' +
          '<span class="bd">' + esc(sess.mode || 'train') + '</span>' +
          '</div>' +
          '<div class="session-fiche-list">' +
          sess.items.map(function (item, i) {
            var openAttr = !item.ok ? ' open' : '';
            var title = String(item.question || '');
            return '<details class="session-fiche-card ' + (item.ok ? 'session-fiche-card--ok' : 'session-fiche-card--ko') + '"' + openAttr + '>' +
              '<summary>' +
              '<span class="recap-num">Q' + (i + 1) + '</span>' +
              '<span class="recap-icon">' + (item.ok ? '✓' : '✗') + '</span>' +
              '<span class="bd ' + modClass(item.mod) + '">' + modStr(item.mod) + '</span>' +
              '<span class="recap-title">' + esc(title.length > 90 ? title.slice(0, 87) + '…' : title) + '</span>' +
              '<span class="recap-meta">' + item.el.toFixed(1) + 's</span>' +
              '</summary>' +
              '<div class="session-fiche-body">' + renderSessionItemFiche(item) + '</div>' +
              '</details>';
          }).join('') +
          '</div></section>';
      }).join('');
  }

  function clearAll() {
    sessionFiches = { sessions: [] };
    save();
  }

  function countSessions() {
    load();
    return sessionFiches.sessions.length;
  }

  global.PPLSessionFiches = {
    archive: archiveSession,
    renderTab: renderSessionFichesTab,
    load: load,
    save: save,
    clear: clearAll,
    count: countSessions,
  };
})(typeof window !== 'undefined' ? window : globalThis);
