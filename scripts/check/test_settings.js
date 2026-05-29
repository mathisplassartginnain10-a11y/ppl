/**
 * Tests logique paramètres — node scripts/check/test_settings.js
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..', '..');
const SETTINGS_PATH = path.join(ROOT, 'assets', 'js', 'ppl_settings.js');

const storage = new Map();
const docEl = {
  style: { setProperty() {}, removeProperty() {}, fontSize: '' },
  dataset: {},
};
const body = { classList: { add() {}, remove() {} }, insertAdjacentHTML() {} };

const sandbox = {
  window: {},
  document: {
    documentElement: docEl,
    body,
    querySelector: () => null,
    querySelectorAll: () => [],
    getElementById: () => null,
    readyState: 'complete',
    addEventListener() {},
  },
  localStorage: {
    getItem: (k) => storage.get(k) ?? null,
    setItem: (k, v) => storage.set(k, String(v)),
    removeItem: (k) => storage.delete(k),
  },
  CustomEvent: function CustomEvent(type, opts) {
    this.type = type;
    this.detail = opts?.detail;
  },
  __PPL_SETTINGS_TEST__: {},
};

sandbox.window = sandbox;
const code = fs.readFileSync(SETTINGS_PATH, 'utf8');
vm.runInNewContext(code, sandbox, { filename: 'ppl_settings.js' });

const api = sandbox.__PPL_SETTINGS_TEST__.api;
if (!api) {
  console.error('Échec : API de test introuvable');
  process.exit(1);
}

let passed = 0;
let failed = 0;

function assert(cond, msg) {
  if (cond) { passed++; return; }
  failed++;
  console.error('✗', msg);
}

function reset() {
  storage.clear();
  api.setCurrent({ ...api.DEFAULTS });
}

console.log('Tests paramètres PPL…\n');

reset();
assert(api.sanitize({ theme: 'invalid' }).theme === 'midnight', 'thème invalide → midnight');
assert(api.sanitize({ accent: 'nope' }).accent === 'blue', 'accent invalide → blue');
assert(api.sanitize({ fontSize: 'huge' }).fontSize === 'normal', 'fontSize invalide → normal');
assert(api.sanitize({ autoAdvance: '99' }).autoAdvance === 'off', 'autoAdvance invalide → off');
assert(api.sanitize({ retention: 'bad' }).retention === 'session', 'retention invalide → session');

reset();
api.setCurrent(api.sanitize({ privateSession: true, saveProgress: true }));
assert(api.getCurrent().saveProgress === false, 'mode privé force saveProgress à false');
assert(api.getCurrent().clearOnExit === true, 'mode privé force clearOnExit');

reset();
api.setCurrent(api.sanitize(api.PRIVACY_PRESETS.full.patch));
api.save({ privateSession: false });
const after = api.getCurrent();
assert(after.privateSession === false, 'désactivation mode privé');
assert(after.clearOnExit === false, 'clearOnExit réinitialisé hors mode privé');
assert(after.saveProgress === true, 'progression conservée après profil complet');

reset();
api.setCurrent(api.sanitize(api.PRIVACY_PRESETS.private.patch));
api.save({ privateSession: false });
assert(api.getCurrent().retention === 'forever', 'retention session → forever en quittant privé');

reset();
api.setCurrent(api.sanitize({ ...api.PRIVACY_PRESETS.full.patch, privacyConsentAt: Date.now() }));
assert(api.canPersist('progress') === true, 'canPersist progress avec consent');
assert(api.canPersist('behavior') === true, 'canPersist behavior avec profil complet');
api.save({ privateSession: true });
assert(api.canPersist('progress') === false, 'canPersist false en mode privé');

reset();
const balanced = api.applyPrivacyPatch(api.PRIVACY_PRESETS.balanced.patch);
assert(balanced.saveBehavior === false && balanced.saveProgress === true, 'profil équilibré');

reset();
api.setCurrent(api.sanitize({ theme: 'paper', accent: 'teal', privacyConsentAt: 1 }));
api.save({ theme: 'cockpit', accent: 'rose', showTimer: false, shuffleOptions: true, autoAdvance: '2' });
const saved = JSON.parse(storage.get('ppl4settings'));
assert(saved.theme === 'cockpit', 'save thème');
assert(saved.showTimer === false, 'save showTimer');
assert(saved.shuffleOptions === true, 'save shuffleOptions');
assert(saved.autoAdvance === '2', 'save autoAdvance');

console.log('\n' + passed + ' OK · ' + failed + ' échec(s)');
process.exit(failed > 0 ? 1 : 0);
