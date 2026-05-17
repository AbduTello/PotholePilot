"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import L from "leaflet";

const markerIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

interface Props {
  onLocationSelect: (lat: number, lng: number, address: string) => void;
}

export default function PinMap({ onLocationSelect }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  const reverseGeocode = useCallback(async (lat: number, lng: number) => {
    setLoading(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`
      );
      const data = await res.json();
      const address = data.display_name ?? `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
      onLocationSelect(lat, lng, address);
    } catch {
      onLocationSelect(lat, lng, `${lat.toFixed(5)}, ${lng.toFixed(5)}`);
    } finally {
      setLoading(false);
    }
  }, [onLocationSelect]);

  const placeMarker = useCallback((lat: number, lng: number) => {
    const map = mapRef.current;
    if (!map) return;
    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
    } else {
      markerRef.current = L.marker([lat, lng], { icon: markerIcon }).addTo(map);
    }
  }, []);

  const handleLocateMe = useCallback(() => {
    if (!navigator.geolocation) {
      setGeoError("Geolocation is not supported by your browser.");
      return;
    }
    setLocating(true);
    setGeoError(null);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const { latitude: lat, longitude: lng } = coords;
        const map = mapRef.current;
        if (map) map.setView([lat, lng], 17);
        placeMarker(lat, lng);
        reverseGeocode(lat, lng);
        setLocating(false);
      },
      () => {
        setGeoError("Couldn't get your location. Please drop a pin manually.");
        setLocating(false);
      }
    );
  }, [placeMarker, reverseGeocode]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current).setView([42.3314, -83.0458], 13);
    mapRef.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    map.on("click", (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      placeMarker(lat, lng);
      reverseGeocode(lat, lng);
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [placeMarker, reverseGeocode]);

  return (
    <div className="flex flex-col gap-2">
      <div className="relative w-full rounded-xl overflow-hidden border border-zinc-200">
        <div ref={containerRef} className="h-64 w-full" />
        {loading && (
          <div className="absolute bottom-2 left-2 rounded-md bg-white/90 px-2 py-1 text-xs text-zinc-500 shadow">
            Getting address…
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs text-zinc-400">Click anywhere on the map to drop a pin</p>
        <button
          type="button"
          onClick={handleLocateMe}
          disabled={locating}
          className="flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 shadow-sm transition hover:bg-zinc-50 disabled:opacity-50"
        >
          {locating ? (
            <>
              <span className="h-3 w-3 animate-spin rounded-full border-2 border-zinc-400 border-t-transparent" />
              Locating…
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
              </svg>
              Locate me
            </>
          )}
        </button>
      </div>

      {geoError && (
        <p className="text-xs text-red-500">{geoError}</p>
      )}
    </div>
  );
}
