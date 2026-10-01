# backend/apps/whatsapp_assistant/providers/base.py
# Contrat commun à tous les fournisseurs WhatsApp (Meta aujourd'hui, un autre
# demain). Le reste du module ne manipule que ces types : changer de
# fournisseur revient à écrire une nouvelle implémentation de WhatsAppProvider.

from abc import ABC, abstractmethod
from dataclasses import dataclass, field


class ProviderError(Exception):
    """Le fournisseur a refusé ou n'a pas pu traiter un envoi."""


@dataclass(frozen=True)
class IncomingMessage:
    message_id: str
    wa_id: str                  # numéro de l'expéditeur, international sans « + » (2376…)
    profile_name: str
    type: str                   # text, interactive, button, location, image…
    text: str = ""              # texte saisi, ou libellé du bouton / de la ligne choisie
    reply_id: str = ""          # identifiant du bouton ou de la ligne choisie (menus)
    raw: dict = field(default_factory=dict)


@dataclass(frozen=True)
class Button:
    """Bouton de réponse : `id` revient dans IncomingMessage.reply_id quand il est touché."""
    id: str
    title: str


@dataclass(frozen=True)
class ListRow:
    id: str
    title: str
    description: str = ""


@dataclass(frozen=True)
class ListSection:
    title: str
    rows: list[ListRow]


class WhatsAppProvider(ABC):
    name = ""

    @abstractmethod
    def verify_signature(self, body: bytes, headers) -> bool:
        """Vrai si la requête vient bien du fournisseur (corps signé)."""

    @abstractmethod
    def parse_webhook(self, payload: dict) -> list[IncomingMessage]:
        """Messages reçus contenus dans un webhook (les accusés d'envoi sont ignorés)."""

    @abstractmethod
    def send_text(self, to: str, text: str) -> str | None:
        """Envoie un texte ; renvoie l'identifiant du message chez le fournisseur."""

    @abstractmethod
    def send_buttons(
        self, to: str, body: str, buttons: list[Button],
        image_id: str | None = None, footer: str = "",
    ) -> str | None:
        """Message avec boutons de réponse, et éventuellement une image (déposée) en tête."""

    @abstractmethod
    def send_link_button(
        self, to: str, body: str, button_text: str, url: str,
        image_id: str | None = None, footer: str = "",
    ) -> str | None:
        """Message avec un bouton qui ouvre une page web (ex. « Acheter sur BelivaY »)."""

    @abstractmethod
    def send_image(self, to: str, media_id: str, caption: str = "") -> str | None:
        """Image seule avec légende (affiche publicitaire)."""

    @abstractmethod
    def upload_media(self, content: bytes, mime_type: str, filename: str) -> str:
        """Dépose une image chez le fournisseur ; renvoie son identifiant."""

    @abstractmethod
    def send_list(
        self, to: str, body: str, button_label: str, sections: list[ListSection],
        header: str = "", footer: str = "",
    ) -> str | None:
        """Message avec une liste déroulante de choix."""

    @abstractmethod
    def send_template(
        self, to: str, name: str, language: str,
        body_params: list[str] = (), button_payloads: list[str] = (),
    ) -> str | None:
        """
        Message « modèle » validé par le fournisseur : seul type autorisé pour
        écrire le premier (ex. prévenir un livreur). `button_payloads` : un par
        bouton de réponse rapide, dans l'ordre du modèle.
        """

    @abstractmethod
    def send_location(self, to: str, latitude: float, longitude: float, name: str = "", address: str = "") -> str | None:
        """Épingle GPS qui s'ouvre dans Google Maps / Plans."""

    def create_template(self, definition: dict) -> dict:
        """Soumet un modèle au fournisseur pour validation. Facultatif."""
        raise ProviderError(f"Le fournisseur {self.name} ne gère pas les modèles.")

    def list_templates(self, name: str = "") -> list[dict]:
        """Modèles connus du fournisseur, avec leur statut de validation. Facultatif."""
        raise ProviderError(f"Le fournisseur {self.name} ne gère pas les modèles.")

    def mark_as_read(self, message_id: str) -> None:
        """Affiche les coches bleues chez le client. Facultatif."""

    def parse_failures(self, payload: dict) -> list[tuple[str, str]]:
        """Envois refusés après coup, signalés par webhook : [(id du message, motif)]. Facultatif."""
        return []
