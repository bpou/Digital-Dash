import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useMemo, useState } from "react";
import AppLauncher, { type AppType } from "../center/components/AppLauncher";
import BottomDock from "../center/components/BottomDock";
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

  const activeApp = useMemo(() => getActiveApp(location.pathname), [location.pathname]);

  const handleAppSelect = (app: AppType) => {
    navigate(appRoutes[app]);
  };

  return (
    <div className="relative flex min-h-screen w-full flex-col bg-[var(--tesla-bg-primary)] text-white">
      <StatusBar />
      <div className="flex min-h-[calc(100vh-8rem)] flex-1 flex-col gap-6 px-6 py-5">
        <div className="relative flex-1 rounded-[28px] border border-white/10 bg-white/5 p-6">
          <Outlet />
          <AppLauncher
            isOpen={launcherOpen}
            onClose={() => setLauncherOpen(false)}
            onSelectApp={handleAppSelect}
            activeApp={activeApp}
          />
        </div>
        <QuickControlsBar
          onLauncherToggle={() => setLauncherOpen(true)}
          onMediaOpen={() => navigate("/center/media")}
        />
      </div>
      <BottomDock />
    </div>
  );
}
