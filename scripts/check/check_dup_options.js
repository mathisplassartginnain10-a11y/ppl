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
if (!Q) throw new Error('Q not loaded');

function norm(s) {
  return String(s).trim().replace(/\u2019/g, "'").replace(/\u2018/g, "'").replace(/`/g, "'").replace(/\s+/g, ' ').toLowerCase();
}

const dups = [];
Q.forEach((item, i) => {
  const seen = new Map();
  item.o.forEach((opt, j) => {
    const k = norm(opt);
    if (seen.has(k)) {
      dups.push({ i, q: item.q, opts: item.o, dupIdx: [seen.get(k), j], text: opt, m: item.m, r: item.r, a: item.a });
    } else {
      seen.set(k, j);
    }
  });
});

console.log('Total questions:', Q.length);
console.log('Questions avec doublons:', dups.length);
dups.forEach((d) => {
  console.log(`#${d.i} [${d.m}] ${d.q}`);
  console.log(`  opts: ${JSON.stringify(d.opts)}`);
  console.log(`  doublon "${d.text}" aux indices ${d.dupIdx.join(', ')}`);
});

if (dups.length) process.exit(1);
