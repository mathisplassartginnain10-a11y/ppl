"""Extraction de questions depuis les compilations Aérogligli (docs/*.txt)."""
import re
import random
from build_questions import q, shuffle_opts, unique_wrongs, norm_opt, DOCS

SKIP = re.compile(
    r"www\.|©|LES RÉSUMÉS|aerogligli|LAPL\s*/\s*PPL|^\d{1,3}$|COMPILATION|document actualisé",
    re.I,
)

REG_POOLS = {
    "age": ["15 ans", "16 ans", "17 ans", "18 ans", "21 ans", "16 ans minimum", "17 ans minimum"],
    "medical": ["6 mois", "12 mois", "24 mois", "36 mois", "60 mois", "validité 12 mois", "validité 24 mois", "validité 60 mois"],
    "hours": [
        "5 h BITD",
        "30 h dont 15 DC + 6 solo (3 h nav, 80 NM)",
        "45 h dont 25 DC + 10 solo (5 h nav, 150 NM, 2 AD)",
        "10 h solo minimum",
        "25 h avec instructeur",
    ],
    "exam": [
        "128 QCM · 9 épreuves · 75% chacune",
        "128 QCM · 9 épreuves · 75% par épreuve",
        "100 QCM · 8 épreuves · 75% global",
        "75 QCM · 6 épreuves · 80% global",
    ],
    "speed": ["100 kt CAS", "120 kt CAS", "140 kt CAS", "140 kt CAS maximum", "160 kt CAS"],
    "altitude": ["1000 ft minimum", "1500 ft minimum", "1700 ft minimum", "2000 ft minimum"],
    "fl": ["FL075", "FL100", "FL130", "FL150", "à partir du FL130"],
    "water": [">30 NM de la côte", ">50 NM de la côte", ">50 NM côte ou >30 min de la côte"],
    "time": ["30 min avant départ", "45 min avant départ", "60 min avant départ", "90 min avant départ", "dépôt 60 min avant départ"],
    "temsi": ["surface à 10000 ft QNH", "surface à 15000 ft QNH", "FL100-FL450 standard"],
    "class_short": ["A", "B", "C", "D", "E", "G"],
    "class_long": ["classe A", "classe B", "classe C", "classe D", "classe E", "classe G"],
    "agency": [
        "Agence européenne sécurité aérienne — licences",
        "application nationale des règlements européens",
        "Organisation de l'aviation civile internationale",
    ],
}


def _clean(s):
    return re.sub(r"\s+", " ", s.replace("\ufb02", "f").replace("\ufb01", "i")).strip()


def _make_q(module, diff, question, correct, pool, expl, ref):
    wrong = unique_wrongs(correct, [x for x in pool if norm_opt(x) != norm_opt(correct)])
    opts, a = shuffle_opts(correct, wrong)
    return q(module, diff, question, opts, a, expl, ref)


def _from_siblings(module, facts, q_fmt, diff=2):
    """Mauvaises réponses = autres réponses du même groupe (cohérent)."""
    qs = []
    pool = [f[1] for f in facts]
    for topic, ans, ref in facts:
        qs.append(_make_q(
            module, diff, q_fmt.format(topic=topic), ans, pool,
            f"{topic} : {ans}.", ref,
        ))
    return qs


def _from_reg_facts(facts):
    qs = []
    for topic, ans, ref, pool_key in facts:
        pool = REG_POOLS.get(pool_key, REG_POOLS["agency"])
        qs.append(_make_q(
            "R", 2, f"Doc réglementation — {topic} ?",
            ans, pool, f"{topic} : {ans}.", ref,
        ))
    return qs


def parse_colon_definitions(text, default_ref):
    out = []
    ref = default_ref
    for raw in text.splitlines():
        line = _clean(raw)
        if not line or SKIP.search(line):
            continue
        if len(line) < 8 or len(line) > 140:
            continue
        if re.match(r"^[A-ZÉÈÀÙ0-9\s\-'()]{6,55}$", line) and ":" not in line:
            ref = line.title()[:48]
            continue
        m = re.match(r"^([A-Za-zÀ-ÿ0-9][^:]{2,50})\s*:\s*(.{12,110})$", line)
        if not m:
            continue
        term, defn = m.group(1).strip(), m.group(2).strip()
        if term.lower() in ("exemple", "total", "ps", "note"):
            continue
        if re.match(r"^\d", term):
            continue
        if len(defn) > 95 or "voir certif" in defn.lower():
            continue
        out.append((term, defn, ref))
    return out


def parse_examples(text, module, ref):
    out = []
    patterns = [
        r"Exemple\s*:\s*(.+?\?)\s*[Rr]éponse\s+(.+?)(?:\.|$)",
        r"(Quelle[^?\n]{8,100}\?)\s*[Rr]éponse\s+(.+?)(?:\.|$)",
    ]
    for pat in patterns:
        for m in re.finditer(pat, text, re.I):
            question, ans = _clean(m.group(1)), _clean(m.group(2))
            if len(question) < 12 or len(ans) < 2:
                continue
            out.append((question, ans, ref))
    return out


def parse_meteo_pressure_table(text):
    out = []
    for m in re.finditer(
        r"(\d{3,4})\s*hPa\s+(\d[\d\s]*)\s*ft\s+1\s*hPa\s+pour\s+(\d+)\s*ft", text, re.I
    ):
        p, alt, grad = int(m.group(1)), int(m.group(2).replace(" ", "")), int(m.group(3))
        out.append(
            q(
                "M",
                2,
                f"Gradient pression ISA à {alt} ft (table doc) ?",
                [f"1 hPa / {grad} ft", f"1 hPa / {grad+5} ft", f"1 hPa / {max(20,grad-5)} ft", "1 hPa / 28 ft"],
                0,
                f"Table ISA : {p} hPa ≈ {alt} ft → {grad} ft/hPa.",
                "Pression - gradients",
            )
        )
    return out


def gen_abbreviations_full(parse_fn, shuffle_fn):
    abbrs = parse_fn()
    if len(abbrs) < 4:
        return []
    qs = []
    frs = [x[1] for x in abbrs]
    sigs = [x[0] for x in abbrs]
    for sig, fr in abbrs:
        others = unique_wrongs(fr, [x for x in frs if norm_opt(x) != norm_opt(fr)])
        if len(others) < 3:
            continue
        opts, a = shuffle_fn(fr, others)
        qs.append(q("R", 2, f"Abréviation aéronautique « {sig} » ?", opts, a, f"{sig} = {fr}.", "Abréviations aéronautiques"))
        o2 = unique_wrongs(sig, [x for x in sigs if norm_opt(x) != norm_opt(sig)])
        if len(o2) >= 3:
            opts2, a2 = shuffle_fn(sig, o2)
            fr_short = fr if len(fr) <= 72 else fr[:69] + "…"
            qs.append(q("R", 3, f"Quel sigle correspond à : « {fr_short} » ?", opts2, a2, f"{sig} = {fr}.", "Abréviations aéronautiques"))
    return qs


def gen_handcrafted_docs():
    qs = []

    comm = [
        ("Gamme VHF aéronautique totale", "108 MHz à 137 MHz", "Bandes VHF"),
        ("Bande 108–111,975 MHz", "ILS et VOR", "Bandes VHF"),
        ("Bande 112–117,975 MHz", "VOR et DME", "Bandes VHF"),
        ("Bande 117,975–137 MHz", "échanges radio et ATIS", "Bandes VHF"),
        ("Portée VHF (formule doc)", "D = 1,23 × √h (h en ft, D en NM)", "Calcul portée VHF"),
        ("Propagation VHF", "optique — ligne de vue sans obstacle", "Calcul portée VHF"),
        ("MAYDAY", "message de détresse répété 3 fois", "Priorité messages"),
        ("PAN-PAN", "message d'urgence répété 3 fois", "Priorité messages"),
        ("Break break", "séparer des messages sur fréquence encombrée", "Phraséologie"),
        ("Confirmé (Confirm)", "demande de confirmation", "Phraséologie"),
        ("Premier contact radio", "nom emplacement + suffixe organisme (ex: PARIS RADAR)", "Contact radio"),
        ("TOULOUSE INFO", "suffixe INFO jamais omissible", "Contact radio"),
        ("Quitter fréquence sans accord", "le contrôleur peut croire une difficulté et déclencher secours", "Règles générales radio"),
        ("Collationnement vs Roger", "Roger = accusé · collationnement = répétition partielle/totale", "Confirmation de réception"),
    ]
    qs.extend(_from_siblings("C", comm, "Doc comm — {topic} ?"))

    aero = [
        ("Moteurs aviation légère", "thermiques à pistons (essence AVGAS)", "Moteur - généralités"),
        ("AVGAS 100LL couleur", "bleutée", "Moteur - carburants"),
        ("JET A1 couleur", "brune", "Moteur - carburants"),
        ("Cycle Beau de Rochas", "cycle à 4 temps (Otto)", "Cycle 4 temps"),
        ("Temps moteur 4 temps", "explosion/détente — seul temps moteur", "Cycle 4 temps"),
        ("Cylindres moteur léger", "4 ou 6 cylindres montés à plat opposés", "Moteur - généralités"),
        ("Pitot bouché en montée", "Vi augmente (fausse indication)", "Pannes circuit anémométrique"),
        ("Pitot bouché en descente", "Vi diminue", "Pannes circuit anémométrique"),
        ("Statique bouchée", "altimètre bloqué à altitude de l'obstruction", "Pannes circuit anémométrique"),
        ("Prise statique secours", "cockpit — action manuelle pilote", "Altimètre - pannes"),
        ("QNH indique", "altitude par rapport au niveau de la mer", "Calages altimétriques"),
        ("1013,25 hPa indique", "niveau de vol (altitude pression)", "Calages altimétriques"),
        ("Variomètre principe", "tube capillaire — retard pression statique", "Variomètre"),
        ("HA gyro propriété", "fixité — 2 degrés de liberté", "Horizon artificiel"),
        ("Directionnel gyro", "fixité — axe horizontal fixe espace", "Conservateur de cap"),
        ("Coordinateur gyro", "précession — 1 degré de liberté", "Coordinateur de virage"),
        ("Hélice calage fixe puissance", "tachymètre (rpm)", "Hélice à calage fixe"),
        ("Hélice VPC puissance", "manomètre (pression admission)", "Hélice à vitesse constante"),
        ("Dièdre Robin (doc)", "+14°", "Géométrie - dièdre"),
    ]
    qs.extend(_from_siblings("A", aero, "Doc aéronef — {topic} ?"))

    meteo = [
        ("ρ0 ISA mer", "1,225 kg/m³", "Atmosphère type ISA"),
        ("Décroissance ISA (doc m)", "−6,5°C / 1000 m jusqu'à 11 000 m", "ISA - température"),
        ("1 mbar vs hPa", "1 mbar = 1 hPa (mbar obsolète)", "Pression - gradients"),
        ("750 mmHg", "≈ 1000 hPa", "Pression - gradients"),
        ("Marée barométrique amplitude", "≈ ±1 hPa/jour", "Pression - variations"),
        ("Thalweg définition", "axe des basses pressions (vallée barométrique)", "Champ de pression"),
        ("Marais barométrique", "zone ~1013 hPa peu variable — météo médiocre", "Champ de pression"),
        ("Brise de mer", "jour, mer vers terre", "Vents locaux"),
        ("Brise de terre", "nuit, terre vers mer", "Vents locaux"),
        ("METAR T° négative", "préfixe M (ex: M02 = −2°C)", "METAR - température"),
    ]
    qs.extend(_from_siblings("M", meteo, "Doc météo — {topic} ?"))

    reg = [
        ("EASA rôle", "Agence européenne sécurité aérienne — licences", "Licence PPL", "agency"),
        ("DGAC rôle", "application nationale des règlements européens", "Licence PPL", "agency"),
        ("LAPL solo minimum", "16 ans", "Licence LAPL", "age"),
        ("LAPL obtention minimum", "17 ans", "Licence LAPL", "age"),
        ("LAPL expérience totale", "30 h dont 15 DC + 6 solo (3 h nav, 80 NM)", "Licence LAPL", "hours"),
        ("PPL expérience totale", "45 h dont 25 DC + 10 solo (5 h nav, 150 NM, 2 AD)", "Licence PPL", "hours"),
        ("PPL simulateur max", "5 h BITD", "Licence PPL", "hours"),
        ("Certificat médical PPL <40 ans", "60 mois", "Certificat médical", "medical"),
        ("Certificat médical PPL 40-50 ans", "24 mois", "Certificat médical", "medical"),
        ("Certificat médical PPL >50 ans", "12 mois", "Certificat médical", "medical"),
        ("Examen théorique format doc", "128 QCM · 9 épreuves · 75% chacune", "Examen théorique", "exam"),
        ("VFR spécial vitesse max", "140 kt CAS maximum", "VFR spécial", "speed"),
        ("FPL frontière délai", "dépôt 60 min avant départ", "Plan de vol", "time"),
        ("Survol agglo <1200 m", "1700 ft minimum", "Hauteurs de survol", "altitude"),
        ("Oxygène tous occupants", "FL130", "Équipements - oxygène", "fl"),
        ("Canot survol eau", ">50 NM côte ou >30 min de la côte", "Équipements - survol eau", "water"),
        ("TEMSI France couverture", "surface à 15000 ft QNH", "Cartes TEMSI", "temsi"),
        ("CTR France classe", "D", "Espace aérien - CTR", "class_short"),
    ]
    qs.extend(_from_reg_facts(reg))

    qs.extend([
        q("M", 2, "Doc : T° ISA à 4000 ft ?", ["+7°C", "+5°C", "+9°C", "+11°C"], 0, "15 − 2×4 = +7°C.", "ISA - calcul T°"),
        q("M", 2, "Doc : delta ISA à 4000 ft si T° réelle +2°C ?", ["ISA −5", "ISA +5", "ISA −3", "ISA +3"], 0, "Std +7°C, réel +2°C → ISA −5.", "ISA - delta"),
        q("A", 3, "Doc : Vz plan 5% et Vsol 90 kt ?", ["450 ft/min", "360 ft/min", "500 ft/min", "90 ft/min"], 0, "5% × 90 = 450 ft/min.", "Variomètre - astuce"),
        q("C", 2, "Doc : portée VHF à 10000 ft ?", ["≈ 123 NM", "≈ 100 NM", "≈ 150 NM", "≈ 80 NM"], 0, "1,23×√10000 ≈ 123 NM.", "Calcul portée VHF"),
    ])
    return qs


def _distinct_pool(definitions, min_len=4):
    """Garde des définitions suffisamment différentes pour des QCM cohérents."""
    pool = []
    seen = set()
    for _, defn, _ in definitions:
        n = norm_opt(defn)
        if n in seen or len(defn) < min_len:
            continue
        if any(n in s or s in n for s in seen if len(s) > 12 and len(n) > 12):
            continue
        seen.add(n)
        pool.append(defn)
    return pool


def gen_from_file_definitions(path, module, default_ref):
    if not path.exists():
        return []
    text = path.read_text(encoding="utf-8")
    qs = []
    defs = parse_colon_definitions(text, default_ref)
    pool = _distinct_pool(defs)
    if len(pool) < 4:
        return []
    seen = set()
    for term, defn, ref in defs:
        key = term.lower()
        if key in seen:
            continue
        seen.add(key)
        if norm_opt(defn) not in {norm_opt(p) for p in pool}:
            continue
        question = f"Selon la compilation — {term} ?"
        candidates = [p for p in pool if norm_opt(p) != norm_opt(defn)]
        wrong = unique_wrongs(defn, candidates)
        if len(wrong) < 3:
            continue
        opts, a = shuffle_opts(defn, wrong)
        diff = 1 if len(defn) < 40 else 2
        qs.append(q(module, diff, question, opts, a, f"{term} : {defn}.", ref[:48]))
    return qs


def gen_phraseology_and_alphabet():
    qs = []
    phrases = [
        ("Affirme", "oui", "Phraséologie"),
        ("Approuvé", "permission accordée", "Phraséologie"),
        ("Autorisé", "décollage, atterrissage, toucher et option uniquement", "Phraséologie"),
        ("Correction", "corrige le message précédent contenant une erreur", "Phraséologie"),
        ("Négatif", "non", "Phraséologie"),
        ("Roger", "j'ai reçu en entier votre dernière transmission", "Phraséologie"),
        ("Wilco", "message compris et sera exécuté", "Phraséologie"),
        ("121,500 MHz", "fréquence de détresse internationale", "Fréquences VHF"),
        ("123,500 MHz", "fréquence club — aérodromes trafic réduit", "Fréquences VHF"),
        ("123,450 MHz", "communication entre aéronefs", "Fréquences VHF"),
        ("123,065 MHz", "altisurfaces et altiports trafic réduit", "Fréquences VHF"),
        ("125,335 MHz", "bases ULM", "Fréquences VHF"),
    ]
    for term, ans, ref in phrases:
        qs.append(_make_q("C", 2, f"Phraséologie/doc — « {term} » signifie ?", ans, [p[1] for p in phrases], f"{term} : {ans}.", ref))

    alphabet = [
        ("A", "Alfa"), ("B", "Bravo"), ("C", "Charlie"), ("D", "Delta"), ("E", "Echo"),
        ("F", "Foxtrot"), ("G", "Golf"), ("H", "Hotel"), ("I", "India"), ("J", "Juliet"),
        ("K", "Kilo"), ("L", "Lima"), ("M", "Mike"), ("N", "November"), ("O", "Oscar"),
        ("P", "Papa"), ("Q", "Quebec"), ("R", "Romeo"), ("S", "Sierra"), ("T", "Tango"),
        ("U", "Uniform"), ("V", "Victor"), ("W", "Whiskey"), ("X", "X-Ray"), ("Y", "Yankee"), ("Z", "Zulu"),
    ]
    names = [n for _, n in alphabet]
    letters = [l for l, _ in alphabet]
    for letter, name in alphabet:
        qs.append(_make_q("C", 1, f"Alphabet OACI — lettre « {letter} » ?", name, names, f"{letter} = {name}.", "Alphabet OACI"))
        qs.append(_make_q("C", 2, f"Alphabet OACI — « {name} » correspond à quelle lettre ?", letter, letters, f"{letter} = {name}.", "Alphabet OACI"))

    lisibilite = [
        ("1", "illisible", "Échelle de lisibilité"),
        ("2", "lisible par moments", "Échelle de lisibilité"),
        ("3", "difficilement lisible", "Échelle de lisibilité"),
        ("4", "lisible", "Échelle de lisibilité"),
        ("5", "parfaitement lisible", "Échelle de lisibilité"),
    ]
    qs.extend(_from_siblings("C", [(n, d, r) for n, d, r in lisibilite], "Échelle lisibilité radio — note {topic} ?"))

    collate = [
        "Fréquence", "Code transpondeur", "Calage altimétrique", "Niveau ou altitude",
        "Cap", "Vitesse", "Piste en service", "Conditions d'une autorisation conditionnelle",
    ]
    for item in collate:
        qs.append(_make_q("C", 2, "Doc comm — information à collationner : laquelle ?", item, collate, f"{item} doit être collationné(e).", "Collationnement"))
    return qs


def gen_isa_calculations():
    qs = []
    for alt_ft in (1000, 2000, 3000, 4000, 5000, 6000, 8000, 10000):
        std = round(15 - 2 * (alt_ft / 1000), 1)
        if std == int(std):
            std_s = f"{int(std):+d}°C"
        else:
            std_s = f"{std:+.1f}°C"
        wrongs = [
            f"{int(std+2):+d}°C", f"{int(std-2):+d}°C", f"{int(std+4):+d}°C",
            f"{int(std-4):+d}°C", f"{int(std+6):+d}°C",
        ]
        opts, a = shuffle_opts(std_s, wrongs)
        qs.append(q("M", 2, f"Doc ISA — température standard à {alt_ft} ft ?", opts, a,
                    f"15 − 2×{alt_ft//1000} = {std_s}.", "ISA - calcul T°"))
    return qs


def gen_meteo_extra():
    qs = []
    facts = [
        ("Tropopause ISA altitude moyenne", "≈ 36 000 ft (11 000 m)", "ISA - tropopause"),
        ("Décroissance T° ISA en ft", "−2°C / 1000 ft jusqu'à tropopause", "ISA - température"),
        ("1000 hPa en inHg (doc US)", "29,54 inHg", "Pression - unités"),
        ("Marée baro minimums", "vers 6 h et 18 h", "Pression - variations"),
        ("Marée baro maximums", "vers 12 h et 24 h", "Pression - variations"),
        ("Thalweg", "axe des basses pressions", "Champ de pression"),
        ("Antithalweg", "axe des hautes pressions", "Champ de pression"),
        ("Brise de mer (doc)", "jour — mer vers terre", "Vents locaux"),
        ("Brise de terre (doc)", "nuit — terre vers mer", "Vents locaux"),
        ("METAR vent 26015G30KT", "vent 260° · 15 kt · rafales 30 kt", "METAR - vent"),
        ("METAR 9999", "visibilité ≥ 10 km", "METAR - visibilité"),
        ("METAR M02", "température −2°C", "METAR - température"),
        ("TAF validité", "période prévision + probabilités", "TAF - structure"),
        ("CB dans METAR", "cumulonimbus signalé", "METAR - nuages"),
        ("TCU dans METAR", "cumulus congestus signalé", "METAR - nuages"),
    ]
    qs.extend(_from_siblings("M", facts, "Doc météo — {topic} ?"))
    return qs


def gen_aero_extra():
    facts = [
        ("ISA usage navigation", "calibrage instruments et performances aéronef", "Atmosphère type ISA"),
        ("AVGAS 100LL", "essence aviation légère — bleutée", "Moteur - carburants"),
        ("Cycle Otto", "4 temps — seul temps moteur = explosion/détente", "Cycle 4 temps"),
        ("Pitot + statique bouchés", "Vi et altimètre bloqués", "Pannes circuit anémométrique"),
        ("QFE indique", "hauteur par rapport au sol de l'aérodrome", "Calages altimétriques"),
        ("1013 hPa indique", "niveau de vol (altitude pression)", "Calages altimétriques"),
        ("Gradient pression altimètre doc", "25 ft/hPa → altimètre surestime l'altitude", "Altimètre - gradient"),
        ("Hélice fixe — manche", "commande de puissance", "Hélice à calage fixe"),
        ("Hélice VPC — manche", "commande de pas + manche puissance", "Hélice à vitesse constante"),
        ("Recalage directionnel doc", "palier rectiligne ~20 min sur compas", "Conservateur de cap"),
    ]
    qs = []
    qs.extend(_from_siblings("A", facts, "Doc aéronef — {topic} ?"))
    return qs


def gen_reg_extra():
    facts = [
        ("Examen théorique PPL", "128 QCM · 9 épreuves · 75% par épreuve", "Examen théorique", "exam"),
        ("LAPL solo", "16 ans minimum", "Licence LAPL", "age"),
        ("LAPL obtention", "17 ans minimum", "Licence LAPL", "age"),
        ("PPL solo", "16 ans minimum", "Licence PPL", "age"),
        ("PPL obtention", "17 ans minimum", "Licence PPL", "age"),
        ("Visite médicale <40 ans", "validité 60 mois", "Certificat médical", "medical"),
        ("Visite médicale 40-50 ans", "validité 24 mois", "Certificat médical", "medical"),
        ("Visite médicale >50 ans", "validité 12 mois", "Certificat médical", "medical"),
        ("VFR spécial vitesse", "140 kt CAS maximum", "VFR spécial", "speed"),
        ("Survol agglo <1200 m", "1700 ft minimum", "Hauteurs de survol", "altitude"),
        ("Oxygène tous occupants", "à partir du FL130", "Équipements - oxygène", "fl"),
        ("Canot survol eau", ">50 NM côte ou >30 min de la côte", "Équipements - survol eau", "water"),
        ("FPL frontière", "dépôt 60 min avant départ", "Plan de vol", "time"),
        ("TEMSI couverture France", "surface à 15000 ft QNH", "Cartes TEMSI", "temsi"),
        ("CTR France", "classe D", "Espace aérien - CTR", "class_long"),
        ("CTA France", "classe D", "Espace aérien - CTA", "class_long"),
        ("TMA France", "classe D", "Espace aérien - TMA", "class_long"),
        ("Espace G France", "classe G", "Espace aérien - classe G", "class_long"),
    ]
    return _from_reg_facts(facts)


def gen_from_all_docs(parse_abbreviations_fn):
    qs = []
    qs.extend(gen_handcrafted_docs())
    qs.extend(gen_phraseology_and_alphabet())
    qs.extend(gen_isa_calculations())
    qs.extend(gen_meteo_extra())
    qs.extend(gen_aero_extra())
    qs.extend(gen_reg_extra())
    meteo_path = DOCS / "050_compilation_meteorologie.txt"
    if meteo_path.exists():
        qs.extend(parse_meteo_pressure_table(meteo_path.read_text(encoding="utf-8")))

    files = [
        (DOCS / "fiche_resume_communications.txt", "C", "Communications"),
        (DOCS / "020_compilation-connaissance_generale_aeronef.txt", "A", "Géométrie avion"),
        (DOCS / "050_compilation_meteorologie.txt", "M", "Atmosphère type ISA"),
        (DOCS / "010_compilation_droit-aerien_reglementation.txt", "R", "Réglementation VFR"),
    ]
    for path, mod, ref in files:
        if not path.exists():
            continue
        qs.extend(gen_from_file_definitions(path, mod, ref))
        text = path.read_text(encoding="utf-8")
        for question, ans, r in parse_examples(text, mod, ref):
            # Mauvaises réponses numériques dérivées si possible
            wrong = []
            nums = re.findall(r"[-+]?\d+(?:[,\.]\d+)?", ans)
            if nums:
                base = float(nums[0].replace(",", "."))
                unit = ans.split(nums[0], 1)[-1].strip()
                for d in (1, 2, 3, 5, 10):
                    for sign in (1, -1):
                        v = base + sign * d
                        cand = f"{int(v) if v == int(v) else v}{unit}"
                        if norm_opt(cand) != norm_opt(ans):
                            wrong.append(cand)
            wrong = unique_wrongs(ans, wrong) if wrong else unique_wrongs(ans, [])
            if len(wrong) < 3:
                continue
            opts, a = shuffle_opts(ans, wrong)
            qs.append(q(mod, 2, question, opts, a, f"Réponse doc : {ans}.", r))

    qs.extend(gen_abbreviations_full(parse_abbreviations_fn, shuffle_opts))
    return qs
