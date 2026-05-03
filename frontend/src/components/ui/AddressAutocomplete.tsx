'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { MapPin, Loader2 } from 'lucide-react';
import { get } from '@/lib/api';

interface PlaceResult {
  address_line_1: string;
  city: string;
  country: string;
  latitude: number;
  longitude: number;
}

interface Props {
  onPlaceSelect: (result: PlaceResult) => void;
  placeholder?: string;
  className?: string;
}

let googleMapsLoaded = false;
let googleMapsLoading = false;
const loadCallbacks: (() => void)[] = [];

function loadGoogleMapsScript(apiKey: string): Promise<void> {
  return new Promise((resolve) => {
    if (googleMapsLoaded) { resolve(); return; }
    loadCallbacks.push(resolve);
    if (googleMapsLoading) return;
    googleMapsLoading = true;
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.onload = () => {
      googleMapsLoaded = true;
      googleMapsLoading = false;
      loadCallbacks.forEach((cb) => cb());
      loadCallbacks.length = 0;
    };
    document.head.appendChild(script);
  });
}

export function AddressAutocomplete({ onPlaceSelect, placeholder = 'Search for address...', className }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<any>(null);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [noKey, setNoKey] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      try {
        const res = await get<{ enabled: boolean; key: string | null }>('/maps/key');
        if (cancelled) return;
        if (!res || !(res as any).enabled || !(res as any).key) { setNoKey(true); setLoading(false); return; }
        const key = (res as any).key as string;
        await loadGoogleMapsScript(key);
        if (cancelled) return;
        setReady(true);
        setLoading(false);
      } catch {
        if (!cancelled) { setNoKey(true); setLoading(false); }
      }
    };

    init();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!ready || !inputRef.current) return;
    const google = (window as any).google;
    if (!google?.maps?.places) return;

    autocompleteRef.current = new google.maps.places.Autocomplete(inputRef.current, {
      types: ['establishment', 'geocode'],
      fields: ['formatted_address', 'address_components', 'geometry'],
    });

    autocompleteRef.current.addListener('place_changed', () => {
      const place = autocompleteRef.current.getPlace();
      if (!place.geometry) return;

      const components = place.address_components ?? [];
      const get = (type: string) => components.find((c: any) => c.types.includes(type))?.long_name ?? '';

      const city = get('locality') || get('sublocality') || get('administrative_area_level_2') || get('administrative_area_level_1');
      const country = get('country');
      const streetNum = get('street_number');
      const route = get('route');
      const address_line_1 = [streetNum, route].filter(Boolean).join(' ') || (place.formatted_address?.split(',')[0] ?? '');

      onPlaceSelect({
        address_line_1,
        city,
        country,
        latitude: place.geometry.location.lat(),
        longitude: place.geometry.location.lng(),
      });
    });

    return () => {
      if (autocompleteRef.current) {
        (window as any).google?.maps?.event?.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, [ready, onPlaceSelect]);

  if (noKey) return null;

  return (
    <div className={`relative ${className ?? ''}`}>
      {loading && (
        <div className="absolute inset-0 flex items-center px-3 pointer-events-none">
          <Loader2 size={14} className="animate-spin text-[--text-3]" />
        </div>
      )}
      <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-500 pointer-events-none" />
      <input
        ref={inputRef}
        type="text"
        placeholder={loading ? 'Loading Places...' : placeholder}
        disabled={loading}
        className="w-full pl-8 pr-3 py-2.5 bg-[--bg-elevated] border border-emerald-500/40 rounded-xl text-sm text-[--text-1] placeholder:text-[--text-3] focus:outline-none focus:border-emerald-500 disabled:opacity-50 transition-colors"
      />
    </div>
  );
}
