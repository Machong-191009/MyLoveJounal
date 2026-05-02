"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix Leaflet default marker icons in bundled environments
const defaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// Custom pink/love marker
const loveIcon = L.divIcon({
  html: `<div style="
    width: 28px; height: 28px;
    background: var(--color-primary, #e8507a);
    border: 3px solid white;
    border-radius: 50% 50% 50% 0;
    transform: rotate(-45deg);
    box-shadow: 0 2px 6px rgba(232,80,122,0.4);
  "></div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 28],
  popupAnchor: [0, -28],
  className: "",
});

export interface MapSpot {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  city?: string | null;
  country?: string | null;
  note?: string | null;
  photos?: string[];
  visitDate?: string | null;
  travelTitle?: string;
}

interface TemporarySelection {
  latitude: number;
  longitude: number;
  label: string;
}

interface MapViewProps {
  spots: MapSpot[];
  center?: [number, number];
  zoom?: number;
  height?: string;
  onMapClick?: (lat: number, lng: number) => void;
  interactive?: boolean;
  showPopups?: boolean;
  className?: string;
  temporarySelection?: TemporarySelection | null;
}

export default function MapView({
  spots,
  center,
  zoom = 4,
  height = "400px",
  onMapClick,
  interactive = true,
  showPopups = true,
  className = "",
  temporarySelection,
}: MapViewProps) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    // Default center: China center
    const defaultCenter: [number, number] = center || [35.86, 104.19];

    const map = L.map(containerRef.current, {
      center: defaultCenter,
      zoom,
      zoomControl: interactive,
      dragging: interactive,
      scrollWheelZoom: interactive,
      attributionControl: false,
    });

    // Use a clean tile layer
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
    }).addTo(map);

    // Attribution (small)
    L.control
      .attribution({ prefix: false })
      .addAttribution(
        '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a>'
      )
      .addTo(map);

    mapRef.current = map;

    // Click handler for adding spots
    if (onMapClick) {
      map.on("click", (e: L.LeafletMouseEvent) => {
        onMapClick(e.latlng.lat, e.latlng.lng);
      });
    }

    return () => {
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update markers when spots change
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear existing markers
    map.eachLayer((layer) => {
      if (layer instanceof L.Marker) {
        map.removeLayer(layer);
      }
    });

    // Add markers for each spot
    spots.forEach((spot) => {
      const marker = L.marker([spot.latitude, spot.longitude], {
        icon: loveIcon,
      }).addTo(map);

      if (showPopups) {
        const popupContent = `
          <div style="min-width: 150px; font-family: inherit;">
            <strong style="font-size: 14px; color: #e8507a;">${spot.name}</strong>
            ${spot.city || spot.country ? `<br/><span style="font-size: 12px; color: #6b7280;">${[spot.city, spot.country].filter(Boolean).join(", ")}</span>` : ""}
            ${spot.travelTitle ? `<br/><span style="font-size: 11px; color: #9ca3af;">📍 ${spot.travelTitle}</span>` : ""}
            ${spot.visitDate ? `<br/><span style="font-size: 11px; color: #9ca3af;">${new Date(spot.visitDate).toLocaleDateString("zh-CN")}</span>` : ""}
            ${spot.note ? `<br/><span style="font-size: 12px; color: #2d2d2d; margin-top: 4px; display: block;">${spot.note}</span>` : ""}
            ${spot.photos && spot.photos.length > 0 ? `<br/><img src="${spot.photos[0]}" style="width: 100%; max-height: 120px; object-fit: cover; border-radius: 6px; margin-top: 6px;" />` : ""}
          </div>
        `;
        marker.bindPopup(popupContent, { maxWidth: 250 });
      }
    });

    // Add temporary selection marker
    let tempMarker: L.Marker | null = null;
    if (temporarySelection) {
      const tempIcon = L.divIcon({
        html: `<div style="
          width: 20px; height: 20px;
          background: #f59e0b;
          border: 3px solid white;
          border-radius: 50%;
          box-shadow: 0 2px 8px rgba(245,158,11,0.5);
          animation: pulse 1.5s ease-in-out infinite;
        "></div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10],
        className: "",
      });
      tempMarker = L.marker([temporarySelection.latitude, temporarySelection.longitude], {
        icon: tempIcon,
      }).addTo(map);
      tempMarker.bindPopup(temporarySelection.label, { closeButton: false });
    }

    // Auto-fit bounds if spots exist
    if (spots.length > 0) {
      const allPoints = spots.map((s) => [s.latitude, s.longitude] as [number, number]);
      if (temporarySelection) {
        allPoints.push([temporarySelection.latitude, temporarySelection.longitude]);
      }
      const bounds = L.latLngBounds(allPoints);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 });
    } else if (temporarySelection) {
      map.setView([temporarySelection.latitude, temporarySelection.longitude], 13);
    }

    return () => {
      if (tempMarker) {
        map.removeLayer(tempMarker);
      }
    };
  }, [spots, showPopups, temporarySelection]);

  return (
    <div
      ref={containerRef}
      style={{ height, width: "100%" }}
      className={`rounded-[var(--radius)] overflow-hidden border border-[var(--color-border)] ${className}`}
    />
  );
}
