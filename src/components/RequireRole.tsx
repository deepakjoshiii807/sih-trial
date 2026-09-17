import { Loader2 } from "lucide-react";
import { Navigate } from "react-router";

import { useAuth } from "@/lib/auth";
import { apiRoleToProfileRole, roleHome, type ProfileRoleId } from "@/lib/profile-roles";

interface RequireRoleProps {
  /** Which product profile may view this route. */
  role: ProfileRoleId;
  children: React.ReactNode;
  /**
   * Trial / presentation mode: what to render when a signed-out visitor hits
   * this route directly. Typically the dashboard's DemoFrame-wrapped seed-data
   * build, so manual URL entry never bounces to /login.
   */
  demo?: React.ReactNode;
}

/**
 * Guards a dashboard route:
 *  - auth still restoring      -> centered spinner
 *  - signed out                -> `demo` fallback (trial/presentation mode),
 *                                 so manually entering the URL never redirects
 *                                 to the login page
 *  - signed in, wrong profile  -> that profile's own home route
 *  - signed in, correct role   -> renders children
 */
export default function RequireRole({ role, children, demo }: RequireRoleProps) {
  const { isLoading, isAuthenticated, user } = useAuth();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F7F6F0]">
        <div className="flex flex-col items-center gap-3 text-[#6B6F68]">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="font-mono text-xs tracking-widest uppercase">Loading workspace…</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    // Trial / presentation mode: never force a visitor back to login. Show the
    // demo build of the dashboard instead (clearly labeled by its DEMO banner).
    return <>{demo ?? children}</>;
  }

  const profileRole = apiRoleToProfileRole(user.role);

  if (!profileRole) {
    return <Navigate to="/login" replace />;
  }

  if (profileRole !== role) {
    return <Navigate to={roleHome(profileRole)} replace />;
  }

  return <>{children}</>;
}