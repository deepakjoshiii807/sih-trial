import '@vly-ai/integrations';
import { Toaster } from "@/components/ui/sonner";
import { AuthProvider } from "@/lib/auth";
import { registerServiceWorker } from "@/lib/pwa";
import { VlyToolbar } from '../vly-toolbar-readonly.tsx';
import { Component, StrictMode, type ReactNode } from "react";
import StudentDashboard from "./pages/StudentDashboard.tsx";
import FacultyDashboard from "./pages/FacultyDashboard.tsx";
import IndustryDashboard from "./pages/IndustryDashboard.tsx";
import InstitutionDashboard from "./pages/InstitutionDashboard.tsx";
import { createRoot } from "react-dom/client";
import { BrowserRouter, Route, Routes } from "react-router";
import "./index.css";

import AuthPage from "./pages/Auth.tsx";
import LoginPage from "./pages/Login.tsx";
import PrivacyPage from "./pages/Privacy.tsx";
import TermsPage from "./pages/Terms.tsx";
import RequireRole from "./components/RequireRole.tsx";
import { DemoFrame } from "./components/ui/demo-frame.tsx";
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

        {/* Authenticated, role-scoped dashboards (Django JWT) */}
        {/* Trial/presentation mode: signed-out visitors get the demo build of the
            dashboard (with DEMO PREVIEW banner) instead of a /login redirect. */}
        <Route
          path="/student"
          element={
            <RequireRole role="student" demo={<DemoFrame><StudentDashboard /></DemoFrame>}>
              <LiveStudentDashboard />
            </RequireRole>
          }
        />
        <Route path="/student-demo" element={<DemoFrame><StudentDashboard /></DemoFrame>} />
        <Route
          path="/faculty"
          element={
            <RequireRole role="academician" demo={<DemoFrame><FacultyDashboard /></DemoFrame>}>
              <LiveFacultyDashboard />
            </RequireRole>
          }
        />
        <Route
          path="/academician"
          element={
            <RequireRole role="academician" demo={<DemoFrame><FacultyDashboard /></DemoFrame>}>
              <LiveFacultyDashboard />
            </RequireRole>
          }
        />
        <Route
          path="/industry"
          element={
            <RequireRole role="industry" demo={<DemoFrame><IndustryDashboard /></DemoFrame>}>
              <LiveIndustryDashboard />
            </RequireRole>
          }
        />
        <Route
          path="/institution-admin"
          element={
            <RequireRole role="institutionAdmin" demo={<DemoFrame><InstitutionDashboard /></DemoFrame>}>
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
