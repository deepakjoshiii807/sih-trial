import type { ReactNode } from "react";
import { Link } from "react-router";

import { usePageMeta } from "@/lib/use-page-meta";

/**
 * Shared layout + typography for public legal pages (Privacy, Terms).
 * Follows the dark landing theme: #0A0A0F surface, Syne headings, cream accents.
 */
export function LegalShell({
  eyebrow,
  title,
  summary,
  updated,
  children,
}: {
  eyebrow: string;
  title: string;
  summary: string;
  updated: string;
  children: ReactNode;
}) {
  usePageMeta(`${title} — Learn2Lead`, summary);

  return (
    <div className="min-h-screen bg-[#0A0A0F] text-white antialiased">
      {/* Top bar */}
      <div className="sticky top-0 z-40 border-b border-white/[0.06] bg-[#0A0A0F]/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-3xl items-center justify-between px-5 sm:px-6">
          <Link to="/" className="group flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#244B35] text-[11px] font-bold tracking-tight text-[#DCE6D0] transition-transform group-hover:scale-105">
              L2L
            </div>
            <span
              className="text-sm font-semibold tracking-tight text-[#E1E0CC]"
              style={{ fontFamily: "'Syne', sans-serif" }}
            >
              Learn2Lead
            </span>
          </Link>
          <Link
            to="/"
            className="rounded-full border border-white/15 px-4 py-1.5 text-xs font-medium text-white/70 transition-colors hover:border-white/30 hover:text-white"
          >
            ← Back to site
          </Link>
        </div>
      </div>

      <main className="mx-auto w-full max-w-3xl px-5 pb-20 pt-12 sm:px-6 sm:pt-16">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-[#9FB89A]">{eyebrow}</p>
        <h1
          className="mt-3 text-4xl font-extrabold leading-[1.02] tracking-[-0.02em] text-[#E1E0CC] sm:text-5xl"
          style={{ fontFamily: "'Syne', sans-serif" }}
        >
          {title}
        </h1>
        <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-white/55">{summary}</p>
        <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.15em] text-white/35">
          Last updated · {updated}
        </p>

        <div className="mt-10 border-t border-white/10 pt-10">{children}</div>
      </main>

      {/* Doc-to-doc footer */}
      <footer className="border-t border-white/[0.06]">
        <div className="mx-auto flex w-full max-w-3xl flex-col items-center justify-between gap-3 px-5 py-8 text-xs text-white/40 sm:flex-row sm:px-6">
          <span>© {new Date().getFullYear()} Learn2Lead. All rights reserved.</span>
          <nav className="flex items-center gap-4">
            <Link to="/privacy" className="transition-colors hover:text-white">
              Privacy Policy
            </Link>
            <span className="h-3 w-px bg-white/15" />
            <Link to="/terms" className="transition-colors hover:text-white">
              Terms of Service
            </Link>
            <span className="h-3 w-px bg-white/15" />
            <Link to="/" className="transition-colors hover:text-white">
              Home
            </Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}

/* ---- Typography primitives for policy content ---- */

export function LegalH2({ children, id }: { children: ReactNode; id?: string }) {
  return (
    <h2
      id={id}
      className="mt-12 scroll-mt-24 text-lg font-bold tracking-tight text-[#E1E0CC] first:mt-0"
      style={{ fontFamily: "'Syne', sans-serif" }}
    >
      {children}
    </h2>
  );
}

export function LegalP({ children }: { children: ReactNode }) {
  return <p className="mt-3 text-[14px] leading-[1.8] text-white/65">{children}</p>;
}

export function LegalUl({ children }: { children: ReactNode }) {
  return <ul className="mt-3 list-disc space-y-2 pl-5 text-[14px] leading-[1.7] text-white/65">{children}</ul>;
}

export function LegalLi({ children }: { children: ReactNode }) {
  return <li>{children}</li>;
}

export function LegalNote({ children }: { children: ReactNode }) {
  return (
    <div className="mt-4 rounded-2xl border border-[#244B35]/40 bg-[#12261A]/60 px-4 py-3.5 text-[13.5px] leading-relaxed text-[#C9D8C4]">
      {children}
    </div>
  );
}

export function LegalA({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} className="font-medium text-[#E1E0CC] underline decoration-white/25 underline-offset-4 transition-colors hover:decoration-white">
      {children}
    </a>
  );
}
