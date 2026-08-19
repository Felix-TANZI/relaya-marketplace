from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
GUIDE_DIR = ROOT / "assets" / "workflow-litige-guide"
SHOT_DIR = GUIDE_DIR / "screenshots"
TEX_PATH = GUIDE_DIR / "guide-utilisation-belivay-workflow-litige.tex"


def tex_escape(text: str) -> str:
    replacements = {
        "\\": r"\textbackslash{}",
        "&": r"\&",
        "%": r"\%",
        "$": r"\$",
        "#": r"\#",
        "_": r"\_",
        "{": r"\{",
        "}": r"\}",
        "~": r"\textasciitilde{}",
        "^": r"\textasciicircum{}",
    }
    return "".join(replacements.get(char, char) for char in text)


PAGES = [
    ("01-accueil.png", "Accueil BelivaY", "Premiere page du systeme. Le client arrive sur l'accueil, voit les categories, les offres rapides et les produits mis en avant avant de commencer son achat."),
    ("02-catalogue.png", "Catalogue produit", "Le client explore le catalogue et retrouve le produit du vendeur. Cette etape valide la visibilite commerciale apres moderation."),
    ("03-fiche-produit.png", "Fiche produit", "Le client consulte les details du produit, le prix, les informations vendeur et les garanties avant de poursuivre vers le panier."),
    ("04-client-panier.png", "Panier client", "Le produit selectionne est dans le panier. Le client peut verifier quantite, total et continuer vers le checkout."),
    ("05-client-checkout.png", "Checkout", "Le client renseigne la livraison et confirme la commande. C'est le point de passage entre achat et operation logistique."),
    ("06-client-commandes.png", "Historique client", "La commande apparait dans l'espace client. Le client peut revenir sur le detail et suivre l'avancement."),
    ("07-client-commande-livree-et-litige.png", "Commande recue puis litige ouvert", "La timeline montre la prise en charge, le passage point relais, la livraison remise, la reception confirmee par le client, puis le bloc de litige ouvert sur cette commande."),
    ("08-admin-commandes.png", "Commandes admin", "L'admin supervise les commandes de la plateforme et peut retrouver la commande du workflow."),
    ("09-admin-commande-detail.png", "Detail commande admin", "L'admin voit le contexte complet de la commande : client, paiement, livraison, vendeur et historique operationnel."),
    ("10-admin-litiges.png", "Liste des litiges admin", "Le litige ouvert apres reception remonte dans la file de gestion BelivaY."),
    ("11-admin-litige-detail.png", "Detail litige admin", "L'admin consulte la raison, les messages, la commande rattachee et les controles de mediation."),
    ("12-vendeur-commandes.png", "Commandes vendeur", "Le vendeur retrouve les commandes liees a ses produits et peut suivre leur etat commercial."),
    ("13-vendeur-litiges.png", "Litiges vendeur", "Le vendeur dispose d'une vue litiges pour suivre les reclamations rattachees a ses commandes ou produits."),
    ("14-organisation-dashboard.png", "Dashboard organisation de livraison", "L'organisation suit sa flotte, ses missions, sa couverture et ses indicateurs operationnels."),
    ("15-organisation-litiges.png", "Litiges organisation de livraison", "Le litige lie a une mission de l'organisation apparait comme dossier operationnel a suivre avec BelivaY."),
    ("16-point-relais-dashboard.png", "Dashboard point relais", "Le point relais suit les arrivees, le stock, la capacite et les retraits."),
    ("17-point-relais-litiges.png", "Litiges point relais", "Le point relais dispose d'une zone litiges pour les colis bloques, endommages ou contestes apres retrait."),
    ("18-livreur-dashboard.png", "Dashboard livreur", "La vue livreur actuelle est bien l'espace terrain : disponibilite, vehicule, courses, performance et briefing de tournee."),
    ("19-livreur-courses.png", "Courses livreur", "Le livreur suit ses missions et les etapes terrain associees a la livraison."),
    ("20-livreur-litiges.png", "Litiges livreur", "Le livreur voit le litige rattache a la commande livree. Il ne repond que selon les droits accordes par BelivaY."),
    ("21-mobile-client-commande-litige.png", "Mobile client", "Sur mobile, le client voit les informations essentielles du suivi : paiement, parcours de livraison, reception et acces au litige."),
    ("22-mobile-organisation-litiges.png", "Mobile organisation", "Sur mobile, l'organisation voit une version condensee de son onglet litiges et incidents."),
    ("23-mobile-point-relais-litiges.png", "Mobile point relais", "Sur mobile, le point relais accede a l'essentiel de la gestion des litiges sans afficher tout le dashboard desktop."),
    ("24-mobile-livreur-litiges.png", "Mobile livreur", "Sur mobile, le livreur visualise le litige en cours et ses obligations de preuve terrain."),
]


def figure(filename: str, title: str, caption: str) -> str:
    path = f"screenshots/{filename}"
    if not (SHOT_DIR / filename).exists():
        return ""
    return rf"""
\begin{{figure}}[H]
  \centering
  \includegraphics[width=\textwidth,height=0.78\textheight,keepaspectratio]{{{path}}}
  \caption{{\textbf{{{tex_escape(title)}}} -- {tex_escape(caption)}}}
\end{{figure}}
"""


def main() -> None:
    GUIDE_DIR.mkdir(parents=True, exist_ok=True)
    figures = "\n".join(figure(*item) for item in PAGES)
    tex = rf"""\documentclass[11pt,a4paper]{{article}}
\usepackage[utf8]{{inputenc}}
\usepackage[T1]{{fontenc}}
\usepackage[french]{{babel}}
\usepackage{{graphicx}}
\usepackage{{float}}
\usepackage{{geometry}}
\usepackage{{caption}}
\usepackage{{xcolor}}
\usepackage{{hyperref}}
\geometry{{margin=1.6cm}}
\definecolor{{belivayorange}}{{HTML}}{{F97316}}
\hypersetup{{colorlinks=true, linkcolor=belivayorange, urlcolor=belivayorange}}
\captionsetup{{font=small, labelfont=bf, margin=8pt}}
\setlength{{\parindent}}{{0pt}}
\setlength{{\parskip}}{{6pt}}

\begin{{document}}

\begin{{titlepage}}
  \centering
  \vspace*{{2.8cm}}
  {{\Huge\bfseries Guide d'utilisation BelivaY\par}}
  \vspace{{0.4cm}}
  {{\Large Workflow achat, reception et litige en cours\par}}
  \vspace{{1.2cm}}
  {{\color{{belivayorange}}\rule{{0.65\textwidth}}{{1.5pt}}\par}}
  \vspace{{1.2cm}}
  \begin{{minipage}}{{0.82\textwidth}}
  Ce document presente le parcours teste dans l'application : un client consulte un produit vendeur, passe commande, la livraison est traitee par la chaine logistique, la reception est confirmee, puis un litige est ouvert apres reception.

  Les captures ont ete prises depuis l'application locale avec des comptes de test dedies. Le document final ne contient pas les commandes techniques ; il sert de guide visuel et fonctionnel.
  \end{{minipage}}
  \vfill
  {{\large Genere le 06/08/2026\par}}
\end{{titlepage}}

\tableofcontents
\newpage

\section{{Synthese du workflow teste}}
Le workflow corrige montre deux temps distincts :
\begin{{itemize}}
  \item une commande terminee : paiement confirme, livraison remise, reception confirmee par le client ;
  \item un litige ensuite ouvert sur cette commande recue, visible cote client, admin, organisation de livraison et livreur.
\end{{itemize}}

La vue livreur capturee correspond a l'interface actuelle de l'application : tableau de bord terrain, courses, statut en ligne, vehicule, performances et onglet litiges. Elle est coherente avec le role livreur, meme si l'amelioration mobile doit rester un point de controle UX continu.

\section{{Captures du parcours}}
{figures}

\end{{document}}
"""
    TEX_PATH.write_text(tex, encoding="utf-8")
    print(TEX_PATH)


if __name__ == "__main__":
    main()
