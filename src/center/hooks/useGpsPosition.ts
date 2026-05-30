import { useEffect, useState } from "react";
import type { VehicleState } from "../../shared/vehicleTypes";
import { subscribe } from "../../vehicle/vehicleClient";

type GpsPosition = {
  location: { lat: number; lng: number };
  heading: number | null;
  speedMps: number | null;
};

// We are now only using browser geolocation for GPS data (to get phone GPS)
// We ignore vehicle GPS entirely as per user request to use ONLY phone GPS.

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
  // Only use browser geolocation (phone GPS) and ignore vehicle GPS
  return useBrowserGeolocation();
};
