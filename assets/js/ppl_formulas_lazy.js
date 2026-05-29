(function (global) {
  'use strict';

  function cacheVer() {
    const meta = document.querySelector('meta[name="ppl-cache-version"]');
    if (meta && meta.content) return meta.content;
    const probe = document.querySelector('script[src*="ppl_settings"],script[src*="ppl_formulas_lazy"]');
    const m = probe && probe.src && probe.src.match(/[?&]v=([^&]+)/);
    return (m && m[1]) || '20260530e';
  }

  let _loadPromise = null;

  function ensureFormulasEngine() {
    if (typeof getFormulasForQuestion === 'function') return Promise.resolve();
    if (_loadPromise) return _loadPromise;
    const ver = cacheVer();
    _loadPromise = new Promise((resolve, reject) => {
      const bank = document.createElement('script');
      bank.src = 'assets/js/formulas_bank.js?v=' + ver;
      bank.async = true;
      bank.onload = () => {
        const eng = document.createElement('script');
        eng.src = 'assets/js/formulas_engine.js?v=' + ver;
        eng.async = true;
        eng.onload = () => resolve();
        eng.onerror = reject;
        document.head.appendChild(eng);
      };
      bank.onerror = reject;
      document.head.appendChild(bank);
    });
    return _loadPromise;
  }

  function hydrateFicheFormulaSlots(root) {
    if (!root) return;
    root.querySelectorAll('[data-fiche-formulas-q]:not([data-fml-done])').forEach((block) => {
      const qIdx = parseInt(block.getAttribute('data-fiche-formulas-q'), 10);
      const q = typeof Q !== 'undefined' && Array.isArray(Q) ? Q[qIdx] : null;
      if (!q) return;
      block.dataset.fmlDone = '1';
      ensureFormulasEngine().then(() => {
        if (typeof getFormulasForQuestion !== 'function' || typeof renderFicheFormulasSection !== 'function') return;
        const fd = getFormulasForQuestion(q);
        const worked = typeof buildWorkedExample === 'function' ? buildWorkedExample(q) : null;
        const essentials = typeof getModuleEssentials === 'function' ? getModuleEssentials(q.m) : [];
        const html = renderFicheFormulasSection(fd, worked, essentials, block.getAttribute('data-fiche-mod') || q.m);
        const bd = block.querySelector('.fiche-formulas-slot') || block.querySelector('.fiche-block-bd');
        if (bd) {
          if (html) bd.innerHTML = html;
          else block.remove();
        }
      }).catch(() => {
        const bd = block.querySelector('.fiche-formulas-slot');
        if (bd) bd.innerHTML = '<p class="rev-empty">Formules indisponibles.</p>';
      });
    });
  }

  global.PPLFormulasLazy = { ensureFormulasEngine, hydrateFicheFormulaSlots, cacheVer };
})(typeof window !== 'undefined' ? window : this);

(function (global) {
  'use strict';
  let _enrichPromise = null;
  function ensureFicheEnrich() {
    if (typeof renderFicheReferenceHTML === 'function') return Promise.resolve();
    if (_enrichPromise) return _enrichPromise;
    const ver = global.PPLFormulasLazy && global.PPLFormulasLazy.cacheVer
      ? global.PPLFormulasLazy.cacheVer()
      : '20260530e';
    _enrichPromise = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'assets/js/fiche_enrich.js?v=' + ver;
      s.async = true;
      s.onload = () => resolve();
      s.onerror = reject;
      document.head.appendChild(s);
    });
    return _enrichPromise;
  }
  global.PPLFicheEnrichLazy = { ensureFicheEnrich };
})(typeof window !== 'undefined' ? window : this);

(function (global) {
  'use strict';

  const _loaded = {};
  const _pending = {};

  function cacheVer() {
    if (global.PPLFormulasLazy && global.PPLFormulasLazy.cacheVer) {
      return global.PPLFormulasLazy.cacheVer();
    }
    return '20260530e';
  }

  function isModLoaded(mod) {
    return !!_loaded[mod] || typeof global['Q_FICHES_' + mod] !== 'undefined';
  }

  function ensureBank(mod) {
    if (!mod || !/^[CAMR]$/.test(mod)) return Promise.resolve();
    if (isModLoaded(mod)) {
      _loaded[mod] = true;
      return Promise.resolve();
    }
    if (_pending[mod]) return _pending[mod];
    _pending[mod] = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'assets/js/question_fiches_' + mod + '.js?v=' + cacheVer();
      s.async = true;
      s.onload = () => {
        _loaded[mod] = true;
        resolve();
      };
      s.onerror = reject;
      document.head.appendChild(s);
    });
    return _pending[mod];
  }

  function ensureBankForQuestion(q, idx) {
    let mod = q && q.m;
    if (!mod && typeof Q !== 'undefined' && idx != null && idx >= 0 && Q[idx]) {
      mod = Q[idx].m;
    }
    return mod ? ensureBank(mod) : Promise.resolve();
  }

  global.PPLQuestionFicheLazy = { ensureBank, ensureBankForQuestion, isModLoaded, cacheVer };
})(typeof window !== 'undefined' ? window : this);
