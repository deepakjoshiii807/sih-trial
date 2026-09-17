import '@vly-ai/integrations';
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/lib/auth";
import { registerServiceWorker } from "@/lib/pwa";
import { VlyToolbar } from '../vly-toolbar-readonly.tsx';
import { Component, StrictMode, type ReactNode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router";
import "./index.css";

import AuthPage from "./pages/Auth.tsx";
import LoginPage from "./pages/Login.tsx";
import PrivacyPage from "./pages/Privacy.tsx";
import TermsPage from "./pages/Terms.tsx";
import RequireRole from "./components/RequireRole.tsx";
import SkipLink from "./components/ui/skip-link.tsx";
import {
  LiveStudentDashboard,
  LiveFacultyDashboard,
  LiveIndustryDashboard,
  LiveInstitutionDashboard,
} from "./components/live/role-dashboards.tsx";

class ToolbarErrorBoundary extends Component<
  { children: ReactNode }, { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  render() { return this.state.hasError ? null : this.props.children; }
}

// PWA offline shell (registers on window load; skipped on insecure contexts).
registerServiceWorker();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <SkipLink />
        <Routes>
        <Route path="/" element={<AuthPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/privacy" element={<PrivacyPage />} />
        <Route path="/terms" element={<TermsPage />} />

        {/* Authenticated, role-scoped dashboards. Every dashboard reads live
            data from the Django API, so each route is gated by RequireRole,
            which preserves the intended path in /login?next=... */}
        <Route
          path="/student"
          element={
            <RequireRole role="student">
              <LiveStudentDashboard />
            </RequireRole>
          }
        />
        <Route
          path="/faculty"
          element={
            <RequireRole role="academician">
              <LiveFacultyDashboard />
            </RequireRole>
          }
        />
        <Route
          path="/academician"
          element={
            <RequireRole role="academician">
              <LiveFacultyDashboard />
            </RequireRole>
          }
        />
        <Route
          path="/industry"
          element={
            <RequireRole role="industry">
              <LiveIndustryDashboard />
            </RequireRole>
          }
        />
        <Route
          path="/institution-admin"
          element={
            <RequireRole role="institutionAdmin">
              <LiveInstitutionDashboard />
            </RequireRole>
          }
        />
        </Routes>
      </BrowserRouter>
      <ToolbarErrorBoundary>
        <VlyToolbar />
      </ToolbarErrorBoundary>
      <Toaster />
    </AuthProvider>
  </StrictMode>,
);
