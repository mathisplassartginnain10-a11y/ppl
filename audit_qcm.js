const fs = require('fs');
const vm = require('vm');
const code = fs.readFileSync(__dirname + '/questions_bank.js', 'utf8');
const sandbox = {};
vm.createContext(sandbox);
vm.runInContext(code + '\nthis.Q = typeof Q !== "undefined" ? Q : null;', sandbox);
const Q = sandbox.Q;

function norm(s) {
  return String(s).trim().replace(/\u2019/g, "'").replace(/\u2018/g, "'").replace(/`/g, "'").replace(/\s+/g, ' ').toLowerCase();
}

function similar(a, b) {
  const na = norm(a), nb = norm(b);
  if (na === nb) return 'exact';
  if (na.length > 8 && nb.length > 8 && (na.includes(nb) || nb.includes(na))) return 'subset';
  return null;
}

const issues = { similar: [], explMismatch: [], generic: [], shortOpts: [], samePrefix: [] };

Q.forEach((item, i) => {
  const correct = item.o[item.a];
  if (!correct) issues.explMismatch.push({ i, type: 'no_correct', q: item.q });

  for (let j = 0; j < item.o.length; j++) {
    for (let k = j + 1; k < item.o.length; k++) {
      const sim = similar(item.o[j], item.o[k]);
      if (sim) issues.similar.push({ i, sim, j, k, q: item.q, o: item.o, a: item.a, m: item.m, r: item.r });
    }
  }

  item.o.forEach((opt, j) => {
    if (norm(opt).startsWith('alternative ') || norm(opt).includes('réponse incorrecte'))
      if (j === item.a) issues.generic.push({ i, q: item.q, opt });
    if (opt.length < 3) issues.shortOpts.push({ i, q: item.q, opt, j });
  });

  // Options sharing same first 20 chars (likely too similar distractors)
  for (let j = 0; j < item.o.length; j++) {
    for (let k = j + 1; k < item.o.length; k++) {
      const p1 = norm(item.o[j]).slice(0, 22);
      const p2 = norm(item.o[k]).slice(0, 22);
      if (p1.length >= 15 && p1 === p2 && !similar(item.o[j], item.o[k]))
        issues.samePrefix.push({ i, q: item.q, o: item.o, j, k });
    }
  }
});

console.log('=== Paires similaires (' + issues.similar.length + ') ===');
issues.similar.forEach((x) => {
  console.log(`#${x.i} [${x.m}] ${x.sim}: "${x.o[x.j]}" | "${x.o[x.k]}" a=${x.a}`);
  console.log(`  Q: ${x.q.slice(0, 90)}`);
});

console.log('\n=== Réponses génériques comme bonne réponse (' + issues.generic.length + ') ===');
issues.generic.forEach((x) => console.log(`#${x.i}: ${x.opt}`));

console.log('\n=== Même préfixe long (' + issues.samePrefix.length + ') ===');
issues.samePrefix.slice(0, 20).forEach((x) => {
  console.log(`#${x.i}: "${x.o[x.j]}" / "${x.o[x.k]}"`);
});

process.exit(issues.similar.length + issues.generic.length ? 1 : 0);
