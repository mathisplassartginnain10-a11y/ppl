/* PPL Quiz — moteur formules (calculs + liaison quiz + fiches) */
(function () {
  'use strict';

  function esc(s) {
    return String(s ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function isaTempAt(hFt) {
    return 15 - 2 * (hFt / 1000);
  }

  const FORMULA_CALCS = {
    vhf: (inputs) => {
      const h = parseFloat(inputs.h) || 0;
      return h > 0 ? `Portée ≈ ${(1.23 * Math.sqrt(h)).toFixed(1)} NM` : '';
    },
    'vhf-2': (inputs) => {
      const h1 = parseFloat(inputs.h1) || 0;
      const h2 = parseFloat(inputs.h2) || 0;
      if (!h1 && !h2) return '';
      return `Portée totale ≈ ${(1.23 * (Math.sqrt(h1) + Math.sqrt(h2))).toFixed(1)} NM`;
    },
    'isa-temp': (inputs) => {
      const h = parseFloat(inputs.h) || 0;
      return `T_ISA = ${isaTempAt(h).toFixed(0)}°C`;
    },
    'isa-delta': (inputs) => {
      const h = parseFloat(inputs.h) || 0;
      const t = parseFloat(inputs.t);
      if (isNaN(t)) return '';
      const isa = isaTempAt(h);
      const d = Math.round(t - isa);
      return `T_ISA = ${isa.toFixed(0)}°C → ISA ${d >= 0 ? '+' : ''}${d}`;
    },
    'press-gradient': (inputs) => {
      const alt = parseFloat(inputs.alt) || 0;
      const table = [[0, 28], [2000, 29], [5000, 30], [8000, 34], [10000, 37], [15000, 43], [18000, 50], [25000, 60], [30000, 75]];
      let g = 28;
      for (const [a, gr] of table) if (alt >= a) g = gr;
      return `≈ ${g} ft/hPa à ${alt} ft (ISA)`;
    },
    'qnh-pa': (inputs) => {
      const qnh = parseFloat(inputs.qnh);
      const grad = parseFloat(inputs.grad) || 30;
      if (isNaN(qnh)) return '';
      const dh = Math.round((1013 - qnh) * grad);
      return `Δh ≈ ${dh} ft (alt 1013 vs QNH ${qnh})`;
    },
    vp: (inputs) => {
      const vi = parseFloat(inputs.vi) || 0;
      const fl = parseFloat(inputs.fl) || 0;
      const delta = parseFloat(inputs.dt);
      if (!vi || !fl) return '';
      const corrAlt = Math.floor((fl * 10) / 6);
      const corrT = !isNaN(delta) ? Math.floor(Math.abs(delta) / 4) : 0;
      const vp = Math.round(vi * (1 + corrAlt / 100) * (1 + corrT / 100));
      return `Vp ≈ ${vp} kt (+${corrAlt}% alt · +${corrT}% T°)`;
    },
    'kt-kmh': (inputs) => {
      const kt = parseFloat(inputs.kt) || 0;
      return kt ? `${kt} kt ≈ ${Math.round(kt * 2 * 0.9)} km/h (×2 −10%) · exact ${(kt * 1.852).toFixed(1)} km/h` : '';
    },
    'kmh-kt': (inputs) => {
      const km = parseFloat(inputs.km) || 0;
      return km ? `${km} km/h ≈ ${(km / 1.852).toFixed(0)} kt` : '';
    },
    'alt-corr': (inputs) => {
      const h = parseFloat(inputs.h) || 0;
      const t = parseFloat(inputs.t);
      const ts = parseFloat(inputs.ts);
      if (isNaN(t) || isNaN(ts) || !h) return '';
      const dh = 4 * (h / 1000) * (t - ts);
      const real = h - dh;
      return `Δh = ${Math.round(dh)} ft → Altitude réelle ≈ ${Math.round(real)} ft`;
    },
    'true-alt': (inputs) => {
      const h = parseFloat(inputs.h) || 0;
      const qnh = parseFloat(inputs.qnh);
      const grad = parseFloat(inputs.grad) || 30;
      if (isNaN(qnh) || !h) return '';
      const real = Math.round(h + (qnh - 1013) * grad);
      return `Altitude vraie ≈ ${real} ft (lue ${h} ft · QNH ${qnh})`;
    },
    'ms-ftmin': (inputs) => {
      const ms = parseFloat(inputs.ms) || 0;
      return ms ? `${ms} m/s ≈ ${Math.round(ms * 200)} ft/min` : '';
    },
    descent: (inputs) => {
      const g = parseFloat(inputs.g) || 0;
      const v = parseFloat(inputs.v) || 0;
      return g && v ? `Vz = ${Math.round((g / 100) * v)} ft/min (${g}% × ${v} kt)` : '';
    },
    'dist-time': (inputs) => {
      const v = parseFloat(inputs.v) || 0;
      const t = parseFloat(inputs.t);
      const d = parseFloat(inputs.d);
      if (v && t) return `Distance = ${(v * t).toFixed(1)} NM`;
      if (v && d) return `Temps = ${(d / v).toFixed(2)} h (${Math.round((d / v) * 60)} min)`;
      return '';
    },
    'nm-km': (inputs) => {
      const nm = parseFloat(inputs.nm) || 0;
      return nm ? `${nm} NM = ${(nm * 1.852).toFixed(2)} km` : '';
    },
    'ft-m': (inputs) => {
      const ft = parseFloat(inputs.ft) || 0;
      return ft ? `${ft} ft = ${(ft * 0.3048).toFixed(0)} m` : '';
    },
    'cloud-base': (inputs) => {
      const t = parseFloat(inputs.t);
      const td = parseFloat(inputs.td);
      if (isNaN(t) || isNaN(td)) return '';
      const base = Math.round((t - td) * 400);
      return `Base nuage ≈ ${base} ft (T − T_rosée = ${(t - td).toFixed(0)}°C)`;
    },
    'load-factor': (inputs) => {
      const bank = parseFloat(inputs.bank) || 0;
      if (!bank) return '';
      const n = 1 / Math.cos((bank * Math.PI) / 180);
      return `n = 1/cos(${bank}°) = ${n.toFixed(2)}`;
    },
    'stall-n': (inputs) => {
      const vs1 = parseFloat(inputs.vs1) || 0;
      const n = parseFloat(inputs.n) || 1;
      if (!vs1) return '';
      return `Vs ≈ ${Math.round(vs1 * Math.sqrt(n))} kt (Vs1=${vs1} · n=${n})`;
    },
    'rule-60': (inputs) => {
      const d = parseFloat(inputs.d) || 0;
      const a = parseFloat(inputs.a) || 0;
      if (!d || !a) return '';
      return `Déviation ≈ ${((d / 60) * a).toFixed(1)} NM`;
    },
    crosswind: (inputs) => {
      const w = parseFloat(inputs.w) || 0;
      const ang = parseFloat(inputs.ang) || 0;
      if (!w) return '';
      const xwc = Math.abs(w * Math.sin((ang * Math.PI) / 180));
      return `Composante travers ≈ ${xwc.toFixed(0)} kt`;
    },
    headwind: (inputs) => {
      const w = parseFloat(inputs.w) || 0;
      const ang = parseFloat(inputs.ang) || 0;
      if (!w) return '';
      const hw = w * Math.cos((ang * Math.PI) / 180);
      return `Composante ${hw >= 0 ? 'face' : 'arrière'} ≈ ${Math.abs(hw).toFixed(0)} kt`;
    },
    autonomy: (inputs) => {
      const fuel = parseFloat(inputs.fuel) || 0;
      const flow = parseFloat(inputs.flow) || 0;
      if (!fuel || !flow) return '';
      const h = fuel / flow;
      return `Autonomie ≈ ${h.toFixed(1)} h (${Math.round(h * 60)} min)`;
    },
    'fuel-flow': (inputs) => {
      const fuel = parseFloat(inputs.fuel) || 0;
      const t = parseFloat(inputs.t) || 0;
      if (!fuel || !t) return '';
      return `Débit ≈ ${(fuel / t).toFixed(1)} L/h`;
    },
    'semi-circular': (inputs) => {
      const hdg = parseFloat(inputs.hdg);
      if (isNaN(hdg)) return '';
      const odd = hdg >= 0 && hdg < 180;
      const base = odd ? 3500 : 4500;
      const step = 2000;
      return `Cap ${hdg}° → ${odd ? 'impairs' : 'pairs'} : ${base} ft, ${base + step} ft, ${base + step * 2} ft…`;
    },
  };

  const FORMULA_INPUTS = {
    vhf: [{ id: 'h', label: 'h (ft)', def: 100 }],
    'vhf-2': [
      { id: 'h1', label: 'h₁ (ft)', def: 1000 },
      { id: 'h2', label: 'h₂ (ft)', def: 1000 },
    ],
    'isa-temp': [{ id: 'h', label: 'Altitude (ft)', def: 1000 }],
    'isa-delta': [
      { id: 'h', label: 'Altitude (ft)', def: 1000 },
      { id: 't', label: 'T° réelle (°C)', def: 18 },
    ],
    'press-gradient': [{ id: 'alt', label: 'Altitude (ft)', def: 5000 }],
    'qnh-pa': [
      { id: 'qnh', label: 'QNH (hPa)', def: 1000 },
      { id: 'grad', label: 'Gradient ft/hPa', def: 30 },
    ],
    vp: [
      { id: 'vi', label: 'Vi (kt)', def: 100 },
      { id: 'fl', label: 'FL (ex: 10)', def: 10 },
      { id: 'dt', label: '|ΔT| vs std (°C)', def: 16 },
    ],
    'kt-kmh': [{ id: 'kt', label: 'kt', def: 100 }],
    'kmh-kt': [{ id: 'km', label: 'km/h', def: 180 }],
    'alt-corr': [
      { id: 'h', label: 'Alt. lue (ft)', def: 2000 },
      { id: 't', label: 'T° réelle', def: 26 },
      { id: 'ts', label: 'T° standard', def: 11 },
    ],
    'true-alt': [
      { id: 'h', label: 'Alt. lue (ft)', def: 3000 },
      { id: 'qnh', label: 'QNH', def: 1020 },
      { id: 'grad', label: 'Gradient', def: 30 },
    ],
    'ms-ftmin': [{ id: 'ms', label: 'm/s', def: 1 }],
    descent: [
      { id: 'g', label: 'Gradient (%)', def: 5 },
      { id: 'v', label: 'Vsol (kt)', def: 90 },
    ],
    'dist-time': [
      { id: 'v', label: 'Vitesse (kt)', def: 100 },
      { id: 't', label: 'Temps (h)', def: 1.5 },
    ],
    'nm-km': [{ id: 'nm', label: 'NM', def: 10 }],
    'ft-m': [{ id: 'ft', label: 'ft', def: 1000 }],
    'cloud-base': [
      { id: 't', label: 'T° (°C)', def: 20 },
      { id: 'td', label: 'T° rosée', def: 15 },
    ],
    'load-factor': [{ id: 'bank', label: 'Inclinaison (°)', def: 60 }],
    'stall-n': [
      { id: 'vs1', label: 'Vs1 (kt)', def: 50 },
      { id: 'n', label: 'Facteur n', def: 2 },
    ],
    'rule-60': [
      { id: 'd', label: 'Distance (NM)', def: 60 },
      { id: 'a', label: 'Angle (°)', def: 2 },
    ],
    crosswind: [
      { id: 'w', label: 'Vent (kt)', def: 20 },
      { id: 'ang', label: 'Angle piste/vent (°)', def: 90 },
    ],
    headwind: [
      { id: 'w', label: 'Vent (kt)', def: 20 },
      { id: 'ang', label: 'Angle (°)', def: 0 },
    ],
    autonomy: [
      { id: 'fuel', label: 'Carburant (L)', def: 60 },
      { id: 'flow', label: 'Débit (L/h)', def: 30 },
    ],
    'fuel-flow': [
      { id: 'fuel', label: 'Carburant (L)', def: 45 },
      { id: 't', label: 'Temps (h)', def: 1.5 },
    ],
    'semi-circular': [{ id: 'hdg', label: 'Cap magnétique (°)', def: 90 }],
  };

  function getFormulasForQuestion(q) {
    if (typeof FORMULAS === 'undefined') return { linked: [], module: [] };
    const hay = (q.q + ' ' + q.e + ' ' + q.r).toLowerCase();
    const linked = [];
    const seen = new Set();
    const add = (f) => {
      if (f && !seen.has(f.id)) {
        seen.add(f.id);
        linked.push(f);
      }
    };
    FORMULAS.forEach((f) => {
      if (!f.quizRef || !q.r) return;
      const ref = f.quizRef.toLowerCase();
      const topic = q.r.toLowerCase();
      if (topic === ref || topic.includes(ref) || ref.includes(topic)) add(f);
    });
    (typeof FORMULA_KEYWORDS !== 'undefined' ? FORMULA_KEYWORDS : []).forEach(({ keys, ids }) => {
      if (keys.some((k) => hay.includes(k)))
        ids.forEach((id) => add(FORMULAS.find((x) => x.id === id)));
    });
    if (q.m)
      FORMULAS.filter((f) => f.m === q.m).forEach((f) => {
        if (!seen.has(f.id) && keysMatchModule(hay, f)) add(f);
      });
    linked.sort((a, b) => (b.prio || 2) - (a.prio || 2));
    return { linked: linked.slice(0, 10), module: FORMULAS.filter((f) => f.m === q.m) };
  }

  function keysMatchModule(hay, f) {
    const t = (f.title + f.formula + (f.explain || '')).toLowerCase();
    return t.split(/\W+/).filter((w) => w.length > 3).some((w) => hay.includes(w));
  }

  function parseNum(s) {
    return parseFloat(String(s).replace(',', '.'));
  }

  function buildWorkedExample(q) {
    const text = q.q + ' ' + q.e;
    const hay = text.toLowerCase();
    const steps = [];
    let title = '';
    let result = '';

    const vhfH = text.match(/(\d+(?:[.,]\d+)?)\s*ft/i);
    if ((hay.includes('vhf') || hay.includes('1,23') || q.r.includes('VHF')) && vhfH) {
      const h = parseNum(vhfH[1]);
      const sq = Math.sqrt(h);
      const d = 1.23 * sq;
      title = 'Portée VHF';
      steps.push('Formule : D = 1,23 × √h (h en ft, D en NM)');
      steps.push(`D = 1,23 × √${h} = 1,23 × ${sq.toFixed(2)} = ${d.toFixed(1)} NM`);
      result = `${d.toFixed(1)} NM`;
    }

    const viM = text.match(/Vi\s*=\s*(\d+)\s*kt/i);
    const flM = text.match(/FL(\d+)/i);
    const tRealM = text.match(/T°\s*=?\s*([+\-−]?\d+)/i);
    const tStdM = text.match(/std\s*([+\-−]?\d+)/i);
    if ((hay.includes('vp') || q.r.includes('Vp')) && viM) {
      const vi = parseInt(viM[1], 10);
      const flNum = flM ? parseInt(flM[1], 10) : 0;
      const tr = tRealM ? parseNum(tRealM[1].replace('−', '-')) : 0;
      const ts = tStdM ? parseNum(tStdM[1].replace('−', '-')) : isaTempAt(flNum * 100);
      const corrAlt = Math.floor((flNum * 10) / 6);
      const corrT = Math.floor(Math.abs(tr - ts) / 4);
      const vp = Math.round(vi * (1 + corrAlt / 100) * (1 + corrT / 100));
      title = 'Vitesse propre (Vp)';
      steps.push(`Vi = ${vi} kt · FL${flM ? flM[1] : '?'} (${flNum * 100} ft)`);
      steps.push(`Correction altitude : +${corrAlt}% (FL×10÷6)`);
      steps.push(`Écart température : |${tr} − ${ts}| = ${Math.abs(tr - ts)}°C → +${corrT}%`);
      steps.push(`Vp = ${vi} × ${(1 + corrAlt / 100).toFixed(2)} × ${(1 + corrT / 100).toFixed(2)} = ${vp} kt`);
      result = `${vp} kt`;
    }

    const altM = text.match(/Altimètre\s+(\d+)\s*ft/i);
    if ((hay.includes('altitude réelle') || q.r.includes('altimétrique')) && altM && tRealM && tStdM) {
      const h = parseInt(altM[1], 10);
      const tr = parseNum(tRealM[1].replace('−', '-'));
      const ts = parseNum(tStdM[1].replace('−', '-'));
      const ecart = Math.abs(tr - ts);
      const corr = Math.round(4 * (h / 1000) * ecart);
      const real = tr < ts ? h - corr : h + corr;
      title = 'Correction altimétrique (température)';
      steps.push(`Alt. lue = ${h} ft · T° réelle = ${tr}°C · T° standard = ${ts}°C`);
      steps.push(`Écart = ${ecart}°C · Correction = 4 × (${h}/1000) × ${ecart} = ${corr} ft`);
      steps.push(`Alt. réelle = ${h} ${tr < ts ? '−' : '+'} ${corr} = ${real} ft`);
      result = `${real} ft`;
    }

    const altIsaM = text.match(/(\d+)\s*ft/i);
    if ((hay.includes('isa') || q.r.toLowerCase().includes('isa')) && altIsaM && !viM && !altM) {
      const h = parseInt(altIsaM[1], 10);
      const t = isaTempAt(h);
      title = 'Température ISA';
      steps.push(`T_ISA = 15 − 2 × (${h}/1000) = ${t.toFixed(0)}°C`);
      if (tRealM) {
        const tr = parseNum(tRealM[1].replace('−', '-'));
        const d = Math.round(tr - t);
        steps.push(`T° réelle = ${tr}°C → ISA ${d >= 0 ? '+' : ''}${d}`);
        result = `ISA ${d >= 0 ? '+' : ''}${d}`;
      } else result = `${t.toFixed(0)}°C`;
    }

    const bankM = text.match(/(\d+)\s*°/);
    if ((hay.includes('facteur de charge') || hay.includes('virage')) && bankM) {
      const bank = parseInt(bankM[1], 10);
      const n = 1 / Math.cos((bank * Math.PI) / 180);
      title = 'Facteur de charge';
      steps.push(`n = 1 / cos(${bank}°) = ${n.toFixed(2)}`);
      result = `n = ${n.toFixed(2)}`;
    }

    const distM = text.match(/(\d+)\s*NM/i);
    const angM = text.match(/(\d+)\s*°/);
    if ((hay.includes('1:60') || q.r.includes('1:60')) && distM && angM) {
      const d = parseInt(distM[1], 10);
      const a = parseInt(angM[1], 10);
      const dev = (d / 60) * a;
      title = 'Règle du 1:60';
      steps.push(`Déviation ≈ (${d} / 60) × ${a}° = ${dev.toFixed(1)} NM`);
      result = `${dev.toFixed(1)} NM de décalage`;
    }

    const ktM = text.match(/(\d+)\s*kt/i);
    if (hay.includes('km/h') && ktM && !viM) {
      const kt = parseInt(ktM[1], 10);
      title = 'Conversion kt → km/h';
      steps.push(`Exact : ${kt} × 1,852 = ${(kt * 1.852).toFixed(1)} km/h`);
      steps.push(`Astuce : ${kt} × 2 − 10% = ${Math.round(kt * 2 * 0.9)} km/h`);
      result = `${(kt * 1.852).toFixed(1)} km/h`;
    }

    const calcInE = q.e.match(/=\s*([\d.,]+)\s*(NM|kt|ft|°C|%)/i);
    if (!steps.length && calcInE) {
      title = 'Calcul (explication)';
      steps.push(q.e.replace(/\.\s*$/, ''));
      result = q.o[q.a] || calcInE[0];
    }

    return steps.length ? { title, steps, result } : null;
  }

  function getModuleEssentials(m) {
    return (typeof MODULE_ESSENTIALS !== 'undefined' ? MODULE_ESSENTIALS[m] : []) || [];
  }

  function renderFormulaCalc(f) {
    if (!f.calc || !FORMULA_INPUTS[f.calc]) return '';
    const inputs = FORMULA_INPUTS[f.calc];
    const res = FORMULA_CALCS[f.calc](Object.fromEntries(inputs.map((i) => [i.id, String(i.def)])));
    return `<div class="formula-calc" data-calc-id="${f.id}" data-calc-type="${f.calc}">
    <div class="formula-calc-hd">🧮 Calculateur interactif</div>
    <div class="formula-calc-row">${inputs.map((i) => `<label>${i.label}<input type="number" step="any" data-in="${i.id}" value="${i.def}"></label>`).join('')}</div>
    <div class="formula-calc-res" data-calc-res>${res || '—'}</div>
  </div>`;
  }

  function handleFormulaCalcInput(e) {
    const calc = e.target.closest('[data-calc-type]');
    if (!calc || !e.target.dataset.in) return;
    const type = calc.dataset.calcType;
    const inputs = {};
    calc.querySelectorAll('[data-in]').forEach((inp) => {
      inputs[inp.dataset.in] = inp.value;
    });
    const res = FORMULA_CALCS[type]?.(inputs) || '—';
    const el = calc.querySelector('[data-calc-res]');
    if (el) el.textContent = res || '—';
  }

  function renderFicheFormulaBlock(f, compact) {
    const ex = (f.examples || [])
      .slice(0, compact ? 1 : 2)
      .map((e) => `<div class="fiche-formula-ex">→ ${esc(e)}</div>`)
      .join('');
    const worked =
      !compact && f.worked && f.worked.length
        ? `<ol class="formula-worked formula-worked-sm">${f.worked.map((w) => `<li>${esc(w)}</li>`).join('')}</ol>`
        : '';
    const util =
      f.utility && !compact
        ? `<div class="fiche-formula-meta formula-util">🎯 ${esc(f.utility)}</div>`
        : '';
    const calc = !compact && f.calc ? renderFormulaCalc(f) : '';
    const mn =
      f.mnemonic && !compact
        ? `<div class="fiche-formula-meta" style="color:#93b8fb;margin-top:3px">💡 ${esc(f.memonic)}</div>`
        : '';
    return `<div class="fiche-formula">
    <div class="fiche-formula-hd">${esc(f.title)} <span style="font-weight:400;color:var(--t3);font-size:10px">· ${esc(f.cat)}</span></div>
    <div class="fiche-formula-eq">${esc(f.formula)}</div>
    ${f.units ? `<div class="fiche-formula-meta">${esc(f.units)}</div>` : ''}
    ${util}
    <div class="fiche-formula-meta">${esc(f.explain || '')}</div>${mn}${worked}${ex}${calc}
  </div>`;
  }

  window.isaTempAt = isaTempAt;
  window.FORMULA_CALCS = FORMULA_CALCS;
  window.FORMULA_INPUTS = FORMULA_INPUTS;
  window.getFormulasForQuestion = getFormulasForQuestion;
  window.keysMatchModule = keysMatchModule;
  window.parseNum = parseNum;
  window.buildWorkedExample = buildWorkedExample;
  window.getModuleEssentials = getModuleEssentials;
  window.renderFormulaCalc = renderFormulaCalc;
  window.handleFormulaCalcInput = handleFormulaCalcInput;
  window.renderFicheFormulaBlock = renderFicheFormulaBlock;
})();
