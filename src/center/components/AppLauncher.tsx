import { AnimatePresence, motion } from "framer-motion";

export type AppType = "media" | "climate" | "car" | "nav" | "phone" | "settings";

interface AppLauncherProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectApp: (app: AppType) => void;
  activeApp: AppType;
}

type LauncherApp = {
  app: AppType;
  label: string;
};

const launcherApps: LauncherApp[] = [
  { app: "media", label: "Media" },
  { app: "climate", label: "Climate" },
  { app: "car", label: "Car" },
  { app: "nav", label: "Navigation" },
  { app: "phone", label: "Phone" },
  { app: "settings", label: "Settings" },
];

interface AppIconProps extends LauncherApp {
  isActive: boolean;
  onClick: () => void;
}

const AppIcon = ({ label, isActive, onClick }: AppIconProps) => (
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
            {launcherApps.map((item) => (
              <motion.div key={item.app} variants={itemVariants}>
                <AppIcon
                  {...item}
                  isActive={activeApp === item.app}
                  onClick={() => handleAppSelect(item.app)}
                />
              </motion.div>
            ))}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
