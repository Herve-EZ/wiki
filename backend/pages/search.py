"""Full-text page search.

PostgreSQL: SearchVector/SearchRank on title + content (title weighted higher).
Other engines (sqlite test runs): graceful icontains fallback so the endpoint
keeps one contract everywhere.
"""
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
