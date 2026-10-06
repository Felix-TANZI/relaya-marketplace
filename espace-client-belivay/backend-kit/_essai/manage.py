#!/usr/bin/env python
"""manage.py du projet d'essai du kit (pas pour la production)."""
import os
import sys
from pathlib import Path

ICI = Path(__file__).resolve().parent
for chemin in (ICI, ICI / "stubs", ICI.parent, ICI.parent.parent / "moteurs"):
    sys.path.insert(0, str(chemin))

if __name__ == "__main__":
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")
    from django.core.management import execute_from_command_line

    execute_from_command_line(sys.argv)
