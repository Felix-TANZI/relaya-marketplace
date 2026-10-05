"""Reprises à la main des écrans générés, rejouables après une régénération (outils/ecran.mjs --ecraser) :
chaque reprise est idempotente (sans effet si elle est déjà faite).
  python3 outils/reprises.py [Écran…]   (sans argument : toutes)

- blocs des modules derrière un interrupteur : <Module ff> (CCH-18 ; outils/module.py) ;
- langue d'une page légale : celle de l'application, sauf &lang= (comme le prototype).
Les écrans entièrement repris à la main (Lancement, Cgu) ne se régénèrent jamais."""
import re
import subprocess
import sys
from pathlib import Path

MODULE = ["python3", "outils/module.py"]


def module(fichier, ff, debut, freres=1):
    subprocess.run(MODULE + [fichier, ff, debut, str(freres)], check=True, stdout=subprocess.DEVNULL)


def paiement_wallet(fichier):
    module(fichier, "FF-WALLET", '<div className="t12 c3" style={{ "margin": "4px 4px 0" }}>||<Link to="/wallet?st=recharger"')
    module(fichier, "FF-WALLET", '<div className="cl08-kk">||{t("Wallet BelivaY")}', 3)


def accueil(fichier):
    module(fichier, "FF-FLASH", '<section className="h0-panel h0-flash">')
    module(fichier, "FF-ABONNEMENT", '<Link to="/abonnements" className="h0-ban prem">')
    module(fichier, "FF-WALLET", '<Link to="/wallet" className="it wl">')
    module(fichier, "FF-ABONNEMENT", '<Link to="/cagnotte" className="it">')
    module(fichier, "FF-ABONNEMENT", '<Link to="/parrainage" className="it">')
    module(fichier, "FF-FLASH", '<Link to="/ventes-flash" className="it">')
    # Le menu du profil de l'état ?pop=profil vient d'Ecran (MenuProfil) : on retire sa copie écrite.
    lignes = Path(fichier).read_text(encoding="utf-8").split("\n")
    try:
        i = next(k for k, l in enumerate(lignes) if l.strip() == 'case "accueil?pop=profil":')
        a = next(k for k in range(i, len(lignes)) if '<div id="av-pop-veil"></div>' in lignes[k])
    except StopIteration:
        return
    debut = a - 1 if '<Styles id="0b0ccec1e3" />' in lignes[a - 1] else a
    fin = next(k for k in range(a + 1, len(lignes)) if lignes[k] == "            </div>" and lignes[k + 1] == "          </>")
    del lignes[debut : fin + 1]
    Path(fichier).write_text("\n".join(lignes), encoding="utf-8")


def garde(fichier):
    module(fichier, "FF-LISTE-ENVIES", '<div className="btns">||<Link to="/liste-envies')


def diaspora(fichier):
    module(fichier, "FF-EX05", '<Link to="/famille" className="li">')
    module(fichier, "FF-EX02", '<Link to="/cotisation" className="li">')
    module(fichier, "FF-LISTE-ENVIES", '<Link to="/listes" className="li">')
    module(fichier, "FF-EX05,FF-EX02,FF-LISTE-ENVIES", '<div className="dx-h">||<b>||{t("Autres façons de se faire aider")}', 2)


def compte(fichier):
    module(fichier, "FF-WALLET", '<section className="wl-card">')
    for route, ff in [("mon-abonnement", "FF-ABONNEMENT"), ("cagnotte", "FF-ABONNEMENT"), ("parrainage", "FF-ABONNEMENT"), ("famille", "FF-EX05"),
                      ("listes", "FF-LISTE-ENVIES"), ("cotisation", "FF-EX02"), ("cote", "FF-EX03"), ("troc", "FF-EX04"), ("rentree", "FF-EX01"),
                      ("assistant", "FF-IA"), ("wa", "FF-EX06")]:
        module(fichier, ff, f'<Link to="/{route}">||<span className="i')
    module(fichier, "FF-ABONNEMENT,FF-EX05,FF-LISTE-ENVIES,FF-EX02,FF-EX03,FF-EX04,FF-EX01,FF-IA,FF-EX06", '<p className="dx-note">')
    s = Path(fichier).read_text(encoding="utf-8")
    s = s.replace("(CL-13) : généré par outils/ecran.mjs depuis", "(CL-13) : généré par outils/ecran.mjs, puis repris à la main (modules fermés, résumé des réglages) depuis", 1)
    if "const affichage" not in s:
        s = s.replace(
            "  const { t } = usePreferences()",
            "  const { t, theme, taille } = usePreferences()\n"
            "  // Résumé des réglages d'affichage, comme le prototype (le thème et la taille suivent les préférences).\n"
            "  const affichage = 'Français · thème ' + (theme === 'dark' ? 'sombre' : 'clair') + ' · texte ' + "
            "(taille === 'normale' ? 'normal' : taille === 'grande' ? 'grand' : 'très grand')",
            1,
        )
        s = s.replace('{t("Français · thème clair · texte normal")}', "{t(affichage)}")
    Path(fichier).write_text(s, encoding="utf-8")
    compte_profil(fichier)


def carte_wallet(s):
    # DP-52 : l'œil masque le solde sur place (composants/Profil.tsx), au lieu d'ouvrir le portefeuille.
    s = re.sub(r'<Link to="/wallet\?vue=masque" aria-label="Masquer le solde">\s*<Icone nom="eye-off" taille=\{17\} />\s*</Link>', "<OeilSolde />", s)
    s = re.sub(r'(<div className="wl-bal">\s*)\{t\(("[^"]+")\)\}', r"\1<Montant solde>{t(\2)}</Montant>", s)
    s = re.sub(r'(<div className="wl-sub">\s*)\{t\(("[^"]+")\)\}', r"\1<Montant>{t(\2)}</Montant>", s)
    return s


def importer(s, ligne):
    if ligne in s:
        return s
    lignes = s.split("\n")
    i = max(k for k, l in enumerate(lignes) if l.startswith("import "))
    lignes.insert(i + 1, ligne)
    return "\n".join(lignes)


def compte_profil(fichier):
    # DP-52 : l'identité vient du profil (nom, numéro, e-mail, photo) ; le crayon ouvre « Modifier mon profil ».
    s = Path(fichier).read_text(encoding="utf-8")
    s = carte_wallet(s)
    s = s.replace('{t("Carine Mballa")}', "{t(client.nomComplet)}")
    s = s.replace('{t("6 77 ·· ·· 41")}', "{t(client.numeroMasque)}")
    s = s.replace('{t("c•••••@gmail.com · Google")}', "{t(client.emailMasque + (client.connexion === 'google' ? ' · Google' : ''))}")
    s = re.sub(r'(<span className="portrait" style=\{\{ "width": "56px", "height": "56px" \}\}>\s*)<Dessin id="ebb567019115" />',
               r'\1<PhotoClient>\n                <Dessin id="ebb567019115" />\n              </PhotoClient>', s)
    s = s.replace('<Link to="/numero-changer" className="cl13-sq" aria-label="Changer de numéro">',
                  '<Link to="/profil" className="cl13-sq" aria-label="Modifier mon profil">')
    if "const client = " not in s:
        s = s.replace("  const { t", "  const client = useSession().client!\n  const { t", 1)
    s = importer(s, "import { Montant, OeilSolde, PhotoClient } from '../../composants/Profil'")
    s = importer(s, "import { useSession } from '../../session'")
    Path(fichier).write_text(s, encoding="utf-8")


def wallet(fichier):
    s = carte_wallet(Path(fichier).read_text(encoding="utf-8"))
    s = importer(s, "import { Montant, OeilSolde } from '../../composants/Profil'")
    Path(fichier).write_text(s, encoding="utf-8")


def bouton_langue(fichier):
    # Bouton de langue de l'en-tête web (CL-14) : il affiche la langue en cours, comme le prototype.
    s = Path(fichier).read_text(encoding="utf-8")
    s = re.sub(r'(<button type="button" className="lang" data-act="lang" aria-label="Langue">\s*)\{t\("FR"\)\}', r"\1{langue === 'en' ? 'EN' : 'FR'}", s)
    if "langue === 'en' ? 'EN'" in s and not re.search(r"const \{[^}]*\blangue\b[^}]*\} = usePreferences\(\)", s):
        s = re.sub(r"const \{ ([^}]*) \} = usePreferences\(\)", r"const { \1, langue } = usePreferences()", s, count=1)
    Path(fichier).write_text(s, encoding="utf-8")


def rentree_panier(fichier):
    module(fichier, "FF-EX03", '<Link to="/cote?src=rentree" className="btn secondary">')


REPRISES = {
    "src/pages/CL-08/PaiementMoyen.tsx": paiement_wallet,
    "src/pages/CL-08/XpPay.tsx": paiement_wallet,
    "src/pages/CL-04/Accueil.tsx": accueil,
    "src/pages/CL-10/Garde.tsx": garde,
    "src/pages/CL-12/Diaspora.tsx": diaspora,
    # Compte : repris à la main pour être logique (DP-53), ses reprises sont faites une fois pour toutes.
    # Wallet, MoyensPaiement, Adresses, Aide, Rappel, LegalDoc, Reglages : repris à la main pour être logiques (DP-53).
    "src/pages/CL-15/RentreePanier.tsx": rentree_panier,
    "src/pages/CL-14/ListePublique.tsx": bouton_langue,
    "src/pages/CL-14/ListeOffrir.tsx": bouton_langue,
    "src/pages/CL-14/ListeOffert.tsx": bouton_langue,
    "src/pages/CL-14/AbonnementOffrir.tsx": bouton_langue,
}

if __name__ == "__main__":
    demandes = sys.argv[1:]
    for fichier, reprise in REPRISES.items():
        if not demandes or any(fichier.endswith("/" + d + ".tsx") for d in demandes):
            reprise(fichier)
            print("repris :", fichier)
