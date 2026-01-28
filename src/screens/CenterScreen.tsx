import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useMemo, useState } from "react";
import { useVehicleState } from "../vehicle/vehicleClient";
import { hexToRgba } from "../utils/color";
import AppLauncher, { type AppType } from "../center/components/AppLauncher";
import QuickControlsBar from "../center/components/QuickControlsBar";
import StatusBar from "../center/components/StatusBar";

const appRoutes: Record<AppType, string> = {
  media: "/center/media",
  climate: "/center/climate",
  car: "/center/car",
  nav: "/center/navigation",
  phone: "/center/phone",
  settings: "/center/settings",
};

const getActiveApp = (pathname: string): AppType => {
  if (pathname.includes("/center/climate")) return "climate";
  if (pathname.includes("/center/car")) return "car";
  if (pathname.includes("/center/navigation")) return "nav";
  if (pathname.includes("/center/phone")) return "phone";
  if (pathname.includes("/center/settings")) return "settings";
  return "media";
};

export default function CenterScreen() {
  const navigate = useNavigate();
  const location = useLocation();
  const [launcherOpen, setLauncherOpen] = useState(false);
  const { ambient } = useVehicleState();
  const ambientColor = ambient?.color ?? "#7EE3FF";
  const ambientBrightness = ambient?.brightness ?? 65;

  const activeApp = useMemo(() => getActiveApp(location.pathname), [location.pathname]);

  const handleAppSelect = (app: AppType) => {
    navigate(appRoutes[app]);
  };

  return (
    <div className="relative flex h-[768px] w-[1280px] flex-col overflow-hidden bg-[var(--tesla-bg-primary)] text-white">
      <div className="pointer-events-none absolute inset-0">
        <div
          className="absolute inset-0 ambient-glow"
          style={{
            background: `radial-gradient(circle at 18% 15%, ${hexToRgba(ambientColor, 0.22)}, transparent 55%), radial-gradient(circle at 82% 35%, ${hexToRgba(ambientColor, 0.18)}, transparent 60%)`,
            opacity: ambientBrightness / 100,
          }}
        />
      </div>
      <StatusBar />
      <div className="flex min-h-[calc(768px-4rem)] flex-1 flex-col gap-6 px-6 pb-24 pt-5">
        <div className="relative flex-1 rounded-[28px] border border-white/10 bg-white/5 p-6">
          <Outlet />
        </div>
      </div>
      <div className="absolute bottom-0 left-0 right-0">
        <QuickControlsBar
          onLauncherToggle={() => setLauncherOpen(true)}
          onMediaOpen={() => navigate("/center/media")}
        />
      </div>
      <AppLauncher
        isOpen={launcherOpen}
        onClose={() => setLauncherOpen(false)}
        onSelectApp={handleAppSelect}
        activeApp={activeApp}
      />
    </div>
  );
}
