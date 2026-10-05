# Jeu de données du serveur d'essai, cohérent avec la démonstration du site (PAS pour la production) :
#   - les 30 produits de site/src/demo/catalogue.ts (donnees/catalogue.json, écrit par site/outils/catalogue-essai.mts) :
#     prix, prix barré, stock, classe de colis (FicheLogistique), catégorie, note, boutique et sa zone ;
#   - les relais du prototype (Mvog-Ada, Essos, Bastos, Mokolo) ;
#   - les comptes du jeu d'essai : Carine (Yaoundé, numéro vérifié, relais Mvog-Ada), Bertrand (Yaoundé), Hervé (compte
#     diaspora, France, relié à Carine), et un compte de l'équipe (téléversement des photos) ;
#   - deux photos de démonstration dessinées par Pillow (aucun fichier externe) : le premier bandeau du carrousel
#     (téléversé comme par l'admin : variantes WebP du srcset) et la photo principale du Tecno Camon 30 ;
#   - registres du kit : paramètres (charger_parametres), textes légaux (charger_legal), FAQ (charger_faq), contenus de
#     l'accueil (charger_contenus).
# Idempotente : relancée, elle met à jour sans dupliquer. Mot de passe des comptes : DEMO_MOT_DE_PASSE ci-dessous
# (valeur d'essai, aussi dans backend-kit/REPRISE-BACKEND.md § 9).
import json
from datetime import date
from pathlib import Path

from django.contrib.auth import get_user_model
from django.core.management import BaseCommand, CommandError, call_command
from django.db import transaction
from django.utils.text import slugify

from apps.cart.models import FicheLogistique
from apps.client_core import pont
from apps.client_core.chiffrement import chiffrer, empreinte

from ...models import FicheProduit, UserNotification

DONNEES = Path(__file__).resolve().parents[2] / "donnees" / "catalogue.json"
DEMO_MOT_DE_PASSE = "Essai-BelivaY-2026"
PALIERS = {"Or": "GOLD", "Argent": "SILVER", "Bronze": "BRONZE"}
RELAIS = [
    # nom, quartier, gérant, horaires, lat, lon
    ("Relais Mvog-Ada", "Mvog-Ada", "Mme Ngo Bassong", "8 h – 19 h", "3.861200", "11.523900"),
    ("Relais Essos", "Essos", "M. Abena", "8 h – 20 h", "3.870500", "11.537400"),
    ("Relais Bastos", "Bastos", "Mme Fouda", "9 h – 19 h", "3.893100", "11.508700"),
    ("Relais Mokolo", "Mokolo", "M. Ndzana", "7 h 30 – 18 h 30", "3.873400", "11.497700"),
]
COMPTES = {
    # cle: (prénom, nom, e-mail, numéro camerounais vérifié ou None, relais habituel, équipe)
    "carine": ("Carine", "Mballa", "carine@gmail.com", "677112241", "Relais Mvog-Ada", False),
    "bertrand": ("Bertrand", "Essomba", "bertrand.essomba@gmail.com", "699245318", "Relais Essos", False),
    "herve": ("Hervé", "Mbarga", "herve.mbarga@gmail.com", None, None, False),
    "equipe": ("Awa", "Équipe", "equipe@belivay.test", None, None, True),
}


class Command(BaseCommand):
    help = "Charge le jeu de données de démonstration du serveur d'essai (catalogue, relais, comptes Carine, Bertrand, Hervé)."

    def add_arguments(self, parser):
        parser.add_argument("--sans-registres", action="store_true", help="ne relance pas les chargements des registres du kit")

    def handle(self, *args, **o):
        if not o["sans_registres"]:
            call_command("charger_parametres", verbosity=0)
            # Version des conditions acceptées à l'inscription du site (« version 1.0 »).
            try:
                call_command("charger_legal", version_legale="1.0", publiee="2026-08-01", verbosity=0)
            except CommandError:  # déjà chargée : on la garde (relancer ne doit rien changer)
                pass
            call_command("charger_faq", verbosity=0)
            call_command("charger_contenus", verbosity=0)
        with transaction.atomic():
            relais = self._relais()
            n = self._catalogue()
            comptes = self._comptes(relais)
            self._diaspora(comptes, relais)
            self._photos()
        self.stdout.write(self.style.SUCCESS(f"Démo chargée : {n} produits, {len(relais)} relais, comptes {', '.join(COMPTES)}."))

    def _utilisateur(self, nom: str, **champs):
        User = get_user_model()
        u, cree = User.objects.get_or_create(username=nom, defaults=champs)
        if not cree:
            for k, v in champs.items():
                setattr(u, k, v)
            u.save()
        return u

    def _relais(self) -> dict:
        out = {}
        for nom, quartier, gerant, horaires, lat, lon in RELAIS:
            u = self._utilisateur(f"relais-{slugify(quartier)}")
            r, _ = pont.modele("relais").objects.update_or_create(
                user=u,
                defaults={
                    "name": nom,
                    "manager_name": gerant,
                    "phone": "",
                    "city": "Yaoundé",
                    "zones": [quartier],
                    "address": quartier,
                    "opening_hours": horaires,
                    "latitude": lat,
                    "longitude": lon,
                    "is_active": True,
                },
            )
            out[nom] = r
        return out

    def _catalogue(self) -> int:
        Vendeur = pont.modele("vendeur")
        Zone = Vendeur._meta.get_field("zone").related_model
        Produit, Stock = pont.modele("produit"), pont.modele("stock")
        produits = json.loads(DONNEES.read_text(encoding="utf-8"))["produits"]
        boutiques = {}
        for p in produits:
            if p["boutique"] in boutiques:
                continue
            zone, _ = Zone.objects.get_or_create(name=p["zone"], defaults={"city": "Yaoundé"})
            u = self._utilisateur(f"vendeur-{slugify(p['boutique'])}")
            boutiques[p["boutique"]], _ = Vendeur.objects.update_or_create(
                user=u, defaults={"business_name": p["boutique"], "zone": zone, "certification_tier": PALIERS.get(p["palier"], "BRONZE")}
            )
        for p in produits:
            v = boutiques[p["boutique"]]
            prod, _ = Produit.objects.update_or_create(
                slug=p["cle"], defaults={"title": p["titre"], "price_xaf": p["prix"], "is_active": True, "vendor": v.user}
            )
            Stock.objects.update_or_create(product=prod, defaults={"quantity": p["stock"]})
            FicheLogistique.objects.update_or_create(product_id=prod.pk, defaults={"classe": p["classe"]})
            FicheProduit.objects.update_or_create(
                product=prod,
                defaults={
                    "description": p["description"],
                    "compare_at_price": p["prixBarre"],
                    "category_slug": p["univers"],
                    "category_name": p["universTitre"],
                    "rating_average": p["note"],
                    "reviews_count": p["avis"],
                },
            )
        return len(produits)

    def _comptes(self, relais) -> dict:
        from apps.client_accounts.models import ProfilClient
        from apps.client_accounts.services import enregistrer_numero, profil

        out = {}
        for cle, (prenom, nom, email, numero, habituel, equipe) in COMPTES.items():
            u = self._utilisateur(email, email=email, first_name=prenom, last_name=nom, is_staff=equipe)
            u.set_password(DEMO_MOT_DE_PASSE)
            u.save()
            if numero and not ProfilClient.objects.filter(user=u, numero_verifie_le__isnull=False).exists():
                enregistrer_numero(u, numero)
            if habituel:
                p = profil(u)
                p.relais_habituel_id = relais[habituel].pk
                p.save(update_fields=["relais_habituel_id"])
            if cle == "carine" and not UserNotification.objects.filter(user=u).exists():
                UserNotification.objects.create(
                    user=u, title="Bienvenue sur BelivaY", message="Ton relais habituel est le Relais Mvog-Ada.", notification_type="SYSTEM"
                )
            out[cle] = u
        return out

    @staticmethod
    def _image(largeur: int, hauteur: int, teintes: tuple, fmt: str = "JPEG") -> bytes:
        """Une image de démonstration : dégradé et formes simples (pas de texte : il ne se traduirait pas)."""
        import io

        from PIL import Image, ImageDraw

        img = Image.new("RGB", (largeur, hauteur), teintes[0])
        d = ImageDraw.Draw(img)
        for y in range(hauteur):
            t = y / hauteur
            d.line([(0, y), (largeur, y)], fill=tuple(round(a + (b - a) * t) for a, b in zip(teintes[0], teintes[1], strict=True)))
        d.ellipse([largeur * 0.55, hauteur * 0.15, largeur * 0.95, hauteur * 0.85], fill=teintes[2])
        d.rounded_rectangle([largeur * 0.08, hauteur * 0.55, largeur * 0.45, hauteur * 0.8], radius=hauteur // 20, fill=teintes[3])
        tampon = io.BytesIO()
        img.save(tampon, fmt, quality=82)
        return tampon.getvalue()

    def _photos(self) -> None:
        try:
            import PIL  # noqa: F401
        except ImportError:  # sans Pillow : le site garde les dessins du prototype
            return
        from django.core.files.base import ContentFile
        from django.core.files.uploadedfile import SimpleUploadedFile

        from apps.contenus.models import BandeauAccueil, Media
        from apps.contenus.services import televerser

        from ...models import ProductImage

        bandeau = BandeauAccueil.objects.filter(actif=True).order_by("ordre", "id").first()
        if bandeau is not None and bandeau.image_id is None:
            media = Media.objects.filter(alt="Robe en wax, bandeau de démonstration").first() or televerser(
                SimpleUploadedFile(
                    "bandeau-mode.jpg", self._image(1600, 900, ((236, 112, 99), (120, 40, 80), (250, 200, 80), (40, 90, 140))), "image/jpeg"
                ),
                alt="Robe en wax, bandeau de démonstration",
            )
            bandeau.image = media
            bandeau.save(update_fields=["image"])
        camon = pont.modele("produit").objects.filter(slug="camon30").first()
        if camon is not None and not ProductImage.objects.filter(product=camon).exists():
            img = ProductImage(product=camon, alt_text="Tecno Camon 30, gris titane", is_primary=True)
            img.image.save(
                "camon30.jpg", ContentFile(self._image(1200, 1200, ((235, 238, 242), (200, 206, 214), (90, 96, 110), (30, 34, 44))))
            )

    def _diaspora(self, comptes, relais) -> None:
        from apps.diaspora.models import CompteDiaspora, LienFamille

        herve, carine = comptes["herve"], comptes["carine"]
        numero = "33612345678"
        CompteDiaspora.objects.update_or_create(
            client=herve,
            defaults={
                "pays": "France",
                "ville": "Lyon",
                "indicatif": "+33",
                "numero_chiffre": chiffrer(numero),
                "numero_empreinte": empreinte(numero),
                "numero_masque": "+33 6 ·· ·· ·· 78",
                "naissance": date(1988, 5, 14),
            },
        )
        LienFamille.objects.update_or_create(
            diaspora=herve, proche=carine, defaults={"etat": LienFamille.Etat.ACTIF, "relay_id": relais["Relais Mvog-Ada"].pk}
        )
