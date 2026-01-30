import { motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";

const pageVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -12 },
};

const pageTransition = { duration: 0.2, ease: "easeOut" };

const RecentPinIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-white/70">
    <path
      d="M12 3c-3.3 0-6 2.7-6 6 0 4.5 6 12 6 12s6-7.5 6-12c0-3.3-2.7-6-6-6z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle cx="12" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.5" />
  </svg>
);

const SearchIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-white/70">
    <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.5" />
    <path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const CompassIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5 text-white/70">
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
    <path d="M15 9l-2.5 6L9 15l6-6z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const PlusIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
    <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const MinusIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4">
    <path d="M5 12h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

export default function NavigationPage() {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const trafficRef = useRef<any>(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;
  const defaultCenter = useMemo(() => ({ lat: 59.3293, lng: 18.0686 }), []);

  useEffect(() => {
    if (!apiKey) {
      setMapError("Missing Google Maps API key");
      return;
    }
    if (!mapContainerRef.current) return;
    if ((window as any).google?.maps) {
      setMapReady(true);
      return;
    }

    const existing = document.querySelector("script[data-google-maps='true']");
    if (existing) {
      existing.addEventListener("load", () => setMapReady(true));
      existing.addEventListener("error", () => setMapError("Failed to load Google Maps"));
      return;
    }

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.defer = true;
    script.dataset.googleMaps = "true";
    script.onload = () => setMapReady(true);
    script.onerror = () => setMapError("Failed to load Google Maps");
    document.head.appendChild(script);
  }, [apiKey]);

  useEffect(() => {
    if (!mapReady || mapRef.current || !mapContainerRef.current) return;
    const googleMaps = (window as any).google;
    if (!googleMaps?.maps) return;

    mapRef.current = new googleMaps.maps.Map(mapContainerRef.current, {
      center: defaultCenter,
      zoom: 12,
      disableDefaultUI: true,
      gestureHandling: "greedy",
    });

    trafficRef.current = new googleMaps.maps.TrafficLayer();
    trafficRef.current.setMap(mapRef.current);
  }, [mapReady, defaultCenter]);

  useEffect(() => {
    if (!mapReady || !mapRef.current) return;
    if (!navigator.geolocation) return;

    const googleMaps = (window as any).google;
    let watchId = -1;

    watchId = navigator.geolocation.watchPosition(
      (position) => {
        const coords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        mapRef.current.setCenter(coords);
        if (!markerRef.current && googleMaps?.maps) {
          markerRef.current = new googleMaps.maps.Marker({
            position: coords,
            map: mapRef.current,
          });
        } else if (markerRef.current) {
          markerRef.current.setPosition(coords);
        }
      },
      () => {
        // keep default center if geolocation fails
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    );

    return () => {
      if (watchId !== -1) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [mapReady]);

  return (
      <motion.div
        className="flex h-full w-full flex-col gap-4 bg-black p-4 text-white overflow-hidden"
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={pageTransition}
    >
      <div className="flex items-center gap-3">
        <div className="flex h-11 flex-1 items-center gap-3 rounded-[12px] bg-white/5 px-4 text-white/70">
          <SearchIcon />
          <span className="text-sm uppercase tracking-[0.2em] text-white/60">Search destination</span>
        </div>
        <motion.button
          type="button"
          className="h-11 rounded-[10px] bg-white/5 px-4 text-xs uppercase tracking-[0.3em] text-white/70 hover:bg-white/10"
          whileTap={{ scale: 0.95, opacity: 0.8 }}
        >
          Routes
        </motion.button>
      </div>

      <div className="grid flex-1 grid-cols-[2fr_1fr] gap-4">
        <div className="relative flex h-full flex-col overflow-hidden rounded-[16px] bg-white/5">
          <div ref={mapContainerRef} className="absolute inset-0" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(20,30,40,0.45),transparent_55%),radial-gradient(circle_at_bottom_right,rgba(16,28,36,0.35),transparent_60%)]" />
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.06)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.06)_1px,transparent_1px)] [background-size:36px_36px] opacity-30" />
          {!mapReady && (
            <div className="absolute inset-0 flex items-center justify-center text-xs uppercase tracking-[0.3em] text-white/50">
              {mapError ?? "Loading map"}
            </div>
          )}
          <div className="relative flex h-full flex-col">
            <div className="flex items-center justify-between px-6 pt-5">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-white/60">Map view</p>
                <p className="mt-2 text-lg font-medium text-white/90">Stockholm Center</p>
                <p className="text-sm text-white/50">Live traffic · 2 min delay</p>
              </div>
              <div className="flex flex-col gap-2">
                <motion.button
                  type="button"
                  className="flex h-11 w-11 items-center justify-center rounded-[10px] bg-white/5 text-white/70 hover:bg-white/10"
                  whileTap={{ scale: 0.95, opacity: 0.8 }}
                >
                  <CompassIcon />
                </motion.button>
                <motion.button
                  type="button"
                  className="flex h-11 w-11 items-center justify-center rounded-[10px] bg-white/5 text-white/70 hover:bg-white/10"
                  whileTap={{ scale: 0.95, opacity: 0.8 }}
                >
                  <PlusIcon />
                </motion.button>
                <motion.button
                  type="button"
                  className="flex h-11 w-11 items-center justify-center rounded-[10px] bg-white/5 text-white/70 hover:bg-white/10"
                  whileTap={{ scale: 0.95, opacity: 0.8 }}
                >
                  <MinusIcon />
                </motion.button>
              </div>
            </div>
            <div className="mt-auto px-6 pb-6">
              <div className="flex gap-3">
                {[
                  { label: "Home", sub: "22 min" },
                  { label: "Work", sub: "38 min" },
                ].map((item) => (
                  <motion.button
                    key={item.label}
                    type="button"
                    className="flex min-h-[44px] flex-1 items-center justify-between rounded-[12px] bg-white/5 px-4 py-3 text-left hover:bg-white/10"
                    whileTap={{ scale: 0.95, opacity: 0.8 }}
                  >
                    <span className="text-sm font-medium text-white/90">{item.label}</span>
                    <span className="text-xs uppercase tracking-[0.2em] text-white/50">{item.sub}</span>
                  </motion.button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="flex h-full flex-col gap-4">
          <div className="rounded-[16px] bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.3em] text-white/60">Recent</p>
            <div className="mt-4 space-y-3">
              {[
                { title: "Nordic Museum", meta: "12 km · 18 min" },
                { title: "T-Centralen", meta: "3 km · 6 min" },
                { title: "Arlanda Airport", meta: "41 km · 32 min" },
              ].map((item) => (
                <motion.button
                  key={item.title}
                  type="button"
                  className="flex min-h-[44px] w-full items-center gap-3 rounded-[12px] bg-white/5 px-3 py-2 text-left hover:bg-white/10"
                  whileTap={{ scale: 0.95, opacity: 0.8 }}
                >
                  <RecentPinIcon />
                  <div>
                    <p className="text-sm text-white/90">{item.title}</p>
                    <p className="text-xs uppercase tracking-[0.2em] text-white/50">{item.meta}</p>
                  </div>
                </motion.button>
              ))}
            </div>
          </div>

          <div className="rounded-[16px] bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.3em] text-white/60">Trip suggestions</p>
            <div className="mt-4 space-y-3">
              {[
                { title: "Supercharger · 4 stalls", meta: "2.1 km" },
                { title: "Coffee stop", meta: "1.3 km" },
              ].map((item) => (
                <motion.button
                  key={item.title}
                  type="button"
                  className="flex min-h-[44px] w-full items-center justify-between rounded-[12px] bg-white/5 px-3 py-2 text-left hover:bg-white/10"
                  whileTap={{ scale: 0.95, opacity: 0.8 }}
                >
                  <div>
                    <p className="text-sm text-white/90">{item.title}</p>
                    <p className="text-xs uppercase tracking-[0.2em] text-white/50">{item.meta}</p>
                  </div>
                  <span className="text-xs uppercase tracking-[0.3em] text-white/50">Go</span>
                </motion.button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
