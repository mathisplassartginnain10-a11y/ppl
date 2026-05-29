const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');

const CSS = [
  'ppl_theme.css', 'ppl_theme_enhance.css', 'ppl_mobile.css', 'ppl_auth.css',
  'ppl_perf.css', 'ppl_resources.css', 'ppl_stats.css', 'ppl_plane_bg.css',
];
const JS = [
  'ppl_auth.js', 'ppl_session_fiches.js', 'ppl_fiches_page.js', 'ppl_formulas_page.js',
  'ppl_stats_page.js', 'ppl_plane_bg.js', 'questions_bank.js', 'formulas_bank.js',
  'formulas_engine.js', 'topics_utils.js', 'fiche_enrich.js',
];

function patch(content) {
  let out = content;
  for (const f of CSS) {
    const re = new RegExp(`(href=["'])${f.replace('.', '\\.')}`, 'g');
    out = out.replace(re, `$1assets/css/${f}`);
  }
  for (const f of JS) {
    const re = new RegExp(`(src=["'])${f.replace('.', '\\.')}`, 'g');
    out = out.replace(re, `$1assets/js/${f}`);
  }
  return out;
}

['index.html', 'fiches.html', 'formules.html', 'stats.html', 'ppl_quiz_ultra.html'].forEach((name) => {
  const file = path.join(ROOT, name);
  if (!fs.existsSync(file)) return;
  const next = patch(fs.readFileSync(file, 'utf8'));
  fs.writeFileSync(file, next);
  console.log('Updated', name);
});
