# backend/apps/vendors/ouverture.py
# Ouvrir une boutique — feuille de route D19 : « Créer la boutique depuis le compte client, sans pièce. »
#
# Trois écrans ouvrent une boutique (le front de production par /api/vendors/apply/, le site client par /api/me/shop,
# l'espace vendeur par /api/vendors/shops). Ils passent tous par ici : une seule règle d'ouverture, le profil vendeur
# naît EN ATTENTE, et la pièce d'identité se dépose ensuite (apps.vendors.kyc) avant de publier ou d'être versé.

from apps.vendors.models import VendorProfile


class Refus(Exception):
    def __init__(self, raison: str, message: str):
        super().__init__(message)
        self.raison = raison
        self.message = message


def ouvrir_boutique(user, *, nom: str, telephone: str = "", description: str = "", adresse: str = "",
                    ville: str = "", id_document: str = "") -> VendorProfile:
    """Crée le profil vendeur EN ATTENTE de l'utilisateur ; lève Refus(raison, message) sinon."""
    from apps.accounts.models import PartnerBlacklist

    nom = (nom or "").strip()
    telephone = (telephone or "").strip()
    if VendorProfile.objects.filter(user=user).exists():
        raise Refus("deux_comptes", "Vous avez déjà une boutique.")
    if not nom:
        raise Refus("nom", "Le nom de la boutique est requis.")
    if VendorProfile.objects.filter(business_name__iexact=nom).exists():
        raise Refus("nom_pris", "Ce nom de boutique est déjà pris.")
    if telephone and VendorProfile.objects.filter(phone__endswith=telephone[-9:]).exists():
        raise Refus("numero", "Ce numéro est déjà celui d'une autre boutique.")
    # Bannissement niveau 4 (V5.5 §8) : une CNI ou un numéro Mobile Money bloqué ne revient pas sous un autre compte.
    if id_document and PartnerBlacklist.is_blacklisted(PartnerBlacklist.IdentifierType.CNI, id_document):
        raise Refus("bloque", "Cette pièce d'identité ne peut pas être utilisée pour créer un compte partenaire.")
    if telephone and PartnerBlacklist.is_blacklisted(PartnerBlacklist.IdentifierType.MOMO, telephone):
        raise Refus("bloque", "Ce numéro Mobile Money ne peut pas être utilisé pour créer un compte partenaire.")
    return VendorProfile.objects.create(
        user=user, business_name=nom[:255], business_description=description or "", phone=telephone[:20],
        address=adresse or "", city=ville or "", id_document=id_document or "",
        status=VendorProfile.Status.PENDING,
    )
