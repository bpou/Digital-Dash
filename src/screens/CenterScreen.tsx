import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import AppLauncher, { type AppType } from "../center/components/AppLauncher";
import QuickControlsBar from "../center/components/QuickControlsBar";
import StatusBar from "../center/components/StatusBar";
import CarPage from "../center/pages/CarPage";
import ClimatePage from "../center/pages/ClimatePage";
import MediaPage from "../center/pages/MediaPage";
import NavigationPage from "../center/pages/NavigationPage";
import PhonePage from "../center/pages/PhonePage";
import SettingsPage from "../center/pages/SettingsPage";

export default function CenterScreen() {
  const [scale, setScale] = useState(1);
  const [activeApp, setActiveApp] = useState<AppType>("media");
  const [showLauncher, setShowLauncher] = useState(false);
  const [mediaFade, setMediaFade] = useState(false);

  useEffect(() => {
    const baseWidth = 1280;
    const baseHeight = 640;
    const handleResize = () => {
      const next = Math.min(window.innerWidth / baseWidth, window.innerHeight / baseHeight);
      setScale(Number.isFinite(next) ? next : 1);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const mainContent = useMemo(() => {
    switch (activeApp) {
      case "media":
        return <MediaPage />;
      case "climate":
        return <ClimatePage />;
      case "car":
        return <CarPage />;
      case "nav":
        return <NavigationPage />;
      case "phone":
        return <PhonePage />;
      case "settings":
        return <SettingsPage />;
      default:
        return <MediaPage />;
    }
  }, [activeApp]);

  const toggleLauncher = () => setShowLauncher((prev) => !prev);
  const handleMediaOpen = () => {
    setMediaFade(true);
    setActiveApp("media");
  };

  const pageVariants = mediaFade && activeApp === "media"
    ? {
        initial: { opacity: 0 },
        animate: { opacity: 1 },
        exit: { opacity: 0 },
      }
    : {
        initial: { opacity: 0, x: 50 },
        animate: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: -50 },
      };

  const pageTransition = mediaFade && activeApp === "media"
    ? { duration: 0.25, ease: [0.4, 0, 0.2, 1] }
    : { duration: 0.25, ease: [0.4, 0, 0.2, 1] };

  return (
    <div className="min-h-screen bg-[#07090c] text-[var(--tesla-text-primary)]">
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-0 cluster-ambient" />
          <div className="absolute inset-0 cluster-vignette" />
          <div className="absolute inset-0 cluster-noise" />
        </div>
        <div
          className="relative origin-center"
          style={{
            width: 1280,
            height: 640,
            transform: `scale(${scale})`,
          }}
        >
          {/* Main container with Tesla-style layout */}
          <div className="relative flex h-full w-full flex-col overflow-hidden rounded-[40px] bg-[radial-gradient(circle_at_40%_40%,rgba(26,44,45,0.9),rgba(6,8,10,0.95)_60%,rgba(4,5,7,1)_100%)]">
            <div className="pointer-events-none absolute inset-0 cluster-edge" />
            {/* Status Bar - 32px */}
            <StatusBar outsideTemp={18} />

            {/* Full-screen content area */}
            <div className="flex-1 overflow-hidden px-4 pb-2">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeApp}
                  className="h-full w-full"
                  variants={pageVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  transition={pageTransition}
                  onAnimationComplete={() => setMediaFade(false)}
                >
                  {mainContent}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Quick Controls Bar - 64px */}
            <QuickControlsBar
              onLauncherToggle={toggleLauncher}
              onMediaOpen={handleMediaOpen}
              climateTemp={21}
            />

            {/* App Launcher Overlay */}
            <AppLauncher
              isOpen={showLauncher}
              onClose={() => setShowLauncher(false)}
              onSelectApp={setActiveApp}
              activeApp={activeApp}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
