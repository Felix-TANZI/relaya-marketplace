# backend/apps/payments/ledger/db_guards.py
# Garde-fous PostgreSQL du registre comptable.
#
# POURQUOI CE FICHIER
#   Les gardes Python (models.save/delete) protegent le code applicatif.
#   Ils ne protegent PAS contre :
#     - une requete SQL directe en psql
#     - un UPDATE via .objects.filter(...).update(...)  qui contourne save()
#     - un bug futur qui appellerait bulk_update
#
#   Ces declencheurs ferment ces trois portes au niveau de la base.
#   C'est la defense en profondeur : deux couches independantes.
#
# CONTRAINTE DIFFEREE
#   Le controle d'equilibre est un CONSTRAINT TRIGGER DEFERRABLE INITIALLY
#   DEFERRED : il s'evalue au COMMIT, une fois toutes les lignes inserees.
#   Un trigger immediat echouerait des la premiere ligne, puisqu'une
#   transaction n'est jamais equilibree avant d'etre complete.
#
# PORTABILITE
#   Ces objets sont specifiques a PostgreSQL. La migration les installe
#   uniquement si le moteur est postgresql, pour ne pas casser une
#   execution sur SQLite (tests locaux rapides).

BALANCE_FUNCTION = """
CREATE OR REPLACE FUNCTION belivay_ledger_assert_balanced()
RETURNS TRIGGER AS $$
DECLARE
    ecart BIGINT;
    ref   TEXT;
BEGIN
    SELECT COALESCE(SUM(
        CASE WHEN direction = 'DEBIT' THEN amount_xaf ELSE -amount_xaf END
    ), 0)
    INTO ecart
    FROM payments_ledgerentry
    WHERE transaction_id = NEW.transaction_id;

    IF ecart <> 0 THEN
        SELECT reference INTO ref
        FROM payments_ledgertransaction WHERE seq = NEW.transaction_id;
        RAISE EXCEPTION
            'Transaction comptable % desequilibree : ecart de % XAF. '
            'Debits et credits doivent s''equilibrer.',
            COALESCE(ref, NEW.transaction_id::TEXT), ecart;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql;
"""

BALANCE_TRIGGER = """
CREATE CONSTRAINT TRIGGER belivay_ledger_balanced
AFTER INSERT ON payments_ledgerentry
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW
EXECUTE FUNCTION belivay_ledger_assert_balanced();
"""

IMMUTABLE_FUNCTION = """
CREATE OR REPLACE FUNCTION belivay_ledger_immutable()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION
        'Ecriture comptable immuable : % interdit sur %. '
        'Une erreur se corrige par contre-passation, jamais par modification.',
        TG_OP, TG_TABLE_NAME;
END;
$$ LANGUAGE plpgsql;
"""

IMMUTABLE_ENTRY_TRIGGER = """
CREATE TRIGGER belivay_ledgerentry_immutable
BEFORE UPDATE OR DELETE ON payments_ledgerentry
FOR EACH ROW
EXECUTE FUNCTION belivay_ledger_immutable();
"""

# La transaction autorise UNE exception : le scellement de l'empreinte
# juste apres creation (entry_hash passe de vide a sa valeur definitive).
# Tout autre UPDATE est refuse.
IMMUTABLE_TRANSACTION_FUNCTION = """
CREATE OR REPLACE FUNCTION belivay_ledgertransaction_immutable()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION
            'Transaction comptable % non supprimable. Utiliser une contre-passation.',
            OLD.reference;
    END IF;

    -- Seul le scellement initial de l'empreinte est tolere
    IF OLD.entry_hash = '' AND NEW.entry_hash <> '' THEN
        IF  NEW.seq            = OLD.seq
        AND NEW.reference      = OLD.reference
        AND NEW.kind           = OLD.kind
        AND NEW.occurred_at    = OLD.occurred_at
        AND NEW.previous_hash  = OLD.previous_hash
        THEN
            RETURN NEW;
        END IF;
    END IF;

    RAISE EXCEPTION
        'Transaction comptable % figee : modification interdite. '
        'Une erreur se corrige par contre-passation.',
        OLD.reference;
END;
$$ LANGUAGE plpgsql;
"""

IMMUTABLE_TRANSACTION_TRIGGER = """
CREATE TRIGGER belivay_ledgertransaction_immutable
BEFORE UPDATE OR DELETE ON payments_ledgertransaction
FOR EACH ROW
EXECUTE FUNCTION belivay_ledgertransaction_immutable();
"""

INSTALL = [
    BALANCE_FUNCTION,
    BALANCE_TRIGGER,
    IMMUTABLE_FUNCTION,
    IMMUTABLE_ENTRY_TRIGGER,
    IMMUTABLE_TRANSACTION_FUNCTION,
    IMMUTABLE_TRANSACTION_TRIGGER,
]

UNINSTALL = [
    "DROP TRIGGER IF EXISTS belivay_ledgertransaction_immutable ON payments_ledgertransaction;",
    "DROP TRIGGER IF EXISTS belivay_ledgerentry_immutable ON payments_ledgerentry;",
    "DROP TRIGGER IF EXISTS belivay_ledger_balanced ON payments_ledgerentry;",
    "DROP FUNCTION IF EXISTS belivay_ledgertransaction_immutable();",
    "DROP FUNCTION IF EXISTS belivay_ledger_immutable();",
    "DROP FUNCTION IF EXISTS belivay_ledger_assert_balanced();",
]


def install_guards(apps, schema_editor):
    """Installe les declencheurs. Sans effet hors PostgreSQL."""
    if schema_editor.connection.vendor != "postgresql":
        return
    with schema_editor.connection.cursor() as cursor:
        for instruction in INSTALL:
            cursor.execute(instruction)


def remove_guards(apps, schema_editor):
    """Retire les declencheurs. Sans effet hors PostgreSQL."""
    if schema_editor.connection.vendor != "postgresql":
        return
    with schema_editor.connection.cursor() as cursor:
        for instruction in UNINSTALL:
            cursor.execute(instruction)


def guards_installed(connection) -> bool:
    """Verifie que les declencheurs sont bien en place."""
    if connection.vendor != "postgresql":
        return False
    with connection.cursor() as cursor:
        cursor.execute("""
            SELECT tgname FROM pg_trigger
            WHERE tgname IN (
                'belivay_ledger_balanced',
                'belivay_ledgerentry_immutable',
                'belivay_ledgertransaction_immutable'
            )
        """)
        return len(cursor.fetchall()) == 3