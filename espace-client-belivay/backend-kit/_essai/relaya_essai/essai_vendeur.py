# Routes RÉSERVÉES AU SERVEUR D'ESSAI pour l'espace vendeur (settings.BELIVAY_ESSAI_ROUTES = True, jamais en
# production) : ce que font pour de vrai l'horloge, l'application du livreur, le prestataire de vérification (KYC), la
# console de BelivaY (modération, décision d'un litige), le relais, l'opérateur Mobile Money (versement, paiement d'un
# plan), le support et l'agent de zone, pour parcourir l'espace vendeur de bout en bout contre le kit
# (espace-vendeur/tests/api-bout-en-bout.spec.ts). Chaque route appelle UNE fonction de service d'une application
# vendeur : rien n'est réécrit ici.
#
#   GET  /api/_essai/horloge                                   heure du serveur vendeur et décalage
#   POST /api/_essai/horloge {jours?, heures?, secondes?, remettre?}   avance l'heure de l'espace vendeur (ou la remet)
#   POST /api/_essai/vendeur/kyc/{ref} {accord, motif?}        prestataire de vérification (dossier VD-…)
#   GET  /api/_essai/vendeur/lien-mdp?destination=             jeton du dernier lien « mot de passe oublié » envoyé
#   POST /api/_essai/vendeur/offres/{id}/moderer {accord, motif?}      modération d'une offre (console)
#   POST /api/_essai/vendeur/commandes/{ref}/livreur {code}    le livreur saisit le code de remise
#   POST /api/_essai/vendeur/commandes/{ref}/simuler {quoi: livreur_absent|annulation_client}
#   POST /api/_essai/vendeur/litiges/{ref}/decider {issue: gagne|perdu, motif}   médiation (console)
#   POST /api/_essai/vendeur/litiges/{ref}/retour {categorie?}  BelivaY accepte le retour (motif recevable)
#   POST /api/_essai/vendeur/retours/{ref}/avancer {evenement}  relais et livreur : return.deposited, return.collected…
#   POST /api/_essai/vendeur/versements/executer               arrêté du jeudi et versement du vendredi (tâche planifiée)
#   POST /api/_essai/vendeur/versements/{reference}/refuser {motif}    refus de l'opérateur
#   POST /api/_essai/vendeur/paiements/{id}/confirmer {reussi}   webhook Mobile Money d'un plan ou d'un service
#   POST /api/_essai/vendeur/boutiques/{identifiant}/support {texte, ref?}   le support répond au vendeur
#   POST /api/_essai/vendeur/boutiques/{identifiant}/point     l'agent de zone valide le point déplacé
from django.http import Http404
from rest_framework.response import Response

from apps.vendeur_core import horloge
from apps.vendeur_core.models import Boutique

from .essai import Essai


def _rendre(appel):
    """Appelle la fonction de service ; une référence inconnue → 404, une situation impossible → 409 (comme une vue)."""
    from apps.client_core.erreurs import ErreurClient

    try:
        r = appel()
    except (LookupError, Http404) as e:
        return Response({"error": {"code": "not_found", "message": str(e)}}, status=404)
    except ValueError as e:
        return Response({"error": {"code": "state_changed", "message": str(e)}}, status=409)
    except ErreurClient as e:
        return Response({"error": {"code": e.code, "message": e.message, "data": e.data}}, status=e.status_code)
    return Response(r if r is not None else {"ok": True})


def _vrai(v) -> bool:
    return v not in (False, "false", "0", 0, None)


def _boutique(identifiant: str) -> Boutique:
    b = Boutique.objects.filter(identifiant=identifiant if identifiant.startswith("@") else f"@{identifiant}").first()
    if b is None:
        raise Http404
    return b


class Horloge(Essai):
    def get(self, request):
        return Response({"maintenant": horloge.maintenant_ms(), "decalage": int(horloge.decalage().total_seconds())})

    def post(self, request):
        d = request.data
        if d.get("remettre"):
            horloge.regler(0)
        else:
            horloge.avancer(int(float(d.get("jours") or 0) * 86400 + float(d.get("heures") or 0) * 3600 + float(d.get("secondes") or 0)))
        return self.get(request)


class Kyc(Essai):
    def post(self, request, ref):
        from apps.vendeur_session.ouverture import repondre_verification

        return _rendre(lambda: repondre_verification(ref, _vrai(request.data.get("accord", True)), request.data.get("motif") or ""))


class LienMotDePasse(Essai):
    def get(self, request):
        from apps.vendeur_session.services import dernier_lien_mdp

        jeton = dernier_lien_mdp(request.query_params.get("destination") or "")
        if not jeton:
            raise Http404
        return Response({"jeton": jeton})


class Moderer(Essai):
    def post(self, request, pk):
        from apps.vendeur_catalogue.services import moderer

        return _rendre(lambda: moderer(int(pk), _vrai(request.data.get("accord", True)), request.data.get("motif") or ""))


class Livreur(Essai):
    def post(self, request, ref):
        from apps.vendeur_commandes.services import saisie_livreur

        return _rendre(lambda: saisie_livreur(ref, str(request.data.get("code") or "")))


class Simuler(Essai):
    def post(self, request, ref):
        from apps.vendeur_commandes import services

        quoi = request.data.get("quoi")
        if quoi not in ("livreur_absent", "annulation_client"):
            return Response({"error": {"code": "quoi", "message": "livreur_absent ou annulation_client"}}, status=400)
        return _rendre(lambda: getattr(services, quoi)(ref))


class DeciderLitige(Essai):
    def post(self, request, ref):
        from apps.vendeur_litiges.services import decider

        return _rendre(lambda: decider(ref, request.data.get("issue") or "", request.data.get("motif") or ""))


class AccepterRetour(Essai):
    def post(self, request, ref):
        from apps.vendeur_litiges.services import accepter_retour

        return _rendre(lambda: accepter_retour(ref, request.data.get("categorie") or None))


class AvancerRetour(Essai):
    def post(self, request, ref):
        from apps.vendeur_litiges.services import avancer_retour

        return _rendre(lambda: avancer_retour(ref, request.data.get("evenement") or ""))


class ExecuterVersements(Essai):
    def post(self, request):
        from apps.vendeur_argent.services import executer_versements

        return _rendre(lambda: {"versements": [v.reference for v in executer_versements()]})


class RefuserVersement(Essai):
    def post(self, request, reference):
        from apps.vendeur_argent.services import refuser_versement

        return _rendre(lambda: refuser_versement(reference, request.data.get("motif") or "plein"))


class ConfirmerPaiementVendeur(Essai):
    def post(self, request, pk):
        from apps.vendeur_croissance.services import confirmer_paiement

        return _rendre(lambda: confirmer_paiement(int(pk), _vrai(request.data.get("reussi", True))))


class RepondreSupport(Essai):
    def post(self, request, identifiant):
        from apps.vendeur_boutique.services import repondre_support

        return _rendre(
            lambda: {"id": repondre_support(_boutique(identifiant), request.data.get("texte") or "", request.data.get("ref") or "").pk}
        )


class ValiderPoint(Essai):
    def post(self, request, identifiant):
        from apps.vendeur_boutique.services import valider_point

        return _rendre(lambda: (valider_point(_boutique(identifiant)), {"ok": True})[1])
