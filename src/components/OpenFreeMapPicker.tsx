import React, { useEffect, useRef, useState } from 'react';
import * as maplibregl from 'maplibre-gl';
import maplibreWorkerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';
import 'maplibre-gl/dist/maplibre-gl.css';
import { Crosshair, MapPin, Search, Loader2 } from 'lucide-react';

maplibregl.setWorkerUrl(maplibreWorkerUrl);

export interface SelectedLocation {
  latitude: number;
  longitude: number;
  address?: string;
  city?: string;
  pincode?: string;
}

interface OpenFreeMapPickerProps {
  latitude: number;
  longitude: number;
  onChange: (loc: SelectedLocation) => void;
  heightClass?: string;
  interactive?: boolean;
}

const OPENFREEMAP_STYLE = 'https://tiles.openfreemap.org/styles/dark';

export function OpenFreeMapPicker({
  latitude,
  longitude,
  onChange,
  heightClass = 'h-64',
  interactive = true,
}: OpenFreeMapPickerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markerRef = useRef<maplibregl.Marker | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);
  const [mapReady, setMapReady] = useState(false);

  const reverseGeocode = async (lat: number, lon: number) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`,
        { headers: { Accept: 'application/json' } }
      );
      if (!res.ok) return {};
      const data = await res.json();
      const addr = data?.address || {};
      const streetParts = [
        addr.house_number,
        addr.road || addr.pedestrian || addr.neighbourhood,
        addr.suburb || addr.quarter,
      ].filter(Boolean);

      return {
        address: streetParts.join(', ') || data.display_name?.split(',').slice(0, 3).join(','),
        city: addr.city || addr.town || addr.village || addr.state_district || '',
        pincode: addr.postcode || '',
      };
    } catch {
      return {};
    }
  };

  const updatePoint = async (lat: number, lon: number, shouldFly = false) => {
    const fixedLat = Number(lat.toFixed(6));
    const fixedLon = Number(lon.toFixed(6));

    if (markerRef.current) {
      markerRef.current.setLngLat([fixedLon, fixedLat]);
    }
    if (shouldFly && mapRef.current) {
      mapRef.current.flyTo({ center: [fixedLon, fixedLat], zoom: 16, essential: true });
    }

    onChange({ latitude: fixedLat, longitude: fixedLon });

    const details = await reverseGeocode(fixedLat, fixedLon);
    if (details.address || details.city || details.pincode) {
      onChange({
        latitude: fixedLat,
        longitude: fixedLon,
        ...details,
      });
    }
  };

  useEffect(() => {
    if (!containerRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: OPENFREEMAP_STYLE,
      center: [longitude, latitude],
      zoom: interactive ? 15 : 14,
      interactive,
      attributionControl: false,
    });

    if (interactive) {
      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right');
    }

    const marker = new maplibregl.Marker({
      color: '#FF3B00',
      draggable: interactive,
    })
      .setLngLat([longitude, latitude])
      .addTo(map);

    if (interactive) {
      marker.on('dragend', () => {
        const lngLat = marker.getLngLat();
        updatePoint(lngLat.lat, lngLat.lng, false);
      });

      map.on('click', (e: maplibregl.MapMouseEvent) => {
        updatePoint(e.lngLat.lat, e.lngLat.lng, false);
      });
    }

    mapRef.current = map;
    markerRef.current = marker;

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
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, [interactive]);

  // Keep external lat/lon changes synchronized on the map
  useEffect(() => {
    if (markerRef.current && mapRef.current) {
      const curr = markerRef.current.getLngLat();
      if (Math.abs(curr.lat - latitude) > 0.0001 || Math.abs(curr.lng - longitude) > 0.0001) {
        markerRef.current.setLngLat([longitude, latitude]);
        mapRef.current.flyTo({ center: [longitude, latitude], zoom: interactive ? 15 : 14 });
      }
    }
  }, [latitude, longitude, interactive]);

  const handleUseCurrentLocation = () => {
    setGeoError(null);
    if (!navigator.geolocation) {
      setGeoError('Geolocation is not supported in this browser.');
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        await updatePoint(pos.coords.latitude, pos.coords.longitude, true);
        setLocating(false);
      },
      (err) => {
        setLocating(false);
        setGeoError(err.message || 'Location access denied. Please allow GPS or click map manually.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSearchAddress = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!searchQuery.trim()) return;
    setGeoError(null);
    setSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(
          searchQuery.trim()
        )}`
      );
      const results = await res.json();
      if (results?.[0]) {
        const lat = parseFloat(results[0].lat);
        const lon = parseFloat(results[0].lon);
        await updatePoint(lat, lon, true);
      } else {
        setGeoError('Location not found. Try a broader campus or city name.');
      }
    } catch {
      setGeoError('Unable to search address right now.');
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="space-y-3">
      {interactive && (
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1 flex gap-1.5">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-3" aria-hidden="true" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSearchAddress();
                  }
                }}
                placeholder="Search campus, street, or landmark"
                className="w-full h-9 pl-8 pr-3 rounded-lg bg-black/70 border border-white/25 text-xs font-sans text-white placeholder:text-neutral-400 focus:outline-none focus:border-[#FF3B00]"
              />
            </div>
            <button
              type="button"
              onClick={() => handleSearchAddress()}
              disabled={searching}
              className="px-3.5 h-9 rounded-lg bg-white/15 hover:bg-white/25 text-xs font-sans font-semibold text-white cursor-pointer shrink-0 transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              {searching && <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />}
              <span>{searching ? 'Finding' : 'Find'}</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handleUseCurrentLocation}
            disabled={locating}
            className="h-9 px-3.5 rounded-lg bg-[#D93200] hover:bg-[#FF3B00] text-white text-xs font-sans font-semibold flex items-center justify-center gap-1.5 cursor-pointer shrink-0 transition-colors disabled:opacity-50"
          >
            {locating ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
            ) : (
              <Crosshair className="w-3.5 h-3.5" aria-hidden="true" />
            )}
            <span>{locating ? 'Locating...' : 'Use Current GPS'}</span>
          </button>
        </div>
      )}

      {geoError && (
        <div className="text-xs font-sans text-rose-200 bg-rose-950/70 border border-rose-500/40 rounded-lg px-3 py-2 animate-panel-in">
          {geoError}
        </div>
      )}

      <div className={`relative w-full ${heightClass} rounded-xl overflow-hidden border border-black/20 bg-neutral-900`}>
        <div ref={containerRef} className="w-full h-full" />
        {!mapReady && (
          <div className="absolute inset-0 bg-neutral-950/90 flex items-center justify-center gap-2 text-xs font-sans text-neutral-300 pointer-events-none">
            <Loader2 className="w-4 h-4 animate-spin text-[#FF3B00]" aria-hidden="true" />
            <span>Loading map</span>
          </div>
        )}
        <div className="absolute bottom-2.5 left-2.5 z-10 px-2.5 py-1 rounded-full bg-black/85 border border-white/15 backdrop-blur text-white text-[11px] font-mono tabular-nums flex items-center gap-1.5 pointer-events-none">
          <MapPin className="w-3 h-3 text-[#FF3B00]" aria-hidden="true" />
          <span>
            {latitude.toFixed(4)}, {longitude.toFixed(4)}
          </span>
        </div>
      </div>

      {interactive && (
        <p className="text-xs font-sans text-neutral-300">
          Click anywhere on the map or drag the pin to set your shop entrance.
        </p>
      )}
    </div>
  );
}
