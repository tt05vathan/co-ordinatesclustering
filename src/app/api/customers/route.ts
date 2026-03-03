import { NextResponse } from 'next/server';
import { kv, Customer } from '@/lib/kv';

export async function GET() {
    try {
        const customers = await kv.get<Customer[]>('customers') || [];
        return NextResponse.json(customers);
    } catch (error) {
        return NextResponse.json({ error: 'Failed to fetch customers' }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const { updates }: { updates: { id: string, cluster_id: string }[] } = await req.json();
        const customers = await kv.get<Customer[]>('customers') || [];

        const newCustomers = customers.map(c => {
            const update = updates.find(u => u.id === c.id);
            return update ? { ...c, cluster_id: update.cluster_id } : c;
        });

        await kv.set('customers', newCustomers);
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to update clusters' }, { status: 500 });
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
