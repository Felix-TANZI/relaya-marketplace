import { Link, useNavigate } from "react-router-dom";
import { Bike, Building2, MapPin, Store } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { isDedicatedPortal } from "@/config/portals";

type RoleAccessDeniedProps = {
  role: "seller" | "courier" | "relay_point" | "delivery_organization";
  /** La verification du role n'a pas abouti (reseau) — le refus n'est pas certain. */
  offline?: boolean;
};

const CLASSE_PRIMAIRE =
  "inline-flex items-center justify-center rounded-2xl bg-primary px-5 py-3 text-sm font-bold text-white shadow-lg shadow-primary/20 transition hover:bg-primary-dark";
const CLASSE_SECONDAIRE =
  "inline-flex items-center justify-center rounded-2xl border border-gray-200 bg-white px-5 py-3 text-sm font-bold text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200";

export default function RoleAccessDenied({ role, offline = false }: RoleAccessDeniedProps) {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const isSeller = role === "seller";
  const isRelayPoint = role === "relay_point";
  const isDeliveryOrganization = role === "delivery_organization";
  const Icon = isSeller ? Store : isRelayPoint ? MapPin : isDeliveryOrganization ? Building2 : Bike;

  const nomEspace = isSeller
    ? "vendeur"
    : isRelayPoint
      ? "point relais"
      : isDeliveryOrganization
        ? "organisation de livraison"
        : "livreur";

  const title = offline
    ? "Vérification impossible"
    : isSeller
      ? "Espace vendeur non activé"
      : isRelayPoint
        ? "Espace point relais non activé"
        : isDeliveryOrganization
          ? "Espace organisation de livraison non activé"
          : "Espace livreur non activé";

  const instruction = offline
    ? "Nous n'avons pas pu vérifier les droits de votre compte. Vérifiez votre connexion puis réessayez, ou reconnectez-vous."
    : isSeller
      ? "Pour devenir vendeur, vous devez aller dans mon profil et remplir les informations adéquates si vous ne l'avez pas encore fait."
      : isRelayPoint
        ? "Cet espace est réservé aux comptes Point relais validés par BelivaY."
        : isDeliveryOrganization
          ? "Cet espace est réservé aux entreprises de livraison partenaires validées par BelivaY."
          : "Pour devenir livreur, vous devez aller dans mon profil et remplir les informations adéquates si vous ne l'avez pas encore fait.";

  function seDeconnecter() {
    logout();
    navigate("/login", { replace: true });
  }

  // ───────────────────────────────────────────────────────────────────────────
  // ACTIONS — JAMAIS DE CUL-DE-SAC
  //
  // Sur un portail dedie, "/" redirige vers la page d'accueil du portail,
  // c'est-a-dire vers cet ecran meme. Y renvoyer l'utilisateur l'enfermait
  // dans une boucle dont ni le rechargement ni un nouvel onglet ne sortaient.
  // On n'y propose donc que des issues reelles : reessayer, ou se deconnecter.
  //
  // Sur le portail client, "/" est la vraie page d'accueil : le parcours
  // d'origine (devenir vendeur / livreur) reste intact.
  // ───────────────────────────────────────────────────────────────────────────
  const actions = isDedicatedPortal ? (
    <>
      {offline && (
        <button type="button" onClick={() => window.location.reload()} className={CLASSE_PRIMAIRE}>
          Réessayer
        </button>
      )}
      <button
        type="button"
        onClick={seDeconnecter}
        className={offline ? CLASSE_SECONDAIRE : CLASSE_PRIMAIRE}
      >
        Se déconnecter
      </button>
    </>
  ) : (
    <>
      {isSeller || (!isRelayPoint && !isDeliveryOrganization) ? (
        <Link to={`/profile?panel=${isSeller ? "vendeur" : "livreur"}`} className={CLASSE_PRIMAIRE}>
          Aller dans mon profil
        </Link>
      ) : null}
      <Link
        to="/"
        className={isRelayPoint || isDeliveryOrganization ? CLASSE_PRIMAIRE : CLASSE_SECONDAIRE}
      >
        Retour à l'accueil
      </Link>
    </>
  );

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f8f5f1] px-4 py-10 dark:bg-gray-950">
      <section className="w-full max-w-[560px] rounded-[24px] border border-orange-100 bg-white p-8 text-center shadow-[0_24px_70px_rgba(17,24,39,.10)] dark:border-gray-800 dark:bg-gray-900">
        <img src="/belivay-logo.png" alt="BelivaY" className="mx-auto h-14 w-auto object-contain" />
        <div className="mx-auto mt-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <Icon size={26} />
        </div>
        <h1 className="mt-5 text-2xl font-extrabold text-gray-950 dark:text-white">{title}</h1>
        <p className="mx-auto mt-3 max-w-[440px] text-sm leading-7 text-gray-600 dark:text-gray-300">
          {instruction}
        </p>
        {isDedicatedPortal && !offline && (
          <p className="mx-auto mt-2 max-w-[440px] text-xs leading-6 text-gray-500 dark:text-gray-400">
            Votre compte n'a pas le rôle {nomEspace}. Déconnectez-vous pour utiliser un autre compte.
          </p>
        )}
        <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center">{actions}</div>
      </section>
    </main>
  );
}
