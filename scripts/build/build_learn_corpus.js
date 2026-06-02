#!/usr/bin/env node
/**
 * Compile docs/*.txt (Aérogligli) → assets/js/learn_corpus.js
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const OUT = path.join(ROOT, 'assets', 'js', 'learn_corpus.js');
const MANIFEST = path.join(ROOT, 'assets', 'docs', 'manifest.json');

const SOURCES = [
  {
    id: '010',
    mod: 'R',
    file: '010_compilation_droit-aerien_reglementation.txt',
    title: '010 — Réglementation aérienne (LAPL / PPL)',
    subtitle: 'Compilation Aérogligli · droit aérien, espaces, vol, équipements',
  },
  {
    id: '020',
    mod: 'A',
    file: '020_compilation-connaissance_generale_aeronef.txt',
    title: '020 — Connaissance générale aéronef',
    subtitle: 'Compilation Aérogligli · structure, moteur, instruments, performances',
  },
  {
    id: '050',
    mod: 'M',
    file: '050_compilation_meteorologie.txt',
    title: '050 — Météorologie',
    subtitle: 'Compilation Aérogligli · masses d\'air, nuages, METAR/TAF, dangers',
  },
  {
    id: '091',
    mod: 'C',
    file: 'fiche_resume_communications.txt',
    title: '091 — Communications aéronautiques',
    subtitle: 'Résumé Aérogligli · phraséologie, VHF, transpondeur, priorités',
  },
];

function isNoiseLine(t) {
  if (!t) return true;
  if (/^www\.aerogligli/i.test(t)) return true;
  if (/^©\s*Aérogligli/i.test(t)) return true;
  if (/^LES RÉSUMÉS$/i.test(t)) return true;
  if (/^COMPILATION$/i.test(t)) return true;
  if (/^LAPL\s*\/\s*PPL$/i.test(t)) return true;
  if (/^\d+$/.test(t)) return true;
  if (/^document actualisé/i.test(t)) return true;
  return false;
}

function isSectionHeader(t) {
  if (t.length < 8 || t.length > 140) return false;
  if (/^\d{3}\s+(Réglementation|Météorologie|Communications|Connaissance)/i.test(t)) return true;
  if (/^\d{3}\s/.test(t) && t.length < 70) return true;
  const letters = t.replace(/[^A-Za-zÀ-ÿ]/g, '');
  if (letters.length >= 10 && letters === letters.toUpperCase()) return true;
  return false;
}

function parseDoc(content) {
  const lines = content.split(/\r?\n/);
  const sections = [];
  let current = null;

  function flush() {
    if (!current) return;
    const body = current.body.trim();
    if (body.length > 20) sections.push({ title: current.title, body });
    current = null;
  }

  for (const raw of lines) {
    const t = raw.trim();
    if (isNoiseLine(t)) continue;
    if (isSectionHeader(t)) {
      flush();
      current = { title: t.replace(/\s+/g, ' '), body: '' };
      continue;
    }
    if (!current) {
      current = { title: 'Introduction', body: '' };
    }
    current.body += (current.body ? '\n' : '') + raw.trimEnd();
  }
  flush();
  return sections;
}

function escJs(s) {
  return JSON.stringify(s);
}

const corpus = { version: 1, builtAt: new Date().toISOString(), sources: [] };

let pageManifest = null;
if (fs.existsSync(MANIFEST)) {
  try {
    pageManifest = JSON.parse(fs.readFileSync(MANIFEST, 'utf8'));
    console.log('Manifeste pages:', pageManifest.totalPages, 'pages');
  } catch (e) {
    console.warn('Manifeste pages illisible:', e.message);
  }
} else {
  console.warn('Manifeste pages absent — lancer: python scripts/build/extract_doc_pages.py');
}

function pagesForSource(id) {
  if (!pageManifest) return null;
  const src = pageManifest.sources.find((s) => s.id === id);
  if (!src) return null;
  return { pageCount: src.pageCount, pages: src.pages };
}

SOURCES.forEach((src) => {
  const abs = path.join(ROOT, 'docs', src.file);
  if (!fs.existsSync(abs)) {
    console.warn('Manquant:', src.file);
    return;
  }
  const content = fs.readFileSync(abs, 'utf8');
  const sections = parseDoc(content);
  const pageData = pagesForSource(src.id);
  corpus.sources.push({
    id: src.id,
    mod: src.mod,
    title: src.title,
    subtitle: src.subtitle,
    file: src.file,
    chars: content.length,
    sectionCount: sections.length,
    sections,
    ...(pageData ? { pageCount: pageData.pageCount, pages: pageData.pages } : {}),
  });
  console.log(src.file, '→', sections.length, 'sections');
});

const js = `/** Généré par scripts/build/build_learn_corpus.js — ne pas éditer à la main */
(function (global) {
  'use strict';
  global.LEARN_CORPUS = ${JSON.stringify(corpus, null, 0)};
})(typeof window !== 'undefined' ? window : this);
`;

fs.writeFileSync(OUT, js, 'utf8');
console.log('Écrit:', OUT, '(' + Math.round(js.length / 1024) + ' Ko)');
