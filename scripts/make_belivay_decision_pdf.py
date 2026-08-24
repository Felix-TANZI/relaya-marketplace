from __future__ import annotations

from pathlib import Path
import textwrap


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "assets" / "belivay_decision_lancement_api_20260802.pdf"

PAGE_W = 595
PAGE_H = 842
MARGIN = 42
LINE_H = 12


def esc(text: str) -> str:
    return (
        text.replace("\\", "\\\\")
        .replace("(", "\\(")
        .replace(")", "\\)")
    )


class Page:
    def __init__(self, title: str, subtitle: str = ""):
        self.ops: list[str] = []
        self.y = PAGE_H - MARGIN
        self.header(title, subtitle)

    def rect(self, x: int, y: int, w: int, h: int, color: str):
        self.ops.append(f"q {color} rg {x} {y} {w} {h} re f Q")

    def text(self, x: int, y: int, text: str, size: int = 10, font: str = "F1", color: str = "0 0 0"):
        safe = esc(text.encode("latin-1", "replace").decode("latin-1"))
        self.ops.append(f"BT /{font} {size} Tf {color} rg {x} {y} Td ({safe}) Tj ET")

    def line(self, text: str, size: int = 10, font: str = "F1", indent: int = 0, color: str = "0 0 0"):
        self.text(MARGIN + indent, self.y, text, size=size, font=font, color=color)
        self.y -= LINE_H if size <= 10 else LINE_H + 3

    def wrapped(self, text: str, width: int = 94, size: int = 10, indent: int = 0, bullet: bool = False):
        prefix = "- " if bullet else ""
        wrapper = textwrap.TextWrapper(width=width, subsequent_indent="  " if bullet else "")
        lines = wrapper.wrap(prefix + text)
        for line in lines:
            self.line(line, size=size, indent=indent)

    def section(self, title: str):
        self.y -= 4
        self.rect(MARGIN, self.y - 3, PAGE_W - 2 * MARGIN, 17, "0.941 0.384 0.122")
        self.text(MARGIN + 7, self.y + 1, title, size=10, font="F2", color="1 1 1")
        self.y -= 20

    def item(self, title: str, body: str):
        self.line(title, size=10, font="F2", color="0.141 0.227 0.561")
        self.wrapped(body, width=92, size=9)
        self.y -= 2

    def header(self, title: str, subtitle: str):
        self.rect(30, PAGE_H - 98, PAGE_W - 60, 66, "0.063 0.078 0.149")
        self.text(44, PAGE_H - 58, title, size=17, font="F2", color="1 1 1")
        if subtitle:
            self.text(44, PAGE_H - 77, subtitle, size=9, color="0.88 0.90 0.97")
        self.y = PAGE_H - 122


pages: list[Page] = []

p = Page(
    "BelivaY - decision technique de lancement",
    "Version courte pour validation - 2 aout 2026",
)
p.wrapped(
    "Objectif : figer les choix indispensables pour lancer vite, encaisser, livrer, tracer les fonds et garder une voie d'independance technique sur 12 mois.",
    width=96,
    size=10,
)
p.section("1. Decision centrale")
p.item(
    "Paiement : CamPay seul au lancement",
    "CamPay est retenu comme prestataire unique de paiement. Il encaisse les clients, conserve les fonds sur le compte marchand BelivaY et execute les versements Mobile Money. Le choix est motive par l'argument reglementaire local : certification ANTIC et enregistrement ART, a confirmer par documents contractuels.",
)
p.item(
    "Escrow : registre interne BelivaY",
    "CamPay n'est pas l'escrow complet. CamPay est le coffre-fort ; BelivaY est le carnet comptable qui dit a qui appartient chaque franc : vendeur, organisation de livraison, point relais, commission BelivaY ou client en cas de remboursement.",
)
p.item(
    "Plan B",
    "Si CamPay applique un minimum de frais par transaction trop lourd pour les petits versements, Fapshi redevient l'alternative a comparer. La decision finale depend d'une reponse ecrite de CamPay.",
)
p.section("2. Services retenus")
for title, body in [
    ("Email : Brevo", "Brevo remplace Resend pour le lancement, car le quota gratuit de 300 emails/jour est plus confortable pour les emails transactionnels."),
    ("SMS : Africa's Talking", "A utiliser pour OTP, code retrait et urgences. Africa's Talking couvre le Cameroun ; sender ID gratuit selon dossier local ; fiche KYC et grille tarifaire a obtenir."),
    ("Push : Firebase FCM", "Canal gratuit prioritaire pour limiter les SMS. Notifications commande, livraison, litige, validation et rappels."),
    ("Fichiers : Cloudflare R2", "Images produits, pieces KYC manuelles, preuves de livraison, pieces litige et sauvegardes PostgreSQL."),
    ("Monitoring : Sentry", "Un seul compte pour l'equipe au lancement. GlitchTip devient l'option plus tard si Sentry devient limitant."),
]:
    p.item(title, body)
pages.append(p)

p = Page("BelivaY - paiement, escrow et infrastructure", "Architecture a implementer")
p.section("3. Registre escrow a developper")
for title, body in [
    ("EscrowAccount", "Un compte logique par acteur : vendeur, entreprise de livraison, point relais et BelivaY. Le solde se calcule par somme des ecritures, jamais par modification directe d'un champ."),
    ("LedgerEntry", "Toutes les entrees et sorties comptables. Table en ajout seul : on insere, on ne modifie pas, on ne supprime pas. Une erreur se corrige par une ecriture inverse."),
    ("OrderEscrow", "Une ligne par commande retenue. Etats : PENDING, HELD, RELEASED, REFUNDED. Le statut suit le cycle paiement, livraison, confirmation et litige."),
    ("PayoutBatch", "Versements groupes deux a quatre fois par mois. Chaque versement porte une cle d'idempotence pour eviter les doubles paiements."),
]:
    p.item(title, body)
p.section("4. Protections non negociables")
for body in [
    "Idempotence : si un versement est retente apres coupure reseau, la seconde tentative doit etre rejetee.",
    "Verrous transactionnels : deux processus ne doivent jamais liberer le meme escrow en meme temps.",
    "Reconciliation quotidienne : comparer chaque nuit le registre BelivaY au solde CamPay ; alerte en cas d'ecart.",
    "Webhook signe : en production, les confirmations CamPay doivent etre verifiees par signature.",
]:
    p.wrapped(body, width=92, size=9, bullet=True)
p.section("5. Infrastructure indispensable")
for title, body in [
    ("Redis + Celery", "Versements automatiques, reconciliation, rappels J+6/J+7, emails, SMS et notifications asynchrones."),
    ("Django Channels", "Suivi livreur en temps reel, messagerie operationnelle, actualisation missions et litiges sans rechargement."),
    ("Sauvegardes PostgreSQL", "Dump quotidien vers Cloudflare R2, test de restauration avant lancement, alerte si sauvegarde absente."),
]:
    p.item(title, body)
pages.append(p)

p = Page("BelivaY - cartographie et plan d'action", "Choix terrain pour le lancement")
p.section("6. Carte et localisation")
for title, body in [
    ("Fond de carte : OpenStreetMap + Protomaps auto-heberge sur R2", "OpenStreetMap fournit les donnees cartographiques. Protomaps transforme et heberge ces donnees en tuiles vectorielles sur R2, sans dependre des tuiles publiques OSM en production commerciale. Attribution OpenStreetMap obligatoire."),
    ("Affichage : MapLibre GL", "Plus adapte aux tuiles vectorielles Protomaps basees sur OpenStreetMap que Leaflet classique. Test obligatoire sur telephone bas de gamme avant decision finale."),
    ("Itineraires : OSRM auto-heberge", "Remplace OpenRouteService pour eviter la dependance au palier gratuit en production commerciale. OSRM utilise aussi les donnees OpenStreetMap."),
    ("Geocodage : pas d'API automatique", "Les adresses locales sont trop variables. Pin manuel obligatoire, precision GPS maximale 50 metres, Plus Code affiche et transmis."),
    ("Fiche mission livreur", "Ordre impose : photo, repere, Plus Code, bouton itineraire, bouton appel. Pas de carte plein ecran ni recherche. Version SMS courte si pas de donnees."),
]:
    p.item(title, body)
p.section("7. A ne pas faire maintenant")
for body in [
    "Pas de deuxieme prestataire de paiement tant que les echecs CamPay ne le justifient pas.",
    "Pas de carte bancaire ni corridor diaspora : Mobile Money Cameroun d'abord.",
    "Pas de portefeuille utilisateur : BelivaY ne garde pas de solde libre, seulement un transit commande.",
    "Pas de KYC automatique : validation manuelle suffisante au lancement.",
]:
    p.wrapped(body, width=92, size=9, bullet=True)
p.section("8. Actions immediates")
for body in [
    "Envoyer a CamPay les quatre questions : frais minimum, taux TTC ou HT, delai de disponibilite des fonds, documents SARLU.",
    "Creer le compte demo CamPay et stocker les cles en variables d'environnement.",
    "Developper PaymentService et CamPayAdapter : request_collection, disburse, get_status, handle_webhook.",
    "Creer le registre escrow interne avec comptes, ecritures, sequestres, idempotence et verrous.",
    "Prototyper OpenStreetMap + Protomaps + MapLibre + Plus Codes et tester sur telephone bas de gamme.",
    "Mettre en place Redis, Celery, Channels, sauvegardes R2 et test de restauration.",
]:
    p.wrapped(body, width=92, size=9, bullet=True)
pages.append(p)


def build_pdf(pages: list[Page]) -> bytes:
    objects: list[bytes] = []

    def add(obj: str | bytes) -> int:
        if isinstance(obj, str):
            obj = obj.encode("latin-1", "replace")
        objects.append(obj)
        return len(objects)

    font1 = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>")
    font2 = add("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>")
    page_ids = []
    content_ids = []
    for page in pages:
        stream = "\n".join(page.ops).encode("latin-1", "replace")
        content_ids.append(add(b"<< /Length " + str(len(stream)).encode() + b" >>\nstream\n" + stream + b"\nendstream"))
    pages_id = len(objects) + len(pages) + 1
    for content_id in content_ids:
        page_ids.append(
            add(
                f"<< /Type /Page /Parent {pages_id} 0 R /MediaBox [0 0 {PAGE_W} {PAGE_H}] "
                f"/Resources << /Font << /F1 {font1} 0 R /F2 {font2} 0 R >> >> "
                f"/Contents {content_id} 0 R >>"
            )
        )
    kids = " ".join(f"{pid} 0 R" for pid in page_ids)
    pages_obj_id = add(f"<< /Type /Pages /Kids [ {kids} ] /Count {len(page_ids)} >>")
    catalog_id = add(f"<< /Type /Catalog /Pages {pages_obj_id} 0 R >>")

    out = bytearray(b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n")
    offsets = [0]
    for i, obj in enumerate(objects, start=1):
        offsets.append(len(out))
        out.extend(f"{i} 0 obj\n".encode())
        out.extend(obj)
        out.extend(b"\nendobj\n")
    xref = len(out)
    out.extend(f"xref\n0 {len(objects)+1}\n".encode())
    out.extend(b"0000000000 65535 f \n")
    for offset in offsets[1:]:
        out.extend(f"{offset:010d} 00000 n \n".encode())
    out.extend(
        f"trailer\n<< /Size {len(objects)+1} /Root {catalog_id} 0 R >>\nstartxref\n{xref}\n%%EOF\n".encode()
    )
    return bytes(out)


OUT.write_bytes(build_pdf(pages))
print(OUT)
