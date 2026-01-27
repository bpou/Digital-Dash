import { motion } from "framer-motion";

const pageVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -12 },
};

const pageTransition = { duration: 0.2, ease: "easeOut" };

const BluetoothIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-white/70">
    <path
      d="M6.5 6.5l11 11L12 23V1l5.5 5.5-11 11"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const PhoneIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
    <path
      d="M22 16.92v3a2 2 0 0 1-2.18 2 19.8 19.8 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const KeypadButton = ({ label, sub }: { label: string; sub?: string }) => (
  <motion.button
    type="button"
    className="flex min-h-[56px] flex-col items-center justify-center rounded-[12px] bg-white/5 text-lg text-white/90 hover:bg-white/10"
    whileTap={{ scale: 0.95, opacity: 0.8 }}
  >
    <span className="text-[20px] font-medium">{label}</span>
    {sub && <span className="text-[10px] uppercase tracking-[0.25em] text-white/50">{sub}</span>}
  </motion.button>
);

export default function PhonePage() {
  return (
    <motion.div
      className="flex h-full w-full flex-col gap-4 bg-black p-4 text-white overflow-hidden"
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={pageTransition}
    >
      <div className="grid flex-1 grid-cols-[1.2fr_1fr] gap-4">
        <div className="flex h-full flex-col gap-4">
          <div className="rounded-[16px] bg-white/5 p-5">
            <p className="text-xs uppercase tracking-[0.3em] text-white/60">Call status</p>
            <div className="mt-4 flex items-center justify-between">
              <div>
                <p className="text-lg font-medium text-white/90">Incoming call</p>
                <p className="text-sm text-white/60">Alex Morgan · Mobile</p>
                <p className="mt-2 text-xs uppercase tracking-[0.25em] text-white/50">Ringing · 00:07</p>
              </div>
              <div className="flex items-center gap-3">
                <motion.button
                  type="button"
                  className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/80 text-white"
                  whileTap={{ scale: 0.95, opacity: 0.8 }}
                >
                  <PhoneIcon />
                </motion.button>
                <motion.button
                  type="button"
                  className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/80 text-white"
                  whileTap={{ scale: 0.95, opacity: 0.8 }}
                >
                  <PhoneIcon />
                </motion.button>
              </div>
            </div>
          </div>

          <div className="rounded-[16px] bg-white/5 p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-[0.3em] text-white/60">Bluetooth</p>
              <span className="text-xs uppercase tracking-[0.2em] text-emerald-400">Connected</span>
            </div>
            <div className="mt-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-[12px] bg-white/10">
                  <BluetoothIcon />
                </div>
                <div>
                  <p className="text-sm text-white/90">iPhone 15 Pro</p>
                  <p className="text-xs uppercase tracking-[0.2em] text-white/50">Battery 86%</p>
                </div>
              </div>
              <motion.button
                type="button"
                className="min-h-[44px] rounded-[10px] bg-white/5 px-4 text-xs uppercase tracking-[0.3em] text-white/70 hover:bg-white/10"
                whileTap={{ scale: 0.95, opacity: 0.8 }}
              >
                Devices
              </motion.button>
            </div>
          </div>

          <div className="rounded-[16px] bg-white/5 p-5">
            <p className="text-xs uppercase tracking-[0.3em] text-white/60">Recent calls</p>
            <div className="mt-4 space-y-3">
              {[
                { name: "Jordan Lee", meta: "Today · 09:12" },
                { name: "Emily Park", meta: "Yesterday · Missed" },
                { name: "Service Center", meta: "Mon · 14:43" },
              ].map((item) => (
                <motion.button
                  key={item.name}
                  type="button"
                  className="flex min-h-[44px] w-full items-center justify-between rounded-[12px] bg-white/5 px-4 py-2 text-left hover:bg-white/10"
                  whileTap={{ scale: 0.95, opacity: 0.8 }}
                >
                  <div>
                    <p className="text-sm text-white/90">{item.name}</p>
                    <p className="text-xs uppercase tracking-[0.2em] text-white/50">{item.meta}</p>
                  </div>
                  <span className="text-xs uppercase tracking-[0.3em] text-white/50">Call</span>
                </motion.button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex h-full flex-col gap-4">
          <div className="rounded-[16px] bg-white/5 p-5">
            <p className="text-xs uppercase tracking-[0.3em] text-white/60">Keypad</p>
            <div className="mt-4 grid grid-cols-3 gap-3">
              <KeypadButton label="1" sub="" />
              <KeypadButton label="2" sub="ABC" />
              <KeypadButton label="3" sub="DEF" />
              <KeypadButton label="4" sub="GHI" />
              <KeypadButton label="5" sub="JKL" />
              <KeypadButton label="6" sub="MNO" />
              <KeypadButton label="7" sub="PQRS" />
              <KeypadButton label="8" sub="TUV" />
              <KeypadButton label="9" sub="WXYZ" />
              <KeypadButton label="*" sub="" />
              <KeypadButton label="0" sub="+" />
              <KeypadButton label="#" sub="" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <motion.button
              type="button"
              className="flex min-h-[52px] items-center justify-center rounded-[12px] bg-emerald-500/80 text-sm uppercase tracking-[0.3em] text-white"
              whileTap={{ scale: 0.95, opacity: 0.8 }}
            >
              Call
            </motion.button>
            <motion.button
              type="button"
              className="flex min-h-[52px] items-center justify-center rounded-[12px] bg-white/5 text-sm uppercase tracking-[0.3em] text-white/70 hover:bg-white/10"
              whileTap={{ scale: 0.95, opacity: 0.8 }}
            >
              Mute
            </motion.button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
