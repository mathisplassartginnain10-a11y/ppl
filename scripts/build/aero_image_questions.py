"""QCM basés sur les schémas fiche Aérogligli 020 — connaissance générale aéronef."""
from build_questions import unique_wrongs, shuffle_opts, norm_opt

IMG = "assets/docs/020/crops/{id}.jpg"
PAGE = "assets/docs/020/{page}"


def _img(crop_id=None, page=None):
    if crop_id:
        return IMG.format(id=crop_id)
    return PAGE.format(page=page)


def _q(q_fn, diff, question, correct, pool, expl, ref, img):
    wrong = unique_wrongs(correct, [x for x in pool if norm_opt(x) != norm_opt(correct)])
    if len(wrong) < 3:
        return None
    opts, a = shuffle_opts(correct, wrong)
    return q_fn("A", diff, question, opts, a, expl, ref, img=img)


def gen_aero_image_questions(q_fn):
    """Génère les QCM image module A (020)."""
    qs = []

    GEO_TERMS = [
        "Bord d'attaque", "Bord de fuite", "Saumon", "Emplanture",
        "Corde", "Flèche", "Surface alaire", "Voie", "Envergure",
    ]
    GEO_DEFS = {
        "Bord d'attaque": "partie avant de l'aile",
        "Bord de fuite": "partie arrière de l'aile",
        "Saumon": "extrémité d'aile profilée",
        "Emplanture": "jonction entre l'aile et le fuselage",
        "Corde": "droite reliant bord d'attaque au bord de fuite",
        "Flèche": "angle entre perpendiculaire à l'axe longitudinal et bord d'attaque",
        "Surface alaire": "surface totale de l'aile y compris la partie du fuselage (S)",
        "Voie": "distance entre les 2 jambes des trains principaux",
        "Envergure": "distance entre les extrémités de l'aile (E)",
    }

    img_geo = _img(crop_id="geo-aile-plan")
    for term in ["Bord d'attaque", "Bord de fuite", "Saumon", "Emplanture", "Corde", "Flèche"]:
        item = _q(
            q_fn, 2,
            f"Sur ce schéma de géométrie de l'aile (fiche Aérogligli), « {term} » désigne :",
            GEO_DEFS[term], list(GEO_DEFS.values()),
            f"Fiche géométrie : {term} = {GEO_DEFS[term]}.", "Géométrie avion — schéma", img_geo,
        )
        if item:
            qs.append(item)

    img_dim = _img(crop_id="geo-dimensions")
    for term in ["Surface alaire", "Voie", "Envergure"]:
        item = _q(
            q_fn, 2,
            f"Sur ce schéma des dimensions de l'avion, « {term} » correspond à :",
            GEO_DEFS[term], list(GEO_DEFS.values()),
            f"Fiche : {term} = {GEO_DEFS[term]}.", "Géométrie avion — schéma", img_dim,
        )
        if item:
            qs.append(item)

    item = _q(
        q_fn, 2,
        "Sur ce schéma (zone verte sur l'aile), il s'agit du :",
        "Bord d'attaque",
        ["Bord de fuite", "Saumon", "Emplanture", "Corde"],
        "La zone verte sur la fiche Aérogligli = bord d'attaque (partie avant).",
        "Géométrie avion — schéma", img_geo,
    )
    if item:
        qs.append(item)

    item = _q(
        q_fn, 2,
        "Sur ce schéma (zone bleue sur l'aile), il s'agit du :",
        "Bord de fuite",
        ["Bord d'attaque", "Saumon", "Emplanture", "Corde"],
        "La zone bleue = bord de fuite (partie arrière de l'aile).",
        "Géométrie avion — schéma", img_geo,
    )
    if item:
        qs.append(item)

    img_dc = _img(crop_id="geo-diedre-calage")
    GEO2 = {
        "Dièdre": "angle entre l'axe de l'aile et l'horizontale",
        "Angle de calage": "angle entre la corde de l'aile et l'axe longitudinal",
        "Dièdre Robin": "+14°",
    }
    for term, defn in GEO2.items():
        pool = list(GEO2.values()) + [
            "angle entre verticale et axe du train avant",
            "distance trains principaux ↔ train auxiliaire",
        ]
        item = _q(
            q_fn, 2,
            f"Sur ce schéma (fiche Aérogligli), « {term} » :",
            defn, pool,
            f"Fiche : {term} = {defn}.", "Géométrie avion — schéma", img_dc,
        )
        if item:
            qs.append(item)

    img_tr = _img(crop_id="geo-trains-angles")
    TRAIN = {
        "Empattement": "distance séparant les trains principaux et le train auxiliaire",
        "Angle de garde": "angle entre la verticale passant par le CG et l'axe des trains principaux",
        "Angle de déport": "angle entre la verticale et l'axe du train avant",
    }
    for term, defn in TRAIN.items():
        item = _q(
            q_fn, 2,
            f"Sur ce schéma des trains et angles, « {term} » :",
            defn, list(TRAIN.values()) + ["angle entre axe aile et horizontale"],
            f"Fiche : {term} = {defn}.", "Géométrie avion — schéma", img_tr,
        )
        if item:
            qs.append(item)

    img_m4 = _img(crop_id="moteur-4cyl")
    MOTEUR = {
        "bielle": "relie le piston au vilebrequin",
        "vilebrequin": "transforme le mouvement linéaire en rotation",
        "carter": "boîtier principal du moteur",
        "piston": "pièce mobile dans le cylindre",
        "cylindre": "logement du piston",
    }
    for term, defn in MOTEUR.items():
        item = _q(
            q_fn, 2,
            f"Sur ce schéma moteur 4 cylindres, le composant « {term} » :",
            defn, list(MOTEUR.values()) + ["chambre de combustion", "hélice"],
            f"Fiche moteur : {term} — {defn}.", "Moteur — schéma", img_m4,
        )
        if item:
            qs.append(item)

    img_cyl = _img(crop_id="moteur-cylindre")
    CYL = {
        "soupape": "admission ou échappement des gaz",
        "bougie": "allumage du mélange air-essence",
        "segments": "assurent l'étanchéité piston/cylindre",
        "culasse": "partie supérieure du cylindre en alliage léger",
        "fût": "partie avec ailettes de refroidissement",
    }
    for term, defn in CYL.items():
        item = _q(
            q_fn, 2,
            f"Sur ce schéma de cylindre, « {term} » :",
            defn, list(CYL.values()) + ["vilebrequin", "hélice"],
            f"Fiche : {term} — {defn}.", "Moteur — schéma", img_cyl,
        )
        if item:
            qs.append(item)

    img_an = _img(crop_id="anemo-schema")
    ANEMO = [
        ("tube Pitot", "mesure la pression totale Pt", 2),
        ("prise de pression statique", "mesure la pression statique Ps", 2),
        ("capsule anéroïde", "se déforme sous l'effet de la différence Pt−Ps", 2),
        ("cadran", "affiche la vitesse indiquée Vi", 1),
        ("système mécanique", "transmet la déformation de la capsule à l'aiguille", 3),
    ]
    pool_an = [x[1] for x in ANEMO] + ["mesure la pression dynamique seule", "gyroscope à fixité"]
    for label, defn, diff in ANEMO:
        item = _q(
            q_fn, diff,
            f"Sur ce schéma d'anémomètre, « {label} » :",
            defn, pool_an,
            f"Fiche anémomètre : {label} — {defn}.", "Anémomètre — schéma", img_an,
        )
        if item:
            qs.append(item)

    item = _q(
        q_fn, 2,
        "Sur ce schéma, la pression totale Pt est envoyée :",
        "à l'intérieur de la capsule anéroïde",
        ["dans le boîtier étanche autour de la capsule", "au tube capillaire", "directement au cadran"],
        "Pt entre dans la capsule ; Ps dans le boîtier — différentiel = vitesse.",
        "Anémomètre — schéma", img_an,
    )
    if item:
        qs.append(item)

    img_alt = _img(crop_id="alti-schema")
    ALTI = [
        ("capsules anéroïdes", "se dilatent quand la pression statique diminue (montée)", 2),
        ("molette de réglage", "permet de régler le QNH / pression de référence", 2),
        ("fenêtre de réglage", "affiche la pression de calage en hPa", 2),
        ("prise de pression statique", "alimente l'instrument en Ps", 1),
    ]
    pool_alt = [x[1] for x in ALTI] + ["mesure Pt − Ps", "tube capillaire retardé"]
    for label, defn, diff in ALTI:
        item = _q(
            q_fn, diff,
            f"Sur ce schéma d'altimètre, « {label} » :",
            defn, pool_alt,
            f"Fiche altimètre : {label} — {defn}.", "Altimètre — schéma", img_alt,
        )
        if item:
            qs.append(item)

    img_var = _img(crop_id="vario-schema")
    VARIO = [
        ("tube capillaire", "retarde la pression statique → différentiel Ps − Ps retardée", 2),
        ("capsule métallique déformable", "se dilate ou se contracte selon le différentiel de pression", 2),
        ("cadran", "indique la vitesse verticale en ft/min", 1),
    ]
    pool_var = [x[1] for x in VARIO] + ["mesure Pt − Ps", "gyroscope vertical"]
    for label, defn, diff in VARIO:
        item = _q(
            q_fn, diff,
            f"Sur ce schéma de variomètre, « {label} » :",
            defn, pool_var,
            f"Fiche variomètre : {label} — {defn}.", "Variomètre — schéma", img_var,
        )
        if item:
            qs.append(item)

    item = _q(
        q_fn, 2,
        "Sur ce schéma de variomètre, Ps (noir) entre dans :",
        "l'intérieur de la capsule",
        ["le boîtier étanche autour de la capsule", "le tube Pitot", "le cadran directement"],
        "Ps dans la capsule ; Ps retardée (P's) dans le boîtier via le tube capillaire.",
        "Variomètre — schéma", img_var,
    )
    if item:
        qs.append(item)

    img_ha = _img(crop_id="horizon-schema")
    HA = [
        ("toupie ou rotor", "axe de rotation vertical — propriété de fixité", 2),
        ("disque mobile", "partie bleue/cuivre = ciel/sol, lié au cadre extérieur", 2),
        ("maquette", "repère réglable symbolisant l'avion (assiette/inclinaison)", 2),
        ("cadre extérieur", "axe de rotation = roulis φ", 3),
        ("cadre intérieur", "axe de rotation = tangage θ", 3),
    ]
    pool_ha = [x[1] for x in HA] + ["mesure la pression statique", "axe horizontal du rotor"]
    for label, defn, diff in HA:
        item = _q(
            q_fn, diff,
            f"Sur ce schéma d'horizon artificiel, « {label} » :",
            defn, pool_ha,
            f"Fiche HA : {label} — {defn}.", "Horizon artificiel — schéma", img_ha,
        )
        if item:
            qs.append(item)

    img_dir = _img(crop_id="directionnel-schema")
    DIR = [
        ("rose des caps mobile", "indique le cap grâce au gyroscope", 2),
        ("bouton de calage", "aligne la rose sur le compas magnétique", 2),
        ("index fixe", "repère de lecture du cap au sommet", 1),
        ("toupie ou rotor", "axe horizontal — fixité dans l'espace", 2),
    ]
    pool_dir = [x[1] for x in DIR] + ["axe vertical du rotor", "mesure l'inclinaison θ"]
    for label, defn, diff in DIR:
        item = _q(
            q_fn, diff,
            f"Sur ce schéma de conservateur de cap, « {label} » :",
            defn, pool_dir,
            f"Fiche directionnel : {label} — {defn}.", "Conservateur de cap — schéma", img_dir,
        )
        if item:
            qs.append(item)

    img_coord = _img(crop_id="coordinateur-schema")
    item = _q(
        q_fn, 2,
        "Quel instrument est représenté sur ce schéma ?",
        "Coordinateur de virage",
        ["Horizon artificiel", "Conservateur de cap", "Anémomètre"],
        "Schéma fiche Aérogligli — coordinateur (bille + règle de coordination).",
        "Coordinateur de virage — schéma", img_coord,
    )
    if item:
        qs.append(item)

    # Pages complètes — identification instrument
    for page, num, name, wrong in [
        ("page-011.jpg", "011", "Anémomètre", ["Altimètre", "Variomètre", "Horizon artificiel"]),
        ("page-016.jpg", "016", "Altimètre", ["Anémomètre", "Variomètre", "Compas"]),
        ("page-019.jpg", "019", "Variomètre", ["Anémomètre", "Altimètre", "Tachymètre"]),
        ("page-021.jpg", "021", "Horizon artificiel", ["Conservateur de cap", "Coordinateur", "Altimètre"]),
        ("page-024.jpg", "024", "Conservateur de cap (directionnel)", ["Horizon artificiel", "Anémomètre", "Variomètre"]),
    ]:
        item = _q(
            q_fn, 1,
            "Quel instrument de bord correspond à cette fiche Aérogligli ?",
            name, wrong + ["Manomètre"],
            f"Page {num} de la compilation 020 = {name}.", f"Instruments — fiche {num}",
            _img(page=page),
        )
        if item:
            qs.append(item)

    return qs
