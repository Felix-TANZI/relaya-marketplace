# backend/apps/extras/admin.py
from django.contrib import admin

from . import models as m

for _m in (
    m.Cotisation,
    m.Participation,
    m.MiseDeCote,
    m.Versement,
    m.OffreFlash,
    m.Ecole,
    m.SaisonRentree,
    m.ListeRentree,
    m.ArticleRentree,
    m.ListePapier,
    m.ArticleFamille,
    m.ModeleFamille,
    m.DestinataireFamille,
    m.PanierFamille,
    m.PaiementFamille,
    m.ModeleReprise,
    m.Troc,
):
    admin.site.register(_m)
