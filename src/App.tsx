import { Link, Route, Routes } from "react-router-dom";
import CenterScreen from "./screens/CenterScreen";
import ClusterScreen from "./screens/ClusterScreen";
import CarPage from "./center/pages/CarPage";
import ClimatePage from "./center/pages/ClimatePage";
import MediaPage from "./center/pages/MediaPage";
import NavigationPage from "./center/pages/NavigationPage";
import PhonePage from "./center/pages/PhonePage";
import SettingsPage from "./center/pages/SettingsPage";

export default function App() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <div className="min-h-screen bg-[#07090c] text-white">
            <div className="flex min-h-screen items-center justify-center">
              <div className="rounded-[28px] border border-white/10 bg-white/5 p-10 text-center">
                <h1 className="text-[22px] font-semibold tracking-wide">Digital Dash Launcher</h1>
                <p className="mt-2 text-[13px] text-white/60">Choose a screen to preview</p>
                <div className="mt-8 flex items-center justify-center gap-4">
                  <Link
                    to="/cluster"
                    className="rounded-[18px] border border-white/15 bg-white/10 px-6 py-4 text-[12px] uppercase tracking-[0.3em] text-white"
                  >
                    Cluster
                  </Link>
                  <Link
                    to="/center"
                    className="rounded-[18px] border border-white/15 bg-white/10 px-6 py-4 text-[12px] uppercase tracking-[0.3em] text-white"
                  >
                    Center
                  </Link>
                </div>
              </div>
            </div>
          </div>
        }
      />
      <Route path="/cluster" element={<ClusterScreen />} />
      <Route path="/center" element={<CenterScreen />}>
        <Route index element={<MediaPage />} />
        <Route path="media" element={<MediaPage />} />
        <Route path="climate" element={<ClimatePage />} />
        <Route path="car" element={<CarPage />} />
        <Route path="navigation" element={<NavigationPage />} />
        <Route path="phone" element={<PhonePage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  );
}
