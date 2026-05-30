/**
 * Moteur pédagogique — fiches erreur simples et explicatives.
 * Partagé : navigateur (PPLQuestionFicheCore) + build Node (require).
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;
  }
  root.PPLQuestionFicheCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  function modLabel(m) {
    return { C: 'Communications', A: 'Aéronef', M: 'Météorologie', R: 'Réglementation' }[m] || m;
  }

  function cleanText(s) {
    return String(s ?? '')
      .replace(/\s+/g, ' ')
      .replace(/\.\./g, '.')
      .replace(/\bcertii\b/gi, 'certificat')
      .replace(/\bqualii cation\b/gi, 'qualification')
      .trim();
  }

  function textSim(a, b) {
    const wa = new Set(String(a).toLowerCase().split(/\W+/).filter((w) => w.length > 2));
    const wb = new Set(String(b).toLowerCase().split(/\W+/).filter((w) => w.length > 2));
    if (!wa.size || !wb.size) return 0;
    let inter = 0;
    wa.forEach((w) => { if (wb.has(w)) inter++; });
    return inter / Math.max(wa.size, wb.size);
  }

  function firstSentence(text, maxLen) {
    maxLen = maxLen || 200;
    const t = cleanText(text);
    if (!t) return '';
    const m = t.match(/^[^.!?]+[.!?]?/);
    let s = m ? m[0].trim() : t;
    if (s.length > maxLen) s = s.slice(0, maxLen - 1) + '…';
    return s;
  }

  function simplifyExplanation(text) {
    let t = cleanText(text);
    if (!t) return '';
    t = t.replace(/^[^:]+:\s*/i, '');
    t = t.replace(/^(la réponse (attendue|correcte) est|bonne réponse\s*:)\s*/i, '');
    t = t.replace(/^[«"']|[»"']\.?$/g, '');
    t = t.replace(/\s*\.?\s*$/, '');
    if (t.length > 0 && !/[.!?]$/.test(t)) t += '.';
    return t;
  }

  function extractNumbers(s) {
    return (String(s).match(/[\d]+(?:[.,]\d+)?/g) || []).map((n) => n.replace(',', '.'));
  }

  function diffHint(correct, wrong) {
    const nc = extractNumbers(correct);
    const nw = extractNumbers(wrong);
    if (nc.length && nw.length && nc.join() !== nw.join()) {
      return 'Les chiffres ne correspondent pas : tu as « ' + nw.join(', ') + ' » alors que la règle indique « ' + nc.join(', ') + ' ».';
    }
    const sim = textSim(correct, wrong);
    if (sim > 0.35) {
      const cw = correct.toLowerCase().split(/\W+/).filter((w) => w.length > 3);
      const ww = wrong.toLowerCase().split(/\W+/).filter((w) => w.length > 3);
      const onlyC = cw.filter((w) => !ww.includes(w)).slice(0, 3);
      const onlyW = ww.filter((w) => !cw.includes(w)).slice(0, 3);
      if (onlyC.length || onlyW.length) {
        let h = 'Formulation proche de la bonne réponse, mais ';
        if (onlyW.length) h += 'cette option parle de « ' + onlyW.join(', ') + ' »';
        if (onlyC.length && onlyW.length) h += ' au lieu de « ' + onlyC.join(', ') + ' »';
        else if (onlyC.length) h += 'il manque l\'idée clé : « ' + onlyC.join(', ') + ' »';
        return h + '.';
      }
      return 'Les mots se ressemblent — relis la fin de la phrase, c\'est souvent là que ça change.';
    }
    if (correct.split(/[\s,]+/)[0] === wrong.split(/[\s,]+/)[0] && correct !== wrong) {
      return 'Même début de phrase que la bonne réponse, mais la fin change le sens.';
    }
    return '';
  }

  function plainEssential(q) {
    const correct = q.o[q.a];
    const expl = simplifyExplanation(q.e);
    if (expl && expl.length > 15) {
      return 'En bref : ' + firstSentence(expl, 160);
    }
    return 'En bref : pour cette question, retiens « ' + correct + ' ».';
  }

  function oneLiner(q) {
    const correct = q.o[q.a];
    const expl = simplifyExplanation(q.e);
    if (expl.length > 10 && expl.length < 90) return expl;
    return 'Réponse = « ' + correct + ' ».';
  }

  function explainCorrect(q) {
    const correct = q.o[q.a];
    const expl = simplifyExplanation(q.e);
    let out = 'La bonne réponse est « ' + correct + ' ».';
    if (expl) {
      out += ' En termes simples : ' + expl;
    } else {
      out += ' C\'est ce que demande le programme PPL sur le thème « ' + (q.r || modLabel(q.m)) + ' ».';
    }
    return out;
  }

  function explainWrong(q, i, chosenIdx) {
    if (i === q.a) return '';
    const letter = String.fromCharCode(65 + i);
    const text = q.o[i];
    const correct = q.o[q.a];
    const hint = diffHint(correct, text);
    const prefix = chosenIdx === i ? 'Tu as choisi cette option. ' : '';

    if (hint) {
      return prefix + hint;
    }
    if (text.length < 8) {
      return prefix + 'Trop vague ou incomplète pour être la bonne réponse.';
    }
    if (/\b(jamais|interdit|aucun|n\'est pas|false|incorrect)\b/i.test(text) && !/\b(jamais|interdit|aucun)\b/i.test(correct)) {
      return prefix + 'Attention : cette option exagère ou interdit quelque chose que la règle autorise (ou l\'inverse).';
    }
    return prefix + 'Ce n\'est pas la bonne réponse pour cette question — élimine-la en la comparant à « ' + correct + ' ».';
  }

  function explainCorrectOption(q) {
    const expl = simplifyExplanation(q.e);
    if (expl) return 'C\'est la bonne réponse. ' + expl;
    return 'C\'est la bonne réponse — conforme au cours sur « ' + (q.r || modLabel(q.m)) + ' ».';
  }

  function retainBullets(q) {
    const correct = q.o[q.a];
    const bullets = [];
    const expl = simplifyExplanation(q.e);
    if (expl) bullets.push('Règle : ' + firstSentence(expl, 120));
    bullets.push('À cocher : « ' + correct + ' ».');
    const traps = q.o.filter((_, i) => i !== q.a && textSim(q.o[q.a], q.o[i]) > 0.3);
    if (traps.length) {
      bullets.push('Piège : ne confonds pas avec « ' + firstSentence(traps[0], 60) + ' ».');
    }
    bullets.push('Thème : ' + (q.r || modLabel(q.m)) + ' (' + modLabel(q.m) + ').');
    const uniq = [];
    bullets.forEach((b) => { if (b && !uniq.includes(b)) uniq.push(b); });
    return uniq.slice(0, 4);
  }

  function genMnemonic(q) {
    const r = (q.r || '').toLowerCase();
    if (r.includes('alphabet') || r.includes('oaci')) {
      return 'Alphabet OACI : Alfa · Bravo · Charlie… — récite-le à voix haute dans les deux sens.';
    }
    if (r.includes('fréquence') || r.includes('frequence')) {
      const nums = q.o.map((o) => o.match(/[\d,.]+/)?.[0]).filter(Boolean);
      if (nums.length) return 'Associe chaque fréquence à son usage : ' + [...new Set(nums)].slice(0, 4).join(' · ');
    }
    if (r.includes('phraséologie') || r.includes('phras')) {
      return 'Roger = j\'ai bien reçu · Wilco = je reçois ET j\'exécute (ne les confonds pas).';
    }
    if (r.includes('mayday') || r.includes('pan-pan') || r.includes('détresse') || r.includes('urgence')) {
      return 'MAYDAY = détresse · PAN-PAN = urgence — MAYDAY se répète 3 fois.';
    }
    if (r.includes('espace aérien') || r.includes('classe')) {
      return 'Classe A = IFR seul · B = tout séparé · C/D/E = IFR/VFR avec règles différentes.';
    }
    if (r.includes('metar') || r.includes('taf')) {
      return 'METAR = maintenant · TAF = prévision — décode : vent → visibilité → nuages → température.';
    }
    if (r.includes('portée') || r.includes('vhf')) {
      return 'Portée VHF : D ≈ 1,23 × √h (h en pieds, D en miles nautiques).';
    }
    const tips = {
      C: 'Comm : retiens les mots exacts — une syllabe de différence = mauvaise réponse.',
      A: 'Aéronef : vérifie toujours les unités (kt, ft, NM, hPa) avant de répondre.',
      M: 'Météo : pense « phénomène → danger pour le vol → bonne conduite à tenir ».',
      R: 'Réglementation : les seuils chiffrés (âge, visi, altitude…) reviennent souvent.',
    };
    return tips[q.m] || null;
  }

  function genExamTip(q) {
    const r = (q.r || '').toLowerCase();
    if (r.includes('alphabet') || r.includes('oaci')) {
      return 'Examen : on teste souvent lettre → mot ET mot → lettre. Entraîne-toi les deux sens.';
    }
    if (r.includes('vfr') || r.includes('visibilit')) {
      return 'Fais un tableau des minima VFR par classe d\'espace — c\'est un classique à l\'examen.';
    }
    if (r.includes('espace') || r.includes('classe')) {
      return 'Pour les classes d\'espace : note qui est autorisé (IFR/VFR) et quel type de séparation s\'applique.';
    }
    if (r.includes('metar') || r.includes('taf')) {
      return 'Découpe le message groupe par groupe — ne devine pas, décode dans l\'ordre.';
    }
    return 'Refais 5 questions sur « ' + (q.r || modLabel(q.m)) + ' » sans regarder la correction, puis vérifie.';
  }

  function revisionSteps(q, mnemo) {
    const steps = [
      'Lis la règle ci-dessus et reformule-la avec tes propres mots.',
      'Compare chaque option A–D : pourquoi 3 sont fausses et 1 seule est vraie ?',
      'Sans regarder : redis la bonne réponse « ' + q.o[q.a] + ' ».',
      'Refais 3 questions du thème « ' + (q.r || modLabel(q.m)) + ' ».',
    ];
    if (mnemo) steps.splice(2, 0, 'Mémorise : ' + mnemo);
    return steps.slice(0, 5);
  }

  function buildQuestionErrorFiche(q, chosenIdx) {
    chosenIdx = chosenIdx == null ? -1 : chosenIdx;
    const opts = q.o.map((text, i) => ({
      l: String.fromCharCode(65 + i),
      ok: i === q.a,
      chosen: chosenIdx === i,
      t: text,
      w: i === q.a ? explainCorrectOption(q) : explainWrong(q, i, chosenIdx),
    }));

    const mnemo = genMnemonic(q);
    return {
      v: 3,
      p: oneLiner(q),
      e: plainEssential(q),
      w: explainCorrect(q),
      o: opts,
      k: retainBullets(q),
      m: mnemo || '',
      t: genExamTip(q),
      s: revisionSteps(q, mnemo),
      r: q.r,
      mod: q.m,
    };
  }

  function compactFiche(f) {
    return {
      v: 3,
      p: f.p || oneLiner({ o: f.o.map((x) => x.t), a: f.o.findIndex((x) => x.ok), e: f.e, r: f.r, m: f.mod }),
      e: f.e,
      w: f.w,
      r: f.r,
      mod: f.mod,
      m: f.m || '',
      t: f.t,
      k: f.k,
      s: f.s,
      ow: f.o.map((o) => o.w),
    };
  }

  function expandCompactFiche(c, q, chosenIdx) {
    if (!c || !q) return null;
    chosenIdx = chosenIdx == null ? -1 : chosenIdx;
    if (c.v >= 2 && Array.isArray(c.ow)) {
      return {
        v: c.v,
        p: c.p || '',
        e: c.e,
        w: c.w,
        k: c.k,
        m: c.m,
        t: c.t,
        s: c.s,
        r: c.r,
        mod: c.mod || q.m,
        o: q.o.map((text, i) => ({
          l: String.fromCharCode(65 + i),
          ok: i === q.a,
          chosen: chosenIdx === i,
          t: text,
          w: i === q.a
            ? (c.ow[i] || explainCorrectOption(q))
            : (chosenIdx === i
              ? explainWrong(q, i, chosenIdx)
              : (c.ow[i] || explainWrong(q, i, -1))),
        })),
      };
    }
    return c;
  }

  return {
    buildQuestionErrorFiche,
    compactFiche,
    expandCompactFiche,
    firstSentence,
    modLabel,
    plainEssential,
    explainCorrect,
    explainWrong,
  };
});
