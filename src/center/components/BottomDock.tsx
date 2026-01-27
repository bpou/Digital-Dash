import { NavLink } from "react-router-dom";

const navItems = [
  {
    label: "Media",
    to: "/center/media",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
        <path
          d="M6 4h8a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <path d="M16 8h4v8h-4" stroke="currentColor" strokeWidth="1.5" />
        <path d="M9 8l4 2.5L9 13V8z" fill="currentColor" />
      </svg>
    ),
  },
  {
    label: "Climate",
    to: "/center/climate",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
        <path d="M12 2v8.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path
          d="M12 22a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <path
          d="M12 2a2 2 0 0 1 2 2v7a4 4 0 1 1-4 0V4a2 2 0 0 1 2-2z"
          stroke="currentColor"
          strokeWidth="1.5"
        />
      </svg>
    ),
  },
  {
    label: "Car",
    to: "/center/car",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
        <path
          d="M3 13l2-5a2 2 0 0 1 2-1h10a2 2 0 0 1 2 1l2 5v5a1 1 0 0 1-1 1h-2"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        <path d="M5 18a1 1 0 0 0 1 1h2" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="7" cy="16" r="1.5" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="17" cy="16" r="1.5" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    ),
  },
  {
    label: "Nav",
    to: "/center/navigation",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
        <path d="M12 3l7 18-7-4-7 4 7-18z" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    ),
  },
  {
    label: "Phone",
    to: "/center/phone",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
        <rect x="7" y="2.5" width="10" height="19" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="12" cy="18" r="1" fill="currentColor" />
      </svg>
    ),
  },
  {
    label: "Settings",
    to: "/center/settings",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
        <path
          d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"
          stroke="currentColor"
          strokeWidth="1.5"
        />
        <path
          d="M19.4 15a1.7 1.7 0 0 0 .33 1.82l.05.05a2 2 0 1 1-2.83 2.83l-.05-.05A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .3 1.7 1.7 0 0 0-.8 1.47V21a2 2 0 1 1-4 0v-.07a1.7 1.7 0 0 0-.8-1.47 1.7 1.7 0 0 0-1-.3 1.7 1.7 0 0 0-1.87 1.3l-.02.07a2 2 0 1 1-3.73-1.46l.05-.05A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.3-1 1.7 1.7 0 0 0-1.47-.8H2.8a2 2 0 1 1 0-4h.07a1.7 1.7 0 0 0 1.47-.8 1.7 1.7 0 0 0 .3-1 1.7 1.7 0 0 0-1.3-1.87l-.07-.02A2 2 0 1 1 4.6 1.8l.05.05A1.7 1.7 0 0 0 6 2.6a1.7 1.7 0 0 0 1-.3 1.7 1.7 0 0 0 .8-1.47V.8a2 2 0 1 1 4 0v.07a1.7 1.7 0 0 0 .8 1.47 1.7 1.7 0 0 0 1 .3 1.7 1.7 0 0 0 1.87-1.3l.02-.07A2 2 0 1 1 22.2 4.6l-.05.05A1.7 1.7 0 0 0 21.4 6a1.7 1.7 0 0 0 .3 1 1.7 1.7 0 0 0 1.47.8h.07a2 2 0 1 1 0 4h-.07a1.7 1.7 0 0 0-1.47.8 1.7 1.7 0 0 0-.3 1z"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
];

export default function BottomDock() {
  return (
    <div className="flex h-20 w-full items-center justify-around border-t border-[var(--tesla-border-subtle)] bg-[var(--tesla-bg-primary)]/90 px-6 backdrop-blur-xl">
      {navItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) =>
            `flex w-16 flex-col items-center gap-1 rounded-[14px] px-2 py-2 text-[10px] uppercase tracking-[0.22em] transition ${
              isActive
                ? "bg-white/10 text-white"
                : "text-[var(--tesla-text-secondary)] hover:text-[var(--tesla-text-primary)]"
            }`
          }
        >
          <span className="text-[var(--tesla-text-tertiary)]">{item.icon}</span>
          <span>{item.label}</span>
        </NavLink>
      ))}
    </div>
  );
}
