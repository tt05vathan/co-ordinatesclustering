import { NextResponse } from 'next/server';
import { kv, ClusterConfig } from '@/lib/kv';

export async function GET() {
    try {
        const configs = await kv.get<ClusterConfig[]>('cluster_configs') || [];
        return NextResponse.json(configs);
    } catch {
        return NextResponse.json({ error: 'Failed to fetch cluster configurations' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const config: ClusterConfig = await req.json();

        if (!config.id || !config.type) {
            return NextResponse.json({ error: 'Missing required configuration fields' }, { status: 400 });
        }

        if (config.type === 'circle' && (!config.circleData?.centerLat || !config.circleData?.radius)) {
            return NextResponse.json({ error: 'Missing circle configuration data' }, { status: 400 });
        }

        if (config.type === 'polygon' && (!config.polygonData || config.polygonData.length < 3)) {
            return NextResponse.json({ error: 'Missing or invalid polygon configuration data' }, { status: 400 });
        }

        const configs = await kv.get<ClusterConfig[]>('cluster_configs') || [];

        const newConfigs = [...configs];
        const index = newConfigs.findIndex(c => c.id === config.id);
        if (index !== -1) {
            newConfigs[index] = config;
        } else {
            newConfigs.push(config);
        }

        await kv.set('cluster_configs', newConfigs);
        return NextResponse.json({ success: true, count: newConfigs.length });
    } catch (err) {
        console.error('Error saving cluster configuration:', err);
        return NextResponse.json({ error: 'Failed to save cluster configuration', details: String(err) }, { status: 500 });
    }
}
