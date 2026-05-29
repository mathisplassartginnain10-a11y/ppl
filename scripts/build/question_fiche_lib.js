/**
 * Logique partagée — génération de fiche ultra par question (build Node + moteur navigateur).
 */
'use strict';

function textSim(a, b) {
  const wa = new Set(String(a).toLowerCase().split(/\W+/).filter((w) => w.length > 2));
  const wb = new Set(String(b).toLowerCase().split(/\W+/).filter((w) => w.length > 2));
  if (!wa.size || !wb.size) return 0;
  let inter = 0;
  wa.forEach((w) => { if (wb.has(w)) inter++; });
  return inter / Math.max(wa.size, wb.size);
}

function firstSentence(text) {
  const t = String(text || '').trim();
  const m = t.match(/^[^.!?]+[.!?]?/);
  const s = m ? m[0].trim() : t;
  return s.length > 180 ? s.slice(0, 177) + '…' : s;
}

function modLabel(m) {
  return { C: 'Communications', A: 'Aéronef', M: 'Météorologie', R: 'Réglementation' }[m] || m;
}

function analyzeTraps(q, chosenIdx) {
  const correct = q.o[q.a];
  return q.o.map((o, i) => {
    if (i === q.a) return null;
    const traps = [];
    if (/\d/.test(o) && /\d/.test(correct)) traps.push('Piège numérique — compare chaque chiffre avec la règle.');
    if (textSim(o, correct) > 0.45) traps.push('Formulation très proche — relis mot à mot.');
    if (o.split(/[\s,]+/)[0] === correct.split(/[\s,]+/)[0] && o !== correct) {
      traps.push('Même début de phrase — la fin change le sens.');
    }
    if (o.length > 10 && correct.length > 10 && o.substring(0, 4) === correct.substring(0, 4)) {
      traps.push('Début identique — piège classique à l\'examen.');
    }
    if (chosenIdx === i) traps.push('C\'est l\'option que tu as choisie.');
    return { i, text: o, traps: traps.length ? traps : ['Distracteur : élimine par la règle du cours.'] };
  }).filter(Boolean);
}

function genMnemonic(q) {
  const r = (q.r || '').toLowerCase();
  if (r.includes('alphabet') || r.includes('oaci')) {
    return 'Alfa (2 a) · Bravo · Charlie · Delta — récite l\'alphabet OACI 2 fois par jour.';
  }
  if (r.includes('fréquence') || r.includes('frequence')) {
    const nums = q.o.filter((o, i) => i === q.a || /\d/.test(o))
      .map((o) => o.match(/[\d,.]+/)?.[0]).filter(Boolean);
    if (nums.length) return 'Fréquences clés : ' + nums.join(' · ') + ' — associe usage + chiffre.';
  }
  if (r.includes('phraséologie') || r.includes('phras')) {
    return 'ROGER ≠ WILCO : Roger = reçu · Wilco = reçu ET exécuté.';
  }
  if (r.includes('portée') || r.includes('vhf')) {
    return 'D = 1,23 × √h — h en pieds, D en NM.';
  }
  if (r.includes('metar') || r.includes('taf') || r.includes('temsi')) {
    return 'METAR = observation · TAF = prévision · décode vent → visi → nuages → T/QNH.';
  }
  if (r.includes('lisibilité')) {
    return '1 = illisible → 5 = parfait (plus le chiffre est grand, mieux c\'est).';
  }
  const tips = {
    C: 'Module comm : mémorise fréquences et phraséologie mot pour mot.',
    A: 'Module aéronef : vérifie les unités (kt, ft, hPa) avant de répondre.',
    M: 'Module météo : relie phénomène → cause → conséquence pour le pilote.',
    R: 'Module réglem : les seuils chiffrés tombent souvent — fiche récap obligatoire.',
  };
  return tips[q.m] || null;
}

function genExamTip(q) {
  const r = (q.r || '').toLowerCase();
  if (r.includes('alphabet') || r.includes('oaci')) {
    return 'À l\'examen : l\'alphabet OACI est souvent testé dans les deux sens (lettre → mot et mot → lettre).';
  }
  if (r.includes('vfr') || r.includes('visibilit')) {
    return 'Crée un tableau des minima VFR par espace aérien (A, C, D, E).';
  }
  if (r.includes('metar') || r.includes('taf')) {
    return 'Décode METAR/TAF groupe par groupe : vent → visi → temps → nuages → T/Td → QNH.';
  }
  if (r.includes('calcul') || r.includes('portée') || r.includes('isa')) {
    return 'Écris la formule sur papier avant de calculer — une erreur d\'unité = mauvaise réponse.';
  }
  return 'Relis la règle, puis enchaîne 5 questions du thème « ' + q.r + ' » sans correction.';
}

function whyCorrect(q) {
  const correct = q.o[q.a];
  const base = q.e || 'Voir l\'explication officielle.';
  return 'La réponse attendue est « ' + correct + ' ». ' + base;
}

function whyWrong(q, i, chosenIdx, trap) {
  if (i === q.a) return '';
  const letter = String.fromCharCode(65 + i);
  const text = q.o[i];
  if (chosenIdx === i) {
    const trapTxt = trap ? trap.traps.filter((t) => !t.startsWith('C\'est')).join(' ') : '';
    return letter + ' (« ' + text + ' ») : tu as choisi cette option. ' +
      (trapTxt || 'Ce n\'est pas conforme au programme pour cette question.');
  }
  if (trap && trap.traps.length) {
    return letter + ' (« ' + text + ' ») : ' + trap.traps[0];
  }
  return letter + ' (« ' + text + ' ») : distracteur — ce n\'est pas la bonne réponse.';
}

function retainBullets(q) {
  const bullets = [];
  if (q.e) bullets.push(firstSentence(q.e));
  bullets.push('Thème : ' + q.r + ' (' + modLabel(q.m) + ').');
  bullets.push('Bonne réponse : « ' + q.o[q.a] + ' ».');
  const uniq = [];
  bullets.forEach((b) => { if (b && !uniq.includes(b)) uniq.push(b); });
  return uniq.slice(0, 4);
}

function revisionSteps(q, mnemo) {
  const steps = [
    'Relire la règle ci-dessus et la répéter à voix haute.',
    'Relire chaque option A–D et expliquer pourquoi elle est vraie ou fausse.',
    'Refaire 3 questions du thème « ' + q.r + ' » sans regarder la correction.',
  ];
  if (mnemo) steps.splice(2, 0, 'Mémoriser : ' + mnemo);
  return steps.slice(0, 5);
}

/**
 * @param {object} q — question {m,d,q,o,a,e,r}
 * @param {number} [chosenIdx=-1]
 * @returns {object} fiche compacte
 */
function buildQuestionErrorFiche(q, chosenIdx) {
  chosenIdx = chosenIdx == null ? -1 : chosenIdx;
  const traps = analyzeTraps(q, chosenIdx);
  const trapByIdx = {};
  traps.forEach((t) => { trapByIdx[t.i] = t; });

  const opts = q.o.map((text, i) => ({
    l: String.fromCharCode(65 + i),
    ok: i === q.a,
    chosen: chosenIdx === i,
    t: text,
    w: i === q.a
      ? '✓ Bonne réponse. ' + (q.e || 'Conforme au programme.')
      : whyWrong(q, i, chosenIdx, trapByIdx[i]),
  }));

  const mnemo = genMnemonic(q);
  return {
    e: firstSentence(q.e || q.q),
    w: whyCorrect(q),
    o: opts,
    k: retainBullets(q),
    m: mnemo || '',
    t: genExamTip(q),
    s: revisionSteps(q, mnemo),
    r: q.r,
    mod: q.m,
  };
}

module.exports = {
  buildQuestionErrorFiche,
  firstSentence,
  modLabel,
};
