"use client";
import { Sparkles, ShieldCheck, Database, Clock } from "lucide-react";

export type Provenance = "ai" | "cache" | "deterministic" | "rule";

export function ProvenanceBadge({ value }: { value: Provenance }) {
  const cfg =
    value === "ai"
      ? { label: "AI", icon: <Sparkles size={11} />, bg: "#DCE6D0", fg: "#16301F" }
      : value === "cache"
        ? { label: "Cached AI", icon: <Clock size={11} />, bg: "#F0F5EC", fg: "#244B35" }
        : value === "rule"
          ? { label: "Rule engine", icon: <ShieldCheck size={11} />, bg: "#EAE3F4", fg: "#4d3a74" }
          : { label: "Deterministic", icon: <Database size={11} />, bg: "#EDEBE0", fg: "#6B6F68" };
  return (
    <span
      className="inline-flex items-center gap-1 font-mono text-[10px] font-bold tracking-widest uppercase px-2 py-1 rounded-md"
      style={{ background: cfg.bg, color: cfg.fg }}
    >
      {cfg.icon} {cfg.label}
    </span>
  );
}

export function ModelDisclaimer({ className }: { className?: string }) {
  return (
    <p className={`text-[11px] leading-relaxed ${className ?? ""}`} style={{ color: "#9A9D94" }}>
      Model suggestions are advisory — a human decision is required. Confidence scores reflect how clearly the input supported the output, not guaranteed truth.
    </p>
  );
}
