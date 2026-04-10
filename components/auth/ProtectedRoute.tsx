"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import Loading from "@/components/common/Loading";
import { useAuthContext } from "@/context/AuthContext";
import { hasStoredTokens } from "@/lib/auth-storage";

export default function ProtectedRoute({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading, loggingOut } = useAuthContext();
  const hasSession = hasStoredTokens();

  useEffect(() => {
    if (loading || loggingOut || (hasSession && user)) {
      return;
    }

    const loginUrl = pathname
      ? `/login?next=${encodeURIComponent(pathname)}`
      : "/login";

    router.replace(loginUrl);
  }, [hasSession, loading, loggingOut, pathname, router, user]);

  if (loading || loggingOut) {
    return (
      <Loading
        message={loggingOut ? "Signing you out..." : "Checking your session..."}
        height={140}
        width={140}
        className="min-h-[50vh]"
      />
    );
  }

  if (!hasSession || !user) {
    return (
      <Loading
        message="Redirecting to login..."
        height={140}
        width={140}
        className="min-h-[50vh]"
      />
    );
  }

  return <>{children}</>;
}
