'use client';

import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Tooltip, Circle, Polygon, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import '@geoman-io/leaflet-geoman-free';
import '@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css';
import 'leaflet/dist/leaflet.css';
import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import { point, polygon as turfPolygon } from '@turf/helpers';
import { Customer, ClusterConfig } from '@/lib/kv';

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

const ClusteredIcon = L.icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
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
    clusterColors?: Record<string, string>;
    clusterConfigs?: ClusterConfig[];
    onShapeDrawn?: (shape: Partial<ClusterConfig>) => void;
    fullHeight?: boolean;
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

// Helper to create colored markers
const createColorIcon = (color: string) => {
    return new L.DivIcon({
        className: 'custom-div-icon',
        html: `<div style="background-color: ${color}; width: 14px; height: 14px; border: 2px solid white; border-radius: 50%; box-shadow: 0 0 10px rgba(0,0,0,0.5);"></div>`,
        iconSize: [14, 14],
        iconAnchor: [7, 7],
        popupAnchor: [0, -7],
    });
};

export default function Map({ customers, selectedIds, onSelection, geocodingMode, clusterColors, clusterConfigs, onShapeDrawn, fullHeight }: MapProps) {
    const center: [number, number] = [17.3850, 78.4867];
    const mapRef = useRef<L.Map>(null);

    const toggleMarker = (id: string) => {
        if (geocodingMode) return; // don't change selection in geocoding mode
        const next = selectedIds.includes(id)
            ? selectedIds.filter(x => x !== id)
            : [...selectedIds, id];
        onSelection(next);
    };

    const handleDraw = (layer: any) => {
        const found: string[] = [];
        if (layer.getLatLng && layer.getRadius) {
            const ctr = layer.getLatLng();
            const rad = layer.getRadius();
            customers.forEach(c => {
                if (c.lat && c.lng) {
                    const d = mapRef.current?.distance(ctr, [c.lat, c.lng]);
                    if (d !== undefined && d <= rad) found.push(c.id);
                }
            });
            if (onShapeDrawn) {
                onShapeDrawn({
                    type: 'circle',
                    circleData: { centerLat: ctr.lat, centerLng: ctr.lng, radius: rad }
                });
            }
        } else if (layer.getLatLngs) {
            let coords = layer.getLatLngs();
            if (Array.isArray(coords[0])) coords = coords[0];
            const latlngs = (coords as L.LatLng[]).map(ll => ({ lat: ll.lat, lng: ll.lng }));
            const poly = turfPolygon([latlngs.map(ll => [ll.lng, ll.lat]).concat([[latlngs[0].lng, latlngs[0].lat]])]);
            customers.forEach(c => {
                if (c.lat && c.lng && booleanPointInPolygon(point([c.lng, c.lat]), poly)) found.push(c.id);
            });
            if (onShapeDrawn) {
                onShapeDrawn({
                    type: 'polygon',
                    polygonData: latlngs
                });
            }
        }
        if (found.length > 0) {
            const next = Array.from(new Set([...selectedIds, ...found]));
            onSelection(next);
        }
    };

    return (
        <div
            className={`relative w-full overflow-hidden shadow-2xl border transition-all duration-300 ${fullHeight ? 'rounded-none border-none' : 'rounded-2xl border-white/10'} ${geocodingMode ? 'border-amber-400 ring-4 ring-amber-400/20' : selectedIds.length > 0 ? 'border-indigo-500/60' : ''}`}
            style={{ height: fullHeight ? '100%' : 'calc(100vh - 120px)', minHeight: fullHeight ? 'auto' : 500 }}
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

                {clusterConfigs?.map(config => (
                    config.type === 'circle' && config.circleData ? (
                        <Circle
                            key={config.id}
                            center={[config.circleData.centerLat, config.circleData.centerLng]}
                            radius={config.circleData.radius}
                            pathOptions={{ color: clusterColors?.[config.id] || '#6366f1', fillColor: clusterColors?.[config.id] || '#6366f1', fillOpacity: 0.1, weight: 1, dashArray: '5, 5' }}
                        />
                    ) : config.type === 'polygon' && config.polygonData ? (
                        <Polygon
                            key={config.id}
                            positions={config.polygonData.map(p => [p.lat, p.lng])}
                            pathOptions={{ color: clusterColors?.[config.id] || '#6366f1', fillColor: clusterColors?.[config.id] || '#6366f1', fillOpacity: 0.1, weight: 1, dashArray: '5, 5' }}
                        />
                    ) : null
                ))}

                {customers.filter(c => c.lat && c.lng).map(customer => {
                    const isSelected = selectedIds.includes(customer.id);
                    const isClustered = !!customer.cluster_id;

                    let icon;
                    if (clusterColors && customer.cluster_id) {
                        // In Clusters View, use specific colors
                        icon = createColorIcon(clusterColors[customer.cluster_id]);
                    } else if (isSelected) {
                        // Selection takes priority
                        icon = SelectedIcon;
                    } else if (isClustered) {
                        // Already clustered = Green
                        icon = ClusteredIcon;
                    } else {
                        // Default = Blue
                        icon = DefaultIcon;
                    }

                    return (
                        <Marker
                            key={customer.id}
                            position={[customer.lat!, customer.lng!]}
                            icon={icon}
                            eventHandlers={{ click: () => toggleMarker(customer.id) }}
                        >
                            <Tooltip direction="top" offset={[0, -36]} opacity={1}>
                                <span style={{ fontWeight: 600 }}>{customer.name}</span>
                                {customer.cluster_id && <span style={{ color: '#6366f1', marginLeft: 4 }}>#{customer.cluster_id}</span>}
                            </Tooltip>
                        </Marker>
                    );
                })}
            </MapContainer>
        </div>
    );
}
