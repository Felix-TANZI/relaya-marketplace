"""Revue des règles document par document (étape 3 de la passation).

La revue elle-même est écrite à la main, une règle à la fois, dans revue/CL-XX.json :
côté (serveur, écran…), nature, étape de construction, valeurs de démonstration et note ;
tri des actions du document et réponses des données aux questions ouvertes.

Cet outil :
- vérifie que chaque règle, action et question du document est revue une fois et une seule,
  avec des valeurs permises ;
- relève les paramètres cités par chaque règle et les valeurs chiffrées (F, %, jours, heures)
  pour lesquelles aucun paramètre du registre n'a la même valeur (CCH-15 : aucune valeur dans le code) ;
- écrit revue/CL-XX.md, revue/corrections-specification.md et revue/decisions.md ;
- coche « Revue » dans suivi-regles.md (et met « — » dans Écran ou Serveur quand la règle ne
  les concerne pas), et coche les actions faites dans suivi-actions.md ;
- applique les décisions du porteur (decisions-porteur.json) : questions et actions réglées,
  paramètres en vigueur (parametres-en-vigueur.json : le registre de CL-16 avec les décisions),
  version lisible decisions-porteur.md.

Usage : python3 logique-metier/outils/revue.py
"""
import glob
import json
import os
import re
import sys
from collections import Counter, OrderedDict

DOSSIER = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REVUE = os.path.join(DOSSIER, 'revue')

COTES = ['serveur', 'serveur et écran', 'écran', 'hors code', 'prototype seulement']
NATURES = ['calcul', 'donnée et sécurité', 'architecture', 'comportement', 'navigation', 'texte et format',
           'design', 'contenu', 'organisation']
ETAPES = ['4', '5', '6', '7', 'CI', 'contenu', 'après', '—']  # « après » : module construit après le lancement (CCH-17)
TYPES = ['vérification', 'correction de la spécification', 'jeu d’essai', 'construction', 'décision', 'contenu']
# « proposée » : valeur choisie par Claude sur délégation du porteur ; appliquée avec le statut Proposé
REGLEES = ('décidée', 'proposée')
SANS_ECRAN = {'serveur', 'hors code', 'prototype seulement'}
SANS_SERVEUR = {'écran', 'hors code', 'prototype seulement'}

VALEUR = re.compile(r'(\d[\d  ]*(?:,\d+)?)\s?(F|%|jours?|j|h|min|mois)(?![\w’\'])')


def lire(nom):
    with open(os.path.join(DOSSIER, nom), encoding='utf-8') as f:
        return json.load(f)


def nombre(v):
    return re.sub(r'[\s  ]', '', v)


def controle_valeurs(texte, parametres):
    """Paramètres cités par la règle, et valeurs chiffrées sans paramètre de même valeur."""
    cites = [p['code'] for p in parametres if p['code'] in texte]
    sans = []
    for m in VALEUR.finditer(texte):
        n, unite = nombre(m.group(1)), m.group(2)
        unite = 'j' if unite.startswith('jour') else unite
        trouve = []
        for p in parametres:
            for v in VALEUR.finditer(p['valeur'] + ' ' + p['sens']):
                u = 'j' if v.group(2).startswith('jour') else v.group(2)
                if nombre(v.group(1)) == n and u == unite:
                    trouve.append(p['code'])
                    break
        if not trouve:
            sans.append(m.group(0).strip())
    return cites, list(OrderedDict.fromkeys(sans))


def cellules(ligne):
    return [c.strip() for c in ligne.strip()[1:-1].split('|')]


def ligne_md(cs):
    return '|' + '|'.join(f' {c} ' if c else ' ' for c in cs) + '|'


def cellule(t):
    return str(t).replace('|', '\\|').replace('\n', ' ')


def appliquer_decisions(regles, parametres, actions, erreurs):
    """Contrôle les décisions du porteur, écrit parametres-en-vigueur.json et decisions-porteur.md.
    Renvoie {référence (question ou action) : (décision, état)}."""
    dp = lire('decisions-porteur.json')['decisions']
    codes = {p['code'] for p in parametres}
    refs_connues = {x['id'] for d in actions.values() for x in d['actions'] + d['questions_ouvertes']}
    reglees = {}
    for x in dp:
        for r in x['regles']:
            if r not in regles:
                erreurs.append(f"{x['id']} : règle {r} inconnue")
        for c, v in x['parametres'].items():
            if c not in codes and not v.get('nouveau'):
                erreurs.append(f"{x['id']} : paramètre {c} absent du registre (ajouter « nouveau »)")
            codes.add(c)  # un paramètre créé par une décision peut être repris par une décision suivante
        for ref in x['references']:
            if re.match(r'\S+\.[AQ]\d+$', ref):
                if ref not in refs_connues:
                    erreurs.append(f"{x['id']} : référence {ref} inconnue")
                reglees[ref] = (x['id'], x['etat'])
    # Paramètres en vigueur : registre de CL-16 + décisions (la plus récente l'emporte, CCH-13)
    vigueur = [OrderedDict(p) for p in parametres]
    index = {p['code']: p for p in vigueur}
    for x in dp:
        if x['etat'] not in REGLEES:
            continue
        for c, v in x['parametres'].items():
            p = index.get(c)
            if p is None:
                p = OrderedDict(code=c, sens=v.get('sens', ''), valeur='', statut='', spec='', documents='',
                                ecrans='', code_propose=True, categorie='Créés par une décision du porteur')
                vigueur.append(p)
                index[c] = p
            else:
                p['valeur_registre'] = p['valeur']
                p['statut_registre'] = p['statut']
            p['valeur'] = v['valeur']
            p['statut'] = 'Décidé' if x['etat'] == 'décidée' else 'Proposé'
            p['decision'] = f"{x['id']} ({x['date']})"
    with open(os.path.join(DOSSIER, 'parametres-en-vigueur.json'), 'w', encoding='utf-8') as f:
        json.dump(OrderedDict(
            description='Paramètres en vigueur : le registre de CL-16 (parametres.json) avec les décisions écrites du porteur '
                        '(decisions-porteur.json). C’est ce registre que le serveur charge. Généré par outils/revue.py.',
            total=len(vigueur), modifies_ou_crees=sum(1 for p in vigueur if p.get('decision')),
            parametres=vigueur), f, ensure_ascii=False, indent=1)
    L = ['# Décisions du porteur du produit', '',
         'Généré par `outils/revue.py` depuis `decisions-porteur.json` ; ne pas modifier ce fichier à la main.',
         'CCH-13 : la décision la plus récente l’emporte sur un texte plus ancien des documents.', '']
    for x in dp:
        L += [f"## {x['id']} — {x['sujet']} ({x['etat']}, {x['date']})", '',
              f"> {x['mots_du_porteur']}", '', f"**Décision** : {x['decision']}", '',
              f"**Règles touchées** : {', '.join(x['regles'])}" + (f" · **Références** : {', '.join(x['references'])}" if x['references'] else ''), '']
        if x['parametres']:
            L += ['| Paramètre | Valeur décidée | Valeur du registre |', '|---|---|---|']
            L += [f"| `{c}`{' (nouveau)' if v.get('nouveau') else ''} | {cellule(v['valeur'])} | "
                  f"{cellule(next((p['valeur'] for p in parametres if p['code'] == c), '—'))} |" for c, v in x['parametres'].items()]
            L.append('')
        for k, t in (('a_confirmer', 'À préciser'), ('a_reporter', 'À reporter dans les documents')):
            if x.get(k):
                L += [f'**{t}** : {x[k]}', '']
    with open(os.path.join(DOSSIER, 'decisions-porteur.md'), 'w', encoding='utf-8') as f:
        f.write('\n'.join(L) + '\n')
    # Règles ajoutées après les documents (ex. portefeuille) : identifiants uniques, paramètres connus
    aj = lire('regles-ajoutees.json')
    codes_vigueur = {p['code'] for p in vigueur}
    for r in aj['regles']:
        if r['id'] in regles:
            erreurs.append(f"{r['id']} : identifiant déjà pris par le registre")
        for c in re.findall(r'\b[A-Z][A-Z0-9]+(?:-[A-Z0-9]+)+\b', r['texte']):
            if c not in codes_vigueur and c not in regles and not re.match(r'(CL|ADM|CAP|CCH|CCY|CAN|DP)-', c):
                erreurs.append(f"{r['id']} : paramètre {c} inconnu")
    A = ['# Règles ajoutées après les documents', '', aj['description'], '',
         'Généré par `outils/revue.py` depuis `regles-ajoutees.json` ; ne pas modifier ce fichier à la main.', '',
         '| Règle | Groupe | Titre | Côté | Statut | Texte | Source |', '|---|---|---|---|---|---|---|']
    A += [f"| {r['id']} | {r['groupe']} | {r['titre']} | {r['cote']} | {r['statut']} | {cellule(r['texte'])} | {r['source']} |" for r in aj['regles']]
    with open(os.path.join(DOSSIER, 'regles-ajoutees.md'), 'w', encoding='utf-8') as f:
        f.write('\n'.join(A) + '\n')
    return reglees


def main():
    regles = {r['id']: r for r in lire('regles.json')['regles']}
    parametres = lire('parametres.json')['parametres']
    actions = {d['code']: d for d in lire('actions.json')['documents']}
    revues = [json.load(open(f, encoding='utf-8')) for f in sorted(glob.glob(os.path.join(REVUE, 'CL-*.json')))]
    erreurs = []
    reglees = appliquer_decisions(regles, parametres, actions, erreurs)
    par_regle = {}
    for x in lire('decisions-porteur.json')['decisions']:
        for r in x['regles']:
            par_regle.setdefault(r, []).append(f"{x['id']} ({x['etat']})")
    corrections, decisions = [], []
    coches_regles, coches_actions, notes_questions = {}, set(), {}

    for rv in revues:
        doc = rv['document']
        attendues = [i for i, r in regles.items() if r['document'] == doc]
        vues = [e['id'] for e in rv['regles']]
        manque = sorted(set(attendues) - set(vues))
        en_trop = sorted(set(vues) - set(attendues))
        doublons = [i for i, n in Counter(vues).items() if n > 1]
        for e in rv['regles']:
            for k, permis in (('cote', COTES), ('nature', NATURES), ('etape', ETAPES)):
                if e.get(k) not in permis:
                    erreurs.append(f"{doc} {e['id']} : {k} « {e.get(k)} » non permis")
        a_doc = actions[doc]
        a_attendues = [a['id'] for a in a_doc['actions']]
        q_attendues = [q['id'] for q in a_doc['questions_ouvertes']]
        a_vues = [a['id'] for a in rv.get('actions', [])]
        q_vues = [q['id'] for q in rv.get('questions', [])]
        for a in rv.get('actions', []):
            if a['type'] not in TYPES:
                erreurs.append(f"{doc} {a['id']} : type « {a['type']} » non permis")
        if manque or en_trop or doublons:
            erreurs.append(f'{doc} règles : manquantes {manque}, en trop {en_trop}, en double {doublons}')
        if sorted(a_vues) != sorted(a_attendues):
            erreurs.append(f'{doc} actions : manquantes {sorted(set(a_attendues) - set(a_vues))}, '
                           f'en trop {sorted(set(a_vues) - set(a_attendues))}')
        if sorted(q_vues) != sorted(q_attendues):
            erreurs.append(f'{doc} questions : manquantes {sorted(set(q_attendues) - set(q_vues))}, '
                           f'en trop {sorted(set(q_vues) - set(q_attendues))}')

        # ---------- version lisible ----------
        textes_a = {a['id']: a['texte'] for a in a_doc['actions']}
        textes_q = {q['id']: q['texte'] for q in a_doc['questions_ouvertes']}
        lignes, sans_param = [], []
        for e in rv['regles']:
            r = regles.get(e['id'], {})
            cites, sans = controle_valeurs(r.get('texte', ''), parametres)
            sans = [v for v in sans if not any(nombre(v) in nombre(d) for d in e.get('demo', []))]
            if sans and e['cote'] in ('serveur', 'serveur et écran') and e['nature'] in ('calcul', 'comportement', 'donnée et sécurité'):
                sans_param.append((e['id'], sans))
            titre = r.get('titre') or re.split(r'(?<=[.!?])\s', r.get('texte', '').replace('\n', ' '), maxsplit=1)[0][:90]
            lignes.append(f"| {e['id']} | {r.get('statut', '')} | {cellule(titre)} | {e['cote']} | {e['nature']} | {e['etape']} | "
                          f"{', '.join(f'`{c}`' for c in cites)} | {cellule(', '.join(e.get('demo', [])))} | "
                          + (f"**Décision du porteur : {', '.join(par_regle[e['id']])}** · " if e['id'] in par_regle else '')
                          + f"{cellule(e.get('note', ''))} |")
            coches_regles[e['id']] = e['cote']
        cc, cn, ce = Counter(e['cote'] for e in rv['regles']), Counter(e['nature'] for e in rv['regles']), Counter(e['etape'] for e in rv['regles'])
        L = [f'# Revue de {doc}', '',
             f"Revue du {rv['date']}. {rv['methode']}", '',
             'Généré par `outils/revue.py` depuis `revue/' + doc + '.json` (la revue elle-même) ; ne pas modifier ce fichier à la main.', '',
             '## En bref', '',
             f"- **{len(rv['regles'])} règles revues** sur {len(attendues)}.",
             '- **Côté** : ' + ' · '.join(f'{k} {cc[k]}' for k in COTES if cc[k]) + '.',
             '- **Nature** : ' + ' · '.join(f'{k} {cn[k]}' for k in NATURES if cn[k]) + '.',
             '- **Étape de construction** : ' + ' · '.join(f'{k} {ce[k]}' for k in ETAPES if ce[k]) + '.',
             f"- **Actions** : {len(a_vues)} triées, dont {sum(1 for a in rv['actions'] if a.get('fait'))} faites et "
             f"{sum(1 for a in rv['actions'] if a['type'] == 'décision' and reglees.get(a['id'], ('', ''))[1] in REGLEES)} réglées par une décision ; "
             + ' · '.join(f'{t} {n}' for t, n in Counter(a['type'] for a in rv['actions']).items()) + '.',
             f"- **Questions ouvertes** : {len(q_vues)}, dont {sum(1 for q in rv['questions'] if q['decision_porteur'])} attendent une décision du porteur.", '']
        L += ['## Les règles', '',
              '| Règle | Statut | Résumé | Côté | Nature | Étape | Paramètres cités | Démonstration | Note |',
              '|---|---|---|---|---|---|---|---|---|'] + lignes + ['']
        L += ['## Valeurs chiffrées sans paramètre de même valeur', '',
              'Règles côté serveur (calcul, comportement, donnée) dont une valeur chiffrée ne correspond à aucune valeur du',
              'registre des paramètres. CCH-15 : chaque seuil, tarif, délai ou plafond doit être un paramètre. Une valeur',
              'de cette liste est soit une donnée de démonstration, soit un paramètre à créer : à trancher règle par règle.',
              'Limite : le contrôle compare des valeurs ; une valeur peut correspondre par hasard au paramètre d’une autre',
              'règle. La note de chaque règle cite les paramètres vérifiés à la main.', '']
        notes = {e['id']: e.get('note', '') for e in rv['regles']}
        L += [f"- **{i}** : {', '.join(v)}" + (' — *paramètre à créer, noté dans la règle*' if 'à créer' in notes.get(i, '') else '')
              for i, v in sans_param] or ['Aucune.']
        L += ['', '## Les actions', '', '| Action | Type | Étape | Faite | Texte | Résultat |', '|---|---|---|---|---|---|']
        for a in rv['actions']:
            L.append(f"| {a['id']} | {a['type']} | {a.get('etape', '')} | {'☑' if a.get('fait') else '☐'} | "
                     f"{cellule(textes_a.get(a['id'], ''))} | {cellule(a['resultat'])} |")
            if a.get('fait'):
                coches_actions.add(a['id'])
            if a['type'] == 'correction de la spécification':
                corrections.append((doc, a['id'], textes_a.get(a['id'], ''), a['resultat']))
        L += ['', '## Les questions ouvertes', '', '| Question | Texte | Ce que disent les données | Décision attendue du porteur |',
              '|---|---|---|---|']
        for q in rv['questions']:
            L.append(f"| {q['id']} | {cellule(textes_q.get(q['id'], ''))} | {cellule(q['reponse_donnees'])} | {cellule(q['decision_porteur'])} |")
            if q['id'] in reglees:
                dpi, etat = reglees[q['id']]
                notes_questions[q['id']] = f'{dpi} : {etat} (decisions-porteur.md)'
                if etat not in REGLEES:
                    decisions.append((doc, q['id'], textes_q.get(q['id'], ''), q['reponse_donnees'], f'En cours : {dpi}'))
            elif q['decision_porteur']:
                decisions.append((doc, q['id'], textes_q.get(q['id'], ''), q['reponse_donnees'], q['decision_porteur']))
                notes_questions[q['id']] = 'à décider (revue/decisions.md)'
            else:
                notes_questions[q['id']] = 'répondu par les données (revue/' + doc + '.md)'
        for a in rv['actions']:
            if a['id'] in reglees and reglees[a['id']][1] in REGLEES and a['type'] == 'décision':
                coches_actions.add(a['id'])
            elif a['type'] == 'décision':
                suite = f'En cours : {reglees[a["id"]][0]}' if a['id'] in reglees else a['resultat']
                decisions.append((doc, a['id'], textes_a.get(a['id'], ''), '', suite))
        with open(os.path.join(REVUE, doc + '.md'), 'w', encoding='utf-8') as f:
            f.write('\n'.join(L) + '\n')

    if erreurs:
        print('\n'.join(erreurs))
        sys.exit('ÉCART : revue incomplète ou invalide')

    # ---------- registres communs ----------
    C = ['# Corrections à reporter dans la spécification', '',
         'Les documents source (PDF) ne sont pas modifiés ici : ces corrections sont à reporter par le porteur du produit.', '',
         '| Document | Action | Ce que demande l’action | Ce qui a été relevé |', '|---|---|---|---|']
    C += [f'| {d} | {i} | {cellule(t)} | {cellule(r)} |' for d, i, t, r in corrections]
    with open(os.path.join(REVUE, 'corrections-specification.md'), 'w', encoding='utf-8') as f:
        f.write('\n'.join(C) + '\n')
    D = ['# Décisions qui attendent le porteur du produit', '',
         'Questions ouvertes et actions de décision relevées à la revue. Les données ont été consultées d’abord :',
         'ce qui reste ici ne se tranche pas sans le porteur. Les décisions prises sont dans `../decisions-porteur.md` ;',
         'elles sont retirées de cette liste et reportées dans la colonne Décision de `suivi-actions.md`.', '',
         '| Document | Réf. | Question | Ce que disent les données | Décision attendue |', '|---|---|---|---|---|']
    D += [f'| {d} | {i} | {cellule(t)} | {cellule(r)} | {cellule(x)} |' for d, i, t, r, x in decisions]
    with open(os.path.join(REVUE, 'decisions.md'), 'w', encoding='utf-8') as f:
        f.write('\n'.join(D) + '\n')

    # ---------- fiches de suivi ----------
    chemin = os.path.join(DOSSIER, 'suivi-regles.md')
    lignes = open(chemin, encoding='utf-8').read().split('\n')
    n = 0
    for k, l in enumerate(lignes):
        m = re.match(r'\| ([A-Z]{2,4}-\d{2,3}[a-z]?) \|', l)
        if m and m.group(1) in coches_regles:
            # | ID | Statut | Résumé | Décision | Revue | Écran | Serveur | Test |
            c = cellules(l)
            assert len(c) == 8, l
            cote = coches_regles[m.group(1)]
            c[4] = '☑'
            if cote in SANS_ECRAN and c[5] == '☐':
                c[5] = '—'
            if cote in SANS_SERVEUR and c[6] == '☐':
                c[6] = '—'
            lignes[k] = ligne_md(c)
            n += 1
    open(chemin, 'w', encoding='utf-8').write('\n'.join(lignes))
    chemin = os.path.join(DOSSIER, 'suivi-actions.md')
    lignes = open(chemin, encoding='utf-8').read().split('\n')
    na = nq = 0
    for k, l in enumerate(lignes):
        m = re.match(r'\| (\S+\.[AQ]\d+) \|', l)
        if not m:
            continue
        i, c = m.group(1), cellules(l)
        if i in coches_actions and c[-1] == '☐':
            c[-1] = '☑'
            na += 1
        elif i in notes_questions and c[-1] != notes_questions[i] and (
                c[-1] == '' or c[-1].startswith(('à décider', 'répondu par', 'DP-'))):
            c[-1] = notes_questions[i]
            nq += 1
        else:
            continue
        lignes[k] = ligne_md(c)
    open(chemin, 'w', encoding='utf-8').write('\n'.join(lignes))
    print(f'{len(revues)} document(s) revus · {len(coches_regles)} règles · {n} lignes de suivi-regles cochées · '
          f'{na} actions cochées · {nq} questions annotées · {len(corrections)} corrections · {len(decisions)} décisions')


if __name__ == '__main__':
    main()
