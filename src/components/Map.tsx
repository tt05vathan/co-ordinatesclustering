'use client';

import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents } from 'react-leaflet';
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
});
L.Marker.prototype.options.icon = DefaultIcon;

type MapProps = {
    customers: Customer[];
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
            editMode: true,
            dragMode: true,
            cutPolygon: false,
            removalMode: true,
        });

        map.on('pm:create', (e: { layer: L.Layer }) => {
            onDraw(e.layer);
            map.removeLayer(e.layer);
        });

        return () => {
            map.pm.removeControls();
            map.off('pm:create');
        };
    }, [map, onDraw]);

    return null;
}

function MapEvents({ onMapClick, active }: { onMapClick: (lat: number, lng: number) => void, active: boolean }) {
    useMapEvents({
        click(e) {
            if (active) {
                onMapClick(e.latlng.lat, e.latlng.lng);
            }
        },
    });
    return null;
}

export default function Map({ customers, onSelection, geocodingMode }: MapProps) {
    const center: [number, number] = [12.9716, 77.5946];
    const mapRef = useRef<L.Map>(null);

    const handleDraw = (layer: L.Layer) => {
        const selectedIds: string[] = [];

        if (layer instanceof L.Circle) {
            const center = layer.getLatLng();
            const radius = layer.getRadius();
            customers.forEach(c => {
                if (c.lat && c.lng) {
                    const dist = mapRef.current?.distance(center, [c.lat, c.lng]);
                    if (dist !== undefined && dist <= radius) {
                        selectedIds.push(c.id);
                    }
                }
            });
        } else if (layer instanceof L.Polygon) {
            const coords = layer.getLatLngs()[0] as L.LatLng[];
            const turfPoly = turfPolygon([coords.map(latlng => [latlng.lng, latlng.lat]).concat([[coords[0].lng, coords[0].lat]])]);
            customers.forEach(c => {
                if (c.lat && c.lng) {
                    const pt = point([c.lng, c.lat]);
                    if (booleanPointInPolygon(pt, turfPoly)) {
                        selectedIds.push(c.id);
                    }
                }
            });
        }

        if (selectedIds.length > 0) {
            onSelection(selectedIds);
        }
    };

    return (
        <div className={`w-full h-[600px] rounded-2xl overflow-hidden shadow-2xl border transition-all duration-300 ${geocodingMode ? 'border-amber-400 ring-4 ring-amber-400/20' : 'border-white/10'}`}>
            {geocodingMode && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[1000] bg-amber-400 text-amber-950 px-4 py-2 rounded-full font-bold shadow-lg animate-bounce text-sm">
                    Select location on map for customer {geocodingMode.customerId}
                </div>
            )}
            <MapContainer
                center={center}
                zoom={13}
                style={{ height: '100%', width: '100%' }}
                ref={mapRef}
            >
                <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />
                <GeomanControls onDraw={handleDraw} />
                <MapEvents
                    active={!!geocodingMode}
                    onMapClick={(lat, lng) => geocodingMode?.onPin(lat, lng)}
                />
                {customers.filter(c => c.lat && c.lng).map((customer) => (
                    <Marker
                        key={customer.id}
                        position={[customer.lat!, customer.lng!]}
                        eventHandlers={{
                            click: () => onSelection([customer.id])
                        }}
                    >
                        <Popup>
                            <div className="p-2">
                                <h3 className="font-bold text-gray-800">{customer.name}</h3>
                                <p className="text-sm text-gray-600 font-mono">ID: {customer.id}</p>
                                <p className="text-sm font-semibold text-indigo-600">
                                    Cluster: {customer.cluster_id || 'Unassigned'}
                                </p>
                            </div>
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>
        </div>
    );
}
