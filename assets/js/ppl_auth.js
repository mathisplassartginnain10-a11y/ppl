(function () {
  'use strict';

  var CODE = 'PPL2026';
  var KEY = 'ppl4gate';
  var MAX_ATT = 3;
  var LOCK_MS = 60 * 1000;
  var MAX_LOCKOUTS = 15;
  var DAY_MS = 24 * 60 * 60 * 1000;

  function load() {
    try {
      return JSON.parse(localStorage.getItem(KEY) || '{}') || {};
    } catch (e) {
      return {};
    }
  }

  function save(s) {
    try {
      localStorage.setItem(KEY, JSON.stringify(s));
    } catch (e) {}
  }

  function defaultState() {
    return { ok: false, attempts: 0, lockouts: 0, lockUntil: 0, dayUntil: 0 };
  }

  function normalize(s) {
    s = s || defaultState();
    if (!s.ok) s.ok = false;
    s.attempts = s.attempts || 0;
    s.lockouts = s.lockouts || 0;
    s.lockUntil = s.lockUntil || 0;
    s.dayUntil = s.dayUntil || 0;
    return s;
  }

  function isAuthed() {
    return !!normalize(load()).ok;
  }

  function getBlock(now) {
    now = now || Date.now();
    var s = normalize(load());
    if (s.dayUntil && s.dayUntil > now) {
      return { type: 'day', until: s.dayUntil };
    }
    if (s.lockUntil && s.lockUntil > now) {
      return { type: 'min', until: s.lockUntil };
    }
    return null;
  }

  function needsGate() {
    return !isAuthed();
  }

  function fmtRemaining(ms) {
    if (ms <= 0) return '0:00';
    var sec = Math.ceil(ms / 1000);
    if (sec >= 86400) {
      var h = Math.floor(sec / 3600);
      var m = Math.floor((sec % 3600) / 60);
      return h + ' h ' + m + ' min';
    }
    var m = Math.floor(sec / 60);
    var s = sec % 60;
    return m + ':' + String(s).padStart(2, '0');
  }

  function registerFail() {
    var s = normalize(load());
    var block = getBlock();
    if (block) return s;

    s.attempts += 1;
    if (s.attempts >= MAX_ATT) {
      s.attempts = 0;
      s.lockouts += 1;
      if (s.lockouts >= MAX_LOCKOUTS) {
        s.dayUntil = Date.now() + DAY_MS;
        s.lockUntil = 0;
        s.lockouts = 0;
      } else {
        s.lockUntil = Date.now() + LOCK_MS;
      }
    }
    save(s);
    return s;
  }

  function registerSuccess() {
    var prev = normalize(load());
    save({
      ok: true,
      attempts: 0,
      lockouts: prev.lockouts || 0,
      lockUntil: 0,
      dayUntil: 0,
    });
  }

  var EYE_OPEN =
    '<svg class="ppl-gate-eye" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">' +
    '<path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/>' +
    '<circle cx="12" cy="12" r="3"/>' +
    '</svg>';
  var EYE_CLOSED =
    '<svg class="ppl-gate-eye" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">' +
    '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>' +
    '<path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>' +
    '<line x1="1" y1="1" x2="23" y2="23"/>' +
    '</svg>';

  function playSuccessAndEnter(gate) {
    registerSuccess();
    stopTick();

    gate.classList.add('ppl-gate-success');
    gate.innerHTML =
      '<div class="ppl-gate-card is-success">' +
      '<div class="ppl-gate-success-anim">' +
      '<div class="ppl-gate-check" aria-hidden="true">' +
      '<svg viewBox="0 0 52 52"><circle class="ppl-gate-check-circle" cx="26" cy="26" r="24"/>' +
      '<path class="ppl-gate-check-mark" d="M14 27l8 8 16-16"/></svg>' +
      '</div>' +
      '<p class="ppl-gate-success-title">Accès autorisé</p>' +
      '<p class="ppl-gate-success-sub">Bienvenue à bord ✈</p>' +
      '</div>' +
      '</div>';

    setTimeout(function () {
      gate.classList.add('is-leaving');
      document.documentElement.classList.remove('ppl-gated');
      setTimeout(function () {
        gate.innerHTML = '';
        gate.className = '';
      }, 650);
    }, 1500);
  }

  if (needsGate()) {
    document.documentElement.classList.add('ppl-gated');
  }

  var tickTimer = null;

  function renderGate() {
    var gate = document.getElementById('ppl-gate');
    if (!gate) return;

    var s = normalize(load());
    var block = getBlock();
    var remaining = MAX_ATT - s.attempts;
    var blocked = !!block;
    var isDay = block && block.type === 'day';

    var blockHtml = blocked
      ? '<div class="ppl-gate-block">' +
        (isDay
          ? 'Trop de tentatives.<br>Accès bloqué 24 h.'
          : 'Trop de tentatives incorrectes.<br>Réessayez dans') +
        '<strong id="ppl-gate-countdown">' +
        fmtRemaining(block.until - Date.now()) +
        '</strong></div>'
      : '';

    gate.innerHTML =
      '<div class="ppl-gate-card">' +
      '<div class="ppl-gate-icon"><img src="favicon.png" alt="" width="52" height="52"></div>' +
      '<h1>PPL Quiz</h1>' +
      '<p class="ppl-gate-sub">Entrez le code d\'accès pour utiliser l\'application.</p>' +
      blockHtml +
      (!blocked
        ? '<form id="ppl-gate-form" autocomplete="off">' +
          '<div class="ppl-gate-field">' +
          '<label for="ppl-gate-code">Code d\'accès</label>' +
          '<div class="ppl-gate-input-wrap">' +
          '<input id="ppl-gate-code" type="password" inputmode="text" autocapitalize="characters" autocomplete="off" placeholder="••••••••" maxlength="32">' +
          '<button type="button" class="ppl-gate-toggle" id="ppl-gate-toggle" aria-label="Afficher le code" aria-pressed="false" title="Afficher le code">' +
          EYE_OPEN +
          '</button>' +
          '</div>' +
          '</div>' +
          '<button type="submit" class="ppl-gate-btn">Accéder</button>' +
          '</form>' +
          '<p class="ppl-gate-attempts">' +
          remaining +
          ' essai' +
          (remaining > 1 ? 's' : '') +
          ' restant' +
          (remaining > 1 ? 's' : '') +
          '</p>'
        : '') +
      '<p class="ppl-gate-msg" id="ppl-gate-msg"></p>' +
      '</div>';

    if (!blocked) {
      var form = document.getElementById('ppl-gate-form');
      var input = document.getElementById('ppl-gate-code');
      var toggle = document.getElementById('ppl-gate-toggle');
      var msg = document.getElementById('ppl-gate-msg');

      if (toggle && input) {
        toggle.addEventListener('click', function () {
          var show = input.type === 'password';
          input.type = show ? 'text' : 'password';
          toggle.setAttribute('aria-pressed', show ? 'true' : 'false');
          toggle.setAttribute('aria-label', show ? 'Masquer le code' : 'Afficher le code');
          toggle.setAttribute('title', show ? 'Masquer le code' : 'Afficher le code');
          toggle.innerHTML = show ? EYE_CLOSED : EYE_OPEN;
          input.focus();
        });
      }

      form.addEventListener('submit', function (e) {
        e.preventDefault();
        if (getBlock()) {
          renderGate();
          startTick();
          return;
        }
        var val = (input.value || '').trim().toUpperCase();
        if (!val) {
          msg.className = 'ppl-gate-msg err';
          msg.textContent = 'Saisissez le code d\'accès.';
          return;
        }
        if (val === CODE.toUpperCase()) {
          playSuccessAndEnter(gate);
          return;
        }
        registerFail();
        msg.className = 'ppl-gate-msg err';
        var st = normalize(load());
        var bl = getBlock();
        if (bl) {
          msg.textContent = bl.type === 'day' ? 'Accès bloqué 24 h.' : 'Accès bloqué 1 minute.';
          renderGate();
          startTick();
        } else {
          var left = MAX_ATT - st.attempts;
          msg.textContent =
            left > 0
              ? 'Code incorrect. ' + left + ' essai' + (left > 1 ? 's' : '') + ' restant' + (left > 1 ? 's' : '') + '.'
              : 'Code incorrect.';
          renderGate();
        }
        if (input) input.focus();
      });

      setTimeout(function () {
        if (input) input.focus();
      }, 50);
    }

    startTick();
  }

  function startTick() {
    stopTick();
    tickTimer = setInterval(function () {
      if (!needsGate()) {
        stopTick();
        document.documentElement.classList.remove('ppl-gated');
        var gate = document.getElementById('ppl-gate');
        if (gate) gate.innerHTML = '';
        return;
      }
      var block = getBlock();
      var el = document.getElementById('ppl-gate-countdown');
      if (el && block) {
        var rem = block.until - Date.now();
        if (rem <= 0) {
          renderGate();
        } else {
          el.textContent = fmtRemaining(rem);
        }
      } else if (!block && document.getElementById('ppl-gate-form')) {
        stopTick();
      }
    }, 500);
  }

  function stopTick() {
    if (tickTimer) {
      clearInterval(tickTimer);
      tickTimer = null;
    }
  }

  function init() {
    if (!document.getElementById('ppl-gate')) {
      var gate = document.createElement('div');
      gate.id = 'ppl-gate';
      gate.setAttribute('role', 'dialog');
      gate.setAttribute('aria-modal', 'true');
      gate.setAttribute('aria-label', 'Code d\'accès PPL Quiz');
      document.body.insertBefore(gate, document.body.firstChild);
    }
    if (needsGate()) {
      renderGate();
    } else {
      document.documentElement.classList.remove('ppl-gated');
      stopTick();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
