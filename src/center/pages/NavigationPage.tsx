import mapboxgl from "mapbox-gl";
import { motion } from "framer-motion";
import { Compass, Crosshair, MapPinned, Navigation, Satellite, Search, WifiOff } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useGpsPosition } from "../hooks/useGpsPosition";

const pageVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -12 },
};

const pageTransition = { duration: 0.2, ease: "easeOut" };

const fallbackLocation = { lat: 59.3293, lng: 18.0686 };

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);

const formatCoordinate = (value: number) => value.toFixed(6);

const formatHeading = (heading: number | null | undefined) => {
  if (!isFiniteNumber(heading)) return "--";
  return `${Math.round(heading).toString().padStart(3, "0")} deg`;
};

const formatSpeed = (speedKmh: number | null | undefined) => {
  if (!isFiniteNumber(speedKmh)) return "--";
  return `${Math.max(0, Math.round(speedKmh))} km/h`;
};

const formatFixAge = (timestamp: number | null) => {
  if (!timestamp) return "waiting";
  const ageSeconds = Math.max(0, Math.round((Date.now() - timestamp) / 1000));
  if (ageSeconds < 2) return "live";
  return `${ageSeconds}s ago`;
};

type NavMetricProps = {
  label: string;
  value: string;
  detail?: string;
};

function NavMetric({ label, value, detail }: NavMetricProps) {
  return (
    <div className="min-h-[84px] rounded-[8px] border border-white/10 bg-black/35 px-4 py-3">
      <div className="font-mono text-[10px] uppercase text-white/38">{label}</div>
      <div className="mt-2 font-mono text-[22px] font-semibold leading-none text-white">{value}</div>
      {detail ? <div className="mt-2 truncate font-mono text-[11px] text-white/42">{detail}</div> : null}
    </div>
  );
}

function OfflineMap({
  location,
  heading,
}: {
  location: { lat: number; lng: number };
  heading: number | null;
}) {
  return (
    <div className="relative h-full w-full overflow-hidden bg-[#081014]">
      <div
        className="absolute inset-0 opacity-45"
        style={{
          backgroundImage:
            "linear-gradient(rgba(126,227,255,0.09) 1px, transparent 1px), linear-gradient(90deg, rgba(126,227,255,0.09) 1px, transparent 1px)",
          backgroundSize: "44px 44px",
        }}
      />
      <div className="absolute left-1/2 top-1/2 h-[380px] w-[380px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-200/10" />
      <div className="absolute left-1/2 top-1/2 h-[240px] w-[240px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-200/14" />
      <div className="absolute left-1/2 top-1/2 h-[118px] w-[118px] -translate-x-1/2 -translate-y-1/2 rounded-full border border-cyan-200/22 bg-cyan-200/5" />
      <div className="absolute left-1/2 top-1/2 grid h-16 w-16 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-cyan-200/40 bg-cyan-300/18 shadow-[0_0_34px_rgba(126,227,255,0.22)]">
        <Navigation
          className="h-8 w-8 text-cyan-100"
          style={{ transform: `rotate(${isFiniteNumber(heading) ? heading : 0}deg)` }}
        />
      </div>
      <div className="absolute bottom-24 left-8 rounded-[8px] border border-white/10 bg-black/45 px-4 py-3 font-mono text-[12px] text-white/70">
        {formatCoordinate(location.lat)}, {formatCoordinate(location.lng)}
      </div>
    </div>
  );
}

export default function NavigationPage() {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);

  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [searchValue, setSearchValue] = useState("");
  const [lastFixMs, setLastFixMs] = useState<number | null>(null);
  const [fixAgeLabel, setFixAgeLabel] = useState("waiting");

  const gpsPosition = useGpsPosition();
  const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined;

  const liveLocation = gpsPosition?.location ?? null;
  const displayLocation = liveLocation ?? fallbackLocation;
  const hasGpsFix = liveLocation !== null;
  const heading = gpsPosition?.heading ?? null;
  const speedKmh = gpsPosition?.speedKmh ?? null;

  const gpsStatus = useMemo(() => {
    if (!hasGpsFix) return "Waiting for VK-162 fix";
    return gpsPosition?.source === "vehicle" ? "VK-162 GPS" : "Browser GPS fallback";
  }, [gpsPosition?.source, hasGpsFix]);

  useEffect(() => {
    if (!hasGpsFix) return;
    setLastFixMs(Date.now());
  }, [hasGpsFix, displayLocation.lat, displayLocation.lng]);

  useEffect(() => {
    const update = () => setFixAgeLabel(formatFixAge(lastFixMs));
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, [lastFixMs]);

  useEffect(() => {
    if (!mapboxToken) {
      setMapError("Mapbox token missing");
      return;
    }
    if (!mapContainerRef.current || mapRef.current) return;

    const initialLocation = gpsPosition?.location ?? fallbackLocation;
    const initialHeading = gpsPosition?.heading;

    let map: mapboxgl.Map;
    try {
      mapboxgl.accessToken = mapboxToken;
      map = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: "mapbox://styles/mapbox/navigation-night-v1",
        center: [initialLocation.lng, initialLocation.lat],
        zoom: gpsPosition?.location ? 16 : 12,
        pitch: 58,
        bearing: isFiniteNumber(initialHeading) ? initialHeading : 0,
        attributionControl: false,
      });
    } catch (err) {
      setMapError(err instanceof Error ? err.message : "Map failed to initialize");
      return;
    }

    mapRef.current = map;
    map.addControl(new mapboxgl.AttributionControl({ compact: true }), "bottom-right");

    const markerElement = document.createElement("div");
    markerElement.className =
      "grid h-12 w-12 place-items-center rounded-full border border-cyan-100/60 bg-cyan-300/20 shadow-[0_0_28px_rgba(126,227,255,0.42)]";
    markerElement.innerHTML =
      '<div class="h-0 w-0 border-x-[9px] border-b-[24px] border-x-transparent border-b-cyan-100"></div>';

    markerRef.current = new mapboxgl.Marker({ element: markerElement, rotationAlignment: "map" })
      .setLngLat([initialLocation.lng, initialLocation.lat])
      .addTo(map);

    map.on("load", () => {
      setMapReady(true);
      setMapError(null);
    });
    map.on("error", (event) => {
      const message = event?.error?.message || "Map failed to load";
      setMapError(message);
    });

    return () => {
      markerRef.current?.remove();
      markerRef.current = null;
      map.remove();
      mapRef.current = null;
    };
  }, [mapboxToken]);

  useEffect(() => {
    const map = mapRef.current;
    const marker = markerRef.current;
    if (!map || !marker || !mapReady || !hasGpsFix) return;

    const center: [number, number] = [displayLocation.lng, displayLocation.lat];
    marker.setLngLat(center);
    marker.setRotation(isFiniteNumber(heading) ? heading : 0);
    map.easeTo({
      center,
      zoom: Math.max(map.getZoom(), 16),
      bearing: isFiniteNumber(heading) ? heading : map.getBearing(),
      pitch: 58,
      duration: 700,
      essential: true,
    });
  }, [displayLocation.lat, displayLocation.lng, hasGpsFix, heading, mapReady]);

  const showOfflineMap = !mapboxToken || Boolean(mapError);

  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={pageTransition}
      className="relative h-full w-full overflow-hidden bg-[#050809] text-white"
    >
      <div className="absolute inset-0">
        {showOfflineMap ? (
          <OfflineMap location={displayLocation} heading={heading} />
        ) : (
          <div ref={mapContainerRef} className="h-full w-full" />
        )}
      </div>

      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(0,0,0,0.76),rgba(0,0,0,0.22)_34%,rgba(0,0,0,0.05)_58%,rgba(0,0,0,0.36))]" />

      <aside className="absolute left-0 top-0 flex h-full w-[356px] flex-col border-r border-white/10 bg-black/62 p-5 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-[8px] border border-cyan-200/20 bg-cyan-200/10">
            <MapPinned className="h-5 w-5 text-cyan-100" />
          </div>
          <div>
            <div className="font-mono text-[11px] uppercase text-white/45">Navigation</div>
            <div className="text-[19px] font-semibold leading-tight text-white">Live Position</div>
          </div>
        </div>

        <label className="mt-6 flex h-12 items-center gap-3 rounded-[8px] border border-white/10 bg-white/[0.06] px-4">
          <Search className="h-4 w-4 text-white/45" />
          <input
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
            placeholder="Destination"
            className="min-w-0 flex-1 bg-transparent text-[14px] text-white outline-none placeholder:text-white/32"
          />
        </label>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <NavMetric label="Speed" value={formatSpeed(speedKmh)} detail={gpsStatus} />
          <NavMetric label="Heading" value={formatHeading(heading)} detail="course over ground" />
          <NavMetric label="Latitude" value={formatCoordinate(displayLocation.lat)} />
          <NavMetric label="Longitude" value={formatCoordinate(displayLocation.lng)} />
        </div>

        <div className="mt-5 rounded-[8px] border border-white/10 bg-black/35 p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Satellite className={hasGpsFix ? "h-5 w-5 text-emerald-200" : "h-5 w-5 text-amber-200"} />
              <div>
                <div className="font-mono text-[10px] uppercase text-white/38">GPS source</div>
                <div className="mt-1 text-[14px] font-medium text-white">{gpsStatus}</div>
              </div>
            </div>
            <div
              className={`h-2.5 w-2.5 rounded-full ${
                hasGpsFix ? "bg-emerald-300 shadow-[0_0_18px_rgba(110,231,183,0.8)]" : "bg-amber-300"
              }`}
            />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 font-mono text-[11px] text-white/48">
            <div>Fix: {fixAgeLabel}</div>
            <div>Map: {mapReady ? "online" : showOfflineMap ? "fallback" : "loading"}</div>
          </div>
          {mapError ? (
            <div className="mt-3 flex items-start gap-2 rounded-[8px] border border-amber-300/20 bg-amber-300/10 p-3 text-[12px] leading-snug text-amber-100/82">
              <WifiOff className="mt-0.5 h-4 w-4 flex-none" />
              <span>{mapError}</span>
            </div>
          ) : null}
        </div>

        <div className="mt-auto grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => {
              const map = mapRef.current;
              if (!map) return;
              map.easeTo({ center: [displayLocation.lng, displayLocation.lat], zoom: 16, duration: 500 });
            }}
            className="pointer-events-auto flex h-12 items-center justify-center gap-2 rounded-[8px] border border-white/12 bg-white/8 text-[13px] text-white/82 active:scale-[0.98]"
          >
            <Crosshair className="h-4 w-4" />
            Center
          </button>
          <button
            type="button"
            onClick={() => {
              const map = mapRef.current;
              if (!map) return;
              map.easeTo({ bearing: 0, pitch: 35, duration: 500 });
            }}
            className="pointer-events-auto flex h-12 items-center justify-center gap-2 rounded-[8px] border border-white/12 bg-white/8 text-[13px] text-white/82 active:scale-[0.98]"
          >
            <Compass className="h-4 w-4" />
            North
          </button>
        </div>
      </aside>

      <div className="absolute bottom-8 right-8 flex items-center gap-3 rounded-[8px] border border-white/10 bg-black/55 px-4 py-3 font-mono text-[12px] text-white/62 backdrop-blur-xl">
        <Navigation className="h-4 w-4 text-cyan-100" />
        <span>
          {hasGpsFix
            ? `${formatCoordinate(displayLocation.lat)}, ${formatCoordinate(displayLocation.lng)}`
            : "Waiting for GPS fix"}
        </span>
      </div>
    </motion.div>
  );
}
