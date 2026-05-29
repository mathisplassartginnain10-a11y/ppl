#!/usr/bin/env node
/**
 * Vérifie que tous les assets du manifeste existent et que les pages HTML les référencent.
 * Usage: node scripts/check/verify_assets.js
 */
const fs = require('fs');
const path = require('path');
const {
  ROOT, CACHE_VERSION, GENERATED, CSS, JS, PAGES, PAGE_BUNDLES, allAssetPaths,
} = require('../build/asset_manifest');

const incomingPath = path.join(ROOT, 'data', 'incoming_files.json');
let errors = 0;
let warnings = 0;

function err(msg) { console.error('✗', msg); errors += 1; }
function warn(msg) { console.warn('⚠', msg); warnings += 1; }
function ok(msg) { console.log('✓', msg); }

// 1. Fichiers du manifeste sur disque
allAssetPaths().forEach((rel) => {
  const abs = path.join(ROOT, rel);
  if (!fs.existsSync(abs)) err(`Fichier manquant: ${rel}`);
});

// 2. Doublons / orphelins dans assets/js et assets/css (hors incoming, vendor)
function scanDir(sub, ext) {
  const dir = path.join(ROOT, 'assets', sub);
  if (!fs.existsSync(dir)) return;
  const known = new Set(allAssetPaths().filter((p) => p.startsWith(`assets/${sub}/`)).map((p) => path.basename(p)));
  fs.readdirSync(dir).forEach((name) => {
    if (!name.endsWith(ext)) return;
    if (name === '.gitkeep') return;
    if (sub === 'js' && name.startsWith('incoming')) return;
    if (!known.has(name)) {
      if (name.includes('incoming') || sub === 'css' && name.startsWith('ppl_example')) {
        warn(`Fichier incoming non encore enregistré dans asset_manifest.js: assets/${sub}/${name}`);
      } else {
        warn(`Fichier non référencé dans asset_manifest.js: assets/${sub}/${name}`);
      }
    }
  });
}
scanDir('js', '.js');
scanDir('css', '.css');

// 3. Bundles → présence dans HTML
PAGES.forEach((pageName) => {
  const htmlPath = path.join(ROOT, pageName);
  if (!fs.existsSync(htmlPath)) {
    err(`Page manquante: ${pageName}`);
    return;
  }
  const html = fs.readFileSync(htmlPath, 'utf8');
  const bundle = PAGE_BUNDLES[pageName];
  if (!bundle) {
    warn(`Pas de bundle défini pour ${pageName}`);
    return;
  }
  [...(bundle.css || []), ...(bundle.headBlocking || []), ...(bundle.bodyDefer || [])].forEach((key) => {
    const isCss = bundle.css && bundle.css.includes(key);
    const rel = isCss ? CSS[key] : JS[key];
    if (!rel) {
      err(`${pageName}: clé bundle inconnue "${key}"`);
      return;
    }
    if (!html.includes(rel)) {
      err(`${pageName}: asset absent du HTML — ${rel}`);
    }
  });
});

// 4. Versions cache divergentes
const versionRe = /\?v=(\d{8}[a-z]?)/g;
PAGES.forEach((pageName) => {
  const html = fs.readFileSync(path.join(ROOT, pageName), 'utf8');
  const versions = new Set();
  let m;
  while ((m = versionRe.exec(html)) !== null) versions.add(m[1]);
  if (versions.size > 1) {
    warn(`${pageName}: versions cache multiples — ${[...versions].join(', ')} (attendu: ${CACHE_VERSION})`);
  } else if (versions.size === 1) {
    const v = [...versions][0];
    if (v !== CACHE_VERSION) warn(`${pageName}: version ${v} ≠ manifeste ${CACHE_VERSION}`);
  }
});

// 5. Fichiers incoming
if (fs.existsSync(incomingPath)) {
  const incoming = JSON.parse(fs.readFileSync(incomingPath, 'utf8'));
  (incoming.items || []).forEach((item) => {
    const abs = path.join(ROOT, item.path.replace(/\//g, path.sep));
    if (item.status === 'ready') {
      if (!fs.existsSync(abs)) err(`Incoming ready mais absent: ${item.path}`);
      else ok(`Incoming prêt: ${item.id} → ${item.path}`);
    } else if (item.status === 'planned') {
      if (fs.existsSync(abs) && !GENERATED.includes(item.path.replace(/\\/g, '/'))) {
        warn(`Incoming planned mais fichier déjà présent: ${item.path} — passer status à ready?`);
      }
    }
  });
}

// 6. Générés
GENERATED.forEach((rel) => {
  if (!fs.existsSync(path.join(ROOT, rel))) warn(`Fichier généré absent (lancer le build): ${rel}`);
});

console.log('');
console.log(`Cache manifeste: ${CACHE_VERSION}`);
if (errors) {
  console.error(`\n${errors} erreur(s), ${warnings} avertissement(s).`);
  process.exit(1);
}
console.log(`\nOK — ${warnings} avertissement(s).`);
process.exit(0);
