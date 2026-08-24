# backend/apps/payments/api/admin/pagination.py
# Pagination des listes financieres.
#
# Le total est TOUJOURS retourne : sur un ecran financier, savoir qu'il y a
# 412 versements en attente change la lecture, meme si on n'en affiche que 25.

from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response


class FinancePagination(PageNumberPagination):
    page_size = 25
    page_size_query_param = "page_size"
    max_page_size = 200

    def get_paginated_response(self, data):
        return Response({
            "count": self.page.paginator.count,
            "page": self.page.number,
            "pages": self.page.paginator.num_pages,
            "page_size": self.get_page_size(self.request),
            "results": data,
        })