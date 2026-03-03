import { kv } from '@vercel/kv';

export { kv };

export type Customer = {
    id: string;
    name: string;
    lat?: number;
    lng?: number;
    cluster_id?: string;
};
export type ClusterConfig = {
    id: string; // The cluster name/id
    type: 'circle' | 'polygon';
    circleData?: {
        centerLat: number;
        centerLng: number;
        radius: number;
    };
    polygonData?: { lat: number, lng: number }[];
};
