/* Références pédagogiques injectées dans les fiches thème PPL */
(function () {
  'use strict';

  const SNIPPETS = [
    {
      keys: ['alphabet', 'oaci', 'alfa', 'bravo', 'charlie'],
      title: 'Alphabet aéronautique OACI',
      body: `<ul class="fiche-ref-list">
        <li><strong>A</strong> Alfa · <strong>B</strong> Bravo · <strong>C</strong> Charlie · <strong>D</strong> Delta · <strong>E</strong> Echo</li>
        <li><strong>F</strong> Foxtrot · <strong>G</strong> Golf · <strong>H</strong> Hotel · <strong>I</strong> India · <strong>J</strong> Juliet</li>
        <li><strong>K</strong> Kilo · <strong>L</strong> Lima · <strong>M</strong> Mike · <strong>N</strong> November · <strong>O</strong> Oscar</li>
        <li><strong>P</strong> Papa · <strong>Q</strong> Quebec · <strong>R</strong> Romeo · <strong>S</strong> Sierra · <strong>T</strong> Tango</li>
        <li><strong>U</strong> Uniform · <strong>V</strong> Victor · <strong>W</strong> Whiskey · <strong>X</strong> X-ray · <strong>Y</strong> Yankee · <strong>Z</strong> Zulu</li>
      </ul>
      <p class="fiche-ref-note">Astuce : « Alfa » s’écrit avec deux « a » — piège classique à l’examen.</p>`,
    },
    {
      keys: ['fréquence', 'frequence', '121,500', '123,500', 'vhf', 'mhz'],
      title: 'Fréquences VHF aéronautiques (108–137 MHz)',
      body: `<ul class="fiche-ref-list">
        <li><strong>121,500 MHz</strong> — détresse internationale (MAYDAY)</li>
        <li><strong>123,500 MHz</strong> — fréquence « club », aérodromes à trafic réduit</li>
        <li><strong>123,450 MHz</strong> — communication entre aéronefs</li>
        <li><strong>123,065 MHz</strong> — altisurfaces / altiports à trafic réduit</li>
        <li><strong>125,335 MHz</strong> — bases ULM</li>
      </ul>
      <p class="fiche-ref-note">Bandes : 108–111,975 MHz (ILS/VOR) · 112–117,975 MHz (VOR/DME) · 117,975–137 MHz (radiocom).</p>`,
    },
    {
      keys: ['portée', 'vhf', '1,23', 'propagation'],
      title: 'Portée VHF — propagation optique',
      body: `<p class="fiche-ref-p"><strong>D = 1,23 × √h</strong> (h en pieds, D en milles nautiques)</p>
      <ul class="fiche-ref-list">
        <li>Propagation <em>optique</em> : ligne de vue directe, aucun obstacle entre émetteur et récepteur</li>
        <li>Portée radio sol : D₁ = 1,23√h₁ · Portée totale avion-station : D = 1,23(√h₁ + √h₂)</li>
        <li>Ex. h = 10 000 ft → D ≈ 1,23 × 100 = <strong>123 NM</strong></li>
      </ul>`,
    },
    {
      keys: ['phraséologie', 'phras', 'roger', 'wilco', 'mayday', 'pan-pan'],
      title: 'Phraséologie — priorités & expressions clés',
      body: `<p class="fiche-ref-p"><strong>Ordre de priorité des messages</strong></p>
      <ol class="fiche-ref-ol">
        <li><strong>MAYDAY</strong> ×3 — détresse</li>
        <li><strong>PAN-PAN</strong> ×3 — urgence (PAN-PAN MEDICAL si transport sanitaire)</li>
        <li>Messages ATC (clairance, régulation, compte-rendu)</li>
        <li>Messages d’information de vol</li>
        <li>Messages entre exploitants / pilotes</li>
      </ol>
      <ul class="fiche-ref-list">
        <li><strong>Roger</strong> = message reçu en entier · <strong>Wilco</strong> = compris ET exécuté</li>
        <li><strong>Affirm</strong> = oui · <strong>Négatif</strong> = non · <strong>Approuvé</strong> = permission accordée</li>
        <li><strong>Autorisé</strong> = uniquement décollage, atterrissage, toucher, option</li>
        <li><strong>Break break</strong> = séparer des messages dans un environnement chargé</li>
      </ul>
      <p class="fiche-ref-note">À collationner : fréquence, transpondeur, QNH, niveau/altitude, cap, vitesse, piste en service.</p>`,
    },
    {
      keys: ['isa', 'atmosphère', 'standard', '15°c', '1013'],
      title: 'Atmosphère standard ISA',
      body: `<ul class="fiche-ref-list">
        <li>Au niveau de la mer : <strong>T = +15°C</strong> · <strong>P = 1013,25 hPa</strong></li>
        <li>Gradient vertical : <strong>−2°C / 1000 ft</strong> jusqu’à la tropopause (~36 000 ft, −56,5°C)</li>
        <li>ISA +X = plus chaud que standard · ISA −X = plus froid</li>
        <li>T_ISA(h) = 15 − 2 × (h/1000)</li>
      </ul>`,
    },
    {
      keys: ['vitesse propre', 'vp', 'vi', 'tas'],
      title: 'Vitesse propre (Vp / TAS)',
      body: `<p class="fiche-ref-p">Formule examen PPL (approximation) :</p>
      <ul class="fiche-ref-list">
        <li>Correction altitude : <strong>+ (FL × 10) ÷ 6</strong> % (ex. FL100 → +16,7%)</li>
        <li>Correction température : <strong>+ |ΔT| ÷ 4</strong> % (ΔT vs température standard à l’altitude)</li>
        <li>Vp = Vi × (1 + corrAlt/100) × (1 + corrT/100)</li>
        <li>Vi = vitesse indiquée · Vp = vitesse propre (TAS) corrigée altitude + température</li>
      </ul>`,
    },
    {
      keys: ['altim', 'qnh', 'qfe', 'calage', 'altitude pression'],
      title: 'Altimétrie — QNH, QFE, corrections',
      body: `<ul class="fiche-ref-list">
        <li><strong>QNH</strong> : pression au niveau de la mer → altitude lue = élévation au sol si calage correct</li>
        <li><strong>QFE</strong> : pression au niveau de l’aérodrome → altimètre à 0 au sol</li>
        <li>1013 hPa → altitude pression (PA) · QNH &gt; 1013 → altitude vraie &gt; altitude lue</li>
        <li>Correction QNH : Δh ≈ (1013 − QNH) × gradient (≈ 28–30 ft/hPa selon altitude ISA)</li>
        <li>Air froid → air dense → <strong>altitude vraie &lt; altitude lue</strong> (correction : soustraire)</li>
      </ul>`,
    },
    {
      keys: ['vfr', 'visibilité', 'espace', 'nuage', 'minima'],
      title: 'Minima VFR — rappels examen',
      body: `<ul class="fiche-ref-list">
        <li><strong>Espace A</strong> : IFR uniquement (sauf exemption)</li>
        <li><strong>Espace C/D</strong> : VFR avec clairance, séparation IFR, visibilité &amp; distance nuages selon règlement</li>
        <li><strong>Espace E</strong> (sous FL100) : VFR 5 km visibilité · 1500 m horizontalement / 1000 ft verticalement des nuages</li>
        <li><strong>Espace G</strong> : règles allégées — mémoriser les seuils par classe d’espace</li>
        <li>En montagne / agglomération : règles spécifiques (survol, hauteur minimale)</li>
      </ul>
      <p class="fiche-ref-note">Crée un tableau récap par espace aérien — les seuils chiffrés tombent très souvent.</p>`,
    },
    {
      keys: ['mass', 'centrage', 'cg', 'enveloppe'],
      title: 'Masse & centrage — principes',
      body: `<ul class="fiche-ref-list">
        <li>MTOM / MLM : ne jamais dépasser la masse max certifiée</li>
        <li>Centrage dans l’enveloppe avant/arrière — impact sur stabilité et maniabilité</li>
        <li>Bras de levier × masse = moment → position CG = Σ moments / masse totale</li>
        <li>Carburant, passagers, bagages : recalculer avant chaque vol</li>
      </ul>`,
    },
    {
      keys: ['météo', 'met', 'front', 'brouillard', 'orage', 'turbulence'],
      title: 'Météo aéronautique — lecture rapide',
      body: `<ul class="fiche-ref-list">
        <li><strong>TEMSI / TAF / METAR</strong> : toujours croiser prévision et observation</li>
        <li>Front froid : rapide, violent, amélioration après passage · Front chaud : lent, couverture étendue</li>
        <li>Brouillard : advection (vent) vs radiation (nuit claire) vs upslope (relief)</li>
        <li>Orage CB : éviter, contourner ≥ 20 NM, ne jamais traverser le cœur</li>
        <li>Givrage : OAT proche 0°C + humidité → carburateur / ailes</li>
      </ul>`,
    },
    {
      keys: ['metar', 'speci', 'cavok', 'nosig', 'auto', 'qnh'],
      title: 'METAR — structure & décodage (10 groupes)',
      body: `<p class="fiche-ref-p"><strong>Ordre des groupes</strong></p>
      <ol class="fiche-ref-ol">
        <li>Type (METAR/SPECI) · 2 OACI · 3 date/heure · 4 vent · 5 visibilité</li>
        <li>6 temps présent · 7 nuages · 8 T/Td · 9 QNH · 10 compléments/tendance</li>
      </ol>
      <ul class="fiche-ref-list">
        <li><strong>9999</strong> = visibilité ≥ 10 km · <strong>CAVOK</strong> = 4 critères cumulés</li>
        <li><strong>26015G30KT</strong> = 260° · 15 kt · rafales 30 kt (G si écart ≥ 10 kt)</li>
        <li><strong>VRB03KT</strong> = vent variable faible · <strong>12/M08</strong> = +12°C / −8°C rosée</li>
        <li><strong>Q1013</strong> = QNH 1013 hPa · <strong>NOSIG</strong> = pas de changement sig. 2 h</li>
        <li>Nuages : FEW/SCT/BKN/OVC + hauteur × 100 ft · CB/TCU signalés</li>
        <li>Intensité : <strong>−</strong> faible/modérée · <strong>+</strong> forte · RE = récent (RERA, RESN…)</li>
        <li>Publication : /1 h ou /30 min selon trafic · AUTO = automatisé · COR = corrigé</li>
      </ul>
      <p class="fiche-ref-note">Ex. CDG : METAR LFPG 191600Z 32010KT 6000 FEW030 12/08 Q1010 NOSIG=</p>`,
    },
    {
      keys: ['taf', 'becmg', 'tempo', 'prob', 'fm ', 'amd'],
      title: 'TAF — prévision aérodrome (10 groupes)',
      body: `<p class="fiche-ref-p"><strong>Types & validité</strong></p>
      <ul class="fiche-ref-list">
        <li><strong>TAF court</strong> : 9 h · émis /3 h · <strong>TAF long</strong> : 24–30 h · /6 h</li>
        <li>Disponible <strong>1 h avant</strong> début validité · amendement = <strong>TAF AMD</strong></li>
        <li>Période : <strong>291500/292400</strong> = du 29 15 UTC au 29 24 UTC</li>
      </ul>
      <p class="fiche-ref-p"><strong>Évolutions (groupe 9)</strong></p>
      <ul class="fiche-ref-list">
        <li><strong>BECMG</strong> — transition progressive (&lt; 4 h, permanente)</li>
        <li><strong>TEMPO</strong> — fluctuations &lt; 1 h (&lt; 50 % période)</li>
        <li><strong>FM121800</strong> — changement brutal et permanent à l'heure indiquée</li>
        <li><strong>PROB30/40 TEMPO</strong> — probabilité faible/modérée de fluctuations</li>
        <li><strong>TX21/0415Z TN12/0406Z</strong> — températures extrêmes (facultatif)</li>
      </ul>
      <p class="fiche-ref-note">TAF : vent = groupe 5 (≠ METAR groupe 4). Croiser TAF + METAR + SPECI.</p>`,
    },
    {
      keys: ['metar - analyse', 'metar/taf', 'plafond', 'décodage'],
      title: 'Analyse METAR/TAF pour le pilote VFR',
      body: `<ul class="fiche-ref-list">
        <li><strong>Plafond opérationnel</strong> = base du BKN ou OVC le plus bas (× 100 ft)</li>
        <li>Visibilité &lt; 1500 m ou &lt; 50 % dominante et &lt; 5000 m → visibilité directionnelle possible</li>
        <li>VFR espace E : 5 km visi · 1500 m horiz. / 1000 ft vert. des nuages</li>
        <li>Écart T − Td faible → risque brouillard/brume (ex. 11/05 → 6°C d'écart)</li>
        <li>CB/TSRA/FG → éviter ou reporter · TAF TEMPO ≠ observation actuelle METAR</li>
        <li>SPECI/AMD = changement significatif non prévu → re-briefing obligatoire</li>
      </ul>`,
    },
    {
      keys: ['1:60', 'navigation', 'cap', 'dérive', 'déviation'],
      title: 'Navigation — règle du 1:60',
      body: `<ul class="fiche-ref-list">
        <li><strong>1 NM de déviation latérale pour 60 NM parcourus et 1° d’écart de cap</strong></li>
        <li>Déviation (NM) ≈ (distance / 60) × angle (°)</li>
        <li>Correction cap : doubler l’angle puis ramener de moitié (technique « double &amp; half »)</li>
        <li>Wind triangle : composante face/arrière · composante traversière (sin/cos)</li>
      </ul>`,
    },
    {
      keys: ['moteur', 'carburateur', 'hélice', 'mélange'],
      title: 'Moteur & performances — rappels',
      body: `<ul class="fiche-ref-list">
        <li>Carburateur : risque de givrage à haute humidité + température proche 0°C → chauffage carbu</li>
        <li>Mélange riche au sol / pauvre en croisière haute altitude</li>
        <li>Hélice : pas fixe vs réglable · RPM / manifold pressure selon moteur</li>
        <li>Facteur de charge en virage : n = 1/cos(bank) → Vs augmente avec √n</li>
      </ul>`,
    },
  ];

  function norm(s) {
    return String(s || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '');
  }

  function getFicheReference(ref) {
    const r = norm(ref);
    if (!r) return [];
    return SNIPPETS.filter((s) => s.keys.some((k) => r.includes(norm(k))));
  }

  function renderFicheReferenceHTML(ref) {
    const blocks = getFicheReference(ref);
    if (!blocks.length) return '';
    return blocks
      .map(
        (b) =>
          `<div class="fiche-ref-block"><div class="fiche-ref-title">📖 ${b.title}</div><div class="fiche-ref-body">${b.body}</div></div>`
      )
      .join('');
  }

  window.getFicheReference = getFicheReference;
  window.renderFicheReferenceHTML = renderFicheReferenceHTML;
})();
