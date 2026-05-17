"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";

export interface ReportRow {
  id: string;
  description: string;
  address: string;
  lat: number;
  lng: number;
  photo_url: string | null;
  status: string;
  severity: string | null;
  priority_score: number | null;
  priority_reason: string | null;
  safety_concerns: string[] | null;
  urgency_signals: string[] | null;
  landmarks_mentioned: string[] | null;
  nearby_sensitive: Array<{ id: string; name: string; type: string; distance: number }> | null;
  equity_flag: boolean;
  freeze_thaw_multiplier: number | null;
  cluster_id: string | null;
  created_at: string;
}

interface Props {
  reports: ReportRow[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

function pinColor(score: number | null): string {
  if (score === null) return "#71717a";
  if (score >= 70) return "#ef4444";
  if (score >= 40) return "#f59e0b";
  return "#71717a";
}

function makeIcon(color: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="36" viewBox="0 0 24 36">
    <path d="M12 0C5.37 0 0 5.37 0 12c0 9 12 24 12 24s12-15 12-24C24 5.37 18.63 0 12 0z" fill="${color}" stroke="white" stroke-width="1.5"/>
    <circle cx="12" cy="12" r="4" fill="white"/>
  </svg>`;
  return L.divIcon({
    html: svg,
    className: "",
    iconSize: [24, 36],
    iconAnchor: [12, 36],
    popupAnchor: [0, -36],
  });
}

export default function DashboardMap({ reports, selectedId, onSelect }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current).setView([42.3314, -83.0458], 12);
    mapRef.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    return () => {
      map.remove();
      mapRef.current = null;
      markersRef.current.clear();
    };
  }, []);

  // Sync markers when reports change
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const existingIds = new Set(markersRef.current.keys());
    const incomingIds = new Set(reports.map((r) => r.id));

    // Remove stale markers
    for (const id of existingIds) {
      if (!incomingIds.has(id)) {
        markersRef.current.get(id)?.remove();
        markersRef.current.delete(id);
      }
    }

    // Add new markers
    for (const report of reports) {
      if (markersRef.current.has(report.id)) continue;
      const marker = L.marker([report.lat, report.lng], {
        icon: makeIcon(pinColor(report.priority_score)),
      }).addTo(map);
      marker.on("click", () => onSelect(report.id));
      markersRef.current.set(report.id, marker);
    }
  }, [reports, onSelect]);

  // Pan to selected marker
  useEffect(() => {
    if (!selectedId || !mapRef.current) return;
    const marker = markersRef.current.get(selectedId);
    if (marker) {
      mapRef.current.panTo(marker.getLatLng(), { animate: true });
    }
  }, [selectedId]);

  return (
    <div className="w-full rounded-xl overflow-hidden border-2 border-blue-400">
      <div ref={containerRef} className="h-96 w-full" />
    </div>
  );
}
