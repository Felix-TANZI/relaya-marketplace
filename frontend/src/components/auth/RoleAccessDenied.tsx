import { Link } from "react-router-dom";
import { Bike, Building2, MapPin, Store } from "lucide-react";

type RoleAccessDeniedProps = {
  role: "seller" | "courier" | "relay_point" | "delivery_organization";
};

export default function RoleAccessDenied({ role }: RoleAccessDeniedProps) {
  const isSeller = role === "seller";
  const isRelayPoint = role === "relay_point";
  const isDeliveryOrganization = role === "delivery_organization";
  const Icon = isSeller ? Store : isRelayPoint ? MapPin : isDeliveryOrganization ? Building2 : Bike;
  const title = isSeller
    ? "Espace vendeur non activé"
    : isRelayPoint
      ? "Espace point relais non activé"
      : isDeliveryOrganization
        ? "Espace organisation de livraison non activé"
        : "Espace livreur non activé";
  const instruction = isSeller
    ? "Pour devenir vendeur, vous devez aller dans mon profil et remplir les informations adéquates si vous ne l'avez pas encore fait."
    : isRelayPoint
      ? "Cet espace est réservé aux comptes Point relais validés par BelivaY."
      : isDeliveryOrganization
        ? "Cet espace est réservé aux entreprises de livraison partenaires validées par BelivaY."
        : "Pour devenir livreur, vous devez aller dans mon profil et remplir les informations adéquates si vous ne l'avez pas encore fait.";

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
        <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Link
            to={isRelayPoint || isDeliveryOrganization ? "/" : `/profile?panel=${isSeller ? "vendeur" : "livreur"}`}
            className="inline-flex items-center justify-center rounded-2xl bg-primary px-5 py-3 text-sm font-bold text-white shadow-lg shadow-primary/20 transition hover:bg-primary-dark"
          >
            {isRelayPoint || isDeliveryOrganization ? "Retour à l'accueil" : "Aller dans mon profil"}
          </Link>
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-2xl border border-gray-200 bg-white px-5 py-3 text-sm font-bold text-gray-700 transition hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
          >
            Retour à l'accueil
          </Link>
        </div>
      </section>
    </main>
  );
}
