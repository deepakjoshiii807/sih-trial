import { useEffect } from "react";

/**
 * Global keyboard shortcuts for dashboards.
 *
 *   V     — verify/shortlist current item (dispatches custom event)
 *   ←  →  — navigate between nav items (dispatches custom event)
 *   /     — focus search input
 *   Esc   — close modals / clear search
 */
export default function KeyboardShortcuts() {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Ignore when typing in an input/textarea
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      if (e.key === "v" || e.key === "V") {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("kb:verify"));
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("kb:nav", { detail: "next" }));
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("kb:nav", { detail: "prev" }));
      } else if (e.key === "/") {
        e.preventDefault();
        const searchInput = document.querySelector<HTMLInputElement>(
          'input[placeholder*="Search"], input[placeholder*="search"]'
        );
        searchInput?.focus();
      } else if (e.key === "Escape") {
        window.dispatchEvent(new CustomEvent("kb:escape"));
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return null; // renders nothing
}
