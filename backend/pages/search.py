"""Full-text page search.

PostgreSQL: SearchVector/SearchRank on title + content (title weighted higher).
``search_pages_with_snippets`` adds a ``snippet`` annotation with highlighted
excerpt via ``SearchHeadline`` (Postgres) or a manual window around the first
match (sqlite / other engines).

Other engines (sqlite test runs): graceful icontains fallback so the endpoint
keeps one contract everywhere.
"""
import re

from django.db import connection
from django.db.models import Q, QuerySet


def search_pages(queryset: QuerySet, query: str) -> QuerySet:
    query = (query or "").strip()
    if not query:
        return queryset.none()

    if connection.vendor == "postgresql":
        from django.contrib.postgres.search import (
            SearchQuery,
            SearchRank,
            SearchVector,
        )

        vector = SearchVector("title", weight="A") + SearchVector(
            "content_md", weight="B"
        )
        sq = SearchQuery(query)
        return (
            queryset.annotate(rank=SearchRank(vector, sq))
            .filter(rank__gte=0.01)
            .order_by("-rank")
        )

    return queryset.filter(
        Q(title__icontains=query) | Q(content_md__icontains=query)
    ).order_by("-updated_at")


def _pg_snippet(queryset: QuerySet, query: str) -> QuerySet:
    """Postgres path: use SearchHeadline for highlighted snippets."""
    from django.contrib.postgres.search import (
        SearchHeadline,
        SearchQuery,
        SearchRank,
        SearchVector,
    )

    vector = SearchVector("title", weight="A") + SearchVector(
        "content_md", weight="B"
    )
    sq = SearchQuery(query)
    return (
        queryset.annotate(
            rank=SearchRank(vector, sq),
            snippet=SearchHeadline(
                "content_md",
                sq,
                start_sel="<mark>",
                stop_sel="</mark>",
                max_words=35,
                min_words=15,
                max_fragments=1,
            ),
        )
        .filter(rank__gte=0.01)
        .order_by("-rank")
    )


_WINDOW = 60  # chars before/after match for the fallback snippet


def _fallback_snippet(text: str, query: str) -> str:
    """Build a plain snippet with ``<mark>`` around each match."""
    low = text.lower()
    pos = low.find(query.lower())
    if pos == -1:
        return text[:_WINDOW * 2]
    start = max(0, pos - _WINDOW)
    end = min(len(text), pos + len(query) + _WINDOW)
    fragment = text[start:end]
    escaped = re.escape(query)
    fragment = re.sub(
        f"({escaped})", r"<mark>\1</mark>", fragment, flags=re.IGNORECASE
    )
    prefix = "…" if start > 0 else ""
    suffix = "…" if end < len(text) else ""
    return f"{prefix}{fragment}{suffix}"


def search_pages_with_snippets(
    queryset: QuerySet, query: str
) -> list[dict]:
    """Return a list of dicts with ``id``, ``title``, ``slug``, ``status``,
    ``updated_at``, ``workspace`` and ``snippet``."""
    query = (query or "").strip()
    if not query:
        return []

    if connection.vendor == "postgresql":
        qs = _pg_snippet(queryset, query)[:50]
        return [
            {
                "id": p.id,
                "title": p.title,
                "slug": p.slug,
                "status": p.status,
                "updated_at": p.updated_at,
                "workspace": p.workspace_id,
                "snippet": p.snippet,
            }
            for p in qs
        ]

    qs = (
        queryset.filter(
            Q(title__icontains=query) | Q(content_md__icontains=query)
        )
        .order_by("-updated_at")[:50]
    )
    return [
        {
            "id": p.id,
            "title": p.title,
            "slug": p.slug,
            "status": p.status,
            "updated_at": p.updated_at,
            "workspace": p.workspace_id,
            "snippet": _fallback_snippet(p.content_md, query),
        }
        for p in qs
    ]
