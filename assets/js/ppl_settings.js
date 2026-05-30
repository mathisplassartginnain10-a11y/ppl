(function (global) {
  'use strict';

  const STORAGE_KEY = 'ppl4settings';

  const DEFAULTS = {
    theme: 'midnight',
    accent: 'blue',
    fontSize: 'normal',
    density: 'comfort',
    font: 'outfit',
    animations: true,
    glass: true,
    glow: true,
    grid: true,
    // Quiz
    showTimer: true,
    confirmSkip: true,
    showProbaTags: true,
    autoAdvance: 'off',
    shuffleOptions: false,
    showExplanation: true,
    showErrorFiche: true,
    showReactLive: true,
    compactFeedback: false,
    keyboardShortcuts: true,
    soundFeedback: false,
    vibrationFeedback: false,
    pauseOnBlur: false,
    defaultQuestionCount: '64',
    // Accessibilité
    reduceMotion: false,
    largeTouch: false,
    highContrast: false,
    // Données & confidentialité (opt-in — confirmé via bannière au premier lancement)
    saveProgress: false,
    saveReaction: false,
    saveBehavior: false,
    saveDetailedLog: false,
    saveProbaSnapshots: false,
    privateSession: false,
    clearOnExit: false,
    retention: 'session',
    privacyConsentAt: null,
  };

  const DATA_KEYS = [
    'ppl4h', 'ppl4w', 'ppl4rev', 'ppl4react', 'ppl4proba', 'ppl4div',
    'ppl4answers', 'ppl4sessionFiches', 'ppl4errorFiches', 'ppl4gate',
  ];

  const RETENTION_DAYS = { forever: null, '90d': 90, '30d': 30, session: 0 };

  const THEMES = {
    midnight: {
      label: 'Minuit',
      icon: '🌙',
      vars: {
        '--bg': '#080b12',
        '--s1': '#0e1420',
        '--s2': '#141c2e',
        '--s3': '#1c2640',
        '--s4': '#243050',
        '--t1': '#eef0f8',
        '--t2': '#8b93b8',
        '--t3': '#4a5278',
        '--t4': '#2a3060',
        '--b1': 'rgba(100,130,255,.08)',
        '--b2': 'rgba(100,130,255,.16)',
        '--b3': 'rgba(100,130,255,.28)',
        '--glass': 'rgba(14, 20, 32, 0.72)',
        '--glass2': 'rgba(20, 28, 46, 0.85)',
        '--glass-border': 'rgba(120, 160, 255, 0.12)',
        '--glass-border-hi': 'rgba(120, 160, 255, 0.28)',
        '--hdr-bg': 'rgba(8, 11, 18, 0.75)',
        '--mesh-a': 'rgba(91, 138, 240, 0.18)',
        '--mesh-b': 'rgba(124, 108, 246, 0.08)',
        '--mesh-c': 'rgba(52, 211, 168, 0.06)',
      },
      meta: '#080b12',
    },
    cockpit: {
      label: 'Cockpit',
      icon: '✈',
      vars: {
        '--bg': '#060a0f',
        '--s1': '#0a1218',
        '--s2': '#101c24',
        '--s3': '#162830',
        '--s4': '#1c343c',
        '--t1': '#e8f4f0',
        '--t2': '#7a9a90',
        '--t3': '#3d5c54',
        '--t4': '#243830',
        '--b1': 'rgba(52, 211, 168, 0.08)',
        '--b2': 'rgba(52, 211, 168, 0.16)',
        '--b3': 'rgba(52, 211, 168, 0.28)',
        '--glass': 'rgba(10, 18, 24, 0.78)',
        '--glass2': 'rgba(16, 28, 36, 0.88)',
        '--glass-border': 'rgba(52, 211, 168, 0.14)',
        '--glass-border-hi': 'rgba(52, 211, 168, 0.3)',
        '--hdr-bg': 'rgba(6, 10, 15, 0.82)',
        '--mesh-a': 'rgba(52, 211, 168, 0.12)',
        '--mesh-b': 'rgba(64, 192, 240, 0.06)',
        '--mesh-c': 'rgba(240, 176, 64, 0.04)',
      },
      meta: '#060a0f',
    },
    ocean: {
      label: 'Océan',
      icon: '🌊',
      vars: {
        '--bg': '#061018',
        '--s1': '#0a1824',
        '--s2': '#102030',
        '--s3': '#162a3c',
        '--s4': '#1c3448',
        '--t1': '#e8f0fa',
        '--t2': '#7a94b8',
        '--t3': '#3d5878',
        '--t4': '#243850',
        '--b1': 'rgba(64, 192, 240, 0.08)',
        '--b2': 'rgba(64, 192, 240, 0.16)',
        '--b3': 'rgba(64, 192, 240, 0.28)',
        '--glass': 'rgba(10, 24, 36, 0.75)',
        '--glass2': 'rgba(16, 32, 48, 0.85)',
        '--glass-border': 'rgba(64, 192, 240, 0.14)',
        '--glass-border-hi': 'rgba(64, 192, 240, 0.3)',
        '--hdr-bg': 'rgba(6, 16, 24, 0.8)',
        '--mesh-a': 'rgba(64, 192, 240, 0.16)',
        '--mesh-b': 'rgba(91, 138, 240, 0.08)',
        '--mesh-c': 'rgba(52, 211, 168, 0.05)',
      },
      meta: '#061018',
    },
    dawn: {
      label: 'Aube',
      icon: '🌅',
      vars: {
        '--bg': '#100c14',
        '--s1': '#18101c',
        '--s2': '#221828',
        '--s3': '#2c2034',
        '--s4': '#362840',
        '--t1': '#f8f0f4',
        '--t2': '#a89098',
        '--t3': '#685860',
        '--t4': '#403038',
        '--b1': 'rgba(240, 106, 176, 0.08)',
        '--b2': 'rgba(240, 176, 64, 0.16)',
        '--b3': 'rgba(240, 176, 64, 0.28)',
        '--glass': 'rgba(24, 16, 28, 0.75)',
        '--glass2': 'rgba(34, 24, 40, 0.85)',
        '--glass-border': 'rgba(240, 176, 64, 0.14)',
        '--glass-border-hi': 'rgba(240, 176, 64, 0.3)',
        '--hdr-bg': 'rgba(16, 12, 20, 0.8)',
        '--mesh-a': 'rgba(240, 106, 176, 0.1)',
        '--mesh-b': 'rgba(240, 176, 64, 0.08)',
        '--mesh-c': 'rgba(155, 138, 240, 0.06)',
      },
      meta: '#100c14',
    },
    paper: {
      label: 'Jour',
      icon: '☀',
      vars: {
        '--bg': '#f0f2f8',
        '--s1': '#ffffff',
        '--s2': '#e8ecf4',
        '--s3': '#dce2ee',
        '--s4': '#cfd6e4',
        '--t1': '#14182a',
        '--t2': '#4a5270',
        '--t3': '#7a8498',
        '--t4': '#a8b0c0',
        '--b1': 'rgba(91, 138, 240, 0.1)',
        '--b2': 'rgba(91, 138, 240, 0.18)',
        '--b3': 'rgba(91, 138, 240, 0.32)',
        '--glass': 'rgba(255, 255, 255, 0.82)',
        '--glass2': 'rgba(248, 250, 255, 0.92)',
        '--glass-border': 'rgba(91, 138, 240, 0.15)',
        '--glass-border-hi': 'rgba(91, 138, 240, 0.35)',
        '--hdr-bg': 'rgba(255, 255, 255, 0.88)',
        '--mesh-a': 'rgba(91, 138, 240, 0.08)',
        '--mesh-b': 'rgba(124, 108, 246, 0.05)',
        '--mesh-c': 'rgba(52, 211, 168, 0.04)',
      },
      meta: '#f0f2f8',
    },
    forest: {
      label: 'Forêt',
      icon: '🌲',
      vars: {
        '--bg': '#071008',
        '--s1': '#0c1810',
        '--s2': '#122018',
        '--s3': '#182c20',
        '--s4': '#1e3828',
        '--t1': '#e8f4ec',
        '--t2': '#7a9a82',
        '--t3': '#3d5c48',
        '--t4': '#243830',
        '--b1': 'rgba(72, 187, 120, 0.08)',
        '--b2': 'rgba(72, 187, 120, 0.16)',
        '--b3': 'rgba(72, 187, 120, 0.28)',
        '--glass': 'rgba(12, 24, 16, 0.78)',
        '--glass2': 'rgba(18, 32, 24, 0.88)',
        '--glass-border': 'rgba(72, 187, 120, 0.14)',
        '--glass-border-hi': 'rgba(72, 187, 120, 0.3)',
        '--hdr-bg': 'rgba(7, 16, 8, 0.82)',
        '--mesh-a': 'rgba(72, 187, 120, 0.14)',
        '--mesh-b': 'rgba(132, 164, 74, 0.08)',
        '--mesh-c': 'rgba(52, 211, 168, 0.05)',
      },
      meta: '#071008',
    },
    sunset: {
      label: 'Coucher',
      icon: '🔥',
      vars: {
        '--bg': '#140a06',
        '--s1': '#1e1008',
        '--s2': '#28180c',
        '--s3': '#342010',
        '--s4': '#402818',
        '--t1': '#faf0e8',
        '--t2': '#b89880',
        '--t3': '#786050',
        '--t4': '#483830',
        '--b1': 'rgba(255, 140, 66, 0.08)',
        '--b2': 'rgba(255, 107, 53, 0.16)',
        '--b3': 'rgba(255, 107, 53, 0.28)',
        '--glass': 'rgba(30, 16, 8, 0.78)',
        '--glass2': 'rgba(40, 24, 12, 0.88)',
        '--glass-border': 'rgba(255, 140, 66, 0.14)',
        '--glass-border-hi': 'rgba(255, 140, 66, 0.32)',
        '--hdr-bg': 'rgba(20, 10, 6, 0.82)',
        '--mesh-a': 'rgba(255, 107, 53, 0.16)',
        '--mesh-b': 'rgba(255, 180, 64, 0.1)',
        '--mesh-c': 'rgba(225, 29, 72, 0.06)',
      },
      meta: '#140a06',
    },
    lavender: {
      label: 'Lavande',
      icon: '💜',
      vars: {
        '--bg': '#0e0a18',
        '--s1': '#161024',
        '--s2': '#1e1830',
        '--s3': '#28203c',
        '--s4': '#322848',
        '--t1': '#f0ecfa',
        '--t2': '#a898c8',
        '--t3': '#685888',
        '--t4': '#403060',
        '--b1': 'rgba(167, 139, 250, 0.08)',
        '--b2': 'rgba(167, 139, 250, 0.16)',
        '--b3': 'rgba(167, 139, 250, 0.28)',
        '--glass': 'rgba(22, 16, 36, 0.78)',
        '--glass2': 'rgba(30, 24, 48, 0.88)',
        '--glass-border': 'rgba(167, 139, 250, 0.14)',
        '--glass-border-hi': 'rgba(167, 139, 250, 0.32)',
        '--hdr-bg': 'rgba(14, 10, 24, 0.82)',
        '--mesh-a': 'rgba(167, 139, 250, 0.14)',
        '--mesh-b': 'rgba(217, 70, 239, 0.08)',
        '--mesh-c': 'rgba(139, 92, 246, 0.06)',
      },
      meta: '#0e0a18',
    },
    wine: {
      label: 'Bordeaux',
      icon: '🍷',
      vars: {
        '--bg': '#100608',
        '--s1': '#1a0c10',
        '--s2': '#241218',
        '--s3': '#2e1820',
        '--s4': '#381e28',
        '--t1': '#f8ecee',
        '--t2': '#b89098',
        '--t3': '#785860',
        '--t4': '#483038',
        '--b1': 'rgba(190, 60, 90, 0.08)',
        '--b2': 'rgba(190, 60, 90, 0.16)',
        '--b3': 'rgba(190, 60, 90, 0.28)',
        '--glass': 'rgba(26, 12, 16, 0.78)',
        '--glass2': 'rgba(36, 18, 24, 0.88)',
        '--glass-border': 'rgba(190, 60, 90, 0.14)',
        '--glass-border-hi': 'rgba(190, 60, 90, 0.32)',
        '--hdr-bg': 'rgba(16, 6, 8, 0.84)',
        '--mesh-a': 'rgba(190, 60, 90, 0.14)',
        '--mesh-b': 'rgba(225, 29, 72, 0.08)',
        '--mesh-c': 'rgba(155, 89, 182, 0.05)',
      },
      meta: '#100608',
    },
    neon: {
      label: 'Néon',
      icon: '⚡',
      vars: {
        '--bg': '#06040e',
        '--s1': '#0c0818',
        '--s2': '#140c24',
        '--s3': '#1c1030',
        '--s4': '#24143c',
        '--t1': '#f0e8ff',
        '--t2': '#a088c8',
        '--t3': '#605080',
        '--t4': '#383050',
        '--b1': 'rgba(224, 64, 251, 0.08)',
        '--b2': 'rgba(224, 64, 251, 0.16)',
        '--b3': 'rgba(224, 64, 251, 0.28)',
        '--glass': 'rgba(12, 8, 24, 0.78)',
        '--glass2': 'rgba(20, 12, 36, 0.88)',
        '--glass-border': 'rgba(224, 64, 251, 0.16)',
        '--glass-border-hi': 'rgba(224, 64, 251, 0.36)',
        '--hdr-bg': 'rgba(6, 4, 14, 0.84)',
        '--mesh-a': 'rgba(224, 64, 251, 0.16)',
        '--mesh-b': 'rgba(34, 211, 238, 0.1)',
        '--mesh-c': 'rgba(255, 107, 157, 0.08)',
      },
      meta: '#06040e',
    },
    sand: {
      label: 'Sable',
      icon: '🏜',
      vars: {
        '--bg': '#f5ede0',
        '--s1': '#fffaf2',
        '--s2': '#ede4d4',
        '--s3': '#e0d4c0',
        '--s4': '#d4c8b0',
        '--t1': '#2a2018',
        '--t2': '#6a5848',
        '--t3': '#9a8878',
        '--t4': '#c0b0a0',
        '--b1': 'rgba(200, 124, 74, 0.12)',
        '--b2': 'rgba(200, 124, 74, 0.2)',
        '--b3': 'rgba(200, 124, 74, 0.34)',
        '--glass': 'rgba(255, 250, 242, 0.85)',
        '--glass2': 'rgba(248, 242, 232, 0.92)',
        '--glass-border': 'rgba(200, 124, 74, 0.2)',
        '--glass-border-hi': 'rgba(200, 124, 74, 0.38)',
        '--hdr-bg': 'rgba(255, 250, 242, 0.9)',
        '--mesh-a': 'rgba(255, 140, 66, 0.1)',
        '--mesh-b': 'rgba(232, 185, 35, 0.08)',
        '--mesh-c': 'rgba(200, 124, 74, 0.06)',
      },
      meta: '#f5ede0',
    },
    mint: {
      label: 'Menthe',
      icon: '🍃',
      vars: {
        '--bg': '#e8f8f0',
        '--s1': '#f4fff8',
        '--s2': '#dcf0e4',
        '--s3': '#c8e8d4',
        '--s4': '#b4dcc4',
        '--t1': '#102820',
        '--t2': '#406850',
        '--t3': '#689878',
        '--t4': '#98b8a4',
        '--b1': 'rgba(46, 204, 113, 0.12)',
        '--b2': 'rgba(46, 204, 113, 0.2)',
        '--b3': 'rgba(46, 204, 113, 0.34)',
        '--glass': 'rgba(244, 255, 248, 0.85)',
        '--glass2': 'rgba(236, 248, 240, 0.92)',
        '--glass-border': 'rgba(46, 204, 113, 0.2)',
        '--glass-border-hi': 'rgba(46, 204, 113, 0.38)',
        '--hdr-bg': 'rgba(244, 255, 248, 0.9)',
        '--mesh-a': 'rgba(46, 204, 113, 0.1)',
        '--mesh-b': 'rgba(52, 211, 168, 0.08)',
        '--mesh-c': 'rgba(132, 164, 74, 0.06)',
      },
      meta: '#e8f8f0',
    },
    coral: {
      label: 'Corail',
      icon: '🪸',
      vars: {
        '--bg': '#fff0ec',
        '--s1': '#fff8f6',
        '--s2': '#ffe4dc',
        '--s3': '#ffd4c8',
        '--s4': '#ffc4b4',
        '--t1': '#281810',
        '--t2': '#785048',
        '--t3': '#a87868',
        '--t4': '#d0a898',
        '--b1': 'rgba(255, 107, 107, 0.12)',
        '--b2': 'rgba(255, 107, 107, 0.2)',
        '--b3': 'rgba(255, 107, 107, 0.34)',
        '--glass': 'rgba(255, 248, 246, 0.85)',
        '--glass2': 'rgba(255, 240, 236, 0.92)',
        '--glass-border': 'rgba(255, 107, 107, 0.2)',
        '--glass-border-hi': 'rgba(255, 107, 107, 0.38)',
        '--hdr-bg': 'rgba(255, 248, 246, 0.9)',
        '--mesh-a': 'rgba(255, 107, 107, 0.1)',
        '--mesh-b': 'rgba(255, 140, 66, 0.08)',
        '--mesh-c': 'rgba(240, 106, 176, 0.06)',
      },
      meta: '#fff0ec',
    },
    slate: {
      label: 'Ardoise',
      icon: '🪨',
      vars: {
        '--bg': '#1a1c22',
        '--s1': '#22242c',
        '--s2': '#2a2e38',
        '--s3': '#343844',
        '--s4': '#3e4450',
        '--t1': '#eceef4',
        '--t2': '#989aa8',
        '--t3': '#686a78',
        '--t4': '#484a58',
        '--b1': 'rgba(152, 154, 168, 0.08)',
        '--b2': 'rgba(152, 154, 168, 0.16)',
        '--b3': 'rgba(152, 154, 168, 0.28)',
        '--glass': 'rgba(34, 36, 44, 0.78)',
        '--glass2': 'rgba(42, 46, 56, 0.88)',
        '--glass-border': 'rgba(152, 154, 168, 0.14)',
        '--glass-border-hi': 'rgba(152, 154, 168, 0.3)',
        '--hdr-bg': 'rgba(26, 28, 34, 0.84)',
        '--mesh-a': 'rgba(152, 154, 168, 0.1)',
        '--mesh-b': 'rgba(120, 122, 140, 0.06)',
        '--mesh-c': 'rgba(200, 124, 74, 0.04)',
      },
      meta: '#1a1c22',
    },
    arctic: {
      label: 'Arctique',
      icon: '❄',
      vars: {
        '--bg': '#e8f4fc',
        '--s1': '#f4faff',
        '--s2': '#dceef8',
        '--s3': '#c8e4f4',
        '--s4': '#b4d8ec',
        '--t1': '#102030',
        '--t2': '#406880',
        '--t3': '#6898b0',
        '--t4': '#98b8cc',
        '--b1': 'rgba(56, 189, 248, 0.12)',
        '--b2': 'rgba(56, 189, 248, 0.2)',
        '--b3': 'rgba(56, 189, 248, 0.34)',
        '--glass': 'rgba(244, 250, 255, 0.85)',
        '--glass2': 'rgba(236, 246, 252, 0.92)',
        '--glass-border': 'rgba(56, 189, 248, 0.2)',
        '--glass-border-hi': 'rgba(56, 189, 248, 0.38)',
        '--hdr-bg': 'rgba(244, 250, 255, 0.9)',
        '--mesh-a': 'rgba(56, 189, 248, 0.12)',
        '--mesh-b': 'rgba(34, 211, 238, 0.08)',
        '--mesh-c': 'rgba(167, 139, 250, 0.05)',
      },
      meta: '#e8f4fc',
    },
    honey: {
      label: 'Miel',
      icon: '🍯',
      vars: {
        '--bg': '#1a1408',
        '--s1': '#241c0c',
        '--s2': '#302410',
        '--s3': '#3c2e14',
        '--s4': '#483818',
        '--t1': '#faf4e8',
        '--t2': '#c8a870',
        '--t3': '#907848',
        '--t4': '#584828',
        '--b1': 'rgba(232, 185, 35, 0.08)',
        '--b2': 'rgba(232, 185, 35, 0.16)',
        '--b3': 'rgba(232, 185, 35, 0.28)',
        '--glass': 'rgba(36, 28, 12, 0.78)',
        '--glass2': 'rgba(48, 36, 16, 0.88)',
        '--glass-border': 'rgba(232, 185, 35, 0.14)',
        '--glass-border-hi': 'rgba(232, 185, 35, 0.32)',
        '--hdr-bg': 'rgba(26, 20, 8, 0.84)',
        '--mesh-a': 'rgba(232, 185, 35, 0.14)',
        '--mesh-b': 'rgba(255, 140, 66, 0.08)',
        '--mesh-c': 'rgba(200, 124, 74, 0.06)',
      },
      meta: '#1a1408',
    },
  };

  const ACCENTS = {
    coral: { label: 'Corail', vars: { '--acc': '#ff6b6b', '--acc2': '#ff8c66', '--acc-glow': 'rgba(255, 107, 107, 0.16)' }, swatch: '#ff6b6b' },
    orange: { label: 'Orange', vars: { '--acc': '#ff8c42', '--acc2': '#ffb347', '--acc-glow': 'rgba(255, 140, 66, 0.16)' }, swatch: '#ff8c42' },
    gold: { label: 'Or', vars: { '--acc': '#e8b923', '--acc2': '#f0c850', '--acc-glow': 'rgba(232, 185, 35, 0.16)' }, swatch: '#e8b923' },
    copper: { label: 'Cuivre', vars: { '--acc': '#c87c4a', '--acc2': '#e09860', '--acc-glow': 'rgba(200, 124, 74, 0.16)' }, swatch: '#c87c4a' },
    lime: { label: 'Citron', vars: { '--acc': '#a8e063', '--acc2': '#c8f070', '--acc-glow': 'rgba(168, 224, 99, 0.16)' }, swatch: '#a8e063' },
    emerald: { label: 'Émeraude', vars: { '--acc': '#2ecc71', '--acc2': '#48d88a', '--acc-glow': 'rgba(46, 204, 113, 0.16)' }, swatch: '#2ecc71' },
    teal: { label: 'Turquoise', vars: { '--acc': '#34d3a8', '--acc2': '#2eb8e8', '--acc-glow': 'rgba(52, 211, 168, 0.16)' }, swatch: '#34d3a8' },
    cyan: { label: 'Cyan', vars: { '--acc': '#22d3ee', '--acc2': '#38bdf8', '--acc-glow': 'rgba(34, 211, 238, 0.16)' }, swatch: '#22d3ee' },
    sky: { label: 'Ciel', vars: { '--acc': '#38bdf8', '--acc2': '#60c8fa', '--acc-glow': 'rgba(56, 189, 248, 0.16)' }, swatch: '#38bdf8' },
    blue: { label: 'Bleu', vars: { '--acc': '#5b8af0', '--acc2': '#7c6cf6', '--acc-glow': 'rgba(91, 138, 240, 0.16)' }, swatch: '#5b8af0' },
    indigo: { label: 'Indigo', vars: { '--acc': '#6366f1', '--acc2': '#818cf8', '--acc-glow': 'rgba(99, 102, 241, 0.16)' }, swatch: '#6366f1' },
    violet: { label: 'Violet', vars: { '--acc': '#8b6cf6', '--acc2': '#a78bfa', '--acc-glow': 'rgba(139, 108, 246, 0.16)' }, swatch: '#8b6cf6' },
    plum: { label: 'Prune', vars: { '--acc': '#9b59b6', '--acc2': '#b07cc8', '--acc-glow': 'rgba(155, 89, 182, 0.16)' }, swatch: '#9b59b6' },
    magenta: { label: 'Magenta', vars: { '--acc': '#e040fb', '--acc2': '#ea6cff', '--acc-glow': 'rgba(224, 64, 251, 0.16)' }, swatch: '#e040fb' },
    rose: { label: 'Rose', vars: { '--acc': '#f06ab0', '--acc2': '#e85a8a', '--acc-glow': 'rgba(240, 106, 176, 0.16)' }, swatch: '#f06ab0' },
    crimson: { label: 'Cramoisi', vars: { '--acc': '#e11d48', '--acc2': '#f43f5e', '--acc-glow': 'rgba(225, 29, 72, 0.16)' }, swatch: '#e11d48' },
    amber: { label: 'Ambre', vars: { '--acc': '#f0b040', '--acc2': '#f08040', '--acc-glow': 'rgba(240, 176, 64, 0.16)' }, swatch: '#f0b040' },
    olive: { label: 'Olive', vars: { '--acc': '#84a44a', '--acc2': '#9ab85a', '--acc-glow': 'rgba(132, 164, 74, 0.16)' }, swatch: '#84a44a' },
  };

  const FONT_SIZES = { compact: '14px', normal: '16px', large: '18px' };
  const DENSITY = { compact: '0.88', comfort: '1', spacious: '1.12' };
  const BOOL_KEYS = [
    'animations', 'glass', 'glow', 'grid', 'showTimer', 'confirmSkip', 'showProbaTags',
    'shuffleOptions', 'showExplanation', 'showErrorFiche', 'showReactLive', 'compactFeedback',
    'keyboardShortcuts', 'soundFeedback', 'vibrationFeedback', 'pauseOnBlur',
    'reduceMotion', 'largeTouch', 'highContrast',
    'saveProgress', 'saveReaction', 'saveBehavior', 'saveDetailedLog',
    'saveProbaSnapshots', 'privateSession', 'clearOnExit',
  ];
  const AUTO_ADVANCE_VALUES = new Set(['off', '2', '4']);
  const DEFAULT_Q_COUNT_VALUES = new Set(['20', '40', '64', '80', '0']);
  const FONT_VALUES = new Set(['outfit', 'system', 'mono']);

  const PRIVACY_KEYS = [
    'privateSession', 'saveProgress', 'saveReaction', 'saveBehavior',
    'saveDetailedLog', 'saveProbaSnapshots', 'clearOnExit', 'retention',
  ];

  /** 4 paramètres demandés à chaque ouverture de page. */
  const LAUNCH_CONSENT_KEYS = ['saveProgress', 'saveReaction', 'saveBehavior', 'saveDetailedLog'];

  const LAUNCH_CONSENT_LABELS = {
    saveProgress: ['Historique & progression', 'Scores, erreurs, révisions SM-2'],
    saveReaction: ['Temps de réaction', 'Mesures de rapidité par question'],
    saveBehavior: ['Comportement souris / tactile', 'Survols, hésitations, parcours'],
    saveDetailedLog: ['Journal détaillé', 'Réponses complètes pour Stats et fiches'],
  };

  const LIGHT_THEMES = new Set(['paper', 'sand', 'mint', 'coral', 'arctic']);

  const TABS = [
    { id: 'appearance', label: 'Apparence', icon: '🎨' },
    { id: 'quiz', label: 'Quiz', icon: '✈' },
    { id: 'a11y', label: 'Accessibilité', icon: '♿' },
    { id: 'privacy', label: 'Données', icon: '🔒' },
  ];

  const PRIVACY_PRESETS = {
    private: {
      label: 'Privé',
      icon: '🔒',
      desc: 'Aucune sauvegarde',
      patch: {
        privateSession: true,
        saveProgress: false,
        saveReaction: false,
        saveBehavior: false,
        saveDetailedLog: false,
        saveProbaSnapshots: false,
        clearOnExit: true,
        retention: 'session',
      },
    },
    balanced: {
      label: 'Équilibré',
      icon: '⚖️',
      desc: 'Progression sans comportement',
      patch: {
        privateSession: false,
        saveProgress: true,
        saveReaction: true,
        saveBehavior: false,
        saveDetailedLog: true,
        saveProbaSnapshots: false,
        clearOnExit: false,
        retention: '90d',
      },
    },
    full: {
      label: 'Complet',
      icon: '📊',
      desc: 'Toutes les stats locales',
      patch: {
        privateSession: false,
        saveProgress: true,
        saveReaction: true,
        saveBehavior: true,
        saveDetailedLog: true,
        saveProbaSnapshots: true,
        clearOnExit: false,
        retention: 'forever',
      },
    },
  };

  let current = { ...DEFAULTS };
  let panelOpen = false;
  let consentOpen = false;
  let consentReview = false;
  let consentLaunch = false;
  let uiMounted = false;
  let consentDraft = null;
  /** Consentement validé pour la page en cours uniquement. */
  let sessionConsentGranted = false;
  let activeTab = 'appearance';
  let themeFilter = 'all';

  function sanitize(raw) {
    const s = { ...DEFAULTS, ...(raw && typeof raw === 'object' ? raw : {}) };
    if (!THEMES[s.theme]) s.theme = DEFAULTS.theme;
    if (!ACCENTS[s.accent]) s.accent = DEFAULTS.accent;
    if (!FONT_SIZES[s.fontSize]) s.fontSize = DEFAULTS.fontSize;
    if (!Object.prototype.hasOwnProperty.call(DENSITY, s.density)) s.density = DEFAULTS.density;
    if (!FONT_VALUES.has(s.font)) s.font = DEFAULTS.font;
    if (!AUTO_ADVANCE_VALUES.has(String(s.autoAdvance))) s.autoAdvance = DEFAULTS.autoAdvance;
    if (!DEFAULT_Q_COUNT_VALUES.has(String(s.defaultQuestionCount))) {
      s.defaultQuestionCount = DEFAULTS.defaultQuestionCount;
    } else {
      s.defaultQuestionCount = String(s.defaultQuestionCount);
    }
    if (!Object.prototype.hasOwnProperty.call(RETENTION_DAYS, s.retention)) s.retention = DEFAULTS.retention;
    BOOL_KEYS.forEach((k) => { s[k] = !!s[k]; });
    if (s.privateSession) {
      s.saveProgress = false;
      s.saveReaction = false;
      s.saveBehavior = false;
      s.saveDetailedLog = false;
      s.saveProbaSnapshots = false;
      s.clearOnExit = true;
      if (s.retention !== 'session') s.retention = 'session';
    }
    return s;
  }

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return sanitize(DEFAULTS);
      return sanitize(JSON.parse(raw));
    } catch (e) {
      return sanitize(DEFAULTS);
    }
  }

  function get() {
    return { ...current };
  }

  function save(next) {
    const prevPrivate = current.privateSession;
    const patch = next && typeof next === 'object' ? next : {};
    current = sanitize({ ...current, ...patch });

    if (prevPrivate && patch.privateSession === false) {
      current.clearOnExit = false;
      if (current.retention === 'session') current.retention = 'forever';
    }

    if (current.privateSession) {
      current.saveProgress = false;
      current.saveReaction = false;
      current.saveBehavior = false;
      current.saveDetailedLog = false;
      current.saveProbaSnapshots = false;
      current.clearOnExit = true;
    }

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
    } catch (e) { /* ignore */ }
    apply(current);
    updatePanelControls();
    if ('retention' in patch) purgeRetention();
    try {
      window.dispatchEvent(new CustomEvent('ppl-settings-changed', { detail: { ...current } }));
    } catch (e) { /* ignore */ }
  }

  function hasPrivacyConsent() {
    if (typeof global.__PPL_SETTINGS_TEST__ === 'object') {
      return current.privacyConsentAt != null && current.privacyConsentAt !== '';
    }
    if (sessionConsentGranted) return true;
    if (global.PPLSessionGate && global.PPLSessionGate.shouldSkipLaunchConsent()) {
      sessionConsentGranted = true;
      return true;
    }
    return false;
  }

  function pickPrivacyState(src) {
    return {
      privateSession: !!src.privateSession,
      saveProgress: !!src.saveProgress,
      saveReaction: !!src.saveReaction,
      saveBehavior: !!src.saveBehavior,
      saveDetailedLog: !!src.saveDetailedLog,
      saveProbaSnapshots: !!src.saveProbaSnapshots,
      clearOnExit: !!src.clearOnExit,
      retention: src.retention || 'session',
    };
  }

  function canPersist(type) {
    if (!hasPrivacyConsent()) return false;
    const s = current;
    if (s.privateSession) return false;
    const map = {
      progress: s.saveProgress,
      reaction: s.saveReaction,
      behavior: s.saveBehavior,
      detailed: s.saveDetailedLog,
      proba: s.saveProbaSnapshots,
      diversity: s.saveProgress,
      fiches: s.saveDetailedLog,
    };
    return map[type] !== false;
  }

  function getDataSize() {
    let bytes = 0;
    let keys = 0;
    DATA_KEYS.forEach((k) => {
      try {
        const v = localStorage.getItem(k);
        if (v) { bytes += v.length * 2; keys += 1; }
      } catch (e) { /* ignore */ }
    });
    try {
      const settings = localStorage.getItem(STORAGE_KEY);
      if (settings) bytes += settings.length * 2;
    } catch (e) { /* ignore */ }
    if (bytes < 1024) return { bytes, keys, label: bytes + ' o' };
    if (bytes < 1024 * 1024) return { bytes, keys, label: (bytes / 1024).toFixed(1) + ' Ko' };
    return { bytes, keys, label: (bytes / (1024 * 1024)).toFixed(2) + ' Mo' };
  }

  function wipeAllPplStorage(opts) {
    const keepSettings = opts?.keepSettings === true;
    const keepAuth = opts?.keepAuth === true;
    if (global.PPLStorage && typeof global.PPLStorage.flushNow === 'function') {
      global.PPLStorage.flushNow();
    }
    try {
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const k = localStorage.key(i);
        if (!k || !k.startsWith('ppl4')) continue;
        if (keepSettings && k === STORAGE_KEY) continue;
        if (keepAuth && k === 'ppl4gate') continue;
        try { localStorage.removeItem(k); } catch (e) { /* ignore */ }
        if (global.PPLStorage && typeof global.PPLStorage.remove === 'function') {
          global.PPLStorage.remove(k);
        }
      }
    } catch (e) { /* ignore */ }
    try {
      for (let i = sessionStorage.length - 1; i >= 0; i--) {
        const k = sessionStorage.key(i);
        if (k && k.startsWith('ppl4')) {
          try { sessionStorage.removeItem(k); } catch (e) { /* ignore */ }
        }
      }
    } catch (e) { /* ignore */ }
  }

  function eraseUserData(opts) {
    const keepSettings = opts?.keepSettings !== false;
    wipeAllPplStorage({ keepSettings, keepAuth: true });
    if (!keepSettings) {
      current = sanitize(DEFAULTS);
      apply(current);
    }
    try {
      window.dispatchEvent(new CustomEvent('ppl-data-erased', { detail: { keepSettings, full: false } }));
    } catch (e) { /* ignore */ }
  }

  function factoryReset(opts) {
    wipeAllPplStorage({ keepSettings: false, keepAuth: false });
    if (global.PPLSessionGate && global.PPLSessionGate.clearSession) {
      global.PPLSessionGate.clearSession();
    }
    current = sanitize(DEFAULTS);
    try { localStorage.removeItem(STORAGE_KEY); } catch (e) { /* ignore */ }
    apply(current);
    try {
      window.dispatchEvent(new CustomEvent('ppl-data-erased', { detail: { keepSettings: false, full: true } }));
      window.dispatchEvent(new CustomEvent('ppl-full-reset', { detail: {} }));
    } catch (e) { /* ignore */ }
    if (opts?.reload !== false) {
      location.reload();
    }
  }

  function exportUserData() {
    const payload = {
      exportedAt: new Date().toISOString(),
      app: 'PPL Quiz',
      version: 1,
      data: {},
    };
    DATA_KEYS.forEach((k) => {
      try {
        const raw = localStorage.getItem(k);
        if (raw) payload.data[k] = JSON.parse(raw);
      } catch (e) {
        payload.data[k] = localStorage.getItem(k);
      }
    });
    try {
      payload.settings = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    } catch (e) { /* ignore */ }
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ppl-quiz-export-' + new Date().toISOString().slice(0, 10) + '.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 500);
  }

  function purgeRetention() {
    const days = RETENTION_DAYS[current.retention];
    if (days == null) return;
    const cutoff = Date.now() - days * 86400000;
    ['ppl4answers', 'ppl4react', 'ppl4proba'].forEach((key) => {
      try {
        const raw = localStorage.getItem(key);
        if (!raw) return;
        const obj = JSON.parse(raw);
        if (key === 'ppl4answers' && Array.isArray(obj.items)) {
          obj.items = obj.items.filter((it) => (it.t || 0) >= cutoff);
          localStorage.setItem(key, JSON.stringify(obj));
        } else if (key === 'ppl4react' && Array.isArray(obj.history)) {
          obj.history = obj.history.filter((it) => (it.t || 0) >= cutoff);
          localStorage.setItem(key, JSON.stringify(obj));
        } else if (key === 'ppl4proba' && Array.isArray(obj.snapshots)) {
          obj.snapshots = obj.snapshots.filter((it) => (it.t || 0) >= cutoff);
          localStorage.setItem(key, JSON.stringify(obj));
        }
      } catch (e) { /* ignore */ }
    });
  }

  let clearOnExitBound = false;

  function setupClearOnExit() {
    if (clearOnExitBound) return;
    clearOnExitBound = true;
    window.addEventListener('pagehide', () => {
      if (current.clearOnExit || current.privateSession || current.retention === 'session') {
        eraseUserData({ keepSettings: true });
      }
    });
  }

  function apply(s) {
    current = sanitize(s);
    const root = document.documentElement;
    const theme = THEMES[current.theme] || THEMES.midnight;
    const accent = ACCENTS[current.accent] || ACCENTS.blue;

    Object.entries(theme.vars).forEach(([k, v]) => root.style.setProperty(k, v));
    Object.entries(accent.vars).forEach(([k, v]) => root.style.setProperty(k, v));

    root.style.setProperty('--ui-font-size', FONT_SIZES[current.fontSize] || FONT_SIZES.normal);
    root.style.setProperty('--ui-density', DENSITY[current.density] || DENSITY.comfort);
    root.style.fontSize = FONT_SIZES[current.fontSize] || FONT_SIZES.normal;

    root.dataset.theme = current.theme;
    root.dataset.accent = current.accent;
    root.dataset.fontSize = current.fontSize;
    root.dataset.density = current.density;
    root.dataset.font = current.font;
    root.dataset.anim = (current.animations && !current.reduceMotion) ? 'on' : 'off';
    root.dataset.glass = current.glass ? 'on' : 'off';
    root.dataset.glow = current.glow ? 'on' : 'off';
    root.dataset.grid = current.grid ? 'on' : 'off';
    root.dataset.showTimer = current.showTimer ? 'on' : 'off';
    root.dataset.showProba = current.showProbaTags ? 'on' : 'off';
    root.dataset.showExplanation = current.showExplanation ? 'on' : 'off';
    root.dataset.showErrorFiche = current.showErrorFiche ? 'on' : 'off';
    root.dataset.showReactLive = current.showReactLive ? 'on' : 'off';
    root.dataset.compactFeedback = current.compactFeedback ? 'on' : 'off';
    root.dataset.largeTouch = current.largeTouch ? 'on' : 'off';
    root.dataset.highContrast = current.highContrast ? 'on' : 'off';
    root.dataset.private = current.privateSession ? 'on' : 'off';
    root.dataset.consent = hasPrivacyConsent() ? 'on' : 'off';

    if (current.font === 'system') {
      root.style.setProperty('--font-display', "system-ui, -apple-system, 'Segoe UI', sans-serif");
    } else if (current.font === 'mono') {
      root.style.setProperty('--font-display', "var(--font-mono)");
    } else {
      root.style.removeProperty('--font-display');
    }

    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta && theme.meta) meta.setAttribute('content', theme.meta);
    if (document.body) syncDecorations();
  }

  function syncDecorations() {
    if (!document.body) return;
    document.querySelectorAll('.grid-overlay, .glows, .noise').forEach((el) => el.remove());
    if (!current.glow && !current.grid) return;
    let html = '';
    if (current.grid) html += '<div class="grid-overlay" aria-hidden="true"></div>';
    if (current.glow) {
      html += '<div class="glows" aria-hidden="true"><div class="g1"></div><div class="g2"></div></div>';
    }
    html += '<div class="noise" aria-hidden="true"></div>';
    document.body.insertAdjacentHTML('afterbegin', html);
  }

  function esc(s) {
    return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function themeCard(id, t) {
    const ma = t.vars['--mesh-a'] || 'transparent';
    const mb = t.vars['--mesh-b'] || 'transparent';
    const mc = t.vars['--mesh-c'] || 'transparent';
    const bg = t.vars['--bg'] || '#080b12';
    return `<button type="button" class="set-theme-card${current.theme === id ? ' on' : ''}" data-set-theme="${id}" style="--prev-bg:${bg};--prev-a:${ma};--prev-b:${mb};--prev-c:${mc}">
      <span class="set-theme-preview" aria-hidden="true"></span>
      <span class="set-theme-label">${esc(t.icon)} ${esc(t.label)}</span>
    </button>`;
  }

  function accentBtn(id, a) {
    return `<button type="button" class="set-accent-dot${current.accent === id ? ' on' : ''}" data-set-accent="${id}" style="--sw:${a.swatch}" title="${esc(a.label)}" aria-label="${esc(a.label)}"></button>`;
  }

  function chipGroup(name, options, currentVal) {
    const attr = name.replace(/([A-Z])/g, '-$1').toLowerCase();
    return Object.entries(options).map(([id, label]) =>
      `<button type="button" class="set-chip${currentVal === id ? ' on' : ''}" data-set-${attr}="${id}">${esc(label)}</button>`
    ).join('');
  }

  function filterThemes() {
    return Object.entries(THEMES).filter(([id]) => {
      if (themeFilter === 'dark') return !LIGHT_THEMES.has(id);
      if (themeFilter === 'light') return LIGHT_THEMES.has(id);
      return true;
    });
  }

  function filteredThemeCards() {
    return filterThemes().map(([id, t]) => themeCard(id, t)).join('');
  }

  function tabsHTML() {
    return TABS.map((tab) =>
      `<button type="button" class="set-tab${activeTab === tab.id ? ' on' : ''}" data-set-tab="${tab.id}" aria-selected="${activeTab === tab.id}">`
      + `<span class="set-tab-ico" aria-hidden="true">${tab.icon}</span>`
      + `<span class="set-tab-lbl">${esc(tab.label)}</span></button>`
    ).join('');
  }

  function panelStatusHTML() {
    const theme = THEMES[current.theme] || THEMES.midnight;
    const accent = ACCENTS[current.accent] || ACCENTS.blue;
    const priv = current.privateSession
      ? '<span class="set-status-badge set-status-badge--warn">Mode privé</span>'
      : (hasPrivacyConsent()
        ? '<span class="set-status-badge set-status-badge--ok">Données actives</span>'
        : '<span class="set-status-badge">Consentement en attente</span>');
    return `<div class="set-status-row">
      <span class="set-status-theme">${esc(theme.icon)} ${esc(theme.label)}</span>
      <span class="set-status-accent" style="--sw:${accent.swatch}" title="${esc(accent.label)}"></span>
      ${priv}
    </div>`;
  }

  function privacyPresetsHTML(draft, attrPrefix) {
    const src = draft || current;
    const dataAttr = attrPrefix || 'data-privacy-preset';
    return `<div class="set-presets">
      ${Object.entries(PRIVACY_PRESETS).map(([id, p]) => {
        const active = Object.entries(p.patch).every(([k, v]) => src[k] === v);
        return `<button type="button" class="set-preset${active ? ' on' : ''}" ${dataAttr}="${id}">
          <span class="set-preset-ico">${p.icon}</span>
          <span class="set-preset-body">
            <strong>${esc(p.label)}</strong>
            <span>${esc(p.desc)}</span>
          </span>
        </button>`;
      }).join('')}
    </div>`;
  }

  function applyPrivacyPatch(patch, target) {
    const next = { ...(target || current), ...patch };
    if (next.privateSession) {
      next.saveProgress = false;
      next.saveReaction = false;
      next.saveBehavior = false;
      next.saveDetailedLog = false;
      next.saveProbaSnapshots = false;
      next.clearOnExit = true;
    }
    return next;
  }

  function updatePanelHeaderStatus() {
    const slot = document.getElementById('set-status-slot');
    if (slot) slot.innerHTML = panelStatusHTML();
  }

  function updatePanelControls() {
    const overlay = document.getElementById('set-overlay');
    if (!overlay) return;

    overlay.querySelectorAll('[data-set-theme]').forEach((btn) => {
      btn.classList.toggle('on', btn.dataset.setTheme === current.theme);
    });
    overlay.querySelectorAll('[data-set-accent]').forEach((btn) => {
      btn.classList.toggle('on', btn.dataset.setAccent === current.accent);
    });
    overlay.querySelectorAll('[data-set-font-size]').forEach((btn) => {
      btn.classList.toggle('on', btn.dataset.setFontSize === current.fontSize);
    });
    overlay.querySelectorAll('[data-set-font]').forEach((btn) => {
      btn.classList.toggle('on', btn.dataset.setFont === current.font);
    });
    overlay.querySelectorAll('[data-set-density]').forEach((btn) => {
      btn.classList.toggle('on', btn.dataset.setDensity === current.density);
    });
    overlay.querySelectorAll('[data-set-retention]').forEach((btn) => {
      btn.classList.toggle('on', btn.dataset.setRetention === current.retention);
      const isSession = btn.dataset.setRetention === 'session';
      const disabled = current.privateSession && !isSession;
      btn.disabled = disabled;
      btn.classList.toggle('set-chip--disabled', disabled);
      btn.setAttribute('aria-disabled', disabled ? 'true' : 'false');
    });
    overlay.querySelectorAll('[data-set-auto-advance]').forEach((btn) => {
      btn.classList.toggle('on', btn.dataset.setAutoAdvance === String(current.autoAdvance));
    });
    overlay.querySelectorAll('[data-set-default-question-count]').forEach((btn) => {
      btn.classList.toggle('on', btn.dataset.setDefaultQuestionCount === String(current.defaultQuestionCount));
    });
    overlay.querySelectorAll('[data-set-toggle]').forEach((input) => {
      const key = input.dataset.setToggle;
      input.checked = !!current[key];
      const isPrivacy = PRIVACY_KEYS.includes(key);
      const disabled = isPrivacy && current.privateSession && key !== 'privateSession';
      input.disabled = disabled;
      input.setAttribute('aria-checked', input.checked ? 'true' : 'false');
      const row = input.closest('.set-toggle-row');
      if (row) {
        row.classList.toggle('set-toggle-row--off', disabled);
        row.classList.toggle('set-toggle-row--on', !!current[key] && !disabled);
      }
    });
    overlay.querySelectorAll('[data-set-theme-filter]').forEach((btn) => {
      btn.classList.toggle('on', btn.dataset.setThemeFilter === themeFilter);
    });
    overlay.querySelectorAll('[data-privacy-preset]').forEach((btn) => {
      const preset = PRIVACY_PRESETS[btn.dataset.privacyPreset];
      const active = preset && Object.entries(preset.patch).every(([k, v]) => current[k] === v);
      btn.classList.toggle('on', active);
    });
    const sizeLabel = overlay.querySelector('[data-set-size-label]');
    const sizeKeys = overlay.querySelector('[data-set-size-keys]');
    if (sizeLabel || sizeKeys) {
      const sz = getDataSize();
      if (sizeLabel) sizeLabel.textContent = sz.label;
      if (sizeKeys) sizeKeys.textContent = String(sz.keys);
    }
    updatePanelHeaderStatus();
  }

  function switchTab(tabId) {
    activeTab = tabId;
    const overlay = document.getElementById('set-overlay');
    if (!overlay) return;
    overlay.querySelectorAll('[data-set-tab]').forEach((btn) => {
      const on = btn.dataset.setTab === tabId;
      btn.classList.toggle('on', on);
      btn.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    overlay.querySelectorAll('[data-set-panel]').forEach((panel) => {
      panel.hidden = panel.dataset.setPanel !== tabId;
    });
  }

  function refreshThemeGrid() {
    const slot = document.getElementById('set-theme-grid-slot');
    if (slot) slot.innerHTML = filteredThemeCards();
    updatePanelControls();
  }

  function toggleRow(key, label, desc) {
    const on = current[key];
    return `<label class="set-toggle-row">
      <span class="set-toggle-text"><strong>${esc(label)}</strong><span>${esc(desc)}</span></span>
      <input type="checkbox" class="set-toggle" data-set-toggle="${key}"${on ? ' checked' : ''}>
      <span class="set-toggle-track" aria-hidden="true"></span>
    </label>`;
  }

  function dataSizeHTML() {
    const sz = getDataSize();
    return `<div class="set-privacy-note" data-set-data-size>
      <strong>🔒 Données locales uniquement</strong>
      <p>Tout reste sur cet appareil (localStorage). Aucun envoi vers un serveur. Taille actuelle : <em data-set-size-label>${esc(sz.label)}</em> · <span data-set-size-keys>${sz.keys}</span> jeu${sz.keys > 1 ? 'x' : ''} de données.</p>
    </div>`;
  }

  function consentToggleRow(key, label, desc, draft) {
    const disabled = draft.privateSession && key !== 'privateSession';
    const on = !!draft[key];
    return `<label class="set-toggle-row${disabled ? ' set-toggle-row--off' : ''}">
      <span class="set-toggle-text"><strong>${esc(label)}</strong><span>${esc(desc)}</span></span>
      <input type="checkbox" class="set-toggle" data-consent-toggle="${key}"${on ? ' checked' : ''}${disabled ? ' disabled' : ''}>
      <span class="set-toggle-track" aria-hidden="true"></span>
    </label>`;
  }

  function consentHTML(draft, review, launch) {
    const toggleKeys = launch && !review ? LAUNCH_CONSENT_KEYS : [
      'privateSession', 'saveProgress', 'saveReaction', 'saveBehavior',
      'saveDetailedLog', 'saveProbaSnapshots', 'clearOnExit',
    ];
    const togglesHtml = toggleKeys.map((key) => {
      const meta = LAUNCH_CONSENT_LABELS[key];
      if (meta) return consentToggleRow(key, meta[0], meta[1], draft);
      if (key === 'privateSession') {
        return consentToggleRow('privateSession', 'Mode privé', 'Aucune sauvegarde — session éphémère uniquement', draft);
      }
      if (key === 'saveProbaSnapshots') {
        return consentToggleRow('saveProbaSnapshots', 'Snapshots P(examen)', 'Historique de probabilité d\'examen', draft);
      }
      if (key === 'clearOnExit') {
        return consentToggleRow('clearOnExit', 'Effacer à la fermeture', 'Supprime les données à la fermeture de l\'onglet', draft);
      }
      return '';
    }).join('');

    return `<div class="set-consent-overlay${launch && !review ? ' set-consent-overlay--launch' : ''}" id="set-consent-overlay" role="presentation">
      <div class="set-consent-card" id="set-consent-card" role="dialog" aria-labelledby="set-consent-title" aria-modal="true" tabindex="-1">
        <header class="set-consent-hd">
          <h2 id="set-consent-title">${review ? 'Confidentialité & données' : (launch ? 'Confidentialité — cette visite' : 'Bienvenue — vos données')}</h2>
          <p class="set-consent-lead">${review
    ? 'Modifiez vos autorisations. Rien n\'est envoyé sur internet : tout reste sur cet appareil.'
    : (launch
      ? '<strong>À chaque rechargement</strong>, confirmez les 4 paramètres ci-dessous. Rien n\'est envoyé sur Internet.'
      : 'Avant de commencer, choisissez ce que l\'application peut enregistrer <strong>localement</strong> sur cet appareil. Vous pouvez <strong>tout refuser</strong> et utiliser le quiz sans aucune sauvegarde.')}</p>
        </header>
        <div class="set-consent-body">
          <div class="set-privacy-note set-consent-note">
            <strong>🔒 100 % local · aucun serveur</strong>
            <p>Scores, réactions, journal de réponses et fiches d'erreur ne quittent jamais votre navigateur. Vous pouvez modifier ou effacer ces choix à tout moment dans Paramètres.</p>
          </div>
          <p class="set-chip-label">Choisissez un profil ou personnalisez</p>
          ${privacyPresetsHTML(draft, launch && !review ? 'data-launch-preset' : 'data-consent-preset')}
          <div class="set-toggles set-consent-toggles">
            ${togglesHtml}
          </div>
          <p class="set-chip-label">Conservation des données</p>
          <div class="set-chip-row set-consent-retention">${chipGroup('retention', { forever: 'Toujours', '90d': '90 jours', '30d': '30 jours', session: 'Session' }, draft.retention)}</div>
        </div>
        <footer class="set-consent-ft">
          <button type="button" class="set-consent-btn set-consent-btn--ghost" data-consent-decline>Tout refuser</button>
          <button type="button" class="set-consent-btn set-consent-btn--ghost" data-consent-accept>Tout accepter</button>
          <button type="button" class="set-consent-btn set-consent-btn--primary" data-consent-save>Valider mes choix</button>
          ${review ? '<button type="button" class="set-consent-btn set-consent-btn--link" data-consent-cancel>Annuler</button>' : ''}
        </footer>
      </div>
    </div>`;
  }

  function syncConsentUI() {
    const overlay = document.getElementById('set-consent-overlay');
    if (!overlay || !consentDraft) return;
    const parent = overlay.parentNode;
    const review = consentReview;
    const launch = consentLaunch;
    overlay.remove();
    parent.insertAdjacentHTML('beforeend', consentHTML(consentDraft, review, launch));
    bindConsentEvents();
    const card = document.getElementById('set-consent-card');
    if (card) card.focus();
  }

  function finishConsent(patch) {
    sessionConsentGranted = true;
    if (global.PPLSessionGate && global.PPLSessionGate.markConsent) {
      global.PPLSessionGate.markConsent();
    }
    save({ ...patch, privacyConsentAt: Date.now() });

    function complete() {
      closeConsentGate();
      if (!uiMounted) {
        mountUI();
        uiMounted = true;
      }
      purgeRetention();
      document.documentElement.classList.add('ppl-app-reveal');
      try {
        window.dispatchEvent(new CustomEvent('ppl-privacy-consent', { detail: { ...current } }));
      } catch (e) { /* ignore */ }
    }

    if (consentLaunch && !consentReview && global.PPLEntrySplash && global.PPLEntrySplash.play) {
      global.PPLEntrySplash.play({ type: 'consent', detail: patch }).then(complete);
    } else {
      complete();
    }
  }

  function closeConsentGate() {
    const overlay = document.getElementById('set-consent-overlay');
    if (overlay) overlay.remove();
    consentOpen = false;
    consentReview = false;
    consentLaunch = false;
    consentDraft = null;
    document.body.classList.remove('set-consent-open');
  }

  function bindPresetButtons(selector) {
    const overlay = document.getElementById('set-consent-overlay');
    if (!overlay || !consentDraft) return;
    overlay.querySelectorAll(selector).forEach((btn) => {
      const id = btn.dataset.consentPreset || btn.dataset.launchPreset;
      const preset = PRIVACY_PRESETS[id];
      if (!preset) return;
      btn.addEventListener('click', () => {
        consentDraft = applyPrivacyPatch(preset.patch, consentDraft);
        syncConsentUI();
      });
    });
  }

  function bindConsentEvents() {
    const overlay = document.getElementById('set-consent-overlay');
    if (!overlay || !consentDraft) return;
    if (!keydownBound) bindKeydown();

    overlay.querySelectorAll('[data-consent-preset]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const preset = PRIVACY_PRESETS[btn.dataset.consentPreset];
        if (preset) {
          consentDraft = applyPrivacyPatch(preset.patch, consentDraft);
          syncConsentUI();
        }
      });
    });

    bindPresetButtons('[data-launch-preset]');

    overlay.querySelectorAll('[data-consent-toggle]').forEach((input) => {
      input.addEventListener('change', () => {
        const key = input.dataset.consentToggle;
        if (key === 'privateSession') {
          if (input.checked) {
            consentDraft = applyPrivacyPatch(PRIVACY_PRESETS.private.patch, consentDraft);
          } else {
            consentDraft.privateSession = false;
            consentDraft.clearOnExit = false;
            if (consentDraft.retention === 'session') consentDraft.retention = 'forever';
          }
        } else {
          consentDraft[key] = input.checked;
        }
        syncConsentUI();
      });
    });

    overlay.querySelectorAll('[data-set-retention]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const val = btn.dataset.setRetention;
        if (val === 'session') {
          consentDraft = applyPrivacyPatch(PRIVACY_PRESETS.private.patch, consentDraft);
        } else {
          consentDraft.retention = val;
          if (consentDraft.privateSession) {
            consentDraft.privateSession = false;
            consentDraft.clearOnExit = false;
          }
        }
        syncConsentUI();
      });
    });

    const decline = overlay.querySelector('[data-consent-decline]');
    if (decline) {
      decline.addEventListener('click', () => {
        finishConsent({ ...PRIVACY_PRESETS.private.patch });
      });
    }

    const accept = overlay.querySelector('[data-consent-accept]');
    if (accept) {
      accept.addEventListener('click', () => {
        finishConsent({ ...PRIVACY_PRESETS.full.patch });
      });
    }

    const saveBtn = overlay.querySelector('[data-consent-save]');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        finishConsent({ ...consentDraft });
      });
    }

    const cancel = overlay.querySelector('[data-consent-cancel]');
    if (cancel) cancel.addEventListener('click', closeConsentGate);
  }

  function mountConsentGate(opts) {
    if (document.getElementById('set-consent-overlay')) return;
    consentReview = !!opts?.review;
    consentLaunch = !!opts?.launch;
    consentDraft = pickPrivacyState(current);
    document.body.insertAdjacentHTML('beforeend', consentHTML(consentDraft, consentReview, consentLaunch));
    document.body.classList.add('set-consent-open');
    consentOpen = true;
    bindConsentEvents();
    const card = document.getElementById('set-consent-card');
    if (card) card.focus();
  }

  function openLaunchConsent() {
    sessionConsentGranted = false;
    mountConsentGate({ launch: true });
  }

  function waitForAuthThenLaunchConsent() {
    function show() {
      if (sessionConsentGranted || document.getElementById('set-consent-overlay')) return;
      openLaunchConsent();
    }
    if (global.PPLAuth && global.PPLAuth.isAuthed && global.PPLAuth.isAuthed()) {
      show();
      return;
    }
    global.addEventListener('ppl-auth-success', show, { once: true });
    global.addEventListener('ppl-auth-ready', () => {
      if (global.PPLAuth && global.PPLAuth.isAuthed && global.PPLAuth.isAuthed()) show();
    }, { once: true });
  }

  function openPrivacyConsent() {
    close();
    mountConsentGate({ review: true });
  }

  function panelHTML() {
    const sz = getDataSize();
    return `<div class="set-overlay" id="set-overlay" hidden>
      <div class="set-backdrop" data-set-close></div>
      <aside class="set-panel" id="set-panel" role="dialog" aria-labelledby="set-title" aria-modal="true" tabindex="-1">
        <header class="set-panel-hd">
          <div class="set-panel-hd-main">
            <h2 id="set-title">Paramètres</h2>
            <p class="set-panel-sub">Personnalisez l'apparence, le quiz et vos données</p>
            <div id="set-status-slot">${panelStatusHTML()}</div>
          </div>
          <button type="button" class="set-close" data-set-close aria-label="Fermer">✕</button>
        </header>
        <nav class="set-tabs" role="tablist" aria-label="Sections des paramètres">${tabsHTML()}</nav>
        <div class="set-panel-body">
          <div class="set-tab-panel" data-set-panel="appearance"${activeTab !== 'appearance' ? ' hidden' : ''}>
            <section class="set-section">
              <div class="set-section-hd">
                <h3>Thème <span class="set-count">${Object.keys(THEMES).length}</span></h3>
                <p class="set-section-desc">Ambiance visuelle de l'application</p>
              </div>
              <div class="set-chip-row set-theme-filters">
                <button type="button" class="set-chip${themeFilter === 'all' ? ' on' : ''}" data-set-theme-filter="all">Tous</button>
                <button type="button" class="set-chip${themeFilter === 'dark' ? ' on' : ''}" data-set-theme-filter="dark">🌙 Sombre</button>
                <button type="button" class="set-chip${themeFilter === 'light' ? ' on' : ''}" data-set-theme-filter="light">☀ Clair</button>
              </div>
              <div class="set-theme-grid" id="set-theme-grid-slot">${filteredThemeCards()}</div>
            </section>
            <section class="set-section">
              <div class="set-section-hd">
                <h3>Couleur d'accent <span class="set-count">${Object.keys(ACCENTS).length}</span></h3>
                <p class="set-section-desc">Boutons, liens et surbrillances</p>
              </div>
              <div class="set-accent-row">${Object.entries(ACCENTS).map(([id, a]) => accentBtn(id, a)).join('')}</div>
            </section>
            <section class="set-section">
              <div class="set-section-hd">
                <h3>Typographie</h3>
                <p class="set-section-desc">Taille du texte et police d'affichage</p>
              </div>
              <p class="set-chip-label">Taille</p>
              <div class="set-chip-row">${chipGroup('fontSize', { compact: 'Compact', normal: 'Normal', large: 'Grand' }, current.fontSize)}</div>
              <p class="set-chip-label">Police</p>
              <div class="set-chip-row">${chipGroup('font', { outfit: 'Outfit', system: 'Système', mono: 'Mono' }, current.font)}</div>
            </section>
            <section class="set-section">
              <div class="set-section-hd">
                <h3>Mise en page</h3>
                <p class="set-section-desc">Espacement entre les éléments</p>
              </div>
              <div class="set-chip-row">${chipGroup('density', { compact: 'Serré', comfort: 'Confort', spacious: 'Aéré' }, current.density)}</div>
            </section>
            <section class="set-section">
              <div class="set-section-hd">
                <h3>Effets visuels</h3>
                <p class="set-section-desc">Personnalisez l'ambiance sans impacter le quiz</p>
              </div>
              <div class="set-toggles">
                ${toggleRow('animations', 'Animations', 'Transitions et micro-mouvements')}
                ${toggleRow('glass', 'Verre dépoli', 'Flou sur en-tête et cartes')}
                ${toggleRow('glow', 'Lueurs', 'Halos de couleur en arrière-plan')}
                ${toggleRow('grid', 'Grille', 'Motif discret sur le fond')}
              </div>
            </section>
          </div>
          <div class="set-tab-panel" data-set-panel="quiz"${activeTab !== 'quiz' ? ' hidden' : ''}>
            <section class="set-section">
              <div class="set-section-hd">
                <h3>Comportement du quiz</h3>
                <p class="set-section-desc">Affichage et déroulement des questions</p>
              </div>
              <div class="set-toggles">
                ${toggleRow('showTimer', 'Chronomètre', 'Afficher le temps écoulé par question')}
                ${toggleRow('showReactLive', 'Indicateur réaction', 'Jauge temps réel pendant la lecture')}
                ${toggleRow('confirmSkip', 'Confirmer « Passer »', 'Éviter les passages accidentels')}
                ${toggleRow('showProbaTags', 'Badges probabilité', 'Réaction, thème et P(examen) après chaque réponse')}
                ${toggleRow('shuffleOptions', 'Mélanger les options', 'Ordre aléatoire des réponses A–D à chaque question')}
                ${toggleRow('pauseOnBlur', 'Pause si onglet masqué', 'Met en pause quand tu changes d\'onglet ou d\'app')}
              </div>
              <p class="set-chip-label">Passage automatique après réponse</p>
              <div class="set-chip-row">${chipGroup('autoAdvance', { off: 'Désactivé', '2': '2 secondes', '4': '4 secondes' }, current.autoAdvance)}</div>
              <p class="set-chip-label">Nombre de questions par défaut</p>
              <div class="set-chip-row">${chipGroup('defaultQuestionCount', { '20': '20', '40': '40', '64': '64 · examen', '80': '80', '0': 'Max' }, current.defaultQuestionCount)}</div>
            </section>
            <section class="set-section">
              <div class="set-section-hd">
                <h3>Feedback &amp; correction</h3>
                <p class="set-section-desc">Ce qui s'affiche après chaque réponse</p>
              </div>
              <div class="set-toggles">
                ${toggleRow('showExplanation', 'Explication officielle', 'Texte de correction sous la réponse')}
                ${toggleRow('showErrorFiche', 'Fiche détaillée si erreur', 'Fiche complète A–D avec plan de révision')}
                ${toggleRow('compactFeedback', 'Feedback compact', 'Masque les liens stats et rappels en bas')}
              </div>
              <div class="set-tip-box">
                <strong>💡 Astuce</strong>
                <p>Désactive la fiche détaillée pour un entraînement rapide, ou l'explication si tu préfères n'avoir que la bonne réponse.</p>
              </div>
            </section>
            <section class="set-section">
              <div class="set-section-hd">
                <h3>Raccourcis &amp; retours</h3>
                <p class="set-section-desc">Clavier, sons et vibrations</p>
              </div>
              <div class="set-toggles">
                ${toggleRow('keyboardShortcuts', 'Raccourcis clavier', 'A B C D pour répondre · Entrée ou Espace pour suivant')}
                ${toggleRow('soundFeedback', 'Sons discrets', 'Bip court à chaque bonne ou mauvaise réponse')}
                ${toggleRow('vibrationFeedback', 'Vibration (mobile)', 'Retour haptique sur téléphone ou tablette')}
              </div>
              <div class="set-tip-box">
                <strong>⌨️ Raccourcis</strong>
                <p><kbd>A</kbd> <kbd>B</kbd> <kbd>C</kbd> <kbd>D</kbd> répondre · <kbd>Entrée</kbd> ou <kbd>Espace</kbd> question suivante · <kbd>P</kbd> pause</p>
              </div>
            </section>
          </div>
          <div class="set-tab-panel" data-set-panel="a11y"${activeTab !== 'a11y' ? ' hidden' : ''}>
            <section class="set-section">
              <div class="set-section-hd">
                <h3>Accessibilité</h3>
                <p class="set-section-desc">Confort de lecture et d'utilisation</p>
              </div>
              <div class="set-toggles">
                ${toggleRow('reduceMotion', 'Réduire les mouvements', 'Désactive animations et effets dynamiques')}
                ${toggleRow('largeTouch', 'Grandes zones tactiles', 'Boutons et options plus faciles à toucher')}
                ${toggleRow('highContrast', 'Contraste renforcé', 'Textes et bordures plus lisibles')}
              </div>
              <div class="set-tip-box">
                <strong>♿ Conseil</strong>
                <p>Combine « Grand » + « Contraste renforcé » pour une lecture confortable sur mobile en plein soleil.</p>
              </div>
            </section>
          </div>
          <div class="set-tab-panel" data-set-panel="privacy"${activeTab !== 'privacy' ? ' hidden' : ''}>
            <section class="set-section set-section--privacy">
              <div class="set-section-hd">
                <h3>Données &amp; confidentialité</h3>
                <p class="set-section-desc">Tout reste sur cet appareil — rien n'est envoyé sur internet</p>
              </div>
              ${dataSizeHTML()}
              <p class="set-chip-label">Profils rapides</p>
              ${privacyPresetsHTML(current)}
              <p class="set-chip-label">Options détaillées</p>
              <div class="set-toggles">
                ${toggleRow('privateSession', 'Mode privé', 'Aucune sauvegarde — session éphémère uniquement')}
                ${toggleRow('saveProgress', 'Historique & progression', 'Scores, erreurs, révisions SM-2')}
                ${toggleRow('saveReaction', 'Temps de réaction', 'Mesures de rapidité par question')}
                ${toggleRow('saveBehavior', 'Comportement souris / tactile', 'Survols, hésitations, parcours')}
                ${toggleRow('saveDetailedLog', 'Journal détaillé', 'Réponses complètes pour Stats et fiches')}
                ${toggleRow('saveProbaSnapshots', 'Snapshots P(examen)', 'Historique de probabilité d\'examen')}
                ${toggleRow('clearOnExit', 'Effacer à la fermeture', 'Supprime les données à la fermeture de l\'onglet')}
              </div>
              <p class="set-chip-label">Conservation des données</p>
              <div class="set-chip-row">${chipGroup('retention', { forever: 'Toujours', '90d': '90 jours', '30d': '30 jours', session: 'Session' }, current.retention)}</div>
              <div class="set-action-row">
                <button type="button" class="set-action-btn" data-set-privacy-review>🔐 Revoir le choix confidentialité</button>
                <button type="button" class="set-action-btn" data-set-export>📤 Exporter mes données (${esc(sz.label)})</button>
                <button type="button" class="set-action-btn set-action-btn--danger" data-set-erase>🗑 Effacer les données du quiz</button>
                <button type="button" class="set-action-btn set-action-btn--danger" data-set-factory-reset>↺ Réinitialisation complète</button>
              </div>
              <p class="set-privacy-foot">Export JSON · effacement quiz (paramètres conservés) · réinitialisation complète = tout remettre à zéro.</p>
            </section>
          </div>
        </div>
        <footer class="set-panel-ft">
          <button type="button" class="set-reset" data-set-reset>Réinitialiser l'apparence</button>
        </footer>
      </aside>
    </div>`;
  }

  function open() {
    if (!hasPrivacyConsent()) {
      openPrivacyConsent();
      return;
    }
    ensureSettingsPanel();
    const overlay = document.getElementById('set-overlay');
    if (!overlay) return;
    const themeInFilter = themeFilter === 'all'
      || (themeFilter === 'dark' && !LIGHT_THEMES.has(current.theme))
      || (themeFilter === 'light' && LIGHT_THEMES.has(current.theme));
    if (!themeInFilter) {
      themeFilter = 'all';
      refreshThemeGrid();
    }
    overlay.hidden = false;
    panelOpen = true;
    document.body.classList.add('set-open');
    requestAnimationFrame(() => overlay.classList.add('open'));
    const panel = document.getElementById('set-panel');
    if (panel) panel.focus();
    updatePanelControls();
    const exportBtn = overlay.querySelector('[data-set-export]');
    if (exportBtn) {
      const sz = getDataSize();
      exportBtn.textContent = '📤 Exporter mes données (' + sz.label + ')';
    }
  }

  function close() {
    const overlay = document.getElementById('set-overlay');
    if (!overlay) return;
    overlay.classList.remove('open');
    panelOpen = false;
    document.body.classList.remove('set-open');
    setTimeout(() => { overlay.hidden = true; }, 280);
  }

  function syncPanelUI() {
    const overlay = document.getElementById('set-overlay');
    if (!overlay) return;
    const parent = overlay.parentNode;
    const open = panelOpen;
    const body = overlay.querySelector('.set-panel-body');
    const scrollTop = body ? body.scrollTop : 0;
    overlay.remove();
    parent.insertAdjacentHTML('beforeend', panelHTML());
    const newOverlay = document.getElementById('set-overlay');
    const newBody = newOverlay.querySelector('.set-panel-body');
    if (newBody) newBody.scrollTop = scrollTop;
    if (open) {
      newOverlay.hidden = false;
      newOverlay.classList.add('open');
      document.body.classList.add('set-open');
    }
    bindPanelEvents();
    switchTab(activeTab);
  }

  function bindPanelEvents() {
    const overlay = document.getElementById('set-overlay');
    if (!overlay) return;

    if (overlay._pplSetClick) {
      overlay.removeEventListener('click', overlay._pplSetClick);
      overlay.removeEventListener('change', overlay._pplSetChange);
    }

    overlay._pplSetClick = (e) => {
      if (e.target.closest('[data-set-close]')) {
        close();
        return;
      }
      const tab = e.target.closest('[data-set-tab]');
      if (tab) {
        switchTab(tab.dataset.setTab);
        return;
      }
      const filterBtn = e.target.closest('[data-set-theme-filter]');
      if (filterBtn) {
        themeFilter = filterBtn.dataset.setThemeFilter;
        refreshThemeGrid();
        return;
      }
      const presetBtn = e.target.closest('[data-privacy-preset]');
      if (presetBtn) {
        const preset = PRIVACY_PRESETS[presetBtn.dataset.privacyPreset];
        if (preset) save(applyPrivacyPatch(preset.patch));
        return;
      }
      const themeBtn = e.target.closest('[data-set-theme]');
      if (themeBtn) {
        save({ theme: themeBtn.dataset.setTheme });
        return;
      }
      const accentBtnEl = e.target.closest('[data-set-accent]');
      if (accentBtnEl) {
        save({ accent: accentBtnEl.dataset.setAccent });
        return;
      }
      const fontSizeBtn = e.target.closest('[data-set-font-size]');
      if (fontSizeBtn) {
        save({ fontSize: fontSizeBtn.dataset.setFontSize });
        return;
      }
      const fontBtn = e.target.closest('[data-set-font]');
      if (fontBtn) {
        save({ font: fontBtn.dataset.setFont });
        return;
      }
      const densityBtn = e.target.closest('[data-set-density]');
      if (densityBtn) {
        save({ density: densityBtn.dataset.setDensity });
        return;
      }
      const autoBtn = e.target.closest('[data-set-auto-advance]');
      if (autoBtn) {
        save({ autoAdvance: autoBtn.dataset.setAutoAdvance });
        return;
      }
      const defaultNBtn = e.target.closest('[data-set-default-question-count]');
      if (defaultNBtn) {
        save({ defaultQuestionCount: defaultNBtn.dataset.setDefaultQuestionCount });
        return;
      }
      const retentionBtn = e.target.closest('[data-set-retention]');
      if (retentionBtn && !retentionBtn.disabled) {
        const val = retentionBtn.dataset.setRetention;
        if (val === 'session') {
          save(applyPrivacyPatch(PRIVACY_PRESETS.private.patch));
        } else {
          const patch = { retention: val };
          if (current.privateSession) {
            patch.privateSession = false;
            patch.clearOnExit = false;
          }
          save(patch);
        }
        return;
      }
      if (e.target.closest('[data-set-export]')) {
        exportUserData();
        return;
      }
      if (e.target.closest('[data-set-privacy-review]')) {
        openPrivacyConsent();
        return;
      }
      if (e.target.closest('[data-set-erase]')) {
        if (confirm(
          'Effacer toutes les données du quiz ?\n\n'
          + '• Historique, scores, erreurs\n'
          + '• Fiches, révisions, réactions\n'
          + '• Journal détaillé & probabilités\n\n'
          + 'Les paramètres d\'apparence seront conservés.'
        )) {
          eraseUserData({ keepSettings: true });
          location.reload();
        }
        return;
      }
      if (e.target.closest('[data-set-factory-reset]')) {
        if (confirm(
          'Réinitialisation COMPLÈTE ?\n\n'
          + '• Toutes les données du quiz\n'
          + '• Paramètres & thème\n'
          + '• Choix de confidentialité\n'
          + '• Code d\'accès (à ressaisir)\n\n'
          + 'Action irréversible. L\'application sera rechargée.'
        )) {
          factoryReset();
        }
        return;
      }
      if (e.target.closest('[data-set-reset]')) {
        if (confirm('Réinitialiser uniquement l\'apparence (thème, couleurs, effets) ?')) {
          const kept = {
            saveProgress: current.saveProgress,
            saveReaction: current.saveReaction,
            saveBehavior: current.saveBehavior,
            saveDetailedLog: current.saveDetailedLog,
            saveProbaSnapshots: current.saveProbaSnapshots,
            privateSession: current.privateSession,
            clearOnExit: current.clearOnExit,
            retention: current.retention,
            privacyConsentAt: current.privacyConsentAt,
            showTimer: current.showTimer,
            confirmSkip: current.confirmSkip,
            showProbaTags: current.showProbaTags,
            autoAdvance: current.autoAdvance,
            shuffleOptions: current.shuffleOptions,
            showExplanation: current.showExplanation,
            showErrorFiche: current.showErrorFiche,
            showReactLive: current.showReactLive,
            compactFeedback: current.compactFeedback,
            keyboardShortcuts: current.keyboardShortcuts,
            soundFeedback: current.soundFeedback,
            vibrationFeedback: current.vibrationFeedback,
            pauseOnBlur: current.pauseOnBlur,
            defaultQuestionCount: current.defaultQuestionCount,
            reduceMotion: current.reduceMotion,
            largeTouch: current.largeTouch,
            highContrast: current.highContrast,
          };
          apply({ ...DEFAULTS, ...kept });
          current = sanitize({ ...DEFAULTS, ...kept });
          try { localStorage.setItem(STORAGE_KEY, JSON.stringify(current)); } catch (err) { /* ignore */ }
          updatePanelControls();
          try {
            window.dispatchEvent(new CustomEvent('ppl-settings-changed', { detail: { ...current } }));
          } catch (err) { /* ignore */ }
        }
      }
    };

    overlay._pplSetChange = (e) => {
      const input = e.target.closest('[data-set-toggle]');
      if (!input || input.disabled) return;
      const key = input.dataset.setToggle;
      const patch = { [key]: input.checked };
      if (key === 'privateSession') {
        if (input.checked) {
          Object.assign(patch, PRIVACY_PRESETS.private.patch);
        } else {
          patch.clearOnExit = false;
          if (current.retention === 'session') patch.retention = 'forever';
        }
      }
      save(patch);
    };

    overlay.addEventListener('click', overlay._pplSetClick);
    overlay.addEventListener('change', overlay._pplSetChange);
    bindKeydown();
  }

  function ensureDecorations() {
    syncDecorations();
  }

  let keydownBound = false;

  function onKeydown(e) {
    if (e.key === 'Escape') {
      if (panelOpen) close();
      if (consentOpen && consentReview) closeConsentGate();
    }
  }

  function bindKeydown() {
    if (keydownBound) return;
    document.addEventListener('keydown', onKeydown);
    keydownBound = true;
  }

  function mountSettingsButton() {
    const header = document.querySelector('.app-header');
    if (!header || document.getElementById('app-settings-btn')) return;
    const actions = document.createElement('div');
    actions.className = 'app-header-actions';
    actions.innerHTML = '<button type="button" class="app-settings-btn" id="app-settings-btn" aria-label="Paramètres" title="Paramètres">'
      + '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
      + '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>'
      + '<circle cx="12" cy="12" r="3"/>'
      + '</svg></button>';
    header.appendChild(actions);
    document.getElementById('app-settings-btn').addEventListener('click', () => {
      if (!hasPrivacyConsent()) openPrivacyConsent();
      else open();
    });
  }

  function ensureSettingsPanel() {
    if (document.getElementById('set-overlay')) return;
    document.body.insertAdjacentHTML('beforeend', panelHTML());
    bindPanelEvents();
    switchTab(activeTab);
  }

  function mountUI() {
    ensureDecorations();
    mountSettingsButton();
    ensureSettingsPanel();
  }

  function init() {
    current = load();
    try {
      apply(current);
    } catch (e) {
      console.error('[PPL Settings] apply:', e);
    }
    setupClearOnExit();
    const onReady = () => {
      mountSettingsButton();
      if (global.PPLSessionGate && global.PPLSessionGate.shouldSkipLaunchConsent()) {
        sessionConsentGranted = true;
        mountUI();
        uiMounted = true;
        purgeRetention();
        try {
          global.dispatchEvent(new CustomEvent('ppl-privacy-consent', { detail: { ...current } }));
        } catch (e) { /* ignore */ }
        return;
      }
      sessionConsentGranted = false;
      waitForAuthThenLaunchConsent();
    };
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', onReady);
    } else {
      onReady();
    }
  }

  global.PPLSettings = {
    load, get, save, apply, open, close, canPersist, hasPrivacyConsent, openPrivacyConsent,
    exportUserData, eraseUserData, factoryReset, wipeAllPplStorage, getDataSize, purgeRetention, sanitize,
    DEFAULTS, THEMES, ACCENTS, DATA_KEYS,
  };

  if (typeof global.__PPL_SETTINGS_TEST__ === 'object') {
    global.__PPL_SETTINGS_TEST__.api = {
      sanitize, applyPrivacyPatch, save, load, get, canPersist, DEFAULTS, PRIVACY_PRESETS,
      setStorage: (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* ignore */ } },
      getCurrent: () => ({ ...current }),
      setCurrent: (c) => { current = sanitize(c); },
    };
    return;
  }

  init();
})(typeof window !== 'undefined' ? window : this);
