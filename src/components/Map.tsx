'use client';

import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Tooltip, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import '@geoman-io/leaflet-geoman-free';
import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css';
import 'leaflet/dist/leaflet.css';
import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import { point, polygon as turfPolygon } from '@turf/helpers';
import { Customer } from '@/lib/kv';

// Fix Leaflet marker icons
const DefaultIcon = L.icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
});
L.Marker.prototype.options.icon = DefaultIcon;

const SelectedIcon = L.icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
    shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
});

type MapProps = {
    customers: Customer[];
    selectedIds: string[];
    onSelection: (customerIds: string[]) => void;
    geocodingMode?: {
        customerId: string;
        onPin: (lat: number, lng: number) => void;
    };
};

function GeomanControls({ onDraw }: { onDraw: (layer: L.Layer) => void }) {
    const map = useMap();
    useEffect(() => {
        if (!map) return;
        map.pm.addControls({
            position: 'topleft',
            drawMarker: false,
            drawPolyline: false,
            drawRectangle: true,
            drawPolygon: true,
            drawCircle: true,
            drawCircleMarker: false,
            drawText: false,
            editMode: false,
            dragMode: false,
            rotateMode: false,
            cutPolygon: false,
            removalMode: false,
        });
        map.on('pm:create', (e: { layer: L.Layer }) => {
            onDraw(e.layer);
            map.removeLayer(e.layer);
        });
        return () => { map.pm.removeControls(); map.off('pm:create'); };
    }, [map, onDraw]);
    return null;
}

function MapEvents({ onMapClick, active }: { onMapClick: (lat: number, lng: number) => void; active: boolean }) {
    useMapEvents({
        click(e) { if (active) onMapClick(e.latlng.lat, e.latlng.lng); },
    });
    return null;
}

function FullscreenControl() {
    const map = useMap();
    const [isFullscreen, setIsFullscreen] = useState(false);
    const toggle = () => {
        const el = map.getContainer().parentElement;
        if (!isFullscreen) el?.requestFullscreen?.();
        else document.exitFullscreen?.();
        setIsFullscreen(f => !f);
        setTimeout(() => map.invalidateSize(), 200);
    };
    return (
        <div className="leaflet-top leaflet-right" style={{ zIndex: 1000 }}>
            <div className="leaflet-control leaflet-bar">
                <button
                    onClick={toggle}
                    title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
                    style={{ width: 30, height: 30, background: 'rgba(30,41,59,0.95)', color: '#94a3b8', border: 'none', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                    {isFullscreen ? '⊠' : '⛶'}
                </button>
            </div>
        </div>
    );
}

export default function Map({ customers, selectedIds, onSelection, geocodingMode }: MapProps) {
    const center: [number, number] = [17.3850, 78.4867];
    const mapRef = useRef<L.Map>(null);

    const toggleMarker = (id: string) => {
        if (geocodingMode) return; // don't change selection in geocoding mode
        const next = selectedIds.includes(id)
            ? selectedIds.filter(x => x !== id)
            : [...selectedIds, id];
        onSelection(next);
    };

    const handleDraw = (layer: L.Layer) => {
        const found: string[] = [];
        if (layer instanceof L.Circle) {
            const ctr = layer.getLatLng();
            const rad = layer.getRadius();
            customers.forEach(c => {
                if (c.lat && c.lng) {
                    const d = mapRef.current?.distance(ctr, [c.lat, c.lng]);
                    if (d !== undefined && d <= rad) found.push(c.id);
                }
            });
        } else if (layer instanceof L.Polygon) {
            const coords = layer.getLatLngs()[0] as L.LatLng[];
            const poly = turfPolygon([coords.map(ll => [ll.lng, ll.lat]).concat([[coords[0].lng, coords[0].lat]])]);
            customers.forEach(c => {
                if (c.lat && c.lng && booleanPointInPolygon(point([c.lng, c.lat]), poly)) found.push(c.id);
            });
        }
        if (found.length > 0) {
            // Add to existing selection (union)
            const next = Array.from(new Set([...selectedIds, ...found]));
            onSelection(next);
        }
    };

    return (
        <div
            className={`relative w-full rounded-2xl overflow-hidden shadow-2xl border transition-all duration-300 ${geocodingMode ? 'border-amber-400 ring-4 ring-amber-400/20' : selectedIds.length > 0 ? 'border-indigo-500/60' : 'border-white/10'}`}
            style={{ height: 'calc(100vh - 180px)', minHeight: 500 }}
        >
            {geocodingMode && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-amber-400 text-amber-950 px-4 py-2 rounded-full font-bold shadow-lg animate-bounce text-sm whitespace-nowrap">
                    📍 Click map to pin location
                </div>
            )}
            {!geocodingMode && selectedIds.length > 0 && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-indigo-600 text-white px-4 py-1.5 rounded-full text-xs font-bold shadow-lg whitespace-nowrap">
                    {selectedIds.length} selected — assign cluster in the panel →
                </div>
            )}
            <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }} ref={mapRef}>
                <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />
                <GeomanControls onDraw={handleDraw} />
                <FullscreenControl />
                <MapEvents active={!!geocodingMode} onMapClick={(lat, lng) => geocodingMode?.onPin(lat, lng)} />

                {customers.filter(c => c.lat && c.lng).map(customer => {
                    const isSelected = selectedIds.includes(customer.id);
                    return (
                        <Marker
                            key={customer.id}
                            position={[customer.lat!, customer.lng!]}
                            icon={isSelected ? SelectedIcon : DefaultIcon}
                            eventHandlers={{ click: () => toggleMarker(customer.id) }}
                        >
                            <Tooltip direction="top" offset={[0, -36]} opacity={1}>
                                <span style={{ fontWeight: 600 }}>{customer.name}</span>
                                {customer.cluster_id && <span style={{ color: '#6366f1', marginLeft: 4 }}>#{customer.cluster_id}</span>}
                            </Tooltip>
                            <Popup>
                                <div style={{ fontFamily: 'system-ui', padding: '2px 0', minWidth: 160 }}>
                                    <p style={{ fontWeight: 700, fontSize: 14, color: '#1e293b', marginBottom: 2 }}>{customer.name}</p>
                                    <p style={{ fontSize: 11, color: '#64748b', fontFamily: 'monospace', marginBottom: 6 }}>{customer.id}</p>
                                    <div style={{ fontSize: 11, color: customer.cluster_id ? '#4f46e5' : '#94a3b8', fontWeight: 600 }}>
                                        Cluster: {customer.cluster_id || 'Not assigned'}
                                    </div>
                                    <div style={{ marginTop: 8, fontSize: 11, color: isSelected ? '#22c55e' : '#94a3b8' }}>
                                        {isSelected ? '✓ Selected' : 'Click marker to select'}
                                    </div>
                                </div>
                            </Popup>
                        </Marker>
                    );
                })}
            </MapContainer>
        </div>
    );
}
