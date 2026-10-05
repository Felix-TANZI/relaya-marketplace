"""Inventaire des pages du site (étape 2 de la passation).

Pour chacune des routes du prototype, rassemble ce qu'il faut pour la construire :
états du Plan, sections des documents CL qui la montrent, figures et captures,
règles (avec un premier classement serveur / écran), calculs, paramètres, états
et erreurs, routes d'API, actions et questions du document, et les données de
démonstration à remplacer par des données réelles.

Rattachement, sans rien deviner :
- une section (titre h2) d'un document CL « montre » une route quand l'une de ses
  figures pointe sur cette route (#route?état) ou quand son texte dit « Route #… » ;
- les règles, calculs, paramètres et états d'erreur de la section vont aux routes
  qu'elle montre ; une section qui n'en montre aucune reste au niveau du document ;
- une capture porte le nom de sa figure (fig/NOM.jpg -> 03_Captures/*/NOM.jpg).

Le classement serveur / écran des règles est AUTOMATIQUE (mots-clés du texte) :
c'est un point de départ pour la revue de l'étape 3, pas une décision.

Les chiffres (prix, montants, commandes) sont des données de démonstration : ils ne
sont relevés que dans « donnees_demo », pour être remplacés par des données réelles.

Usage : python3 logique-metier/outils/pages.py
(après extraire.py, qui produit tableaux/CL-*.json)
"""
import html
import json
import os
import re
import sys
from collections import Counter, OrderedDict

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import extraire  # noqa: E402

RACINE = extraire.RACINE
PAQUET = os.path.join(RACINE, 'Work définitif pro — 6 interfaces',
                      '2 — BelivaY Espace client — paquet développeur')
# Prototype de référence : la version complète du 1er octobre (décision du porteur, 3 oct.).
PROTOTYPE = os.path.join(PAQUET, '02_Prototype_HTML', 'BelivaY_Espace_Client_mobile.html')
CAPTURES = os.path.join(PAQUET, '03_Captures')
THEMES = ['Fond_clair', 'Fond_sombre', 'Anglais']
DOSSIER = os.path.join(RACINE, 'logique-metier')
APRES_LANCEMENT = {'CL-14', 'CL-15'}
# Routes du prototype qui ne sont pas des pages du site
OUTILS_PROTOTYPE = {
    'plan': 'outil du prototype (Plan des états), hors site',
    'telephone': 'simulation du téléphone (écran d’accueil), hors site : CNV-06, le téléphone affiche lui-même ses notifications',
    'verrouille': 'simulation du téléphone (écran verrouillé), hors site : CNV-06',
    'android': 'simulation du téléphone (notification Android), hors site : CNV-06',
    'ile': 'simulation de la Dynamic Island, hors site : CNV-06, l’application n’en dessine aucune',
}

ID_REGLE = re.compile(r'\b[A-Z]{2,4}-\d{2,3}[a-z]?\b')

# Indices du classement automatique (minuscules, sans accents gênants)
SERVEUR = ['serveur', 'service', 'webhook', 'api', 'endpoint', 'escrow', 'base de données', 'recalcul',
           'événement', 'journal', 'horodat', 'cron', 'tâche planifiée', 'job', 'sms', 'push', 'whatsapp',
           'idempot', 'verrou', 'jeton', 'token', 'haché', 'chiffr', 'hmac', 'stock', 'réserv', 'rembours',
           'libération', 'versement', 'commission', 'prestataire', 'statut de la commande', 'transition',
           'expir', 'délai', 'calcul', 'arrondi', 'formule', 'plafond', 'seuil']
ECRAN = ['écran', 'affiche', 'bouton', 'feuille', 'bandeau', 'libellé', 'carte ', 'onglet', 'icône',
         'couleur', 'police', 'texte', 'titre', 'pastille', 'badge', 'toast', 'animation', 'geste',
         'balayage', 'clavier', 'champ', 'lien', 'en-tête', 'dock', 'menu', 'capture', 'figure',
         'gris', 'orange', 'mise en page', 'défil', 'mode sombre', 'thème']


def lire_json(chemin):
    with open(chemin, encoding='utf-8') as f:
        return json.load(f)


def texte(h):
    return extraire.propre(html.unescape(re.sub(r'<[^>]+>', ' ', h)))


# ---------- Prototype : routes et états ----------

def routes_prototype():
    src = open(PROTOTYPE, encoding='utf-8').read()
    routes = OrderedDict()
    debuts = [(m.start(), m.group(1)) for m in re.finditer(r"\broute\('([^']+)',\s*\{", src)]
    for i, (pos, rid) in enumerate(debuts):
        fin = src.find('render', pos)
        tete = src[pos:fin]

        def cle(k):
            m = re.search(r"\b" + k + r"\s*:\s*'((?:[^'\\]|\\.)*)'", tete)
            return m.group(1).replace("\\'", "'") if m else ''
        menu = re.search(r"menu\s*:\s*\{(.*?)\}", tete, re.S)
        mg = {}
        if menu:
            for k in ('g', 't', 's'):
                m = re.search(r"\b" + k + r"\s*:\s*'((?:[^'\\]|\\.)*)'", menu.group(1))
                if m:
                    mg[k] = m.group(1).replace("\\'", "'")
        routes[rid] = OrderedDict(titre=cle('title'), onglet=cle('tab'), parent=cle('parent'),
                                  document=cle('doc'), menu=mg)
    debut_plan = src.index('const PLAN=') + len('const PLAN=')
    plan, _ = json.JSONDecoder().raw_decode(src[debut_plan:])
    # états ajoutés plus loin par PLAN.push({ r: '…', d: '…', l: '…' }, …)
    for ligne in re.findall(r'PLAN\.push\((.*?)\);', src):
        for m in re.finditer(r"\{\s*r:\s*'((?:[^'\\]|\\.)*)',\s*d:\s*'([^']*)',\s*l:\s*'((?:[^'\\]|\\.)*)'\s*\}", ligne):
            plan.append({'r': m.group(1).replace("\\'", "'"), 'd': m.group(2), 'l': m.group(3).replace("\\'", "'")})
    return routes, plan


# ---------- Documents CL : sections, figures, tableaux ----------

def norm(t):
    return re.sub(r'\s+', ' ', t.replace('’', "'")).strip().lower()


def sections_document(nom, routes, plan=()):
    brut = open(os.path.join(extraire.PAGES, nom), encoding='utf-8').read()
    brut = re.sub(r'<(svg|script|style)\b.*?</\1>', '', brut, flags=re.S)
    coupes = [m.start() for m in re.finditer(r'<h2\b', brut)]
    morceaux = [brut[a:b] for a, b in zip([0] + coupes, coupes + [len(brut)])]
    sections = []
    for i, m in enumerate(morceaux):
        e = extraire.Extracteur()
        e.feed(m)
        titre = e.titre['h2'] if i else '(en-tête du document)'
        tableaux = [t for s in e.sections for t in s['tableaux']]
        # figures : image + numéro
        figures = OrderedDict()
        for fm in re.finditer(r'<img src="fig/([^"]+)\.(?:jpg|png)"[^>]*>\s*<div class="cap"><b>Figure (\d+)</b>(.*?)</div>', m, re.S):
            figures[fm.group(2)] = OrderedDict(figure=int(fm.group(2)), nom=fm.group(1), legende=texte(fm.group(3)).lstrip('· '),
                                               etat='', routes=[])
        montrees = []
        # une figure = un état du Plan : sa légende est le libellé de l'état (même document)
        code = nom.split('_')[0]
        libelles = sorted(((norm(e['l']), e['r']) for e in plan if e['d'] == code), key=lambda x: -len(x[0]))
        tetes = {}
        for l, r in libelles:
            tetes.setdefault(re.split(r' : | · ', l)[0], []).append(r)
        for fg in figures.values():
            lg = norm(fg['legende'])
            for l, r in libelles:
                if lg == l or lg.startswith(l + ' ·'):
                    fg['routes'] = [r]
                    montrees.append(r.split('?')[0])
                    break
            else:
                # même début de libellé (avant « : » ou « · »), et un seul état possible
                t = tetes.get(lg.split(' · ')[0], [])
                if len(t) == 1:
                    fg['routes'] = t
                    fg['par_debut_de_libelle'] = True
                    montrees.append(t[0].split('?')[0])
        titres = {}
        for rid, r in routes.items():
            if r['document'] == code:
                titres.setdefault(norm(r['titre']), []).append(rid)
        for fg in figures.values():
            if not fg['routes']:
                tete = norm(fg['legende'].split(' · ')[0])
                if len(titres.get(tete, [])) == 1:
                    fg['routes'] = [titres[tete][0]]
                    fg['par_titre'] = True
                    montrees.append(titres[tete][0])
        for t in tableaux:
            if t['colonnes'][:1] == ['Figure']:
                for ligne in t['lignes']:
                    c = ligne['cellules']
                    n = re.match(r'Fig\. (\d+)', c[0])
                    rs = [r for r in hashes(' '.join(c[1:]), routes)]
                    if n and n.group(1) in figures:
                        figures[n.group(1)]['etat'] = c[1] if len(c) > 1 else ''
                        # les adresses citées dans l'explication incluent les écrans vers lesquels on
                        # navigue : elles ne servent que si la figure n'a pas trouvé son état du Plan
                        if not figures[n.group(1)]['routes'] and rs:
                            figures[n.group(1)]['routes'] = rs[:1]
                            montrees.append(rs[0].split('?')[0])
        hors_tableaux = re.sub(r'<table\b.*?</table>', '', m, flags=re.S)
        for rm in re.finditer(r'Routes? <span class="mono">(.*?)</span>', hors_tableaux, re.S):
            cite = texte(rm.group(1))
            montrees += [r.split('?')[0] for r in hashes(cite, routes)]
            if cite in routes:  # « Route menu », sans dièse
                montrees.append(cite)
        sections.append(OrderedDict(titre=titre, montre=list(OrderedDict.fromkeys(montrees)),
                                    figures=list(figures.values()), tableaux=tableaux))
    return sections


def hashes(t, routes):
    """Routes du prototype citées sous la forme #route ou #route?état."""
    out = []
    for m in re.finditer(r'#([a-z][a-z0-9-]*)(\?[^\s)<"»,;]*)?', html.unescape(t)):
        if m.group(1) in routes:
            out.append(m.group(1) + (m.group(2) or ''))
    return list(OrderedDict.fromkeys(out))


def famille(t):
    cols, st = t['colonnes'], (t['sous_titre'] or '').lower()
    if cols[:2] == ['ID', 'Règle']:
        return 'regles'
    if cols[:1] == ['Condition ou formule'] or cols[:2] == ['Indicateur', 'Calcul (événements du module)']:
        return 'calculs'
    if cols[:2] == ['Code', 'Paramètre']:
        return 'parametres'
    if cols[:1] == ['Cas']:
        return 'etats_erreurs'
    if cols[:2] == ['Méthode', 'Route']:
        return 'api'
    if cols[:1] == ['Événement']:
        return 'evenements'
    if 'jeu d’essai' in st or 'jeu d\'essai' in st or any('jeu d’essai' in c.lower() for c in cols):
        return 'donnees_demo'
    if st.startswith('vérification sur l’exemple') or st.startswith('exemple de la spécification'):
        return 'donnees_demo'
    return ''


# Une règle « calcul » contient une formule, un montant, un taux, un délai ou une borne :
# le calcul se fait côté serveur (un seul service fait foi, CFR-01) et l'écran en affiche le résultat.
CALCUL = re.compile(r'[=×÷]|\b(max|min)\(|\d\s?F\b|\d\s?%|\d\s?(jours?|j|heures?|h|min|minutes?|mois|semaines?)\b'
                    r'|arrondi|plafond|maximum|minimum|au plus|au moins|pourcentage|taux|somme|total')
ECRAN_SIGNES = re.compile(r'«|\b(toucher|touche|tapée?|balay|glisse|apparaît|affiché|montre|gras|à droite|à gauche|en haut|en bas|cœur|case)')


def cote(texte_regle):
    t = texte_regle.lower()
    s = [k for k in SERVEUR if k in t]
    e = [k for k in ECRAN if k in t]
    calcul = bool(CALCUL.search(t))
    if calcul:
        s = ['calcul'] + s
    m = ECRAN_SIGNES.search(t)
    if m:
        e = [m.group(0)] + e
    c = 'serveur et écran' if s and e else 'serveur' if s else 'écran' if e else 'non classée'
    return c, calcul, s[:4], e[:4]


def debut(t, n=90):
    """Première phrase du texte d'une règle, pour la nommer quand elle n'a pas de titre."""
    p = re.split(r'(?<=[.!?])\s', t.replace('\n', ' '), maxsplit=1)[0]
    return p if len(p) <= n else p[:n].rsplit(' ', 1)[0] + '…'


def lignes_dict(t):
    return [OrderedDict(zip(t['colonnes'] or [str(i) for i in range(len(l['cellules']))], l['cellules']))
            for l in t['lignes']]


# ---------- Assemblage ----------

def main():
    routes, plan = routes_prototype()
    regles = {r['id']: r for r in lire_json(os.path.join(DOSSIER, 'regles.json'))['regles']}
    api = lire_json(os.path.join(DOSSIER, 'api.json'))
    actions = {d['code']: d for d in lire_json(os.path.join(DOSSIER, 'actions.json'))['documents']}

    pages = OrderedDict()
    for rid, r in routes.items():
        pages[rid] = OrderedDict(
            route=rid, titre=r['titre'], onglet=r['onglet'], parent=r['parent'], document=r['document'],
            phase='après le lancement' if r['document'] in APRES_LANCEMENT else 'lancement',
            menu=r['menu'], etats=[], sections=[], figures=[], regles=[], calculs=[], parametres=[],
            etats_erreurs=[], api=[])
    for e in plan:
        rid = e['r'].split('?')[0]
        pages[rid]['etats'].append(OrderedDict(adresse='#' + e['r'], libelle=e['l'], document_du_plan=e['d']))

    documents = OrderedDict()
    sections_orphelines = []
    noms = sorted(n for n in os.listdir(extraire.PAGES) if re.match(r'CL-(0[1-9]|1[0-5])_.*\.html$', n))
    for nom in noms:
        code = nom.split('_')[0]
        doc = OrderedDict(document=code, source='04_Pages_HTML/' + nom, sections_transverses=[],
                          api=[], evenements=[], donnees_demo=[],
                          actions=len(actions[code]['actions']) if code in actions else 0,
                          questions=len(actions[code]['questions_ouvertes']) if code in actions else 0,
                          suivi_actions=actions.get(code, {}).get('suivi', ''))
        for s in sections_document(nom, routes, plan):
            par = {'regles': [], 'calculs': [], 'parametres': [], 'etats_erreurs': []}
            for t in s['tableaux']:
                f = famille(t)
                if f == 'regles':
                    for l in t['lignes']:
                        par['regles'] += [i for i in ID_REGLE.findall(l['cellules'][0]) if i in regles]
                elif f in ('calculs', 'parametres', 'etats_erreurs'):
                    par[f].append(OrderedDict(section=s['titre'], sous_titre=t['sous_titre'],
                                              colonnes=t['colonnes'], lignes=lignes_dict(t)))
                elif f in ('api', 'evenements', 'donnees_demo'):
                    doc[f].append(OrderedDict(section=s['titre'], sous_titre=t['sous_titre'],
                                              colonnes=t['colonnes'], lignes=lignes_dict(t)))
            par['regles'] = list(OrderedDict.fromkeys(par['regles']))
            reference = OrderedDict(document=code, section=s['titre'])
            if s['montre']:
                for rid in s['montre']:
                    p = pages[rid]
                    p['sections'].append(reference)
                    p['regles'] += [i for i in par['regles'] if i not in p['regles']]
                    for k in ('calculs', 'parametres', 'etats_erreurs'):
                        p[k] += par[k]
                for fg in s['figures']:
                    caps = OrderedDict((th, os.path.join('03_Captures', th, fg['nom'] + '.jpg'))
                                       for th in THEMES if os.path.exists(os.path.join(CAPTURES, th, fg['nom'] + '.jpg')))
                    entree = OrderedDict(document=code, figure=fg['figure'], nom=fg['nom'], etat=fg['etat'],
                                         adresses=['#' + a for a in fg['routes']], captures=caps)
                    for rid in OrderedDict.fromkeys(a.split('?')[0] for a in fg['routes']):
                        pages[rid]['figures'].append(entree)
            elif par['regles'] or par['calculs'] or par['parametres'] or par['etats_erreurs']:
                # section sans écran propre : règles transverses (tout le site, ou services serveur)
                doc['sections_transverses'].append(OrderedDict(section=s['titre'], regles=par['regles'],
                                                               calculs=par['calculs'], parametres=par['parametres'],
                                                               etats_erreurs=par['etats_erreurs']))
                sections_orphelines.append(OrderedDict(document=code, section=s['titre'],
                                                       regles=len(par['regles']), figures=len(s['figures'])))
        documents[code] = doc

    for p in pages.values():
        d = documents.get(p['document'])
        p['voir_aussi_transverses'] = [OrderedDict(document=p['document'], section=x['section']) for x in d['sections_transverses']] if d else []

    # API : la colonne « Écran » de CL-02 nomme les routes
    for sec in api['sections']:
        for t in sec['tableaux']:
            for l in t['lignes']:
                for rid in re.findall(r'[a-z][a-z0-9-]*', l.get('ecran', '')):
                    if rid in pages:
                        pages[rid]['api'].append(OrderedDict(methode=l.get('methode', ''), chemin=l.get('chemin', ''),
                                                             role=l.get('role', ''), groupe=t['sous_titre']))

    # Règles : texte, statut et premier classement serveur / écran
    def detail(i):
        r = regles[i]
        c, calcul, s, e = cote(r['texte'])
        return OrderedDict(id=i, titre=r.get('titre') or debut(r['texte']), statut=r['statut'], document=r['document'], cote=c,
                           calcul=calcul, indices_serveur=s, indices_ecran=e)
    for p in pages.values():
        p['regles'] = [detail(i) for i in p['regles']]
    for d in documents.values():
        for st in d['sections_transverses']:
            st['regles'] = [detail(i) for i in st['regles']]

    # Pages qu'aucun document CL ne décrit (ajoutées au prototype après les documents) :
    # leurs captures sont rattachées par le nom (« Wallet_recharge » -> wallet), à vérifier.
    avec_figure = {f['nom'] for p in pages.values() for f in p['figures']}
    libres = sorted(f[:-4] for f in os.listdir(os.path.join(CAPTURES, THEMES[0]))
                    if f.endswith('.jpg') and f[:-4] not in avec_figure)
    for rid, p in pages.items():
        if rid in OUTILS_PROTOTYPE:
            p['documentation'] = OUTILS_PROTOTYPE[rid]
        elif p['sections']:
            p['documentation'] = 'décrite dans ' + ', '.join(OrderedDict.fromkeys(x['document'] for x in p['sections']))
        else:
            p['documentation'] = 'absente des documents CL : écran ajouté au prototype après les documents, sans règle écrite'
        if not p['figures']:
            cle = rid.replace('-', '_').lower()
            for nomcap in libres:
                if nomcap.lower() == cle or nomcap.lower().startswith(cle + '_'):
                    caps = OrderedDict((th, os.path.join('03_Captures', th, nomcap + '.jpg')) for th in THEMES
                                       if os.path.exists(os.path.join(CAPTURES, th, nomcap + '.jpg')))
                    p['figures'].append(OrderedDict(document='', figure=None, nom=nomcap, etat='',
                                                    adresses=[], captures=caps, par_nom=True))

    # ---------- Contrôles ----------
    rattachees = {r['id'] for p in pages.values() for r in p['regles']} | \
                 {r['id'] for d in documents.values() for st in d['sections_transverses'] for r in st['regles']}
    ecrans = {i for i, r in regles.items() if r['document'] in documents}
    toutes_captures = {f[:-4] for f in os.listdir(os.path.join(CAPTURES, THEMES[0])) if f.endswith('.jpg')}
    avec_figure = {f['nom'] for p in pages.values() for f in p['figures']}
    # Registre officiel des routes (CL-01) : même route, même titre, même document
    cl01 = lire_json(os.path.join(DOSSIER, 'tableaux', 'CL-01.json'))
    registre = {}
    for t in (t for x in cl01['sections'] for t in x['tableaux'] if t['colonnes'][:4] == ['Route', 'Titre', 'Onglet', 'Doc.']):
        for l in t['lignes']:
            registre[l['cellules'][0].split('?')[0].strip()] = l['cellules']
    ecarts = [OrderedDict(route=r, prototype=[routes[r]['titre'], routes[r]['document']], registre=[registre[r][1], registre[r][3]])
              for r in sorted(set(registre) & set(routes))
              if norm(routes[r]['titre']) != norm(registre[r][1]) or (routes[r]['document'] or registre[r][3]) != registre[r][3]]
    controles = OrderedDict(
        registre_cl01=OrderedDict(routes=len(registre), absentes_du_prototype=sorted(set(registre) - set(routes)),
                                  absentes_du_registre=sorted(set(routes) - set(registre)), ecarts_titre_document=ecarts),
        pages_non_documentees=[r for r, p in pages.items() if p['documentation'].startswith('absente')],
        hors_site=[r for r in pages if r in OUTILS_PROTOTYPE],
        routes=len(pages), etats=sum(len(p['etats']) for p in pages.values()), etats_du_plan=len(plan),
        routes_sans_etat=[r for r, p in pages.items() if not p['etats']],
        routes_sans_section=[r for r, p in pages.items() if not p['sections']],
        routes_sans_figure=[r for r, p in pages.items() if not p['figures']],
        regles_des_documents_ecrans=len(ecrans),
        regles_rattachees=len(rattachees & ecrans),
        regles_jamais_citees=sorted(ecrans - rattachees),
        captures=len(toutes_captures), captures_rattachees=len(toutes_captures & avec_figure),
        captures_sans_figure=sorted(toutes_captures - avec_figure - {f['nom'] for p in pages.values() for f in p['figures']}),
        sections_sans_route=sections_orphelines,
    )

    sortie = OrderedDict(
        description='Inventaire des pages du site client : une entrée par route du prototype, avec ce qu’il faut '
                    'pour la construire. Les chiffres affichés sont des données de démonstration.',
        source='Prototype (ROUTES, PLAN), 04_Pages_HTML CL-01 et CL-03 à CL-15, regles.json, api.json, actions.json ; '
               'généré par logique-metier/outils/pages.py',
        avertissement='Le champ « cote » des règles est un classement automatique par mots-clés, à confirmer à la '
                      'revue (étape 3). Les règles des sections sans route sont dans documents[].regles_du_document.',
        controles=controles, pages=list(pages.values()), documents=list(documents.values()))
    with open(os.path.join(DOSSIER, 'pages.json'), 'w', encoding='utf-8') as f:
        json.dump(sortie, f, ensure_ascii=False, indent=1)
    ecrire_md(sortie, regles)

    c = controles
    print(f"routes {c['routes']} · états {c['etats']}/{c['etats_du_plan']} · sans état {len(c['routes_sans_etat'])} · "
          f"sans section {len(c['routes_sans_section'])} · sans figure {len(c['routes_sans_figure'])}")
    print(f"règles des documents d'écrans {c['regles_des_documents_ecrans']} · rattachées {c['regles_rattachees']} · "
          f"jamais citées {len(c['regles_jamais_citees'])}")
    print(f"captures {c['captures']} · rattachées {c['captures_rattachees']} · sans figure {len(c['captures_sans_figure'])}")
    print(f"sections sans route {len(c['sections_sans_route'])}")
    rg = c['registre_cl01']
    print(f"registre CL-01 : {rg['routes']} routes · absentes du prototype {len(rg['absentes_du_prototype'])} · "
          f"écarts {len(rg['ecarts_titre_document'])} · en plus dans le prototype {len(rg['absentes_du_registre'])}")
    if rg['absentes_du_prototype'] or rg['ecarts_titre_document'] or c['etats'] != c['etats_du_plan'] or c['regles_jamais_citees']:
        sys.exit('ÉCART : voir les contrôles de pages.json')
    print('côté des règles :', Counter(r['cote'] for p in pages.values() for r in p['regles']))


# ---------- Version lisible ----------

def ecrire_md(s, regles):
    L = ['# Inventaire des pages du site client', '',
         'Généré par `outils/pages.py` à partir du prototype et des documents CL ; ne pas modifier à la main.',
         'Détail complet (textes des calculs, états et erreurs, API) : `pages.json`.', '',
         '> **Chiffres = données de démonstration.** Prix, montants, noms et commandes servent de départ et seront',
         '> remplacés par des données réelles. Ce qui doit être exact : les **règles de calcul et de comportement**.',
         '>',
         '> **Côté serveur / écran** : premier classement automatique (mots-clés), à confirmer à l’étape 3.', '']
    c = s['controles']
    L += ['## Contrôles', '',
          '| Contrôle | Résultat |', '|---|---|',
          f"| Routes | {c['routes']} |",
          f"| États du Plan rattachés | {c['etats']} sur {c['etats_du_plan']} |",
          f"| Routes sans état / sans section / sans figure | {len(c['routes_sans_etat'])} / {len(c['routes_sans_section'])} / {len(c['routes_sans_figure'])} |",
          f"| Règles des documents d’écrans rattachées (page ou document) | {c['regles_rattachees']} sur {c['regles_des_documents_ecrans']} |",
          f"| Captures rattachées à une figure | {c['captures_rattachees']} sur {c['captures']} |",
          f"| Registre des routes de CL-01 : routes présentes dans le prototype, même titre et même document | {c['registre_cl01']['routes'] - len(c['registre_cl01']['absentes_du_prototype']) - len(c['registre_cl01']['ecarts_titre_document'])} sur {c['registre_cl01']['routes']} |",
          f"| Routes du prototype absentes du registre de CL-01 | {len(c['registre_cl01']['absentes_du_registre'])} (les pages non documentées et les simulations du téléphone) |",
          f"| Pages non documentées (ajoutées au prototype après les documents) | {len(c['pages_non_documentees'])} |",
          f"| Routes hors site (outil du prototype, simulation du téléphone) | {len(c['hors_site'])} |", '']
    for k, t in (('pages_non_documentees', 'Pages sans règle écrite (à documenter avant de les construire)'),
                 ('hors_site', 'Routes hors site'),
                 ('routes_sans_section', 'Routes qu’aucune section ne montre'),
                 ('routes_sans_figure', 'Routes sans figure'),
                 ('regles_jamais_citees', 'Règles jamais citées dans un tableau de règles'),
                 ('captures_sans_figure', 'Captures sans figure')):
        if c[k]:
            L += [f"**{t}** ({len(c[k])}) : " + ', '.join(f'`{x}`' for x in c[k]), '']

    L += ['## Les pages', '', '| Route | Titre | Doc. | Phase | États | Captures | Règles (serveur · écran · les deux · ?) | Calculs | API |',
          '|---|---|---|---|---|---|---|---|---|']
    for p in s['pages']:
        cc = Counter(r['cote'] for r in p['regles'])
        L.append(f"| [`{p['route']}`](#{p['route']}) | {p['titre']} | {p['document']} | {p['phase']} | {len(p['etats'])} | "
                 f"{len(p['figures'])} | {len(p['regles'])} ({cc['serveur']} · {cc['écran']} · {cc['serveur et écran']} · {cc['non classée']}) | "
                 f"{sum(len(t['lignes']) for t in p['calculs'])} | {len(p['api'])} |")
    L.append('')

    for p in s['pages']:
        L += [f'<a id="{p["route"]}"></a>', f"### `#{p['route']}` — {p['titre']}", '',
              f"{p['document']} · {p['phase']}" + (f" · onglet {p['onglet']}" if p['onglet'] else '') +
              (f" · menu : {p['menu'].get('g', '')} › {p['menu'].get('t', '')}" if p['menu'] else ''), '']
        L += [f"**Documentation** : {p['documentation']}", '']
        if p['sections']:
            L.append('**Sections** : ' + ' ; '.join(f"{x['document']} « {x['section']} »" for x in p['sections']))
            L.append('')
        if p['voir_aussi_transverses']:
            L.append('**Voir aussi, règles transverses** : ' + ' ; '.join(f"« {x['section']} »" for x in p['voir_aussi_transverses']))
            L.append('')
        if p['etats']:
            L.append('**États** : ' + ' · '.join(f"`{e['adresse']}` {e['libelle']}" for e in p['etats']))
            L.append('')
        if p['figures']:
            L.append('**Captures** : ' + ' · '.join((f"`{f['nom']}` (par le nom, à vérifier)" if f.get('par_nom') else f"{f['document']} fig. {f['figure']} `{f['nom']}`") for f in p['figures']))
            L.append('')
        for titre, k in (('Règles côté serveur', 'serveur'), ('Règles côté serveur et écran', 'serveur et écran'),
                         ('Règles côté écran', 'écran'), ('Règles non classées', 'non classée')):
            rr = [r for r in p['regles'] if r['cote'] == k]
            if rr:
                L.append(f'**{titre}** ({len(rr)}) : ' + ' · '.join(f"{r['id']} {r['titre']}" + (' *(calcul)*' if r['calcul'] else '') + ('' if r['statut'] in ('Décidé', 'Recommandé') else f" *({r['statut']})*") for r in rr))
                L.append('')
        for t in p['calculs']:
            L += [f"**Calculs — {t['sous_titre'] or t['section']}**", '']
            L += ['| ' + ' | '.join(t['colonnes']) + ' |', '|' + '---|' * len(t['colonnes'])]
            L += ['| ' + ' | '.join(str(v).replace('\n', ' ').replace('|', '\\|') for v in l.values()) + ' |' for l in t['lignes']]
            L.append('')
        if p['parametres']:
            codes = [l.get('Code', '') for t in p['parametres'] for l in t['lignes']]
            L += ['**Paramètres** : ' + ', '.join(f'`{x}`' for x in OrderedDict.fromkeys(codes)), '']
        if p['etats_erreurs']:
            L += [f"**États et erreurs** : {sum(len(t['lignes']) for t in p['etats_erreurs'])} cas (détail dans `pages.json`)", '']
        if p['api']:
            L += ['**API** : ' + ' · '.join(f"`{a['methode']} {a['chemin']}`" for a in p['api']), '']

    L += ['## Par document', '', '| Doc. | Sections transverses | Règles transverses | Lignes de calcul transverses | API | Événements | Tableaux de données de démonstration | Actions | Questions |',
          '|---|---|---|---|---|---|---|---|---|']
    for d in s['documents']:
        st = d['sections_transverses']
        L.append(f"| {d['document']} | {len(st)} | {sum(len(x['regles']) for x in st)} | "
                 f"{sum(len(t['lignes']) for x in st for t in x['calculs'])} | "
                 f"{sum(len(t['lignes']) for t in d['api'])} | {sum(len(t['lignes']) for t in d['evenements'])} | "
                 f"{len(d['donnees_demo'])} | {d['actions']} ({d['suivi_actions']}) | {d['questions']} |")
    L += ['', '## Règles transverses (hors page)', '',
          'Règles et calculs qui ne dépendent pas d’un écran : principes, services serveur, moteurs, machines à états,',
          'calculs de CL-02. Ce sont souvent les règles de calcul côté serveur ; à construire à l’étape 5.', '']
    for d in s['documents']:
        for x in d['sections_transverses']:
            L += [f"### {d['document']} — {x['section']}", '']
            if x['regles']:
                L.append(' · '.join(f"{r['id']} {r['titre']}" + (' *(calcul)*' if r['calcul'] else '') +
                                    ('' if r['statut'] in ('Décidé', 'Recommandé') else f" *({r['statut']})*") for r in x['regles']))
                L.append('')
            for t in x['calculs']:
                L += [f"**Calculs — {t['sous_titre'] or x['section']}**", '']
                L += ['| ' + ' | '.join(t['colonnes']) + ' |', '|' + '---|' * len(t['colonnes'])]
                L += ['| ' + ' | '.join(str(v).replace('\n', ' ').replace('|', '\\|') for v in l.values()) + ' |' for l in t['lignes']]
                L.append('')
    with open(os.path.join(DOSSIER, 'pages.md'), 'w', encoding='utf-8') as f:
        f.write('\n'.join(L) + '\n')


if __name__ == '__main__':
    main()
