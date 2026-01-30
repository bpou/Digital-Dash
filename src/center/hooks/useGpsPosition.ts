import { useEffect, useState } from "react";
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

const useVehicleGpsPosition = () => {
  const [position, setPosition] = useState<GpsPosition | null>(null);

  useEffect(() => {
    const unsubscribe = subscribe((state) => {
      const current = toGpsPosition(state.gps ?? null);
      setPosition((prev) => {
        if (positionsEqual(prev, current)) return prev;
        return current;
      });
    });
    return unsubscribe;
  }, []);

  return position;
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
  return vehicleGps ?? browserGps;
};
