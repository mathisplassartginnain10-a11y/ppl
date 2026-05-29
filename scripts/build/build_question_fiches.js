/**
 * Génère assets/js/question_fiches_bank.js — une fiche par question (1324).
 * Usage : node scripts/build/build_question_fiches.js
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { buildQuestionErrorFiche } = require('./question_fiche_lib');

const ROOT = path.join(__dirname, '..', '..');
const BANK_IN = path.join(ROOT, 'assets', 'js', 'questions_bank.js');
const BANK_OUT = path.join(ROOT, 'assets', 'js', 'question_fiches_bank.js');

const code = fs.readFileSync(BANK_IN, 'utf8');
const ctx = { console };
vm.runInNewContext(code + '\n;if(typeof Q!=="undefined"){this.Q=Q;this.Q_BANK_META=typeof Q_BANK_META!=="undefined"?Q_BANK_META:null;}', ctx);
const Q = ctx.Q;

if (!Array.isArray(Q) || !Q.length) {
  console.error('questions_bank.js : Q introuvable ou vide');
  process.exit(1);
}

const fiches = Q.map((q) => buildQuestionErrorFiche(q, -1));

const out = [
  '// Fiches erreur par question — généré par scripts/build/build_question_fiches.js',
  '// Ne pas éditer à la main. Relancer : npm run fiches:build',
  'const Q_FICHE_META=' + JSON.stringify({ total: fiches.length, version: 1 }) + ';',
  'const Q_FICHES=' + JSON.stringify(fiches) + ';',
  '',
].join('\n');

fs.writeFileSync(BANK_OUT, out, 'utf8');
const kb = (Buffer.byteLength(out) / 1024).toFixed(1);
console.log('OK — ' + fiches.length + ' fiches → ' + BANK_OUT + ' (' + kb + ' Ko)');
