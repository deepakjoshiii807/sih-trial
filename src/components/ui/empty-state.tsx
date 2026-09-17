import { Inbox, type LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  /** Emphasized tint for the icon tile. */
  accent?: string;
}

/**
 * Guided empty state — replaces bare "nothing here" text with an illustration
 * tile, clear copy, and (optionally) a next-action button so empty sections
 * always tell the user what to do. The icon tile carries `.empty-state-tile`
 * so dark mode can re-tint the inline accent (see index.css).
 */
export default function EmptyState({ icon: Icon = Inbox, title, description, action, accent = "#244B35" }: EmptyStateProps) {
  return (
    <div
      role="status"
      className="flex flex-col items-center justify-center rounded-[18px] border border-[#E6E3D7] bg-[#FAFAF7] p-8 text-center"
    >
      <div
        className="empty-state-tile flex h-14 w-14 items-center justify-center rounded-2xl"
        style={{ background: `${accent}1A`, color: accent }}
      >
        <Icon size={26} strokeWidth={1.7} />
      </div>
      <h3 className="mt-4 text-[15px] font-semibold tracking-tight" style={{ color: "#171A18" }}>
        {title}
      </h3>
      {description && (
        <p className="mt-1.5 max-w-sm text-[13px] leading-relaxed" style={{ color: "#6B6F68" }}>
          {description}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
