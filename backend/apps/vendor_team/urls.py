# backend/apps/vendor_team/urls.py
#
# À monter sous le MÊME préfixe que apps.vendors (/api/vendors/), sans le masquer : voir le rapport final
# pour la ligne exacte à ajouter à backend/relaya/urls.py (fichier partagé, non modifié par cet agent).
# Chemins sans barre finale, comme le veut CONNECTEURS-VENDEUR.md.

from django.urls import path

from . import views_boutique, views_compte, views_equipe, views_session

app_name = "vendor_team"

urlpatterns = [
    # ── Session ──────────────────────────────────────────────────────────────────────────────────────
    path("auth/otp", views_session.auth_otp, name="auth-otp"),
    path("auth/verify", views_session.auth_verify, name="auth-verify"),
    path("auth/password-reset", views_session.auth_password_reset_request, name="auth-password-reset"),
    path("shops", views_session.shops_open, name="shops-open"),
    path("shops/<str:shop_id>/kyc", views_session.shops_kyc, name="shops-kyc"),
    path("contract/sign", views_session.contract_sign, name="contract-sign"),
    path("assisted-entry", views_session.assisted_entry_list, name="assisted-entry-list"),
    path("assisted-entry/approve", views_session.assisted_entry_approve, name="assisted-entry-approve"),
    path("assisted-entry/<int:entry_id>", views_session.assisted_entry_update, name="assisted-entry-update"),
    path("devices/current", views_session.devices_current_forget, name="devices-current"),

    # ── Compte ───────────────────────────────────────────────────────────────────────────────────────
    path("me/codes", views_compte.me_codes, name="me-codes"),
    path("me/email/code", views_compte.me_email_code, name="me-email-code"),
    path("me/email/confirm", views_compte.me_email_confirm, name="me-email-confirm"),
    path("me/phone/codes", views_compte.me_phone_codes, name="me-phone-codes"),
    path("me/phone", views_compte.me_phone_confirm, name="me-phone-confirm"),
    path("account/closure", views_compte.account_closure, name="account-closure"),

    # ── Équipe ───────────────────────────────────────────────────────────────────────────────────────
    path("shop/members", views_equipe.shop_members, name="shop-members"),
    path(
        "shop/members/invitations/<int:invitation_id>/confirm",
        views_equipe.shop_members_invitation_confirm, name="shop-member-invitation-confirm",
    ),
    path(
        "shop/members/invitations/<int:invitation_id>",
        views_equipe.shop_member_invitation_cancel, name="shop-member-invitation-cancel",
    ),
    path("shop/members/<int:member_id>/resend", views_equipe.shop_member_resend, name="shop-member-resend"),
    path("shop/members/<int:member_id>/removal-code", views_equipe.shop_member_removal_code, name="shop-member-removal-code"),
    path("shop/members/<int:member_id>/code", views_equipe.shop_member_code, name="shop-member-code"),
    path("shop/members/<int:member_id>/rights", views_equipe.shop_member_rights, name="shop-member-rights"),
    path("shop/members/<int:member_id>/suspend", views_equipe.shop_member_suspend, name="shop-member-suspend"),
    path("shop/members/<int:member_id>/reactivate", views_equipe.shop_member_reactivate, name="shop-member-reactivate"),
    path("shop/members/<int:member_id>/journal", views_equipe.shop_member_journal, name="shop-member-journal"),
    path("shop/members/<int:member_id>", views_equipe.shop_member_remove, name="shop-member-remove"),

    # ── Boutique : emplacements, demandes de modification, centres BelivaY (§8) ───────────────────────
    path("shop/locations", views_boutique.shop_locations, name="shop-locations"),
    path("shop/locations/principal-code", views_boutique.shop_locations_principal_code, name="shop-locations-principal-code"),
    path("shop/locations/<int:location_id>/point", views_boutique.shop_location_point, name="shop-location-point"),
    path("shop/locations/<int:location_id>/principal", views_boutique.shop_location_make_principal, name="shop-location-principal"),
    path("shop/locations/<int:location_id>", views_boutique.shop_location_update, name="shop-location-update"),
    path("hubs", views_boutique.hubs_list, name="hubs-list"),
    path("shop/change-requests", views_boutique.shop_change_requests, name="shop-change-requests"),
    path("shop/change-requests/code", views_boutique.shop_change_requests_code, name="shop-change-requests-code"),
    path("shop/change-requests/<int:request_id>", views_boutique.shop_change_request_cancel, name="shop-change-request-cancel"),
]
