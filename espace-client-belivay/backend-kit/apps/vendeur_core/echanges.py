# backend/apps/vendeur_core/echanges.py
# Échanges de l'espace vendeur avec les autres interfaces (espace-vendeur/INTERFACES.md ; types : src/donnees/echanges.ts).
#   emettre(boutique, sens, interface, type, canal, donnees, droit) — un événement du flux (ajout seul)
#   lire(membre, depuis, limite) -> {evenements, curseur}          — GET /events?depuis= (et le flux SSE)
# Chaque événement a un identifiant (curseur) : rejouer le flux ne crée aucun doublon. Un employé ne reçoit que ce
# que ses droits permettent ; aucun montant ne lui parvient (montant: null, Q-18) ; un événement sans droit est réservé
# au propriétaire. ANONYMAT (GEN-01) : l'appelant ne passe jamais le client (contrôlé par anonymat.fuites).
from . import horloge
from .anonymat import fuites
from .droits import droits_de
from .models import Boutique, EvenementVendeur, Membre

LIMITE = 200
MONTANTS = ("montant",)


def emettre(b: Boutique, sens: str, interface: str, type_: str, canal: str, donnees: dict, droit: str = "") -> EvenementVendeur:
    if fuites(donnees):  # jamais le client (GEN-01)
        raise ValueError(f"événement {type_} : donnée du client {fuites(donnees)}")
    return EvenementVendeur.objects.create(
        boutique=b, sens=sens, interface=interface, type=type_, canal=canal, donnees=donnees, droit=droit, a=horloge.maintenant()
    )


def evenement_json(e: EvenementVendeur, proprietaire: bool) -> dict:
    d = {k: (None if k in MONTANTS and not proprietaire else v) for k, v in (e.donnees or {}).items()}
    cote = "de" if e.sens == "entrant" else "vers"
    return {"id": str(e.pk), "a": int(e.a.timestamp() * 1000), cote: e.interface, "type": e.type, "canal": e.canal, **d}


def lire(m: Membre, depuis=None, limite: int = LIMITE) -> dict:
    proprietaire = m.role == Membre.Role.PROPRIETAIRE
    qs = EvenementVendeur.objects.filter(boutique=m.boutique)
    if str(depuis or "").isdigit():
        qs = qs.filter(pk__gt=int(depuis))
    if not proprietaire:
        qs = qs.exclude(droit="").filter(droit__in=droits_de(m))
    evts = list(qs.order_by("id")[: max(1, min(int(limite), LIMITE))])
    curseur = str(evts[-1].pk) if evts else (str(depuis) if str(depuis or "").isdigit() else "0")
    return {"evenements": [evenement_json(e, proprietaire) for e in evts], "curseur": curseur}
