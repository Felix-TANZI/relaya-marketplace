"""Prépare les données du squelette React (étape 4) depuis le prototype et l'inventaire des pages.

Écrit, dans site/src :
- assets/logo-belivay.png et assets/chariot-belivay.png : le vrai logo et son chariot (CDS-04) ;
- ../public/favicon.png : l'icône du prototype ;
- genere/pages.json : une entrée par route du site (pages.json moins les outils du prototype),
  avec son interrupteur (FF-*), ses états et ses règles d'étape 4 ; les états que le prototype n'atteint que
  par un lien (logique-metier/etats-lies.json, écrit par site/outils/etats-lies.mjs) s'ajoutent à ceux du plan,
  marqués « lie ».

Le script s'arrête si une source manque ou si une route n'a pas d'onglet connu.

La feuille de styles et les polices (site/outils/styles.mjs), les icônes, le dictionnaire anglais et la
navigation (site/outils/prototype.mjs) se lisent dans le prototype en marche, qui les complète pendant son
exécution ; ces outils sont lancés après ce script (npm run donnees).
"""
import base64
import json
import os
import re
import sys

ICI = os.path.dirname(os.path.abspath(__file__))
LM = os.path.dirname(ICI)
RACINE = os.path.dirname(LM)
SITE = os.path.join(RACINE, 'site', 'src')
PAQUET = os.path.join(RACINE, 'Work définitif pro — 6 interfaces',
                      '2 — BelivaY Espace client — paquet développeur')
# Prototype de référence : la version complète du 1er octobre (décision du porteur, 3 oct.).
PROTO = os.path.join(PAQUET, '02_Prototype_HTML', 'BelivaY_Espace_Client_mobile.html')

ONGLETS = {'accueil', 'categories', 'panier', 'sauvegardes', 'compte', 'commandes', ''}

# Interrupteurs des modules d'après le lancement (32.1) et du portefeuille (DP-17) : tous fermés.
INTERRUPTEURS = [
    (r'^(abonnements?|abonnement-.*|mon-abonnement|cagnotte|parrainage)$', 'FF-ABONNEMENT'),
    (r'^(listes|liste-creer|liste-envies|liste-envoyer|liste-publique|liste-offrir|liste-offert)$', 'FF-LISTE-ENVIES'),
    (r'^ventes-flash$', 'FF-FLASH'),
    (r'^assistant(-.*)?$', 'FF-IA'),
    (r'^(rentree(-.*)?|ecole)$', 'FF-EX01'),
    (r'^cotisation(-.*)?$', 'FF-EX02'),
    (r'^cote(-.*)?$', 'FF-EX03'),
    (r'^troc(-.*)?$', 'FF-EX04'),
    (r'^famille(-.*)?$', 'FF-EX05'),
    (r'^wa(-.*)?$', 'FF-EX06'),
    (r'^wallet$', 'FF-WALLET'),
]


def erreur(msg):
    print('ERREUR :', msg)
    sys.exit(1)


def regles_etape4():
    """Règles d'étape 4 (squelette) par identifiant, depuis les revues."""
    out = {}
    for n in sorted(os.listdir(os.path.join(LM, 'revue'))):
        if re.match(r'CL-\d\d\.json$', n):
            for r in json.load(open(os.path.join(LM, 'revue', n), encoding='utf-8'))['regles']:
                if r['etape'] == '4':
                    out[r['id']] = r
    return out


def pages():
    inv = json.load(open(os.path.join(LM, 'pages.json'), encoding='utf-8'))
    hors = set(inv['controles']['hors_site']) | {'plan'}
    non_doc = set(inv['controles']['pages_non_documentees'])
    e4 = regles_etape4()
    lies_chemin = os.path.join(LM, 'etats-lies.json')
    lies = []
    if os.path.exists(lies_chemin):
        with open(lies_chemin, encoding='utf-8') as f:
            lies = json.load(f)
    out = []
    for p in inv['pages']:
        if p['route'] in hors:
            continue
        if p['onglet'] not in ONGLETS:
            erreur('onglet inconnu %r pour %s' % (p['onglet'], p['route']))
        ff = next((f for motif, f in INTERRUPTEURS if re.match(motif, p['route'])), None)
        if p['phase'] != 'lancement' and not ff:
            erreur('page d’après le lancement sans interrupteur : %s' % p['route'])
        out.append({
            'route': p['route'],
            'titre': p['titre'],
            'onglet': p['onglet'],
            'document': p['document'],
            'phase': p['phase'],
            'interrupteur': ff,
            'documentee': p['route'] not in non_doc,
            'sections': [s['section'] for s in p['sections']],
            'etats': [{'adresse': e['adresse'], 'libelle': e['libelle']} for e in p['etats']]
            + [{'adresse': e['adresse'], 'libelle': e['libelle'], 'lie': True} for e in lies if e['route'] == p['route']],
            'regles': len(p['regles']),
            'regles_etape4': [r['id'] for r in p['regles'] if r['id'] in e4],
            'api': [a['methode'] + ' ' + a['chemin'] for a in p['api']],
        })
    return out


def ecrit(chemin, contenu, binaire=False):
    os.makedirs(os.path.dirname(chemin), exist_ok=True)
    with open(chemin, 'wb' if binaire else 'w', **({} if binaire else {'encoding': 'utf-8'})) as f:
        f.write(contenu)


def main():
    if not os.path.isdir(SITE):
        erreur('site/src absent')
    s = open(PROTO, encoding='utf-8').read()

    m = re.search(r'const LOGO="data:image/png;base64,([^"]+)"', s)
    if not m:
        erreur('logo absent du prototype')
    ecrit(os.path.join(SITE, 'assets', 'logo-belivay.png'), base64.b64decode(m.group(1)), binaire=True)
    m = re.search(r'<link rel="icon" href="data:image/png;base64,([^"]+)"', s)
    if not m:
        erreur('icône du prototype absente')
    ecrit(os.path.join(RACINE, 'site', 'public', 'favicon.png'), base64.b64decode(m.group(1)), binaire=True)
    # Chariot du logo : bouton d'accueil à droite des en-têtes enfants (CDS-04, en-tête du 29 sept.).
    m = re.search(r'const MARK_SVG = \'<img src="data:image/png;base64,([^"]+)"', s)
    if not m:
        erreur('chariot du logo (MARK_SVG) absent du prototype')
    ecrit(os.path.join(SITE, 'assets', 'chariot-belivay.png'), base64.b64decode(m.group(1)), binaire=True)

    ps = pages()
    ecrit(os.path.join(SITE, 'genere', 'pages.json'), json.dumps(ps, ensure_ascii=False, indent=1))

    ferme = sum(1 for p in ps if p['interrupteur'])
    print('logo, chariot et icône, %d pages (%d derrière un interrupteur fermé)' % (len(ps), ferme))


if __name__ == '__main__':
    main()
