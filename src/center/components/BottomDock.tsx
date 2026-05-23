import { NavLink } from "react-router-dom";

const iconBase = "/recolored_C7C7C7";

const navItems = [
  {
    label: "Media",
    to: "/center/media",
    icon: "media.svg",
  },
  {
    label: "Climate",
    to: "/center/climate",
    icon: "climate.svg",
  },
  {
    label: "Car",
    to: "/center/car",
    icon: "car.svg",
  },
  {
    label: "Nav",
    to: "/center/navigation",
    icon: "navigation.svg",
  },
  {
    label: "Phone",
    to: "/center/phone",
    icon: "phone.svg",
  },
  {
    label: "Settings",
    to: "/center/settings",
    icon: "settings.svg",
  },
];

export default function BottomDock() {
  return (
    <div className="flex h-20 w-full items-center justify-around rounded-t-[26px] border-t border-[var(--tesla-border-subtle)] bg-[var(--tesla-bg-primary)]/90 px-6 backdrop-blur-xl">
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
          <img src={`${iconBase}/${item.icon}`} alt="" className="h-5 w-5 object-contain opacity-80" />
          <span>{item.label}</span>
        </NavLink>
      ))}
    </div>
  );
}
