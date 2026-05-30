/**
 * Registre central des assets PPL Quiz.
 * — Ajouter ici tout nouveau fichier CSS/JS avant de l’inclure dans les pages HTML.
 * — Lancer : node scripts/check/verify_assets.js
 * — Harmoniser les ?v= : node scripts/build/sync_cache_versions.js
 */
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

/** Version cache-bust globale (YYYYMMDD + lettre). */
const CACHE_VERSION = '20260530o';

/** Fichiers générés par scripts/build — ne pas éditer à la main. */
const GENERATED = [
  'assets/js/questions_bank.js',
  'assets/js/formulas_bank.js',
  'assets/js/formulas_meta.js',
  'assets/js/question_fiches_meta.js',
  'assets/js/question_fiches_C.js',
  'assets/js/question_fiches_A.js',
  'assets/js/question_fiches_M.js',
  'assets/js/question_fiches_R.js',
  'data/questions_meta.json',
];

/** CSS connus (clé → chemin relatif racine). */
const CSS = {
  ppl_theme: 'assets/css/ppl_theme.css',
  ppl_theme_enhance: 'assets/css/ppl_theme_enhance.css',
  ppl_mobile: 'assets/css/ppl_mobile.css',
  ppl_auth: 'assets/css/ppl_auth.css',
  ppl_entry_splash: 'assets/css/ppl_entry_splash.css',
  ppl_perf: 'assets/css/ppl_perf.css',
  ppl_settings: 'assets/css/ppl_settings.css',
  ppl_pro: 'assets/css/ppl_pro.css',
  ppl_fiches_pro: 'assets/css/ppl_fiches_pro.css',
  ppl_resources: 'assets/css/ppl_resources.css',
  ppl_stats: 'assets/css/ppl_stats.css',
  ppl_plane_bg: 'assets/css/ppl_plane_bg.css',
};

/** JS connus (clé → chemin relatif racine). */
const JS = {
  ppl_settings: 'assets/js/ppl_settings.js',
  ppl_entry_splash: 'assets/js/ppl_entry_splash.js',
  ppl_storage: 'assets/js/ppl_storage.js',
  ppl_auth: 'assets/js/ppl_auth.js',
  ppl_session_fiches: 'assets/js/ppl_session_fiches.js',
  ppl_module_host: 'assets/js/ppl_module_host.js',
  ppl_quiz_engine: 'assets/js/ppl_quiz_engine.js',
  ppl_formulas_lazy: 'assets/js/ppl_formulas_lazy.js',
  ppl_fiches_page: 'assets/js/ppl_fiches_page.js',
  ppl_formulas_page: 'assets/js/ppl_formulas_page.js',
  ppl_stats_page: 'assets/js/ppl_stats_page.js',
  ppl_plane_bg: 'assets/js/ppl_plane_bg.js',
  questions_bank: 'assets/js/questions_bank.js',
  formulas_meta: 'assets/js/formulas_meta.js',
  formulas_bank: 'assets/js/formulas_bank.js',
  formulas_engine: 'assets/js/formulas_engine.js',
  topics_utils: 'assets/js/topics_utils.js',
  fiche_enrich: 'assets/js/fiche_enrich.js',
  question_fiche_core: 'assets/js/question_fiche_core.js',
  question_fiche_engine: 'assets/js/question_fiche_engine.js',
  question_fiches_meta: 'assets/js/question_fiches_meta.js',
  question_fiches_C: 'assets/js/question_fiches_C.js',
  question_fiches_A: 'assets/js/question_fiches_A.js',
  question_fiches_M: 'assets/js/question_fiches_M.js',
  question_fiches_R: 'assets/js/question_fiches_R.js',
};

/** Pages HTML du site. */
const PAGES = ['index.html', 'fiches.html', 'formules.html', 'stats.html'];

/**
 * Bundles par page — ordre de chargement.
 * headBlocking : dans <head>, sans defer
 * bodyDefer    : avant </body>, defer recommandé
 */
const PAGE_BUNDLES = {
  'index.html': {
    css: ['ppl_theme', 'ppl_theme_enhance', 'ppl_mobile', 'ppl_auth', 'ppl_entry_splash', 'ppl_perf', 'ppl_settings', 'ppl_pro', 'ppl_fiches_pro'],
    headBlocking: ['ppl_entry_splash', 'ppl_settings', 'ppl_storage', 'ppl_auth', 'ppl_module_host'],
    bodyDefer: ['questions_bank', 'formulas_meta', 'topics_utils', 'ppl_formulas_lazy', 'question_fiche_core', 'question_fiche_engine', 'ppl_session_fiches', 'ppl_quiz_engine'],
  },
  'fiches.html': {
    css: ['ppl_theme', 'ppl_theme_enhance', 'ppl_resources', 'ppl_mobile', 'ppl_auth', 'ppl_entry_splash', 'ppl_perf', 'ppl_settings', 'ppl_pro', 'ppl_fiches_pro'],
    headBlocking: ['ppl_entry_splash', 'ppl_settings', 'ppl_storage', 'ppl_auth', 'ppl_module_host'],
    bodyDefer: ['questions_bank', 'topics_utils', 'ppl_formulas_lazy', 'question_fiche_core', 'question_fiche_engine', 'ppl_session_fiches', 'ppl_fiches_page'],
  },
  'formules.html': {
    css: ['ppl_theme', 'ppl_theme_enhance', 'ppl_resources', 'ppl_mobile', 'ppl_auth', 'ppl_entry_splash', 'ppl_perf', 'ppl_settings', 'ppl_pro', 'ppl_fiches_pro'],
    headBlocking: ['ppl_entry_splash', 'ppl_settings', 'ppl_auth', 'ppl_module_host'],
    bodyDefer: ['formulas_bank', 'formulas_engine', 'ppl_formulas_page'],
  },
  'stats.html': {
    css: ['ppl_theme', 'ppl_theme_enhance', 'ppl_stats', 'ppl_mobile', 'ppl_auth', 'ppl_entry_splash', 'ppl_perf', 'ppl_settings', 'ppl_pro', 'ppl_fiches_pro'],
    headBlocking: ['ppl_entry_splash', 'ppl_settings', 'ppl_auth', 'ppl_module_host'],
    bodyDefer: ['ppl_stats_page'],
  },
};

function assetUrl(key, kind) {
  const map = kind === 'css' ? CSS : JS;
  const rel = map[key];
  if (!rel) throw new Error(`Asset inconnu: ${kind}:${key}`);
  return `${rel}?v=${CACHE_VERSION}`;
}

function allAssetPaths() {
  return [...Object.values(CSS), ...Object.values(JS)];
}

module.exports = {
  ROOT,
  CACHE_VERSION,
  GENERATED,
  CSS,
  JS,
  PAGES,
  PAGE_BUNDLES,
  assetUrl,
  allAssetPaths,
};
