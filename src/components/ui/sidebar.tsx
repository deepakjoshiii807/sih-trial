import { cn } from "@/lib/utils";
import React, { useState, createContext, useContext } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X } from "lucide-react";

interface Links {
  label: string;
  href: string;
  icon: React.JSX.Element | React.ReactNode;
}

interface SidebarContextProps {
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
  animate: boolean;
}

const SidebarContext = createContext<SidebarContextProps | undefined>(
  undefined
);

export const useSidebar = () => {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return context;
};

export const SidebarProvider = ({
  children,
  open: openProp,
  setOpen: setOpenProp,
  animate = true,
}: {
  children: React.ReactNode;
  open?: boolean;
  setOpen?: React.Dispatch<React.SetStateAction<boolean>>;
  animate?: boolean;
}) => {
  const [openState, setOpenState] = useState(false);

  const open = openProp !== undefined ? openProp : openState;
  const setOpen = setOpenProp !== undefined ? setOpenProp : setOpenState;

  return (
    <SidebarContext.Provider value={{ open, setOpen, animate }}>
      {children}
    </SidebarContext.Provider>
  );
};

export const Sidebar = ({
  children,
  open,
  setOpen,
  animate,
}: {
  children: React.ReactNode;
  open?: boolean;
  setOpen?: React.Dispatch<React.SetStateAction<boolean>>;
  animate?: boolean;
}) => {
  return (
    <SidebarProvider open={open} setOpen={setOpen} animate={animate}>
      {children}
    </SidebarProvider>
  );
};

export const SidebarBody = ({ className, children }: { className?: string; children: React.ReactNode }) => {
  return (
    <>
      <DesktopSidebar className={className}>{children}</DesktopSidebar>
      <MobileSidebar className={className}>{children}</MobileSidebar>
    </>
  );
};

export const DesktopSidebar = ({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) => {
  const { open, setOpen, animate } = useSidebar();
  return (
    <motion.div
      className={cn(
        "h-screen hidden md:flex md:flex-col w-[264px] flex-shrink-0 overflow-hidden",
        className
      )}
      animate={{
        width: animate ? (open ? "264px" : "60px") : "264px",
      }}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <div className="flex flex-col h-full overflow-y-auto overflow-x-hidden" style={{ width: open ? "264px" : "60px", padding: open ? "16px" : "16px 8px", transition: "all 0.3s ease" }}>
        {children}
      </div>
    </motion.div>
  );
};

export const MobileSidebar = ({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) => {
  const { open, setOpen } = useSidebar();
  return (
    <>
      {/* Mobile top bar — sits above the scrollable content column */}
      <div
        className={cn(
          "relative z-40 flex h-14 w-full shrink-0 flex-row items-center justify-between border-b px-4 md:hidden",
          "bg-[#F7F6F0]/95 backdrop-blur-sm",
        )}
        style={{ borderColor: "#E6E3D7" }}
        {...props}
      >
        <LogoIcon />
        <button
          type="button"
          aria-label="Open navigation menu"
          onClick={() => setOpen(true)}
          className="flex h-10 w-10 items-center justify-center rounded-xl transition-colors hover:bg-[#EDEBE0] active:scale-95"
        >
          <Menu className="text-[#171A18]" />
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <>
            {/* Scrim behind the drawer */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-[95] bg-black/30 backdrop-blur-[1px] md:hidden"
            />
            {/* Slide-in drawer */}
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
              className={cn(
                "fixed inset-y-0 left-0 z-[100] flex w-[86%] max-w-[330px] flex-col gap-0 justify-start overflow-hidden bg-[#F7F6F0] shadow-2xl md:hidden",
                className,
              )}
            >
              <div
                className="flex h-16 shrink-0 items-center justify-between border-b px-4"
                style={{ borderColor: "#E6E3D7" }}
              >
                <span
                  className="font-semibold text-sm tracking-tight"
                  style={{ color: "#171A18" }}
                >
                  Navigation
                </span>
                <button
                  type="button"
                  aria-label="Close menu"
                  onClick={() => setOpen(false)}
                  className="flex h-10 w-10 items-center justify-center rounded-xl transition-colors hover:bg-[#EDEBE0] active:scale-95"
                >
                  <X className="text-[#171A18]" />
                </button>
              </div>
              <div
                className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pb-6 pt-3"
                onClick={(e) => {
                  // Tapping any nav action selects the section and closes the drawer.
                  if ((e.target as HTMLElement).closest("button")) setOpen(false);
                }}
              >
                {children}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export const SidebarLink = ({
  link,
  className,
  onClick,
}: {
  link: Links;
  className?: string;
  onClick?: () => void;
}) => {
  const { open, animate } = useSidebar();
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center justify-start gap-2 group/sidebar py-2 w-full text-left",
        className
      )}
    >
      {link.icon}
      <motion.span
        animate={{
          display: animate ? (open ? "inline-block" : "none") : "inline-block",
          opacity: animate ? (open ? 1 : 0) : 1,
        }}
        className=        "text-sm group-hover/sidebar:translate-x-1 transition duration-150 whitespace-pre inline-block !p-0 !m-0"
      >
        {link.label}
      </motion.span>
    </button>
  );
};

export const Logo = () => {
  return (
    <div className="font-normal flex items-center gap-2.5 text-sm py-1 relative z-20">
      <div className="h-8 w-8 rounded-lg flex items-center justify-center font-bold text-xs flex-shrink-0" style={{ background: "#244B35", color: "#DCE6D0" }}>
        L2L
      </div>
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="font-semibold text-sm whitespace-pre" style={{ color: "#171A18" }}
      >
        Learn2Lead
      </motion.span>
    </div>
  );
};

export const LogoIcon = () => {
  return (
    <div className="font-normal flex items-center gap-2.5 text-sm py-1 relative z-20">
      <div className="h-8 w-8 rounded-lg flex items-center justify-center font-bold text-xs flex-shrink-0" style={{ background: "#244B35", color: "#DCE6D0" }}>
        L2L
      </div>
    </div>
  );
};
