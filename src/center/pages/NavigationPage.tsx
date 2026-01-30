import mapboxgl from "mapbox-gl";
import { motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState } from "react";
import { useGpsPosition } from "../hooks/useGpsPosition";

/**
 * Real turn-by-turn (web) using:
 * - Mapbox Directions (steps=true) for maneuvers
 * - Live GPS (watchPosition) for position + heading
 * - Route progress / step advancement using:
 *    (A) distance-to-next-maneuver threshold
 *    (B) off-route detection via nearest point to polyline (fast-ish)
 * - Camera follow mode with bearing + pitch
 *
 * Notes:
 * - This is "real" turn-by-turn UI logic for the web.
 * - It's not the same as Mapbox’s mobile Navigation SDK (which does map matching / snapping).
 *   But this is the correct approach for a custom web dash.
 */

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
    <path
      d="M15 9l-2.5 6L9 15l6-6z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
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

type Maneuver = {
  instruction: string;
  type?: string;
  modifier?: string;
  location: { lat: number; lng: number };
};

type RouteStep = {
  instruction: string;
  distanceMeters: number;
  durationSeconds: number;
  maneuver: Maneuver;
  geometry?: [number, number][]; // step polyline if we request it later (optional)
};

type RouteState = {
  distanceMeters: number;
  durationSeconds: number;
  coordinates: [number, number][];
  steps: RouteStep[];
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

const toRad = (v: number) => (v * Math.PI) / 180;
const EARTH_R = 6371000;

const haversineMeters = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);
  const c = 2 * Math.asin(Math.sqrt(sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLng * sinDLng));
  return EARTH_R * c;
};

/** Approx bearing degrees from a->b */
const bearingDegrees = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
  const φ1 = toRad(a.lat);
  const φ2 = toRad(b.lat);
  const Δλ = toRad(b.lng - a.lng);
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  const θ = Math.atan2(y, x);
  return ((θ * 180) / Math.PI + 360) % 360;
};

/**
 * Fast-ish "off-route" distance by checking nearest distance to line segments.
 * This uses a planar approximation good enough for small distances (a few km).
 * Return min meters to polyline.
 */
const nearestDistanceToPolylineMeters = (pos: { lat: number; lng: number }, poly: [number, number][]) => {
  if (poly.length < 2) return Number.POSITIVE_INFINITY;

  // Equirectangular projection relative to pos (local)
  const lat0 = toRad(pos.lat);
  const cosLat = Math.cos(lat0);

  const x0 = 0;
  const y0 = 0;

  const toXY = (lng: number, lat: number) => {
    const x = (toRad(lng - pos.lng) * cosLat) * EARTH_R;
    const y = (toRad(lat - pos.lat)) * EARTH_R;
    return { x, y };
  };

  let best = Number.POSITIVE_INFINITY;
  for (let i = 0; i < poly.length - 1; i++) {
    const [lng1, lat1] = poly[i];
    const [lng2, lat2] = poly[i + 1];
    const p1 = toXY(lng1, lat1);
    const p2 = toXY(lng2, lat2);

    const vx = p2.x - p1.x;
    const vy = p2.y - p1.y;
    const wx = x0 - p1.x;
    const wy = y0 - p1.y;

    const c1 = vx * wx + vy * wy;
    const c2 = vx * vx + vy * vy;

    let t = c2 > 0 ? c1 / c2 : 0;
    t = Math.max(0, Math.min(1, t));

    const projX = p1.x + t * vx;
    const projY = p1.y + t * vy;
    const dx = x0 - projX;
    const dy = y0 - projY;
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d < best) best = d;
  }

  return best;
};

const speak = (text: string) => {
  // Optional: browser TTS (works well in-car if your WebView allows it)
  try {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 1.05;
    u.pitch = 1.0;
    window.speechSynthesis.speak(u);
  } catch {
    // ignore
  }
};

export default function NavigationPage() {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const userMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const destinationMarkerRef = useRef<mapboxgl.Marker | null>(null);

  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);

  const [searchValue, setSearchValue] = useState("");
  const [predictions, setPredictions] = useState<MapPlace[]>([]);
  const [recentPlaces, setRecentPlaces] = useState<MapPlace[]>([
    { id: "recent-1", name: "Nordic Museum", address: "Stockholm", location: { lat: 59.3296, lng: 18.0837 } },
    { id: "recent-2", name: "T-Centralen", address: "Stockholm", location: { lat: 59.3316, lng: 18.0629 } },
    { id: "recent-3", name: "Arlanda Airport", address: "Sigtuna", location: { lat: 59.6519, lng: 17.9186 } },
  ]);
  const [suggestions, setSuggestions] = useState<MapPlace[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<MapPlace | null>(null);

  const [navActive, setNavActive] = useState(false);
  const [route, setRoute] = useState<RouteState | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);

  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [userHeading, setUserHeading] = useState<number | null>(null);
  const [userSpeedMps, setUserSpeedMps] = useState<number | null>(null);

  const [followMode, setFollowMode] = useState(true);
  const [lastRerouteAt, setLastRerouteAt] = useState(0);
  const [lastSpokenStepIndex, setLastSpokenStepIndex] = useState<number | null>(null);
  const gpsPosition = useGpsPosition();

  const mapboxToken = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined;
  const defaultCenter = useMemo(() => ({ lat: 59.3293, lng: 18.0686 }), []);

  const updateRouteLine = (coordinates: [number, number][]) => {
    if (!mapRef.current || !mapReady) return;
    const map = mapRef.current;

    const data = {
      type: "Feature",
      properties: {},
      geometry: { type: "LineString", coordinates },
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
        "line-opacity": 0.95,
      },
    });
  };

  const clearRouteLine = () => {
    const map = mapRef.current;
    if (!map) return;
    try {
      if (map.getLayer("route-line")) map.removeLayer("route-line");
      if (map.getSource("route")) map.removeSource("route");
    } catch {
      // ignore
    }
  };

  const setCameraFollow = (loc: { lat: number; lng: number }, heading?: number | null) => {
    const map = mapRef.current;
    if (!map) return;

    // More "nav feel"
    const bearing = heading ?? map.getBearing();
    map.easeTo({
      center: [loc.lng, loc.lat],
      zoom: Math.max(map.getZoom(), 15),
      bearing,
      pitch: 55,
      duration: 450,
      easing: (t) => t,
    });
  };

  const enableMapInteractions = (map: mapboxgl.Map) => {
    map.dragPan.enable();
    map.scrollZoom.enable();
    map.doubleClickZoom.enable();
    map.boxZoom.enable();
    map.keyboard?.enable();
    map.dragRotate?.enable();
    map.touchZoomRotate?.enable();
  };

  // Init map
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
      enableMapInteractions(map);
    });

    // If user drags map, disable follow mode
    const stopFollow = () => setFollowMode(false);
    map.on("dragstart", stopFollow);
    map.on("rotatestart", stopFollow);
    map.on("pitchstart", stopFollow);
    map.on("zoomstart", stopFollow);

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [mapboxToken, defaultCenter]);

  useEffect(() => {
    const map = mapRef.current;
    if (!gpsPosition?.location || !mapReady || !map) return;
    const coords = gpsPosition.location;
    setUserLocation(coords);
    setUserHeading(gpsPosition.heading ?? null);
    setUserSpeedMps(gpsPosition.speedMps ?? null);

    if (!userMarkerRef.current) {
      userMarkerRef.current = new mapboxgl.Marker({ color: "#7ee3ff" })
        .setLngLat([coords.lng, coords.lat])
        .addTo(map);
    } else {
      userMarkerRef.current.setLngLat([coords.lng, coords.lat]);
    }

    if (followMode) {
      setCameraFollow(coords, gpsPosition.heading ?? null);
    }
  }, [gpsPosition, followMode, mapReady]);

  // Search (geocoding)
  useEffect(() => {
    if (!mapboxToken) return;
    if (!searchValue.trim()) {
      setPredictions([]);
      return;
    }

    const timer = window.setTimeout(async () => {
      try {
        const proximity = userLocation ? `${userLocation.lng},${userLocation.lat}` : `${defaultCenter.lng},${defaultCenter.lat}`;
        const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
          searchValue
        )}.json?access_token=${mapboxToken}&autocomplete=true&limit=5&proximity=${proximity}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error("Mapbox geocoding failed");
        const data = await res.json();
        const mapped = (data.features ?? []).map((f: any) => ({
          id: f.id,
          name: f.text,
          address: f.place_name,
          location: { lat: f.center[1], lng: f.center[0] },
        })) as MapPlace[];
        setPredictions(mapped);
      } catch {
        setPredictions([]);
        setMapError("Mapbox search failed");
      }
    }, 250);

    return () => window.clearTimeout(timer);
  }, [searchValue, mapboxToken, userLocation, defaultCenter]);

  // Suggestions
  useEffect(() => {
    if (!mapboxToken) return;
    const location = userLocation ?? defaultCenter;

    const fetchSuggestions = async (query: string) => {
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
        query
      )}.json?access_token=${mapboxToken}&limit=2&proximity=${location.lng},${location.lat}`;
      const res = await fetch(url);
      if (!res.ok) return [] as MapPlace[];
      const data = await res.json();
      return (data.features ?? []).map((f: any) => ({
        id: f.id,
        name: f.text,
        address: f.place_name,
        location: { lat: f.center[1], lng: f.center[0] },
      })) as MapPlace[];
    };

    Promise.all([fetchSuggestions("charging station"), fetchSuggestions("coffee")])
      .then((groups) => setSuggestions(groups.flat()))
      .catch(() => setSuggestions([]));
  }, [mapboxToken, userLocation, defaultCenter]);

  const applyDestination = (place: MapPlace) => {
    setSelectedPlace(place);
    setSearchValue(place.name);
    setPredictions([]);
    setMapError(null);

    if (mapRef.current) {
      mapRef.current.flyTo({ center: [place.location.lng, place.location.lat], zoom: 13, duration: 500 });
    }

    if (mapRef.current && !destinationMarkerRef.current) {
      destinationMarkerRef.current = new mapboxgl.Marker({ color: "#f3a0b5" })
        .setLngLat([place.location.lng, place.location.lat])
        .addTo(mapRef.current);
    } else if (destinationMarkerRef.current) {
      destinationMarkerRef.current.setLngLat([place.location.lng, place.location.lat]);
    }

    setRecentPlaces((prev) => [place, ...prev.filter((x) => x.id !== place.id)].slice(0, 3));
  };

  const geocodeQuery = async (query: string): Promise<MapPlace | null> => {
    if (!mapboxToken) return null;
    const proximity = userLocation ? `${userLocation.lng},${userLocation.lat}` : `${defaultCenter.lng},${defaultCenter.lat}`;
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
      query
    )}.json?access_token=${mapboxToken}&limit=1&proximity=${proximity}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const f = data.features?.[0];
    if (!f) return null;
    return { id: f.id, name: f.text, address: f.place_name, location: { lat: f.center[1], lng: f.center[0] } };
  };

  const fetchRoute = async (origin: { lat: number; lng: number }, dest: { lat: number; lng: number }) => {
    if (!mapboxToken) throw new Error("Missing token");

    // steps=true gives maneuver instructions.
    // geometries=geojson gives the full route polyline coordinates.
    const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${origin.lng},${origin.lat};${dest.lng},${dest.lat}?geometries=geojson&steps=true&overview=full&access_token=${mapboxToken}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Mapbox directions failed");
    const data = await res.json();

    const r = data.routes?.[0];
    if (!r) throw new Error("No route available");

    const coordinates = (r.geometry?.coordinates ?? []) as [number, number][];
    const leg = r.legs?.[0];
    const stepsRaw = (leg?.steps ?? []) as any[];

    const steps: RouteStep[] = stepsRaw.map((s) => ({
      instruction: s.maneuver?.instruction ?? "",
      distanceMeters: Number(s.distance ?? 0),
      durationSeconds: Number(s.duration ?? 0),
      maneuver: {
        instruction: s.maneuver?.instruction ?? "",
        type: s.maneuver?.type,
        modifier: s.maneuver?.modifier,
        location: { lng: s.maneuver?.location?.[0] ?? dest.lng, lat: s.maneuver?.location?.[1] ?? dest.lat },
      },
    }));

    const out: RouteState = {
      distanceMeters: Number(r.distance ?? 0),
      durationSeconds: Number(r.duration ?? 0),
      coordinates,
      steps,
    };
    return out;
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

    try {
      setMapError(null);
      const r = await fetchRoute(origin, target.location);

      clearRouteLine();
      updateRouteLine(r.coordinates);

      setRoute(r);
      setCurrentStepIndex(0);
      setNavActive(true);
      setFollowMode(true);
      setLastRerouteAt(Date.now());
      setLastSpokenStepIndex(null);

      // Frame route overview quickly before following
      if (mapRef.current && r.coordinates.length > 1) {
        const bounds = r.coordinates.reduce((b, [lng, lat]) => b.extend([lng, lat]), new mapboxgl.LngLatBounds(r.coordinates[0], r.coordinates[0]));
        mapRef.current.fitBounds(bounds, { padding: 80, duration: 500 });
        window.setTimeout(() => {
          const loc = userLocation ?? origin;
          setCameraFollow(loc, userHeading);
        }, 600);
      }

      // Speak the first instruction (optional)
      if (r.steps[0]?.instruction) speak(r.steps[0].instruction);
      setLastSpokenStepIndex(0);
    } catch {
      setMapError("Mapbox directions failed");
      setNavActive(false);
    }
  };

  const stopNavigation = () => {
    setNavActive(false);
    setRoute(null);
    setCurrentStepIndex(0);
    setLastSpokenStepIndex(null);
    clearRouteLine();
  };

  /**
   * Turn-by-turn engine (runs on location updates)
   * - Advance step as you approach its maneuver location
   * - Provide "in 200m ..." callouts
   * - Off-route detection and reroute debounce
   */
  useEffect(() => {
    if (!navActive || !route || !userLocation || !selectedPlace) return;

    const steps = route.steps;
    if (steps.length === 0) return;

    const cur = steps[currentStepIndex];
    if (!cur) return;

    const distToManeuver = haversineMeters(userLocation, cur.maneuver.location);

    // Step advancement threshold:
    // - slower speeds -> smaller threshold
    // - faster speeds -> bigger threshold
    const speed = userSpeedMps ?? 0;
    const dynamicArrive = Math.min(45, Math.max(18, 18 + speed * 1.8)); // 18m .. 45m

    // Voice callouts thresholds
    const announceFar = 220; // meters
    const announceNear = 60; // meters

    // Speak callout for current step once as you get close-ish
    if (lastSpokenStepIndex !== currentStepIndex) {
      // already spoke something else; do nothing here
    } else {
      // if we already spoke the step instruction at start, we can do distance callouts
      // We'll do a "In X meters..." once at far threshold, and again near threshold, but avoid spam.
    }

    // We’ll keep a tiny bit of state in localStorage-like ref to avoid re-saying callouts.
    // (Using a ref to keep it simple.)
  }, [navActive, route, userLocation, selectedPlace, currentStepIndex, userSpeedMps, lastSpokenStepIndex]);

  // Callout state (refs so it doesn’t re-render)
  const calloutRef = useRef<{ stepIndex: number; far: boolean; near: boolean }>({ stepIndex: -1, far: false, near: false });

  useEffect(() => {
    if (!navActive || !route || !userLocation) return;

    const steps = route.steps;
    if (steps.length === 0) return;

    const cur = steps[currentStepIndex];
    if (!cur) return;

    const distToManeuver = haversineMeters(userLocation, cur.maneuver.location);
    const speed = userSpeedMps ?? 0;
    const dynamicArrive = Math.min(45, Math.max(18, 18 + speed * 1.8)); // 18..45m

    // Initialize callout flags for this step
    if (calloutRef.current.stepIndex !== currentStepIndex) {
      calloutRef.current = { stepIndex: currentStepIndex, far: false, near: false };
      // Speak step instruction once when it becomes current
      if (cur.instruction) {
        speak(cur.instruction);
        setLastSpokenStepIndex(currentStepIndex);
      }
    }

    // Distance callouts
    const farThreshold = 220;
    const nearThreshold = 60;

    if (!calloutRef.current.far && distToManeuver <= farThreshold && distToManeuver > nearThreshold) {
      calloutRef.current.far = true;
      speak(`In ${Math.round(distToManeuver)} meters, ${cur.instruction}`);
    }

    if (!calloutRef.current.near && distToManeuver <= nearThreshold && distToManeuver > dynamicArrive) {
      calloutRef.current.near = true;
      speak(`In ${Math.round(distToManeuver)} meters`);
    }

    // Advance step when "arrived" at maneuver point
    if (distToManeuver <= dynamicArrive) {
      if (currentStepIndex < steps.length - 1) {
        setCurrentStepIndex((i) => Math.min(i + 1, steps.length - 1));
      } else {
        // Arrived destination
        speak("You have arrived.");
        setNavActive(false);
      }
    }

    // Off-route detection
    const now = Date.now();
    const last = lastRerouteAt;

    // If route polyline is long, sampling all points can be heavy.
    // We'll downsample by stepping through every Nth point, depending on length.
    const coords = route.coordinates;
    const step = coords.length > 500 ? 5 : coords.length > 200 ? 3 : 1;
    const sampled: [number, number][] = [];
    for (let i = 0; i < coords.length; i += step) sampled.push(coords[i]);
    if (sampled[sampled.length - 1] !== coords[coords.length - 1]) sampled.push(coords[coords.length - 1]);

    const distToRoute = nearestDistanceToPolylineMeters(userLocation, sampled);

    // Thresholds: bigger when fast
    const offRouteThreshold = Math.min(90, Math.max(45, 45 + speed * 2.2)); // 45..90m
    const rerouteCooldownMs = 15000;

    if (distToRoute > offRouteThreshold && now - last > rerouteCooldownMs) {
      setLastRerouteAt(now);
      // reroute to the same destination:
      // We need destination location; use destination marker / selectedPlace
      // If selectedPlace moved, still ok.
      if (selectedPlace) startNavigation(selectedPlace);
    }
  }, [navActive, route, userLocation, currentStepIndex, userSpeedMps, lastRerouteAt, selectedPlace]);

  const handleZoom = (delta: number) => {
    if (!mapRef.current) return;
    mapRef.current.zoomTo(mapRef.current.getZoom() + delta, { duration: 250 });
  };

  const handleRecenter = () => {
    if (!mapRef.current) return;
    const center = userLocation ?? defaultCenter;
    setFollowMode(true);
    setCameraFollow(center, userHeading);
  };

  const selectPlace = (place: MapPlace, startRoute = false) => {
    applyDestination(place);
    if (startRoute) startNavigation(place);
  };

  const currentStep = route?.steps?.[currentStepIndex];
  const nextStep = route?.steps?.[currentStepIndex + 1];

  const remainingToManeuver = useMemo(() => {
    if (!userLocation || !currentStep) return null;
    return haversineMeters(userLocation, currentStep.maneuver.location);
  }, [userLocation, currentStep]);

  const headerDistance = route ? formatDistance(route.distanceMeters) : "";
  const headerDuration = route ? formatDuration(route.durationSeconds) : "";

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

        {!navActive ? (
          <motion.button
            type="button"
            className={`h-11 rounded-[10px] px-4 text-xs uppercase tracking-[0.3em] ${
              selectedPlace ? "bg-white/5 text-white/70 hover:bg-white/10" : "bg-white/5 text-white/30"
            }`}
            whileTap={{ scale: 0.95, opacity: 0.8 }}
            onClick={() => startNavigation()}
          >
            Start
          </motion.button>
        ) : (
          <motion.button
            type="button"
            className="h-11 rounded-[10px] bg-red-500/10 px-4 text-xs uppercase tracking-[0.3em] text-red-200 hover:bg-red-500/20"
            whileTap={{ scale: 0.95, opacity: 0.8 }}
            onClick={stopNavigation}
          >
            Stop
          </motion.button>
        )}
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
                  {navActive ? "Navigating" : "Ready"}
                  {headerDuration ? ` · ${headerDuration}` : ""}
                  {headerDistance ? ` · ${headerDistance}` : ""}
                </p>
                {userSpeedMps != null && (
                  <p className="mt-1 text-xs uppercase tracking-[0.2em] text-white/40">
                    Speed: {Math.round(userSpeedMps * 3.6)} km/h {userHeading != null ? `· Heading: ${Math.round(userHeading)}°` : ""}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-2">
                <motion.button
                  type="button"
                  className="flex h-11 w-11 items-center justify-center rounded-[10px] bg-white/5 text-white/70 hover:bg-white/10"
                  whileTap={{ scale: 0.95, opacity: 0.8 }}
                  onClick={handleRecenter}
                  title="Follow"
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
                <p className="text-[10px] uppercase tracking-[0.3em] text-white/50">Turn-by-turn</p>

                {navActive && currentStep ? (
                  <div className="mt-2">
                    <p className="text-base font-medium text-white/90">{currentStep.instruction}</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.2em] text-white/50">
                      {remainingToManeuver != null ? `${formatDistance(remainingToManeuver)} to maneuver` : ""}
                    </p>
                    {nextStep && (
                      <p className="mt-2 text-xs uppercase tracking-[0.2em] text-white/40">Next: {nextStep.instruction}</p>
                    )}
                  </div>
                ) : (
                  <p className="mt-2 text-xs uppercase tracking-[0.2em] text-white/40">
                    {selectedPlace ? "Press Start to navigate" : "Select a destination to start navigation"}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex h-full min-h-0 flex-col gap-4">
          <div className="flex min-h-0 flex-1 flex-col rounded-[16px] bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.3em] text-white/60">{predictions.length > 0 ? "Search results" : "Recent"}</p>
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
                    { id: "suggestion-1", name: "Supercharger · 4 stalls", address: "Nearby", location: defaultCenter },
                    { id: "suggestion-2", name: "Coffee stop", address: "Nearby", location: defaultCenter },
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
