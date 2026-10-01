// frontend/src/lib/flyToCart.ts
// anim_01 — "Produit qui vole vers le panier" (voir
// 05_Propositions_animations/Ile_BelivaY_propositions_animees.html, tuile
// #dCart : "La photo décrit une courbe jusqu'à l'onglet Panier, qui rebondit,
// et le chiffre augmente.").
//
// Pure habillage visuel : appelé APRÈS que la logique métier (addItem) a déjà
// été exécutée par l'appelant. N'affecte jamais le contenu réel du panier —
// si l'animation échoue silencieusement (élément introuvable, etc.), l'ajout
// au panier a déjà eu lieu normalement.

/** Cible possible de l'animation : l'icône panier du header (toujours montée,
 *  desktop et mobile — voir app/layout/Header.tsx, `id="cart"`). */
const CART_TARGET_SELECTOR = "#cart";

function prefersReducedMotion() {
  return typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Anime un clone de `imageUrl` (ou un simple pastille orange si aucune image)
 * depuis la position de `originEl` jusqu'à l'icône panier du header, puis
 * fait rebondir cette icône à l'arrivée.
 */
export function flyToCart(originEl: Element | null, imageUrl?: string | null) {
  if (typeof document === "undefined" || !originEl) return;
  const cart = document.querySelector<HTMLElement>(CART_TARGET_SELECTOR);
  if (!cart) return;

  const fromRect = originEl.getBoundingClientRect();
  const toRect = cart.getBoundingClientRect();
  if (fromRect.width === 0 || fromRect.height === 0) return;

  // Respecte la préférence système : pas de vol, mais le rebond du panier
  // reste (court, discret) pour confirmer l'ajout.
  if (prefersReducedMotion()) {
    bumpCartIcon(cart);
    return;
  }

  const size = 56;
  const clone = document.createElement(imageUrl ? "img" : "div");
  clone.className = "belivay-fly-clone";
  if (imageUrl && clone instanceof HTMLImageElement) {
    clone.src = imageUrl;
    clone.alt = "";
  } else {
    (clone as HTMLDivElement).style.background = "linear-gradient(135deg,#ff9d4d,#f4610f)";
  }
  Object.assign(clone.style, {
    left: `${fromRect.left + fromRect.width / 2 - size / 2}px`,
    top: `${fromRect.top + fromRect.height / 2 - size / 2}px`,
    width: `${size}px`,
    height: `${size}px`,
    opacity: "1",
  });
  document.body.appendChild(clone);

  const startX = fromRect.left + fromRect.width / 2 - size / 2;
  const startY = fromRect.top + fromRect.height / 2 - size / 2;
  const endX = toRect.left + toRect.width / 2 - size / 2;
  const endY = toRect.top + toRect.height / 2 - size / 2;
  // Léger arc : point de contrôle remonté, comme une courbe lancée à la main
  // plutôt qu'une ligne droite.
  const midX = (startX + endX) / 2;
  const midY = Math.min(startY, endY) - 90;

  const animation = clone.animate(
    [
      { transform: "translate(0px, 0px) scale(1)", opacity: 1, offset: 0 },
      { transform: `translate(${midX - startX}px, ${midY - startY}px) scale(.8)`, opacity: 1, offset: 0.55 },
      { transform: `translate(${endX - startX}px, ${endY - startY}px) scale(.15)`, opacity: 0.4, offset: 1 },
    ],
    { duration: 650, easing: "cubic-bezier(.3,.1,.3,1)", fill: "forwards" },
  );

  const cleanup = () => {
    clone.remove();
    bumpCartIcon(cart);
  };
  animation.onfinish = cleanup;
  animation.oncancel = cleanup;
  // Filet de sécurité si l'API Web Animations ne déclenche pas onfinish
  // (anciens WebView Android dans le conteneur Capacitor).
  window.setTimeout(() => {
    if (document.body.contains(clone)) cleanup();
  }, 900);
}

function bumpCartIcon(cart: HTMLElement) {
  const icon = cart.querySelector("svg") ?? cart;
  icon.classList.remove("belivay-cart-bump");
  // Force un reflow pour pouvoir relancer l'animation si elle vient de jouer.
  void (icon as HTMLElement).offsetWidth;
  icon.classList.add("belivay-cart-bump");
  window.setTimeout(() => icon.classList.remove("belivay-cart-bump"), 550);

  // anim_04-like retour discret : vibration courte si le navigateur le permet
  // (Android Chrome / WebView ; iOS Safari et WKWebView n'exposent pas
  // navigator.vibrate — voir note dans le rapport sur le haptique natif).
  try {
    navigator.vibrate?.(12);
  } catch {
    // ignore
  }
}
