import { kv } from '@vercel/kv';

export { kv };

export type Customer = {
    id: string;
    name: string;
    lat: number;
    lng: number;
    cluster_id?: string;
};
