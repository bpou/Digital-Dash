import mapboxgl from "mapbox-gl";
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

type MapPlace = {
  id: string;
  name: string;
  address?: string;
  location: { lat: number; lng: number };
};

type RouteStep = {
  instruction: string;
  distance?: string;
  duration?: string;
  endLocation: { lat: number; lng: number };
};

const formatDistance = (meters: number) => {
  if (!Number.isFinite(meters)) return "";
  if (meters >= 1000) return `${(meters / 1000).toFixed(1)} km`;
  return `${Math.round(meters)} m`;
};

const formatDuration = (seconds: number) => {
  if (!Number.isFinite(seconds)) return "";
  if (seconds >= 3600) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.round((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  }
  return `${Math.max(1, Math.round(seconds / 60))} min`;
};

const distanceMeters = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const earthRadius = 6371000;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const c = 2 * Math.asin(Math.sqrt(sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng));
  return earthRadius * c;
};

export default function NavigationPage() {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const destinationMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [searchValue, setSearchValue] = useState("");
  const [predictions, setPredictions] = useState<MapPlace[]>([]);
  const [recentPlaces, setRecentPlaces] = useState<MapPlace[]>([
    { id: "recent-1", name: "Nordic Museum", address: "12 km · 18 min", location: { lat: 59.3296, lng: 18.0837 } },
    { id: "recent-2", name: "T-Centralen", address: "3 km · 6 min", location: { lat: 59.3316, lng: 18.0629 } },
    { id: "recent-3", name: "Arlanda Airport", address: "41 km · 32 min", location: { lat: 59.6519, lng: 17.9186 } },
  ]);
  const [suggestions, setSuggestions] = useState<MapPlace[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<MapPlace | null>(null);
  const [routeInfo, setRouteInfo] = useState<{ distance?: string; duration?: string } | null>(null);
  const [routeSteps, setRouteSteps] = useState<RouteStep[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [routePath, setRoutePath] = useState<[number, number][]>([]);
  const [routeDestination, setRouteDestination] = useState<MapPlace | null>(null);
  const [lastRerouteAt, setLastRerouteAt] = useState(0);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined;
  const defaultCenter = useMemo(() => ({ lat: 59.3293, lng: 18.0686 }), []);

  const updateRouteLine = (coordinates: [number, number][]) => {
    if (!mapRef.current || !mapReady) return;
    const map = mapRef.current;
    const data = {
      type: "Feature",
      properties: {},
      geometry: {
        type: "LineString",
        coordinates,
      },
    } as const;

    const source = map.getSource("route") as mapboxgl.GeoJSONSource | undefined;
    if (source) {
      source.setData(data);
      return;
    }

    map.addSource("route", { type: "geojson", data });
    map.addLayer({
      id: "route-line",
      type: "line",
      source: "route",
      paint: {
        "line-color": "#7ee3ff",
        "line-width": 5,
        "line-opacity": 0.9,
      },
    });
  };

  useEffect(() => {
    if (!mapboxToken) {
      setMapError("Missing Mapbox token");
      return;
    }
    if (!mapContainerRef.current || mapRef.current) return;

    mapboxgl.accessToken = mapboxToken;
    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: "mapbox://styles/mapbox/navigation-night-v1",
      center: [defaultCenter.lng, defaultCenter.lat],
      zoom: 12,
      pitch: 0,
      bearing: 0,
      attributionControl: false,
    });

    mapRef.current = map;
    map.on("load", () => {
      setMapReady(true);
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [mapboxToken, defaultCenter]);

  useEffect(() => {
    if (!navigator.geolocation) return;
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const coords = { lat: position.coords.latitude, lng: position.coords.longitude };
        setUserLocation(coords);
        if (mapRef.current) {
          mapRef.current.setCenter([coords.lng, coords.lat]);
        }
        if (mapRef.current && !markerRef.current) {
          markerRef.current = new mapboxgl.Marker({ color: "#7ee3ff" })
            .setLngLat([coords.lng, coords.lat])
            .addTo(mapRef.current);
        } else if (markerRef.current) {
          markerRef.current.setLngLat([coords.lng, coords.lat]);
        }
      },
      () => {
        // keep default center if geolocation fails
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  useEffect(() => {
    if (!userLocation || !routeDestination) return;

    if (routeSteps.length > 0) {
      const currentStep = routeSteps[currentStepIndex];
      if (currentStep) {
        const distanceToEnd = distanceMeters(userLocation, currentStep.endLocation);
        if (distanceToEnd < 25 && currentStepIndex < routeSteps.length - 1) {
          setCurrentStepIndex((index) => Math.min(index + 1, routeSteps.length - 1));
        }
      }
    }

    if (routePath.length > 0) {
      let minDistance = Number.POSITIVE_INFINITY;
      routePath.forEach(([lng, lat]) => {
        const distance = distanceMeters(userLocation, { lat, lng });
        if (distance < minDistance) {
          minDistance = distance;
        }
      });

      const now = Date.now();
      if (minDistance > 50 && now - lastRerouteAt > 15000) {
        setLastRerouteAt(now);
        startNavigation(routeDestination);
      }
    }
  }, [userLocation, routeDestination, routeSteps, currentStepIndex, routePath, lastRerouteAt]);

  const currentStep = routeSteps[currentStepIndex];
  const nextStep = routeSteps[currentStepIndex + 1];

  useEffect(() => {
    if (!mapboxToken) return;
    if (!searchValue.trim()) {
      setPredictions([]);
      return;
    }
    const timer = window.setTimeout(async () => {
      try {
        const proximity = userLocation ? `${userLocation.lng},${userLocation.lat}` : `${defaultCenter.lng},${defaultCenter.lat}`;
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(searchValue)}.json?access_token=${mapboxToken}&autocomplete=true&limit=5&proximity=${proximity}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error("Mapbox geocoding failed");
        const data = await res.json();
        const mapped = (data.features ?? []).map((feature: any) => ({
          id: feature.id,
          name: feature.text,
          address: feature.place_name,
          location: { lat: feature.center[1], lng: feature.center[0] },
        }));
        setPredictions(mapped);
      } catch {
        setPredictions([]);
        setMapError("Mapbox search failed");
      }
    }, 250);

    return () => window.clearTimeout(timer);
  }, [searchValue, mapboxToken, userLocation, defaultCenter]);

  useEffect(() => {
    if (!mapboxToken) return;
    const location = userLocation ?? defaultCenter;

    const fetchSuggestions = async (query: string) => {
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${mapboxToken}&limit=2&proximity=${location.lng},${location.lat}`;
      const res = await fetch(url);
      if (!res.ok) return [] as MapPlace[];
      const data = await res.json();
      return (data.features ?? []).map((feature: any) => ({
        id: feature.id,
        name: feature.text,
        address: feature.place_name,
        location: { lat: feature.center[1], lng: feature.center[0] },
      }));
    };

    Promise.all([fetchSuggestions("charging station"), fetchSuggestions("coffee")])
      .then((groups) => setSuggestions(groups.flat()))
      .catch(() => setSuggestions([]));
  }, [mapboxToken, userLocation, defaultCenter]);

  const geocodeQuery = async (query: string): Promise<MapPlace | null> => {
    if (!mapboxToken) return null;
    const proximity = userLocation ? `${userLocation.lng},${userLocation.lat}` : `${defaultCenter.lng},${defaultCenter.lat}`;
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${mapboxToken}&limit=1&proximity=${proximity}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const feature = data.features?.[0];
    if (!feature) return null;
    return {
      id: feature.id,
      name: feature.text,
      address: feature.place_name,
      location: { lat: feature.center[1], lng: feature.center[0] },
    };
  };

  const applyDestination = (place: MapPlace) => {
    setSelectedPlace(place);
    setRouteInfo(null);
    if (mapRef.current) {
      mapRef.current.flyTo({ center: [place.location.lng, place.location.lat], zoom: 13 });
    }
    if (mapRef.current && !destinationMarkerRef.current) {
      destinationMarkerRef.current = new mapboxgl.Marker({ color: "#f3a0b5" })
        .setLngLat([place.location.lng, place.location.lat])
        .addTo(mapRef.current);
    } else if (destinationMarkerRef.current) {
      destinationMarkerRef.current.setLngLat([place.location.lng, place.location.lat]);
    }
    setRecentPlaces((prev) => [place, ...prev.filter((item) => item.id !== place.id)].slice(0, 3));
    setSearchValue(place.name);
    setPredictions([]);
  };

  const selectPlace = (place: MapPlace, startRoute = false) => {
    applyDestination(place);
    if (startRoute) {
      startNavigation(place);
    }
  };

  const startNavigation = async (destination?: MapPlace) => {
    if (!mapboxToken) return;
    let target = destination ?? selectedPlace;
    if (!target && searchValue.trim()) {
      const resolved = await geocodeQuery(searchValue.trim());
      if (resolved) {
        applyDestination(resolved);
        target = resolved;
      }
    }
    if (!target) {
      setMapError("Select a destination");
      return;
    }
    const origin = userLocation ?? defaultCenter;
    setRouteDestination(target);
    try {
      const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${origin.lng},${origin.lat};${target.location.lng},${target.location.lat}?geometries=geojson&steps=true&access_token=${mapboxToken}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Mapbox directions failed");
      const data = await res.json();
      const route = data.routes?.[0];
      if (!route) throw new Error("No route available");

      const coordinates = route.geometry?.coordinates ?? [];
      updateRouteLine(coordinates);
      setRoutePath(coordinates);
      setRouteInfo({
        distance: formatDistance(route.distance ?? 0),
        duration: formatDuration(route.duration ?? 0),
      });
      const steps: RouteStep[] = (route.legs?.[0]?.steps ?? []).map((step: any) => ({
        instruction: step.maneuver?.instruction ?? "",
        distance: formatDistance(step.distance ?? 0),
        duration: formatDuration(step.duration ?? 0),
        endLocation: { lat: step.maneuver?.location?.[1] ?? target.location.lat, lng: step.maneuver?.location?.[0] ?? target.location.lng },
      }));
      setRouteSteps(steps);
      setCurrentStepIndex(0);
    } catch {
      setMapError("Mapbox directions failed");
    }
  };

  const handleZoom = (delta: number) => {
    if (!mapRef.current) return;
    mapRef.current.zoomTo(mapRef.current.getZoom() + delta, { duration: 250 });
  };

  const handleRecenter = () => {
    if (!mapRef.current) return;
    const center = userLocation ?? defaultCenter;
    mapRef.current.flyTo({ center: [center.lng, center.lat], zoom: 13 });
  };

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
        <div className="relative flex h-11 flex-1 items-center gap-3 rounded-[12px] bg-white/5 px-4 text-white/70">
          <SearchIcon />
          <input
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
            placeholder="Search destination"
            className="w-full bg-transparent text-sm uppercase tracking-[0.2em] text-white/80 placeholder:text-white/40 focus:outline-none"
          />
        </div>
        <motion.button
          type="button"
          className={`h-11 rounded-[10px] px-4 text-xs uppercase tracking-[0.3em] ${selectedPlace ? "bg-white/5 text-white/70 hover:bg-white/10" : "bg-white/5 text-white/30"}`}
          whileTap={{ scale: 0.95, opacity: 0.8 }}
          onClick={() => startNavigation()}
        >
          Start
        </motion.button>
      </div>

      <div className="grid flex-1 min-h-0 grid-cols-[2fr_1fr] gap-4">
        <div className="relative flex h-full flex-col overflow-hidden rounded-[16px] bg-white/5">
          <div ref={mapContainerRef} className="absolute inset-0 overflow-hidden rounded-[16px]" />
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
                <p className="mt-2 text-lg font-medium text-white/90">{selectedPlace?.name ?? "Stockholm Center"}</p>
                <p className="text-sm text-white/50">
                  Live traffic
                  {routeInfo?.duration ? ` · ${routeInfo.duration}` : ""}
                  {routeInfo?.distance ? ` · ${routeInfo.distance}` : ""}
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <motion.button
                  type="button"
                  className="flex h-11 w-11 items-center justify-center rounded-[10px] bg-white/5 text-white/70 hover:bg-white/10"
                  whileTap={{ scale: 0.95, opacity: 0.8 }}
                  onClick={handleRecenter}
                >
                  <CompassIcon />
                </motion.button>
                <motion.button
                  type="button"
                  className="flex h-11 w-11 items-center justify-center rounded-[10px] bg-white/5 text-white/70 hover:bg-white/10"
                  whileTap={{ scale: 0.95, opacity: 0.8 }}
                  onClick={() => handleZoom(1)}
                >
                  <PlusIcon />
                </motion.button>
                <motion.button
                  type="button"
                  className="flex h-11 w-11 items-center justify-center rounded-[10px] bg-white/5 text-white/70 hover:bg-white/10"
                  whileTap={{ scale: 0.95, opacity: 0.8 }}
                  onClick={() => handleZoom(-1)}
                >
                  <MinusIcon />
                </motion.button>
              </div>
            </div>
            <div className="mt-auto px-6 pb-6">
              <div className="rounded-[16px] border border-white/10 bg-black/60 px-4 py-3">
                <p className="text-[10px] uppercase tracking-[0.3em] text-white/50">Navigation</p>
                {currentStep ? (
                  <div className="mt-2">
                    <p className="text-base font-medium text-white/90">{currentStep.instruction}</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.2em] text-white/50">
                      {currentStep.distance} · {currentStep.duration}
                    </p>
                    {nextStep && (
                      <p className="mt-2 text-xs uppercase tracking-[0.2em] text-white/40">Next: {nextStep.instruction}</p>
                    )}
                  </div>
                ) : (
                  <p className="mt-2 text-xs uppercase tracking-[0.2em] text-white/40">
                    Select a destination to start navigation
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex h-full min-h-0 flex-col gap-4">
          <div className="flex min-h-0 flex-1 flex-col rounded-[16px] bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.3em] text-white/60">
              {predictions.length > 0 ? "Search results" : "Recent"}
            </p>
            <div className="mt-4 space-y-3 overflow-y-auto pr-1">
              {predictions.length > 0
                ? predictions.map((item) => (
                    <motion.button
                      key={item.id}
                      type="button"
                      className="flex min-h-[44px] w-full items-center gap-3 rounded-[12px] bg-white/5 px-3 py-2 text-left hover:bg-white/10"
                      whileTap={{ scale: 0.95, opacity: 0.8 }}
                      onClick={() => selectPlace(item, true)}
                    >
                      <SearchIcon />
                      <div>
                        <p className="text-sm text-white/90">{item.name}</p>
                        <p className="text-xs uppercase tracking-[0.2em] text-white/50">{item.address ?? ""}</p>
                      </div>
                    </motion.button>
                  ))
                : recentPlaces.map((item) => (
                    <motion.button
                      key={item.id}
                      type="button"
                      className="flex min-h-[44px] w-full items-center gap-3 rounded-[12px] bg-white/5 px-3 py-2 text-left hover:bg-white/10"
                      whileTap={{ scale: 0.95, opacity: 0.8 }}
                      onClick={() => selectPlace(item, true)}
                    >
                      <RecentPinIcon />
                      <div>
                        <p className="text-sm text-white/90">{item.name}</p>
                        <p className="text-xs uppercase tracking-[0.2em] text-white/50">{item.address ?? ""}</p>
                      </div>
                    </motion.button>
                  ))}
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col rounded-[16px] bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.3em] text-white/60">Trip suggestions</p>
            <div className="mt-4 space-y-3 overflow-y-auto pr-1">
              {(suggestions.length > 0
                ? suggestions
                : [
                    { id: "suggestion-1", name: "Supercharger · 4 stalls", address: "2.1 km", location: defaultCenter },
                    { id: "suggestion-2", name: "Coffee stop", address: "1.3 km", location: defaultCenter },
                  ]
              ).map((item) => (
                <motion.button
                  key={item.id}
                  type="button"
                  className="flex min-h-[44px] w-full items-center justify-between rounded-[12px] bg-white/5 px-3 py-2 text-left hover:bg-white/10"
                  whileTap={{ scale: 0.95, opacity: 0.8 }}
                  onClick={() => selectPlace(item, true)}
                >
                  <div>
                    <p className="text-sm text-white/90">{item.name}</p>
                    <p className="text-xs uppercase tracking-[0.2em] text-white/50">{item.address ?? ""}</p>
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
