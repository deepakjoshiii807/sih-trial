import { useState } from "react";
import { FlaskConical, X } from "lucide-react";
import { Loader2 } from "lucide-react";
import { Navigate, useLocation } from "react-router";

import { useAuth } from "@/lib/auth";
import { apiRoleToProfileRole, PROFILE_ROLE_BY_ID, type ProfileRoleId } from "@/lib/profile-roles";

interface RequireRoleProps {
  /** Which product profile this route is designed for. */
  role: ProfileRoleId;
  children: React.ReactNode;
}

/**
 * Guards a dashboard route:
 *  - auth still restoring      -> centered spinner
 *  - signed out                -> /login with the intended path preserved, so
 *                                 the user lands back here after signing in
 *  - signed in                 -> renders the workspace
 *
 * Role mismatch no longer redirects: every workspace renders on demo data
 * when the API is unreachable, so any signed-in user may explore any
 * workspace. A dismissible demo banner notes whose data is being shown.
 */
export default function RequireRole({ role, children }: RequireRoleProps) {
  const { isLoading, isAuthenticated, user } = useAuth();
  const location = useLocation();

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
    // Sign-in is required for every dashboard: the data behind these routes is
    // role-scoped on the server, so there is nothing meaningful to render
    // anonymously. Preserve the intended destination for the round trip.
    const next = `${location.pathname}${location.search}`;
    return <Navigate to={`/login?next=${encodeURIComponent(next)}`} replace />;
  }

  const profileRole = apiRoleToProfileRole(user.role);
  const mismatched = profileRole !== null && profileRole !== role;

  if (mismatched) {
    const viewing = PROFILE_ROLE_BY_ID[role];
    const yours = profileRole ? PROFILE_ROLE_BY_ID[profileRole] : null;
    return <DemoWorkspaceBanner viewingLabel={viewing.name} yourLabel={yours?.name ?? "your profile"}>{children}</DemoWorkspaceBanner>;
  }

  return <>{children}</>;
}

/**
 * Non-blocking banner shown when exploring a workspace that belongs to a
 * different profile than the signed-in user. Everything renders from demo
 * data, so exploration is safe — the banner just makes that explicit.
 */
function DemoWorkspaceBanner({
  viewingLabel,
  yourLabel,
  children,
}: {
  viewingLabel: string;
  yourLabel: string;
  children: React.ReactNode;
}) {
  const [dismissed, setDismissed] = useState(false);

  return (
    <>
      {children}
      {!dismissed && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-full border px-4 py-2 shadow-lg"
          style={{ background: "#171A18", borderColor: "#3a3f3b", color: "#F7F6F0" }}>
          <FlaskConical size={14} style={{ color: "#E8D36B" }} />
          <span className="text-xs">
            <span className="font-semibold">Demo mode</span>
            <span style={{ color: "#9A9D94" }}> — previewing the {viewingLabel} workspace with sample data</span>
            {yourLabel !== viewingLabel && <span style={{ color: "#9A9D94" }}> (you're signed in as {yourLabel})</span>}
          </span>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="rounded-full p-1 transition-colors hover:bg-white/10"
            aria-label="Dismiss demo banner"
          >
            <X size={13} />
          </button>
        </div>
      )}
    </>
  );
}
