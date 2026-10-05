"""Extrait les 840 actions et les questions ouvertes de
« 00 — Liste complète des actions — Espace client.pdf ».

Produit actions.json (document par document : plan d'exécution, actions,
questions ouvertes, liens) et suivi-actions.md (une ligne par action, à cocher).
Vérifie que chaque document retrouve le nombre d'actions annoncé par le guide
« À lire en premier » et s'arrête en cas d'écart.

Usage (macOS) : python3 logique-metier/outils/actions.py [chemin/vers/la/liste.pdf]
Attention : régénérer suivi-actions.md efface les cases cochées.
"""
import json
import os
import re
import subprocess
import sys
import tempfile
from collections import OrderedDict

DOSSIER = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RACINE = os.path.dirname(DOSSIER)
PAQUET = os.path.join(RACINE, 'Work définitif pro — 6 interfaces', '2 — BelivaY Espace client — paquet développeur')
PDF = os.path.join(PAQUET, '00 — Liste complète des actions — Espace client.pdf')

# Nombre d'actions par document, d'après « 00 — À lire en premier — Guide du paquet Espace client »
ATTENDU = OrderedDict([('R1', 81), ('R2', 64), ('R3', 29), ('R4', 5), ('01', 11), ('02', 33), ('03', 31),
                       ('04', 26), ('05', 14), ('06', 13), ('07', 18), ('08', 17), ('09', 25), ('10', 56),
                       ('11', 43), ('12', 56), ('13', 32), ('14', 50), ('15', 54), ('16', 61), ('17', 121)])
ID_ACTION = r'(?:REF|CL)-D\d{2}\.A\d{2,3}'
ID_QUESTION = r'(?:REF|CL)-D\d{2}\.Q\d{2,3}'


def texte_pdf(chemin):
    with tempfile.NamedTemporaryFile(suffix='.txt', delete=False) as f:
        sortie = f.name
    subprocess.run(['swift', os.path.join(DOSSIER, 'outils', 'pdftexte.swift'), chemin, sortie],
                   check=True, capture_output=True)
    with open(sortie, encoding='utf-8') as f:
        t = f.read()
    os.unlink(sortie)
    return t


def nettoyer(t):
    t = re.sub(r'\n=====PAGE \d+\n', '\n', t)
    t = re.sub(r'\nBelivaY — guide développeur[^\n]*\n', '\n', t)   # en-tête courant, parfois collé au numéro
    t = re.sub(r'\n\d{1,3}\n', '\n', t)              # numéros de page
    t = re.sub(r'\n\d+\.\d+ (?=•)', '\n', t)          # numéro de section collé à une puce
    return t


def une_ligne(t):
    t = t.replace('\n', ' ')
    t = re.sub(r'(\w)- (\w)', r'\1\2', t)            # césures de fin de ligne
    return re.sub(r'\s+', ' ', t).strip()


def entre(seg, debut, fin):
    a = seg.find(debut)
    if a < 0:
        return ''
    a += len(debut)
    b = seg.find(fin, a) if fin else -1
    return seg[a:b if b >= 0 else len(seg)]


def puces(bloc):
    return [une_ligne(p) for p in bloc.split('•')[1:] if une_ligne(p)]


def analyser(t):
    corps = t[t.find('1 Mode d’emploi\nCe document'):]
    titres = list(re.finditer(r'\n(\d+) ((?:R\d|\d\d) — [^\n]+?)\n((?:[^\n]*\n)?)\*Dossier : ([^*]+)\*', corps))
    documents = []
    for n, m in enumerate(titres):
        seg = corps[m.start(): titres[n + 1].start() if n + 1 < len(titres) else len(corps)]
        titre = une_ligne(m.group(2) + ' ' + m.group(3))
        numero, code = titre.split(' — ')[:2]
        dossier = une_ligne(m.group(4))
        suivi = re.search(r'identifiant de suivi (\S+)', dossier)
        dossier = re.sub(r'\s*·\s*identifiant de suivi \S+', '', dossier)

        plan = entre(seg, 'Plan d’exécution', 'Ce qu’il faut faire exactement')
        etapes = [une_ligne(e) for e in re.split(r'\n\d+\. ', plan)[1:]]

        bloc = entre(seg, 'Ce qu’il faut faire exactement', 'Règles et valeurs de référence')
        # Chaque page du tableau commence par son en-tête. Le texte du PDF donne, page par page,
        # la colonne des numéros, puis les actions (chacune ouverte par ☐), puis la colonne des parties.
        # Les numéros de partie sont donc les dernières lignes « partie NN » de la page ; une ligne
        # « partie NN » placée plus haut fait partie du texte d'une action (c'est le cas de CL-D03.A16).
        ids, parties, morceaux = [], [], []
        for page in bloc.split('N° Action (quoi — où — pourquoi) Partie'):
            if '☐' not in page:
                continue
            ids += re.findall(ID_ACTION, page)
            boites = page.split('☐')[1:]
            n = len(boites)
            lignes = boites[-1].rstrip('\n').split('\n')
            while lignes and re.fullmatch(r'\s*(\d+(\.\d+)*)?\s*', lignes[-1]):
                lignes.pop()                  # numéro de la section suivante (« 2.3 ») ou ligne vide
            fin = len(lignes)
            while fin > 0 and re.fullmatch(r'partie \d{2}', lignes[fin - 1].strip()) and len(lignes) - fin < n:
                fin -= 1
            parties += [l.strip()[-2:] for l in lignes[fin:]]
            boites[-1] = '\n'.join(lignes[:fin])
            morceaux += boites
        assert len(ids) == len(morceaux) == len(parties) == ATTENDU[numero], \
            (numero, len(ids), len(morceaux), len(parties), ATTENDU[numero])
        actions = []
        for i, p, x in zip(ids, parties, morceaux):
            x = re.sub(ID_ACTION, '', x)
            actions.append(OrderedDict(id=i, partie=p, texte=une_ligne(x)))

        reg = entre(seg, 'Règles et valeurs de référence', 'Questions ouvertes à trancher')
        qbloc = entre(seg, 'Questions ouvertes à trancher', 'Liens avec les autres documents et interfaces')
        questions = []
        for q in re.finditer(r'(' + ID_QUESTION + r') \(partie (\d{2})\) : (.*?)(?=•\s*' + ID_QUESTION + r'|\Z)',
                             qbloc, re.S):
            questions.append(OrderedDict(id=q.group(1), partie=q.group(2), texte=une_ligne(q.group(3)).rstrip(' •')))
        liens = puces(entre(seg, 'Liens avec les autres documents et interfaces', None))

        documents.append(OrderedDict(
            numero=numero, code=code, titre=titre, dossier=dossier,
            suivi=suivi.group(1).rstrip('*') if suivi else '',
            plan_execution=etapes, regles_et_valeurs=puces(reg),
            actions=actions, questions_ouvertes=questions, liens=liens))
    assert [d['numero'] for d in documents] == list(ATTENDU), [d['numero'] for d in documents]
    return documents


def cellule(t):
    return t.replace('|', '\\|')


def suivi_md(documents):
    na = sum(len(d['actions']) for d in documents)
    nq = sum(len(d['questions_ouvertes']) for d in documents)
    out = ['# Suivi des actions, une à une', '',
           f'{na} actions et {nq} questions ouvertes tirées de « 00 — Liste complète des actions — Espace client » '
           '(`actions.json`). Remplacez ☐ par ☑ quand une action est faite. Le détail de chaque action, '
           'ses règles et ses captures sont dans le guide développeur du document (`00 — Guide développeur — …`).',
           '', '## Sommaire', '', '| N° | Document | Actions | Questions ouvertes |', '|---|---|---|---|']
    for d in documents:
        out.append(f"| {d['numero']} | [{cellule(d['code'])}](#{d['numero'].lower()}--{d['code'].lower()}) | "
                   f"{len(d['actions'])} | {len(d['questions_ouvertes'])} |")
    out.append(f'| | **Total** | **{na}** | **{nq}** |')
    for d in documents:
        out += ['', f"## {d['numero']} · {d['code']}", '', f"{cellule(d['titre'])} — dossier : {cellule(d['dossier'])}", '',
                '| Action | Partie | Quoi — où — pourquoi | Fait |', '|---|---|---|---|']
        out += [f"| {a['id']} | {a['partie']} | {cellule(a['texte'])} | ☐ |" for a in d['actions']]
        if d['questions_ouvertes']:
            out += ['', '**Questions ouvertes**', '', '| Question | Partie | Sujet | Décision |', '|---|---|---|---|']
            out += [f"| {q['id']} | {q['partie']} | {cellule(q['texte'])} | |" for q in d['questions_ouvertes']]
    return '\n'.join(out) + '\n'


def main():
    chemin = sys.argv[1] if len(sys.argv) > 1 else PDF
    documents = analyser(nettoyer(texte_pdf(chemin)))
    na = sum(len(d['actions']) for d in documents)
    ids = [a['id'] for d in documents for a in d['actions']]
    assert na == 840 and len(set(ids)) == 840, (na, len(set(ids)))
    with open(os.path.join(DOSSIER, 'actions.json'), 'w', encoding='utf-8') as f:
        json.dump(OrderedDict(
            description='Plan d’exécution, actions et questions ouvertes de chaque document du paquet Espace client.',
            source='00 — Liste complète des actions — Espace client.pdf (27 sept. 2026), par logique-metier/outils/actions.py',
            total_actions=na, total_questions=sum(len(d['questions_ouvertes']) for d in documents),
            documents=documents), f, ensure_ascii=False, indent=1)
    with open(os.path.join(DOSSIER, 'suivi-actions.md'), 'w', encoding='utf-8') as f:
        f.write(suivi_md(documents))
    for d in documents:
        print(f"{d['numero']:>3} {d['code']:<15} actions {len(d['actions']):>3}  questions {len(d['questions_ouvertes']):>3}")
    print('total actions', na, '| questions', sum(len(d['questions_ouvertes']) for d in documents))


if __name__ == '__main__':
    main()
