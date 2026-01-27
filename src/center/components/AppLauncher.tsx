import type { ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";

export type AppType = "media" | "climate" | "car" | "nav" | "phone" | "settings";

interface AppLauncherProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectApp: (app: AppType) => void;
  activeApp: AppType;
}

interface AppIconProps {
  label: string;
  icon: ReactNode;
  isActive: boolean;
  onClick: () => void;
}

const AppIcon = ({ label, icon, isActive, onClick }: AppIconProps) => (
  <motion.button
    type="button"
    onClick={onClick}
    className={`flex h-[132px] w-[132px] flex-col items-center justify-center gap-3 rounded-[var(--tesla-radius-lg)] p-4 transition ${
      isActive
        ? "bg-[var(--tesla-bg-surface-active)] text-[var(--tesla-text-primary)] shadow-[0_0_18px_rgba(62,106,225,0.2)]"
        : "bg-[var(--tesla-bg-surface)] text-[var(--tesla-text-secondary)] hover:bg-[var(--tesla-bg-surface-hover)] hover:text-[var(--tesla-text-primary)]"
    }`}
    whileTap={{ scale: 0.95, opacity: 0.8 }}
  >
    <div className="flex h-14 w-14 items-center justify-center">{icon}</div>
    <span className="text-[11px] font-medium uppercase tracking-[0.14em]">{label}</span>
  </motion.button>
);

export default function AppLauncher({
  isOpen,
  onClose,
  onSelectApp,
  activeApp,
}: AppLauncherProps) {
  const overlayVariants = {
    initial: { opacity: 0, scale: 0.98 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.98 },
  };

  const containerVariants = {
    animate: {
      transition: {
        staggerChildren: 0.05,
      },
    },
  };

  const itemVariants = {
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 8 },
  };

  const handleAppSelect = (app: AppType) => {
    onSelectApp(app);
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="absolute inset-0 z-50 flex items-center justify-center bg-[var(--tesla-bg-primary)]/95 backdrop-blur-2xl"
          onClick={onClose}
          onKeyDown={(e) => e.key === "Escape" && onClose()}
          role="dialog"
          aria-modal="true"
          aria-label="App Launcher"
          variants={overlayVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
        >
          <motion.div
            className="grid grid-cols-3 gap-4 p-8"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => e.stopPropagation()}
            role="menu"
            variants={containerVariants}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            <motion.div variants={itemVariants}>
        <AppIcon
          label="Media"
          isActive={activeApp === "media"}
          onClick={() => handleAppSelect("media")}
          icon={
            <svg viewBox="0 0 24 24" fill="none" className="h-10 w-10">
              <rect
                x="3"
                y="5"
                width="18"
                height="14"
                rx="2"
                stroke="currentColor"
                strokeWidth="1.5"
              />
              <path d="M10 9l5 3-5 3V9z" fill="currentColor" />
            </svg>
          }
        />
            </motion.div>
            <motion.div variants={itemVariants}>
        <AppIcon
          label="Climate"
          isActive={activeApp === "climate"}
          onClick={() => handleAppSelect("climate")}
          icon={
            <svg viewBox="0 0 24 24" fill="none" className="h-10 w-10">
              <path
                d="M12 3v18M8 7c0-2 1.8-3.5 4-3.5S16 5 16 7s-1.8 3.5-4 3.5S8 9 8 7zM8 17c0-2 1.8-3.5 4-3.5S16 15 16 17s-1.8 3.5-4 3.5S8 19 8 17z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          }
        />
            </motion.div>
            <motion.div variants={itemVariants}>
        <AppIcon
          label="Car"
          isActive={activeApp === "car"}
          onClick={() => handleAppSelect("car")}
          icon={
            <svg viewBox="0 0 24 24" fill="none" className="h-10 w-10">
              <path
                d="M5 14l2-5h10l2 5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M3 14h18v4H3z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="7" cy="18" r="1.5" fill="currentColor" />
              <circle cx="17" cy="18" r="1.5" fill="currentColor" />
            </svg>
          }
        />
            </motion.div>
            <motion.div variants={itemVariants}>
        <AppIcon
          label="Navigation"
          isActive={activeApp === "nav"}
          onClick={() => handleAppSelect("nav")}
          icon={
            <svg viewBox="0 0 24 24" fill="none" className="h-10 w-10">
              <path
                d="M12 2L4 22l8-4 8 4L12 2z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          }
        />
            </motion.div>
            <motion.div variants={itemVariants}>
        <AppIcon
          label="Phone"
          isActive={activeApp === "phone"}
          onClick={() => handleAppSelect("phone")}
          icon={
            <svg viewBox="0 0 24 24" fill="none" className="h-10 w-10">
              <path
                d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          }
        />
            </motion.div>
            <motion.div variants={itemVariants}>
        <AppIcon
          label="Settings"
          isActive={activeApp === "settings"}
          onClick={() => handleAppSelect("settings")}
          icon={
            <svg viewBox="0 0 24 24" fill="none" className="h-10 w-10">
              <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5" />
              <path
                d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          }
        />
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
