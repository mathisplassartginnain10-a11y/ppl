#!/usr/bin/env node
/**
 * Harmonise les paramètres ?v= dans les pages HTML selon asset_manifest.js
 * Usage: node scripts/build/sync_cache_versions.js
 */
const fs = require('fs');
const path = require('path');
const { ROOT, CACHE_VERSION, PAGES } = require('./asset_manifest');

let total = 0;

PAGES.forEach((name) => {
  const file = path.join(ROOT, name);
  if (!fs.existsSync(file)) return;
  const before = fs.readFileSync(file, 'utf8');
  const after = before.replace(/\?v=\d{8}[a-z]?/g, `?v=${CACHE_VERSION}`);
  if (after !== before) {
    fs.writeFileSync(file, after);
    console.log('Mis à jour:', name);
    total += 1;
  }
});

// Mettre à jour la version dans le manifeste si passée en argument
const bump = process.argv[2];
if (bump && /^\d{8}[a-z]?$/.test(bump)) {
  const manifestPath = path.join(__dirname, 'asset_manifest.js');
  let src = fs.readFileSync(manifestPath, 'utf8');
  src = src.replace(/const CACHE_VERSION = '[^']+'/, `const CACHE_VERSION = '${bump}'`);
  fs.writeFileSync(manifestPath, src);
  console.log('Manifeste →', bump);
}

console.log(total ? `Terminé (${total} page(s)).` : `Déjà à jour (${CACHE_VERSION}).`);
