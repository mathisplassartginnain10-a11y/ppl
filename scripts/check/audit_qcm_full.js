#!/usr/bin/env node
/**
 * Audit QCM complet — doublons, cohérence, structure.
 * Usage: node scripts/check/audit_qcm_full.js
 */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..', '..');
const BANK = path.join(ROOT, 'assets', 'js', 'questions_bank.js');
const code = fs.readFileSync(BANK, 'utf8');
const sandbox = {};
vm.createContext(sandbox);
vm.runInContext(code + '\nthis.Q = typeof Q !== "undefined" ? Q : null;', sandbox);
const Q = sandbox.Q;
if (!Q || !Q.length) {
  console.error('Banque Q introuvable ou vide');
  process.exit(1);
}

function norm(s) {
  return String(s ?? '')
    .trim()
    .replace(/\u2019/g, "'")
    .replace(/\u2018/g, "'")
    .replace(/`/g, "'")
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

function similar(a, b) {
  const na = norm(a);
  const nb = norm(b);
  if (!na || !nb) return null;
  if (na === nb) return 'exact';
  if (na.length > 8 && nb.length > 8 && (na.includes(nb) || nb.includes(na))) return 'subset';
  return null;
}

const report = {
  total: Q.length,
  optCountWrong: [],
  emptyQuestion: [],
  emptyOption: [],
  invalidIndex: [],
  intraDupExact: [],
  intraSimilar: [],
  samePrefix: [],
  genericCorrect: [],
  correctNotInOptions: [],
  duplicateQuestions: [],
  duplicateFullSets: [],
  duplicateCorrectText: [],
};

const qTextMap = new Map();
const fullSetMap = new Map();
const correctTextMap = new Map();

Q.forEach((item, i) => {
  if (!item.q || !norm(item.q)) report.emptyQuestion.push(i);
  if (!Array.isArray(item.o)) {
    report.optCountWrong.push({ i, n: 0, q: item.q });
    return;
  }
  if (item.o.length !== 4) report.optCountWrong.push({ i, n: item.o.length, q: item.q });

  if (item.a < 0 || item.a >= item.o.length) report.invalidIndex.push({ i, a: item.a, q: item.q });

  const correct = item.o[item.a];
  if (correct == null || !norm(correct)) {
    report.correctNotInOptions.push({ i, a: item.a, q: item.q });
  }

  const nq = norm(item.q);
  if (nq) {
    if (qTextMap.has(nq)) report.duplicateQuestions.push({ i, other: qTextMap.get(nq), q: item.q });
    else qTextMap.set(nq, i);
  }

  const setKey = norm(item.q) + '||' + item.o.map(norm).sort().join('||');
  if (fullSetMap.has(setKey)) report.duplicateFullSets.push({ i, other: fullSetMap.get(setKey), q: item.q });
  else fullSetMap.set(setKey, i);

  if (correct && norm(correct)) {
    const ck = norm(correct) + '||' + item.m;
    if (correctTextMap.has(ck)) {
      const prev = correctTextMap.get(ck);
      if (prev !== i) report.duplicateCorrectText.push({ i, other: prev, text: correct, m: item.m });
    } else correctTextMap.set(ck, i);
  }

  item.o.forEach((opt, j) => {
    if (!norm(opt)) report.emptyOption.push({ i, j, q: item.q });
    if (j === item.a) {
      const no = norm(opt);
      if (no.startsWith('alternative ') || no.includes('réponse incorrecte')) {
        report.genericCorrect.push({ i, opt, q: item.q });
      }
    }
  });

  const seen = new Map();
  item.o.forEach((opt, j) => {
    const k = norm(opt);
    if (!k) return;
    if (seen.has(k)) {
      report.intraDupExact.push({ i, j, other: seen.get(k), text: opt, q: item.q, m: item.m });
    } else seen.set(k, j);
  });

  for (let j = 0; j < item.o.length; j++) {
    for (let k = j + 1; k < item.o.length; k++) {
      const sim = similar(item.o[j], item.o[k]);
      if (sim) {
        report.intraSimilar.push({ i, sim, j, k, q: item.q, o: item.o, a: item.a, m: item.m });
      } else {
        const p1 = norm(item.o[j]).slice(0, 22);
        const p2 = norm(item.o[k]).slice(0, 22);
        if (p1.length >= 15 && p1 === p2) {
          report.samePrefix.push({ i, j, k, q: item.q, o: item.o });
        }
      }
    }
  }
});

function section(title, arr, fmt) {
  console.log('\n=== ' + title + ' (' + arr.length + ') ===');
  arr.slice(0, 30).forEach((x) => console.log(fmt(x)));
  if (arr.length > 30) console.log('… et ' + (arr.length - 30) + ' de plus');
}

console.log('Audit QCM complet — ' + report.total + ' questions\n');

section('Structure invalide (nb options ≠ 4)', report.optCountWrong, (x) =>
  '#' + x.i + ' : ' + x.n + ' options — ' + String(x.q).slice(0, 70));

section('Questions vides', report.emptyQuestion, (i) => '#' + i);

section('Options vides', report.emptyOption, (x) =>
  '#' + x.i + ' opt ' + String.fromCharCode(65 + x.j) + ' — ' + String(x.q).slice(0, 60));

section('Index réponse invalide', report.invalidIndex, (x) =>
  '#' + x.i + ' a=' + x.a + ' — ' + String(x.q).slice(0, 60));

section('Bonne réponse absente/vide', report.correctNotInOptions, (x) =>
  '#' + x.i + ' a=' + x.a);

section('Doublons exacts intra-question', report.intraDupExact, (x) =>
  '#' + x.i + ' [' + x.m + '] "' + x.text + '" aux indices ' + x.other + ',' + x.j);

section('Paires similaires intra-question', report.intraSimilar, (x) =>
  '#' + x.i + ' [' + x.m + '] ' + x.sim + ': "' + x.o[x.j] + '" | "' + x.o[x.k] + '" (a=' + x.a + ')');

section('Même préfixe long (≥15 car.)', report.samePrefix, (x) =>
  '#' + x.i + ': "' + x.o[x.j] + '" / "' + x.o[x.k] + '"');

section('Bonne réponse générique', report.genericCorrect, (x) =>
  '#' + x.i + ': ' + x.opt);

section('Questions dupliquées (texte identique)', report.duplicateQuestions, (x) =>
  '#' + x.i + ' = #' + x.other + ' — ' + String(x.q).slice(0, 70));

section('Jeux Q+options dupliqués', report.duplicateFullSets, (x) =>
  '#' + x.i + ' = #' + x.other + ' — ' + String(x.q).slice(0, 70));

const critical = [
  report.optCountWrong,
  report.emptyQuestion,
  report.emptyOption,
  report.invalidIndex,
  report.correctNotInOptions,
  report.intraDupExact,
  report.intraSimilar,
  report.genericCorrect,
  report.duplicateQuestions,
  report.duplicateFullSets,
].reduce((s, a) => s + a.length, 0);

const warnings = report.samePrefix.length;

console.log('\n──────── RÉSUMÉ ────────');
console.log('Questions analysées :', report.total);
console.log('Problèmes critiques :', critical);
console.log('Avertissements (préfixe) :', warnings);

if (critical) process.exit(1);
process.exit(0);
