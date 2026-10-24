# backend/apps/vendeur_boutique/urls.py
# Routes des domaines boutique, compte, équipe, messages, notifications et aide, montées sous /api/vendors/ par
# apps.vendeur_core.urls (sans barre finale). Les chemins fixes (« threads/support », « notifications/read-all »…)
# passent avant les chemins à identifiant.
from django.urls import path

from . import views as v

urlpatterns = [
    # Boutique
    path("shop", v.BoutiqueVue.as_view()),
    path("shop/closed-today", v.FermerAujourdhuiVue.as_view()),
    path("shop/hours", v.HorairesVue.as_view()),
    path("shop/pause", v.PauseVue.as_view()),
    path("shop/resume", v.ReprendreVue.as_view()),
    path("shop/closures", v.FermeturesVue.as_view()),
    path("shop/closures/<str:id>", v.FermetureVue.as_view()),
    path("shop/location", v.EmplacementVue.as_view()),
    path("shop/landmark", v.RepereVue.as_view()),
    path("shop/showcase", v.VitrineVue.as_view()),
    path("shop/locations", v.LieuxVue.as_view()),
    path("shop/locations/principal-code", v.CodePrincipalVue.as_view()),
    path("shop/locations/<str:id>", v.LieuVue.as_view()),
    path("shop/locations/<str:id>/point", v.PointLieuVue.as_view()),
    path("shop/locations/<str:id>/principal", v.PrincipalVue.as_view()),
    path("hubs", v.CentresVue.as_view()),
    path("shop/change-requests", v.DemandesVue.as_view()),
    path("shop/change-requests/code", v.CodeDemandeVue.as_view()),
    path("shop/change-requests/<str:id>", v.DemandeVue.as_view()),
    path("reviews", v.AvisVue.as_view()),
    path("reviews/<str:id>/private-reply", v.ReponseAvisVue.as_view()),
    # Compte
    path("me", v.ProfilVue.as_view()),
    path("me/codes", v.CodeVue.as_view()),
    path("me/email/code", v.CodeEmailVue.as_view()),
    path("me/email/confirm", v.ConfirmerEmailVue.as_view()),
    path("me/phone/codes", v.CodesNumeroVue.as_view()),
    path("me/phone", v.NumeroVue.as_view()),
    path("me/password", v.MotDePasseVue.as_view()),
    path("me/security", v.SecuriteVue.as_view()),
    path("me/security/face-id", v.FaceIdVue.as_view()),
    path("me/export", v.ExportVue.as_view()),
    path("me/corrections", v.CorrectionsVue.as_view()),
    path("devices", v.AppareilsVue.as_view()),
    path("devices/revoke-others", v.AutresAppareilsVue.as_view()),
    path("devices/<str:id>", v.AppareilVue.as_view()),
    path("account/summary", v.StatutVue.as_view()),  # « account/status » : déjà pris (vendeur_croissance, vendeur_argent)
    path("account/closure", v.ClotureVue.as_view()),
    # Équipe
    path("shop/members", v.EquipeVue.as_view()),
    path("shop/members/invitations/<str:invitation>/confirm", v.ConfirmerInvitationVue.as_view()),
    path("shop/members/invitations/<str:id>", v.AnnulerInvitationVue.as_view()),
    path("shop/members/<str:id>", v.MembreVue.as_view()),
    path("shop/members/<str:id>/code", v.CodeMembreVue.as_view()),
    path("shop/members/<str:id>/rights", v.DroitsMembreVue.as_view()),
    path("shop/members/<str:id>/suspend", v.SuspendreMembreVue.as_view()),
    path("shop/members/<str:id>/reactivate", v.ReactiverMembreVue.as_view()),
    path("shop/members/<str:id>/journal", v.JournalMembreVue.as_view()),
    path("shop/members/<str:id>/resend", v.RenvoyerInvitationVue.as_view()),
    path("shop/members/<str:id>/removal-code", v.CodeRetraitVue.as_view()),
    # Messages
    path("threads", v.FilsVue.as_view()),
    path("threads/support", v.SupportVue.as_view()),
    path("threads/<str:id>", v.FilVue.as_view()),
    path("threads/<str:id>/messages", v.EnvoyerVue.as_view()),
    path("threads/<str:id>/read", v.LireVue.as_view()),
    path("quick-replies", v.ReponsesRapidesVue.as_view()),
    # Notifications
    path("notifications", v.NotificationsVue.as_view()),
    path("notifications/counts", v.CompteursVue.as_view()),
    path("notifications/unread-count", v.NonLuesVue.as_view()),
    path("notifications/read-all", v.ToutLuVue.as_view()),
    path("notifications/settings", v.ReglagesVue.as_view()),
    path("notifications/<str:id>/read", v.LueVue.as_view()),
    # Questions des clients (AJ-A), Apprendre (AJ-B), échanges (INTERFACES.md)
    path("questions", v.QuestionsClientsVue.as_view()),
    path("questions/filter", v.FiltrerQuestionVue.as_view()),
    path("questions/templates", v.ModelesVue.as_view()),
    path("questions/templates/<str:id>", v.ModeleVue.as_view()),
    path("questions/<str:id>/answer", v.RepondreQuestionVue.as_view()),
    path("questions/<str:id>/report", v.SignalerQuestionVue.as_view()),
    path("learning/progress", v.ProgressionVue.as_view()),
    path("learning/progress/<str:fiche>", v.ProgressionFicheVue.as_view()),
    path("search", v.RechercheVue.as_view()),
    path("shop/activity", v.ActiviteBoutiqueVue.as_view()),
    path("events", v.EvenementsVue.as_view()),
    path("events/stream", v.FluxEvenementsVue.as_view()),
    # Aide
    path("help/questions", v.QuestionsVue.as_view()),
    path("help/forbidden-products", v.InterditsVue.as_view()),
    path("help/contacts", v.ContactsVue.as_view()),
    path("help/tip", v.ConseilVue.as_view()),
]
