"""Extrait les tableaux des documents CL en données JSON, sans les réécrire.

Chaque tableau garde sa section (titre h2), son sous-titre (h3 ou h4 qui le
précède), ses colonnes et ses lignes. Une ligne qui n'a qu'une cellule
étalée sur toute la largeur (colspan) est un intertitre : il est recopié
dans le champ « groupe » des lignes qui la suivent.

Usage : python3 logique-metier/outils/extraire.py
"""
import json
import os
import re
from html.parser import HTMLParser

RACINE = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
PAGES = os.path.join(RACINE, 'Work définitif pro — 6 interfaces',
                     '2 — BelivaY Espace client — paquet développeur', '04_Pages_HTML')
SORTIE = os.path.join(RACINE, 'logique-metier', 'tableaux')
# Les 17 documents CL-00 à CL-16 (organiser.py n'utilise que CL-02 et CL-16 ;
# pages.py s'appuie sur les autres pour rattacher règles et calculs aux écrans)
DOCUMENTS = sorted(n for n in os.listdir(PAGES) if re.match(r'CL-\d\d_.*\.html$', n))

IGNORES = {'svg', 'style', 'script'}


def propre(texte):
    texte = texte.replace(' ', ' ').replace(' ', ' ')
    lignes = [re.sub(r'[ \t\r\f\v]+', ' ', l).strip() for l in texte.split('\n')]
    return '\n'.join(l for l in lignes if l)


class Extracteur(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.sections = []
        self.titre = {'h2': '', 'h3': '', 'h4': ''}
        self.capture = None
        self.texte_titre = ''
        self.ignore = 0
        self.table = None
        self.dans_thead = False
        self.ligne = None
        self.cellule = None
        self.gras = 0

    def section(self):
        if not self.sections or self.sections[-1]['section'] != self.titre['h2']:
            self.sections.append({'section': self.titre['h2'], 'tableaux': []})
        return self.sections[-1]

    def handle_starttag(self, tag, attrs):
        if tag in IGNORES:
            self.ignore += 1
            return
        if self.ignore:
            return
        a = dict(attrs)
        if tag in ('h2', 'h3', 'h4') and self.table is None:
            self.capture, self.texte_titre = tag, ''
        elif tag == 'table':
            self.table = {'sous_titre': self.titre['h4'] or self.titre['h3'], 'colonnes': [], 'lignes': []}
            self.groupe = ''
        elif self.table is not None:
            if tag == 'thead':
                self.dans_thead = True
            elif tag == 'tr':
                self.ligne = []
            elif tag in ('td', 'th') and self.ligne is not None:
                self.cellule = {'texte': '', 'gras': '', 'th': tag == 'th',
                                'colspan': int(a.get('colspan', 1) or 1)}
            elif tag == 'br' and self.cellule is not None:
                self.cellule['texte'] += '\n'
            elif tag in ('li', 'p', 'div') and self.cellule is not None and self.cellule['texte']:
                self.cellule['texte'] += '\n'
            elif tag == 'span' and a.get('class') == 'cpr' and self.cellule is not None:
                # étiquette « code proposé » collée à l'identifiant
                self.cellule['texte'] += ' '
            elif tag in ('b', 'strong') and self.cellule is not None:
                self.gras += 1

    def handle_endtag(self, tag):
        if tag in IGNORES:
            self.ignore = max(0, self.ignore - 1)
            return
        if self.ignore:
            return
        if tag == self.capture:
            t = propre(self.texte_titre).replace('\n', ' ')
            self.titre[tag] = t
            if tag == 'h2':
                self.titre['h3'] = self.titre['h4'] = ''
            elif tag == 'h3':
                self.titre['h4'] = ''
            self.capture = None
        elif self.table is None:
            return
        elif tag in ('b', 'strong') and self.cellule is not None:
            self.gras = max(0, self.gras - 1)
        elif tag in ('td', 'th') and self.cellule is not None:
            self.cellule['texte'] = propre(self.cellule['texte'])
            self.cellule['gras'] = propre(self.cellule['gras']).replace('\n', ' ')
            self.ligne.append(self.cellule)
            self.cellule = None
        elif tag == 'tr' and self.ligne is not None:
            self.fin_ligne()
            self.ligne = None
        elif tag == 'thead':
            self.dans_thead = False
        elif tag == 'table':
            self.section()['tableaux'].append(self.table)
            self.table = None

    def fin_ligne(self):
        cells = self.ligne
        if not cells:
            return
        if self.dans_thead or (not self.table['colonnes'] and all(c.get('th') for c in cells)):
            self.table['colonnes'] = [c['texte'] for c in cells]
            return
        nb = len(self.table['colonnes']) or len(cells)
        if len(cells) == 1 and cells[0]['colspan'] >= nb and nb > 1:
            self.groupe = cells[0]['texte']
            return
        ligne = {'cellules': [c['texte'] for c in cells]}
        gras = [c['gras'] for c in cells]
        if any(gras):
            ligne['gras'] = gras
        if self.groupe:
            ligne['groupe'] = self.groupe
        self.table['lignes'].append(ligne)

    def handle_data(self, data):
        if self.ignore:
            return
        if self.capture:
            self.texte_titre += data
        if self.cellule is not None:
            self.cellule['texte'] += data
            if self.gras and not self.cellule.get('fin_gras'):
                self.cellule['gras'] += data
        if self.cellule is not None and not self.gras and self.cellule['gras']:
            self.cellule['fin_gras'] = True


def extraire(nom):
    e = Extracteur()
    e.feed(open(os.path.join(PAGES, nom), encoding='utf-8').read())
    return e.sections


def main():
    os.makedirs(SORTIE, exist_ok=True)
    for nom in DOCUMENTS:
        sections = extraire(nom)
        code = nom.split('_')[0]
        sortie = {
            'document': code,
            'source': '04_Pages_HTML/' + nom,
            'sections': [s for s in sections if s['tableaux']],
        }
        chemin = os.path.join(SORTIE, code + '.json')
        with open(chemin, 'w', encoding='utf-8') as f:
            json.dump(sortie, f, ensure_ascii=False, indent=1)
        nt = sum(len(s['tableaux']) for s in sections)
        nl = sum(len(t['lignes']) for s in sections for t in s['tableaux'])
        print(f'{code} : {nt} tableaux, {nl} lignes -> {os.path.relpath(chemin, RACINE)}')


if __name__ == '__main__':
    main()
