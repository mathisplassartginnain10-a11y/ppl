/**
 * Génère les fiches erreur par module (C/A/M/R) — format compact v2.
 * Usage : node scripts/build/build_question_fiches.js
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { buildQuestionErrorFiche, compactFiche } = require('./question_fiche_lib');

const ROOT = path.join(__dirname, '..', '..');
const BANK_IN = path.join(ROOT, 'assets', 'js', 'questions_bank.js');
const OUT_DIR = path.join(ROOT, 'assets', 'js');
const MODS = ['C', 'A', 'M', 'R'];

const code = fs.readFileSync(BANK_IN, 'utf8');
const ctx = { console };
vm.runInNewContext(code + '\n;if(typeof Q!=="undefined"){this.Q=Q;this.Q_BANK_META=typeof Q_BANK_META!=="undefined"?Q_BANK_META:null;}', ctx);
const Q = ctx.Q;

if (!Array.isArray(Q) || !Q.length) {
  console.error('questions_bank.js : Q introuvable ou vide');
  process.exit(1);
}

const byMod = { C: {}, A: {}, M: {}, R: {} };
const counts = { C: 0, A: 0, M: 0, R: 0 };

Q.forEach((q, idx) => {
  const mod = q.m;
  if (!byMod[mod]) return;
  byMod[mod][idx] = compactFiche(buildQuestionErrorFiche(q, -1));
  counts[mod] += 1;
});

const metaOut = path.join(OUT_DIR, 'question_fiches_meta.js');
const metaJs = [
  '// Métadonnées banque fiches — généré par scripts/build/build_question_fiches.js',
  'const Q_FICHE_BANK_META=' + JSON.stringify({ version: 2, total: Q.length, mods: counts }) + ';',
  '',
].join('\n');
fs.writeFileSync(metaOut, metaJs, 'utf8');

let totalKb = Buffer.byteLength(metaJs) / 1024;
const legacy = path.join(OUT_DIR, 'question_fiches_bank.js');
if (fs.existsSync(legacy)) {
  fs.unlinkSync(legacy);
  console.log('Supprimé (legacy) : question_fiches_bank.js');
}

MODS.forEach((mod) => {
  const outPath = path.join(OUT_DIR, `question_fiches_${mod}.js`);
  const body = [
    `// Fiches erreur module ${mod} — généré par scripts/build/build_question_fiches.js`,
    `const Q_FICHES_${mod}=` + JSON.stringify(byMod[mod]) + ';',
    '',
  ].join('\n');
  fs.writeFileSync(outPath, body, 'utf8');
  const kb = Buffer.byteLength(body) / 1024;
  totalKb += kb;
  console.log(`  ${mod} : ${counts[mod]} fiches → ${kb.toFixed(1)} Ko`);
});

console.log('OK — ' + Q.length + ' fiches · total ~' + totalKb.toFixed(1) + ' Ko (4 chunks)');
