# Serveur d'essai du kit (PAS pour la production, PAS à copier chez relaya) : imitation minimale des routes EXISTANTES
# de relaya-marketplace que le site appelle (commit 9546ffe : accounts, catalog, orders, shipping, contact), avec
# leurs chemins (barre finale) et les champs que site/src/api/adaptateurs.ts lit. Chez relaya, ces routes existent
# déjà : seules les routes du kit (apps.client_core.urls_api) sont à installer.
from decimal import Decimal
from math import asin, cos, radians, sin, sqrt

from django.contrib.auth import authenticate, get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.db.models import Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken

from apps.client_core import pont

from .models import ContactMessage, FicheProduit, ProductReview, UserNotification, UserSession

User = get_user_model()


def _iso(d) -> str | None:
    return d.isoformat() if d else None


# ── Comptes (relaya : apps/accounts) ────────────────────────────────────────────────────────────────────


def utilisateur(u) -> dict:
    """UserSerializer de relaya (champs lus par versClient)."""
    from apps.client_accounts.services import numero_verifie, profil

    p = profil(u)
    photo = getattr(p, "photo", None) or None
    return {
        "id": u.pk,
        "username": u.username,
        "email": u.email,
        "first_name": u.first_name,
        "last_name": u.last_name,
        "phone": numero_verifie(u),
        "avatar_url": photo if isinstance(photo, str) and photo.startswith(("http", "/")) else None,
        "has_usable_password": u.has_usable_password(),
    }


def _jetons(user, request) -> dict:
    r = RefreshToken.for_user(user)
    agent = request.headers.get("User-Agent", "")[:120]
    UserSession.objects.create(
        user=user,
        jti=r["jti"],
        device_name="Ordinateur" if "Mobile" not in agent else "Téléphone",
        browser="Chrome" if "Chrome" in agent else ("Safari" if "Safari" in agent else "Navigateur"),
        os_name="macOS" if "Mac OS" in agent else ("Android" if "Android" in agent else ""),
    )
    user.last_login = timezone.now()
    user.save(update_fields=["last_login"])
    return {"access": str(r.access_token), "refresh": str(r)}


class Inscription(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        d = request.data
        email = str(d.get("email") or "").strip().lower()
        erreurs: dict[str, list[str]] = {}
        if not email or "@" not in email:
            erreurs["email"] = ["Saisissez une adresse e-mail valide."]
        elif User.objects.filter(Q(email__iexact=email) | Q(username__iexact=email)).exists():
            erreurs["email"] = ["Un utilisateur avec cet e-mail existe déjà."]
        if d.get("password") != d.get("password2"):
            erreurs["password2"] = ["Les mots de passe ne correspondent pas."]
        else:
            try:
                validate_password(str(d.get("password") or ""))
            except ValidationError as e:
                erreurs["password"] = list(e.messages)
        if erreurs:
            return Response(erreurs, status=status.HTTP_400_BAD_REQUEST)
        u = User.objects.create_user(
            username=str(d.get("username") or email)[:150],
            email=email,
            password=d["password"],
            first_name=str(d.get("first_name") or "")[:150],
        )
        return Response({"id": u.pk, "email": u.email, "username": u.username}, status=status.HTTP_201_CREATED)


class Connexion(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        ident = str(request.data.get("username") or request.data.get("email") or "").strip()
        u = User.objects.filter(Q(username__iexact=ident) | Q(email__iexact=ident)).first()
        user = authenticate(username=u.username, password=request.data.get("password") or "") if u else None
        if user is None:
            return Response({"detail": "Identifiants invalides."}, status=status.HTTP_401_UNAUTHORIZED)
        return Response(_jetons(user, request))


class Deconnexion(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            jeton = RefreshToken(request.data.get("refresh") or "")
            UserSession.objects.filter(jti=jeton["jti"]).update(is_active=False)
            jeton.blacklist()
        except TokenError:
            pass
        return Response({"detail": "Déconnecté."})


class Moi(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(utilisateur(request.user))


class ChangerMotDePasse(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        d, u = request.data, request.user
        if not u.check_password(d.get("old_password") or ""):
            return Response({"old_password": ["Mot de passe actuel incorrect."]}, status=status.HTTP_400_BAD_REQUEST)
        if d.get("new_password") != d.get("new_password2"):
            return Response({"new_password2": ["Les mots de passe ne correspondent pas."]}, status=status.HTTP_400_BAD_REQUEST)
        try:
            validate_password(d.get("new_password") or "", u)
        except ValidationError as e:
            return Response({"new_password": list(e.messages)}, status=status.HTTP_400_BAD_REQUEST)
        u.set_password(d["new_password"])
        u.save()
        return Response({"detail": "Mot de passe modifié."})


def notification(n: UserNotification) -> dict:
    return {
        "id": n.pk,
        "title": n.title,
        "message": n.message,
        "notification_type": n.notification_type,
        "action_url": n.action_url or None,
        "is_read": n.is_read,
        "created_at": _iso(n.created_at),
    }


class Notifications(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response([notification(n) for n in UserNotification.objects.filter(user=request.user)[:100]])


class NotificationLue(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        n = get_object_or_404(UserNotification, pk=pk, user=request.user)
        n.is_read = True
        n.save(update_fields=["is_read"])
        return Response(notification(n))


class NotificationsToutesLues(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        n = UserNotification.objects.filter(user=request.user, is_read=False).update(is_read=True)
        return Response({"marked": n})


class Sessions(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = list(UserSession.objects.filter(user=request.user, is_active=True).order_by("-last_activity"))
        return Response(
            [
                {
                    "jti": s.jti,
                    "device_name": s.device_name,
                    "browser": s.browser,
                    "os_name": s.os_name,
                    "created_at": _iso(s.created_at),
                    "last_activity": _iso(s.last_activity),
                    "is_current": i == 0,
                }
                for i, s in enumerate(qs)
            ]
        )


class SessionRevoquer(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, jti):
        n = UserSession.objects.filter(user=request.user, jti=jti).update(is_active=False)
        return Response({"revoked": n}, status=status.HTTP_200_OK if n else status.HTTP_404_NOT_FOUND)


class SessionsToutesRevoquer(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        qs = UserSession.objects.filter(user=request.user, is_active=True).order_by("-last_activity")
        garder = qs.first()
        n = qs.exclude(pk=garder.pk if garder else None).update(is_active=False)
        return Response({"revoked": n})


# ── Catalogue (relaya : apps/catalog) ───────────────────────────────────────────────────────────────────


def produit(p, request) -> dict:
    """ProductSerializer de relaya (champs lus par versProduit, photosProduit)."""
    f = FicheProduit.objects.filter(product=p).first()
    try:
        stock = p.inventory.quantity
    except Exception:
        stock = None
    images = [
        {"image_url": request.build_absolute_uri(i.image.url), "is_primary": i.is_primary, "alt_text": i.alt_text}
        for i in p.images.all()
        if i.image
    ]
    return {
        "id": p.pk,
        "title": p.title,
        "slug": p.slug,
        "description": f.description if f else "",
        "price_xaf": p.price_xaf,
        "price_final": p.price_xaf,
        "compare_at_price": f.compare_at_price if f else None,
        "stock_quantity": stock,
        "rating_average": float(f.rating_average) if f and f.rating_average is not None else None,
        "reviews_count": f.reviews_count if f else 0,
        "category": {"id": f.category_slug, "name": f.category_name, "slug": f.category_slug} if f and f.category_slug else None,
        "images": images,
    }


class Produits(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        qs = pont.modele("produit").objects.filter(is_active=True).order_by("pk").prefetch_related("images")
        q = (request.query_params.get("search") or "").strip()
        if q:
            qs = qs.filter(title__icontains=q)
        try:
            taille = max(1, min(100, int(request.query_params.get("page_size") or 20)))
            page = max(1, int(request.query_params.get("page") or 1))
        except ValueError:
            taille, page = 20, 1
        total = qs.count()
        lot = qs[(page - 1) * taille : page * taille]
        suivante = request.build_absolute_uri(f"?page={page + 1}&page_size={taille}") if page * taille < total else None
        return Response({"count": total, "next": suivante, "previous": None, "results": [produit(p, request) for p in lot]})


class Produit(APIView):
    permission_classes = [AllowAny]

    def get(self, request, pk):
        p = get_object_or_404(pont.modele("produit"), pk=pk, is_active=True)
        return Response(produit(p, request))


class AvisProduit(APIView):
    permission_classes = [AllowAny]

    def get(self, request, pk):
        get_object_or_404(pont.modele("produit"), pk=pk)
        return Response(
            [
                {
                    "id": a.pk,
                    "rating": a.rating,
                    "title": a.title,
                    "comment": a.comment,
                    "created_at": _iso(a.created_at),
                    "is_verified_purchase": a.is_verified_purchase,
                }
                for a in ProductReview.objects.filter(product_id=pk)
            ]
        )


class Favoris(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = pont.modele("favori").objects.filter(user=request.user).select_related("product").order_by("-created_at")
        return Response([{"id": f.pk, "product": produit(f.product, request), "created_at": _iso(f.created_at)} for f in qs])

    def post(self, request):
        p = get_object_or_404(pont.modele("produit"), pk=request.data.get("product_id"))
        f, _ = pont.modele("favori").objects.get_or_create(user=request.user, product=p)
        return Response({"id": f.pk, "product": produit(p, request), "created_at": _iso(f.created_at)}, status=status.HTTP_201_CREATED)


class Favori(APIView):
    permission_classes = [IsAuthenticated]

    def delete(self, request, pk):
        get_object_or_404(pont.modele("favori"), pk=pk, user=request.user).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


# ── Commandes (relaya : apps/orders) ────────────────────────────────────────────────────────────────────


def commande(o, user) -> dict:
    """OrderDetailSerializer de relaya, plus « espace_client » : la CommandeClient complète du kit
    (pickup.services.vue_commande_client), comme le propose la décision D14."""
    from apps.pickup.services import vue_commande_client

    return {
        "id": o.pk,
        "payment_status": o.payment_status,
        "fulfillment_status": o.fulfillment_status,
        "delivery_mode": "DELIVERY" if o.delivery_method == "DELIVERY" else "PICKUP",
        "relay_point_name": o.relay_point.name if o.relay_point_id else None,
        "district": o.district or None,
        "address": o.address or None,
        "authorized_pickup_name": o.authorized_pickup_name or None,
        "authorized_pickup_phone": o.authorized_pickup_phone or None,
        "subtotal_xaf": o.subtotal_xaf,
        "delivery_fee_xaf": o.delivery_fee_xaf,
        "total_xaf": o.total_xaf,
        "items": [
            {
                "id": i.pk,
                "product": i.product_id,
                "title_snapshot": i.title_snapshot,
                "price_xaf_snapshot": i.price_xaf_snapshot,
                "qty": i.qty,
                "line_total_xaf": i.line_total_xaf,
            }
            for i in o.items.all()
        ],
        "created_at": _iso(o.created_at),
        "updated_at": _iso(o.updated_at),
        "espace_client": vue_commande_client(o.pk, user),
    }


class MesCommandes(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        qs = pont.modele("commande").objects.filter(user=request.user).select_related("relay_point").prefetch_related("items")
        return Response([commande(o, request.user) for o in qs.order_by("-created_at")])


class Commande(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        o = get_object_or_404(pont.modele("commande"), pk=pk, user=request.user)
        return Response(commande(o, request.user))


class ConfirmerReception(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        o = get_object_or_404(pont.modele("commande"), pk=pk, user=request.user)
        o.fulfillment_status = "BUYER_CONFIRMED"
        o.save(update_fields=["fulfillment_status", "updated_at"])
        return Response({"id": o.pk, "fulfillment_status": o.fulfillment_status})


# ── Relais (relaya : apps/shipping) et contact ──────────────────────────────────────────────────────────


def _km(a, b) -> float:
    (la1, lo1), (la2, lo2) = [(radians(float(x)), radians(float(y))) for x, y in (a, b)]
    h = sin((la2 - la1) / 2) ** 2 + cos(la1) * cos(la2) * sin((lo2 - lo1) / 2) ** 2
    return round(2 * 6371 * asin(sqrt(h)), 1)


class RelaisProches(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        ici = None
        try:
            ici = (Decimal(request.query_params["lat"]), Decimal(request.query_params["lng"]))
        except (KeyError, ArithmeticError, ValueError):
            pass
        qs = pont.modele("relais").objects.filter(is_active=True)
        if request.query_params.get("city"):
            qs = qs.filter(city__iexact=request.query_params["city"])
        out = []
        for r in qs.order_by("name"):
            pos = (r.latitude, r.longitude) if r.latitude is not None and r.longitude is not None else None
            out.append(
                {
                    "id": r.pk,
                    "name": r.name,
                    "address": r.address,
                    "city": r.city,
                    "opening_hours": r.opening_hours,
                    "has_space": True,
                    "distance_km": _km(ici, pos) if ici and pos else None,
                }
            )
        return Response(sorted(out, key=lambda x: x["distance_km"] if x["distance_km"] is not None else 9e9))


class Contact(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        d = request.data
        manque = {k: ["Ce champ est obligatoire."] for k in ("name", "email", "subject", "message") if not str(d.get(k) or "").strip()}
        if manque:
            return Response(manque, status=status.HTTP_400_BAD_REQUEST)
        m = ContactMessage.objects.create(
            name=d["name"][:120], email=d["email"], phone=str(d.get("phone") or "")[:30], subject=d["subject"][:200], message=d["message"]
        )
        return Response({"id": m.pk, "detail": "Message reçu."}, status=status.HTTP_201_CREATED)
