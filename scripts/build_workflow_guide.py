from pathlib import Path
from html import escape


ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "assets" / "workflow-guide"
SHOT_DIR = OUT_DIR / "screenshots"
HTML_PATH = OUT_DIR / "guide-utilisation-belivay.html"


PAGES = [
    ("00-accueil.png", "Accueil", "Premiere page visible du systeme. Elle presente les categories, les offres rapides, les promotions et les raccourcis utiles avant connexion."),
    ("01-connexion.png", "Connexion", "L'utilisateur se connecte selon son role : client, vendeur, admin, livreur, point relais ou organisation de livraison."),
    ("02-inscription.png", "Inscription", "Creation d'un compte client standard lorsque l'utilisateur n'a pas encore d'identifiant."),
    ("03-catalogue.png", "Catalogue", "Recherche et comparaison des produits disponibles. Le client peut filtrer, ouvrir une fiche produit et preparer son achat."),
    ("04-categories.png", "Categories", "Navigation par famille de produits pour retrouver rapidement les offres."),
    ("05-fiche-produit.png", "Fiche produit", "Page de decision avant achat : prix, informations produit, vendeur, promotion et action d'ajout au panier."),
    ("06-promotions.png", "Promotions", "Vue des offres promotionnelles et flash deals visibles par les clients."),
    ("07-aide.png", "Aide", "Page d'accompagnement pour les questions courantes et le support."),
    ("08-contact.png", "Contact", "Canal de contact avec BelivaY pour une demande generale."),
    ("09-devenir-vendeur.png", "Devenir vendeur", "Point d'entree pour comprendre et demarrer le parcours vendeur."),
    ("10-client-panier.png", "Panier client", "Validation des articles selectionnes avant le paiement."),
    ("11-client-checkout.png", "Checkout", "Saisie des informations de livraison, choix du mode de livraison et confirmation de commande."),
    ("12-client-commandes.png", "Commandes client", "Historique des commandes du client et acces au suivi."),
    ("13-client-detail-commande.png", "Detail commande client", "Suivi de livraison avec paiement confirme, statut livre, carte, livreur et resume financier."),
    ("14-client-profil.png", "Profil client", "Gestion du compte, des informations personnelles, de la securite et des preferences."),
    ("15-client-favoris.png", "Favoris", "Produits sauvegardes par le client pour consultation ulterieure."),
    ("16-client-notifications.png", "Notifications client", "Evenements utiles au client : commande, livraison, paiement, support."),
    ("17-vendeur-dashboard.png", "Dashboard vendeur", "Vue d'ensemble de la boutique : ventes, produits, performance et alertes."),
    ("18-vendeur-produits.png", "Produits vendeur", "Gestion des produits soumis, actifs ou en attente de moderation."),
    ("19-vendeur-nouveau-produit.png", "Creation produit", "Le vendeur cree une fiche produit, ajoute prix, stock, promotion et informations de validation."),
    ("20-vendeur-commandes.png", "Commandes vendeur", "Liste des commandes contenant les produits du vendeur."),
    ("21-vendeur-detail-commande.png", "Detail commande vendeur", "Lecture operationnelle d'une commande cote vendeur."),
    ("22-vendeur-paiements.png", "Paiements vendeur", "Suivi des montants, commissions, versements et logique escrow."),
    ("23-vendeur-litiges.png", "Litiges vendeur", "Suivi des reclamations liees aux produits ou commandes vendeur."),
    ("24-vendeur-boutique.png", "Boutique vendeur", "Configuration commerciale et presentation publique de la boutique."),
    ("25-vendeur-analytics.png", "Analytics vendeur", "Indicateurs de performance et tendances de vente."),
    ("26-vendeur-boost.png", "Boost vendeur", "Options de mise en avant commerciale."),
    ("27-vendeur-certifications.png", "Certifications vendeur", "Elements de confiance et verification de la boutique."),
    ("28-vendeur-formules.png", "Formules vendeur", "Abonnements et options payantes pour le vendeur."),
    ("29-vendeur-parametres.png", "Parametres vendeur", "Preferences, securite et informations de la boutique."),
    ("30-vendeur-wallet.png", "Wallet vendeur", "Suivi du solde vendeur et des mouvements financiers."),
    ("31-admin-dashboard.png", "Dashboard admin", "Vue centrale BelivaY pour piloter activite, alertes et operations."),
    ("32-admin-catalogue.png", "Catalogue admin", "Moderation et controle des produits."),
    ("33-admin-commandes.png", "Commandes admin", "Supervision des commandes de la plateforme."),
    ("34-admin-detail-commande.png", "Detail commande admin", "Lecture complete d'une commande avec paiement, livraison et historique."),
    ("35-admin-livraisons.png", "Livraisons admin", "Pilotage des livreurs et missions logistiques."),
    ("36-admin-zones-livraison.png", "Zones livraison admin", "Gestion des zones couvertes par la livraison."),
    ("37-admin-performance-livraison.png", "Performance livraison", "Indicateurs de qualite et suivi logistique."),
    ("38-admin-map-organisations.png", "Carte organisations", "Positionnement et controle des organisations de livraison partenaires."),
    ("39-admin-map-points-relais.png", "Carte points relais", "Vue cartographique des points relais relies a BelivaY."),
    ("40-admin-vendeurs.png", "Gestion vendeurs", "Liste et supervision des vendeurs."),
    ("41-admin-clients.png", "Gestion clients", "Liste et suivi des comptes clients."),
    ("42-admin-creer-utilisateur.png", "Creation utilisateur admin", "Creation manuelle d'un acteur : client, vendeur, livreur, organisation, point relais ou admin."),
    ("43-admin-finances.png", "Finances admin", "Vue de controle des flux financiers et commissions."),
    ("44-admin-parametres.png", "Parametres admin", "Configuration generale de la plateforme."),
    ("45-organisation-livraison.png", "Organisation de livraison", "Entreprise partenaire : missions, flotte, livreurs, zones, litiges et reglements."),
    ("46-point-relais.png", "Point relais", "Espace gerant point relais : reception, stockage, retrait, capacite et preuves."),
    ("47-livreur.png", "Livreur", "Espace terrain du livreur : missions, tournee, preuves, statut et actions de livraison."),
    ("48-mobile-client-commande.png", "Mobile client", "Suivi de commande adapte a un ecran mobile."),
    ("49-mobile-organisation.png", "Mobile organisation", "Dashboard organisation condense pour consultation rapide sur telephone."),
    ("50-mobile-point-relais.png", "Mobile point relais", "Vue point relais mobile concise : informations essentielles et action rapide."),
    ("51-mobile-livreur.png", "Mobile livreur", "Vue livreur mobile pour le terrain."),
]


CURL_BLOCKS = [
    ("Variables de base", """BASE_URL=\"http://localhost:8000\"
BOOTSTRAP_TOKEN=\"mon_token_secret_tres_long\""""),
    ("Sante API", """curl \"$BASE_URL/api/auth/health/\""""),
    ("Creer l'admin de test", """curl -X POST \"$BASE_URL/api/auth/bootstrap/admin/\" \\
  -H \"Content-Type: application/json\" \\
  -H \"X-Bootstrap-Token: $BOOTSTRAP_TOKEN\" \\
  -d '{\"username\":\"admin_guide\",\"email\":\"admin@belivay.com\",\"password\":\"Admin2026!\",\"first_name\":\"Admin\",\"last_name\":\"Guide\"}'"""),
    ("Connexion et recuperation du token", """ADMIN_ACCESS=$(curl -s -X POST \"$BASE_URL/api/auth/login/\" \\
  -H \"Content-Type: application/json\" \\
  -d '{\"username\":\"admin_guide\",\"password\":\"Admin2026!\"}' | jq -r '.access')"""),
    ("Creer les acteurs", """curl -X POST \"$BASE_URL/api/auth/admin/users/create/\" \\
  -H \"Content-Type: application/json\" \\
  -H \"Authorization: Bearer $ADMIN_ACCESS\" \\
  -d '{\"role\":\"vendor\",\"username\":\"vendeur_guide\",\"email\":\"vendeur@belivay.com\",\"password\":\"Vendeur2026!\",\"phone\":\"+237681000001\",\"city\":\"Yaounde\",\"business_name\":\"Boutique Guide\",\"vendor_status\":\"APPROVED\"}'

curl -X POST \"$BASE_URL/api/auth/admin/users/create/\" \\
  -H \"Content-Type: application/json\" \\
  -H \"Authorization: Bearer $ADMIN_ACCESS\" \\
  -d '{\"role\":\"delivery_org\",\"username\":\"orga_guide\",\"email\":\"orga@belivay.com\",\"password\":\"Orga2026!\",\"phone\":\"+237681000002\",\"city\":\"Yaounde\",\"organization_name\":\"Express Guide Logistics\",\"manager_name\":\"Manager Guide\",\"contract_reference\":\"BLV-GUIDE-2026\",\"zones\":\"YAOUNDE, Mvan, YAOUNDE, Bastos\",\"address\":\"Mvan\",\"organization_status\":\"APPROVED\"}'

curl -X POST \"$BASE_URL/api/auth/admin/users/create/\" \\
  -H \"Content-Type: application/json\" \\
  -H \"Authorization: Bearer $ADMIN_ACCESS\" \\
  -d '{\"role\":\"relay_point\",\"username\":\"relay_guide\",\"email\":\"relay@belivay.com\",\"password\":\"Relay2026!\",\"phone\":\"+237681000003\",\"city\":\"Yaounde\",\"relay_point_name\":\"Point Relais Guide Mvan\",\"manager_name\":\"Gerant Guide\",\"relay_code\":\"PR-GUIDE\",\"zones\":\"YAOUNDE, Mvan\",\"address\":\"Mvan\",\"opening_hours\":\"Lun-Sam 08:00-19:00\",\"storage_capacity\":25,\"relay_status\":\"APPROVED\"}'"""),
    ("Creer et approuver le produit", """VENDOR_ACCESS=$(curl -s -X POST \"$BASE_URL/api/auth/login/\" \\
  -H \"Content-Type: application/json\" \\
  -d '{\"username\":\"vendeur_guide\",\"password\":\"Vendeur2026!\"}' | jq -r '.access')

curl -X POST \"$BASE_URL/api/catalog/admin/categories/create/\" \\
  -H \"Content-Type: application/json\" \\
  -H \"Authorization: Bearer $ADMIN_ACCESS\" \\
  -d '{\"name\":\"Guide Smartphones\",\"slug\":\"guide-smartphones\",\"is_active\":true}'

curl -X POST \"$BASE_URL/api/vendors/products/\" \\
  -H \"Content-Type: application/json\" \\
  -H \"Authorization: Bearer $VENDOR_ACCESS\" \\
  -d '{\"title\":\"Smartphone Guide BelivaY\",\"short_description\":\"Produit test workflow\",\"description\":\"Produit cree pour le guide utilisateur.\",\"category\":1,\"price_xaf\":75000,\"stock\":12,\"low_stock_threshold\":3,\"is_active\":true}'

curl -X POST \"$BASE_URL/api/vendors/admin/products/$PRODUCT_ID/approve/\" \\
  -H \"Authorization: Bearer $ADMIN_ACCESS\""""),
    ("Commande client", """CLIENT_ACCESS=$(curl -s -X POST \"$BASE_URL/api/auth/login/\" \\
  -H \"Content-Type: application/json\" \\
  -d '{\"username\":\"client_guide\",\"password\":\"Client2026!\"}' | jq -r '.access')

curl -X PUT \"$BASE_URL/api/auth/cart/\" \\
  -H \"Content-Type: application/json\" \\
  -H \"Authorization: Bearer $CLIENT_ACCESS\" \\
  -d '{\"items\":[{\"id\":14,\"name\":\"Smartphone Guide BelivaY\",\"price\":75000,\"quantity\":1}]}'

curl -X POST \"$BASE_URL/api/orders/\" \\
  -H \"Content-Type: application/json\" \\
  -H \"Authorization: Bearer $CLIENT_ACCESS\" \\
  -d '{\"delivery_mode\":\"DELIVERY\",\"cart_items\":[{\"product_id\":14,\"qty\":1}],\"city\":\"YAOUNDE\",\"address\":\"YAOUNDE, Mvan - point de repere Pharmacie Guide\",\"customer_phone\":\"+237658000005\",\"customer_email\":\"client@belivay.com\"}'"""),
    ("Livraison et point relais", """COURIER_ACCESS=$(curl -s -X POST \"$BASE_URL/api/auth/login/\" \\
  -H \"Content-Type: application/json\" \\
  -d '{\"username\":\"livreur_guide\",\"password\":\"Livreur2026!\"}' | jq -r '.access')

curl -X PATCH \"$BASE_URL/api/shipping/settings/\" \\
  -H \"Content-Type: application/json\" \\
  -H \"Authorization: Bearer $COURIER_ACCESS\" \\
  -d '{\"is_online\":true}'

curl -X POST \"$BASE_URL/api/shipping/my-shipments/$SHIPMENT_ID/action/\" \\
  -H \"Content-Type: application/json\" \\
  -H \"Authorization: Bearer $COURIER_ACCESS\" \\
  -d '{\"action\":\"ACCEPT\",\"message\":\"Mission acceptee\"}'

curl -X POST \"$BASE_URL/api/shipping/my-shipments/$SHIPMENT_ID/action/\" \\
  -H \"Content-Type: application/json\" \\
  -H \"Authorization: Bearer $COURIER_ACCESS\" \\
  -d '{\"action\":\"PICKED_UP\",\"message\":\"Colis collecte\"}'

curl -X POST \"$BASE_URL/api/shipping/my-shipments/$SHIPMENT_ID/action/\" \\
  -H \"Content-Type: application/json\" \\
  -H \"Authorization: Bearer $COURIER_ACCESS\" \\
  -d '{\"action\":\"OUT_FOR_DELIVERY\",\"message\":\"En route vers le point relais\"}'"""),
    ("Reception finale", """RELAY_ACCESS=$(curl -s -X POST \"$BASE_URL/api/auth/login/\" \\
  -H \"Content-Type: application/json\" \\
  -d '{\"username\":\"relay_guide\",\"password\":\"Relay2026!\"}' | jq -r '.access')

curl -X POST \"$BASE_URL/api/shipping/relay-point/receive/\" \\
  -H \"Content-Type: application/json\" \\
  -H \"Authorization: Bearer $RELAY_ACCESS\" \\
  -d '{\"shipment_id\":14,\"slot_code\":\"A-01\",\"notes\":\"Colis recu au point relais\"}'

curl -X POST \"$BASE_URL/api/shipping/relay-point/pickup/\" \\
  -H \"Content-Type: application/json\" \\
  -H \"Authorization: Bearer $RELAY_ACCESS\" \\
  -d '{\"parcel_id\":4,\"pickup_code\":\"CODE_RETRAIT\",\"customer_name\":\"Client Guide\"}'

curl \"$BASE_URL/api/orders/$ORDER_ID/tracking/\" \\
  -H \"Authorization: Bearer $CLIENT_ACCESS\""""),
]


def render_code_block(title: str, code: str) -> str:
    return f"""
      <section class=\"curl-block\">
        <h3>{escape(title)}</h3>
        <pre><code>{escape(code)}</code></pre>
      </section>
    """


def render_page(filename: str, title: str, description: str) -> str:
    rel = f"screenshots/{filename}"
    return f"""
      <article class=\"shot\">
        <h3>{escape(title)}</h3>
        <p>{escape(description)}</p>
        <img src=\"{escape(rel)}\" alt=\"{escape(title)}\" />
      </article>
    """


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    html = f"""<!doctype html>
<html lang=\"fr\">
<head>
  <meta charset=\"utf-8\" />
  <title>Guide d'utilisation BelivaY - Workflow complet</title>
  <style>
    @page {{ size: A4; margin: 12mm; }}
    * {{ box-sizing: border-box; }}
    body {{ margin: 0; font-family: Inter, Arial, sans-serif; color: #111827; background: #f7f8fb; }}
    .cover {{ min-height: 96vh; display: flex; flex-direction: column; justify-content: center; padding: 48px; background: linear-gradient(135deg, #fff7ed, #ffffff 45%, #e0f2fe); }}
    .brand {{ color: #f97316; font-weight: 900; font-size: 44px; margin: 0 0 18px; }}
    h1 {{ font-size: 42px; line-height: 1.05; margin: 0; max-width: 850px; }}
    h2 {{ font-size: 28px; margin: 36px 0 10px; }}
    h3 {{ font-size: 18px; margin: 0 0 8px; }}
    p {{ line-height: 1.55; color: #475569; }}
    .meta {{ margin-top: 24px; color: #64748b; }}
    .section {{ padding: 24px 32px; page-break-before: always; }}
    .note {{ background: #fff; border: 1px solid #e5e7eb; border-left: 5px solid #f97316; padding: 16px 18px; border-radius: 8px; }}
    .curl-block {{ background: #0f172a; color: #e2e8f0; border-radius: 10px; padding: 14px; margin: 14px 0; page-break-inside: avoid; }}
    .curl-block h3 {{ color: #fff; }}
    pre {{ white-space: pre-wrap; word-break: break-word; font-size: 10px; line-height: 1.35; margin: 0; }}
    .shot {{ background: #fff; border: 1px solid #e5e7eb; border-radius: 10px; padding: 16px; margin: 18px 0 28px; page-break-inside: avoid; }}
    .shot img {{ width: 100%; max-height: 690px; object-fit: contain; border: 1px solid #e5e7eb; border-radius: 8px; background: #fff; }}
    .shot p {{ margin: 0 0 12px; }}
    .grid {{ display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }}
    .pill {{ background: #fff; border: 1px solid #e5e7eb; padding: 12px; border-radius: 8px; }}
  </style>
</head>
<body>
  <section class=\"cover\">
    <p class=\"brand\">BelivaY</p>
    <h1>Guide d'utilisation - workflow complet de l'achat a la reception</h1>
    <p class=\"meta\">Genere depuis l'application locale avec API Django, front Vite, captures Chrome headless et tests curl.</p>
    <div class=\"grid\">
      <div class=\"pill\"><strong>Commande testee</strong><br />Client -> vendeur -> livraison -> point relais -> reception.</div>
      <div class=\"pill\"><strong>Pages capturees</strong><br />{len(PAGES)} vues desktop et mobile.</div>
      <div class=\"pill\"><strong>Produit test</strong><br />Smartphone Guide BelivaY.</div>
      <div class=\"pill\"><strong>Statut final</strong><br />Paiement confirme, livraison marquee livree.</div>
    </div>
  </section>

  <section class=\"section\">
    <h2>Logique du workflow teste</h2>
    <div class=\"note\">
      Le parcours valide couvre l'entree publique, la connexion, la consultation catalogue, la creation/validation produit, la commande client, l'affectation logistique, le traitement livreur, le passage par point relais et la consultation finale du suivi.
    </div>
    <h2>Commandes curl principales</h2>
    {''.join(render_code_block(title, code) for title, code in CURL_BLOCKS)}
  </section>

  <section class=\"section\">
    <h2>Captures et explication des pages</h2>
    {''.join(render_page(filename, title, description) for filename, title, description in PAGES if (SHOT_DIR / filename).exists())}
  </section>
</body>
</html>
"""
    HTML_PATH.write_text(html, encoding="utf-8")
    print(HTML_PATH)


if __name__ == "__main__":
    main()
