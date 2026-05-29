/**
 * Point d’extension pour futurs modules PPL (plugins, banques, UI).
 * Les modules s’enregistrent via PPLModuleHost.register({ id, init, onSettings, onConsent, ... }).
 */
(function (global) {
  'use strict';

  const modules = new Map();
  const lazyLoads = new Map();

  function register(spec) {
    if (!spec || !spec.id) return;
    modules.set(spec.id, spec);
    if (typeof spec.init === 'function') {
      try { spec.init(); } catch (e) { console.warn('[PPLModule]', spec.id, e); }
    }
  }

  function emit(event, detail) {
    modules.forEach((spec) => {
      const fn = spec[event];
      if (typeof fn === 'function') {
        try { fn(detail || {}); } catch (e) { console.warn('[PPLModule]', spec.id, event, e); }
      }
    });
  }

  /** Charge un script lazy (ex. fichier dans assets/js/incoming/). */
  function loadScript(url) {
    if (lazyLoads.has(url)) return lazyLoads.get(url);
    const p = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = url;
      s.async = true;
      s.onload = () => resolve();
      s.onerror = reject;
      document.head.appendChild(s);
    });
    lazyLoads.set(url, p);
    return p;
  }

  function registerLazy(id, url, autoInit) {
    register({
      id,
      load: () => loadScript(url).then(() => { if (autoInit) emit('onLoad', { id }); }),
    });
  }

  global.PPLModuleHost = { register, emit, loadScript, registerLazy, list: () => [...modules.keys()] };

  window.addEventListener('ppl-settings-changed', (e) => emit('onSettings', e.detail));
  window.addEventListener('ppl-privacy-consent', (e) => emit('onConsent', e.detail));
  window.addEventListener('ppl-data-erased', () => emit('onDataErased', {}));
})(typeof window !== 'undefined' ? window : this);
