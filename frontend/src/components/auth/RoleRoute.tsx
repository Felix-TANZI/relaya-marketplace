import { useEffect, useRef, useState } from "react";
import { vendorsApi } from "@/services/api/vendors";
import { authApi } from "@/services/api/auth";
import RoleAccessDenied from "@/components/auth/RoleAccessDenied";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { isDedicatedPortal } from "@/config/portals";

type RoleName = "seller" | "courier" | "relay_point" | "delivery_organization";

type RoleRouteProps = {
  role: RoleName;
  children: React.ReactNode;
};

// ─────────────────────────────────────────────────────────────────────────────
// RESULTAT DE LA VERIFICATION
//
//   "checking" : appel en cours
//   "allowed"  : le compte possede le role
//   "denied"   : le serveur a repondu, le compte n'a pas le role
//   "offline"  : la verification n'a pas abouti (coupure reseau)
//
// La distinction denied / offline est essentielle : sur un portail dedie, un
// "denied" ferme la session. Confondre les deux deconnecterait un titulaire
// legitime du role sur une simple micro-coupure.
// ─────────────────────────────────────────────────────────────────────────────
type CheckState = "checking" | "allowed" | "denied" | "offline";

// Le client HTTP (services/api/client.ts) leve une Error nue, sans code
// statut. Le seul signal exploitable pour reconnaitre une panne reseau est
// le message sentinelle qu'il produit dans ce cas precis.
function estPanneReseau(error: unknown): boolean {
  return error instanceof Error && error.message.startsWith("Connexion interrompue");
}

const LIBELLE_ESPACE: Record<RoleName, string> = {
  seller: "vendeur",
  courier: "livreur",
  relay_point: "point relais",
  delivery_organization: "organisation de livraison",
};

export default function RoleRoute({ role, children }: RoleRouteProps) {
  const { user, logout } = useAuth();
  const { showToast } = useToast();
  const [etat, setEtat] = useState<CheckState>("checking");
  const sessionFermee = useRef(false);

  useEffect(() => {
    let cancelled = false;
    const resoudre = (valeur: CheckState) => {
      if (!cancelled) setEtat(valeur);
    };

    async function checkRole() {
      resoudre("checking");

      if (role === "seller") {
        if (user?.is_vendor) {
          resoudre("allowed");
          return;
        }

        try {
          await vendorsApi.getProfile();
          resoudre("allowed");
        } catch (error) {
          resoudre(estPanneReseau(error) ? "offline" : "denied");
        }
        return;
      }

      if (role === "relay_point") {
        if (user?.is_relay_point) {
          resoudre("allowed");
          return;
        }

        try {
          const profile = await authApi.me();
          resoudre(profile.is_relay_point ? "allowed" : "denied");
        } catch (error) {
          resoudre(estPanneReseau(error) ? "offline" : "denied");
        }
        return;
      }

      if (role === "delivery_organization") {
        if (user?.is_delivery_organization) {
          resoudre("allowed");
          return;
        }

        try {
          const profile = await authApi.me();
          resoudre(profile.is_delivery_organization ? "allowed" : "denied");
        } catch (error) {
          resoudre(estPanneReseau(error) ? "offline" : "denied");
        }
        return;
      }

      if (user?.is_courier || user?.courier_status === "approved") {
        resoudre("allowed");
        return;
      }

      try {
        const profile = await authApi.getProfile();
        resoudre(
          profile.is_courier || profile.courier_status === "approved" ? "allowed" : "denied",
        );
      } catch (error) {
        resoudre(estPanneReseau(error) ? "offline" : "denied");
      }
    }

    checkRole();

    return () => {
      cancelled = true;
    };
  }, [
    role,
    user?.courier_status,
    user?.is_courier,
    user?.is_delivery_organization,
    user?.is_relay_point,
    user?.is_vendor,
  ]);

  // ───────────────────────────────────────────────────────────────────────────
  // PORTAIL DEDIE : PAS DE CUL-DE-SAC
  //
  // Un portail dedie n'a qu'une seule porte d'entree : sa page d'accueil. Un
  // compte qui n'a pas le role s'y voyait refuser l'acces, mais restait
  // "connecte" — et l'ecran de refus ne proposait que des liens vers "/", qui
  // redirige vers cette meme page d'accueil. Boucle fermee : ni le
  // rechargement, ni un nouvel onglet, ni le bouton Precedent n'en sortaient.
  //
  // La session est donc fermee : l'utilisateur repart de /login, y compris
  // apres un simple rechargement. Il n'a de toute facon rien a faire ici, et
  // se croire connecte a un espace interdit n'a aucun sens.
  // ───────────────────────────────────────────────────────────────────────────
  const doitFermerSession = etat === "denied" && isDedicatedPortal;

  useEffect(() => {
    if (!doitFermerSession || sessionFermee.current) return;
    // Le garde-fou evite un second passage : `logout` change d'identite a
    // chaque rendu d'AuthProvider, donc l'effet peut etre rejoue.
    sessionFermee.current = true;
    showToast("Cet espace est réservé aux comptes " + LIBELLE_ESPACE[role] + ".", {
      description: "Connectez-vous avec un compte autorisé pour y accéder.",
      type: "error",
      duration: 8000,
    });
    logout();
  }, [doitFermerSession, role, logout, showToast]);

  // Pendant la fermeture de session, ProtectedRoute (parent) prend le relais
  // des que `user` repasse a null et redirige vers /login.
  if (etat === "checking" || doitFermerSession) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f8f5f1] dark:bg-gray-950">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary/30 border-t-primary" />
      </div>
    );
  }

  if (etat !== "allowed") {
    return <RoleAccessDenied role={role} offline={etat === "offline"} />;
  }

  return <>{children}</>;
}
