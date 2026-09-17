import type { ReactNode } from "react";

export interface MobileTabItem {
  id: string;
  label: string;
  icon: ReactNode;
}

interface MobileTabBarProps {
  items: MobileTabItem[];
  active: string;
  onChange: (id: string) => void;
}

/**
 * Phone-only bottom tab bar (hidden on md+). Gives the student app a native
 * app feel on mobile while the desktop sidebar layout stays untouched.
 */
export default function MobileTabBar({ items, active, onChange }: MobileTabBarProps) {
  return (
    <nav
      aria-label="Primary"
      className="md:hidden fixed inset-x-0 bottom-0 z-40 border-t border-[#E6E3D7] bg-white/95 backdrop-blur-md"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="flex items-stretch justify-around">
        {items.map((item) => {
          const isActive = active === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onChange(item.id)}
              aria-current={isActive ? "page" : undefined}
              className={`flex flex-1 flex-col items-center gap-1 py-2.5 transition-colors ${
                isActive ? "text-[#244B35]" : "text-[#6B6F68]"
              }`}
            >
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-lg transition-colors ${
                  isActive ? "bg-[#DCE6D0]" : "bg-transparent"
                }`}
              >
                {item.icon}
              </span>
              <span className="font-mono text-[9px] font-bold tracking-wide uppercase">{item.label}</span>
              {isActive && <span className="h-0.5 w-6 rounded-full bg-[#244B35]" />}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
