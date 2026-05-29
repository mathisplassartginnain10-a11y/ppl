(function (global) {
  'use strict';

  let _loadPromise = null;

  function ensureFormulasEngine() {
    if (typeof getFormulasForQuestion === 'function') return Promise.resolve();
    if (_loadPromise) return _loadPromise;
    _loadPromise = new Promise((resolve, reject) => {
      const bank = document.createElement('script');
      bank.src = 'assets/js/formulas_bank.js?v=20260528d';
      bank.async = true;
      bank.onload = () => {
        const eng = document.createElement('script');
        eng.src = 'assets/js/formulas_engine.js?v=20260528e';
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

  global.PPLFormulasLazy = { ensureFormulasEngine, hydrateFicheFormulaSlots };
})(typeof window !== 'undefined' ? window : this);
