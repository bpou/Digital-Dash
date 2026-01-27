import { motion } from "framer-motion";

const pageVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -12 },
};

const pageTransition = { duration: 0.2, ease: "easeOut" };

const ChevronRight = () => (
  <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 text-white/60">
    <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export default function SettingsPage() {
  return (
    <motion.div
      className="flex h-full w-full flex-col gap-4 bg-black p-4 text-white overflow-hidden"
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={pageTransition}
    >
      <div className="grid flex-1 grid-cols-[1.4fr_1fr] gap-4">
        <div className="flex h-full flex-col gap-4">
          <div className="rounded-[16px] bg-white/5 p-5">
            <p className="text-xs uppercase tracking-[0.3em] text-white/60">Settings</p>
            <div className="mt-4 space-y-3">
              {[
                { title: "Display", meta: "Brightness · Auto" },
                { title: "Controls", meta: "Steering · Mirrors" },
                { title: "Safety", meta: "Sentry · Alarms" },
                { title: "Autopilot", meta: "Navigate on AP" },
                { title: "Software", meta: "Version 2024.12" },
              ].map((item) => (
                <motion.button
                  key={item.title}
                  type="button"
                  className="flex min-h-[52px] w-full items-center justify-between rounded-[12px] bg-white/5 px-4 py-3 text-left hover:bg-white/10"
                  whileTap={{ scale: 0.95, opacity: 0.8 }}
                >
                  <div>
                    <p className="text-sm text-white/90">{item.title}</p>
                    <p className="text-xs uppercase tracking-[0.2em] text-white/50">{item.meta}</p>
                  </div>
                  <ChevronRight />
                </motion.button>
              ))}
            </div>
          </div>

          <div className="rounded-[16px] bg-white/5 p-5">
            <p className="text-xs uppercase tracking-[0.3em] text-white/60">Driver profile</p>
            <div className="mt-4 flex items-center justify-between">
              <div>
                <p className="text-sm text-white/90">Profile · Alex</p>
                <p className="text-xs uppercase tracking-[0.2em] text-white/50">Easy entry enabled</p>
              </div>
              <motion.button
                type="button"
                className="min-h-[44px] rounded-[10px] bg-white/5 px-4 text-xs uppercase tracking-[0.3em] text-white/70 hover:bg-white/10"
                whileTap={{ scale: 0.95, opacity: 0.8 }}
              >
                Manage
              </motion.button>
            </div>
          </div>
        </div>

        <div className="flex h-full flex-col gap-4">
          <div className="rounded-[16px] bg-white/5 p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-[0.3em] text-white/60">Software update</p>
              <span className="text-xs uppercase tracking-[0.2em] text-emerald-400">Ready</span>
            </div>
            <div className="mt-4 space-y-2">
              <p className="text-lg font-medium text-white/90">Version 2024.12.5</p>
              <p className="text-sm text-white/60">Download complete · 85% charged</p>
              <p className="text-xs uppercase tracking-[0.25em] text-white/50">Install time · 25 min</p>
            </div>
            <motion.button
              type="button"
              className="mt-4 flex min-h-[44px] w-full items-center justify-center rounded-[12px] bg-white/10 text-xs uppercase tracking-[0.3em] text-white/80 hover:bg-white/20"
              whileTap={{ scale: 0.95, opacity: 0.8 }}
            >
              Schedule install
            </motion.button>
          </div>

          <div className="rounded-[16px] bg-white/5 p-5">
            <p className="text-xs uppercase tracking-[0.3em] text-white/60">Connectivity</p>
            <div className="mt-4 space-y-3">
              {[
                { label: "Wi-Fi", value: "Tesla Guest" },
                { label: "Premium Connectivity", value: "Active" },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-white/90">{item.label}</p>
                    <p className="text-xs uppercase tracking-[0.2em] text-white/50">{item.value}</p>
                  </div>
                  <motion.button
                    type="button"
                    className="min-h-[44px] rounded-[10px] bg-white/5 px-3 text-xs uppercase tracking-[0.3em] text-white/70 hover:bg-white/10"
                    whileTap={{ scale: 0.95, opacity: 0.8 }}
                  >
                    Manage
                  </motion.button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
