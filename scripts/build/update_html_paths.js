const fs = require('fs');
const path = require('path');
const { CSS, JS, PAGES } = require('./asset_manifest');

const ROOT = path.join(__dirname, '..', '..');

function patch(content) {
  let out = content;
  for (const rel of Object.values(CSS)) {
    const base = path.basename(rel);
    const re = new RegExp(`(href=["'])(?:assets/css/)?${base.replace('.', '\\.')}`, 'g');
    out = out.replace(re, `$1${rel}`);
  }
  for (const rel of Object.values(JS)) {
    const base = path.basename(rel);
    const re = new RegExp(`(src=["'])(?:assets/js/)?${base.replace('.', '\\.')}`, 'g');
    out = out.replace(re, `$1${rel}`);
  }
  return out;
}

PAGES.concat(['ppl_quiz_ultra.html']).forEach((name) => {
  const file = path.join(ROOT, name);
  if (!fs.existsSync(file)) return;
  const next = patch(fs.readFileSync(file, 'utf8'));
  fs.writeFileSync(file, next);
  console.log('Updated', name);
});
