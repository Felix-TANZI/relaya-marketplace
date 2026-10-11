# backend/apps/vendeur_catalogue/views.py
# Routes du catalogue du vendeur, sous /api/vendors/ (VD-02 p12 ; espace-vendeur/src/api/routes/{produits,offres}.ts).
# Réponses = types du site (espace-vendeur/src/donnees/domaines/{produits,offres}.ts) ; un refus attendu par l'écran
# est un 200 { ok: false, raison } ; « T | null » introuvable = 404 ; accès Préparation : montants null, et 403
# owner_only pour le prix, la publication, la pause, la copie, la demande de fiche (comme la démonstration).
from django.http import HttpResponse
from drf_spectacular.utils import extend_schema
from rest_framework import status
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response

from apps.client_core.erreurs import ErreurClient, introuvable
from apps.client_core.idempotence import idempotent
from apps.vendeur_core.acces import VueVendeur, proprietaire_seulement

from . import ajouts as aj
from . import services as s

PRODUITS = ["Espace vendeur · produits"]
OFFRES = ["Espace vendeur · offres"]


def invalide(message: str) -> ErreurClient:
    return ErreurClient(status.HTTP_400_BAD_REQUEST, "invalid", message)


def entier(v, nom: str) -> int:
    try:
        return int(v)
    except (TypeError, ValueError):
        raise invalide(f"{nom} : nombre entier attendu") from None


def vrai(v) -> bool:
    return v is True or str(v).lower() in ("1", "true", "oui")


def ou_404(x):
    if x is None:
        raise introuvable("Offre introuvable.")
    return Response(x)


class VueCatalogue(VueVendeur):
    def lecteur(self, request) -> s.Lecteur:
        return s.Lecteur(self.boutique, self.proprietaire, request, self.membre)


# ── Produits ─────────────────────────────────────────────────────────────────────────────────────────


class Offres(VueCatalogue):
    @extend_schema(tags=PRODUITS, summary="Mes produits (compteurs, tri « ce qui demande attention d'abord »)")
    def get(self, request):
        return Response(s.liste(self.lecteur(request)))

    @extend_schema(tags=OFFRES, summary="Commencer une offre sur une fiche (brouillon)")
    @idempotent()
    def post(self, request):
        return Response(s.commencer(self.lecteur(request), request.data.get("ficheId"), request.data.get("variante")))


class Offre(VueCatalogue):
    @extend_schema(tags=PRODUITS, summary="Un produit ; 404 s'il n'existe pas")
    def get(self, request, pk):
        o = s.offre_de(self.boutique, pk)
        return ou_404(s.produit(o, self.lecteur(request)) if o else None)

    @extend_schema(tags=PRODUITS, summary="Régler : paiement au retrait, prix automatique et plancher, seuil d'alerte")
    def put(self, request, pk):
        return Response(s.regler(self.lecteur(request), pk, dict(request.data)))

    @extend_schema(tags=OFFRES, summary="Modifier un brouillon ou une offre (stock, prix, variante, colis…)")
    def patch(self, request, pk):
        return ou_404(s.modifier(self.lecteur(request), pk, dict(request.data)))

    @extend_schema(tags=PRODUITS, summary="Supprimer un brouillon (annulable)")
    def delete(self, request, pk):
        return Response(s.supprimer(self.lecteur(request), pk))


class Stock(VueCatalogue):
    @extend_schema(tags=PRODUITS, summary="Stock rapide (accès Préparation compris)")
    def put(self, request, pk):
        return Response(s.changer_stock(self.lecteur(request), pk, request.data.get("stock")))


class Pause(VueCatalogue):
    @extend_schema(tags=PRODUITS, summary="Mettre en pause ou remettre en vente")
    @proprietaire_seulement
    def post(self, request, pk):
        return ou_404(s.pause(self.lecteur(request), pk, vrai(request.data.get("enPause"))))


class Dupliquer(VueCatalogue):
    @extend_schema(tags=PRODUITS, summary="Brouillon d'une autre variante")
    @proprietaire_seulement
    @idempotent()
    def post(self, request, pk):
        return Response(s.dupliquer(self.lecteur(request), pk, str(request.data.get("variante") or "")))


class Restaurer(VueCatalogue):
    @extend_schema(tags=PRODUITS, summary="Annuler la suppression d'un brouillon")
    def post(self, request, pk):
        s.restaurer(self.lecteur(request), pk)
        return Response(status=status.HTTP_204_NO_CONTENT)


class Variantes(VueCatalogue):
    @extend_schema(tags=PRODUITS, summary="Variantes d'une fiche et mes offres sur chacune")
    def get(self, request, fiche):
        return Response(s.variantes(self.lecteur(request), fiche))


class Exporter(VueCatalogue):
    @extend_schema(tags=PRODUITS, summary="Export CSV (identifiant, produit, variante, état, prix, stock, seuil)")
    def get(self, request):
        return HttpResponse(s.exporter(self.lecteur(request)), content_type="text/csv; charset=utf-8")


class Importer(VueCatalogue):
    @extend_schema(tags=PRODUITS, summary="Import CSV du stock et du seuil")
    def post(self, request):
        return Response(s.importer(self.lecteur(request), str(request.data.get("csv") or "")))


# ── Nouvelle offre ───────────────────────────────────────────────────────────────────────────────────


class Reglages(VueCatalogue):
    @extend_schema(tags=OFFRES, summary="Réglages de la nouvelle offre (registre)")
    def get(self, request):
        return Response(s.reglages(self.lecteur(request)))


class Rechercher(VueCatalogue):
    @extend_schema(tags=OFFRES, summary="Recherche dans le catalogue (exacts, proches, cherché N fois)")
    def get(self, request):
        return Response(
            s.rechercher(self.lecteur(request), str(request.query_params.get("q", ""))[:200], request.query_params.get("code") or None)
        )


class CodeBarres(VueCatalogue):
    @extend_schema(tags=OFFRES, summary="Fiche par code-barres ; 404 si inconnu")
    def get(self, request, code):
        f = s.par_code_barres(self.lecteur(request), code)
        if f is None:
            raise introuvable("Code-barres inconnu.")
        return Response(f)


class Reconnaitre(VueCatalogue):
    @extend_schema(tags=OFFRES, summary="Fiches proposées pour une photo")
    def post(self, request):
        return Response(s.reconnaitre(self.lecteur(request), dict(request.data)))


class Brouillon(VueCatalogue):
    @extend_schema(tags=OFFRES, summary="Un brouillon ; sans identifiant, le plus récent ; 404 sinon")
    def get(self, request):
        return ou_404(s.brouillon(self.lecteur(request), request.query_params.get("id")))


class Photos(VueCatalogue):
    parser_classes = [JSONParser, MultiPartParser, FormParser]

    @extend_schema(tags=OFFRES, summary="Photos réelles d'une offre, ou en attente (« demande », « copie:<offre> »)")
    def get(self, request, cible):
        try:
            _, qs = s.photos_de(self.boutique, cible)
        except LookupError:
            raise introuvable("Offre introuvable.") from None
        return Response([s.photo_json(p, request) for p in qs])

    @extend_schema(tags=OFFRES, summary="Ajouter une photo réelle (data: URL ou multipart « fichier »)")
    @idempotent()
    def post(self, request, cible):
        donnees = {
            k: request.data.get(k) for k in ("image", "prise", "largeur", "hauteur", "octetsAvant", "octetsApres", "position", "lat", "lon")
        }
        try:
            return Response(s.ajouter_photo(self.boutique, cible, donnees, request.FILES.get("fichier"), request))
        except LookupError:
            raise introuvable("Offre introuvable.") from None
        except (s.PhotoInvalide, ValueError, TypeError) as e:
            raise invalide(f"photo refusée : {e}") from None

    @extend_schema(tags=OFFRES, summary="Ordre des photos {ids} ; la première est la principale")
    def put(self, request, cible):
        ids = request.data.get("ids")
        if not isinstance(ids, list):
            raise invalide("ids : liste attendue")
        aj.ordonner_photos(self.boutique, cible, ids)
        return Response(status=status.HTTP_204_NO_CONTENT)


class Photo(VueCatalogue):
    @extend_schema(tags=OFFRES, summary="Retirer une photo réelle")
    def delete(self, request, cible, photo):
        try:
            s.retirer_photo(self.boutique, cible, photo)
        except LookupError:
            raise introuvable("Offre introuvable.") from None
        return Response(status=status.HTTP_204_NO_CONTENT)


class Apercu(VueCatalogue):
    @extend_schema(tags=OFFRES, summary="« À X F, vous gardez Y F » pendant la saisie (moteur de commission)")
    @proprietaire_seulement
    def get(self, request):
        q = request.query_params
        mic = vrai(q["mic"]) if q.get("mic") not in (None, "") else None
        return Response(s.apercu(self.lecteur(request), q.get("offre") or None, entier(q.get("prix"), "prix"), mic))


class Conseil(VueCatalogue):
    @extend_schema(tags=OFFRES, summary="Prix conseillé (médiane − 100 F, jamais sous le 10e centile) ; 404 sans conseil")
    @proprietaire_seulement
    def get(self, request, pk):
        return ou_404(s.conseil(self.lecteur(request), pk, entier(request.query_params.get("prix"), "prix")))


class Publier(VueCatalogue):
    @extend_schema(tags=OFFRES, summary="Envoyer l'offre en vérification")
    @proprietaire_seulement
    @idempotent()
    def post(self, request, pk):
        return ou_404(s.publier(self.lecteur(request), pk, vrai(request.data.get("rester")), vrai(request.data.get("horsLigne"))))


class Prix(VueCatalogue):
    @extend_schema(tags=OFFRES, summary="Changer le prix d'une offre en vente (« Ajuster », « Rester »)")
    @proprietaire_seulement
    def put(self, request, pk):
        prix = request.data.get("prix")
        return Response(s.changer_prix(self.lecteur(request), pk, prix, vrai(request.data.get("rester"))))


class Publication(VueCatalogue):
    @extend_schema(tags=OFFRES, summary="Écran « Offre envoyée » d'une offre (ou de la dernière) ; 404 sinon")
    def get(self, request, pk=None):
        return ou_404(s.publication(self.lecteur(request), pk))


class ProposerDescription(VueCatalogue):
    @extend_schema(tags=OFFRES, summary="Proposer une description de la fiche (relue par BelivaY)")
    @proprietaire_seulement
    def post(self, request, pk):
        return ou_404(s.proposer_description(self.lecteur(request), pk, str(request.data.get("texte") or "")))


# ── Nouveau produit (DP-58) ────────────────────────────────────────────────────────────────────────────


class Suggerer(VueCatalogue):
    @extend_schema(tags=OFFRES, summary="Catégorie, marque, description proposées et doublon pour le nom d'un produit nouveau")
    def get(self, request):
        return Response(aj.suggerer(self.lecteur(request), str(request.query_params.get("q") or "")))


class Creer(VueCatalogue):
    @extend_schema(tags=OFFRES, summary="Produit nouveau après une recherche (3 caractères ou un code-barres) : brouillon")
    @idempotent()
    def post(self, request):
        return Response(aj.creer(self.lecteur(request), str(request.data.get("nom") or ""), request.data.get("code")))


class Rattacher(VueCatalogue):
    @extend_schema(tags=OFFRES, summary="Le produit nouveau existe déjà : brouillon rattaché à la fiche (FCH-02)")
    @proprietaire_seulement
    def post(self, request, pk):
        return Response(aj.rattacher(self.lecteur(request), pk, request.data.get("ficheId")))


# ── Stock et inventaire (AJ-A) ─────────────────────────────────────────────────────────────────────────


STOCK = ["Espace vendeur · stock"]
LIVRAISON = ["Espace vendeur · livraison"]


class Inventaire(VueCatalogue):
    @extend_schema(tags=STOCK, summary="Inventaire : ruptures, sous le seuil, puis le reste ; valeur null pour un employé")
    def get(self, request):
        return Response(aj.inventaire(self.lecteur(request)))


class Mouvements(VueCatalogue):
    @extend_schema(tags=STOCK, summary="Mouvements de stock signés et ventes (?offer=) ; le plus récent d'abord")
    def get(self, request):
        return Response(aj.mouvements(self.lecteur(request), request.query_params.get("offer") or None))


class Ajuster(VueCatalogue):
    @extend_schema(tags=STOCK, summary="Réception ou correction {nouveau, type, note?} (droit produits.stock ; signé)")
    @idempotent()
    def post(self, request, offre):
        d = request.data if hasattr(request.data, "get") else {}
        return Response(aj.ajuster(self.lecteur(request), offre, {k: d.get(k) for k in ("nouveau", "type", "note")}))


class Seuil(VueCatalogue):
    @extend_schema(tags=STOCK, summary="Seuil d'alerte (propriétaire)")
    def put(self, request, offre):
        return Response(aj.regler_seuil(self.lecteur(request), offre, request.data.get("seuil")))


class ExporterStock(VueCatalogue):
    @extend_schema(tags=STOCK, summary="Inventaire en CSV ; sans prix pour un employé")
    def get(self, request):
        return HttpResponse(aj.exporter(self.lecteur(request)), content_type="text/csv; charset=utf-8")


# ── Livraison et colis (AJ-A) ──────────────────────────────────────────────────────────────────────────


class ReglagesLivraison(VueCatalogue):
    @extend_schema(tags=LIVRAISON, summary="Défauts de la boutique, créneaux, relais proches, colis de chaque produit")
    def get(self, request):
        return Response(aj.reglages(self.lecteur(request)))

    @extend_schema(tags=LIVRAISON, summary="Défauts appliqués à toute offre créée {colis?, delaiH?, paiementAuRetrait?}")
    def put(self, request):
        d = request.data if hasattr(request.data, "get") else {}
        return Response(aj.regler(self.lecteur(request), {k: d[k] for k in ("colis", "delaiH", "paiementAuRetrait") if k in d}))


class LivraisonProduit(VueCatalogue):
    @extend_schema(tags=LIVRAISON, summary="Colis, mesures, délai, paiement au retrait d'une offre")
    def put(self, request, pk):
        d = request.data if hasattr(request.data, "get") else {}
        champs = ("colis", "poidsKg", "dimensionsCm", "delaiPreparationH", "paiementAuRetrait")
        return Response(aj.regler_produit(self.lecteur(request), pk, {k: d[k] for k in champs if k in d}))


class CreneauPrefere(VueCatalogue):
    @extend_schema(tags=LIVRAISON, summary="Créneau de ramassage préféré {prefere} (au moins un)")
    def put(self, request, id):
        return Response(aj.preferer(self.lecteur(request), "creneau", id, bool(request.data.get("prefere"))))


class RelaisPrefere(VueCatalogue):
    @extend_schema(tags=LIVRAISON, summary="Relais préféré {prefere} (retours et dépôts)")
    def put(self, request, id):
        return Response(aj.preferer(self.lecteur(request), "relais", id, bool(request.data.get("prefere"))))
