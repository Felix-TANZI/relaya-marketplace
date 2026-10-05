"""Range les tableaux extraits (tableaux/CL-02.json, tableaux/CL-16.json) en
fichiers thématiques pour le développement du site.

Rien n'est réécrit : chaque ligne garde le texte exact du document, rangé
sous le nom de sa colonne. Les règles citées dans les sections de CL-02 sont
remplacées par leur identifiant, car elles figurent toutes dans regles.json.

Usage : python3 logique-metier/outils/extraire.py && python3 logique-metier/outils/organiser.py
"""
import json
import os
import re
from collections import Counter, OrderedDict

DOSSIER = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
TABLEAUX = os.path.join(DOSSIER, 'tableaux')

# Sections de CL-02 -> fichier thématique
THEMES_CL02 = OrderedDict([
    ('jeu-essai', ['Le jeu d’essai : la journée de référence', 'Le catalogue du jeu d’essai',
                   'Le panier de référence (exemple 7.3) et ses variantes', 'Les commandes de Carine',
                   'Les valeurs ajoutées par les parties',
                   'Variantes, corrections de l’assemblage et points signalés']),
    ('acteurs-et-cycle', ['Acteurs et applications', 'Le cycle de vie d’une commande, étape par étape']),
    ('machines-a-etats', ['Machines à états : la commande', 'Machines à états : la sous-commande et le colis',
                          'Machines à états : paiement et escrow',
                          'Machines à états : litige, retour et remplacement']),
    ('libelles-client', ['Libellés affichés au client']),
    ('visibilite-anonymat', ['Matrice de visibilité (anonymat)']),
    ('services-communs', ['Les services communs']),
    ('modele-donnees', ['Le modèle de données client']),
    ('calculs', ['Calculs : prix livré, attribution et délais de retrait',
                 'Calculs : moteur de frais du panier et paiement',
                 'Calculs : comptoir, délais affichés et code',
                 'Calculs : frais de garde et série de rappels S0 à S5',
                 'Calculs : annulation, changement de relais et carte depuis l’étranger',
                 'Calculs : litiges, retours et libération',
                 'Calculs : notes, Trust Score affiché et arrondis',
                 'Calculs après le lancement et budget des messages']),
    ('evenements', ['Le catalogue des événements']),
    ('api', ['API de référence : conventions', 'API de référence : les routes']),
    ('droits-acces', ['Droits d’accès et sécurité côté client']),
])

COLONNES_REGLE = ['ID', 'Règle', 'Source', 'Statut']


def lire(code):
    with open(os.path.join(TABLEAUX, code + '.json'), encoding='utf-8') as f:
        return json.load(f)


def ecrire(nom, donnees):
    with open(os.path.join(DOSSIER, nom + '.json'), 'w', encoding='utf-8') as f:
        json.dump(donnees, f, ensure_ascii=False, indent=1)


def cle(colonne):
    """« Prix (F) » -> « prix_f », pour des noms de champs stables."""
    c = colonne.lower()
    for a, b in (('àâä', 'a'), ('éèêë', 'e'), ('îï', 'i'), ('ôö', 'o'), ('ùûü', 'u'), ('ç', 'c'), ('’\'', '_')):
        c = re.sub('[' + a + ']', b, c)
    c = re.sub(r'[^a-z0-9]+', '_', c).strip('_')
    return c or 'colonne'


def objet(colonnes, ligne):
    o = OrderedDict()
    if ligne.get('groupe'):
        o['groupe'] = ligne['groupe']
    cles = []
    for col in colonnes:
        k = cle(col)
        while k in cles:
            k += '_bis'
        cles.append(k)
    for k, v in zip(cles, ligne['cellules']):
        o[k] = v
    if len(ligne['cellules']) > len(cles):
        o['autres'] = ligne['cellules'][len(cles):]
    return o


def section(doc, titre):
    for s in doc['sections']:
        if s['section'] == titre:
            return s
    raise KeyError(titre)


# ---------- Registre des règles (CL-16) ----------

def regle(ligne, document):
    rid, texte, source, statut = (ligne['cellules'] + ['', '', '', ''])[:4]
    gras = (ligne.get('gras') or ['', ''])[1] if len(ligne.get('gras') or []) > 1 else ''
    r = OrderedDict(id=rid, document=document)
    if ligne.get('groupe'):
        r['groupe'] = ligne['groupe']
    # Le titre est le début en gras de la règle, s'il ouvre bien le texte
    if gras and texte.startswith(gras):
        r['titre'] = gras.rstrip(' .:;')
    r['texte'] = texte
    r['source'] = source
    r['statut'] = statut
    return r


def registre_regles(cl16):
    s = section(cl16, 'Registre complet des règles')
    resume, listes = s['tableaux'][0], s['tableaux'][1:]
    regles = []
    for t in listes:
        assert t['colonnes'] == COLONNES_REGLE, t['sous_titre']
        document = t['sous_titre'].split(' · ')[0]
        annonce = int(re.search(r'(\d+) règles?\s*$', t['sous_titre']).group(1))
        assert len(t['lignes']) == annonce, (t['sous_titre'], len(t['lignes']))
        regles += [regle(l, document) for l in t['lignes']]
    # Contrôle croisé avec le tableau « Nombre de règles par document et par statut »
    statuts = resume['colonnes'][2:6]
    for l in resume['lignes']:
        doc = l['cellules'][0]
        if not doc.startswith('CL-'):
            continue
        attendu = dict(zip(statuts, map(int, l['cellules'][2:6])))
        compte = Counter(r['statut'] for r in regles if r['document'] == doc)
        assert all(compte[k] == v for k, v in attendu.items()), (doc, attendu, compte)
    ids = Counter(r['id'] for r in regles)
    doublons = sorted(i for i, n in ids.items() if n > 1)
    return regles, doublons


# ---------- Registre des paramètres (CL-16) ----------

def registre_parametres(cl16):
    s = section(cl16, 'Registre complet des paramètres')
    params = []
    for t in s['tableaux']:
        for l in t['lignes']:
            o = objet(t['colonnes'], l)
            code = o.get('code', '')
            propose = code.endswith(' code proposé')
            o['code'] = code.replace(' code proposé', '').strip()
            o['code_propose'] = propose
            o['categorie'] = t['sous_titre']
            params.append(o)
    return params


def tables_simples(doc, titre):
    return [OrderedDict(sous_titre=t['sous_titre'], colonnes=t['colonnes'],
                        lignes=[objet(t['colonnes'], l) for l in t['lignes']])
            for t in section(doc, titre)['tableaux']]


# ---------- Thèmes de CL-02 ----------

def themes_cl02(cl02, ids_registre):
    fichiers = {}
    absentes = []
    for nom, titres in THEMES_CL02.items():
        parties = []
        for titre in titres:
            s = section(cl02, titre)
            tableaux, regles = [], []
            for t in s['tableaux']:
                if t['colonnes'] == COLONNES_REGLE:
                    for l in t['lignes']:
                        rid = l['cellules'][0]
                        regles.append(rid)
                        if rid not in ids_registre:
                            absentes.append(rid)
                    continue
                tableaux.append(OrderedDict(sous_titre=t['sous_titre'], colonnes=t['colonnes'],
                                            lignes=[objet(t['colonnes'], l) for l in t['lignes']]))
            p = OrderedDict(section=titre, tableaux=tableaux)
            if regles:
                p['regles'] = regles
            parties.append(p)
        fichiers[nom] = parties
    return fichiers, absentes


def main():
    cl02, cl16 = lire('CL-02'), lire('CL-16')
    source = 'Extrait de CL-02 et CL-16 (04_Pages_HTML) par logique-metier/outils/'

    regles, doublons = registre_regles(cl16)
    ecrire('regles', OrderedDict(
        description='Registre complet des règles de l’espace client (CL-16), document par document.',
        source=source, total=len(regles),
        par_statut=Counter(r['statut'] for r in regles),
        par_document=Counter(r['document'] for r in regles),
        identifiants_en_double=doublons, regles=regles))

    params = registre_parametres(cl16)
    ecrire('parametres', OrderedDict(
        description='Registre complet des paramètres (codes, valeurs, statut) de CL-16.',
        source=source, total=len(params),
        par_statut=Counter(p.get('statut', '') for p in params), parametres=params))

    ecrire('a-trancher', OrderedDict(
        description='Valeurs à décider avant la mise en production ou avant d’ouvrir un module (CL-16).',
        source=source, tableaux=tables_simples(cl16, 'Valeurs à trancher avant la production')))
    ecrire('arbitrages', OrderedDict(
        description='Décisions du porteur du produit et arbitrages transverses (CL-16).',
        source=source, tableaux=tables_simples(cl16, 'Arbitrages transverses')))

    ids = {r['id'] for r in regles}
    fichiers, absentes = themes_cl02(cl02, ids)
    for nom, parties in fichiers.items():
        ecrire(nom, OrderedDict(description='Extrait de CL-02 : ' + ', '.join(p['section'] for p in parties) + '.',
                                source=source, sections=parties))

    print('règles :', len(regles), dict(Counter(r['statut'] for r in regles)))
    print('identifiants en double :', doublons)
    print('paramètres :', len(params))
    print('règles citées dans CL-02 absentes du registre :', absentes)
    for nom, parties in fichiers.items():
        print(f'{nom}.json : {sum(len(p["tableaux"]) for p in parties)} tableaux, '
              f'{sum(len(t["lignes"]) for p in parties for t in p["tableaux"])} lignes')


if __name__ == '__main__':
    main()
