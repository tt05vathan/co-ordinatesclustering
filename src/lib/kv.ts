import { createClient } from '@vercel/kv';

export const kv = createClient({
    url: process.env.KV_REST_API_URL!,
    token: process.env.KV_REST_API_TOKEN!,
});

export type Customer = {
    id: string;
    name: string;
    lat: number;
    lng: number;
    cluster_id?: string;
};
