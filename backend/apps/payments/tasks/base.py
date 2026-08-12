# backend/apps/payments/tasks/base.py
# Socle des taches planifiees.
#
# ─────────────────────────────────────────────────────────────────────────────
# UNE SEULE DEFINITION, DEUX MODES D'EXECUTION
#
# Les taches sont ecrites une fois et fonctionnent :
#   - immediatement, via `python manage.py payments_tick` planifie par cron
#   - plus tard, sous Celery, sans reecrire une ligne
#
# Celery exige deux conteneurs et une modification du point d'entree Django :
# mal configure, l'application entiere ne demarre plus. Cette abstraction
# permet de commencer sans ce risque et d'industrialiser ensuite.
# ─────────────────────────────────────────────────────────────────────────────
#
# TROIS GARANTIES
#   1. Verrou distribue — deux executions concurrentes ne se marchent pas dessus
#   2. Journalisation   — chaque execution laisse une trace consultable
#   3. Isolation        — l'echec d'une tache n'interrompt jamais les suivantes

from __future__ import annotations

import functools
import logging
import socket
import time
import traceback

from django.core.cache import cache
from django.utils import timezone

logger = logging.getLogger("apps.payments.tasks")

#: Duree de vie d'un verrou. Volontairement genereuse : mieux vaut retarder
#: une execution que d'en autoriser deux en parallele sur de l'argent.
DEFAULT_LOCK_TIMEOUT = 600

#: Registre des taches, pour l'ordonnanceur et l'administration.
REGISTRY: dict[str, dict] = {}


class TaskLocked(Exception):
    """Une execution est deja en cours."""


class DistributedLock:
    """
    Verrou base sur le cache partage.

    `cache.add` est atomique : soit on pose le verrou, soit quelqu'un d'autre
    l'a deja. C'est suffisant et sans dependance supplementaire.

    IMPORTANT : ce verrou est une protection contre le CHEVAUCHEMENT, pas un
    mecanisme de surete financiere. Celle-ci vient de l'idempotence, des
    contraintes en base et des verrous pessimistes de la couche metier.
    """

    def __init__(self, name: str, timeout: int = DEFAULT_LOCK_TIMEOUT):
        self.key = f"belivay:payments:task-lock:{name}"
        self.timeout = timeout
        self.owner = f"{socket.gethostname()}:{time.time()}"
        self.acquired = False

    def acquire(self) -> bool:
        self.acquired = bool(cache.add(self.key, self.owner, timeout=self.timeout))
        return self.acquired

    def release(self) -> None:
        if not self.acquired:
            return
        # On ne libere que SON verrou : un verrou expire puis repris par une
        # autre execution ne doit pas etre supprime par la precedente.
        if cache.get(self.key) == self.owner:
            cache.delete(self.key)
        self.acquired = False

    def __enter__(self):
        if not self.acquire():
            raise TaskLocked(f"Tache deja en cours : {self.key}")
        return self

    def __exit__(self, *exc):
        self.release()
        return False


def payments_task(name: str, *, lock: bool = True,
                  lock_timeout: int = DEFAULT_LOCK_TIMEOUT,
                  description: str = "", critical: bool = False):
    """
    Declare une tache du module financier.

    `critical` marque les taches dont l'absence d'execution a des consequences
    financieres directes : sans elles, des vendeurs ne sont jamais payes ou
    des paiements restent invisibles.
    """
    def decorateur(fonction):
        @functools.wraps(fonction)
        def enveloppe(*args, **kwargs):
            from .models import TaskRun

            execution = TaskRun.objects.create(
                task_name=name, status=TaskRun.Status.RUNNING,
                hostname=socket.gethostname()[:80],
            )
            debut = time.monotonic()
            verrou = DistributedLock(name, lock_timeout) if lock else None

            try:
                if verrou is not None and not verrou.acquire():
                    execution.finish(
                        TaskRun.Status.SKIPPED,
                        note="Une execution est deja en cours ailleurs.",
                        duration_ms=int((time.monotonic() - debut) * 1000),
                    )
                    logger.info("Tache %s ignoree : verrou deja pris.", name)
                    return {"skipped": True, "reason": "locked"}

                resultat = fonction(*args, **kwargs)
                execution.finish(
                    TaskRun.Status.SUCCESS, result=resultat or {},
                    duration_ms=int((time.monotonic() - debut) * 1000),
                )
                return resultat

            except Exception as exc:
                execution.finish(
                    TaskRun.Status.ERROR,
                    error=f"{type(exc).__name__} : {exc}",
                    traceback_text=traceback.format_exc()[:8000],
                    duration_ms=int((time.monotonic() - debut) * 1000),
                )
                logger.exception("Tache %s en echec", name)
                raise
            finally:
                if verrou is not None:
                    verrou.release()

        enveloppe.task_name = name
        enveloppe.is_critical = critical
        REGISTRY[name] = {
            "callable": enveloppe,
            "description": description,
            "critical": critical,
        }
        return enveloppe

    return decorateur


def run_task(name: str, **kwargs) -> dict:
    """Execute une tache par son nom, sans propager l'echec."""
    entree = REGISTRY.get(name)
    if entree is None:
        raise KeyError(
            f"Tache inconnue : {name}. "
            f"Disponibles : {', '.join(sorted(REGISTRY))}."
        )
    try:
        return entree["callable"](**kwargs) or {}
    except Exception as exc:
        return {"error": f"{type(exc).__name__} : {exc}"}


def list_tasks() -> list[dict]:
    return [
        {"name": nom, "description": info["description"], "critical": info["critical"]}
        for nom, info in sorted(REGISTRY.items())
    ]