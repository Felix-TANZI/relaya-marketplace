import json
from urllib import error, request

from django.conf import settings
from rest_framework import status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from drf_spectacular.utils import extend_schema


def normalize_text(value: str) -> str:
    return value.lower()


def is_greeting(message: str) -> bool:
    normalized = normalize_text(message).strip()
    return normalized in {"salut", "bonjour", "bonsoir", "hello", "coucou", "cc", "yo"}


def build_suggestions_sentence(suggestions: list[dict]) -> str:
    if len(suggestions) == 0:
        return ""
    if len(suggestions) == 1:
        return suggestions[0]["title"]
    if len(suggestions) == 2:
        return f'{suggestions[0]["title"]} puis {suggestions[1]["title"]}'
    return f'{suggestions[0]["title"]}, puis {suggestions[1]["title"]} et {suggestions[2]["title"]}'


def score_product(product: dict, query: str) -> float:
    haystack = normalize_text(
        " ".join(
            [
                product.get("title", ""),
                product.get("description", ""),
                product.get("short_description", ""),
                product.get("category_name", ""),
            ]
        )
    )
    score = 0.0

    for word in normalize_text(query).split():
        if word in haystack:
            score += 4

    if any(keyword in normalize_text(query) for keyword in ["pas cher", "abordable", "budget", "moins cher"]):
        score += max(0, 100000 - int(product.get("price_final", 0))) / 10000

    if any(keyword in normalize_text(query) for keyword in ["premium", "qualite", "solide", "durable"]):
        score += float(product.get("rating_average") or 0) * 2

    if any(keyword in normalize_text(query) for keyword in ["promo", "promotion", "reduction"]) and int(product.get("discount") or 0) > 0:
        score += 6

    if int(product.get("stock_quantity") or 0) > 0:
        score += 2

    score += float(product.get("reviews_count") or 0) / 10
    return score


def build_mock_response(payload: dict) -> dict:
    if is_greeting(payload.get("message", "")):
        return {
            "answer": "Salut. Je peux t'aider a choisir un produit dans ce catalogue. Dis-moi ce que tu cherches, ton budget ou si tu veux plutot une promo, un produit bien note ou le meilleur rapport qualite-prix.",
            "suggestions": [],
            "followUp": [
                "Je cherche un produit pas cher",
                "Je veux le meilleur rapport qualite prix",
                "Montre-moi les meilleures promotions",
            ],
            "source": "mock",
            "providerReady": bool(settings.OPENROUTER_API_KEY),
            "model": "mock-local",
        }

    products = payload.get("products", [])
    ranked_products = sorted(
        products,
        key=lambda product: score_product(product, payload.get("message", "")),
        reverse=True,
    )[:3]

    suggestions = []
    for index, product in enumerate(ranked_products):
        reason = (
            "C'est le choix le plus pertinent selon ta demande, son prix et ses retours clients."
            if index == 0
            else "C'est une bonne alternative pour comparer avant d'acheter."
            if index == 1
            else "Je te le propose comme option supplementaire pour elargir ton choix."
        )
        suggestions.append(
            {
                "productId": product["id"],
                "title": product["title"],
                "reason": reason,
            }
        )

    if suggestions:
        answer = f"En regardant les produits visibles dans le catalogue, je te conseille surtout : {build_suggestions_sentence(suggestions)}."
    else:
        answer = "Je n'ai pas trouve de choix vraiment pertinent dans les produits visibles. Essaie d'ouvrir davantage de resultats ou d'enlever certains filtres."

    return {
        "answer": answer,
        "suggestions": suggestions,
        "followUp": [
            "Je cherche le meilleur rapport qualite prix",
            "Montre-moi les options les moins cheres",
            "Je veux un produit bien note et durable",
        ],
        "source": "mock",
        "providerReady": bool(settings.OPENROUTER_API_KEY),
        "model": "mock-local",
    }


def call_openrouter(payload: dict) -> dict:
    if not settings.OPENROUTER_API_KEY:
        raise ValueError("OPENROUTER_API_KEY is not configured")

    model = settings.OPENROUTER_MODEL
    visible_products = payload.get("products", [])[:8]
    user_message = payload.get("message", "")
    selected_category = payload.get("selectedCategoryName", "Toutes les catégories")
    filters = payload.get("filters", {})

    system_prompt = (
        "Tu es un assistant d'achat pour une marketplace. "
        "Tu dois recommander uniquement parmi les produits fournis. "
        "Ne jamais inventer de produit, de prix ou de stock. "
        "Réponds en français simple. "
        "Retourne strictement un JSON avec les clés answer, suggestions, followUp. "
        "suggestions doit être un tableau de maximum 3 objets {productId, title, reason}. "
        "followUp doit être un tableau de 3 questions courtes."
    )

    user_prompt = {
        "question": user_message,
        "selected_category": selected_category,
        "filters": filters,
        "products": visible_products,
    }

    body = json.dumps(
        {
            "model": model,
            "response_format": {"type": "json_object"},
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": json.dumps(user_prompt, ensure_ascii=False)},
            ],
            "temperature": 0.3,
        }
    ).encode("utf-8")

    req = request.Request(
        "https://openrouter.ai/api/v1/chat/completions",
        data=body,
        headers={
            "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
            "Content-Type": "application/json",
            "HTTP-Referer": settings.OPENROUTER_SITE_URL,
            "X-Title": settings.OPENROUTER_APP_NAME,
        },
        method="POST",
    )

    with request.urlopen(req, timeout=45) as response:
        response_data = json.loads(response.read().decode("utf-8"))

    content = response_data["choices"][0]["message"]["content"]
    parsed = json.loads(content)
    parsed["source"] = "openrouter"
    parsed["providerReady"] = True
    parsed["model"] = model
    return parsed


@extend_schema(
    tags=["AI"],
    summary="Assistant catalogue IA",
    description="Retourne des recommandations catalogue. Utilise OpenRouter si disponible, sinon fallback mock.",
)
class CatalogAssistantView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        payload = request.data

        if not payload.get("message"):
            return Response({"detail": "message is required"}, status=status.HTTP_400_BAD_REQUEST)

        if not isinstance(payload.get("products"), list):
            return Response({"detail": "products must be an array"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            result = call_openrouter(payload)
            return Response(result, status=status.HTTP_200_OK)
        except (ValueError, error.URLError, error.HTTPError, json.JSONDecodeError, KeyError) as exc:
            fallback = build_mock_response(payload)
            fallback["error"] = str(exc)
            return Response(fallback, status=status.HTTP_200_OK)
