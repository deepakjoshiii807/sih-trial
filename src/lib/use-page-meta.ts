import { useEffect } from "react";

/**
 * Lightweight per-page SEO helper — updates the document title plus the
 * description / Open Graph / Twitter meta tags for the current route.
 * Fallback values live in index.html for crawlers that don't execute JS.
 */
export function usePageMeta(title: string, description?: string): void {
  useEffect(() => {
    document.title = title;

    const apply = (attr: "name" | "property", key: string, content: string) => {
      const selector = attr === "name" ? `meta[name="${key}"]` : `meta[property="${key}"]`;
      let el = document.head.querySelector<HTMLMetaElement>(selector);
      if (!el) {
        el = document.createElement("meta");
        el.setAttribute(attr, key);
        document.head.appendChild(el);
      }
      el.setAttribute("content", content);
    };

    const desc =
      description ??
      "Learn2Lead helps students and young professionals in India discover courses, scholarships, internships and jobs tailored to their goals, verified skills and interests.";

    apply("name", "description", desc);
    apply("property", "og:title", title);
    apply("property", "og:description", desc);
    apply("name", "twitter:title", title);
    apply("name", "twitter:description", desc);
  }, [title, description]);
}
