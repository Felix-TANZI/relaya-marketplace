# backend/apps/orders/views.py
# Vues pour la gestion des commandes.

from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.views import APIView
from drf_spectacular.utils import extend_schema
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.db.models import Q

from .models import (
    Order, OrderItem, Dispute, DisputeMessage, DisputeEvidenceRequest,
    OrderHistory, PlatformSettings, Return,
)
from .serializers import (
    OrderCreateSerializer,
    OrderDetailSerializer,
    DisputeSerializer,
    DisputeCreateSerializer,
    DisputeMessageSerializer,
    DisputeMessageCreateSerializer,
    DisputeEvidenceRequestSerializer,
    ReturnSerializer,
    ReturnCreateSerializer,
)
from .evidence import create_evidence
from apps.shipping.models import Shipment, ShipmentEvent
from apps.shipping.serializers import ShipmentSerializer
from apps.accounts.models import UserNotification


def _phone_variants(phone):
    raw = (phone or "").strip()
    digits = "".join(ch for ch in raw if ch.isdigit())
    variants = {raw, digits}
    if digits:
        variants.add(f"+{digits}")
        if digits.startswith("237"):
            variants.add(digits[3:])
            variants.add(f"+237{digits[3:]}")
        elif len(digits) == 9:
            variants.add(f"237{digits}")
            variants.add(f"+237{digits}")
    return {variant for variant in variants if variant}


def _user_phone_values(user):
    phones = []
    profile = getattr(user, "profile", None)
    if profile and profile.phone:
        phones.append(profile.phone)
    courier_profile = getattr(user, "courier_profile", None)
    if courier_profile and courier_profile.phone:
        phones.append(courier_profile.phone)
    return phones


def user_order_visibility_q(user):
    query = Q(user=user)
    phone_variants = set()
    for phone in _user_phone_values(user):
        phone_variants.update(_phone_variants(phone))
    if phone_variants:
        query |= Q(customer_phone__in=phone_variants)
    email = (getattr(user, "email", "") or "").strip()
    if email:
        query |= Q(customer_email__iexact=email)
    return query


def get_user_order_or_404(request, id):
    return get_object_or_404(
        Order.objects.filter(user_order_visibility_q(request.user)).prefetch_related("items"),
        id=id,
    )


@extend_schema(
    tags=["Orders"],
    summary="Créer une commande (checkout)",
    request=OrderCreateSerializer,
    responses={201: OrderDetailSerializer},
)
class OrderCreateView(generics.CreateAPIView):
    serializer_class = OrderCreateSerializer
    permission_classes = [IsAuthenticated]  # Exiger authentification

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)

        order = serializer.save()

        # ── Lot 12 (éclatement du panier en N commandes mono-vendeur) a été
        # RETIRÉ de ce chemin d'appel. Il datait d'avant la règle mère "un
        # colis par vendeur et par commande" (Regles_Systeme_DEV v2.0 §1) :
        # OrderCreateSerializer.create(), juste au-dessus, crée déjà un
        # Shipment par vendeur SUR CETTE MÊME commande. Appeler en plus
        # apps.payments.bridge.checkout.checkout() ici arrachait les
        # OrderItem des vendeurs 2..N vers de NOUVELLES commandes — laissant
        # les Shipment déjà créés orphelins de leurs articles. L'erreur était
        # avalée par un except large et ne s'est jamais manifestée en
        # pratique, mais restait une bombe à retardement à chaque évolution
        # du modèle Shipment. Le module apps.payments.bridge.checkout reste
        # intact (et testé isolément) pour une éventuelle reprise future,
        # une fois réconcilié avec le modèle multi-colis.
        orders = [order]

        # Le module financier, sans eclatement de la commande.
        # Sans cet appel, aucune intention n'existe : l'acheteur ne peut
        # pas payer, et aucun partenaire n'est jamais regle.
        payment_intent = None
        try:
            from apps.payments.bridge.checkout_v2 import (
                CheckoutError, prepare_payment,
            )

            payment_intent = prepare_payment(
                order,
                payer_msisdn=(order.customer_phone or "").replace(" ", ""),
                payer_operator="",
                idempotency_key=f"order-{order.pk}",
            )
        except CheckoutError as exc:
            import logging
            logging.getLogger("apps.orders").error(
                "Preparation du paiement impossible pour la commande #%s : %s",
                order.pk, exc,
            )
        except Exception:
            import logging
            logging.getLogger("apps.orders").exception(
                "Erreur inattendue a la preparation du paiement, commande #%s.",
                order.pk,
            )

        if request.user.is_authenticated:
            UserNotification.objects.create(
                user=request.user,
                title=f"Commande #{order.id} creee",
                message="Votre commande a bien ete enregistree et attend le paiement.",
                notification_type=UserNotification.NotificationType.ORDER,
                action_url=f"/orders/{order.id}",
            )

        out = OrderDetailSerializer(order)
        donnees = dict(out.data)
        if len(orders) > 1:
            donnees["split_orders"] = [
                OrderDetailSerializer(o).data for o in orders
            ]
        if payment_intent is not None:
            donnees["payment_intent"] = {
                "reference": payment_intent.reference,
                "amount_xaf": payment_intent.amount_xaf,
                "status": payment_intent.status,
            }
        return Response(donnees, status=status.HTTP_201_CREATED)


@extend_schema(tags=["Orders"], summary="Détails commande")
class OrderDetailView(generics.RetrieveAPIView):
    serializer_class = OrderDetailSerializer
    lookup_field = "id"
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Order.objects.filter(user_order_visibility_q(self.request.user)).prefetch_related("items").distinct()


@extend_schema(tags=["Orders"], summary="Suivi de livraison d'une commande")
class OrderTrackingView(APIView):
    permission_classes = [IsAuthenticated]
    serializer_class = OrderDetailSerializer

    def get(self, request, id):
        order = get_user_order_or_404(request, id)
        shipments = list(order.shipments.all().order_by('-updated_at'))
        if not shipments:
            return Response({"detail": "No shipment found for this order"}, status=status.HTTP_404_NOT_FOUND)

        # Un colis par vendeur (regle mere) : une commande multi-vendeurs a
        # plusieurs shipments. Le contrat API historique (un seul objet) est
        # conserve pour ne pas casser le suivi acheteur existant — on expose
        # le colis le plus actif en principal, et les autres en complement
        # pour une UI multi-colis a construire plus tard.
        primary = shipments[0]
        data = ShipmentSerializer(primary, context={"request": request}).data
        data["colis_count"] = len(shipments)
        if len(shipments) > 1:
            data["other_shipments"] = ShipmentSerializer(
                shipments[1:], many=True, context={"request": request},
            ).data
        return Response(data)


@extend_schema(
    tags=["Orders"],
    summary="Mes commandes",
    description="Liste des commandes de l'utilisateur connecté"
)
class MyOrdersView(generics.ListAPIView):
    serializer_class = OrderDetailSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return (
            Order.objects.filter(user_order_visibility_q(self.request.user))
            .prefetch_related("items")
            .distinct()
            .order_by("-created_at")
        )

    def get_serializer_context(self):
        return {**super().get_serializer_context(), "request": self.request}


CANCEL_REASON_CHOICES = {
    "CHEAPER_ELSEWHERE": "Trouvé moins cher ailleurs",
    "CHANGED_MIND": "Changement d'avis",
    "TOO_SLOW": "Délai trop long",
    "ORDER_MISTAKE": "Erreur de commande",
    "PAYMENT_ISSUE": "Problème de paiement",
    "OTHER": "Autre",
}


@extend_schema(tags=["Orders"], summary="Annuler une commande client")
class CancelOrderView(APIView):
    """
    Annulation gratuite — Addendum Décisions v1.0 §5.1 : possible uniquement
    tant qu'AUCUN colis de la commande n'a été ramassé chez le vendeur.
    Passé ce point, la commande suit le parcours de retour (§2), pas
    l'annulation. Un flux de rétention (raison -> confirmation) est piloté
    côté frontend ; ce endpoint n'exige la raison que pour traçabilité.
    """

    permission_classes = [IsAuthenticated]
    serializer_class = OrderDetailSerializer

    def post(self, request, id):
        order = get_user_order_or_404(request, id)
        closed_statuses = [
            Order.FulfillmentStatus.DELIVERED,
            Order.FulfillmentStatus.BUYER_CONFIRMED,
            Order.FulfillmentStatus.AUTO_CONFIRMED,
            Order.FulfillmentStatus.RELEASED_TO_VENDOR,
            Order.FulfillmentStatus.CANCELLED,
            Order.FulfillmentStatus.REFUNDED,
        ]
        if order.fulfillment_status in closed_statuses:
            return Response(
                {"detail": "Cette commande ne peut plus etre annulee."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        shipments = list(order.shipments.all())
        already_picked_up = [
            s for s in shipments
            if s.status not in (Shipment.Status.CREATED, Shipment.Status.ASSIGNED)
        ]
        if already_picked_up:
            return Response(
                {"detail": "Au moins un colis a déjà été ramassé — cette commande ne peut plus être annulée gratuitement. Utilisez le parcours de retour après réception."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        reason_code = str(request.data.get("reason") or "OTHER").upper()
        reason_label = CANCEL_REASON_CHOICES.get(reason_code, CANCEL_REASON_CHOICES["OTHER"])

        old_status = order.fulfillment_status
        order.cancel()

        indemnified_couriers = []
        for shipment in shipments:
            if shipment.status == Shipment.Status.ASSIGNED and shipment.courier_id:
                self._indemnify_courier(shipment, request.user)
                indemnified_couriers.append(shipment.courier_id)
            shipment.status = Shipment.Status.CANCELLED
            shipment.save(update_fields=["status", "updated_at"])
            ShipmentEvent.objects.create(
                shipment=shipment,
                status=Shipment.Status.CANCELLED,
                message=f"Commande annulée par le client ({reason_label})",
                location=order.city,
            )

        OrderHistory.objects.create(
            order=order,
            user=request.user,
            action="Commande annulee par le client",
            field_name="fulfillment_status",
            old_value=old_status,
            new_value=Order.FulfillmentStatus.CANCELLED,
        )
        OrderHistory.objects.create(
            order=order,
            user=request.user,
            action="Motif d'annulation",
            field_name="cancel_reason",
            old_value="",
            new_value=reason_label,
        )

        UserNotification.objects.create(
            user=request.user,
            title=f"Commande #{order.id} annulee",
            message="Votre commande a bien ete annulee. Remboursement intégral vers votre moyen de paiement d'origine.",
            notification_type=UserNotification.NotificationType.ORDER,
            action_url="/orders",
        )

        # ── Lot 12 : annuler le séquestre correspondant ───────────────────
        try:
            from apps.payments.bridge import events_in
            events_in.order_cancelled(
                order_id=order.id,
                reason="Annulée par le client.",
                event_id=f"cancel-{order.id}",
                emitter="apps.orders.CancelOrderView",
            )
        except Exception:
            import logging
            logging.getLogger("apps.orders").exception(
                "Événement d'annulation non transmis pour #%s.", order.id,
            )

        return Response(OrderDetailSerializer(order).data)

    def _indemnify_courier(self, shipment, cancelled_by):
        """
        Indemnité course annulée (500 F, provisoire — Addendum Décisions
        v1.0 §7/§10) : le livreur avait déjà accepté la course avant que la
        commande soit annulée. Crée une demande de compensation — elle exige
        une approbation par un tiers avant tout versement (même principe que
        les remboursements : on crée, on n'exécute jamais automatiquement).
        """
        import logging

        try:
            from apps.payments.bridge.actors import partner_payee_for_user
            from apps.payments.settlements.services import create_adjustment
            from apps.payments.domain.enums import AdjustmentCategory, AdjustmentDirection
            from apps.payments.bridge import queries

            # Le montant vient de la configuration, jamais d'une constante :
            # une indemnite contractuelle doit pouvoir changer sans
            # recompiler.
            montant = queries.course_cancellation_indemnity_xaf()
            if montant <= 0:
                logging.getLogger("apps.orders").warning(
                    "Aucune indemnite configuree : course annulee non "
                    "indemnisee — livreur #%s, commande #%s.",
                    shipment.courier_id, shipment.order_id,
                )
                return

            payee = partner_payee_for_user(shipment.courier.user)
            if payee is None:
                logging.getLogger("apps.orders").warning(
                    "Indemnité course annulée non créée (pas de compte financier) — livreur #%s, commande #%s.",
                    shipment.courier_id, shipment.order_id,
                )
                return
            create_adjustment(
                payee=payee,
                direction=AdjustmentDirection.DEBIT.value,
                category=AdjustmentCategory.COMPENSATION.value,
                amount_xaf=montant,
                reason=f"Course annulée après acceptation — commande #{shipment.order_id}, colis #{shipment.id}.",
                created_by=cancelled_by,
                source_order_id=shipment.order_id,
                source_event="ORDER_CANCELLED_AFTER_COURIER_ACCEPTED",
            )
        except Exception:
            logging.getLogger("apps.orders").exception(
                "Indemnité course annulée non créée pour le livreur #%s, commande #%s.",
                shipment.courier_id, shipment.order_id,
            )


@extend_schema(tags=["Orders"], summary="Confirmer la reception d'une commande")
class ConfirmReceiptView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, id):
        order = get_user_order_or_404(request, id)
        if order.fulfillment_status not in [
            Order.FulfillmentStatus.DELIVERED,
            Order.FulfillmentStatus.BUYER_CONFIRMED,
            Order.FulfillmentStatus.AUTO_CONFIRMED,
            Order.FulfillmentStatus.RELEASED_TO_VENDOR,
        ]:
            return Response(
                {"detail": "La commande doit d'abord etre marquee livree par le livreur."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        old_status = order.fulfillment_status
        shipments = list(order.shipments.all())
        if not shipments:
            shipments = [Shipment.objects.create(order=order)]

        if order.fulfillment_status == Order.FulfillmentStatus.DELIVERED:
            submitted_code = str(request.data.get("code", "")).strip()
            # Un colis par vendeur : le code soumis doit correspondre a l'UN
            # des colis de cette commande — celui-la est confirme.
            shipment = next(
                (s for s in shipments if submitted_code and submitted_code == s.ensure_receipt_confirmation_code()),
                None,
            )
            if not shipment:
                return Response(
                    {
                        "detail": "Code de confirmation invalide. Demandez le code au livreur.",
                        "code": "INVALID_CONFIRMATION_CODE",
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )
            shipment.status = Shipment.Status.DELIVERED
            shipment.buyer_confirmed_at = timezone.now()
            shipment.save(update_fields=['status', 'buyer_confirmed_at', 'updated_at'])
            ShipmentEvent.objects.create(
                shipment=shipment,
                status=Shipment.Status.DELIVERED,
                message="Reception confirmee par le client",
                location=order.city,
            )
            # La liberation de l'escrow (evenement plus bas) reste au niveau
            # commande — elle n'intervient qu'une fois TOUS les colis
            # confirmes, jamais sur la confirmation d'un seul (multi-vendeur).
            all_confirmed = all(
                s.id == shipment.id or s.buyer_confirmed_at is not None
                for s in shipments
            )
            if all_confirmed:
                order.buyer_confirm()
        else:
            for shipment in shipments:
                shipment.status = Shipment.Status.DELIVERED
                shipment.save(update_fields=['status', 'updated_at'])
                ShipmentEvent.objects.create(
                    shipment=shipment,
                    status=Shipment.Status.DELIVERED,
                    message="Reception confirmee par le client",
                    location=order.city,
                )

        OrderHistory.objects.create(
            order=order,
            user=request.user,
            action="Reception confirmee",
            field_name="fulfillment_status",
            old_value=old_status,
            new_value=Order.FulfillmentStatus.BUYER_CONFIRMED,
        )

        UserNotification.objects.create(
            user=request.user,
            title=f"Commande #{order.id} livree",
            message="Merci d'avoir confirme la reception de votre commande.",
            notification_type=UserNotification.NotificationType.ORDER,
            action_url=f"/orders/{order.id}",
        )

        # ── Lot 12 : informer le domaine financier ────────────────────────
        # PRINCIPE P9 : le financier ne juge pas les faits métier. Il
        # consomme cet événement APRÈS les contrôles effectués ci-dessus.
        # `event_id` garantit l'idempotence : rejouer n'a aucun effet.
        try:
            from apps.payments.bridge import events_in
            events_in.buyer_confirmed_receipt(
                order_id=order.id,
                event_id=f"receipt-{order.id}",
                emitter="apps.orders.ConfirmReceiptView",
            )
        except Exception:
            import logging
            logging.getLogger("apps.orders").exception(
                "Événement de confirmation non transmis pour #%s. "
                "L'auto-confirmation prendra le relais.", order.id,
            )

        return Response(OrderDetailSerializer(order).data)


@extend_schema(
    tags=["Orders"],
    summary="Prolonger une fois la garde d'un colis en attente de retrait au relais",
)
class ExtendRelayGardeView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, id):
        from apps.shipping.models import RelayParcel

        order = get_user_order_or_404(request, id)
        parcel = RelayParcel.objects.filter(
            shipment__order=order,
            status__in=[RelayParcel.Status.RECEIVED, RelayParcel.Status.STORED],
        ).first()
        if not parcel:
            return Response({"detail": "Aucun colis en attente de retrait pour cette commande."}, status=status.HTTP_404_NOT_FOUND)
        if parcel.garde_extended:
            return Response({"detail": "La prolongation de garde a deja ete utilisee pour ce colis."}, status=status.HTTP_400_BAD_REQUEST)
        if timezone.now() >= parcel.garde_deadline:
            return Response({"detail": "Le delai de garde est deja depasse."}, status=status.HTTP_400_BAD_REQUEST)

        parcel.garde_extended = True
        parcel.save(update_fields=["garde_extended", "updated_at"])

        from apps.shipping.serializers import RelayParcelSerializer
        return Response(RelayParcelSerializer(parcel, context={"request": request}).data)


@extend_schema(tags=["Orders"], summary="Lister ou ouvrir un litige pour une commande")
class OrderDisputeListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]

    def get_order(self):
        return get_user_order_or_404(self.request, self.kwargs['id'])

    def get_queryset(self):
        return Dispute.objects.filter(order=self.get_order()).prefetch_related(
            'messages', 'evidences', 'evidence_requests__evidences',
        )

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return DisputeCreateSerializer
        return DisputeSerializer

    def create(self, request, *args, **kwargs):
        order = self.get_order()
        platform_settings = PlatformSettings.get_settings()
        dispute_window_days = max(1, getattr(platform_settings, "litige_window_days", 7))
        allowed_statuses = [
            Order.FulfillmentStatus.DELIVERED,
            Order.FulfillmentStatus.BUYER_CONFIRMED,
            Order.FulfillmentStatus.AUTO_CONFIRMED,
        ]
        if order.fulfillment_status not in allowed_statuses:
            return Response(
                {"detail": "Le litige s'ouvre seulement apres reception du colis."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        expires_at = order.updated_at + timezone.timedelta(days=dispute_window_days)
        if timezone.now() > expires_at:
            return Response(
                {"detail": f"Le delai de {dispute_window_days} jour(s) apres reception est depasse pour cette commande."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        files = request.FILES.getlist("files") or request.FILES.getlist("file")
        reason = serializer.validated_data.get("reason")
        # Litige guide par motif — Addendum Decisions v1.0 §4 : nombre de
        # preuves photo minimal exige selon le motif declare.
        min_files_by_reason = {
            "DAMAGED": 2,
            "NOT_AS_DESCRIBED": 2,
            "COUNTERFEIT": 2,
            "WRONG_ITEM": 1,
        }
        min_files = min_files_by_reason.get(reason, 0)
        if len(files) < min_files:
            return Response(
                {"files": f"Ajoutez au moins {min_files} photo(s) ou document(s) pour ce motif."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        order_item = serializer.validated_data.get("order_item")
        order_items_count = order.items.count()
        if order_item and order_item.order_id != order.id:
            return Response(
                {"order_item": "Cet article n'appartient pas a cette commande."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if order_item is None and order_items_count == 1:
            order_item = order.items.select_related("product", "product__vendor").first()
        if order_item is None:
            return Response(
                {"order_item": "Choisissez l'article precis concerne par le litige."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if Dispute.objects.filter(
            order=order,
            order_item=order_item,
            opened_by=request.user,
        ).exclude(status="CLOSED").exists():
            return Response(
                {"detail": "Un litige est deja ouvert pour cet article."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        validated_data = dict(serializer.validated_data)
        validated_data.pop("order_item", None)
        dispute = Dispute.objects.create(
            order=order,
            order_item=order_item,
            product=order_item.product,
            vendor=order_item.product.vendor,
            opened_by=request.user,
            **validated_data,
        )
        DisputeMessage.objects.create(
            dispute=dispute,
            sender=request.user,
            message=dispute.description,
            is_internal=False,
            sender_role="CLIENT",
        )
        for upload in files:
            create_evidence(
                dispute=dispute,
                user=request.user,
                upload=upload,
                uploader_role="CLIENT",
                description="Preuve fournie à l'ouverture du litige",
            )
        old_status = order.fulfillment_status
        order.open_dispute()
        OrderHistory.objects.create(
            order=order,
            user=request.user,
            action="Litige ouvert par le client",
            field_name="fulfillment_status",
            old_value=old_status,
            new_value=Order.FulfillmentStatus.DISPUTED,
        )
        UserNotification.objects.create(
            user=request.user,
            title=f"Litige ouvert sur la commande #{order.id}",
            message="Votre demande a ete transmise au support Belivay.",
            notification_type=UserNotification.NotificationType.SUPPORT,
            action_url=f"/orders/{order.id}",
        )

        # ── Lot 12 : geler le séquestre de CETTE commande ─────────────────
        # Un litige sur le colis 1 ne gèle ni le colis 2 du même vendeur,
        # ni le transport, ni les autres bénéficiaires. C'est ce que la clé
        # à quatre dimensions du séquestre rend possible.
        try:
            from apps.payments.bridge import events_in
            events_in.dispute_opened(
                order_id=dispute.order_id,
                reason=dispute.reason or "Litige ouvert par l'acheteur.",
                event_id=f"dispute-{dispute.id}",
                emitter="apps.orders.OrderDisputeListCreateView",
            )
        except Exception:
            import logging
            logging.getLogger("apps.orders").exception(
                "Événement de litige non transmis pour la commande #%s.",
                dispute.order_id,
            )

        return Response(DisputeSerializer(dispute, context={"request": request}).data, status=status.HTTP_201_CREATED)


@extend_schema(tags=["Orders"], summary="Lister/creer un retour pour une commande")
class OrderReturnListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]

    def get_order(self):
        return get_user_order_or_404(self.request, self.kwargs['id'])

    def get_queryset(self):
        return Return.objects.filter(order=self.get_order()).select_related(
            'order_item', 'vendor', 'dropoff_relay_point',
        )

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return ReturnCreateSerializer
        return ReturnSerializer

    def create(self, request, *args, **kwargs):
        order = self.get_order()
        platform_settings = PlatformSettings.get_settings()
        return_window_days = max(1, getattr(platform_settings, "litige_window_days", 7))
        allowed_statuses = [
            Order.FulfillmentStatus.DELIVERED,
            Order.FulfillmentStatus.BUYER_CONFIRMED,
            Order.FulfillmentStatus.AUTO_CONFIRMED,
        ]
        if order.fulfillment_status not in allowed_statuses:
            return Response(
                {"detail": "Le retour s'ouvre seulement apres reception du colis."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        expires_at = order.updated_at + timezone.timedelta(days=return_window_days)
        if timezone.now() > expires_at:
            return Response(
                {"detail": f"Le delai de {return_window_days} jour(s) apres reception est depasse pour cette commande."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        order_item = serializer.validated_data.get("order_item")
        if order_item.order_id != order.id:
            return Response(
                {"order_item": "Cet article n'appartient pas a cette commande."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if Return.objects.filter(
            order=order, order_item=order_item, requested_by=request.user,
        ).exclude(status__in=["REJECTED", "CLOSED_NO_REFUND"]).exists():
            return Response(
                {"detail": "Un retour est deja en cours pour cet article."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return_obj = Return.objects.create(
            order=order,
            order_item=order_item,
            requested_by=request.user,
            vendor=order_item.product.vendor,
            reason=serializer.validated_data["reason"],
            description=serializer.validated_data.get("description", ""),
            transport_mode=serializer.validated_data.get("transport_mode") or Return.TransportMode.RELAY_DROPOFF,
        )

        UserNotification.objects.create(
            user=request.user,
            title=f"Retour demande · commande #{order.id}",
            message="Votre demande de retour a ete transmise au vendeur. Si elle est validee, le renvoi est gratuit pour vous.",
            notification_type=UserNotification.NotificationType.ORDER,
            action_url=f"/orders/{order.id}",
        )
        if return_obj.vendor_id:
            UserNotification.objects.create(
                user_id=return_obj.vendor_id,
                title=f"Demande de retour · commande #{order.id}",
                message=f"Un acheteur demande a retourner un article ({return_obj.get_reason_display()}). A examiner.",
                notification_type=UserNotification.NotificationType.ORDER,
                action_url="/seller/disputes",
            )

        # Gele le sequestre de cette commande le temps du retour — meme
        # mecanique que pour un litige (P9 : le financier ne juge pas,
        # il consomme l'evenement).
        try:
            from apps.payments.bridge import events_in
            events_in.return_initiated(
                order_id=order.id,
                reason=return_obj.reason or "Retour demande par l'acheteur.",
                event_id=f"return-{return_obj.id}-initiated",
                emitter="apps.orders.OrderReturnListCreateView",
            )
        except Exception:
            import logging
            logging.getLogger("apps.orders").exception(
                "Evenement de retour non transmis pour la commande #%s.",
                order.id,
            )

        return Response(ReturnSerializer(return_obj, context={"request": request}).data, status=status.HTTP_201_CREATED)


@extend_schema(tags=["Orders"], summary="Ajouter un message a un litige client")
class DisputeMessageCreateView(generics.CreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = DisputeMessageCreateSerializer

    def create(self, request, *args, **kwargs):
        dispute = get_object_or_404(
            Dispute.objects.select_related('order'),
            id=self.kwargs['dispute_id'],
            order__user=request.user,
        )
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        message = DisputeMessage.objects.create(
            dispute=dispute,
            sender=request.user,
            message=serializer.validated_data['message'],
            is_internal=False,
            sender_role=DisputeMessage.SenderRole.CLIENT,
        )
        for upload in request.FILES.getlist('files'):
            create_evidence(
                dispute=dispute,
                user=request.user,
                upload=upload,
                uploader_role='CLIENT',
                description="Photo jointe au message de litige",
                message=message,
            )
        dispute.updated_at = timezone.now()
        dispute.save(update_fields=['updated_at'])
        return Response(
            DisputeMessageSerializer(message, context={'request': request}).data,
            status=status.HTTP_201_CREATED,
        )


class DisputeEvidenceRequestListView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = DisputeEvidenceRequestSerializer

    def get_queryset(self):
        return DisputeEvidenceRequest.objects.filter(
            dispute_id=self.kwargs["dispute_id"],
            requested_from=self.request.user,
        ).select_related("requested_from", "requested_by").prefetch_related("evidences")


class MyPendingEvidenceRequestsView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = DisputeEvidenceRequestSerializer

    def get_queryset(self):
        return DisputeEvidenceRequest.objects.filter(
            requested_from=self.request.user,
            status=DisputeEvidenceRequest.Status.PENDING,
        ).select_related("requested_from", "requested_by", "dispute").prefetch_related("evidences")


class DisputeEvidenceRequestRespondView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, request_id):
        evidence_request = get_object_or_404(
            DisputeEvidenceRequest.objects.select_related("dispute"),
            id=request_id,
            requested_from=request.user,
        )
        if evidence_request.status != DisputeEvidenceRequest.Status.PENDING:
            return Response({"detail": "Cette demande de preuve n'est plus active."}, status=status.HTTP_400_BAD_REQUEST)
        if evidence_request.due_at and timezone.now() > evidence_request.due_at:
            evidence_request.status = DisputeEvidenceRequest.Status.EXPIRED
            evidence_request.save(update_fields=["status", "updated_at"])
            return Response({"detail": "Le délai de réponse est dépassé."}, status=status.HTTP_400_BAD_REQUEST)

        files = request.FILES.getlist("files") or request.FILES.getlist("file")
        if not files:
            return Response({"files": "Ajoutez au moins une preuve."}, status=status.HTTP_400_BAD_REQUEST)
        for upload in files:
            create_evidence(
                dispute=evidence_request.dispute,
                user=request.user,
                upload=upload,
                uploader_role=evidence_request.recipient_role,
                description=request.data.get("description", "Réponse à la demande de preuve"),
                evidence_request=evidence_request,
            )
        evidence_request.status = DisputeEvidenceRequest.Status.SUBMITTED
        evidence_request.responded_at = timezone.now()
        evidence_request.save(update_fields=["status", "responded_at", "updated_at"])
        return Response(DisputeEvidenceRequestSerializer(evidence_request, context={"request": request}).data)
