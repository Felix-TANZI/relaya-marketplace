# -*- coding: utf-8 -*-
"""BelivaY · BV-DEV-09 · Moteur de référence, version 2.1 du 18 octobre 2026.

Implémentation exécutable des clauses de BV-DEV-01 à BV-DEV-05, sans aucune valeur en dur : les réglages `r_…`
et les tables `t_…` sont lus dans les données BV-DEV-07 (dossier donnees/). Chaque fonction cite les clauses qu'elle applique.
Les calculs d'argent se font en nombres exacts (fractions) et ne sont arrondis que là où une clause le dit.

Utilisation, depuis le dossier de la spécification :
    python3 moteur/belivay_moteur.py
ou avec un autre chemin : le dossier de la spécification (donnees/ et tests/) ou le fichier complet
donnees/belivay_donnees_complet.json. Rejoue tous les tests et affiche, pour chacun, « ok » ou l'écart.
Le code de sortie vaut 0 si tout passe.
Python 3.8 ou plus récent, bibliothèque standard seulement.
"""
import json
import math
import os
import sys
from fractions import Fraction as Fr

JOURS = ["lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi", "dimanche"]
ORDRE_NIV = ["centre", "peripherie", "periurbain"]


def fr(x):
    """Nombre exact à partir d'un entier ou d'un décimal du JSON."""
    return Fr(str(x)) if isinstance(x, float) else Fr(x)


def arrondi(x):
    """arrondi(x) = ⌊x + 1/2⌋ (légende)."""
    return math.floor(fr(x) + Fr(1, 2))


def plafond_sup(x):
    return math.ceil(fr(x))


def dix_inf(x):
    return 10 * math.floor(fr(x) / 10)


def cent_inf(x):
    return 100 * math.floor(fr(x) / 100)


def mediane(v):
    v = sorted(v)
    k = len(v)
    return v[k // 2] if k % 2 else Fr(v[k // 2 - 1] + v[k // 2], 2)


class Moteur:
    def __init__(self, donnees):
        self.d = donnees
        self.r = {k: v["valeur"] for k, v in donnees["reglages"].items()}
        t = donnees["tables"]
        self.fmt = {f["code"]: f for f in t["t_formats"]}
        self.niv = {n["niveau"]: self.val(n["prix"]) for n in t["t_niveaux"]}
        self.garde = [g["montant"] for g in sorted(t["t_garde"], key=lambda g: g["jour"])]
        self.familles = t["t_familles"]
        self.univers = {u["code"]: u["famille"] for u in t["t_univers"]}
        self.mult = {m["palier"]: fr(m["multiplicateur"]) for m in t["t_multiplicateurs"]}
        self.phases = t["t_phases"]
        self.poids_score = t["t_poids_score"]
        self.creneaux = t["t_creneaux"]

    def R(self, nom):
        return self.r[nom]

    def val(self, x):
        """Une valeur de table qui commence par r_ renvoie au réglage du même nom (JSON, meta.lecture)."""
        return self.r[x] if isinstance(x, str) and x.startswith("r_") else x

    # ------------------------------------------------------------------ fonctions du dictionnaire
    def km_compte(self, x):                                    # R83.1
        return arrondi(x)

    def prix_niv(self, niveau):                                # R06.2
        return self.niv[niveau]

    def sup(self, f):                                          # R09.1
        return self.val(self.fmt[f]["supplement"]) or 0

    def part(self, f):                                         # R40.1
        return self.fmt[f]["part_relais"]

    @staticmethod
    def niv_max(a, b):                                         # R06.3
        return a if ORDRE_NIV.index(a) >= ORDRE_NIV.index(b) else b

    def plafond(self, prix, part_relais=0, j1=0):              # R54.1
        return 10 * math.floor(fr(prix - part_relais - j1) / (1 + fr(self.R("r_marge"))) / 10)

    def j1(self):                                              # R54.1, R38.1
        return self.R("r_garde_relais_jour") if self.R("r_garde_j1_belivay") else 0

    # ------------------------------------------------------------------ R62, R64 : formats et colis
    def pf(self, poids, dims):                                 # R62.1
        l1, l2, l3 = sorted(dims, reverse=True)
        return max(fr(poids), fr(l1) * fr(l2) * fr(l3) / fr(self.R("r_vol_diviseur")))

    def format_article(self, poids, dims, carton):             # R62.2 à R62.6
        l1, l2, l3 = sorted((fr(x) for x in dims), reverse=True)
        pf = self.pf(poids, dims)
        F = self.fmt
        if (not carton and pf <= fr(F["P"]["poids_facture_max_kg"]) and l3 <= self.R("r_pochette_ep_max")
                and l1 + l3 <= self.R("r_pochette_l_max") and l2 + l3 <= self.R("r_pochette_la_max")):
            return "P"
        for code in ("C1", "C2"):
            d = F[code]["dimensions_max_cm"]
            if pf <= fr(F[code]["poids_facture_max_kg"]) and l1 <= d[0] and l2 <= d[1] and l3 <= d[2]:
                return code
        if pf <= fr(F["CO"]["poids_facture_max_kg"]) and l1 <= F["CO"]["plus_grande_dimension_max_cm"]:
            return "CO"
        if pf <= fr(F["XL"]["poids_facture_max_kg"]) and l1 <= F["XL"]["plus_grande_dimension_max_cm"]:
            return "XL"
        return "HG"

    def colis_boutique(self, articles):                        # R64.1 à R64.6 ; articles : (format_i, pf_i, vol_i)
        fm = [a[0] for a in articles]
        if "HG" in fm:
            return ["HG"]
        if "XL" in fm:
            return ["XL"] * fm.count("XL")
        F = self.fmt
        colis = ["CO" for a in articles if a[0] == "CO"]
        reste = sorted([(a[0], fr(a[1]), fr(a[2])) for a in articles if a[0] in ("P", "C1", "C2")], key=lambda a: (-a[2], -a[1]))
        rem = fr(self.R("r_remplissage"))
        cap_p, cap_v = fr(F["C2"]["poids_facture_max_kg"]), rem * fr(F["C2"]["volume_l"])
        bacs = []
        for a in reste:
            for b in bacs:
                if sum(x[1] for x in b) + a[1] <= cap_p and sum(x[2] for x in b) + a[2] <= cap_v:
                    b.append(a)
                    break
            else:
                bacs.append([a])
        for b in bacs:
            if len(b) == 1:
                colis.append(b[0][0])
                continue
            p_, v_ = sum(x[1] for x in b), sum(x[2] for x in b)
            if all(x[0] == "P" for x in b) and p_ <= fr(F["P"]["poids_facture_max_kg"]) and v_ <= fr(F["P"]["volume_l"]):
                colis.append("P")
            elif all(x[0] in ("P", "C1") for x in b) and p_ <= fr(F["C1"]["poids_facture_max_kg"]) and v_ <= rem * fr(F["C1"]["volume_l"]):
                colis.append("C1")
            else:
                colis.append("C2")
        return colis

    # ------------------------------------------------------------------ A1 : frais de livraison
    def frais_livraison(self, mode, dest, boutiques):
        """dest : {zone_dest, niv_client} ; boutiques : [{zone_b, niv_b, km_b, detour_b, colis_b, st_b}]."""
        st_b = [b["st_b"] for b in boutiques]
        st = sum(st_b)
        if st < self.R("r_panier_min"):                                                               # R84.1, R91.3
            return dict(refus="panier_min", manque=self.R("r_panier_min") - st)
        for i, s_ in enumerate(st_b):
            if s_ < self.R("r_boutique_min"):
                return dict(refus="boutique_min", b=i + 1, manque=self.R("r_boutique_min") - s_)
        tous = [f for b in boutiques for f in b["colis_b"]]
        xl = "XL" in tous
        if mode == "relais" and (xl or "HG" in tous):                                                 # R10.2
            return dict(refus="relais_interdit")
        if "HG" in tous:                                                                              # R10.1
            return dict(refus="devis_hg")
        zd = dest["zone_dest"]
        s_b = [self.R("r_boutique_meme_zone") if b["zone_b"] == zd else self.R("r_boutique_autre_zone") for b in boutiques]   # R08.3

        def base_niv(nv):                                                                             # R06.4, R10.3
            return self.R("r_xl_base") + self.prix_niv(nv) - self.R("r_niv_centre") if xl else self.prix_niv(nv)

        def prix_km(km, inclus):                                                                      # R05.2, R08.4
            return self.R("r_prix_km") * max(0, self.km_compte(km) - inclus)

        niv_course = None
        if mode == "relais":
            b_base = s_b.index(max(s_b))                                                              # R08.1
            base, pkm = self.R("r_relais"), 0                                                         # R04.1, R04.2
        else:
            cs = [base_niv(self.niv_max(b["niv_b"], dest["niv_client"])) + prix_km(b["km_b"], self.R("r_km_inclus")) for b in boutiques]   # R08.2
            b_base = cs.index(max(cs))                                                                # R08.1
            niv_course = self.niv_max(boutiques[b_base]["niv_b"], dest["niv_client"])                 # R06.3
            base = base_niv(niv_course)                                                               # R06.4, R10.3
            pkm = prix_km(boutiques[b_base]["km_b"], self.R("r_km_inclus"))                           # R05.2
        sup_formats = sum(self.sup(f) for f in tous)                                                  # R09.2
        c = self.R("r_relais") if mode == "relais" else self.R("r_colis_en_plus")                     # R09.4
        colis_en_plus = c * sum(len(b["colis_b"]) - 1 for b in boutiques)
        supp = []
        for i, b in enumerate(boutiques):                                                             # R08.4, R08.5
            x = s_b[i]
            if mode == "domicile" and b["zone_b"] != zd:
                x += prix_km(b["detour_b"], self.R("r_detour_inclus"))
            supp.append(x)
        boutiques_en_plus = sum(x for i, x in enumerate(supp) if i != b_base)                         # R08.6
        frais_bruts = base + pkm + sup_formats + colis_en_plus + boutiques_en_plus                    # R91.1
        seuil = self.R("r_seuil_relais") if mode == "relais" else self.R("r_seuil_dom")               # R07.1
        couv_max = self.R("r_relais") if mode == "relais" else self.R("r_niv_centre")                 # R07.2
        couverture = min(couv_max, frais_bruts) if st >= seuil else 0                                 # R07.3
        return dict(niv_course=niv_course, xl=xl, b_base=b_base + 1, base=base, prix_km=pkm, sup_formats=sup_formats,
                    colis_en_plus=colis_en_plus, boutiques_en_plus=boutiques_en_plus, frais_bruts=frais_bruts,
                    couverture=couverture, frais_client=frais_bruts - couverture, st=st, supp_b=supp)       # R91.2

    # ------------------------------------------------------------------ A2 : total à payer
    def frais_momo(self, base):                                                                       # R02.2, R02.3
        if base <= 0:
            return 0
        total = math.ceil(fr(base) / (1 - fr(self.R("r_campay")) - fr(self.R("r_campay_taxes"))))
        return total - base

    def paiement(self, mode, dest, boutiques):
        r = self.frais_livraison(mode, dest, boutiques)
        if "refus" in r:
            return r
        bp = r["st"] + r["frais_client"]                                                              # R02.1
        fm = self.frais_momo(bp)
        r.update(base_paiement=bp, frais_momo=fm, total_momo=bp + fm)
        return r

    def plafond_comptoir(self, compte):                                                               # R42.2
        if compte["nb_livrees"] == 0:
            return self.R("r_cpt_nouveau")
        return self.R("r_cpt_confirme") if compte["nb_sans_incident"] >= self.R("r_cpt_confirme_cmd") else self.R("r_cpt_panier")

    def comptoir(self, dest, boutiques, compte, mode="relais", diaspora=False):                     # R42, R02.6
        r = self.frais_livraison(mode, dest, boutiques)
        if "refus" in r:
            return r
        if mode != "relais":                                                                          # R42.8
            return dict(refus="comptoir_mode")
        if diaspora:
            return dict(refus="comptoir_interdit")
        if compte["nb_refus"] >= self.R("r_cpt_refus_max"):                                          # R42.6
            return dict(refus="comptoir_refus")
        if r["st"] > self.plafond_comptoir(compte):                                                   # R42.2
            return dict(refus="comptoir_plafond", plafond=self.plafond_comptoir(compte))
        avance = r["frais_client"] + (self.R("r_relais") if r["couverture"] > 0 else 0)
        au_comptoir = r["st"] + r["frais_client"] - avance
        r.update(avance=avance, frais_momo_avance=self.frais_momo(avance), au_comptoir=au_comptoir,
                 frais_momo_comptoir=self.frais_momo(au_comptoir))
        return r

    # ------------------------------------------------------------------ A3 : heure promise
    def _jour_suivant(self, j):                                                                       # R46.1
        j = (j + 1) % 7
        return 0 if j == 6 else j

    def promesse(self, jour, heure, mode, delai_h):
        o, f = fr(self.R("r_ouverture")), fr(self.R("r_fermeture"))
        j, h = JOURS.index(jour), fr(heure)
        if j == 6 or h >= f:                                                                          # R45.1
            j, h = self._jour_suivant(j if j != 6 else 5), o
        elif h < o:
            h = o
        reste = fr(delai_h)                                                                           # R45.2
        while h + reste > f:
            reste -= f - h
            j, h = self._jour_suivant(j), o
        pj, ph = j, h + reste
        if mode == "domicile":                                                                        # R45.3
            if ph <= self.R("r_heure_limite"):
                pr = (pj, min(f, math.ceil(ph + self.R("r_promesse_h"))))
            else:
                pr = (self._jour_suivant(pj), fr(self.R("r_heure_limite")))
        else:                                                                                         # R45.4, t_creneaux
            mat, apm = self.creneaux
            if ph < fr(mat["prets_jusqua_h"]):
                pr = (pj, fr(apm["depot_avant_h"]))
            elif ph <= fr(apm["prets_jusqua_h"]):
                pr = (self._jour_suivant(pj), fr(mat["depot_avant_h"]))
            else:
                pr = (self._jour_suivant(pj), fr(apm["depot_avant_h"]))
        jp = JOURS.index(jour)
        quand = "aujourd'hui" if pr[0] == jp else ("demain" if pr[0] == (jp + 1) % 7 else JOURS[pr[0]])   # R45.6
        hh, mm = int(pr[1]), int((pr[1] - int(pr[1])) * 60)
        texte = ("Livré" if mode == "domicile" else "Disponible au relais") + f" {quand} avant {hh} h" + (f" {mm:02d}" if mm else "")
        return dict(pret=(JOURS[pj], ph), promesse=(JOURS[pr[0]], pr[1]), texte=texte)

    def echeance(self, jour, heure, pret):                                                            # R44.2
        """Retourne (jours après le jour du paiement, heure) ; pret = (jour de la semaine, heure)."""
        o, f = fr(self.R("r_ouverture")), fr(self.R("r_fermeture"))
        j, h = JOURS.index(jour), fr(heure)
        if j == 6:
            dj, hh = 1, o
        elif h >= f:
            dj, hh = (2 if j == 5 else 1), o
        elif h < o:
            dj, hh = 0, o
        else:
            dj, hh = 0, h
        pj = JOURS.index(pret[0])
        pret_abs = (dj + (pj - (j + dj)) % 7, fr(pret[1]))
        reste = fr(self.R("r_echeance_h"))
        while reste > 0:
            if (j + dj) % 7 == 6:
                dj, hh = dj + 1, Fr(0)
                continue
            if reste <= 24 - hh:
                hh, reste = hh + reste, 0
            else:
                reste -= 24 - hh
                dj, hh = dj + 1, Fr(0)
        return max((dj, hh), pret_abs) + (pret_abs[0],)

    # ------------------------------------------------------------------ R93, R35, R34, R20, R22, R40, R10.5
    def selection_panier(self, mode, dest, articles, offres, vendeurs):
        import itertools
        cand = []
        for a in articles:
            lst = list(offres[a["id"]])
            if len(articles) > self.R("r_panier_articles_recherche"):                                 # R93.5
                lst = sorted(lst, key=lambda o: -o["score"])[:self.R("r_panier_offres_recherche")]
            cand.append(lst)

        def evaluer(combo):
            par_v = {}
            for a, o in zip(articles, combo):
                par_v.setdefault(o["vendeur"], []).append((a, o))
            bs = []
            for v, lst in par_v.items():
                lignes = [(a["format"], a["pf"], a["vol"]) for a, o in lst for _ in range(a["q"])]
                vd = vendeurs[v]
                bs.append(dict(zone_b=vd["zone_b"], niv_b=vd["niv_b"], km_b=vd["km_b"], detour_b=vd["detour_b"], colis_b=self.colis_boutique(lignes),
                               st_b=sum(o["prix"] * a["q"] for a, o in lst)))
            r = self.frais_livraison(mode, dest, bs)
            if "refus" in r:
                return None
            return r["st"] + r["frais_client"], r["frais_client"]
        best = None
        for idx in itertools.product(*[range(len(c)) for c in cand]):                                 # R93.3
            combo = [cand[k][i] for k, i in enumerate(idx)]
            ev = evaluer(combo)
            if ev is None:
                continue
            cle = (-round(sum(o["retard"] for o in combo), 9), ev[0], idx)
            if best is None or cle < best[0]:
                best = (cle, combo)
        if best is None:
            return dict(refus="panier_min")
        combo = list(best[1])
        for k in range(len(articles)):                                                                # R93.4
            v = combo[k]["vendeur"]
            if sum(1 for o in combo if o["vendeur"] == v) > 1:
                continue
            for kk in range(len(articles)):
                V = combo[kk]["vendeur"]
                if kk == k or V == v:
                    continue
                o = next((x for x in cand[k] if x["vendeur"] == V), None)
                if o is None or fr(o["part_reelle"]) > fr(o["part_cible"]) + fr(self.R("r_regroupement_pts")):
                    continue
                essai = combo[:k] + [o] + combo[k + 1:]
                if evaluer(essai) is not None:
                    combo = essai
                    break
        ev = evaluer(combo)
        return dict(choix={a["id"]: o["id"] for a, o in zip(articles, combo)}, total=ev[0], frais_client=ev[1])

    def bascule(self, prix_paye, commission_b, offres):                                               # R35.2, R35.3
        lim = min(fr(self.R("r_ecart_rempl")) * prix_paye, fr(commission_b))
        ok = [o for o in offres if o["trust"] >= self.R("r_trust_rempl") and o["prix"] - prix_paye <= lim]
        if not ok:
            return dict(remplacante=None, avance_belivay=0, rembourse=prix_paye)
        r = sorted(ok, key=lambda o: (-round(o["retard"], 9), -round(o["score"], 9)))[0]
        d = r["prix"] - prix_paye
        return dict(remplacante=r["id"], avance_belivay=max(0, d), rembourse=max(0, -d))

    def conseil_prix(self, prix_saisi, zones, prix_actifs, plancher):                                 # R34.1, R34.2
        g = [cent_inf(z["ctl_concurrent_min"] - z["livraison_vendeur"] - self.R("r_conseil_ecart")) for z in zones]
        v = sorted(prix_actifs)
        c = v[max(1, math.ceil(fr(self.R("r_conseil_centile")) * len(v) / 100)) - 1]
        return dict(prix_gagnants=g, centile=c, prix_conseille=min(prix_saisi, max(mediane(g), c, self.R("r_prix_min_publiable"), plancher)))

    def commission_partielle(self, commission_b, montant_garde, st_b):                                # R20.2
        return arrondi(fr(commission_b) * montant_garde / st_b)

    def versement(self, montants):                                                                    # R22.3, R43.2
        tot = sum(montants)
        f = math.ceil(fr(self.R("r_versement")) * tot) if tot > 0 else 0
        return dict(montant=tot, frais_versement=f, recu=tot - f)

    def versement_relais(self, formats, jours, nb_comptoir, especes):                                 # R40.4, R40.5
        m_ = sum(self.part(f) for f in formats) + sum(self.part_garde(j) for j in jours) + self.R("r_relais_comptoir_bonus") * nb_comptoir - especes
        return self.versement([m_]) if m_ > 0 else dict(montant=m_, frais_versement=0, recu=m_)

    def prix_hg(self, prix_achat):                                                                    # R10.5
        return max(self.R("r_hg_min"), math.ceil(fr(prix_achat) * (1 + fr(self.R("r_marge")))))

    # ------------------------------------------------------------------ A1 depuis les articles (R62, R64)
    def commande(self, mode, dest, boutiques):
        """boutiques : [{zone_b, niv_b, km_b, detour_b, articles[{prix_i, q_i, poids_i, dimensions_cm, carton_i}]}]."""
        bs = []
        for b in boutiques:
            lignes = []
            for a in b["articles"]:
                fmt = self.format_article(a["poids_i"], a["dimensions_cm"], a["carton_i"])
                l1, l2, l3 = a["dimensions_cm"]
                lignes += [(fmt, self.pf(a["poids_i"], a["dimensions_cm"]), fr(l1) * fr(l2) * fr(l3) / 1000)] * a["q_i"]     # R64.1
            bs.append(dict(zone_b=b["zone_b"], niv_b=b["niv_b"], km_b=b["km_b"], detour_b=b["detour_b"], colis_b=self.colis_boutique(lignes),
                           st_b=sum(a["prix_i"] * a["q_i"] for a in b["articles"])))
        r = self.paiement(mode, dest, bs)
        r["colis_b"] = [b["colis_b"] for b in bs]
        return r

    # ------------------------------------------------------------------ A4, A5 : garde, incidents, remboursements
    def garde_colis(self, j, valeur=None):                                                            # R36.2
        g = sum(self.garde[:j])
        return g if valeur is None else min(g, valeur)

    def part_garde(self, j):                                                                          # R38.1
        return self.R("r_garde_relais_jour") * (j if self.R("r_garde_j1_belivay") else max(0, j - 1))

    def frais_absence(self, formats):                                                                 # R51.4, R51.6
        if "XL" in formats:
            return self.R("r_absence_sup")
        return self.R("r_absence_sup") + sum(self.part(f) + self.R("r_garde_relais_jour") for f in formats)

    def couv_concernee(self, couverture, produits, st):                                               # R85.4
        return fr(couverture) * produits / st

    def rembourse_non_retire(self, produits, couv_concernee, gardes, absence_non_payee):              # R39.2
        return max(0, arrondi(produits - fr(couv_concernee) - sum(gardes) - absence_non_payee))

    def rembourse_refus_porte(self, produits, couv_concernee):                                        # R85.2
        return max(0, arrondi(produits - fr(couv_concernee) - self.R("r_refus_sup")))

    def rembourse_xl_sans_creneau(self, produits, couv_concernee, course_retour):                     # R51.7
        return max(0, arrondi(produits - fr(couv_concernee) - self.R("r_absence_sup") - course_retour))

    def jour_garde(self, heures_ecoulees, heures_fermeture=0):                                        # R37.1
        return math.floor((fr(heures_ecoulees) - fr(heures_fermeture)) / self.R("r_garde_heures")) + 1

    # ------------------------------------------------------------------ A7 : commission
    def bareme_article(self, prix, univers, mic):                                                     # R16.4, R17.1
        p = fr(prix)
        pts = (self.R("r_pts_petit_prix") if p < self.R("r_petit_prix") else 0) - (self.R("r_pts_mic") if mic else 0)
        com, bas = Fr(0), Fr(0)
        for tr in self.familles[self.univers[univers]]["tranches"]:
            haut = tr["borne_haute"]
            h = p if haut is None else min(p, fr(haut))
            if h > bas:
                com += max(Fr(0), fr(tr["taux_pct"]) + pts) / 100 * (h - bas)
            if haut is None or p <= haut:
                break
            bas = fr(haut)
        return com

    def commission(self, articles, palier, decouverte, couv_b):
        """articles : [{prix_i, q_i, univers_i, mic_i}] ; couv_b : part de la couverture de la boutique (R14.3)."""
        st_b = sum(a["prix_i"] * a["q_i"] for a in articles)
        dec = fr(self.R("r_decouverte")) if decouverte else Fr(1)                                       # R17.2
        bareme_b = sum(self.bareme_article(a["prix_i"], a["univers_i"], a["mic_i"]) * a["q_i"] for a in articles) * self.mult[palier] * dec   # R15.2
        cb = fr(couv_b)
        plancher_offert = cb + max(fr(self.R("r_marge_min_f")), fr(self.R("r_marge_min_part")) * st_b) if cb > 0 else Fr(0)            # R14.2
        cands = [("bareme_b", bareme_b), ("taux_min", fr(self.R("r_com_taux_min")) * st_b), ("com_min", fr(self.R("r_com_min"))),
                 ("plancher_offert_b", plancher_offert)]
        commission_b = arrondi(max(c[1] for c in cands))                                              # R14.1
        tva_b = arrondi(fr(self.R("r_tva")) * commission_b)                                          # R21.2
        return dict(st_b=st_b, bareme_b=bareme_b, bareme_b_exact=str(bareme_b), commission_b=commission_b, tva_b=tva_b, net_b=st_b - commission_b - tva_b,
                    plancher_retenu=max(cands, key=lambda c: c[1])[0])                               # R22.1

    # ------------------------------------------------------------------ A8 : rentabilité
    def rentabilite(self, mode, fmt, n_colis, prix_i, q_i, univers_i, palier, decouverte, mic_i, liv_brut_b, couv_b, est_b_base,
                    achat_impose_par_colis=None, liv_brut_autres=()):
        com = self.commission([dict(prix_i=prix_i, q_i=q_i, univers_i=univers_i, mic_i=mic_i)], palier, decouverte, couv_b)["commission_b"]
        liv_b = liv_brut_b - fr(couv_b)                                                               # R92.1
        if mode == "relais":                                                                          # R92.3
            j1 = self.j1()
            achat = achat_impose_par_colis if achat_impose_par_colis is not None else self.plafond(self.R("r_relais") + self.sup(fmt), self.part(fmt), j1)
            couts = (achat + self.part(fmt) + j1) * n_colis
        elif achat_impose_par_colis is not None:
            couts = achat_impose_par_colis
        elif est_b_base:
            couts = self.plafond(liv_brut_b + sum(liv_brut_autres)) - sum(self.plafond(x) for x in liv_brut_autres)
        else:
            couts = self.plafond(liv_brut_b)
        if est_b_base:
            couts += self.R("r_sms_max") * self.R("r_sms_cout")
        reste = com + liv_b - couts                                                                   # R92.2
        return dict(commission_b=com, liv_b=liv_b, couts_b=couts, reste_b=reste, exigence=reste >= 0,
                    objectif=reste >= fr(self.R("r_objectif_reste")) * couts)                        # R92.4

    # ------------------------------------------------------------------ A6 : meilleure offre
    def phase(self, m):                                                                               # R29.2
        ph = [p for p in self.phases if p["mois_debut"] <= m]
        return max(ph, key=lambda p: p["mois_debut"])

    def meilleure_offre(self, offres, mode, dest, m):
        el = [dict(o) for o in offres if o["trust"] >= self.R("r_trust_min") and o.get("zone_couverte", True) and o.get("stock", 1) > 0
              and not (mode == "relais" and o["format"] in ("XL", "HG"))]                             # R32.1, R10.2
        med = mediane([o["prix"] for o in el]) if el else 0                                           # R33.1
        for o in el:
            if o["format"] == "HG":
                liv = self.R("r_hg_min")                                                              # R10.7
            else:
                b = dict(zone_b=o["zone_b"], niv_b=o["niv_b"], km_b=o["km_b"], detour_b=0, colis_b=[o["format"]], st_b=self.R("r_panier_min"))
                liv = self.frais_livraison(mode, dest, [b])["frais_bruts"]
            o["ctl"] = o["prix"] + liv                                                                # R27.2
            o["controle"] = len(el) >= self.R("r_controle_des") and abs(o["prix"] - med) > fr(self.R("r_ecart_mediane")) * med   # R33.2
        ok = [o for o in el if not o["controle"]]
        ctl_min = min(o["ctl"] for o in ok)                                                           # R29.3
        ph = self.phase(m)
        tol = min(math.floor(ctl_min * fr(ph["taux"])), ph["maximum"])                                # R29.4
        course = []
        for o in ok:
            ecart = o["ctl"] - ctl_min
            if ecart <= tol:                                                                          # R29.5
                s_prix = 100.0 if tol == 0 else 100.0 * (1 - ecart / tol)                             # R30.1
                s_delai = 100.0 if o["delai_h"] <= self.R("r_prep_h") else (50.0 if o["delai_h"] <= self.R("r_echeance_h") else 0.0)   # R30.3
                s_stock = min(100.0, 100.0 * o["stock"] / self.R("r_stock_plein"))                    # R30.4
                note = o["note"] if o["note"] is not None else self.R("r_note_sans_avis")            # R30.5
                s = dict(prix=s_prix, trust=float(o["trust"]), delai=s_delai, stock=s_stock, avis=100.0 * note / 5)
                o["score"] = (sum(self.poids_score[k] * s[k] for k in self.poids_score) / sum(self.poids_score.values())
                              + (self.R("r_bonus_mic") if o.get("mic") else 0))                     # R30.6
                o["poids"] = o["score"] ** self.R("r_exposant")                                       # R31.1
                course.append(o)
        n = len(course)                                                                               # R31.2, R31.3
        if n == 1:
            course[0]["part_cible"] = 1.0
        else:
            hi = self.R("r_part_max") if (n >= self.R("r_part_max_des") and n * self.R("r_part_max") >= 1) else 1.0
            pmin = min(self.R("r_part_min_nouveau"), 1.0 / n)

            def parts(k):
                return [min(hi, max(pmin if o["nouveau"] else 0.0, k * o["poids"])) for o in course]
            a_, b_ = 0.0, 1.0 / min(o["poids"] for o in course)
            for _ in range(200):
                mid = (a_ + b_) / 2
                if sum(parts(mid)) < 1:
                    a_ = mid
                else:
                    b_ = mid
            for o, p in zip(course, parts(b_)):
                o["part_cible"] = p
        for o in course:
            o["retard"] = o["part_cible"] - o["part_reelle"]                                          # R31.5
        retenue = sorted(course, key=lambda o: (-round(o["retard"], 9), -round(o["score"], 9),
                                                (0, 0) if o["dernier_service"] is None else (1, o["dernier_service"])))[0]   # R31.6
        return dict(phase=ph["phase"], ctl_min=ctl_min, tol=tol, med=med, en_course=course, retenue=retenue["id"])


# ---------------------------------------------------------------------- chargement
def charger(chemin):
    """Dossier de la spécification (donnees/reglages.json, donnees/tables/, tests/) ou fichier JSON complet."""
    if os.path.isdir(chemin):
        lire = lambda f: json.load(open(f, encoding="utf-8"))
        d = dict(reglages=lire(os.path.join(chemin, "donnees", "reglages.json")), tables={}, tests={})
        for f in sorted(os.listdir(os.path.join(chemin, "donnees", "tables"))):
            if f.endswith(".json"):
                d["tables"][f[:-5]] = lire(os.path.join(chemin, "donnees", "tables", f))
        for f in sorted(os.listdir(os.path.join(chemin, "tests"))):
            if f.endswith(".json") and f != "schema.json":
                d["tests"][f[:-5]] = lire(os.path.join(chemin, "tests", f))
        return d
    with open(chemin, encoding="utf-8") as fh:
        return json.load(fh)


# ---------------------------------------------------------------------- rejeu des tests du JSON
def _egal(a, b, tol=1e-6):
    if isinstance(a, (int, float, Fr)) and isinstance(b, (int, float, Fr)) and not isinstance(a, bool):
        return abs(float(a) - float(b)) <= tol
    return a == b


def rejouer(donnees):
    m = Moteur(donnees)
    T = donnees["tests"]
    res = []

    def cmp(tid, attendu, obtenu):
        ecarts = [f"{k} : attendu {attendu[k]!r}, obtenu {obtenu.get(k)!r}" for k in attendu if not _egal(attendu[k], obtenu.get(k))]
        res.append((tid, ecarts))

    for t in T["livraison"]:
        cmp(t["id"], t["attendu"], m.paiement(t["mode"], t["destination"], t["boutiques"]))
    for t in T["commande"]:
        cmp(t["id"], t["attendu"], m.commande(t["mode"], t["destination"], t["boutiques"]))
    for t in T["comptoir"]:
        cmp(t["id"], t["attendu"], m.comptoir(t["destination"], t["boutiques"], t["compte"], t["mode"]))
    for t in T["format_article"]:
        cmp(t["id"], t["attendu"], dict(pf_i=m.pf(t["poids_i"], t["dimensions_cm"]), format_i=m.format_article(t["poids_i"], t["dimensions_cm"], t["carton_i"])))
    for t in T["regroupement"]:
        cmp(t["id"], t["attendu"], dict(colis_b=m.colis_boutique([(a["format_i"], a["pf_i"], a["vol_i"]) for a in t["articles"]])))
    for t in T["commission"]:
        cmp(t["id"], t["attendu"], m.commission(t["articles"], t["palier"], t["decouverte"], t["couv_b"]))
    for t in T["rentabilite"]:
        cmp(t["id"], t["attendu"], m.rentabilite(t["mode"], t["format"], t["n_colis"], t["prix_i"], t["q_i"], t["univers_i"], t["palier"], t["decouverte"],
                                                 t["mic_i"], t["liv_brut_b"], t["couv_b"], t["est_b_base"],
                                                 m.R("r_wink_exc_prix") if t["ligne_wink"] else None, t["liv_brut_autres"]))
    for t in T["meilleure_offre"]:
        r = m.meilleure_offre(t["offres"], t["mode"], t["destination"], t["m"])
        a = t["attendu"]
        ecarts = [f"{k} : attendu {a[k]!r}, obtenu {r[k]!r}" for k in ("phase", "ctl_min", "tol", "med", "retenue") if not _egal(a[k], r[k])]
        ob = {o["id"]: o for o in r["en_course"]}
        if set(ob) != {o["id"] for o in a["en_course"]}:
            ecarts.append("offres en course différentes")
        else:
            for o in a["en_course"]:
                for k in ("ctl", "score", "part_cible"):
                    if not _egal(o[k], ob[o["id"]][k], 1e-5):
                        ecarts.append(f"{o['id']}.{k} : attendu {o[k]}, obtenu {ob[o['id']][k]}")
        res.append((t["id"], ecarts))
    for t in T["promesse"]:
        r = m.promesse(t["jour"], t["heure"], t["mode"], t["delai_h"])
        a = t["attendu"]
        e = m.echeance(t["jour"], t["heure"], r["pret"])
        jp = JOURS.index(t["jour"])
        dp = e[2]
        ok = (r["pret"][0] == a["pret"]["jour"] and _egal(r["pret"][1], a["pret"]["heure"]) and r["promesse"][0] == a["promesse"]["jour"]
              and dp == a["pret"]["jours_apres_paiement"] and dp + (JOURS.index(r["promesse"][0]) - JOURS.index(r["pret"][0])) % 7 == a["promesse"]["jours_apres_paiement"]
              and _egal(r["promesse"][1], a["promesse"]["heure"]) and r["texte"] == a["texte"]
              and e[0] == a["echeance"]["jours_apres_paiement"] and _egal(e[1], a["echeance"]["heure"]))
        res.append((t["id"], [] if ok else [f"attendu {a}, obtenu {r}, échéance {e}"]))
    for t in T["garde"]:
        cmp(t["id"], t["attendu"], dict(garde_colis=m.garde_colis(t["j"], t["valeur_colis"]), part_garde=m.part_garde(t["j"])))
    for t in T["jour_garde"]:
        j = m.jour_garde(t["heures_ecoulees"], t["heures_fermeture"])
        cmp(t["id"], t["attendu"], dict(j=j, renvoi=j > m.R("r_garde_jours")))
    for t in T["frais_absence"]:
        cmp(t["id"], t["attendu"], dict(frais_absence=m.frais_absence(t["formats"])))
    for t in T["remboursement"]:
        cc = m.couv_concernee(t["couverture"], t["produits"], t["st"]) if "st" in t else t["couv_concernee"]
        if t["regle"] == "R39.2":
            v = m.rembourse_non_retire(t["produits"], cc, t["garde_colis"], t["frais_absence_non_payes"])
        elif t["regle"] == "R85.2":
            v = m.rembourse_refus_porte(t["produits"], cc)
        else:
            v = m.rembourse_xl_sans_creneau(t["produits"], cc, t["course_retour"])
        cmp(t["id"], t["attendu"], dict(rembourse=v))
    for t in T["plafond"]:
        cmp(t["id"], t["attendu"], dict(plafond=m.plafond(t["prix"], t["part_relais"], t["j1"])))
    for t in T["selection_panier"]:
        cmp(t["id"], t["attendu"], m.selection_panier(t["mode"], t["destination"], t["articles"], t["offres"], t["vendeurs"]))
    for t in T["bascule"]:
        cmp(t["id"], t["attendu"], m.bascule(t["prix_paye"], t["commission_b"], t["offres"]))
    for t in T["conseil_prix"]:
        cmp(t["id"], t["attendu"], m.conseil_prix(t["prix_saisi"], t["zones"], t["prix_actifs"], t["plancher_vendeur"]))
    for t in T["commission_partielle"]:
        cmp(t["id"], t["attendu"], dict(commission=m.commission_partielle(t["commission_b"], t["montant_garde"], t["st_b"])))
    for t in T["versement"]:
        cmp(t["id"], t["attendu"], m.versement(t["montants"]))
    for t in T["versement_relais"]:
        cmp(t["id"], t["attendu"], m.versement_relais(t["formats_remis"], t["jours_garde"], t["colis_comptoir"], t["especes_garde"]))
    for t in T["prix_hg"]:
        cmp(t["id"], t["attendu"], dict(prix_client=m.prix_hg(t["prix_achat"])))
    return res


if __name__ == "__main__":
    ici = os.path.dirname(os.path.abspath(__file__))
    defaut = os.path.dirname(ici) if os.path.isdir(os.path.join(os.path.dirname(ici), "donnees")) else "out/BelivaY_BV-DEV-07_donnees.json"
    D = charger(sys.argv[1] if len(sys.argv) > 1 else defaut)
    resultats = rejouer(D)
    ko = [(t, e) for t, e in resultats if e]
    for t, e in resultats:
        print(f"{t:6} " + ("ok" if not e else "ÉCART : " + " ; ".join(e)))
    print(f"\n{len(resultats) - len(ko)} tests sur {len(resultats)} passent.")
    sys.exit(1 if ko else 0)
