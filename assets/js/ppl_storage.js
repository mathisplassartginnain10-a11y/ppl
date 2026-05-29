(function (global) {
  'use strict';

  const DELAY = 420;
  const pending = {};
  let timer = null;

  function queue(key, value) {
    if (!key) return;
    if (window.PPLSettings && typeof PPLSettings.hasPrivacyConsent === 'function' && !PPLSettings.hasPrivacyConsent()) return;
    pending[key] = typeof value === 'string' ? value : JSON.stringify(value);
    if (timer) return;
    timer = setTimeout(flush, DELAY);
  }

  function flush() {
    timer = null;
    const keys = Object.keys(pending);
    keys.forEach((k) => {
      try {
        localStorage.setItem(k, pending[k]);
      } catch (e) { /* quota / private mode */ }
      delete pending[k];
    });
  }

  function flushNow() {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
    flush();
  }

  function remove(key) {
    delete pending[key];
    try { localStorage.removeItem(key); } catch (e) { /* ignore */ }
  }

  window.addEventListener('pagehide', flushNow);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flushNow();
  });

  global.PPLStorage = { queue, flush, flushNow, remove };
})(typeof window !== 'undefined' ? window : this);
