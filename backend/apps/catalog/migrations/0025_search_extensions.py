# Extensions PostgreSQL requises par la recherche tolérante du catalogue.
#
#   pg_trgm  → similarité trigramme, rattrape les fautes de frappe
#   unaccent → « beauté » et « beaute » deviennent équivalents
#
# Sans elles, apps/catalog/search.py lève une DatabaseError et retombe sur une
# simple correspondance partielle. La création d'extension exige les droits
# superutilisateur sur la base.

from django.contrib.postgres.operations import TrigramExtension, UnaccentExtension
from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("catalog", "0024_product_variant"),
    ]

    operations = [
        TrigramExtension(),
        UnaccentExtension(),
    ]
