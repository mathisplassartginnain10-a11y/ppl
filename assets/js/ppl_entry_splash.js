/**
 * Animations d'entrée — code d'accès & confidentialité (thème aviation PPL).
 * + Session onglet (navigation interne sans re-demander code / confidentialité).
 */
(function (global) {
  'use strict';

  var SESSION_AUTH = 'ppl_session_auth';
  var SESSION_CONSENT = 'ppl_session_consent';
  var SESSION_NAV = 'ppl_internal_nav';
  var APP_PAGES = /^(index\.html|fiches\.html|formules\.html|stats\.html)$/;
  var loadWasInternalNav = false;

  function isAppPagePath(pathname) {
    try {
      var p = pathname || '';
      if (!p || p === '/') return true;
      if (p.endsWith('/')) return true;
      var leaf = p.split('/').pop() || '';
      if (!leaf) return true;
      if (APP_PAGES.test(leaf)) return true;
      if (!/\.\w+$/.test(leaf)) return true;
      return false;
    } catch (e) { /* ignore */ }
    return false;
  }

  function isPageReload() {
    try {
      var nav = performance.getEntriesByType('navigation')[0];
      return nav && nav.type === 'reload';
    } catch (e) { /* ignore */ }
    return false;
  }

  function isInternalAppNavigation() {
    var ref = document.referrer;
    if (!ref) return false;
    try {
      var refUrl = new URL(ref);
      if (refUrl.origin !== location.origin) return false;
      return isAppPagePath(refUrl.pathname);
    } catch (e) { /* ignore */ }
    return false;
  }

  function clearSession() {
    try {
      sessionStorage.removeItem(SESSION_AUTH);
      sessionStorage.removeItem(SESSION_CONSENT);
    } catch (e) { /* ignore */ }
  }

  function bootstrapSession() {
    loadWasInternalNav = false;
    try {
      loadWasInternalNav = sessionStorage.getItem(SESSION_NAV) === '1';
      if (loadWasInternalNav) sessionStorage.removeItem(SESSION_NAV);
    } catch (e) { /* ignore */ }
    if (!loadWasInternalNav && isPageReload()) clearSession();
  }

  function stampInternalNav() {
    try { sessionStorage.setItem(SESSION_NAV, '1'); } catch (e) { /* ignore */ }
    preserveSessionForNav();
  }

  function markAuth() {
    try { sessionStorage.setItem(SESSION_AUTH, '1'); } catch (e) { /* ignore */ }
  }

  function markConsent() {
    try { sessionStorage.setItem(SESSION_CONSENT, '1'); } catch (e) { /* ignore */ }
  }

  function hasAuth() {
    try { return sessionStorage.getItem(SESSION_AUTH) === '1'; } catch (e) { return false; }
  }

  function hasConsent() {
    try { return sessionStorage.getItem(SESSION_CONSENT) === '1'; } catch (e) { return false; }
  }

  /** Session valide dans l'onglet (navigation interne ou rechargement partiel). */
  function shouldSkipAuthGate() {
    if (!hasAuth()) return false;
    if (loadWasInternalNav) return true;
    return !isPageReload();
  }

  function shouldSkipLaunchConsent() {
    if (!hasAuth() || !hasConsent()) return false;
    if (loadWasInternalNav) return true;
    return !isPageReload();
  }

  function preserveSessionForNav() {
    if (hasAuth()) markAuth();
    if (hasConsent()) markConsent();
  }

  function bindInternalNavPersistence() {
    document.addEventListener('click', function (e) {
      var link = e.target && e.target.closest
        ? e.target.closest('a.app-nav-link, a.app-brand')
        : null;
      if (!link || !link.href) return;
      try {
        var url = new URL(link.href, location.href);
        if (url.origin !== location.origin) return;
        if (!isAppPagePath(url.pathname)) return;
        if (global.PPLAuth && global.PPLAuth.isAuthed && global.PPLAuth.isAuthed()) {
          markAuth();
        } else if (hasAuth()) {
          markAuth();
        }
        if (global.PPLSettings && global.PPLSettings.hasPrivacyConsent
          && global.PPLSettings.hasPrivacyConsent()) {
          markConsent();
        } else if (hasConsent()) {
          markConsent();
        }
        stampInternalNav();
      } catch (err) { /* ignore */ }
    }, true);
  }

  bootstrapSession();

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindInternalNavPersistence);
  } else {
    bindInternalNavPersistence();
  }

  global.PPLSessionGate = {
    isPageReload: isPageReload,
    isInternalAppNavigation: isInternalAppNavigation,
    clearSession: clearSession,
    markAuth: markAuth,
    markConsent: markConsent,
    hasAuth: hasAuth,
    hasConsent: hasConsent,
    shouldSkipAuthGate: shouldSkipAuthGate,
    shouldSkipLaunchConsent: shouldSkipLaunchConsent,
    preserveSessionForNav: preserveSessionForNav,
    stampInternalNav: stampInternalNav,
    wasInternalNav: function () { return loadWasInternalNav; },
  };

  function planeSVG(gradId) {
    return (
      '<svg class="ppl-entry-plane-svg" viewBox="0 0 80 80" aria-hidden="true">' +
      '<defs><linearGradient id="' + gradId + '" x1="0%" y1="0%" x2="100%" y2="100%">' +
      '<stop offset="0%" stop-color="#5b8af0"/><stop offset="100%" stop-color="#34d3a8"/>' +
      '</linearGradient></defs>' +
      '<path fill="url(#' + gradId + ')" d="M40 8 L48 34 L72 38 L48 42 L52 68 L40 58 L28 68 L32 42 L8 38 L32 34 Z" opacity="0.95"/>' +
      '<path fill="rgba(52,211,168,0.35)" d="M36 38 L40 48 L44 38 Z"/>' +
      '</svg>'
    );
  }

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

  var splashSeq = 0;

  function prefersReduced() {
    try {
      if (global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches) return true;
      if (global.document && global.document.documentElement.dataset.anim === 'off') return true;
      if (global.PPLSettings && global.PPLSettings.get && global.PPLSettings.get().reduceMotion) return true;
    } catch (e) { /* ignore */ }
    return false;
  }

  function splashHoldMs(type, reduced) {
    if (reduced) return 420;
    /* Aligné sur la barre de progression (delay 0,35 s + fill 2,1 / 2,4 s) + marge */
    return type === 'consent' ? 3100 : 2800;
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

  function buildHTML(type, detail, gradId) {
    var preset = PRESETS[type] || PRESETS.auth;
    var sub = type === 'consent' ? consentSubText(detail) : preset.sub;
    gradId = gradId || 'pplEntryPlaneGrad';
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
      '<div class="ppl-entry-stack">' +
      '<div class="ppl-entry-hud">' +
      '<svg class="ppl-entry-hud-ring" viewBox="0 0 140 140" aria-hidden="true">' +
      '<circle cx="70" cy="70" r="62" class="ppl-entry-hud-orbit"/>' +
      '<circle cx="70" cy="70" r="48" class="ppl-entry-hud-orbit ppl-entry-hud-orbit--inner"/>' +
      '<path d="M70 18v16M70 106v16M18 70h16M106 70h16" class="ppl-entry-hud-cross"/>' +
      '</svg>' +
      '<div class="ppl-entry-plane-wrap">' + planeSVG(gradId) + '</div>' +
      '<div class="ppl-entry-check">' + CHECK_SVG + '</div>' +
      '</div>' +
      '<p class="ppl-entry-kicker">' + preset.kicker + '</p>' +
      '<h2 class="ppl-entry-title">' + preset.title + '</h2>' +
      '<p class="ppl-entry-sub">' + sub + '</p>' +
      '<div class="ppl-entry-runway">' + buildRunwayLights() + '</div>' +
      '<div class="ppl-entry-progress" aria-hidden="true"><span></span></div>' +
      '</div>' +
      '</div>'
    );
  }

  function play(opts) {
    opts = opts || {};
    var type = opts.type === 'consent' ? 'consent' : 'auth';
    var reduced = prefersReduced();
    var hold = splashHoldMs(type, reduced);
    var fade = reduced ? 180 : 700;
    splashSeq += 1;
    var gradId = 'pplEntryPlaneGrad' + splashSeq;

    return new Promise(function (resolve) {
      var existing = document.getElementById('ppl-entry-splash');
      if (existing && existing.parentNode) existing.parentNode.removeChild(existing);

      var el = document.createElement('div');
      el.id = 'ppl-entry-splash';
      el.className = 'ppl-entry-splash ppl-entry-splash--' + type + (reduced ? ' ppl-entry-splash--reduced' : '');
      el.setAttribute('role', 'status');
      el.setAttribute('aria-live', 'polite');
      el.setAttribute('aria-label', PRESETS[type].title);
      el.innerHTML = buildHTML(type, opts.detail, gradId);
      document.body.appendChild(el);

      if (reduced) {
        el.classList.add('is-active');
      } else {
        requestAnimationFrame(function () {
          requestAnimationFrame(function () {
            el.classList.add('is-active');
          });
        });
      }

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
