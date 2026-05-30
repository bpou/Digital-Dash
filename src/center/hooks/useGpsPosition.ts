import { useEffect, useState, useRef } from "react";
import type { VehicleState } from "../../shared/vehicleTypes";
import { subscribe } from "../../vehicle/vehicleClient";

type GpsPosition = {
  location: { lat: number; lng: number };
  heading: number | null;
  speedMps: number | null;
};

const toGpsPosition = (gps?: VehicleState["gps"] | null): GpsPosition | null => {
  if (!gps) return null;
  const { lat, lng } = gps;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  const heading = typeof gps.heading === "number" && Number.isFinite(gps.heading) ? gps.heading : null;
  const speedMps =
    typeof gps.speedMps === "number" && Number.isFinite(gps.speedMps)
      ? gps.speedMps
      : typeof gps.speedKmh === "number" && Number.isFinite(gps.speedKmh)
      ? gps.speedKmh / 3.6
      : null;
  return {
    location: { lat, lng },
    heading,
    speedMps,
  };
};

const positionsEqual = (a: GpsPosition | null, b: GpsPosition | null) => {
  if (a === b) return true;
  if (!a || !b) return false;
  return (
    a.location.lat === b.location.lat &&
    a.location.lng === b.location.lng &&
    a.heading === b.heading &&
    a.speedMps === b.speedMps
  );
};

// Default Stockholm coordinates used in mock data
const DEFAULT_LAT = 59.3293;
const DEFAULT_LNG = 18.0686;
// Consider coordinates "default" if within ~11m of Stockholm coordinates (0.0001°)
const DEFAULT_THRESHOLD_DEGREES = 0.0001;

const isDefaultCoordinates = (lat: number, lng: number): boolean => {
  const latDiff = Math.abs(lat - DEFAULT_LAT);
  const lngDiff = Math.abs(lng - DEFAULT_LNG);
  return latDiff < DEFAULT_THRESHOLD_DEGREES && lngDiff < DEFAULT_THRESHOLD_DEGREES;
};

const useVehicleGpsPosition = () => {
  const [position, setPosition] = useState<GpsPosition | null>(null);
  const lastUpdateRef = useRef<number>(0);

  useEffect(() => {
    const unsubscribe = subscribe((state) => {
      const current = toGpsPosition(state.gps ?? null);
      setPosition((prev) => {
        if (positionsEqual(prev, current)) return prev;
        lastUpdateRef.current = Date.now();
        return current;
      });
    });
    return unsubscribe;
  }, []);

  // Return null if using default coordinates or hasn't updated in 30 seconds
  const vehicleGps = position;
  if (vehicleGps) {
    const isDefault = isDefaultCoordinates(vehicleGps.location.lat, vehicleGps.location.lng);
    const isStale = Date.now() - lastUpdateRef.current > 30000; // 30 seconds
    
    if (isDefault || isStale) {
      return null;
    }
  }
  
  return vehicleGps;
};

const useBrowserGeolocation = () => {
  const [position, setPosition] = useState<GpsPosition | null>(null);

  useEffect(() => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      return;
    }
    let watchId: number | null = null;
    const setFromBrowser = (pos: GeolocationPosition) => {
      setPosition({
        location: { lat: pos.coords.latitude, lng: pos.coords.longitude },
        heading: Number.isFinite(pos.coords.heading ?? NaN) ? pos.coords.heading : null,
        speedMps: Number.isFinite(pos.coords.speed ?? NaN) ? pos.coords.speed : null,
      });
    };

    watchId = navigator.geolocation.watchPosition(
      setFromBrowser,
      () => {},
      { enableHighAccuracy: true, maximumAge: 1000, timeout: 12000 }
    );

    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, []);

  return position;
};

export const useGpsPosition = () => {
  const vehicleGps = useVehicleGpsPosition();
  const browserGps = useBrowserGeolocation();
  // Prefer browser geolocation if vehicle GPS appears to be mock/stale data
  return browserGps ?? vehicleGps;
};
