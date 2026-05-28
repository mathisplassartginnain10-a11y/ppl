#!/usr/bin/env python3
"""Génère questions_bank.js — qualité et diversité prioritaires sur la quantité."""
import json, re, math, random
from pathlib import Path

ROOT = Path(__file__).parent
DOCS = ROOT / "docs"
HTML = ROOT / "index.html"
OUT = ROOT / "questions_bank.js"
META = ROOT / "questions_meta.json"

random.seed(42)


def q(m, d, question, opts, a, e, r):
    return {"m": m, "d": d, "q": question, "o": opts, "a": a, "e": e, "r": r}


def norm_opt(s):
    return re.sub(r"\s+", " ", str(s).strip().lower())


def numeric_fillers(correct, seen):
    out = []
    m = re.match(r"^(-?\d+(?:[,\.]\d+)?)\s*(.*)$", str(correct).strip())
    if not m:
        return out
    val = float(m.group(1).replace(",", "."))
    unit = m.group(2).strip()
    for d in (1, 2, 3, 5, 7, 8, 10, 12, 15, 18, 20, 25, 30, 40, 50, 75, 100, 125, 150, 200):
        for sign in (1, -1):
            v = val + sign * d
            if ("ft" in unit.lower() or "kt" in unit.lower()) and v < 0:
                continue
            cand = f"{int(round(v))} {unit}".strip() if unit else str(int(round(v)))
            if norm_opt(cand) not in seen:
                seen.add(norm_opt(cand))
                out.append(cand)
            if len(out) >= 6:
                return out
    return out


def isa_fillers(correct, seen):
    out = []
    m = re.match(r"^ISA\s*([+-]?\d+)\s*$", str(correct).strip(), re.I)
    if not m:
        return out
    base = int(m.group(1))
    for off in (1, 2, 3, 4, 5, 6, 8, 10, 12, 15):
        for sign in (1, -1):
            cand = f"ISA {base + sign * off:+d}"
            if norm_opt(cand) not in seen:
                seen.add(norm_opt(cand))
                out.append(cand)
            if len(out) >= 6:
                return out
    return out


def unique_wrongs(correct, candidates, fillers=None):
    seen = {norm_opt(correct)}
    wrongs = []
    for c in candidates:
        if norm_opt(c) not in seen:
            seen.add(norm_opt(c))
            wrongs.append(c)
        if len(wrongs) >= 3:
            return wrongs[:3]
    for c in fillers or []:
        if norm_opt(c) not in seen:
            seen.add(norm_opt(c))
            wrongs.append(c)
        if len(wrongs) >= 3:
            return wrongs[:3]
    for c in numeric_fillers(correct, set(seen)):
        if norm_opt(c) not in seen:
            seen.add(norm_opt(c))
            wrongs.append(c)
        if len(wrongs) >= 3:
            return wrongs[:3]
    for c in isa_fillers(correct, set(seen)):
        if norm_opt(c) not in seen:
            seen.add(norm_opt(c))
            wrongs.append(c)
        if len(wrongs) >= 3:
            return wrongs[:3]
    n = 2
    generic = [
        "Réponse incorrecte — voir fiche",
        "Non conforme à la réglementation",
        "Valeur hors plage réglementaire",
        "Pratique non standard en aviation",
    ]
    for g in generic:
        if norm_opt(g) not in seen:
            seen.add(norm_opt(g))
            wrongs.append(g)
        if len(wrongs) >= 3:
            return wrongs[:3]
    while len(wrongs) < 3:
        cand = f"Alternative {n}"
        if norm_opt(cand) not in seen:
            seen.add(norm_opt(cand))
            wrongs.append(cand)
        n += 1
    return wrongs[:3]


def shuffle_opts(correct, wrongs, fillers=None):
    wrongs = unique_wrongs(correct, wrongs, fillers)
    opts = [correct] + list(wrongs)
    random.shuffle(opts)
    return opts, opts.index(correct)


def altitude_wrongs(alt, corr, z_real):
    step = max(50, corr if corr else max(50, alt // 20))
    cands = []
    for m in range(-4, 5):
        v = alt + m * step
        if v >= 0:
            cands.append(f"{v} ft")
    for off in (step, 2 * step, 3 * step, -step, -2 * step, 75, 125):
        v = z_real + off
        if v >= 0:
            cands.append(f"{v} ft")
    return unique_wrongs(f"{z_real} ft", cands)


def assert_unique_opts(item):
    opts = item["o"]
    norms = [norm_opt(o) for o in opts]
    if len(set(norms)) != len(norms):
        raise ValueError(f"Doublons dans options: {item['q'][:80]} -> {opts}")
    if norms[item["a"]] != norm_opt(opts[item["a"]]):
        raise ValueError("Index réponse invalide")


def dedupe_key(item):
    return re.sub(r"\s+", " ", item["q"].strip().lower())


def family_key(item):
    text = item["q"].strip().lower()
    text = re.sub(r"fl\d+", "fl#", text, flags=re.I)
    text = re.sub(r"\d+(?:[.,]\d+)?", "#", text)
    text = re.sub(r"\s+", " ", text)
    return f"{item['r'].lower()}::{text[:96]}"


def quality_score(item):
    diff_score = {1: 35, 2: 100, 3: 92, 4: 75}.get(item["d"], 50)
    return diff_score + min(len(item.get("e", "")), 140)


def dedupe_by_family(bank):
    """Une question représentative par famille — évite les variantes numériques répétitives."""
    best = {}
    for item in bank:
        fk = family_key(item)
        score = quality_score(item)
        if fk not in best or score > best[fk][0]:
            best[fk] = (score, item)
    return [pair[1] for pair in best.values()]


def load_existing():
    text = HTML.read_text(encoding="utf-8")
    m = re.search(r"const Q=\[(.*?)\];", text, re.S)
    if not m:
        return []
    block = m.group(1)
    items = []
    for raw in re.finditer(
        r'\{m:"([CAR])",d:(\d),q:"((?:\\.|[^"\\])*)",o:\[(.*?)\],a:(\d),e:"((?:\\.|[^"\\])*)",r:"((?:\\.|[^"\\])*)"\}',
        block,
    ):
        mod, diff, question, opts_raw, ans, expl, ref = raw.groups()
        opts = re.findall(r'"((?:\\.|[^"\\])*)"', opts_raw)
        items.append(
            q(mod, int(diff), question, opts, int(ans), expl, ref)
        )
    return items


# ─── COMMUNICATIONS ───────────────────────────────────────────
def gen_comm():
    qs = []
    ALPHABET = {
        "A": "Alfa", "B": "Bravo", "C": "Charlie", "D": "Delta", "E": "Echo",
        "F": "Foxtrot", "G": "Golf", "H": "Hotel", "I": "India", "J": "Juliet",
        "K": "Kilo", "L": "Lima", "M": "Mike", "N": "November", "O": "Oscar",
        "P": "Papa", "Q": "Quebec", "R": "Romeo", "S": "Sierra", "T": "Tango",
        "U": "Uniform", "V": "Victor", "W": "Whiskey", "X": "X-Ray", "Y": "Yankee", "Z": "Zulu",
    }
    FREQS = [
        ("121,500 MHz", "fréquence de détresse internationale"),
        ("123,500 MHz", "fréquence club des aérodromes à trafic réduit"),
        ("123,450 MHz", "communication entre aéronefs (air/air)"),
        ("123,065 MHz", "altisurfaces et altiports à trafic réduit"),
        ("125,335 MHz", "bases ULM"),
    ]
    PHRASES = [
        ("AFFIRME", "oui", "Phraséologie"),
        ("NÉGATIF", "non", "Phraséologie"),
        ("APPROUVÉ", "permission accordée", "Phraséologie"),
        ("AUTORISÉ", "décollage, atterrissage, toucher et option uniquement", "Phraséologie"),
        ("ROGER", "accusé de réception sans exécution", "Phraséologie"),
        ("WILCO", "compris et sera exécuté", "Phraséologie"),
        ("CORRECTION", "rectification du message précédent erroné", "Phraséologie"),
        ("BREAK BREAK", "séparer des messages sur fréquence encombrée", "Phraséologie"),
    ]
    COLLATE = ["Fréquence", "Code transpondeur", "Calage altimétrique", "Niveau ou altitude",
               "Cap", "Vitesse", "Piste en service", "Conditions d'une autorisation conditionnelle"]
    READ = {1: "illisible", 2: "lisible par moments", 3: "difficilement lisible", 4: "lisible", 5: "parfaitement lisible"}

    for letter, word in ALPHABET.items():
        wrong = [v for k, v in ALPHABET.items() if k != letter][:3]
        opts, a = shuffle_opts(word, wrong)
        qs.append(q("C", 1 if letter in "AEIOU" else 2,
            f"Mot code OACI pour la lettre '{letter}' ?",
            opts, a, f"{letter} = {word} dans l'alphabet aéronautique international.", "Alphabet OACI"))
        opts, a = shuffle_opts(letter, [k for k in ALPHABET if k != letter][:3])
        qs.append(q("C", 2, f"Quelle lettre correspond au mot code '{word}' ?",
            opts, a, f"{word} = lettre {letter}.", "Alphabet OACI"))

    for freq, role in FREQS:
        wrong = [f for f, _ in FREQS if f != freq][:3]
        opts, a = shuffle_opts(freq, wrong)
        qs.append(q("C", 1, f"Quelle fréquence est la {role} ?",
            opts, a, f"{freq} : {role}.", "Fréquences particulières"))
        opts, a = shuffle_opts(role, [r for _, r in FREQS if r != role][:3])
        qs.append(q("C", 2, f"À quoi sert la fréquence {freq} ?",
            opts, a, f"{freq} : {role}.", "Fréquences particulières"))

    for expr, meaning, ref in PHRASES:
        opts, a = shuffle_opts(meaning, [p[1] for p in PHRASES if p[0] != expr][:3])
        qs.append(q("C", 1 if expr in ("AFFIRME", "NÉGATIF", "ROGER") else 2,
            f"Que signifie '{expr}' en phraséologie ?",
            opts, a, f"{expr} = {meaning}.", ref))

    for i, item in enumerate(COLLATE):
        opts, a = shuffle_opts(item, [c for c in COLLATE if c != item][:3])
        qs.append(q("C", 2, "Quelle information doit être collationnée ?",
            opts, a, f"Les 8 éléments à collationner incluent : {', '.join(COLLATE)}.", "Collationnement"))

    for val, desc in READ.items():
        opts, a = shuffle_opts(desc, [READ[x] for x in READ if x != val][:3])
        qs.append(q("C", 1 if val in (1, 5) else 2,
            f"Échelle de lisibilité {val} signifie :",
            opts, a, f"Échelle 1-5 : {val} = {desc}.", "Lisibilité radio"))

    heights = list(range(50, 25001, 50))
    for h in heights:
        d = round(1.23 * math.sqrt(h), 1)
        ans = f"{d} NM"
        wrong = unique_wrongs(ans, [f"{round(1.23*math.sqrt(x),1)} NM" for x in [h*0.5, h*1.5, h*2] if x > 0])
        opts, a = shuffle_opts(ans, wrong)
        diff = 1 if h <= 1600 else (2 if h <= 4900 else (3 if h <= 10000 else 4))
        qs.append(q("C", diff, f"Portée VHF théorique à {h} ft (D = 1,23 √h) ?",
            opts, a, f"D = 1,23 × √{h} = {d} NM. Propagation optique VHF.", "Calcul portée VHF"))

    bands = [
        ("108 à 111,975 MHz", "ILS et VOR"),
        ("112 à 117,975 MHz", "VOR et DME"),
        ("117,975 à 137 MHz", "échanges radio et ATIS"),
        ("108 à 137 MHz", "gamme VHF aéronautique totale"),
    ]
    for band, use in bands:
        opts, a = shuffle_opts(use, [u for _, u in bands if u != use][:3])
        qs.append(q("C", 2, f"Bande {band} : usage principal ?",
            opts, a, f"{band} = {use}.", "Bandes VHF"))

    qs += [
        q("C", 1, "Gamme VHF aéronautique :", ["88-108 MHz", "108-137 MHz", "118-156 MHz", "100-140 MHz"],
          1, "108 à 137 MHz : radionavigation + radiocommunication.", "Bandes VHF"),
        q("C", 1, "Mot de détresse international :", ["SOS ×3", "MAYDAY ×3", "URGENT ×3", "PAN-PAN ×3"],
          1, "MAYDAY ×3 = détresse. PAN-PAN ×3 = urgence.", "Priorité messages"),
        q("C", 2, "Priorité des messages (plus haute en premier) :",
          ["Contrôle > Détresse", "Détresse > Urgence > Contrôle > Info vol > Exploitants",
           "Info vol > Détresse", "Urgence > Détresse"], 1,
          "1.Détresse 2.Urgence 3.Contrôle 4.Info vol 5.Exploitants.", "Priorité messages"),
        q("C", 2, "Indicatif abrégé F-GAIS :", ["F-GA", "F-IS", "F-GIS", "G-IS"], 1,
          "1ère lettre + 2 dernières : F-IS.", "Indicatifs d'appel"),
        q("C", 2, "Suffixe callsign jamais omissible :", ["TOUR", "RADAR", "INFO", "SOL"], 2,
          "INFO ne peut jamais être omis (ex: TOULOUSE INFO).", "Contact radio"),
        q("C", 2, "Vent METAR/TAF orienté par rapport au :", ["Nord magnétique", "Nord vrai", "Nord piste", "Nord carte"],
          1, "METAR/TAF = Nord vrai. Radio (ATIS/TWR) = Nord magnétique.", "Vent - référence"),
        q("C", 3, "F-GOIS et F-GRIS en même temps : abréviation F-GOIS ?", ["F-IS", "F-OIS", "F-GIS", "F-OS"], 1,
          "Risque confusion → F-OIS et F-RIS.", "Indicatifs d'appel"),
        q("C", 2, "Accusé de réception vs collationnement :",
          ["Identiques", "Accusé = simple (ROGER) ; collationnement = répétition partielle/totale",
           "Collationnement = sans répéter", "Roger = exécution"], 1,
          "ROGER = accusé. Collationnement = répéter fréquence, cap, etc.", "Confirmation de réception"),
        q("C", 2, "Quitter une fréquence sans autorisation :", ["Courtoisie", "Le contrôleur peut croire l'avion en difficulté",
          "Éviter interférences", "Facultatif"], 1,
          "Sans accord = risque de déclenchement secours.", "Règles générales radio"),
    ]
    return qs


# ─── AÉRONEF ──────────────────────────────────────────────────
def gen_aero():
    qs = []
    GREEK = {"α": "alpha", "β": "béta", "γ": "gamma", "δ": "delta", "ε": "epsilon",
             "θ": "thêta", "λ": "lambda", "μ": "mu", "π": "pi", "ρ": "rho", "σ": "sigma",
             "φ": "phi", "ω": "oméga"}
    DEFS = [
        ("Bord d'attaque", "partie avant de l'aile", 1),
        ("Bord de fuite", "partie arrière de l'aile", 1),
        ("Corde", "droite reliant bord d'attaque au bord de fuite", 1),
        ("Envergure (E)", "distance entre extrémités de l'aile", 1),
        ("Surface alaire (S)", "surface totale incluant partie du fuselage", 2),
        ("Voie", "distance entre les 2 jambes des trains principaux", 1),
        ("Empattement", "distance trains principaux ↔ train auxiliaire", 2),
        ("Dièdre", "angle entre axe de l'aile et l'horizontale", 2),
        ("Angle de garde", "angle entre verticale par CG et axe trains principaux", 2),
        ("Angle de déport", "angle entre verticale et axe du train avant", 3),
        ("Flèche", "angle entre perpendiculaire à l'axe longitudinal et bord d'attaque", 2),
        ("Saumon", "extrémité d'aile profilée", 2),
        ("Implanture", "jonction aile-fuselage", 2),
    ]
    for term, defn, diff in DEFS:
        opts, a = shuffle_opts(defn, [d[1] for d in DEFS if d[0] != term][:3])
        qs.append(q("A", diff, f"Qu'est-ce que {term} ?", opts, a, f"{term} = {defn}.", "Géométrie avion"))

    qs.append(q("A", 2, "Dièdre des avions Robin :", ["0°", "+7°", "+14°", "+21°"], 2,
                "Dièdre Robin = +14° (ailes relevées).", "Géométrie - dièdre"))

    CYCLE = [
        ("Admission", "soupape admission ouverte, piston descend", 1),
        ("Compression", "2 soupapes fermées, piston compresse le mélange", 1),
        ("Explosion/Détente", "seul temps moteur, piston entraîne vilebrequin", 1),
        ("Échappement", "soupape échappement ouvre, gaz brûlés évacués", 1),
    ]
    for name, desc, diff in CYCLE:
        opts, a = shuffle_opts(desc, [c[1] for c in CYCLE if c[0] != name][:3])
        qs.append(q("A", diff, f"Cycle 4 temps — {name} :", opts, a, f"{name} : {desc}.", "Cycle 4 temps"))

    qs += [
        q("A", 1, "Cycle complet = combien d'allers-retours piston ?", ["1", "2", "3", "4"], 1,
          "4 temps = 2 allers-retours.", "Cycle 4 temps"),
        q("A", 1, "Temps moteur du cycle 4 temps :", ["Admission", "Compression", "Explosion", "Échappement"], 2,
          "Explosion = seul temps moteur.", "Cycle 4 temps"),
        q("A", 1, "Couleur AVGAS 100LL :", ["Incolore", "Jaune", "Bleutée", "Brune"], 2,
          "AVGAS 100LL bleutée. JET A1 brun/incolore.", "Moteur - carburants"),
        q("A", 1, "Formule pressions anémométriques :", ["Pt=Ps-Pd", "Pt=Ps+Pd", "Pd=Pt+Ps", "Ps=Pt×Pd"], 1,
          "Pt = Ps + Pd.", "Circuit anémométrique"),
    ]

    VSPEEDS = [
        ("Vs0", "décrochage configuration atterrissage", 2),
        ("Vs1", "décrochage sans volets", 2),
        ("VFE", "vitesse max volets sortis", 2),
        ("VLE", "vitesse max train sorti", 2),
        ("VLO", "vitesse max sortie/rentrée train", 2),
        ("VNO", "vitesse max en air turbulent", 2),
        ("VNE", "vitesse à ne jamais dépasser", 1),
        ("VA", "vitesse de manœuvre (braquage gouvernes)", 2),
    ]
    for code, meaning, diff in VSPEEDS:
        opts, a = shuffle_opts(meaning, [v[1] for v in VSPEEDS if v[0] != code][:3])
        qs.append(q("A", diff, f"Que représente {code} ?", opts, a, f"{code} = {meaning}.", "Vitesses caractéristiques"))

    ARCS = [
        ("Arc blanc", "volets sortis, Vs0 à VFE", 1),
        ("Arc vert", "vol normal en lisse, Vs1 à VNO", 1),
        ("Arc jaune", "VNO à VNE, air calme uniquement", 1),
        ("Trait rouge", "VNE", 1),
    ]
    for arc, meaning, diff in ARCS:
        opts, a = shuffle_opts(meaning, [x[1] for x in ARCS if x[0] != arc][:3])
        qs.append(q("A", diff, f"{arc} sur l'anémomètre :", opts, a, f"{arc} = {meaning}.", "Anémomètre - arcs"))

    # Calculs Vp — cas représentatifs (pas de génération exhaustive)
    VP_CASES = [
        (100, 10, 0), (120, 50, -8), (90, 100, 12), (110, 150, -10),
        (100, 200, 5), (95, 80, 16), (105, 120, -4), (115, 180, 20),
        (100, 250, -12), (130, 30, 8), (88, 60, -6), (102, 140, 0),
    ]
    for vi, fl, t_offset in VP_CASES:
        alt_tranches = fl * 10 // 6
        t_std = 15 - 2 * (fl // 10)
        t = t_std + t_offset
        corr_alt = alt_tranches
        corr_t = abs(t - t_std) // 4
        vp = round(vi * (1 + corr_alt/100) * (1 + corr_t/100))
        wrong = unique_wrongs(f"{vp} kt", [f"{max(vi, vp-12)} kt", f"{vp+12} kt", f"{vi} kt"], [f"{vp+6} kt", f"{max(vi, vp-6)} kt"])
        opts, a = shuffle_opts(f"{vp} kt", wrong)
        diff = min(4, 2 + corr_t // 2)
        qs.append(q("A", diff,
            f"Vi={vi} kt FL{fl:03d}, T°={t:+d}°C (std {t_std:+d}°C). Vp ?",
            opts, a, f"+1%/600ft + ±1%/4°C → {vp} kt.", "Calcul Vp"))

    ALT_CASES = [
        (2000, 26, 11), (5000, -10, 5), (8000, 0, -8), (1000, 30, 20),
        (3500, 15, 2), (12000, -20, -13), (6000, 5, 18), (4500, -5, -15),
    ]
    for alt, t_real, t_std in ALT_CASES:
        ecart = abs(t_real - t_std)
        corr = round(4 * (alt/1000) * ecart)
        z_real = alt - corr if t_real < t_std else alt + corr
        wrong = altitude_wrongs(alt, corr, z_real)
        opts, a = shuffle_opts(f"{z_real} ft", wrong)
        qs.append(q("A", 3 if ecart > 12 else 2,
            f"Altimètre {alt} ft, T° {t_real:+d}°C, std {t_std:+d}°C. Altitude réelle ?",
            opts, a, f"4×(alt/1000)×écart = {corr} ft → {z_real} ft.", "Correction altimétrique T°"))

    PANNES = [
        ("Pitot obstrué en montée", "Vi augmente", 3),
        ("Pitot obstrué en descente", "Vi diminue", 3),
        ("Statique obstruée", "altimètre bloqué à altitude obstruction", 3),
        ("Statique obstruée en montée", "Vi inférieure à réelle", 3),
        ("Statique obstruée en descente", "Vi supérieure à réelle", 3),
        ("Statique obstruée — variomètre", "aucune Vz indiquée", 3),
    ]
    for situation, effet, diff in PANNES:
        opts, a = shuffle_opts(effet, [p[1] for p in PANNES if p[0] != situation][:3])
        qs.append(q("A", diff, f"Pan {situation} : effet ?", opts, a, f"{situation} → {effet}.", "Pannes circuit anémométrique"))

    qs += [
        q("A", 2, "Variomètre : instrument utilisant :", ["Tube Pitot", "Capsule seule", "Tube capillaire", "Gyroscope"], 2,
          "Variomètre = tube capillaire → retard Ps → Vz.", "Variomètre"),
        q("A", 2, "Délai variomètre après changement trajectoire :", ["1-2 s", "4-5 s", "10 s", "Instantané"], 1,
          "Attendre 4-5 s pour indication fiable.", "Variomètre"),
        q("A", 2, "1 m/s ≈ en ft/min :", ["100", "150", "200", "300"], 2,
          "1 m/s ≈ 200 ft/min.", "Variomètre"),
        q("A", 2, "Horizon artificiel : propriété gyro :", ["Précession", "Fixité", "Rigidité", "Dérive"], 1,
          "HA = fixité, 2 degrés liberté.", "Horizon artificiel"),
        q("A", 2, "Coordinateur de virage : propriété gyro :", ["Fixité", "Précession", "Rigidité", "Dérive"], 1,
          "Coordinateur = précession, 1 degré liberté.", "Coordinateur de virage"),
        q("A", 2, "Taux virage standard (taux 1) :", ["180°/min", "360°/2min (3°/s)", "90°/30s", "360°/4min"], 1,
          "Taux 1 = 360° en 2 min.", "Coordinateur de virage"),
        q("A", 2, "Recalage conservateur de cap :", ["5 min", "10 min", "~20 min palier", "1 h"], 2,
          "Recalage ~20 min sur compas magnétique.", "Conservateur de cap"),
        q("A", 2, "Calage abandonné :", ["QNH", "QFE", "1013,25 hPa", "Standard"], 1,
          "QFE abandonné. QNH et 1013,25 hPa utilisés.", "Calages altimétriques"),
        q("A", 2, "Fenêtre calage altimètre :", ["Badin", "Kolsman", "Pitot", "Bernoulli"], 1,
          "Fenêtre de Kolsman.", "Altimètre"),
        q("A", 3, "Détonation moteur :", ["Bougies encrassées", "Explosion prématurée par T° élevée", "Vibrations vilebrequin", "Carburation"], 1,
          "Détonation ≠ auto-allumage.", "Défauts moteur"),
        q("A", 3, "Auto-allumage :", ["Démarrage", "Particules sur bougies allument encore après coupure", "Spontané carburant", "Panne circuit"], 1,
          "Cendres/carbone sur bougies.", "Défauts moteur"),
        q("A", 2, "Hélice calage fixe — puissance indiquée par :", ["Manomètre", "Tachymètre", "Anémomètre", "Variomètre"], 1,
          "Calage fixe = tachymètre (rpm).", "Hélice à calage fixe"),
        q("A", 3, "Hélice vitesse constante — puissance par :", ["Tachymètre hélice", "Manomètre in Hg", "Anémomètre", "Variomètre"], 1,
          "VPC = manomètre pression admission.", "Hélice à vitesse constante"),
        q("A", 2, "Petit pas hélice adapté à :", ["Croisière", "Décollage/remise gaz", "Descente", "Vol lent"], 1,
          "Petit pas = décollage. Grand pas = croisière.", "Hélice à vitesse constante"),
        q("A", 2, "100 kt en km/h (×2 -10%) :", ["160", "180", "200", "185"], 1,
          "100×2-10% = 180 km/h.", "Conversion kt/km/h"),
    ]

    for gsym, gname in GREEK.items():
        others = [n for s, n in GREEK.items() if s != gsym][:3]
        opts, a = shuffle_opts(gname, others)
        qs.append(q("A", 2, f"Lettre grecque {gsym} ({gsym}) en aéronautique :", opts, a,
                    f"{gsym} = {gname}.", "Alphabet grec"))

    return qs


# ─── MÉTÉOROLOGIE ─────────────────────────────────────────────
def gen_meteo():
    qs = []
    for ft in range(0, 361):
        t = 15 - 2 * ft
        wrong = [f"{t+4}°C", f"{t-4}°C", f"{15-ft}°C"]
        opts, a = shuffle_opts(f"{t:+d}°C", wrong)
        diff = 1 if ft <= 5 else (2 if ft <= 15 else 3)
        qs.append(q("M", diff, f"T° ISA à {ft*1000} ft ?", opts, a,
                    f"+15 - (2×{ft}) = {t:+d}°C.", "ISA - calcul T°"))

    GRADIENTS = [(0, 28), (5000, 30), (10000, 37), (18000, 50), (30000, 75)]
    for alt, grad in GRADIENTS:
        opts, a = shuffle_opts(f"1 hPa / {grad} ft", [f"1 hPa / {g} ft" for _, g in GRADIENTS if g != grad][:3])
        qs.append(q("M", 2, f"Gradient pression ISA à {alt} ft ?", opts, a,
                    f"À {alt} ft : 1 hPa pour {grad} ft.", "Pression - gradients"))

    NEB = [("NSC", "0 octas", "Pas de nuages significatifs"), ("FEW", "1-2", "Peu"),
           ("SCT", "3-4", "Epars"), ("BKN", "5-7", "Fragmentés — plafond"), ("OVC", "8", "Couvert — plafond")]
    for code, octas, qual in NEB:
        opts, a = shuffle_opts(f"{octas} octas — {qual}", [f"{n[1]} — {n[2]}" for n in NEB if n[0] != code][:3])
        qs.append(q("M", 1 if code in ("NSC", "OVC") else 2, f"Nébulosité {code} ?", opts, a,
                    f"{code} = {octas} octas.", "Nébulosité"))

    CLOUDS = [("Ci", "Cirrus"), ("Cs", "Cirrostratus"), ("Ac", "Altocumulus"), ("As", "Altostratus"),
              ("Ns", "Nimbostratus"), ("Sc", "Stratocumulus"), ("Cu", "Cumulus"), ("Tcu", "Tower Cumulus"), ("Cb", "Cumulonimbus")]
    for abbr, name in CLOUDS:
        opts, a = shuffle_opts(name, [c[1] for c in CLOUDS if c[0] != abbr][:3])
        qs.append(q("M", 2, f"Abréviation nuage {abbr} ?", opts, a, f"{abbr} = {name}.", "Classification nuages"))

    for kt in range(5, 101, 5):
        parts = []
        rem = kt
        if rem >= 50:
            parts.append("triangle(50)")
            rem -= 50
        while rem >= 10:
            parts.append("trait long(10)")
            rem -= 10
        if rem >= 5:
            parts.append("trait court(5)")
            rem -= 5
        desc = " + ".join(parts) if parts else "aucune barbule"
        wrong_kts = [kt + 5, kt - 5, kt + 15]
        wrong = []
        for w in wrong_kts:
            if w <= 0: continue
            wp = []
            r = w
            if r >= 50: wp.append("▲"); r -= 50
            wp.extend(["—"] * (r // 10))
            if r % 10 >= 5: wp.append("–")
            wrong.append(f"{w} kt ({''.join(wp)})")
        opts, a = shuffle_opts(f"{kt} kt ({desc})", wrong[:3])
        qs.append(q("M", 2 if kt <= 50 else 3, f"Vent {kt} kt sur carte WINTEM : symbole ?",
                    opts, a, "▲=50, trait long=10, trait court=5 kt.", "Cartes WINTEM"))

    fronts = [
        ("Front froid", "pente 1/50 à 1/150", "T↓ puis stable, P↓ puis ↑", 2),
        ("Front chaud", "pente 1/300 à 1/500", "T↑, P↓, visibilité↓", 2),
        ("Front occlus", "froid rattrape chaud", "secteur chaud rejeté en altitude", 3),
        ("Front stationnaire", "masses ne bougent pas", "déplacement quasi nul", 2),
    ]
    for name, pente, evol, diff in fronts:
        qs.append(q("M", diff, f"{name} — pente typique ?", 
            [pente, "1/1000", "verticale", "1/2000"], 0, f"{name} : {pente}.", "Fronts - pentes"))
        opts, a = shuffle_opts(evol, [f[2] for f in fronts if f[0] != name][:3])
        qs.append(q("M", diff, f"Passage {name.lower()} — évolution typique ?",
            opts, a, f"{name} : {evol}.", f"{name} - paramètres"))

    qs += [
        q("M", 1, "Pression ISA au niveau de la mer :", ["1000 hPa", "1013,25 hPa", "1020 hPa", "1008 hPa"], 1,
          "P=1013,25 hPa, T=+15°C, ρ=1,225 kg/m³.", "Atmosphère type ISA"),
        q("M", 1, "Décroissance T° ISA :", ["1°C/1000ft", "2°C/1000ft", "3°C/1000ft", "6,5°C/1000ft"], 1,
          "-2°C/1000ft jusqu'à tropopause 36000ft.", "ISA - température"),
        q("M", 1, "CAVOK signifie :", ["Ciel couvert", "Vis>10km + pas nuage sous 5000ft + pas Cb/Tcu + pas temps sig.", "Conditions dégradées", "Vol autorisé"], 1,
          "4 conditions cumulatives CAVOK.", "METAR - CAVOK"),
        q("M", 1, "Validité TAF court :", ["3h", "6h", "9h", "24h"], 2,
          "TAF court 9h, émis /3h. TAF long 24-30h.", "TAF - validité"),
        q("M", 1, "Vent se déplace des :", ["Basses→hautes P", "Hautes→basses P", "Chaud→froid", "Est→ouest"], 1,
          "Gradient de pression + Coriolis.", "Vent - origine"),
        q("M", 2, "Buys-Ballot HN, dos au vent, dépression :", ["Devant", "À droite", "À gauche", "Derrière"], 2,
          "HN : dépression à gauche.", "Vent - Buys-Ballot"),
        q("M", 2, "Vent HN autour dépression :", ["Horaire", "Anti-horaire", "Radial centre", "Radial extérieur"], 1,
          "HN : anti-horaire dépressions.", "Vent - Coriolis"),
        q("M", 2, "Vent au sol vs altitude (>3000ft) HN :", ["Identique", "Dévié ~30° gauche, 30-50% plus faible", "Dévié droite, plus fort", "Inverse"], 1,
          "Friction + effet surface.", "Vent au sol vs altitude"),
        q("M", 2, "TEMSI France couvre :", ["Surface-FL450 std", "Surface-15000ft QNH", "FL100-FL450", "Surface-FL195 QNH"], 1,
          "TEMSI France : surface-15000ft QNH.", "Cartes TEMSI"),
        q("M", 2, "TEMSI EUROC :", ["QNH pieds", "Surface-FL450 calage 1013,25 (FL)", "Surface-15000 QNH", "FL100-FL450"], 1,
          "TEMSI EUROC = niveaux de vol.", "Cartes TEMSI"),
        q("M", 2, "BECMG dans TAF :", ["Stable", "Évolution sur ~2h (<4h)", "Fluctuations <1h", "Changement immédiat"], 1,
          "BECMG=becoming. TEMPO=fluctuations.", "TAF - codes"),
        q("M", 2, "NOSIG :", ["Pas signal radio", "Pas changement significatif 2h", "Nuages NS", "Nuit sans vis"], 1,
          "No Significant Change.", "METAR - NOSIG"),
        q("M", 2, "9999 visibilité METAR :", ["0", "9999 m", "10 km ou plus", "Indisponible"], 2,
          "9999 = ≥10 km.", "METAR - visibilité"),
        q("M", 2, "Point de rosée :", ["T° gel", "T° saturation 100% humidité", "T° standard mer", "T° min jour"], 1,
          "En dessous : condensation/brume.", "Température - point de rosée"),
        q("M", 2, "Inversion température :", ["T° diminue altitude", "T° constante", "T° augmente altitude", "T° oscille"], 2,
          "Anormal : T° croît avec altitude.", "Température - définitions"),
        q("M", 2, "Adiabatique sec :", ["2°C/1000ft", "3°C/1000ft", "1,5°C/1000ft", "6,5°C/1000m"], 1,
          "Sec=3°C/1000ft. Saturé≈1,5°C/1000ft.", "Stabilité - adiabatiques"),
        q("M", 3, "Atmosphère 4°C/1000ft :", ["Stable", "Instable", "Neutre", "Conditionnelle"], 1,
          ">3°C/1000ft adiabatique sec → instable.", "Stabilité atmosphérique"),
        q("M", 2, "Perturbation : vitesse et durée :", ["10kt, 2-3j", "25kt, 5-7j", "50kt, 1-2j", "100kt, 12h"], 1,
          "~25 kt, 5-7 jours.", "Perturbations"),
        q("M", 1, "Anticyclone :", ["Basses pressions", "Hautes pressions", "Turbulences", "Brouillard"], 1,
          "Anticyclone=hautes P. Thalweg=basses P.", "Champ de pression"),
        q("M", 1, "Thalweg :", ["Hautes P", "Axe basses pressions", "Transition", "Vent fort"], 1,
          "Thalweg=vallée barométrique.", "Champ de pression"),
        q("M", 2, "Marais barométrique :", ["Dépression profonde", "Grande zone P~1013 hPa peu variable", "Anticyclone affaibli", "Turbulences"], 1,
          "Météo médiocre, peu de vent.", "Champ de pression"),
        q("M", 3, "Marée barométrique :", ["Gradient", "Variation ±1hPa/jour", "Cycle pression", "Oscillation"], 1,
          "Min ~6h/18h, max ~12h/24h.", "Pression - variations"),
        q("M", 2, "Air froid vs altimètre :", ["Sous-estime altitude", "Affiche plus haut que réel (on est plus bas)", "Plus rapide", "Nuages disparaissent"], 1,
          "Air froid contracté.", "T° et altimètre"),
        q("M", 3, "Vent METAR 26015G30KT :", ["26015KT", "26015G30KT", "26030G15KT", "260/15G30"], 1,
          "Direction+force+G+rafales+KT.", "METAR - vent"),
        q("M", 4, "PROB40 TAF :", ["Risque fort", "Probabilité modérée 40%", "Peu probable", "Certain"], 1,
          "PROB40=40% modéré. PROB30=faible.", "TAF - PROB"),
    ]

    winds = [("Mistral", "Nord couloir rhodanien"), ("Tramontane", "O-NO Pyrénées/MC/Languedoc"),
             ("Autan", "S-SE Languedoc/Roussillon"), ("Marin", "SE côtes humide Languedoc")]
    for name, desc in winds:
        opts, a = shuffle_opts(desc, [w[1] for w in winds if w[0] != name][:3])
        qs.append(q("M", 2, f"Vent régional {name} :", opts, a, f"{name} : {desc}.", "Vents régionaux"))

    for alt in range(2000, 16000, 1000):
        t_std = 15 - 2 * (alt // 1000)
        for t_real in range(t_std - 25, t_std + 26, 5):
            ecart = abs(t_real - t_std)
            corr = round(4 * (alt/1000) * ecart)
            z = alt - corr if t_real < t_std else alt + corr
            wrong = altitude_wrongs(alt, corr, z)
            opts, a = shuffle_opts(f"{z} ft", wrong)
            qs.append(q("M", 3 if ecart > 10 else 2,
                f"Altimètre {alt} ft, T° {t_real:+d}°C, std {t_std:+d}°C. Altitude réelle ?",
                opts, a, f"4×(alt/1000)×écart = {corr} ft.", "Correction altimétrique T°"))

    return qs


# ─── RÉGLEMENTATION ─────────────────────────────────────────────
def gen_reg():
    qs = []
    FIR = [("Paris", "LFFF"), ("Brest", "LFRR"), ("Bordeaux", "LFBB"), ("Reims", "LFEE"), ("Marseille", "LFMM")]
    for name, code in FIR:
        opts, a = shuffle_opts(code, [c for _, c in FIR if c != code][:3])
        qs.append(q("R", 2, f"Code OACI FIR {name} ?", opts, a, f"FIR {name} = {code}.", "Espace aérien - FIR"))

    CLASSES = [
        ("A", "IFR uniquement, VFR interdit", 1),
        ("B", "IFR et VFR, séparation totale", 2),
        ("C", "IFR/VFR, séparation IFR-IFR et IFR-VFR", 2),
        ("D", "IFR/VFR, séparation IFR-IFR uniquement", 2),
        ("E", "IFR/VFR, pas de séparation ATS", 2),
        ("F", "IFR/VFR advisory", 3),
        ("G", "IFR/VFR, info vol seulement", 2),
    ]
    for cls, rule, diff in CLASSES:
        opts, a = shuffle_opts(rule, [c[1] for c in CLASSES if c[0] != cls][:3])
        qs.append(q("R", diff, f"Classe d'espace {cls} :", opts, a, f"Classe {cls} : {rule}.", "Espace aérien"))

    for route in range(0, 360, 15):
        is_west = 180 <= route < 360
        fl_vfr = "pair + 500 ft" if is_west else "impair + 500 ft"
        examples = ("FL045,065,085..." if is_west else "FL035,055,075...")
        wrong = "impair + 500 ft" if is_west else "pair + 500 ft"
        qs.append(q("R", 2, f"Route magnétique {route:03d}° — FL VFR ?",
            [fl_vfr, wrong, "pair entier", "impair entier"], 0,
            f"Route {route}° → {fl_vfr} ({examples}).", "Règle semi-circulaire"))

    SURVOL = [
        ("Hors agglomération", "150m/500ft au-dessus obstacle +500ft/150m rayon", 1),
        ("Agglo <1200m", "1700 ft", 2),
        ("Agglo 1200-3600m", "3300 ft", 2),
        ("Agglo >3600m", "5000 ft", 2),
        ("Parcs naturels", "3300 ft", 2),
        ("Réserves naturelles", "1000 ft", 2),
        ("Hôpitaux/autoroutes", "1000 ft", 2),
        ("VFR nuit hors montagne", "1500 ft au-dessus obstacle autour", 3),
    ]
    for zone, h, diff in SURVOL:
        wrong = unique_wrongs(h, [s[1] for s in SURVOL if s[1] != h], ["1000 ft", "1500 ft", "2000 ft", "3300 ft", "5000 ft"])
        opts, a = shuffle_opts(h, wrong)
        qs.append(q("R", diff, f"Hauteur minimale survol — {zone} ?", opts, a, f"{zone} : {h}.", "Hauteurs de survol"))

    PRIORITY = [
        ("En vol vs au sol", "En vol prioritaire", 1),
        ("Convergentes même catégorie", "Venant de droite", 1),
        ("Dépassement", "Par la droite", 1),
        ("Rapprochement face", "Évitement vers la droite", 1),
        ("Catégories différentes", "Moins manœuvrant prioritaire", 2),
    ]
    for rule, ans, diff in PRIORITY:
        opts, a = shuffle_opts(ans, [p[1] for p in PRIORITY if p[0] != rule][:3])
        qs.append(q("R", diff, f"Priorité — {rule} ?", opts, a, f"{rule} : {ans}.", "Règles de priorité"))

    qs += [
        q("R", 1, "Âge minimal LAPL/PPL :", ["14", "16", "17", "18"], 2, "17 ans obtention, 16 ans solo.", "Licences LAPL/PPL"),
        q("R", 1, "LAPL/PPL rémunération :", ["Oui", "Non", "Passagers OK", "Instructeur OK"], 1, "Non rémunéré. CPL/ATPL oui.", "Licences LAPL/PPL"),
        q("R", 1, "SERA signifie :", ["Safety European Rules", "Standardised European Rules of the Air", "Standard European Reg Airspace", "Security Rules"], 1,
          "SERA depuis 4 déc 2014.", "SERA"),
        q("R", 2, "LAPL expérience minimale :", ["20h", "30h dont 15 DC + 6 solo (80NM)", "45h", "40h"], 1,
          "LAPL : 30h total.", "Licence LAPL"),
        q("R", 2, "PPL expérience minimale :", ["30h", "40h", "45h dont 25 DC + 10 solo (150NM)", "50h"], 2,
          "PPL : 45h total.", "Licence PPL"),
        q("R", 2, "Examen théorique :", ["100 QCM 60%", "128 QCM 9 épreuves 75%", "150 QCM 70%", "128 QCM 6 épreuves 80%"], 1,
          "128 QCM, 9 épreuves, 75% chacune.", "Examen théorique"),
        q("R", 2, "Validité SEP :", ["12 mois", "18 mois", "24 mois", "36 mois"], 2,
          "SEP = 24 mois, dernier jour du mois.", "Qualification SEP"),
        q("R", 2, "Certificat médical PPL <40 ans :", ["12 mois", "24 mois", "60 mois", "36 mois"], 2,
          "Classe 2 : 60/24/12 mois selon âge.", "Certificat médical"),
        q("R", 2, "Certificat médical PPL 40-50 ans :", ["60 mois", "24 mois", "12 mois", "6 mois"], 1,
          "Entre 40 et 50 ans = 24 mois.", "Certificat médical"),
        q("R", 2, "Certificat médical PPL >50 ans :", ["60 mois", "24 mois", "12 mois", "6 mois"], 2,
          "Après 50 ans = 12 mois.", "Certificat médical"),
        q("R", 2, "Certificat médical LAPL >40 ans :", ["60 mois", "24 mois", "12 mois", "36 mois"], 1,
          "LAPL >40 ans = 24 mois.", "Certificat médical LAPL"),
        q("R", 4, "Masse max LAPL :", ["750 kg", "2 tonnes", "3175 kg", "5700 kg"], 1,
          "LAPL <2t, max 3 passagers.", "Licence LAPL - privilèges"),
        q("R", 2, "Prorogation vs renouvellement :", ["Synonymes", "Prorogation avant / renouvellement après expiration", "Inverse", "Prorogation=FE"], 1,
          "Renouvellement nécessite vol FE.", "Prorogation / Renouvellement"),
        q("R", 3, "Prorogation SEP par expérience :", ["12 HdV 24 mois", "12 mois avant : 12 HdV dont 6 CDB + 1h FI + 12 décollages/atterrissages", "Vol FE", "6 HdV"], 1,
          "12 derniers mois avant expiration.", "Prorogation SEP"),
        q("R", 2, "FPL frontière : délai", ["30 min", "60 min avant départ", "2h", "En vol"], 1,
          "60 min avant, pas en vol.", "Plan de vol"),
        q("R", 2, "Vitesse 120 kt en FPL :", ["K0120", "N0120", "V0120", "M0120"], 1,
          "N=kt, K=km/h, F=FL.", "Plan de vol - paramètres"),
        q("R", 2, "Zone D (dangereuse) :", ["Interdite", "Sous conditions", "Non interdite mais activités dangereuses", "Militaire"], 2,
          "D=pénétration non interdite.", "Zones à statut particulier"),
        q("R", 2, "Zone R :", ["Interdite", "Sous conditions", "Dangereuse", "Libre"], 1, "R=réglementée sous conditions.", "Zones à statut particulier"),
        q("R", 2, "Zone P :", ["Interdite", "Sous conditions", "Dangereuse", "Libre"], 0, "P=interdite.", "Zones à statut particulier"),
        q("R", 2, "TMZ :", ["Trafic mixte", "Transpondeur obligatoire", "Militaire temporaire", "Contrôle terminal"], 1, "TMZ=Transponder Mandatory.", "SERA - nouvelles zones"),
        q("R", 2, "RMZ :", ["Transpondeur", "Radio obligatoire", "Militaire", "ATZ"], 1, "RMZ=Radio Mandatory.", "SERA - nouvelles zones"),
        q("R", 2, "ATZ :", ["Transpondeur", "Zone circulation aérodrome, radio obligatoire", "Interdite", "CTR"], 1, "ATZ=protection aérodrome sans CTR.", "SERA - nouvelles zones"),
        q("R", 2, "CTR France :", ["Classe C", "Classe D uniquement", "Classe E", "C ou D"], 1, "CTR=classe D.", "Espace aérien - CTR"),
        q("R", 3, "VMC EAC sous FL100 :", ["1,5 km", "5 km + 300m vert / 1500m horiz.", "8 km", "3 km"], 1,
          "EAC<FL100 : vis 5km.", "Conditions VMC - EAC"),
        q("R", 3, "VMC EANC Vi<140kt :", ["5 km", "8 km", "1,5 km hors nuages vue sol", "3 km"], 2,
          "800m hélicos.", "Conditions VMC - EANC"),
        q("R", 3, "VFR spécial CTR :", ["5 km", "1500m vis (800m hélico) + vi≤140kt + hors nuages vue sol + jour + plafond≥600ft", "3 km", "Nuit OK"], 1,
          "De jour uniquement.", "VFR spécial"),
        q("R", 3, "VFR nuit conditions météo :", ["Comme jour", "Vis≥5km, plafond≥1500ft, 300m/1500m espacement", "CAVOK", "Pas nuages"], 1,
          "VFR nuit conditions strictes.", "VFR nuit - conditions météo"),
        q("R", 3, "VFR nuit hauteur :", ["500 ft", "1000 ft", "1500 ft obstacle autour", "2000 ft"], 2,
          "1500 ft au-dessus obstacle.", "VFR nuit - hauteur"),
        q("R", 2, "Oxygène pilote vol>30min :", ["FL075", "FL100", "FL130", "FL150"], 1,
          "FL100 si >30min équipage. FL130 tous occupants.", "Équipements - oxygène"),
        q("R", 2, "Feu vert continu en vol :", ["Circuler sol", "Autorisé à atterrir", "Autorisé décoller", "Revenir"], 1,
          "Vert sol=décollage, vol=atterrir.", "Signaux lumineux"),
        q("R", 2, "Croix rouge 2 diagonales jaunes :", ["Précautions", "Atterrissages interdits", "Piste mouillée", "Travaux"], 1,
          "Interdiction atterrir.", "Signaux visuels au sol"),
        q("R", 2, "Haltère blanc :", ["Interdit", "Atterrissage/décollage/circulation sur pistes et voies uniquement", "T", "Fermé"], 1,
          "Haltère+barres=noires : circ libre ailleurs.", "Signaux visuels au sol"),
        q("R", 4, "Signal sol/air X :", ["Assistance", "Assistance médicale", "Non", "Terminé"], 1,
          "V=assistance, X=médical, N=non, Y=oui.", "Signaux sol/air"),
        q("R", 4, "Signal sol/air LL :", ["Rien trouvé", "Tous occupants retrouvés", "Partie seulement", "Terminé"], 1,
          "LLL=terminé, ++=partie.", "Signaux sol/air sauvetage"),
        q("R", 3, "Intercepteur virage montée 90°+ :", ["Suivez-moi", "Continuez route", "Atterrissez", "Demi-tour"], 1,
          "Réponse intercepté : balancer ailes.", "Signaux d'interception"),
        q("R", 3, "LAPL expérience récente 24 mois :", ["12 HdV", "12h CDB + 12 décollages/atterrissages + 1h FI", "6 HdV", "20 HdV"], 1,
          "24 derniers mois.", "LAPL - expérience récente"),
        q("R", 3, "FPL obligatoire :", ["Tout EAC", "Frontières, maritime, routes désignées, VFR nuit, IFR", "Tout >30min", "Tout contrôlé"], 1,
          "Liste complète réglementaire.", "Plan de vol - cas obligatoires"),
        q("R", 4, "TSA/TRA/CBA :", ["Interdites permanentes", "Zones temporaires ségrégation/réservation", "Transition", "Entraînement civil"], 1,
          "Usagers spécifiques temporaires.", "Zones temporaires"),
        q("R", 2, "Équipement VFR jour minimal :", ["Compas+altimètre", "Anémomètre, bille, compas, chrono, altimètre", "EFIS", "GPS+radio"], 1,
          "Liste réglementaire VFR jour.", "Équipements réglementaires"),
        q("R", 2, "Nombre FIR France métropolitaine :", ["3", "4", "5", "6"], 2,
          "Paris, Brest, Bordeaux, Reims, Marseille.", "Espace aérien - FIR"),
    ]

    lights = [
        ("Vert continu au sol", "Autorisé à décoller"),
        ("Vert continu en vol", "Autorisé à atterrir"),
        ("Vert clignotant en vol", "Revenez pour atterrir"),
        ("Rouge continu", "Atterrissage/décollage interdit"),
        ("Rouge clignotant", "Circulation aérodrome interdite"),
    ]
    for sig, mean in lights:
        opts, a = shuffle_opts(mean, [l[1] for l in lights if l[0] != sig][:3])
        qs.append(q("R", 2, f"Signal lumineux tour — {sig} ?", opts, a, f"{sig} = {mean}.", "Signaux lumineux"))

    return qs


def gen_bulk_meteo():
    qs = []
    METAR_WX = [
        ("RA", "pluie"), ("DZ", "bruine"), ("SN", "neige"), ("SH", "averse"),
        ("TS", "orage"), ("FG", "brouillard"), ("BR", "brume"), ("FZ", "se congelant"),
        ("+", "intensité forte"), ("-", "intensité faible/modérée"),
    ]
    for code, meaning in METAR_WX:
        opts, a = shuffle_opts(meaning, [w[1] for w in METAR_WX if w[0] != code][:3])
        qs.append(q("M", 2, f"Code METAR '{code}' signifie :", opts, a, f"{code} = {meaning}.", "METAR - temps présent"))

    TAF_CODES = [
        ("BECMG", "évolution sur ~2h (<4h)"), ("TEMPO", "fluctuations <1h"), ("FM", "changement permanent et brutal"),
        ("PROB30", "probabilité faible 30%"), ("PROB40", "probabilité modérée 40%"), ("TAF", " prévision aérodrome"),
        ("AMD", "TAF amendé"), ("CNL", "TAF annulé"),
    ]
    for code, meaning in TAF_CODES:
        opts, a = shuffle_opts(meaning, [t[1] for t in TAF_CODES if t[0] != code][:3])
        qs.append(q("M", 2 if code in ("BECMG", "TEMPO") else 3, f"Code TAF '{code}' :", opts, a, f"{code} = {meaning}.", "TAF - codes"))

    TEMSI_ABBR = [
        ("MAR", "en mer"), ("MON", "au-dessus des montagnes"), ("COT", "sur les côtes"),
        ("SFC", "en surface"), ("LAN", "à l'intérieur des terres"), ("CIT", "près des villes"),
        ("VAL", "dans les vallées"), ("LOC", "localement"),
    ]
    for code, loc in TEMSI_ABBR:
        opts, a = shuffle_opts(loc, [t[1] for t in TEMSI_ABBR if t[0] != code][:3])
        qs.append(q("M", 2, f"Abréviation TEMSI '{code}' :", opts, a, f"{code} = {loc}.", "Cartes TEMSI"))

    for fl in ["020", "050", "100", "180", "300", "340", "390"]:
        qs.append(q("M", 2, f"Niveau de vol WINTEM EUROC inclut FL{fl} ?", ["Oui", "Non", "Seulement France", "Seulement nuit"], 0,
                    f"WINTEM EUROC : FL050,100,180,300,340,390.", "Cartes WINTEM"))

    ISA_DELTA_CASES = [
        (5, 8), (10, -6), (15, 0), (20, 12), (8, -10), (25, -4), (12, 15), (18, 3),
    ]
    for ft, delta in ISA_DELTA_CASES:
        t_std = 15 - 2 * ft
        t_real = t_std + delta
        correct = f"ISA {delta:+d}"
        if delta == 0:
            wrong = ["ISA +3", "ISA -2", "ISA +5"]
        else:
            half = delta // 2 if delta // 2 != delta else delta + 1
            wrong = [f"ISA {-delta:+d}", f"ISA {delta * 2:+d}", f"ISA {half:+d}"]
        opts, a = shuffle_opts(correct, wrong)
        qs.append(q("M", 2 + abs(delta) // 8, f"Vol à {ft*1000} ft, T° {t_real:+d}°C, standard {t_std:+d}°C. Notation ISA ?",
            opts, a, f"Écart {delta}°C → ISA {delta:+d}.", "ISA - delta"))

    PRESS_ALT_CASES = [1013, 950, 850, 700, 500, 300]
    for p in PRESS_ALT_CASES:
        alts = {300: 30000, 500: 18000, 700: 10000, 850: 5000, 1013: 0}
        closest = min(alts.keys(), key=lambda k: abs(k - p))
        alt = alts[closest] + (p - closest) * 20
        qs.append(q("M", 3, f"Pression approximative {p} hPa correspond à quelle altitude ISA ?",
            [f"{max(0,alt-2000)} ft", f"{alt} ft", f"{alt+2000} ft", f"{alt+5000} ft"], 1,
            f"Table ISA : ~{alt} ft pour {p} hPa.", "Pression - altitude"))

    brises = [
        ("Brise de mer", "jour, mer→terre, anticyclone/marais", 2),
        ("Brise de terre", "nuit, terre→mer", 2),
        ("Brise pente montante", "jour, vallée→sommets", 2),
        ("Brise pente descendante", "nuit, sommets→vallée", 2),
    ]
    for name, desc, diff in brises:
        opts, a = shuffle_opts(desc, [b[1] for b in brises if b[0] != name][:3])
        qs.append(q("M", diff, f"{name} — quand et sens ?", opts, a, f"{name} : {desc}.", "Vents locaux"))

    return qs


def gen_bulk_reg():
    qs = []
    ABBREV = [
        ("ATZ", "Airfield Traffic Zone"), ("RMZ", "Radio Mandatory Zone"), ("TMZ", "Transponder Mandatory Zone"),
        ("CTR", "Control Zone"), ("TMA", "Terminal Manoeuvring Area"), ("FIR", "Flight Information Region"),
        ("VMC", "Visual Meteorological Conditions"), ("IFR", "Instrument Flight Rules"), ("VFR", "Visual Flight Rules"),
        ("QNH", "calage altimétrique niveau mer"), ("AMSL", "Above Mean Sea Level"), ("ASFC", "Above Surface"),
        ("CDB", "Commandant de bord"), ("FI", "Flight Instructor"), ("FE", "Flight Examiner"), ("ATO", "Approved Training Organisation"),
        ("SEP", "Single Engine Piston"), ("MEP", "Multi Engine Piston"), ("IR", "Instrument Rating"),
        ("SERA", "Standardised European Rules of the Air"), ("EASA", "European Aviation Safety Agency"),
        ("DGAC", "Direction Générale Aviation Civile"), ("FPL", "Flight Plan"), ("ATIS", "Automatic Terminal Information Service"),
    ]
    for abbr, meaning in ABBREV:
        opts, a = shuffle_opts(meaning, [x[1] for x in ABBREV if x[0] != abbr][:3])
        qs.append(q("R", 2, f"Abréviation '{abbr}' :", opts, a, f"{abbr} = {meaning}.", "Abréviations aéronautiques"))

    PLACEUR = [
        ("Bras croisés au-dessus tête", "Halte"), ("Paumes vers sol, mouvements bas", "Ralentissez"),
        ("Bras écartés paumes arrière", "Avancez"), ("Poing fermé puis main ouverte", "Desserrez freins"),
        ("Main ouverte puis poing", "Serrez freins"), ("Mouvement circulaire main droite", "Démarrez moteur"),
        ("Bâton sous menton horizontal", "Coupez moteur"), ("Bras verticaux bâtons intérieur", "Cales en place"),
    ]
    for gesture, meaning in PLACEUR:
        opts, a = shuffle_opts(meaning, [p[1] for p in PLACEUR if p[0] != gesture][:3])
        qs.append(q("R", 2, f"Signal placeur : {gesture} ?", opts, a, f"{gesture} = {meaning}.", "Signaux placeur"))

    for route in (15, 45, 90, 135, 180, 225, 270, 315, 359, 1, 89, 179):
        west = 180 <= route < 360
        fl_ex = "FL055" if not west else "FL065"
        wrong_fl = "FL065" if not west else "FL055"
        qs.append(q("R", 2, f"Route {route:03d}° — exemple FL VFR valide ?",
            [fl_ex, wrong_fl, "FL100", "FL080"], 0,
            f"Route {route}° → {'pair' if west else 'impair'}+500.", "Règle semi-circulaire"))

    calages = [
        ("QNH", "altitude par rapport au niveau de la mer", 2),
        ("1013,25 hPa", "niveau de vol (FL)", 2),
        ("QFE", "abandonné — zéro à l'aérodrome", 2),
    ]
    calage_pool = [
        "altitude par rapport au niveau de la mer",
        "niveau de vol (FL)",
        "abandonné — zéro à l'aérodrome",
        "hauteur par rapport au sol de l'aérodrome",
    ]
    for cal, use, diff in calages:
        wrong = [c for c in calage_pool if c != use]
        opts, a = shuffle_opts(use, wrong)
        qs.append(q("R", diff, f"Calage {cal} sert à indiquer :", opts, a, f"{cal} = {use}.", "Notions d'altimétrie"))

    for age in (17, 25, 35, 45, 52):
        if age < 40:
            valid = "60 mois"
        elif age < 50:
            valid = "24 mois"
        else:
            valid = "12 mois"
        qs.append(q("R", 2, f"Certificat médical classe 2 PPL — titulaire {age} ans : validité ?",
            [valid, "60 mois" if valid != "60 mois" else "24 mois", "12 mois" if valid != "12 mois" else "6 mois", "36 mois"], 0,
            f"PPL classe 2 : {valid} à {age} ans.", "Certificat médical"))

    zones = [
        ("R", "réglementée — sous conditions"), ("P", "prohibée — interdite"),
        ("D", "dangereuse — pénétration non interdite"), ("A", "interdite aux aéronefs"),
    ]
    for z, desc in zones:
        opts, a = shuffle_opts(desc, [x[1] for x in zones if x[0] != z][:3])
        qs.append(q("R", 2, f"Zone {z} :", opts, a, f"Zone {z} = {desc}.", "Zones à statut particulier"))

    return qs


def parse_abbreviations():
    """Extrait les abréviations du PDF réglementation."""
    path = DOCS / "010_compilation_droit-aerien_reglementation.txt"
    if not path.exists():
        return []
    text = path.read_text(encoding="utf-8")
    abbrs = []
    for line in text.splitlines():
        line = line.strip()
        if not line or line.startswith("www.") or "SIGLE" in line or "©" in line:
            continue
        m = re.match(r"^([A-Z][A-Z0-9\-]{1,12})\s+(.{8,80}?)(?:\s+[A-Z][a-z].*)?$", line)
        if not m:
            m = re.match(r"^([A-Z]{2,10})\s+(.+)$", line)
        if m:
            sig, fr = m.group(1).strip(), m.group(2).strip()
            if len(sig) >= 2 and not sig.isdigit() and "LES RÉSUMÉS" not in fr:
                fr = re.sub(r"\s{2,}.*$", "", fr).strip()
                if 5 < len(fr) < 90:
                    abbrs.append((sig, fr))
    seen = set()
    out = []
    for sig, fr in abbrs:
        if sig in seen:
            continue
        seen.add(sig)
        out.append((sig, fr))
    return out


def gen_abbreviations():
    qs = []
    for sig, fr in parse_abbreviations():
        others = [x[1] for x in parse_abbreviations() if x[0] != sig][:3]
        if len(others) < 3:
            continue
        opts, a = shuffle_opts(fr, others)
        qs.append(q("R", 2, f"Abréviation aéronautique '{sig}' ?", opts, a, f"{sig} = {fr}.", "Abréviations aéronautiques"))
        opts2, a2 = shuffle_opts(sig, [x[0] for x in parse_abbreviations() if x[0] != sig][:3])
        qs.append(q("R", 3, f"Quel sigle signifie : « {fr[:60]} » ?", opts2, a2, f"{sig} = {fr}.", "Abréviations aéronautiques"))
    return qs


def gen_compilation_facts():
    """Faits structurés supplémentaires des 4 compilations."""
    qs = []

    # ── Communications extra ──
    COMM_EXTRA = [
        ("Confirmez", "demande de confirmation", "Phraséologie"),
        ("Contact radio premier appel", "nom emplacement + suffixe organisme (ex: PARIS RADAR)", "Contact radio"),
        ("Fréquence INFO", "suffixe jamais omissible même sans confusion", "Contact radio"),
        ("Écoute avant émission", "écouter quelques secondes avant premier message", "Règles générales radio"),
        ("Signature message", "toujours par indicatif d'appel", "Règles générales radio"),
    ]
    for topic, ans, ref in COMM_EXTRA:
        opts, a = shuffle_opts(ans, [c[1] for c in COMM_EXTRA if c[0] != topic][:3])
        qs.append(q("C", 2, f"Communications — {topic} ?", opts, a, f"{topic} : {ans}.", ref))

    for imm in ["F-GAIS", "F-GOIS", "F-GRIS", "F-BOIS", "F-RX", "PITHIVIERS"]:
        ab = imm[0] + "-" + imm[-2:] if imm.startswith("F-") and len(imm) >= 5 else imm[:3]
        opts, a = shuffle_opts(ab, [imm[:4], imm[-3:], imm[2:5], "F-XX"])
        qs.append(q("C", 2, f"Indicatif abrégé de {imm} ?", opts, a, f"{imm} → {ab}.", "Indicatifs d'appel"))

    # ── Aéronef extra ──
    AERO_EXTRA = [
        ("Vz = plan descente × Vsol", "5% × 90kt = 450 ft/min", "Variomètre - astuce"),
        ("Gyro directionnel", "fixité — axe horizontal fixe dans l'espace", "Conservateur de cap"),
        ("Recalage directionnel", "palier rectiligne, ~20 min, sur compas magnétique", "Conservateur de cap"),
        ("Vanne de flux / magnétomètre", "évite recalage manuel sur EFIS performants", "Conservateur de cap"),
        ("Coordinateur cadre incliné", "environ 30° pour meilleure réactivité", "Coordinateur de virage"),
        ("Gradient pression altimètre", "25 ft/hPa au lieu de 30 → altimètre surestime altitude", "Altimètre - gradient"),
        ("Prise statique secours", "dans cockpit, actionnée par pilote si obstruction", "Altimètre - pannes"),
        ("Moteur 4 cylindres", "cycles décalés pour régularité", "Cycle 4 temps"),
        ("Cylindre culasse/fût", "alliage alu culasse, acier fût avec ailettes", "Moteur - généralités"),
        ("JET A1", "combustion spontanée, brun, moteurs diesel avion", "Moteur - carburants"),
    ]
    for qtext, ans, ref in AERO_EXTRA:
        opts, a = shuffle_opts(ans, [x[1] for x in AERO_EXTRA if x[0] != qtext][:3])
        qs.append(q("A", 2, f"{qtext} ?", opts, a, f"{qtext} : {ans}.", ref))

    for pct in range(1, 16):
        vsol = 60 + pct * 6
        vz = pct * vsol
        opts, a = shuffle_opts(f"{vz} ft/min", [f"{vz//2} ft/min", f"{vz*2} ft/min", f"{vsol} ft/min"])
        qs.append(q("A", 3, f"Vz si plan descente {pct}% et Vsol {vsol} kt ?", opts, a,
                    f"Vz = {pct}% × {vsol} = {vz} ft/min.", "Variomètre - astuce"))

    # ── Météo extra ──
    METAR_GROUPS = [
        ("Groupe 3 METAR", "jour/heure UTC (+ AUTO, COR)", "METAR - structure"),
        ("Groupe 4 METAR", "vent Nord vrai, 3 chiffres + kt (+G rafales)", "METAR - vent"),
        ("Groupe 5 METAR", "visibilité dominante en m (9999 = ≥10 km)", "METAR - visibilité"),
        ("Groupe 6 METAR", "temps présent (intensité -/+)", "METAR - temps présent"),
        ("Groupe 7 METAR", "nébulosité octas + hauteur ft (+ CB/TCU)", "METAR - nuages"),
        ("Groupe 8 METAR", "T° air et point de rosée (M = négatif)", "METAR - température"),
        ("Groupe 9 METAR", "QNH local hPa", "METAR - QNH"),
        ("Groupe 10 METAR", "RE phénomènes récents, NOSIG", "METAR - compléments"),
    ]
    for grp, desc, ref in METAR_GROUPS:
        opts, a = shuffle_opts(desc, [g[1] for g in METAR_GROUPS if g[0] != grp][:3])
        qs.append(q("M", 2, f"{grp} : contenu ?", opts, a, f"{grp} = {desc}.", ref))

    TAF_GROUPS = [
        ("TAF court", "validité 9h, émis toutes les 3h", "TAF - validité"),
        ("TAF long", "validité 24h ou 30h, émis toutes les 6h", "TAF - validité"),
        ("TAF AMD", "TAF amendé si modification significative", "TAF - codes"),
        ("FM (TAF)", "changement permanent et brutal", "TAF - codes"),
        ("NSW", "aucun phénomène météo significatif prévu", "TAF - codes"),
        ("TX/TN TAF", "températures max/min prévues avec horaire UTC", "TAF - températures extrêmes"),
    ]
    for code, desc, ref in TAF_GROUPS:
        opts, a = shuffle_opts(desc, [t[1] for t in TAF_GROUPS if t[0] != code][:3])
        qs.append(q("M", 2, f"{code} :", opts, a, f"{code} = {desc}.", ref))

    CAVOK = [
        "Visibilité > 10 km",
        "Pas de nuage sous 5000 ft ou alt mini secteur",
        "Pas de CB ni TCU",
        "Pas de temps significatif",
    ]
    for i, cond in enumerate(CAVOK):
        opts, a = shuffle_opts(cond, [c for j, c in enumerate(CAVOK) if j != i][:3])
        qs.append(q("M", 2, f"Condition CAVOK :", opts, a, f"CAVOK = 4 conditions cumulatives.", "METAR - CAVOK"))

    # ── Réglementation extra ──
    REG_EXTRA = [
        ("Abordage SERA", "choc entre 2 aéronefs", "SERA - définitions"),
        ("Collision SERA", "choc aéronef avec surface terrestre", "SERA - définitions"),
        ("Acrobatie SERA", "manœuvres non nécessaires au vol normal", "SERA - définitions"),
        ("Plan de vol VFR jour/nuit", "déposé avant départ sans délai (sauf frontières 60 min)", "Plan de vol"),
        ("FPL clôture arrivée", "TWR/AFIS ou téléphone", "Plan de vol"),
        ("Examen théorique délai", "18 mois pour réussir les 9 épreuves", "Examen théorique"),
        ("Examen théorique présentations", "max 6 totales, 4 par épreuve", "Examen théorique"),
        ("Certificat aptitude théorique", "valable 2 ans avant épreuve pratique", "Examen théorique"),
        ("LAPL passagers", "max 3 passagers (4 personnes à bord)", "Licence LAPL"),
        ("LAPL masse", "inférieure à 2 tonnes", "Licence LAPL"),
        ("PPL BITD", "5h simulateur agréé possibles", "Licence PPL"),
        ("Survol eau canot", ">50 NM côte OU >30 min de la côte", "Équipements - survol eau"),
        ("Gilet sauvetage", "chaque occupant si amerrissage possible", "Équipements - survol eau"),
        ("Oxygène FL130", "obligatoire pour tous les occupants", "Équipements - oxygène"),
        ("TEMSI France validité", "0,6,9,12,15,18,21h — dispo 2h avant", "Cartes TEMSI"),
        ("TEMSI EUROC validité", "diffusée /3h — dispo 4h avant", "Cartes TEMSI"),
    ]
    for topic, ans, ref in REG_EXTRA:
        opts, a = shuffle_opts(ans, [r[1] for r in REG_EXTRA if r[0] != topic][:3])
        qs.append(q("R", 2, f"{topic} ?", opts, a, f"{topic} : {ans}.", ref))

    INTERCEPT = [
        ("Intercepteur balaie ailes + virage", "suivez-moi vers aérodrome", "Signaux d'interception"),
        ("Intercepteur virage montée 90°+", "continuez votre route", "Signaux d'interception"),
        ("Intercepteur virage descente 90°+", "atterrissez aérodrome désigné", "Signaux d'interception"),
        ("Intercepté ne peut pas atterrir", "train rentré + phares clignotants au survol piste", "Signaux d'interception"),
    ]
    for sig, ans, ref in INTERCEPT:
        opts, a = shuffle_opts(ans, [i[1] for i in INTERCEPT if i[0] != sig][:3])
        qs.append(q("R", 3, f"{sig} ?", opts, a, f"{sig} → {ans}.", ref))

    return qs


def expand_variations(all_qs):
    """Quelques pièges classiques + calculs représentatifs (pas de génération massive)."""
    extra = [
        q("M", 2, "Décroissance T° ISA :", ["1°C/1000ft", "2°C/1000ft", "3°C/1000ft", "4°C/1000ft"], 1,
          "ISA = -2°C/1000 ft.", "ISA - température"),
        q("C", 2, "Fréquence détresse :", ["121,500 MHz", "123,500 MHz", "123,450 MHz", "125,335 MHz"], 0,
          "121,500 MHz internationale.", "Fréquences particulières"),
        q("R", 1, "Classe A autorise VFR :", ["Oui toujours", "Non, interdit sans dérogation", "Oui de jour", "Oui avec transpondeur"], 1,
          "Classe A = IFR seulement.", "Espace aérien - classe A"),
        q("A", 1, "Pt = Ps - Pd :", ["Vrai", "Faux — Pt = Ps + Pd", "Pt = Pd seulement", "Ps = Pt + Pd"], 1,
          "Pt = Ps + Pd.", "Circuit anémométrique"),
    ]

    for h in (50, 100, 400, 1000, 2000, 5000, 10000):
        d = round(1.23 * math.sqrt(h), 1)
        correct = f"{d} NM"
        wrong = unique_wrongs(correct, [
            f"{round(1.5*math.sqrt(h),1)} NM",
            f"{round(d+8,1)} NM",
            f"{round(max(0.1,d-5),1)} NM",
        ], [f"{round(d+3,1)} NM", f"{round(max(0.1,d-3),1)} NM"])
        opts, a = shuffle_opts(correct, wrong)
        extra.append(q("C", min(4, 1 + h // 5000), f"Portée VHF à {h} ft ?",
            opts, a, f"D=1,23√{h}={d} NM.", "Calcul portée VHF"))

    for alt in (0, 1000, 2000, 5000, 10000, 18000, 36000):
        t = round(15 - 2 * (alt / 1000), 1)
        correct = f"{t:+.0f}°C"
        wrong = unique_wrongs(correct, [f"{t+5:+.0f}°C", f"{t-5:+.0f}°C", f"{15-alt//1000:+.0f}°C"], [f"{t+3:+.0f}°C", f"{t-3:+.0f}°C", f"{t+8:+.0f}°C"])
        opts, a = shuffle_opts(correct, wrong)
        extra.append(q("M", 1 + min(3, alt // 10000), f"T° ISA à {alt} ft ?",
            opts, a, f"ISA à {alt} ft ≈ {t:+.0f}°C.", "ISA - calcul T°"))

    for kt in (60, 80, 100, 120, 150, 180, 200):
        kmh = round(kt * 2 * 0.9)
        correct = f"{kmh} km/h"
        wrong = unique_wrongs(correct, [f"{kt*2} km/h", f"{round(kt*1.852)} km/h", f"{kmh+20} km/h"], [f"{kmh+10} km/h", f"{max(0,kmh-15)} km/h"])
        opts, a = shuffle_opts(correct, wrong)
        extra.append(q("A", 2, f"{kt} kt en km/h (×2 -10%) ?",
            opts, a, f"{kt}×2-10% = {kmh} km/h.", "Conversion kt/km/h"))

    all_qs.extend(extra)
    return all_qs


def dedupe_all(bank):
    seen = set()
    result = []
    counts = {"C": 0, "A": 0, "M": 0, "R": 0}
    for item in bank:
        k = dedupe_key(item)
        if k in seen:
            continue
        seen.add(k)
        result.append(item)
        counts[item["m"]] += 1
    return result, counts


def validate_bank_options(bank):
    """Vérifie options uniques et cohérence minimale."""
    issues = []
    for i, item in enumerate(bank):
        opts = item["o"]
        norms = [norm_opt(o) for o in opts]
        if len(set(norms)) != len(norms):
            issues.append(f"#{i} doublons: {item['q'][:70]}")
        if item["a"] < 0 or item["a"] >= len(opts):
            issues.append(f"#{i} index invalide: {item['q'][:70]}")
        if len(opts) != 4:
            issues.append(f"#{i} {len(opts)} options: {item['q'][:70]}")
    if issues:
        raise SystemExit(f"{len(issues)} problèmes options:\n" + "\n".join(issues[:15]))


def merge_doc_questions(bank, doc_qs):
    """Fusionne les questions extraites des docs sans répéter le texte de question."""
    seen = {dedupe_key(it) for it in bank}
    added = 0
    for item in doc_qs:
        k = dedupe_key(item)
        if k in seen:
            continue
        seen.add(k)
        bank.append(item)
        added += 1
    return bank, added


def main():
    bank = []
    bank.extend(gen_comm())
    bank.extend(gen_aero())
    bank.extend(gen_meteo())
    bank.extend(gen_reg())
    bank.extend(gen_bulk_meteo())
    bank.extend(gen_bulk_reg())
    bank.extend(gen_compilation_facts())
    bank = expand_variations(bank)
    bank, _ = dedupe_all(bank)
    bank = dedupe_by_family(bank)

    from doc_extractor import gen_from_all_docs

    doc_qs = gen_from_all_docs(parse_abbreviations)
    doc_qs, _ = dedupe_all(doc_qs)
    bank, doc_added = merge_doc_questions(bank, doc_qs)

    validate_bank_options(bank)
    _, counts = dedupe_all(bank)
    counts = {"C": 0, "A": 0, "M": 0, "R": 0}
    for item in bank:
        counts[item["m"]] += 1
    dupes = [it for it in bank if len({norm_opt(o) for o in it["o"]}) < len(it["o"])]
    if dupes:
        raise SystemExit(f"{len(dupes)} questions avec options dupliquées après génération")
    total = len(bank)

    print("Counts:", counts, "Total:", total, f"(+{doc_added} depuis docs)")

    meta_js = json.dumps({"total": total, "counts": counts}, ensure_ascii=False)
    lines = [
        f"// Banque PPL — {total} questions uniques — compilations Aérogligli",
        f"const Q_BANK_META={meta_js};",
        "const Q=[",
    ]
    for item in bank:
        o = json.dumps(item["o"], ensure_ascii=False)
        lines.append(
            f'{{m:"{item["m"]}",d:{item["d"]},q:{json.dumps(item["q"], ensure_ascii=False)},'
            f'o:{o},a:{item["a"]},e:{json.dumps(item["e"], ensure_ascii=False)},'
            f'r:{json.dumps(item["r"], ensure_ascii=False)}}},'
        )
    lines.append("];")
    OUT.write_text("\n".join(lines), encoding="utf-8")
    META.write_text(json.dumps({"total": total, "counts": counts}, indent=2), encoding="utf-8")
    print(f"Written {OUT} ({total} questions)")


if __name__ == "__main__":
    main()
