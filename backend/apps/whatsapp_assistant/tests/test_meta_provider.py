# backend/apps/whatsapp_assistant/tests/test_meta_provider.py
# Les limites de Meta sont appliquées avant l'envoi : un message hors limites
# serait refusé en entier.

import pytest
from unittest.mock import MagicMock, patch

from apps.whatsapp_assistant.conf import WhatsAppConfig
from apps.whatsapp_assistant.providers import Button, ListRow, ListSection
from apps.whatsapp_assistant.providers.meta_cloud import MetaCloudProvider

CONFIG = WhatsAppConfig(
    enabled=True, provider="meta", verify_token="v", app_secret="s", access_token="token",
    phone_number_id="123", graph_api_version="v23.0", assistant_name="BelivaY",
    support_phone="", support_email="", poster_cooldown_minutes=60,
)
POST_PATH = "apps.whatsapp_assistant.providers.meta_cloud.requests.post"


def _sent_payload(send):
    response = MagicMock(status_code=200)
    response.json.return_value = {"messages": [{"id": "wamid.X"}]}
    with patch("apps.whatsapp_assistant.providers.meta_cloud.requests.post", return_value=response) as post:
        assert send(MetaCloudProvider(CONFIG)) == "wamid.X"
    return post.call_args.kwargs["json"]["interactive"]


def test_liste_limitee_a_10_lignes_et_titres_raccourcis():
    rows = [ListRow(f"r{i}", f"Un très long nom de produit numéro {i}", "d" * 100) for i in range(14)]

    interactive = _sent_payload(lambda p: p.send_list("2376", "Choisissez", "Voir les articles", [ListSection("Articles", rows)]))

    sent_rows = interactive["action"]["sections"][0]["rows"]
    assert len(sent_rows) == 10
    assert all(len(row["title"]) <= 24 and len(row["description"]) <= 72 for row in sent_rows)
    assert sent_rows[0]["title"].endswith("…")


def test_boutons_limites_a_3_avec_image_en_tete():
    buttons = [Button(f"b{i}", "Un libellé beaucoup trop long") for i in range(5)]

    interactive = _sent_payload(lambda p: p.send_buttons("2376", "Fiche", buttons, image_id="media-42"))

    assert len(interactive["action"]["buttons"]) == 3
    assert all(len(b["reply"]["title"]) <= 20 for b in interactive["action"]["buttons"])
    assert interactive["header"] == {"type": "image", "image": {"id": "media-42"}}


def test_bouton_lien_acheter_sur_belivay():
    interactive = _sent_payload(lambda p: p.send_link_button(
        "2376", "*Robe wax*", "Acheter sur BelivaY", "https://belivay.com/product/robe", image_id="media-7",
    ))

    assert interactive["type"] == "cta_url"
    assert interactive["action"] == {"name": "cta_url", "parameters": {
        "display_text": "Acheter sur BelivaY", "url": "https://belivay.com/product/robe",
    }}
    assert interactive["header"] == {"type": "image", "image": {"id": "media-7"}}


def test_depot_d_image_puis_envoi_de_l_affiche():
    uploaded = MagicMock(status_code=200)
    uploaded.json.return_value = {"id": "media-99"}
    sent = MagicMock(status_code=200)
    sent.json.return_value = {"messages": [{"id": "wamid.P"}]}

    with patch(POST_PATH, side_effect=[uploaded, sent]) as post:
        provider = MetaCloudProvider(CONFIG)
        media_id = provider.upload_media(b"jpeg", "image/jpeg", "affiche.jpg")
        provider.send_image("2376", media_id, "Promo de la semaine")

    upload_call, send_call = post.call_args_list
    assert upload_call.args[0].endswith("/123/media")
    assert upload_call.kwargs["data"] == {"messaging_product": "whatsapp", "type": "image/jpeg"}
    assert upload_call.kwargs["files"]["file"][0] == "affiche.jpg"
    assert send_call.kwargs["json"]["image"] == {"id": "media-99", "caption": "Promo de la semaine"}

def test_une_variable_vide_ne_remplace_pas_un_defaut(monkeypatch, settings):
    """
    Le deploiement genere le .env.prod depuis les variables GitHub : une
    variable non renseignee y ecrit une ligne vide. Sans cette regle, elle
    ecraserait le defaut — l'assistant se retrouverait sans nom, sans adresse
    de site, et donc sans bouton d'achat.
    """
    from apps.whatsapp_assistant.conf import get_config

    for nom in ("WHATSAPP_ASSISTANT_NAME", "WHATSAPP_SITE_URL", "WHATSAPP_CATALOG_API_URL",
                "WHATSAPP_COURIER_APP_URL", "WHATSAPP_VENDOR_APP_URL", "WHATSAPP_RELAY_APP_URL",
                "WHATSAPP_SUPPORT_PHONE", "WHATSAPP_HUMAN_HANDOVER_HOURS"):
        monkeypatch.setenv(nom, "")
        monkeypatch.delattr(settings, nom, raising=False)

    config = get_config()
    assert config.assistant_name == "BelivaY"
    assert config.site_url == "https://belivay.com"
    assert config.courier_app_url.startswith("https://")
    assert config.vendor_app_url.startswith("https://")
    assert config.relay_app_url.startswith("https://")
    assert config.support_phone
    assert config.human_handover_hours == 6


def test_le_deploiement_transporte_bien_les_variables_whatsapp():
    """
    Sans ces variables dans GitHub Actions, l'assistant est muet en production :
    WHATSAPP_ASSISTANT_ENABLED absent vaut 0, et le webhook repond 404.
    """
    import pathlib

    # Le conteneur ne monte que backend/ : on remonte jusqu'a trouver .github,
    # et on passe le test s'il n'est pas la (l'integration continue, elle, a
    # le depot complet).
    deploiement = None
    for parent in pathlib.Path(__file__).resolve().parents:
        candidat = parent / ".github" / "workflows" / "deploy.yml"
        if candidat.exists():
            deploiement = candidat
            break
    if deploiement is None:                         # pragma: no cover
        pytest.skip("depot complet absent de cette copie (conteneur)")

    contenu = deploiement.read_text(encoding="utf-8")
    for nom in ("WHATSAPP_ASSISTANT_ENABLED", "WHATSAPP_VERIFY_TOKEN", "WHATSAPP_APP_SECRET",
                "WHATSAPP_ACCESS_TOKEN", "WHATSAPP_PHONE_NUMBER_ID",
                "WHATSAPP_BUSINESS_ACCOUNT_ID"):
        assert f"{nom}=" in contenu, f"{nom} manque dans deploy.yml : l'assistant serait muet en ligne."
