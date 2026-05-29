const fs = require('fs');
const vm = require('vm');
const code = fs.readFileSync(__dirname + '/questions_bank.js', 'utf8');
const sandbox = {};
vm.createContext(sandbox);
vm.runInContext(code + '\nthis.Q = typeof Q !== "undefined" ? Q : null;', sandbox);
const Q = sandbox.Q;
if (!Q) throw new Error('Q not loaded');

function norm(s) {
  return String(s).trim().replace(/\u2019/g, "'").replace(/\u2018/g, "'").replace(/`/g, "'").replace(/\s+/g, ' ').toLowerCase();
}

function similar(a, b) {
  const na = norm(a), nb = norm(b);
  if (na === nb) return true;
  if (na.length > 8 && nb.length > 8 && (na.includes(nb) || nb.includes(na))) return true;
  return false;
}

let dupes = 0, similarPairs = 0, badIdx = 0;
const similarList = [];
Q.forEach((item, i) => {
  const seen = new Set();
  item.o.forEach((opt) => {
    const k = norm(opt);
    if (seen.has(k)) dupes++;
    seen.add(k);
  });
  if (item.a < 0 || item.a >= item.o.length) badIdx++;
  for (let j = 0; j < item.o.length; j++) {
    for (let k = j + 1; k < item.o.length; k++) {
      if (similar(item.o[j], item.o[k])) {
        similarPairs++;
        similarList.push({ i, j, k, q: item.q, o: item.o });
      }
    }
  }
});

console.log('Total:', Q.length);
console.log('Doublons exacts:', dupes);
console.log('Index invalides:', badIdx);
console.log('Paires trop similaires:', similarPairs);
if (similarList.length) {
  similarList.slice(0, 10).forEach((x) => {
    console.log(`#${x.i}: "${x.o[x.j]}" | "${x.o[x.k]}"`);
    console.log(`  ${x.q.slice(0, 80)}`);
  });
}
process.exit(dupes || badIdx || similarPairs ? 1 : 0);
