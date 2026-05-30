/**
 * Animations d'entrée — code d'accès & confidentialité (thème aviation PPL).
 */
(function (global) {
  'use strict';

  var PLANE_SVG =
    '<svg class="ppl-entry-plane-svg" viewBox="0 0 80 80" aria-hidden="true">' +
    '<defs><linearGradient id="pplEntryPlaneGrad" x1="0%" y1="0%" x2="100%" y2="100%">' +
    '<stop offset="0%" stop-color="#5b8af0"/><stop offset="100%" stop-color="#34d3a8"/>' +
    '</linearGradient></defs>' +
    '<path fill="url(#pplEntryPlaneGrad)" d="M40 8 L48 34 L72 38 L48 42 L52 68 L40 58 L28 68 L32 42 L8 38 L32 34 Z" opacity="0.95"/>' +
    '<path fill="rgba(52,211,168,0.35)" d="M36 38 L40 48 L44 38 Z"/>' +
    '</svg>';

  var CHECK_SVG =
    '<svg viewBox="0 0 52 52" aria-hidden="true">' +
    '<circle class="ppl-entry-check-circle" cx="26" cy="26" r="24"/>' +
    '<path class="ppl-entry-check-mark" d="M14 27l8 8 16-16"/>' +
    '</svg>';

  var PRESETS = {
    auth: {
      kicker: 'Clearance validée',
      title: 'Accès autorisé',
      sub: 'Authentification réussie — configuration des données',
    },
    consent: {
      kicker: 'Données configurées',
      title: 'Prêt pour le décollage',
      sub: 'Bienvenue à bord — bon vol d\'étude ✈',
    },
  };

  function prefersReduced() {
    try {
      if (global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches) return true;
      if (global.PPLSettings && global.PPLSettings.get && global.PPLSettings.get().reduceMotion) return true;
    } catch (e) { /* ignore */ }
    return false;
  }

  function consentSubText(detail) {
    if (!detail) return PRESETS.consent.sub;
    if (detail.privateSession) return 'Mode privé — aucune donnée enregistrée sur cet appareil';
    var keys = ['saveProgress', 'saveReaction', 'saveBehavior', 'saveDetailedLog'];
    var on = 0;
    keys.forEach(function (k) { if (detail[k]) on += 1; });
    if (on === 4) return 'Enregistrement complet activé — 100 % local';
    if (on === 0) return 'Navigation sans trace — session éphémère';
    return on + ' / 4 catégories de données activées localement';
  }

  function buildRunwayLights() {
    var html = '';
    for (var i = 0; i < 14; i += 1) {
      html += '<span class="ppl-entry-runway-lite" style="--i:' + i + '"></span>';
    }
    return html;
  }

  function buildHTML(type, detail) {
    var preset = PRESETS[type] || PRESETS.auth;
    var sub = type === 'consent' ? consentSubText(detail) : preset.sub;
    return (
      '<div class="ppl-entry-bg">' +
      '<div class="ppl-entry-aurora"></div>' +
      '<div class="ppl-entry-scanlines"></div>' +
      '<div class="ppl-entry-radar">' +
      '<span class="ppl-entry-radar-sweep"></span>' +
      '<span class="ppl-entry-radar-ring ppl-entry-radar-ring--1"></span>' +
      '<span class="ppl-entry-radar-ring ppl-entry-radar-ring--2"></span>' +
      '<span class="ppl-entry-radar-ring ppl-entry-radar-ring--3"></span>' +
      '<span class="ppl-entry-radar-blip"></span>' +
      '</div>' +
      '<div class="ppl-entry-grid"></div>' +
      '</div>' +
      '<div class="ppl-entry-core">' +
      '<div class="ppl-entry-hud">' +
      '<svg class="ppl-entry-hud-ring" viewBox="0 0 140 140" aria-hidden="true">' +
      '<circle cx="70" cy="70" r="62" class="ppl-entry-hud-orbit"/>' +
      '<circle cx="70" cy="70" r="48" class="ppl-entry-hud-orbit ppl-entry-hud-orbit--inner"/>' +
      '<path d="M70 18v16M70 106v16M18 70h16M106 70h16" class="ppl-entry-hud-cross"/>' +
      '</svg>' +
      '<div class="ppl-entry-plane-wrap">' + PLANE_SVG + '</div>' +
      '<div class="ppl-entry-check">' + CHECK_SVG + '</div>' +
      '</div>' +
      '<p class="ppl-entry-kicker">' + preset.kicker + '</p>' +
      '<h2 class="ppl-entry-title">' + preset.title + '</h2>' +
      '<p class="ppl-entry-sub">' + sub + '</p>' +
      '<div class="ppl-entry-runway">' + buildRunwayLights() + '</div>' +
      '<div class="ppl-entry-progress" aria-hidden="true"><span></span></div>' +
      '</div>'
    );
  }

  function play(opts) {
    opts = opts || {};
    var type = opts.type === 'consent' ? 'consent' : 'auth';
    var reduced = prefersReduced();
    var hold = reduced ? 420 : (type === 'consent' ? 2700 : 2300);
    var fade = reduced ? 180 : 700;

    return new Promise(function (resolve) {
      var existing = document.getElementById('ppl-entry-splash');
      if (existing && existing.parentNode) existing.parentNode.removeChild(existing);

      var el = document.createElement('div');
      el.id = 'ppl-entry-splash';
      el.className = 'ppl-entry-splash ppl-entry-splash--' + type + (reduced ? ' ppl-entry-splash--reduced' : '');
      el.setAttribute('role', 'status');
      el.setAttribute('aria-live', 'polite');
      el.setAttribute('aria-label', PRESETS[type].title);
      el.innerHTML = buildHTML(type, opts.detail);
      document.body.appendChild(el);

      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          el.classList.add('is-active');
        });
      });

      global.setTimeout(function () {
        el.classList.add('is-leaving');
        global.setTimeout(function () {
          if (el.parentNode) el.parentNode.removeChild(el);
          resolve();
        }, fade);
      }, hold);
    });
  }

  global.PPLEntrySplash = { play: play };
})(typeof window !== 'undefined' ? window : this);
