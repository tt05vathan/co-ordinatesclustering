import { NextResponse } from 'next/server';
import { kv, Customer, ClusterConfig } from '@/lib/kv';
import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import { point, polygon as turfPolygon } from '@turf/helpers';

// Haversine distance formula in meters
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371e3; // metres
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
}

export async function GET() {
    try {
        const customers = await kv.get<Customer[]>('customers') || [];
        return NextResponse.json(customers);
    } catch {
        return NextResponse.json({ error: 'Failed to fetch customers' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const { updates }: { updates: { id: string, cluster_id?: string, lat?: number, lng?: number }[] } = await req.json();
        const customers = await kv.get<Customer[]>('customers') || [];
        const clusterConfigs = await kv.get<ClusterConfig[]>('cluster_configs') || [];

        const newCustomers = customers.map(c => {
            const update = updates.find(u => u.id === c.id);
            if (!update) return c;

            const updatedCustomer = { ...c, ...update };

            // Auto-assign cluster if coordinates are present/updated and cluster_id is NOT explicitly being changed
            if (updatedCustomer.lat && updatedCustomer.lng && !update.cluster_id) {
                for (const config of clusterConfigs) {
                    let isInside = false;

                    if (config.type === 'circle' && config.circleData) {
                        const dist = getDistance(updatedCustomer.lat, updatedCustomer.lng, config.circleData.centerLat, config.circleData.centerLng);
                        if (dist <= config.circleData.radius) isInside = true;
                    } else if (config.type === 'polygon' && config.polygonData) {
                        const poly = turfPolygon([config.polygonData.map(p => [p.lng, p.lat]).concat([[config.polygonData[0].lng, config.polygonData[0].lat]])]);
                        if (booleanPointInPolygon(point([updatedCustomer.lng, updatedCustomer.lat]), poly)) isInside = true;
                    }

                    if (isInside) {
                        updatedCustomer.cluster_id = config.id;
                        break;
                    }
                }
            }

            return updatedCustomer;
        });

        await kv.set('customers', newCustomers);
        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json({ error: 'Failed to update customers' }, { status: 500 });
    }
}

// Seed helper (for development)
export async function PUT() {
    const initialCustomers: Customer[] = [
        { id: '1', name: 'Customer A', lat: 12.9716, lng: 77.5946 },
        { id: '2', name: 'Customer B', lat: 12.9726, lng: 77.5956 },
        { id: '3', name: 'Customer C', lat: 12.9736, lng: 77.5966 },
        { id: '4', name: 'Customer D', lat: 12.9746, lng: 77.5976 },
        { id: '5', name: 'Customer E', lat: 12.9756, lng: 77.5986 },
    ];
    await kv.set('customers', initialCustomers);
    return NextResponse.json({ success: true, seeded: initialCustomers.length });
}
