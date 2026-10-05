"""Page de validation des textes des messages (décision DP-34).

Rassemble les textes des notifications et des SMS rédigés dans CL-10, contrôle les
règles d'écriture (longueurs, SMS sans accents, jamais de code dans une notification,
pas de montant dans le SMS C1) et recalcule la série de rappels de garde S0 à S5 avec la
grille en vigueur (GARDE-GRILLE, décision DP-08) sur l'exemple du jeu d'essai, pour
proposer les textes à mettre à jour.

Usage : python3 logique-metier/outils/textes.py
"""
import json
import os
import re

DOSSIER = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def lire(nom):
    with open(os.path.join(DOSSIER, nom), encoding='utf-8') as f:
        return json.load(f)


def tableau(doc, section, sous_titre):
    for s in doc['sections']:
        if s['section'].startswith(section):
            for t in s['tableaux']:
                if t['sous_titre'] == sous_titre:
                    return t
    raise SystemExit(f'Tableau introuvable : {section} / {sous_titre}')


def sans_compte(t):
    """Texte sans le nombre de caractères noté entre parenthèses par le document."""
    return re.sub(r'\s*\(\d+\)\s*$', '', t.strip())


def F(n):
    return f'{n:,}'.replace(',', '\u00a0') + '\u00a0F'


def cellule(t):
    return str(t).replace('|', '\\|').replace('\n', ' ')


def main():
    cl10 = lire('tableaux/CL-10.json')
    vigueur = {p['code']: p for p in lire('parametres-en-vigueur.json')['parametres']}
    grille = [int(x) for x in vigueur['GARDE-GRILLE']['valeur'].split(',')]
    renvoi = int(re.match(r'\d+', vigueur['GARDE-RENVOI']['valeur']).group(0))

    pushs = tableau(cl10, 'Catalogue des textes', 'Pushs et lignes du centre')
    sms = tableau(cl10, 'Catalogue des textes', 'SMS')

    L = ['# Textes des messages, à valider', '',
         'Généré par `outils/textes.py` depuis CL-10 (« Catalogue des textes rédigés pour le prototype ») et la',
         'grille de garde en vigueur ; ne pas modifier à la main. Décision DP-34 : le porteur valide ces textes.', '',
         '> Les noms, références, montants, dates et liens sont ceux du **jeu d’essai** (données de démonstration) :',
         '> en production, le serveur les remplace par les vraies valeurs au moment de l’envoi (CDA-28).', '',
         'Pour valider : réponds « ok » pour tout, ou donne le code du message et la correction.', '']

    # ---------- Notifications ----------
    L += ['## Notifications (push)', '',
          'Règles : titre de 45 caractères au plus, texte de 120 au plus (CNT-32) ; jamais de code, d’OTP ni de montant',
          'de commande sur l’écran verrouillé (CNT-26, CNT-27).', '',
          '| Code | Catégorie | Titre | Texte | Ouvre | Contrôle |', '|---|---|---|---|---|---|']
    for l in pushs['lignes']:
        code, cat, titre, texte, _, ouvre = l['cellules']
        t, x = sans_compte(titre), sans_compte(texte)
        pb = []
        if len(t) > 45:
            pb.append(f'titre {len(t)} > 45')
        if x in ('—', '— (SMS)'):
            L.append(f'| {code} | {cellule(cat)} | {cellule(t)} | (envoyé par SMS, voir plus bas) | `{ouvre}` | ✓ titre {len(t)} car. |')
            continue
        if len(x) > 120:
            pb.append(f'texte {len(x)} > 120')
        if re.search(r'\b\d{6}\b', t + ' ' + x):
            pb.append('code à 6 chiffres interdit')
        L.append(f'| {code} | {cellule(cat)} | {cellule(t)} | {cellule(x)} | `{ouvre}` | '
                 f'{"⚠ " + ", ".join(pb) if pb else f"✓ {len(t)} / {len(x)} car."} |')
    L.append('')

    # ---------- SMS ----------
    L += ['## SMS', '',
          'Règles : 160 caractères au plus, sans accents (GSM-7), expéditeur « BelivaY » (CSM-01) ; le code de retrait',
          'seulement dans C3 et le renvoi (CCD-15), l’OTP seul dans son SMS ; C1 sans montant (CSM-03).', '',
          '| Code | Moment (démonstration) | Texte | Contrôle |', '|---|---|---|---|']
    for l in sms['lignes']:
        code, moment, texte, _ = l['cellules']
        pb = []
        if len(texte) > 160:
            pb.append(f'{len(texte)} > 160')
        accents = sorted(set(c for c in texte if ord(c) > 127))
        if accents:
            pb.append('accents : ' + ' '.join(accents))
        if re.search(r'\b\d{6}\b', texte) and not code.startswith(('C3', 'Renvoi', 'OTP')):
            pb.append('code à 6 chiffres hors C3, renvoi, OTP')
        if code == 'C1' and re.search(r'\d\s?F\b', texte):
            pb.append('montant interdit dans C1')
        L.append(f'| {code} | {cellule(moment)} | {cellule(texte)} | {"⚠ " + ", ".join(pb) if pb else f"✓ {len(texte)} car."} |')
    L.append('')

    # ---------- Garde : recalcul de l'exemple ----------
    jours = ['lun. 21', 'mar. 22', 'mer. 23', 'jeu. 24', 'ven. 25', 'sam. 26', 'dim. 27']
    ferme = {6}  # rang 7 : dimanche, relais fermé (jeu d'essai) — compté, jamais facturé
    cumul, c = [], 0
    for r, tarif in enumerate(grille):
        c += 0 if r in ferme else tarif
        cumul.append(c)
    L += ['## Rappels de garde S0 à S5 avec la grille en vigueur', '',
          f'Grille en vigueur (GARDE-GRILLE, DP-08), jour 1 à jour 7 : {", ".join(F(x) for x in grille)} ; renvoi {F(renvoi)}.',
          'Exemple du jeu d’essai : arrivée le lun. 21 sept. (jour 1), relais fermé le dimanche (jour 7, jamais facturé),',
          'renvoi le premier jour ouvert après le 7e jour (lun. 28).', '',
          '| Jour | Date | Tarif du jour | Montant dû (cumul) |', '|---|---|---|---|']
    for r, (j, tarif, cu) in enumerate(zip(jours, grille, cumul)):
        L.append(f'| {r + 1} | {j} | {"fermé (0 F)" if r in ferme else F(tarif)} | {F(cu)} |')
    dernier = max(r for r in range(7) if r not in ferme)
    retenue = cumul[dernier] + renvoi
    L += ['', f'Au renvoi : garde {F(cumul[dernier])} + renvoi {F(renvoi)} = **{F(retenue)} retenus**.', '']

    propositions = [
        ('S0', 'push', 1,
         f'Montant dû : {F(cumul[1])}. {F(grille[2])} par jour jusqu’au {jours[3]}, puis {F(grille[4])}. '
         f'Retrait avant {jours[dernier]} au soir, sinon renvoi (+ {F(renvoi)}).'),
        ('S1', 'SMS', 2,
         f'BLV-52018, Relais Mvog-Ada. Montant du : {F(cumul[2])}. {F(grille[3])} demain ({jours[3]}), '
         f'puis {F(grille[4])}. Retrait avant {jours[dernier]} au soir, sinon renvoi au vendeur (+{F(renvoi)}).'),
        ('S2', 'SMS', 4,
         f'BLV-52018, Relais Mvog-Ada. Montant du : {F(cumul[4])}. {F(grille[5])} demain ({jours[5]}). '
         f'Retrait avant le {jours[dernier]} au soir, sinon renvoi au vendeur (+{F(renvoi)}).'),
        ('S3', 'push', 5,
         f'Montant dû : {F(cumul[5])}. Relais fermé demain : retire avant 19 h, sinon renvoi au vendeur lundi 28 (+ {F(renvoi)}).'),
        ('S5', 'push', None,
         f'Frais retenus : {F(retenue)} (garde {F(cumul[dernier])} + renvoi {F(renvoi)}). Ton solde est remboursé sur ton Mobile Money.'),
    ]
    anciens = {l['cellules'][0]: l['cellules'][4] for l in tableau(cl10, 'La série de rappels', 'La série telle que la spécification la fixe, et son application à BLV-52018')['lignes']}
    L += ['### Textes proposés', '',
          'Même rédaction que CL-10, montants et paliers recalculés. Les SMS sont écrits sans accents (« Montant du »).', '',
          '| Code | Canal | Texte de CL-10 (ancienne grille) | Texte proposé (grille en vigueur) | Contrôle | Changé |', '|---|---|---|---|---|---|']
    for code, canal, r, texte in propositions:
        if canal == 'SMS':
            texte = texte.replace('\u00a0', ' ').replace('dû', 'du').replace('à', 'a').replace('é', 'e')
        limite = 160 if canal == 'SMS' else 120
        ok = len(texte) <= limite and (canal != 'SMS' or all(ord(c) < 128 for c in texte))
        ancien = anciens.get(code, '')
        # l'ancien texte peut porter le titre (« Dernier jour · … — ») ou la ligne du centre : on cherche le texte proposé dedans
        change = 'non' if re.sub(r'\s', '', texte) in re.sub(r'\s', '', ancien) else 'oui'
        L.append(f'| {code} | {canal} | {cellule(ancien)} | {cellule(texte)} | {"✓" if ok else "⚠"} {len(texte)} / {limite} | {change} |')
    L += ['', 'S4 n’est pas envoyé dans cet exemple : le jour 7 tombe un dimanche, relais fermé (CGA-25).', '',
          '### À valider aussi', '',
          '- **C2 et C3** disent « Gratuit aujourd’hui, 100 F par jour dès demain » : c’est vrai jusqu’au jour 4, puis le tarif monte.',
          '  Proposition : garder la phrase (elle annonce le palier suivant, CGA-02) ; les rappels S1 et S2 donnent la suite.',
          f'- **Plafond** affiché dans S5 et dans l’écran de garde : {F(sum(grille))} au plus, {F(sum(grille) + renvoi)} avec le renvoi',
          '  (jamais au-delà de la valeur du colis).',
          # BLV-52018 a deux colis : avec la remise par colis (DP-18), il a coûté 34 180 F (33 780 F dans CL-10) ;
          # le montant est vérifié par moteurs/tests/test_garde.py.
          f'- **Ligne du centre de S5** : « Solde remboursé : {F(34180 - retenue)} » (et non 32 280 F) : avec la remise par',
          '  colis (DP-18), BLV-52018 (2 colis) a coûté 34 180 F ; le texte du push, sans montant (CNT-27), ne change pas.', '']
    with open(os.path.join(DOSSIER, 'textes-messages.md'), 'w', encoding='utf-8') as f:
        f.write('\n'.join(L) + '\n')
    print(f'{len(pushs["lignes"])} notifications, {len(sms["lignes"])} SMS, {len(propositions)} rappels recalculés ; '
          f'cumul jour 6 : {cumul[5]} F, retenue au renvoi : {retenue} F')


if __name__ == '__main__':
    main()
