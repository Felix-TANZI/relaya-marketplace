# backend/apps/whatsapp_assistant/tests/test_meta_provider.py
# Les limites de Meta sont appliquées avant l'envoi : un message hors limites
# serait refusé en entier.

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
