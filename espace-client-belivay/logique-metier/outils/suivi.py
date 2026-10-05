"""Génère suivi-regles.md : une ligne par règle, à cocher étape par étape.

Les cases ☐ se remplacent par ☑ à la main quand l'étape est faite :
Revue (règle lue et comprise), Écran (appliquée dans le front),
Serveur (appliquée dans le back), Test (vérifiée par un test).

Usage : python3 logique-metier/outils/suivi.py
Attention : relancer l'outil efface les cases déjà cochées. Lancez-le une
fois au départ, puis seulement si le registre change, en reportant les coches.
"""
import json
import os
import re
from collections import Counter

DOSSIER = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
STATUTS = ['À trancher', 'Proposé', 'Recommandé', 'Décidé']


def resume(r):
    if r.get('titre'):
        return r['titre']
    t = r['texte'].replace('\n', ' ')
    phrase = re.split(r'(?<=[.;:])\s', t, maxsplit=1)[0]
    if len(phrase) > 140:
        phrase = phrase[:137].rsplit(' ', 1)[0] + '…'
    return phrase.rstrip(' .;:')


def cellule(t):
    return t.replace('|', '\\|')


def main():
    with open(os.path.join(DOSSIER, 'regles.json'), encoding='utf-8') as f:
        data = json.load(f)
    regles = data['regles']
    docs = list(dict.fromkeys(r['document'] for r in regles))
    out = ['# Suivi des règles, une à une', '',
           f'{len(regles)} règles tirées de `regles.json` (registre complet de CL-16). '
           'Remplacez ☐ par ☑ quand une étape est faite :', '',
           '- **Revue** : règle lue et comprise, avec ce qu’elle demande à l’écran et au serveur ;',
           '- **Écran** : appliquée dans le site (front React) ;',
           '- **Serveur** : appliquée dans le serveur (back Django), quand elle le concerne ;',
           '- **Test** : vérifiée par un test automatique ou par la recette.', '',
           'Ce que demande chaque statut (CL-01, « Statuts des règles et des valeurs ») :', '',
           '- **Décidé** et **Recommandé** : à implémenter tel quel ; une objection à une règle « Recommandé » '
           'passe par le porteur du produit, pas par le code ;',
           '- **Proposé** : la valeur est lue dans un paramètre, modifiable dans la console sans redéploiement ;',
           '- **À trancher** : la valeur proposée est lue dans un paramètre ; seule la mise en production attend '
           'la décision, à noter dans la colonne Décision (CCH-21).', '',
           '## Sommaire', '',
           '| Document | Règles | À trancher | Proposé | Recommandé | Décidé |',
           '|---|---|---|---|---|---|']
    for d in docs:
        c = Counter(r['statut'] for r in regles if r['document'] == d)
        ancre = d.lower()
        out.append(f'| [{d}](#{ancre}) | {sum(c.values())} | ' + ' | '.join(str(c[s]) for s in STATUTS) + ' |')
    tot = Counter(r['statut'] for r in regles)
    out.append(f'| **Total** | **{len(regles)}** | ' + ' | '.join(f'**{tot[s]}**' for s in STATUTS) + ' |')

    for d in docs:
        rs = [r for r in regles if r['document'] == d]
        out += ['', f'## {d}', '',
                '| ID | Statut | Règle | Décision | Revue | Écran | Serveur | Test |',
                '|---|---|---|---|---|---|---|---|']
        groupe = None
        for r in rs:
            if r.get('groupe') and r['groupe'] != groupe:
                groupe = r['groupe']
                out.append(f'| | | **{cellule(groupe)}** | | | | | |')
            out.append(f"| {r['id']} | {r['statut']} | {cellule(resume(r))} | | ☐ | ☐ | ☐ | ☐ |")
    with open(os.path.join(DOSSIER, 'suivi-regles.md'), 'w', encoding='utf-8') as f:
        f.write('\n'.join(out) + '\n')
    print('suivi-regles.md :', len(regles), 'règles,', len(docs), 'documents')


if __name__ == '__main__':
    main()
