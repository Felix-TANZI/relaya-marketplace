import { useEffect, useState } from "react";
import { vendorsApi } from "@/services/api/vendors";
import { authApi } from "@/services/api/auth";
import RoleAccessDenied from "@/components/auth/RoleAccessDenied";
import { useAuth } from "@/context/AuthContext";

type RoleRouteProps = {
  role: "seller" | "courier" | "relay_point" | "delivery_organization";
  children: React.ReactNode;
};

export default function RoleRoute({ role, children }: RoleRouteProps) {
  const { user } = useAuth();
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function checkRole() {
      setAllowed(null);

      if (role === "seller") {
        if (user?.is_vendor) {
          setAllowed(true);
          return;
        }

        try {
          await vendorsApi.getProfile();
          if (!cancelled) setAllowed(true);
        } catch {
          if (!cancelled) setAllowed(false);
        }
        return;
      }

      if (role === "relay_point") {
        if (user?.is_relay_point) {
          setAllowed(true);
          return;
        }

        try {
          const profile = await authApi.me();
          if (!cancelled) setAllowed(Boolean(profile.is_relay_point));
        } catch {
          if (!cancelled) setAllowed(false);
        }
        return;
      }

      if (role === "delivery_organization") {
        if (user?.is_delivery_organization) {
          setAllowed(true);
          return;
        }

        try {
          const profile = await authApi.me();
          if (!cancelled) setAllowed(Boolean(profile.is_delivery_organization));
        } catch {
          if (!cancelled) setAllowed(false);
        }
        return;
      }

      if (user?.is_courier || user?.courier_status === "approved") {
        setAllowed(true);
        return;
      }

      try {
        const profile = await authApi.getProfile();
        if (!cancelled) {
          setAllowed(Boolean(profile.is_courier || profile.courier_status === "approved"));
        }
      } catch {
        if (!cancelled) setAllowed(false);
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

  if (allowed === null) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#f8f5f1] dark:bg-gray-950">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary/30 border-t-primary" />
      </div>
    );
  }

  if (!allowed) {
    return <RoleAccessDenied role={role} />;
  }

  return <>{children}</>;
}
