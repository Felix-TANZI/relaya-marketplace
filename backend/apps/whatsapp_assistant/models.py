# backend/apps/whatsapp_assistant/models.py
# Mémoire propre au module : qui nous écrit, et ce qui a été échangé.
# Aucune table du reste de Belivay n'est modifiée.

from django.db import models
from django.db.models import Q


class WhatsAppContact(models.Model):
    """Une personne qui a écrit à l'assistant, identifiée par son numéro WhatsApp."""

    class Language(models.TextChoices):
        FRENCH = "fr", "Français"
        ENGLISH = "en", "English"

    wa_id = models.CharField(
        max_length=32, unique=True,
        verbose_name="Numéro WhatsApp",
        help_text="Format international sans « + » (ex : 2376XXXXXXXX), tel que fourni par WhatsApp.",
    )
    profile_name = models.CharField(max_length=120, blank=True, verbose_name="Nom du profil")
    language = models.CharField(
        max_length=2, blank=True, choices=Language.choices,
        verbose_name="Langue", help_text="Vide tant que le client ne l'a pas choisie.",
    )
    # Mémoire de conversation : où en est le client, et ce qu'il est en train de parcourir.
    state = models.CharField(max_length=32, blank=True, verbose_name="Étape en cours")
    context = models.JSONField(default=dict, blank=True, verbose_name="Contexte")
    first_seen_at = models.DateTimeField(auto_now_add=True, verbose_name="Premier message")
    last_inbound_at = models.DateTimeField(null=True, blank=True, verbose_name="Dernier message reçu")

    class Meta:
        verbose_name = "Contact WhatsApp"
        verbose_name_plural = "Contacts WhatsApp"
        ordering = ["-last_inbound_at"]

    def __str__(self):
        return f"+{self.wa_id} {self.profile_name}".strip()


class WhatsAppPoster(models.Model):
    """
    Affiche publicitaire envoyée avant l'accueil, comme le font les grands
    comptes WhatsApp. Plusieurs affiches actives tournent d'un client à l'autre.
    """

    class Placement(models.TextChoices):
        WELCOME = "welcome", "Accueil (salutation, premier message)"
        SHOP = "shop", "Bouton « Acheter » (catalogue)"
        SEARCH = "search", "Recherche d'un article"

    title = models.CharField(max_length=120, verbose_name="Titre (interne)")
    placement = models.CharField(
        max_length=16, choices=Placement.choices, default=Placement.WELCOME,
        verbose_name="Moment", help_text="Quand l'assistant envoie cette affiche.",
    )
    image = models.ImageField(
        upload_to="whatsapp/posters/",
        verbose_name="Affiche",
        help_text="JPG, PNG ou WEBP, 5 Mo max. Format carré ou portrait conseillé (ex : 1080 × 1350).",
    )
    caption_fr = models.TextField(blank=True, verbose_name="Légende (français)")
    caption_en = models.TextField(blank=True, verbose_name="Légende (anglais)")
    is_active = models.BooleanField(default=True, verbose_name="Active")
    display_order = models.PositiveIntegerField(default=0, verbose_name="Ordre")
    starts_at = models.DateTimeField(null=True, blank=True, verbose_name="Début de campagne")
    ends_at = models.DateTimeField(null=True, blank=True, verbose_name="Fin de campagne")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Affiche WhatsApp"
        verbose_name_plural = "Affiches WhatsApp"
        ordering = ["display_order", "id"]

    def __str__(self):
        return self.title


class WhatsAppMedia(models.Model):
    """
    Image déjà déposée chez le fournisseur (convertie en JPEG). Meta la garde
    30 jours : on réutilise son identifiant au lieu de la renvoyer à chaque fois.
    """

    source_name = models.CharField(max_length=255, unique=True, help_text="Chemin du fichier dans le stockage Belivay.")
    media_id = models.CharField(max_length=128)
    uploaded_at = models.DateTimeField()

    class Meta:
        verbose_name = "Média déposé chez WhatsApp"
        verbose_name_plural = "Médias déposés chez WhatsApp"

    def __str__(self):
        return self.source_name


class CourierNotification(models.Model):
    """
    Message envoyé à un livreur quand une livraison lui est assignée. Les
    colis, tournées et livreurs sont référencés par leur numéro (pas de clé
    étrangère) : le module se retire sans toucher aux tables de livraison.
    """

    class Kind(models.TextChoices):
        MISSION = "mission", "Nouvelle mission (un colis)"
        TOUR_RECAP = "tour_recap", "Récapitulatif de tournée"

    kind = models.CharField(max_length=16, choices=Kind.choices, verbose_name="Type")
    shipment_id = models.PositiveBigIntegerField(null=True, blank=True, verbose_name="Colis n°")
    tournee_id = models.PositiveBigIntegerField(null=True, blank=True, verbose_name="Tournée n°")
    courier_id = models.PositiveBigIntegerField(verbose_name="Livreur n°")
    # Horodatage de l'assignation : une réassignation ultérieure au même livreur
    # est une nouvelle mission, un doublon de la même assignation ne l'est pas.
    assignment_ref = models.CharField(max_length=40, blank=True, verbose_name="Assignation")
    recipient = models.CharField(max_length=32, blank=True, verbose_name="Envoyé au")
    language = models.CharField(max_length=2, blank=True, verbose_name="Langue")
    provider_message_id = models.CharField(max_length=128, blank=True)
    error = models.TextField(blank=True, verbose_name="Erreur")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Envoyé le")

    class Meta:
        verbose_name = "Message livreur"
        verbose_name_plural = "Messages livreurs"
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["shipment_id", "courier_id", "assignment_ref"],
                condition=Q(kind="mission"),
                name="whatsapp_courier_mission_unique",
            ),
            models.UniqueConstraint(
                fields=["tournee_id", "courier_id"],
                condition=Q(kind="tour_recap"),
                name="whatsapp_courier_tour_recap_unique",
            ),
        ]

    def __str__(self):
        target = f"colis {self.shipment_id}" if self.shipment_id else f"tournée {self.tournee_id}"
        return f"{self.get_kind_display()} · {target} → +{self.recipient}"


class VendorNotification(models.Model):
    """
    Message envoye a un vendeur quand une commande vient d'etre payee. Les
    commandes et les vendeurs sont references par leur numero (pas de cle
    etrangere) : le module se retire sans toucher aux tables du coeur.
    """

    class Kind(models.TextChoices):
        NEW_ORDER = "new_order", "Nouvelle commande payee"

    kind = models.CharField(max_length=16, choices=Kind.choices,
                            default=Kind.NEW_ORDER, verbose_name="Type")
    order_id = models.PositiveBigIntegerField(verbose_name="Commande n°")
    vendor_id = models.PositiveBigIntegerField(verbose_name="Vendeur n°")
    recipient = models.CharField(max_length=32, blank=True, verbose_name="Envoyé au")
    language = models.CharField(max_length=2, blank=True, verbose_name="Langue")
    provider_message_id = models.CharField(max_length=128, blank=True)
    error = models.TextField(blank=True, verbose_name="Erreur")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Envoyé le")

    class Meta:
        verbose_name = "Message vendeur"
        verbose_name_plural = "Messages vendeurs"
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["order_id", "vendor_id", "kind"],
                name="whatsapp_vendor_order_unique",
            ),
        ]

    def __str__(self):
        return f"{self.get_kind_display()} · commande {self.order_id} → +{self.recipient}"


class RelayNotification(models.Model):
    """
    Message envoye au gerant d'un point relais quand un colis part vers lui.
    Colis et relais sont references par leur numero (pas de cle etrangere) :
    le module se retire sans toucher aux tables du coeur.
    """

    class Kind(models.TextChoices):
        ON_THE_WAY = "on_the_way", "Colis en route vers le relais"

    kind = models.CharField(max_length=16, choices=Kind.choices,
                            default=Kind.ON_THE_WAY, verbose_name="Type")
    parcel_id = models.PositiveBigIntegerField(verbose_name="Colis relais n\u00b0")
    relay_id = models.PositiveBigIntegerField(verbose_name="Point relais n\u00b0")
    recipient = models.CharField(max_length=32, blank=True, verbose_name="Envoy\u00e9 au")
    language = models.CharField(max_length=2, blank=True, verbose_name="Langue")
    provider_message_id = models.CharField(max_length=128, blank=True)
    error = models.TextField(blank=True, verbose_name="Erreur")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="Envoy\u00e9 le")

    class Meta:
        verbose_name = "Message point relais"
        verbose_name_plural = "Messages points relais"
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["parcel_id", "relay_id", "kind"],
                name="whatsapp_relay_parcel_unique",
            ),
        ]

    def __str__(self):
        return f"{self.get_kind_display()} \u00b7 colis {self.parcel_id} \u2192 +{self.recipient}"


class WhatsAppMessage(models.Model):
    """Journal des échanges : sert au suivi, au débogage et à l'anti-doublon."""

    class Direction(models.TextChoices):
        INBOUND = "IN", "Reçu"
        OUTBOUND = "OUT", "Envoyé"

    contact = models.ForeignKey(WhatsAppContact, on_delete=models.CASCADE, related_name="messages")
    direction = models.CharField(max_length=3, choices=Direction.choices)
    provider_message_id = models.CharField(max_length=128, blank=True, db_index=True)
    message_type = models.CharField(max_length=32, blank=True)
    text = models.TextField(blank=True)
    payload = models.JSONField(default=dict, blank=True)
    error = models.TextField(blank=True, help_text="Motif d'échec d'un envoi, le cas échéant.")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Message WhatsApp"
        verbose_name_plural = "Messages WhatsApp"
        ordering = ["-created_at"]
        constraints = [
            # Meta peut renvoyer un même webhook : un message reçu n'est traité qu'une fois.
            models.UniqueConstraint(
                fields=["provider_message_id"],
                condition=Q(direction="IN") & ~Q(provider_message_id=""),
                name="whatsapp_inbound_message_unique",
            ),
        ]

    def __str__(self):
        arrow = "←" if self.direction == self.Direction.INBOUND else "→"
        return f"{arrow} {self.contact} : {self.text[:40]}"
