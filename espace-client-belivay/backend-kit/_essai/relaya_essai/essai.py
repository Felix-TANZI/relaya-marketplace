# Routes RÉSERVÉES AU SERVEUR D'ESSAI (settings.BELIVAY_ESSAI_ROUTES = True, jamais en production) : ce que les
# prestataires et les applications des livreurs et des relais feraient pour de vrai, pour parcourir le site de bout en
# bout contre le kit (site/tests/api-bout-en-bout.spec.ts).
#
#   GET  /api/_essai/codes?destination=677112241        dernier code envoyé (SMS console ou e-mail en mémoire)
#   GET  /api/_essai/paiements                          demandes Mobile Money et paiements carte (prestataires console)
#   POST /api/_essai/paiements/confirmer {reference | commande, reussi}   webhook de l'agrégateur ou du prestataire carte
#   POST /api/_essai/commandes/{ref}/avancer {jusqua: confirmee|prete|collectee|arrivee}  vendeur, livreur, relais
#   POST /api/_essai/commandes/{ref}/remettre {code}    remise au comptoir avec le code de retrait
#   GET  /api/_essai/3ds/{reference}                    page « banque » 3-D Secure ; POST : valider (ou refuser)
#   POST /api/_essai/produits/{id}/prix {prix}          le vendeur change son prix (409 price_changed au paiement)
#   POST /api/_essai/limites                            efface les compteurs de débit (cache)
import html
import re

from django.conf import settings
from django.core import mail
from django.core.cache import cache
from django.http import Http404, HttpResponse, HttpResponseRedirect
from django.views.decorators.csrf import csrf_exempt
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.client_core import pont
from apps.client_core.webhooks import confirmer_paiement_externe
from apps.otp.prestataires import SmsConsole
from apps.wallet.prestataires import CarteConsole, MobileMoneyConsole

CODE = re.compile(r"(?<!\d)(\d{6})(?!\d)")


def _actif():
    if not getattr(settings, "BELIVAY_ESSAI_ROUTES", False):
        raise Http404


class Essai(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def initial(self, request, *args, **kwargs):
        _actif()
        super().initial(request, *args, **kwargs)


def _chiffres(x: str) -> str:
    return re.sub(r"\D", "", x or "")


class Codes(Essai):
    def get(self, request):
        dest = (request.query_params.get("destination") or "").strip().lower()
        if "@" in dest:
            for m in reversed(getattr(mail, "outbox", [])):
                if dest in [a.lower() for a in m.to]:
                    c = CODE.search(f"{m.subject}\n{m.body}")
                    if c:
                        return Response({"code": c.group(1), "canal": "email"})
            raise Http404
        n = _chiffres(dest)[-9:]
        for e in reversed(SmsConsole.ENVOYES):
            if _chiffres(e["numero"]).endswith(n):
                c = CODE.search(e["texte"])
                if c:
                    return Response({"code": c.group(1), "canal": e["canal"]})
        raise Http404


class Paiements(Essai):
    def get(self, request):
        return Response(
            {
                "mobileMoney": [{k: str(v) for k, v in d.items()} for d in MobileMoneyConsole.DEMANDES[-30:]],
                "carte": [{k: str(v) for k, v in d.items()} for d in CarteConsole.PAIEMENTS[-30:]],
            }
        )


def _reference_de_commande(ref: str) -> str | None:
    """Dernière demande Mobile Money (ou carte) d'une commande « BLV-52018 »."""
    prefixe = f"{pont.ref_commande(pont.id_commande(ref))}-"
    for d in reversed(MobileMoneyConsole.DEMANDES + CarteConsole.PAIEMENTS):
        if str(d.get("reference", "")).startswith(prefixe):
            return d["reference"]
    return None


class ConfirmerPaiement(Essai):
    def post(self, request):
        ref = request.data.get("reference") or (_reference_de_commande(request.data["commande"]) if request.data.get("commande") else None)
        if not ref:
            raise Http404
        reussi = request.data.get("reussi", True) not in (False, "false", "0")
        return Response(
            {"reference": ref, "domaine": confirmer_paiement_externe(ref, reussi=reussi, cause=request.data.get("cause") or "solde")}
        )


ETAPES = {
    "confirmee": ("seller.confirmed",),
    "prete": ("seller.confirmed", "suborder.ready"),
    "collectee": ("seller.confirmed", "suborder.ready", "parcel.collected"),
    "arrivee": ("seller.confirmed", "suborder.ready", "parcel.collected", "parcel.received"),
}


class Avancer(Essai):
    def post(self, request, ref):
        from apps.pickup.evenements import avancer
        from apps.pickup.models import SousCommande

        oid = pont.id_commande(ref)
        etapes = ETAPES.get(request.data.get("jusqua") or "arrivee")
        if etapes is None:
            return Response({"error": {"code": "jusqua", "message": "confirmee, prete, collectee ou arrivee"}}, status=400)
        rang = {"payee": 0, "confirmee": 1, "prete": 2, "collectee": 3, "arrivee_relais": 4}
        for i, e in enumerate(etapes, start=1):
            if any(rang.get(sc.etat, 9) < i for sc in SousCommande.objects.filter(order_id=oid).exclude(etat="annulee")):
                avancer(oid, e)
        return Response({"ref": pont.ref_commande(oid), "colis": list(SousCommande.objects.filter(order_id=oid).values("n", "etat"))})


class Remettre(Essai):
    def post(self, request, ref):
        from apps.pickup.evenements import remettre_au_client

        return Response(remettre_au_client(pont.id_commande(ref), str(request.data.get("code") or "")))


class Prix(Essai):
    def post(self, request, pk):
        p = pont.modele("produit").objects.filter(pk=pk).first()
        if p is None:
            raise Http404
        p.price_xaf = int(request.data["prix"])
        p.save(update_fields=["price_xaf"])
        return Response({"id": p.pk, "prix": p.price_xaf})


class Limites(Essai):
    def post(self, request):
        cache.clear()
        return Response({"ok": True})


@csrf_exempt
def banque_3ds(request, reference):
    """Page de la banque (3-D Secure) d'essai : « Valider » confirme le paiement par le webhook du kit, puis revient au
    site. En production : la page du prestataire carte, et son webhook signé."""
    _actif()
    retour = getattr(settings, "BELIVAY_SITE_URL", "/").rstrip("/") + "/"
    if request.method == "POST":
        reussi = request.POST.get("decision") != "refuser"
        confirmer_paiement_externe(reference, reussi=reussi, cause="carte")
        return HttpResponseRedirect(retour + ("?3ds=ok" if reussi else "?3ds=refus"))
    ref = html.escape(reference)
    return HttpResponse(
        f"""<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width">
<title>Banque (essai) · 3-D Secure</title>
<body style="font-family:system-ui;max-width:420px;margin:40px auto;padding:0 16px">
<h1>Confirme ton paiement</h1><p>Banque d'essai du kit BelivaY · référence <code>{ref}</code></p>
<form method="post"><button name="decision" value="valider">Valider le paiement</button>
<button name="decision" value="refuser">Refuser</button></form></body></html>"""
    )
