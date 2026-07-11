"""Seed demo data: users, a workspace with members, and cross-linked pages.

Idempotent — safe to re-run. Gives you accounts to log in with and content to
see the editor, presence, history/diff and backlinks working end to end.

    python manage.py seed_demo
    python manage.py seed_demo --owner-email admin@example.com   # add your superuser
    python manage.py seed_demo --password "monMotDePasse"
"""
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction

from pages import services
from pages.models import Page
from workspaces.models import Workspace, WorkspaceMember

User = get_user_model()

DEFAULT_PASSWORD = "wikicollab2026"

DEMO_USERS = [
    ("alice@wikicollab.test", "Alice Lemoine", WorkspaceMember.Role.OWNER),
    ("jm@wikicollab.test", "Jean-Marc Petit", WorkspaceMember.Role.EDITOR),
    ("sophie@wikicollab.test", "Sophie Caron", WorkspaceMember.Role.EDITOR),
    ("theo@wikicollab.test", "Théo Nguyen", WorkspaceMember.Role.VIEWER),
]

GUIDE_V1 = """# Guide de déploiement Docker

Ce guide explique comment déployer WikiCollab sur un serveur Ubuntu avec Docker
Compose. Voir aussi la page Architecture et l'API Reference.

## Prérequis

Un serveur Ubuntu 22.04+, Docker Engine 24+, et un nom de domaine.

## Étape 1 — Installer Docker Engine

Installer docker.io depuis les dépôts Ubuntu.

## Étape 2 — Variables d'environnement

Copier `.env.example` vers `.env` et renseigner les secrets.
"""

GUIDE_V2 = """# Guide de déploiement Docker

Ce guide explique comment déployer WikiCollab sur un serveur Ubuntu avec Docker
Compose. Voir aussi la page Architecture et l'API Reference.

## Prérequis

Un serveur Ubuntu 22.04+, Docker Engine 24+, et un nom de domaine.

## Étape 1 — Installer Docker Engine

Ajouter le dépôt officiel Docker (plus récent que les paquets Ubuntu), puis
installer `docker-ce`. Vérifier : `docker --version` doit être >= 24.0.

## Étape 2 — Variables d'environnement

Copier `.env.example` vers `.env` et renseigner les secrets.

## Étape 3 — Lancer la stack

`docker compose up --build` démarre les quatre services.
"""

PAGES = [
    (
        "Architecture",
        "architecture",
        "# Architecture\n\nSchéma d'ensemble de WikiCollab. Le Guide de déploiement "
        "Docker décrit la mise en production. L'API Reference documente les endpoints.\n",
    ),
    (
        "API Reference",
        "api-reference",
        "# API Reference\n\nEndpoints REST et WebSocket. Voir le Guide de déploiement "
        "Docker pour le lancement local.\n",
    ),
    (
        "Onboarding",
        "onboarding",
        "# Onboarding\n\nBienvenue dans l'équipe. Commencez par lire l'Architecture.\n",
    ),
]


class Command(BaseCommand):
    help = "Seed demo users, a workspace and cross-linked pages (idempotent)."

    def add_arguments(self, parser):
        parser.add_argument("--password", default=DEFAULT_PASSWORD)
        parser.add_argument(
            "--owner-email",
            help="Existing account (e.g. your superuser) to add as workspace owner.",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        password = options["password"]

        # --- users -------------------------------------------------------
        users: dict[str, object] = {}
        for email, display_name, _role in DEMO_USERS:
            user, created = User.objects.get_or_create(
                email=email, defaults={"display_name": display_name}
            )
            if created:
                user.set_password(password)
                user.save(update_fields=["password"])
            users[email] = user
        self.stdout.write(self.style.SUCCESS(f"Users: {len(users)} ready"))

        # --- workspace + memberships ------------------------------------
        owner = users[DEMO_USERS[0][0]]
        workspace, _ = Workspace.objects.get_or_create(
            slug="documentation",
            defaults={
                "name": "Documentation",
                "permission": Workspace.Permission.PRIVATE,
                "created_by": owner,
            },
        )
        for email, _display, role in DEMO_USERS:
            WorkspaceMember.objects.get_or_create(
                workspace=workspace, user=users[email], defaults={"role": role}
            )

        owner_email = options.get("owner_email")
        if owner_email:
            extra = User.objects.filter(email__iexact=owner_email).first()
            if extra:
                WorkspaceMember.objects.get_or_create(
                    workspace=workspace,
                    user=extra,
                    defaults={"role": WorkspaceMember.Role.OWNER},
                )
                self.stdout.write(self.style.SUCCESS(f"Added {extra.email} as owner"))
            else:
                self.stdout.write(
                    self.style.WARNING(f"No account found for {owner_email}")
                )

        # --- pages -------------------------------------------------------
        guide, created = Page.objects.get_or_create(
            workspace=workspace,
            slug="guide-docker",
            defaults={
                "title": "Guide de déploiement Docker",
                "content_md": GUIDE_V1,
                "status": Page.Status.PUBLISHED,
                "author": owner,
            },
        )
        if created:
            services.snapshot(guide, owner)  # v1
            guide.content_md = GUIDE_V2
            guide.save(update_fields=["content_md"])
            services.snapshot(guide, users[DEMO_USERS[1][0]])  # v2 → diff/restore demo

        created_pages = [guide]
        for title, slug, content in PAGES:
            page, was_created = Page.objects.get_or_create(
                workspace=workspace,
                slug=slug,
                defaults={
                    "title": title,
                    "content_md": content,
                    "status": Page.Status.PUBLISHED,
                    "author": owner,
                },
            )
            if was_created:
                services.snapshot(page, owner)
            created_pages.append(page)

        # Rebuild cross-links now that every page exists.
        for page in created_pages:
            services.detect_links(page)

        self.stdout.write(
            self.style.SUCCESS(
                f"Workspace '{workspace.slug}' with {len(created_pages)} pages ready"
            )
        )
        self.stdout.write("")
        self.stdout.write(self.style.MIGRATE_HEADING("Comptes de démonstration :"))
        for email, _display, role in DEMO_USERS:
            self.stdout.write(f"  {email}  /  {password}   ({role})")
        self.stdout.write("")
        self.stdout.write("Connectez-vous sur le front avec l'un de ces comptes.")
