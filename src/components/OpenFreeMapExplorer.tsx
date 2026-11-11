import React, { useEffect, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';
import 'maplibre-gl/dist/maplibre-gl.css';
import {
  ChevronDown,
  ChevronUp,
  Crosshair,
  ExternalLink,
  Footprints,
  Car,
  Loader2,
  Maximize2,
  Minimize2,
  Navigation,
  X,
} from 'lucide-react';
import type { Shop } from '../types/database';

maplibregl.setWorkerUrl(maplibreWorkerUrl);

export interface OpenFreeMapExplorerProps {
  shops: Shop[];
  selectedShop: Shop | null;
  onSelectShop: (shop: Shop) => void;
  userCoords: { latitude: number; longitude: number } | null;
  onUserLocation: (coords: { latitude: number; longitude: number }) => void;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  focusTrigger?: number;
  directionsShop?: Shop | null;
  directionsTrigger?: number;
  onRequestDirections?: (shop: Shop) => void;
  onClearDirections?: () => void;
}

interface RouteResult {
  coordinates: [number, number][];
  distanceMeters: number;
  durationSeconds: number;
  steps: string[];
  isFallbackLine: boolean;
}

function formatDistanceLabel(meters: number): string {
  if (meters < 1000) return `${Math.max(10, Math.round(meters))} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}

function formatDurationLabel(seconds: number, mode: 'foot' | 'driving'): string {
  const mins = Math.max(1, Math.round(seconds / 60));
  return `${mins} min ${mode === 'foot' ? 'walk' : 'drive'}`;
}

function formatOsrmStep(step: any): string {
  const maneuver = step?.maneuver || {};
  const type = maneuver.type || 'continue';
  const modifier = maneuver.modifier ? ` ${maneuver.modifier}` : '';
  const road = step?.name ? ` onto ${step.name}` : '';
  const dist = step?.distance ? ` (${formatDistanceLabel(Number(step.distance))})` : '';
  if (type === 'depart') return `Start${road}${dist}`;
  if (type === 'arrive') return 'Arrive at shop destination';
  const verb = type === 'turn' ? 'Turn' : type.charAt(0).toUpperCase() + type.slice(1);
  return `${verb}${modifier}${road}${dist}`;
}

const STYLE_DARK = 'https://tiles.openfreemap.org/styles/dark';

export function computeHaversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function getShopStartingRate(shop: Shop): number {
  if (!shop.pricing?.length) return 2;
  const rates = shop.pricing
    .map((p) => Number(p.price_per_page))
    .filter((n) => Number.isFinite(n) && n > 0);
  return rates.length > 0 ? Math.min(...rates) : 2;
}

export function OpenFreeMapExplorer({
  shops,
  selectedShop,
  onSelectShop,
  userCoords,
  onUserLocation,
  isExpanded = false,
  onToggleExpand,
  focusTrigger = 0,
  directionsShop = null,
  directionsTrigger = 0,
  onRequestDirections,
  onClearDirections,
}: OpenFreeMapExplorerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<maplibregl.Marker[]>([]);
  const popupRef = useRef<maplibregl.Popup | null>(null);
  const userMarkerRef = useRef<maplibregl.Marker | null>(null);

  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [routeMode, setRouteMode] = useState<'foot' | 'driving'>('foot');
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeData, setRouteData] = useState<RouteResult | null>(null);
  const [showSteps, setShowSteps] = useState(false);

  // Initialize OpenFreeMap
  useEffect(() => {
    if (!containerRef.current) return;

    const initialShop = selectedShop || shops.find((s) => s.latitude && s.longitude);
    const centerLon = Number(initialShop?.longitude) || 77.5946;
    const centerLat = Number(initialShop?.latitude) || 12.9716;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: STYLE_DARK,
      center: [centerLon, centerLat],
      zoom: 13.5,
      attributionControl: false,
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'top-right');
    mapRef.current = map;

    const handleResize = () => map.resize();
    const handleLoad = () => {
      setMapReady(true);
      map.resize();
    };
    map.on('load', handleLoad);
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      popupRef.current?.remove();
      popupRef.current = null;
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Render shop pin markers whenever shops or selection changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    shops.forEach((shop) => {
      const lat = Number(shop.latitude);
      const lon = Number(shop.longitude);
      if (!lat || !lon) return;

      const isSelected = selectedShop?.id === shop.id;

      const wrapper = document.createElement('button');
      wrapper.type = 'button';
      wrapper.className = 'group flex flex-col items-center cursor-pointer focus:outline-none';
      wrapper.setAttribute('aria-label', shop.shop_name);

      const pin = document.createElement('div');
      pin.className = isSelected
        ? 'w-5 h-5 rounded-full bg-[#FF3B00] border-2 border-[#FAF9F6] shadow-xl ring-4 ring-[#FF3B00]/40 transition-transform'
        : 'w-4 h-4 rounded-full bg-[#FDE09B] border-2 border-[#0F1115] shadow-md ring-2 ring-[#FAF9F6]/65 group-hover:bg-[#FF3B00] group-hover:scale-110 transition-transform';

      wrapper.appendChild(pin);
      wrapper.onclick = () => onSelectShop(shop);

      const marker = new maplibregl.Marker({ element: wrapper, anchor: 'bottom' })
        .setLngLat([lon, lat])
        .addTo(map);
      markersRef.current.push(marker);
    });
  }, [shops, selectedShop, onSelectShop]);

  // Render floating callout label above the selected shop pin showing only the shop name
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    popupRef.current?.remove();
    popupRef.current = null;

    if (!selectedShop) return;
    const lat = Number(selectedShop.latitude);
    const lon = Number(selectedShop.longitude);
    if (!lat || !lon) return;

    const card = document.createElement('div');
    card.className =
      'bg-[#FAF9F6] text-[#0F1115] rounded-[20px] px-3.5 py-2 max-w-[260px] border border-black/15';

    const title = document.createElement('div');
    title.className = 'font-serif font-bold text-sm text-[#0F1115] truncate leading-snug';
    title.textContent = selectedShop.shop_name;

    card.appendChild(title);

    const popup = new maplibregl.Popup({
      closeButton: false,
      closeOnClick: false,
      offset: 22,
      className: 'prinrox-map-popup',
      maxWidth: '280px',
    })
      .setLngLat([lon, lat])
      .setDOMContent(card)
      .addTo(map);

    popupRef.current = popup;
  }, [selectedShop]);

  // Smoothly pan map when selectedShop changes or a shop card is explicitly focused
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !selectedShop) return;
    if (directionsShop && directionsShop.id === selectedShop.id) return;
    const lat = Number(selectedShop.latitude);
    const lon = Number(selectedShop.longitude);
    if (lat && lon) {
      map.flyTo({ center: [lon, lat], zoom: 14.5, essential: true });
    }
  }, [selectedShop, focusTrigger, directionsShop]);

  // Resize map cleanly when split width toggles
  useEffect(() => {
    const t = window.setTimeout(() => mapRef.current?.resize(), 180);
    return () => window.clearTimeout(t);
  }, [isExpanded]);

  // Render live customer GPS pin
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !userCoords) return;

    if (userMarkerRef.current) {
      userMarkerRef.current.remove();
    }

    const dot = document.createElement('div');
    dot.className =
      'w-4 h-4 rounded-full bg-blue-500 border-2 border-white shadow-lg ring-4 ring-blue-500/35';

    userMarkerRef.current = new maplibregl.Marker({ element: dot })
      .setLngLat([userCoords.longitude, userCoords.latitude])
      .addTo(map);
  }, [userCoords]);

  const requestUserGps = (flyToUser: boolean) => {
    setGeoError(null);
    if (!navigator.geolocation) {
      setGeoError('Geolocation is not supported in this browser.');
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        };
        onUserLocation(coords);
        if (flyToUser) {
          mapRef.current?.flyTo({
            center: [coords.longitude, coords.latitude],
            zoom: 14.5,
            essential: true,
          });
        }
        setLocating(false);
      },
      (err) => {
        setLocating(false);
        setGeoError(err.message || 'Location permission denied.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleLocateMe = () => requestUserGps(true);

  // Auto-request GPS if Directions was clicked before user coordinates were fetched
  useEffect(() => {
    if (!directionsShop) {
      setRouteData(null);
      setShowSteps(false);
      return;
    }
    setShowSteps(false);
    const shopLat = Number(directionsShop.latitude);
    const shopLon = Number(directionsShop.longitude);
    if (userCoords && shopLat && shopLon) {
      const km = computeHaversineKm(userCoords.latitude, userCoords.longitude, shopLat, shopLon);
      setRouteMode(km <= 3 ? 'foot' : 'driving');
    } else if (!userCoords && !locating) {
      requestUserGps(false);
    }
  }, [directionsShop?.id, directionsTrigger]);

  // Fetch route from OSRM (with resilient direct-line fallback) whenever directionsShop, mode, or GPS updates
  useEffect(() => {
    if (!directionsShop || !userCoords) return;

    const shopLat = Number(directionsShop.latitude);
    const shopLon = Number(directionsShop.longitude);
    if (!shopLat || !shopLon) {
      setRouteData(null);
      return;
    }

    const controller = new AbortController();
    const fetchRoute = async () => {
      setRouteLoading(true);
      try {
        const url = `https://router.project-osrm.org/route/v1/${routeMode}/${userCoords.longitude},${userCoords.latitude};${shopLon},${shopLat}?overview=full&geometries=geojson&steps=true`;
        const res = await fetch(url, { signal: controller.signal });
        if (res.ok) {
          const json = await res.json();
          const best = json?.routes?.[0];
          const coords = best?.geometry?.coordinates;
          if (Array.isArray(coords) && coords.length >= 2) {
            const rawSteps: string[] = Array.isArray(best?.legs?.[0]?.steps)
              ? best.legs[0].steps.map((st: any) => formatOsrmStep(st)).filter(Boolean)
              : [];
            setRouteData({
              coordinates: coords,
              distanceMeters: Number(best.distance) || 0,
              durationSeconds: Number(best.duration) || 60,
              steps: rawSteps,
              isFallbackLine: false,
            });
            return;
          }
        }
      } catch (err: any) {
        if (err?.name === 'AbortError') return;
      } finally {
        if (!controller.signal.aborted) {
          setRouteLoading(false);
        }
      }

      if (controller.signal.aborted) return;
      const straightKm = computeHaversineKm(
        userCoords.latitude,
        userCoords.longitude,
        shopLat,
        shopLon
      );
      const speedKmH = routeMode === 'foot' ? 4.8 : 28;
      setRouteData({
        coordinates: [
          [userCoords.longitude, userCoords.latitude],
          [shopLon, shopLat],
        ],
        distanceMeters: straightKm * 1000,
        durationSeconds: Math.max(60, (straightKm / speedKmH) * 3600),
        steps: [`Head toward ${directionsShop.shop_name} (${directionsShop.address || 'Campus Shop'})`],
        isFallbackLine: true,
      });
    };

    fetchRoute();
    return () => controller.abort();
  }, [directionsShop, userCoords, routeMode, directionsTrigger]);

  // Draw or clear GeoJSON route path on MapLibre and fit camera bounds to show both user & shop
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    const removeRouteLayers = () => {
      if (map.getLayer('prinrox-route-line')) map.removeLayer('prinrox-route-line');
      if (map.getLayer('prinrox-route-casing')) map.removeLayer('prinrox-route-casing');
      if (map.getSource('prinrox-route')) map.removeSource('prinrox-route');
    };

    removeRouteLayers();
    if (!routeData || routeData.coordinates.length < 2) return;

    map.addSource('prinrox-route', {
      type: 'geojson',
      data: {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: routeData.coordinates,
        },
      },
    });

    map.addLayer({
      id: 'prinrox-route-casing',
      type: 'line',
      source: 'prinrox-route',
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': '#0F1115',
        'line-width': 8,
        'line-opacity': 0.85,
      },
    });

    map.addLayer({
      id: 'prinrox-route-line',
      type: 'line',
      source: 'prinrox-route',
      layout: { 'line-cap': 'round', 'line-join': 'round' },
      paint: {
        'line-color': '#FF3B00',
        'line-width': 4.5,
        'line-opacity': 0.98,
        ...(routeData.isFallbackLine ? { 'line-dasharray': [2, 2] } : {}),
      },
    });

    const bounds = new maplibregl.LngLatBounds();
    routeData.coordinates.forEach((pt) => bounds.extend(pt));
    if (userCoords) bounds.extend([userCoords.longitude, userCoords.latitude]);
    if (directionsShop?.longitude && directionsShop?.latitude) {
      bounds.extend([Number(directionsShop.longitude), Number(directionsShop.latitude)]);
    }
    if (!bounds.isEmpty()) {
      map.fitBounds(bounds, {
        padding: { top: 108, bottom: 72, left: 48, right: 48 },
        maxZoom: 16,
        duration: 750,
      });
    }
  }, [routeData, mapReady]);

  const activeDirLat = Number(directionsShop?.latitude) || 0;
  const activeDirLon = Number(directionsShop?.longitude) || 0;
  const googleMapsUrl =
    activeDirLat && activeDirLon
      ? `https://www.google.com/maps/dir/?api=1&${
          userCoords ? `origin=${userCoords.latitude},${userCoords.longitude}&` : ''
        }destination=${activeDirLat},${activeDirLon}&travelmode=${
          routeMode === 'foot' ? 'walking' : 'driving'
        }`
      : null;

  return (
    <div className="relative w-full h-full min-h-[420px] bg-black overflow-hidden">
      <div ref={containerRef} className="w-full h-full" />

      {!mapReady && (
        <div className="absolute inset-0 bg-black/95 flex items-center justify-center gap-2 text-xs font-sans text-[#FAF9F6] pointer-events-none z-10">
          <Loader2 className="w-4 h-4 animate-spin text-[#FF3B00]" aria-hidden="true" />
          <span>Loading map</span>
        </div>
      )}

      {geoError && !directionsShop && (
        <div className="absolute top-3 left-3 right-14 z-20 text-xs font-sans text-rose-200 bg-rose-950/90 border border-rose-500/40 rounded-xl px-3.5 py-2 shadow-lg animate-panel-in">
          {geoError}
        </div>
      )}

      {/* Floating Directions Overlay Card */}
      {directionsShop && (
        <div className="absolute top-3 left-3 right-14 sm:right-auto sm:w-[340px] z-20 rounded-[20px] bg-[#FAF9F6] text-[#0F1115] border border-black/20 shadow-2xl p-3.5 space-y-2.5 animate-panel-in">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="text-[10px] font-mono uppercase tracking-wider font-bold text-[#D93200] flex items-center gap-1">
                <Navigation className="w-3 h-3 shrink-0" aria-hidden="true" />
                <span>Directions to Shop</span>
              </div>
              <div className="font-serif font-bold text-sm text-[#0F1115] truncate">
                {directionsShop.shop_name}
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                setRouteData(null);
                onClearDirections?.();
              }}
              className="w-7 h-7 rounded-full bg-black hover:bg-[#D93200] text-white flex items-center justify-center transition-colors cursor-pointer shrink-0"
              aria-label="Close directions"
            >
              <X className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
          </div>

          {/* Walk / Drive Mode + Google Maps Handoff */}
          <div className="flex items-center justify-between gap-2">
            <div className="inline-flex rounded-full bg-black/5 border border-black/15 p-0.5">
              <button
                type="button"
                onClick={() => setRouteMode('foot')}
                className={`px-2.5 py-1 rounded-full text-[11px] font-sans font-semibold flex items-center gap-1 cursor-pointer transition-colors ${
                  routeMode === 'foot'
                    ? 'bg-black text-[#FDE09B]'
                    : 'text-neutral-700 hover:text-black'
                }`}
              >
                <Footprints className="w-3 h-3" aria-hidden="true" />
                <span>Walk</span>
              </button>
              <button
                type="button"
                onClick={() => setRouteMode('driving')}
                className={`px-2.5 py-1 rounded-full text-[11px] font-sans font-semibold flex items-center gap-1 cursor-pointer transition-colors ${
                  routeMode === 'driving'
                    ? 'bg-black text-[#FDE09B]'
                    : 'text-neutral-700 hover:text-black'
                }`}
              >
                <Car className="w-3 h-3" aria-hidden="true" />
                <span>Drive</span>
              </button>
            </div>

            {googleMapsUrl && (
              <a
                href={googleMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-2.5 py-1 rounded-full bg-[#D93200] hover:bg-black text-white text-[11px] font-sans font-semibold inline-flex items-center gap-1 transition-colors shrink-0"
              >
                <span>Google Maps</span>
                <ExternalLink className="w-3 h-3" aria-hidden="true" />
              </a>
            )}
          </div>

          {locating || routeLoading ? (
            <div className="rounded-xl bg-[#FDE09B] px-3 py-2 text-xs font-sans font-semibold text-[#0F1115] flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-[#D93200]" aria-hidden="true" />
              <span>{locating ? 'Getting your location...' : 'Calculating route...'}</span>
            </div>
          ) : geoError ? (
            <div className="rounded-xl bg-rose-50 border border-rose-300 px-3 py-2 text-[11px] font-sans text-rose-800 space-y-1.5">
              <div>{geoError}</div>
              <button
                type="button"
                onClick={() => requestUserGps(false)}
                className="font-bold underline cursor-pointer"
              >
                Retry GPS or use Google Maps above
              </button>
            </div>
          ) : routeData ? (
            <div className="space-y-2">
              <div className="rounded-xl bg-[#FDE09B] border border-black/15 px-3 py-2 flex items-center justify-between gap-2">
                <div>
                  <div className="text-xs font-sans font-bold text-[#0F1115] tabular-nums">
                    {formatDurationLabel(routeData.durationSeconds, routeMode)}
                  </div>
                  <div className="text-[11px] font-sans text-neutral-800 tabular-nums">
                    {formatDistanceLabel(routeData.distanceMeters)} from your location
                    {routeData.isFallbackLine ? ' (direct)' : ''}
                  </div>
                </div>
                {routeData.steps.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowSteps((v) => !v)}
                    className="px-2.5 py-1 rounded-full bg-black text-[#FDE09B] text-[11px] font-sans font-semibold inline-flex items-center gap-1 cursor-pointer shrink-0"
                  >
                    <span>Steps</span>
                    {showSteps ? (
                      <ChevronUp className="w-3 h-3" aria-hidden="true" />
                    ) : (
                      <ChevronDown className="w-3 h-3" aria-hidden="true" />
                    )}
                  </button>
                )}
              </div>

              {showSteps && routeData.steps.length > 0 && (
                <ol className="max-h-36 overflow-y-auto bento-scroll space-y-1 pl-4 pr-1 text-[11px] font-sans text-neutral-800 list-decimal">
                  {routeData.steps.map((step, i) => (
                    <li key={i} className="leading-snug">
                      {step}
                    </li>
                  ))}
                </ol>
              )}
            </div>
          ) : null}
        </div>
      )}

      {/* Right-middle Expand / Collapse Split Control */}
      {onToggleExpand && (
        <button
          type="button"
          onClick={onToggleExpand}
          className="hidden lg:flex absolute right-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 rounded-full bg-[#FAF9F6] hover:bg-[#FDE09B] text-[#0F1115] shadow-xl border border-black/25 items-center justify-center transition-colors cursor-pointer"
          title={isExpanded ? 'Show shop list' : 'Expand map'}
          aria-label={isExpanded ? 'Show shop list' : 'Expand map'}
        >
          {isExpanded ? (
            <Minimize2 className="w-4 h-4" aria-hidden="true" />
          ) : (
            <Maximize2 className="w-4 h-4" aria-hidden="true" />
          )}
        </button>
      )}

      {/* Bottom Floating Actions: Selected Shop Directions + Nearest GPS Locate Pill */}
      <div className="absolute bottom-4 right-4 z-20 flex items-center gap-2 justify-end">
        {selectedShop && !directionsShop && onRequestDirections && (
          <button
            type="button"
            onClick={() => onRequestDirections(selectedShop)}
            className="px-3.5 py-2 rounded-full bg-[#FAF9F6] hover:bg-[#FDE09B] text-[#0F1115] text-xs font-sans font-semibold shadow-xl border border-black/25 flex items-center gap-1.5 cursor-pointer transition-colors"
            title={`Show directions to ${selectedShop.shop_name}`}
          >
            <Navigation className="w-3.5 h-3.5 text-[#D93200]" aria-hidden="true" />
            <span>Directions</span>
          </button>
        )}

        <button
          type="button"
          onClick={handleLocateMe}
          disabled={locating}
          className="px-4 py-2 rounded-full bg-[#D93200] hover:bg-black text-white text-xs font-sans font-semibold shadow-xl border border-black/15 flex items-center gap-1.5 cursor-pointer transition-colors disabled:opacity-60"
        >
          {locating ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
          ) : (
            <Crosshair className="w-3.5 h-3.5" aria-hidden="true" />
          )}
          <span>{locating ? 'Locating...' : 'Nearest'}</span>
        </button>
      </div>
    </div>
  );
}
