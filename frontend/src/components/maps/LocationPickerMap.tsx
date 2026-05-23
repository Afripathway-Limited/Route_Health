'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Map as MapIcon } from 'lucide-react';
import { GoogleMap, Marker, useJsApiLoader } from '@react-google-maps/api';
import { GOOGLE_MAPS_LIBRARIES } from '@/lib/google-maps';

const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';
const DEFAULT_CENTER = { lat: -1.2921, lng: 36.8219 };

const MAP_STYLES: google.maps.MapTypeStyle[] = [
  { featureType: 'poi',     elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'transit', elementType: 'labels', stylers: [{ visibility: 'off' }] },
];

interface Props {
  label: string;
  pinColor?: string;
  lat: number | null;
  lng: number | null;
  name: string;
  onChangeName: (v: string) => void;
  onChangeCoords: (lat: number, lng: number) => void;
  placeholder?: string;
  required?: boolean;
}

export default function LocationPickerMap({
  label,
  pinColor = '#4F6EF7',
  lat,
  lng,
  name,
  onChangeName,
  onChangeCoords,
  placeholder,
  required,
}: Props) {
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: API_KEY,
    id: 'rh-google-maps',
    libraries: GOOGLE_MAPS_LIBRARIES,
  });

  const [open, setOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<google.maps.places.AutocompletePrediction[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(-1);
  const [dropdownRect, setDropdownRect] = useState<DOMRect | null>(null);

  const onChangeCoordsRef = useRef(onChangeCoords);
  const onChangeNameRef   = useRef(onChangeName);
  onChangeCoordsRef.current = onChangeCoords;
  onChangeNameRef.current   = onChangeName;

  const acServiceRef     = useRef<google.maps.places.AutocompleteService | null>(null);
  const placesServiceRef = useRef<google.maps.places.PlacesService | null>(null);
  const debounceRef      = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef         = useRef<HTMLInputElement>(null);

  const center = lat !== null && lng !== null ? { lat, lng } : DEFAULT_CENTER;

  // ── Map interactions ──────────────────────────────────────────────────────
  const handleMapClick = useCallback((e: google.maps.MapMouseEvent) => {
    if (e.latLng) onChangeCoordsRef.current(e.latLng.lat(), e.latLng.lng());
  }, []);

  const handleMarkerDrag = useCallback((e: google.maps.MapMouseEvent) => {
    if (e.latLng) onChangeCoordsRef.current(e.latLng.lat(), e.latLng.lng());
  }, []);

  // ── Places services (lazy init, safe checks) ──────────────────────────────
  const getAcService = (): google.maps.places.AutocompleteService | null => {
    if (!isLoaded || typeof google === 'undefined' || !google?.maps?.places) return null;
    if (!acServiceRef.current) {
      acServiceRef.current = new google.maps.places.AutocompleteService();
    }
    return acServiceRef.current;
  };

  const getPlacesService = (): google.maps.places.PlacesService | null => {
    if (!isLoaded || typeof google === 'undefined' || !google?.maps?.places) return null;
    if (!placesServiceRef.current) {
      placesServiceRef.current = new google.maps.places.PlacesService(document.createElement('div'));
    }
    return placesServiceRef.current;
  };

  // ── Autocomplete ──────────────────────────────────────────────────────────
  const handleInputChange = (value: string) => {
    onChangeNameRef.current(value);
    setHighlightIdx(-1);

    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (value.trim().length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    debounceRef.current = setTimeout(() => {
      const svc = getAcService();
      if (!svc) return;

      svc.getPlacePredictions({ input: value }, (preds) => {
        if (preds && preds.length > 0) {
          setSuggestions(preds.slice(0, 5));
          // Capture input rect for portal positioning
          if (inputRef.current) {
            setDropdownRect(inputRef.current.getBoundingClientRect());
          }
          setShowSuggestions(true);
        } else {
          setSuggestions([]);
          setShowSuggestions(false);
        }
      });
    }, 280);
  };

  const selectSuggestion = useCallback((pred: google.maps.places.AutocompletePrediction) => {
    const svc = getPlacesService();
    setSuggestions([]);
    setShowSuggestions(false);
    setHighlightIdx(-1);

    if (!svc) {
      // Fallback: just fill the name without coords
      onChangeNameRef.current(pred.description);
      return;
    }

    svc.getDetails(
      { placeId: pred.place_id, fields: ['geometry', 'formatted_address', 'name'] },
      (place) => {
        if (place?.geometry?.location) {
          onChangeNameRef.current(place.formatted_address ?? place.name ?? pred.description);
          onChangeCoordsRef.current(place.geometry.location.lat(), place.geometry.location.lng());
        } else {
          onChangeNameRef.current(pred.description);
        }
      },
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded]);

  // Close dropdown on outside click
  useEffect(() => {
    if (!showSuggestions) return;
    const handleOutside = (e: MouseEvent) => {
      if (!(e.target as Element)?.closest('[data-autocomplete-dropdown]') &&
          !(e.target as Element)?.closest('[data-autocomplete-input]')) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [showSuggestions]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightIdx(prev => Math.min(prev + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightIdx(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter' && highlightIdx >= 0) {
      e.preventDefault();
      selectSuggestion(suggestions[highlightIdx]);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  // ── Styles ────────────────────────────────────────────────────────────────
  const inputBase: React.CSSProperties = {
    height: 40,
    background: 'var(--bg-subtle)',
    border: '1.5px solid var(--border-strong)',
    borderRadius: 10,
    fontSize: 13,
    color: 'var(--text-primary)',
    outline: 'none',
    padding: '0 44px 0 12px',
    boxSizing: 'border-box',
    width: '100%',
  };

  const smallInputBase: React.CSSProperties = {
    height: 30,
    background: 'var(--bg-subtle)',
    border: '1px solid var(--border-subtle)',
    borderRadius: 7,
    fontSize: 11,
    color: 'var(--text-tertiary)',
    outline: 'none',
    padding: '0 8px',
    boxSizing: 'border-box',
    width: '100%',
    cursor: 'default',
    opacity: 0.8,
  };

  // ── Portal dropdown (fixed position — bypasses Drawer overflow clipping) ──
  const dropdown =
    showSuggestions && suggestions.length > 0 && dropdownRect
      ? createPortal(
          <div
            data-autocomplete-dropdown="1"
            style={{
              position: 'fixed',
              top: dropdownRect.bottom + 4,
              left: dropdownRect.left,
              width: dropdownRect.width,
              zIndex: 99999,
              background: 'var(--bg-surface)',
              border: '1.5px solid var(--border-strong)',
              borderRadius: 10,
              boxShadow: '0 8px 24px rgba(0,0,0,0.14)',
              overflow: 'hidden',
            }}
          >
            {suggestions.map((pred, i) => (
              <button
                key={pred.place_id}
                type="button"
                onMouseDown={e => { e.preventDefault(); selectSuggestion(pred); }}
                style={{
                  width: '100%',
                  textAlign: 'left',
                  padding: '9px 12px',
                  background: i === highlightIdx ? 'var(--brand-subtle)' : 'transparent',
                  border: 'none',
                  borderBottom: i < suggestions.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                  cursor: 'pointer',
                  display: 'block',
                }}
                onMouseEnter={() => setHighlightIdx(i)}
                onMouseLeave={() => setHighlightIdx(-1)}
              >
                <p style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {pred.structured_formatting?.main_text ?? pred.description}
                </p>
                {pred.structured_formatting?.secondary_text && (
                  <p style={{ fontSize: 11, color: 'var(--text-tertiary)', margin: '2px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {pred.structured_formatting.secondary_text}
                  </p>
                )}
              </button>
            ))}
          </div>,
          document.body,
        )
      : null;

  return (
    <div>
      <label className="block text-[12px] font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
        {label}{required && <span style={{ color: 'var(--danger)', marginLeft: 2 }}>*</span>}
      </label>

      {/* Input + map toggle */}
      <div style={{ position: 'relative' }}>
        <input
          ref={inputRef}
          data-autocomplete-input="1"
          value={name}
          onChange={e => handleInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (name.trim().length >= 2 && suggestions.length > 0 && inputRef.current) {
              setDropdownRect(inputRef.current.getBoundingClientRect());
              setShowSuggestions(true);
            }
          }}
          placeholder={placeholder ?? 'Type to search address or pick from map'}
          style={inputBase}
          autoComplete="off"
        />

        <button
          type="button"
          onClick={() => setOpen(p => !p)}
          title={open ? 'Close map' : 'Pick location on map'}
          style={{
            position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)',
            width: 30, height: 30, borderRadius: 8, border: 'none', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: open ? pinColor : 'var(--bg-hover)',
            color: open ? '#fff' : 'var(--text-tertiary)',
            transition: 'background 0.15s, color 0.15s', flexShrink: 0,
          }}
          onMouseEnter={e => {
            if (!open) {
              (e.currentTarget as HTMLElement).style.background = pinColor + '22';
              (e.currentTarget as HTMLElement).style.color = pinColor;
            }
          }}
          onMouseLeave={e => {
            if (!open) {
              (e.currentTarget as HTMLElement).style.background = 'var(--bg-hover)';
              (e.currentTarget as HTMLElement).style.color = 'var(--text-tertiary)';
            }
          }}
        >
          <MapIcon size={14} />
        </button>
      </div>

      {/* Portal dropdown rendered outside drawer overflow context */}
      {dropdown}

      {/* Inline Google Map */}
      {open && (
        <div style={{ height: 220, borderRadius: 10, marginTop: 8, overflow: 'hidden', border: `1.5px solid ${pinColor}` }}>
          {isLoaded ? (
            <GoogleMap
              mapContainerStyle={{ width: '100%', height: '100%' }}
              center={center}
              zoom={13}
              onClick={handleMapClick}
              options={{
                styles: MAP_STYLES,
                zoomControl: true,
                streetViewControl: false,
                mapTypeControl: false,
                fullscreenControl: false,
                clickableIcons: false,
              }}
            >
              {lat !== null && lng !== null && (
                <Marker
                  position={{ lat, lng }}
                  draggable
                  onDragEnd={handleMarkerDrag}
                  icon={{
                    path: google.maps.SymbolPath.CIRCLE,
                    scale: 9,
                    fillColor: pinColor,
                    fillOpacity: 1,
                    strokeColor: '#fff',
                    strokeWeight: 2.5,
                  }}
                />
              )}
            </GoogleMap>
          ) : (
            <div style={{ width: '100%', height: '100%', background: '#f0f4ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <p style={{ fontSize: 12, color: '#9ca3af' }}>Loading map…</p>
            </div>
          )}
        </div>
      )}

      {/* Lat / Lng readout */}
      <div className="grid grid-cols-2 gap-2 mt-2">
        <div>
          <p className="text-[10px] font-medium mb-1" style={{ color: 'var(--text-tertiary)' }}>Latitude</p>
          <input disabled readOnly value={lat !== null ? lat.toFixed(6) : ''} placeholder="—" style={smallInputBase} />
        </div>
        <div>
          <p className="text-[10px] font-medium mb-1" style={{ color: 'var(--text-tertiary)' }}>Longitude</p>
          <input disabled readOnly value={lng !== null ? lng.toFixed(6) : ''} placeholder="—" style={smallInputBase} />
        </div>
      </div>
    </div>
  );
}
