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

type SearchPrediction = {
  place_id: string;
  description: string;
};

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

const stripHtml = (value: string) => value.replace(/<[^>]*>/g, "");

export default function NavigationPage() {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const destinationMarkerRef = useRef<any>(null);
  const trafficRef = useRef<any>(null);
  const directionsRef = useRef<any>(null);
  const servicesRef = useRef<{ autocomplete?: any; places?: any; directions?: any }>({});
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [searchValue, setSearchValue] = useState("");
  const [predictions, setPredictions] = useState<SearchPrediction[]>([]);
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
  const [routePath, setRoutePath] = useState<any[]>([]);
  const [routeDestination, setRouteDestination] = useState<MapPlace | null>(null);
  const [lastRerouteAt, setLastRerouteAt] = useState(0);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
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
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geometry`;
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

    servicesRef.current = {
      autocomplete: new googleMaps.maps.places.AutocompleteService(),
      places: new googleMaps.maps.places.PlacesService(mapRef.current),
      directions: new googleMaps.maps.DirectionsService(),
    };

    directionsRef.current = new googleMaps.maps.DirectionsRenderer({
      map: mapRef.current,
      suppressMarkers: false,
      preserveViewport: false,
      polylineOptions: {
        strokeColor: "#7ee3ff",
        strokeOpacity: 0.9,
        strokeWeight: 5,
      },
    });
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
        setUserLocation(coords);
        mapRef.current.setCenter(coords);
        if (!markerRef.current && googleMaps?.maps) {
          markerRef.current = new googleMaps.maps.Marker({
            position: coords,
            map: mapRef.current,
            icon: {
              path: googleMaps.maps.SymbolPath.CIRCLE,
              scale: 7,
              fillColor: "#7ee3ff",
              fillOpacity: 0.9,
              strokeColor: "#0b1b22",
              strokeWeight: 2,
            },
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

  useEffect(() => {
    if (!userLocation || !routeDestination) return;
    const googleMaps = (window as any).google;
    if (!googleMaps?.maps?.geometry?.spherical) return;

    if (routeSteps.length > 0) {
      const currentStep = routeSteps[currentStepIndex];
      if (currentStep) {
        const currentLatLng = new googleMaps.maps.LatLng(userLocation.lat, userLocation.lng);
        const stepLatLng = new googleMaps.maps.LatLng(currentStep.endLocation.lat, currentStep.endLocation.lng);
        const distanceToEnd = googleMaps.maps.geometry.spherical.computeDistanceBetween(
          currentLatLng,
          stepLatLng
        );
        if (distanceToEnd < 25 && currentStepIndex < routeSteps.length - 1) {
          setCurrentStepIndex((index) => Math.min(index + 1, routeSteps.length - 1));
        }
      }
    }

    if (routePath.length > 0) {
      const currentLatLng = new googleMaps.maps.LatLng(userLocation.lat, userLocation.lng);
      let minDistance = Number.POSITIVE_INFINITY;
      routePath.forEach((point: any) => {
        const distance = googleMaps.maps.geometry.spherical.computeDistanceBetween(currentLatLng, point);
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
    if (!mapReady) return;
    if (!servicesRef.current.autocomplete) return;
    if (!searchValue.trim()) {
      setPredictions([]);
      return;
    }

    const timer = window.setTimeout(() => {
      servicesRef.current.autocomplete.getPlacePredictions(
        {
          input: searchValue,
          location: userLocation ?? defaultCenter,
          radius: 50000,
        },
        (items: SearchPrediction[] | null, status: string) => {
          if (status === "REQUEST_DENIED") {
            setMapError("Places API not enabled or key restriction blocked");
          }
          if (status !== "OK" || !items) {
            setPredictions([]);
            return;
          }
          setPredictions(items.slice(0, 5));
        }
      );
    }, 250);

    return () => window.clearTimeout(timer);
  }, [searchValue, mapReady, userLocation, defaultCenter]);

  useEffect(() => {
    if (!mapReady || !servicesRef.current.places) return;
    const location = userLocation ?? defaultCenter;
    const googleMaps = (window as any).google;

    const fetchSuggestions = (type: string) =>
      new Promise<MapPlace[]>((resolve) => {
        servicesRef.current.places.nearbySearch(
          {
            location,
            radius: 6000,
            type,
          },
          (results: any[] | null, status: string) => {
            if (status !== "OK" || !results) {
              resolve([]);
              return;
            }
            const mapped = results.slice(0, 2).map((place) => ({
              id: place.place_id,
              name: place.name,
              address: place.vicinity,
              location: {
                lat: place.geometry?.location?.lat?.() ?? location.lat,
                lng: place.geometry?.location?.lng?.() ?? location.lng,
              },
            }));
            resolve(mapped);
          }
        );
      });

    Promise.all([fetchSuggestions("charging_station"), fetchSuggestions("cafe")])
      .then((groups) => {
        setSuggestions(groups.flat());
      })
      .catch(() => {
        setSuggestions([]);
      });
  }, [mapReady, userLocation, defaultCenter]);

  const selectPlace = (place: MapPlace, startRoute = false) => {
    setSelectedPlace(place);
    setRouteInfo(null);
    if (mapRef.current) {
      mapRef.current.setCenter(place.location);
      mapRef.current.setZoom(13);
    }
    const googleMaps = (window as any).google;
    if (googleMaps?.maps && mapRef.current) {
      if (!destinationMarkerRef.current) {
        destinationMarkerRef.current = new googleMaps.maps.Marker({
          position: place.location,
          map: mapRef.current,
        });
      } else {
        destinationMarkerRef.current.setPosition(place.location);
      }
    }
    setRecentPlaces((prev) => {
      const next = [place, ...prev.filter((item) => item.id !== place.id)].slice(0, 3);
      return next;
    });
    setSearchValue(place.name);
    setPredictions([]);
    if (startRoute) {
      startNavigation(place);
    }
  };

  const selectPrediction = (prediction: SearchPrediction) => {
    if (!servicesRef.current.places) return;
    servicesRef.current.places.getDetails(
      {
        placeId: prediction.place_id,
        fields: ["name", "geometry", "formatted_address"],
      },
      (place: any, status: string) => {
        if (status !== "OK" || !place?.geometry?.location) return;
        const result: MapPlace = {
          id: prediction.place_id,
          name: place.name ?? prediction.description,
          address: place.formatted_address,
          location: {
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng(),
          },
        };
        selectPlace(result, true);
      }
    );
  };

  const startNavigation = (destination?: MapPlace) => {
    const target = destination ?? selectedPlace;
    if (!target || !servicesRef.current.directions) return;
    const googleMaps = (window as any).google;
    const center = mapRef.current?.getCenter?.();
    const origin = userLocation ?? (center ? { lat: center.lat(), lng: center.lng() } : defaultCenter);
    setRouteDestination(target);
    servicesRef.current.directions.route(
      {
        origin,
        destination: target.location,
        travelMode: googleMaps.maps.TravelMode.DRIVING,
      },
      (result: any, status: string) => {
        if (status !== "OK" || !result) {
          setMapError("Directions API request failed");
          return;
        }
        directionsRef.current?.setDirections(result);
        const leg = result.routes?.[0]?.legs?.[0];
        const steps: RouteStep[] = (leg?.steps ?? []).map((step: any) => ({
          instruction: stripHtml(step.instructions ?? ""),
          distance: step.distance?.text,
          duration: step.duration?.text,
          endLocation: {
            lat: step.end_location?.lat?.() ?? target.location.lat,
            lng: step.end_location?.lng?.() ?? target.location.lng,
          },
        }));
        setRouteSteps(steps);
        setCurrentStepIndex(0);
        setRoutePath(result.routes?.[0]?.overview_path ?? []);
        setRouteInfo({
          distance: leg?.distance?.text,
          duration: leg?.duration?.text,
        });
      }
    );
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
                <p className="mt-2 text-lg font-medium text-white/90">
                  {selectedPlace?.name ?? "Stockholm Center"}
                </p>
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
              <div className="rounded-[16px] border border-white/10 bg-black/60 px-4 py-3">
                <p className="text-[10px] uppercase tracking-[0.3em] text-white/50">Navigation</p>
                {currentStep ? (
                  <div className="mt-2">
                    <p className="text-base font-medium text-white/90">{currentStep.instruction}</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.2em] text-white/50">
                      {currentStep.distance} · {currentStep.duration}
                    </p>
                    {nextStep && (
                      <p className="mt-2 text-xs uppercase tracking-[0.2em] text-white/40">
                        Next: {nextStep.instruction}
                      </p>
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
                      key={item.place_id}
                      type="button"
                      className="flex min-h-[44px] w-full items-center gap-3 rounded-[12px] bg-white/5 px-3 py-2 text-left hover:bg-white/10"
                      whileTap={{ scale: 0.95, opacity: 0.8 }}
                      onClick={() => selectPrediction(item)}
                    >
                      <SearchIcon />
                      <div>
                        <p className="text-sm text-white/90">{item.description}</p>
                        <p className="text-xs uppercase tracking-[0.2em] text-white/50">Tap to view</p>
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
              {(suggestions.length > 0 ? suggestions : [
                { id: "suggestion-1", name: "Supercharger · 4 stalls", address: "2.1 km", location: defaultCenter },
                { id: "suggestion-2", name: "Coffee stop", address: "1.3 km", location: defaultCenter },
              ]).map((item) => (
                <motion.button
                  key={item.id}
                  type="button"
                  className="flex min-h-[44px] w-full items-center justify-between rounded-[12px] bg-white/5 px-3 py-2 text-left hover:bg-white/10"
                  whileTap={{ scale: 0.95, opacity: 0.8 }}
                  onClick={() => selectPlace(item as MapPlace, true)}
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
