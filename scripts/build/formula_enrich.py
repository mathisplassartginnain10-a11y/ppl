"""Enrichit chaque formule : utilité en vol + exemple(s) de calcul détaillé(s)."""
import math
import re

MODULE_UTILITY = {
    "C": "Radio et procédures : contacts ATC, portée VHF, phraséologie et codes transpondeur.",
    "M": "Météo VFR : lire METAR/TAF, ISA, vents, nuages et risques (givrage, stabilité).",
    "A": "Pilotage et performances : vitesses, altimétrie, carburant, virages et instruments.",
    "R": "Navigation et réglementation : plan de vol, espaces aériens, distances et règles VFR.",
}

CAT_UTILITY = {
    "Radio VHF": "Estimer si vous pouvez joindre une station ou un autre aéronef (propagation optique).",
    "Fréquences": "Choisir la bonne fréquence (tour, urgence, détresse) et les bons codes transpondeur.",
    "Transpondeur": "Identification radar et signalement panne radio ou détresse.",
    "Phraséologie": "Communiquer clairement avec l'ATC et confirmer les instructions critiques.",
    "Signaux": "Comprendre les signaux lumineux ou au sol en cas de panne radio.",
    "ISA": "Calculer températures standard, comparer météo réelle et estimer performances.",
    "Pression": "Convertir pression ↔ altitude, calages QNH/1013 et gradients altimétriques.",
    "Stabilité": "Anticiper convection, turbulence et évolution des nuages.",
    "Vent": "Situer dépressions/anticyclones et comprendre le vent en altitude.",
    "Humidité": "Évaluer risque brume/brouillard et saturation de l'air.",
    "Nuages": "Estimer bases nuageuses et classer les formations rencontrées.",
    "Fronts": "Anticiper dégradation ou amélioration météo lors d'un vol VFR.",
    "METAR": "Décoder conditions réelles au sol avant et pendant le vol.",
    "TAF": "Prévoir l'évolution météo sur la durée du vol.",
    "Givrage": "Repérer zones et températures à risque (carburation, givrage structural).",
    "Vitesses": "Passer de Vi à Vp, respecter vitesses limites et planifier navigation.",
    "Performances": "Montée, descente, autonomie carburant et facteur de charge en virage.",
    "Altimètre": "Lire la bonne altitude/hauteur et corriger erreurs barométriques ou de température.",
    "Conversions": "Convertir rapidement kt, NM, ft, hPa pour calculs mentaux à l'examen.",
    "Navigation": "Estimer temps, distance, dérive et composantes vent.",
    "Masse & centrage": "Vérifier chargement et centrage dans l'enveloppe autorisée.",
    "Aérodynamique": "Comprendre portance, traînée et facteur de charge.",
    "Moteur": "Gestion moteur, carburants et risques carburation/givrage carbu.",
    "Hélice": "Commandes puissance et pas sur hélice fixe ou variable.",
    "Instruments": "Diagnostiquer pannes pitot/statique et conséquences sur Vi/altimètre/VSI.",
    "VFR": "Vérifier légalité du vol VFR (visibilité, nuages, hauteurs).",
    "Espace aérien": "Savoir où entrer, quelle autorisation et quel équipement.",
    "Plan de vol": "Préparer FPL, estimer temps et carburant avec marges réglementaires.",
    "Licences": "Connaître privilèges, validités médicales et documents à bord.",
    "Circulation": "Appliquer règles de priorité et anti-collision.",
    "Équipements": "Savoir quand transpondeur, oxygène ou canot sont requis.",
    "Cartes": "Utiliser TEMSI/WINTEM pour briefing et navigation.",
}

ID_UTILITY = {
    "vhf-range": "Savoir si vous pouvez contacter la tour depuis le circuit ou en croisière basse.",
    "vp-calc": "Calculer la vitesse vraie pour navigation, consommation et performances — question d'examen fréquente.",
    "alt-temp-corr": "Corriger l'altitude lue quand l'air est plus chaud ou plus froid que la normale ISA.",
    "rule-60": "Estimer rapidement l'écart latéral après une erreur de cap en navigation VFR.",
    "semi-circular": "Choisir un niveau de vol conforme à la semi-circulaire magnétique.",
    "exam-threshold": "Comprendre le format et le seuil de réussite de l'examen théorique PPL.",
    "fuel-reserve-vfr": "Ne pas confondre autonomie totale et carburant utilisable après réserve réglementaire.",
}


def _isa_temp(h):
    return 15 - 2 * (h / 1000)


def _worked_for_calc(calc, f):
    if calc == "vhf":
        h = 1000
        d = round(1.23 * math.sqrt(h), 1)
        return [
            f"Donnée : h = {h} ft (hauteur antenne)",
            f"Calcul : D = 1,23 × √{h} = 1,23 × {math.sqrt(h):.1f}",
            f"Résultat : D ≈ {d} NM",
        ]
    if calc == "vhf-2":
        h1, h2 = 500, 3000
        d = round(1.23 * (math.sqrt(h1) + math.sqrt(h2)), 1)
        return [
            f"Données : h₁ = {h1} ft · h₂ = {h2} ft",
            f"√h₁ = {math.sqrt(h1):.1f} · √h₂ = {math.sqrt(h2):.1f}",
            f"D = 1,23 × ({math.sqrt(h1):.1f} + {math.sqrt(h2):.1f}) ≈ {d} NM",
        ]
    if calc == "isa-temp":
        h = 4000
        t = _isa_temp(h)
        return [
            f"Donnée : altitude = {h} ft",
            f"T_ISA = 15 − 2 × ({h}/1000) = 15 − 8",
            f"Résultat : T_ISA = {t:+.0f}°C",
        ]
    if calc == "isa-delta":
        h, t_real = 4000, 2
        t_std = _isa_temp(h)
        d = round(t_real - t_std)
        return [
            f"Altitude {h} ft → T_ISA = {t_std:+.0f}°C",
            f"T° réelle = {t_real:+.0f}°C",
            f"Delta ISA = {t_real:+.0f} − ({t_std:+.0f}) = ISA {d:+d}",
        ]
    if calc == "press-gradient":
        return [
            "À 10 000 ft (table ISA)",
            "Pour perdre 1 hPa il faut monter ≈ 37 ft",
            "Plus l'altitude est élevée, plus le gradient augmente.",
        ]
    if calc == "qnh-pa":
        qnh, grad = 1000, 30
        dh = round((1013 - qnh) * grad)
        return [
            f"QNH = {qnh} hPa (plus bas que 1013)",
            f"Δh ≈ (1013 − {qnh}) × {grad} = {dh} ft",
            "Altimètre calé 1013 lit plus haut que l'altitude QNH.",
        ]
    if calc == "vp":
        vi, fl, dt = 100, 10, 16
        ca, ct = int((fl * 10) / 6), int(abs(dt) / 4)
        vp = round(vi * (1 + ca / 100) * (1 + ct / 100))
        return [
            f"Vi = {vi} kt · FL{fl:02d} · |ΔT| = {dt}°C",
            f"Correction altitude : {ca}% · température : {ct}%",
            f"Vp = {vi} × {1+ca/100:.2f} × {1+ct/100:.2f} ≈ {vp} kt",
        ]
    if calc == "kt-kmh":
        kt = 100
        return [
            f"Donnée : {kt} kt",
            f"Exact : {kt} × 1,852 = {kt*1.852:.1f} km/h",
            f"Astuce examen : {kt} × 2 − 10% = {round(kt*2*0.9)} km/h",
        ]
    if calc == "kmh-kt":
        km = 180
        return [f"{km} km/h ÷ 1,852 ≈ {round(km / 1.852)} kt"]
    if calc == "alt-corr":
        h, t, ts = 2000, 26, 11
        dh = 4 * (h / 1000) * (t - ts)
        return [
            f"Alt. lue = {h} ft · T = {t}°C · T_std = {ts}°C",
            f"Δh = 4 × 2 × {t-ts} = {dh:.0f} ft",
            f"Air chaud → réelle ≈ {h - dh:.0f} ft",
        ]
    if calc == "true-alt":
        h, qnh, grad = 3000, 1020, 30
        real = round(h + (qnh - 1013) * grad)
        return [
            f"Alt. lue = {h} ft · QNH = {qnh} hPa",
            f"Δ = ({qnh} − 1013) × {grad} = +{round((qnh-1013)*grad)} ft",
            f"Altitude vraie ≈ {real} ft",
        ]
    if calc == "ms-ftmin":
        ms = 2.5
        return [f"{ms} m/s × 200 ≈ {round(ms*200)} ft/min"]
    if calc == "descent":
        g, v = 5, 90
        vz = round((g / 100) * v)
        return [f"Plan {g}% · Vsol {v} kt → Vz = {vz} ft/min"]
    if calc == "dist-time":
        v, d = 120, 60
        return [f"{d} NM à {v} kt → {round(d/v*60)} min"]
    if calc == "nm-km":
        return ["10 NM × 1,852 = 18,52 km"]
    if calc == "ft-m":
        return ["1000 ft × 0,3048 ≈ 305 m"]
    if calc == "cloud-base":
        t, td = 18, 12
        base = round((t - td) * 400)
        return [f"T − T_rosée = {t-td}°C → base ≈ {base} ft"]
    if calc == "load-factor":
        bank = 60
        n = round(1 / math.cos(math.radians(bank)), 2)
        return [f"Virage {bank}° → n = 1/cos({bank}°) = {n}"]
    if calc == "stall-n":
        vs1, n = 50, 2
        return [f"Vs1 = {vs1} kt · n = 2 → Vs ≈ {round(vs1 * math.sqrt(n))} kt"]
    if calc == "rule-60":
        return ["60 NM · erreur 2° → déviation ≈ 2 NM"]
    if calc == "crosswind":
        return ["Vent 20 kt · angle 30° → composante travers ≈ 10 kt"]
    if calc == "headwind":
        return ["Vent 20 kt · angle 30° → composante face ≈ 17 kt"]
    if calc == "autonomy":
        return ["60 L à 30 L/h → 2 h (hors réserve 30 min VFR)"]
    if calc == "fuel-flow":
        return ["45 L en 1,5 h → débit ≈ 30 L/h"]
    if calc == "semi-circular":
        return ["Cap 105° → niveaux impairs : FL35, FL55, FL75…"]
    return None


def _scenario_example(f):
    title = f.get("title", "").lower()
    m = f.get("m")
    if "squawk" in title or f.get("id") == "squawk-codes":
        return "Panne radio → 7600 · détresse → 7700 + 121,5 MHz."
    if "readback" in f.get("id", ""):
        return "ATC : « QNH 1018 » → read-back « QNH 1018 » obligatoire."
    if "metar" in title:
        return "Briefing : décoder vent, visi, plafond et QNH du METAR départ."
    if "vfr" in title:
        return "Vérifier minima visibilité/nuages de l'espace traversé."
    if m == "C":
        return "Avant contact tour : estimer portée VHF et préparer read-back."
    if m == "M":
        return "Briefing météo : comparer conditions réelles et ISA."
    if m == "A":
        return "En vol : calcul mental performance ou navigation."
    if m == "R":
        return "Préparation plan de vol et conformité réglementaire VFR."
    return f"Cas pratique : « {f.get('title', '')} » au briefing ou en vol."


def _default_utility(f):
    if f.get("id") in ID_UTILITY:
        return ID_UTILITY[f["id"]]
    cat = f.get("cat", "").split("—")[0].strip()
    if cat in CAT_UTILITY:
        return CAT_UTILITY[cat]
    base = MODULE_UTILITY.get(f.get("m"), "Révision théorique PPL/LAPL.")
    return f"{base} {f.get('title', 'Formule')} : utile en briefing et à l'examen."


def enrich_formula(f):
    if not f.get("utility"):
        f["utility"] = _default_utility(f)

    if not f.get("worked"):
        calc = f.get("calc")
        if calc:
            f["worked"] = _worked_for_calc(calc, f) or []
        elif f.get("tags") and "table" in f["tags"]:
            f["worked"] = [
                f"Valeur table : {f.get('formula', '')}",
                f.get("explain", "Référence ISA ou réglementaire."),
            ]
        else:
            f["worked"] = [
                _scenario_example(f),
                f"Retenir : {f.get('formula', '')[:90]}",
            ]

    examples = list(f.get("examples") or [])
    if f.get("worked"):
        wlast = f["worked"][-1]
        if wlast not in examples:
            examples.insert(0, wlast)
    scen = _scenario_example(f)
    if scen not in examples:
        examples.append(scen)
    while len(examples) < 2:
        examples.append(f"Application : {f.get('formula', '')[:60]}")
    f["examples"] = examples[:4]

    if not f.get("explain"):
        f["explain"] = f"{f.get('cat', '')} — {f.get('formula', '')}."

    return f


def enrich_all(formulas):
    return [enrich_formula(dict(f)) for f in formulas]
