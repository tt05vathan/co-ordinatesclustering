'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { Customer } from '@/lib/kv';
import { Save, X, ArrowLeft, RefreshCw, Edit3 } from 'lucide-react';
import Link from 'next/link';

const Map = dynamic(() => import('@/components/Map'), {
    ssr: false,
    loading: () => <div className="w-full bg-slate-900 animate-pulse rounded-2xl flex items-center justify-center text-slate-400" style={{ height: 'calc(100vh - 100px)' }}>Loading Map...</div>
});

const COLORS = [
    '#f43f5e', '#ec4899', '#d946ef', '#a855f7', '#8b5cf6', '#6366f1', '#3b82f6', '#0ea5e9', '#06b6d4', '#14b8a6', '#10b981', '#22c55e', '#84cc16', '#eab308', '#f59e0b', '#f97316', '#ef4444'
];

interface RenamingState {
    oldName: string;
    newName: string;
}

export default function ClustersPage() {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(false);
    const [renamingCluster, setRenamingCluster] = useState<RenamingState | null>(null);

    useEffect(() => { fetchCustomers(); }, []);

    const fetchCustomers = async () => {
        try {
            const res = await fetch('/api/customers');
            const data = await res.json();
            setCustomers(Array.isArray(data) ? data : []);
        } catch { console.error('Failed to fetch'); }
    };

    const updateCustomer = async (id: string, newCluster: string) => {
        setLoading(true);
        try {
            await fetch('/api/customers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ updates: [{ id, cluster_id: newCluster }] }),
            });
            await fetchCustomers();
        } finally { setLoading(false); }
    };

    const renameCluster = async () => {
        if (!renamingCluster || !renamingCluster.newName.trim()) return;
        setLoading(true);
        try {
            const clusterCustomers = customers.filter(c => c.cluster_id === renamingCluster.oldName);
            await fetch('/api/customers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ updates: clusterCustomers.map(c => ({ id: c.id, cluster_id: renamingCluster.newName })) }),
            });
            await fetchCustomers();
            setRenamingCluster(null);
        } finally { setLoading(false); }
    };

    const mappedCustomers = customers.filter(c => c.lat && c.lng);
    const clustersList = Array.from(new Set(mappedCustomers.filter(c => c.cluster_id).map(c => c.cluster_id).filter(Boolean) as string[])).sort();

    const clusterColors: Record<string, string> = {};
    clustersList.forEach((name, i) => {
        clusterColors[name] = COLORS[i % COLORS.length];
    });

    return (
        <main className="min-h-screen bg-[#0f172a] text-slate-100 font-sans">
            <div className="flex h-screen overflow-hidden">

                {/* Sidebar: Cluster Management */}
                <div className="w-80 bg-slate-800/40 backdrop-blur-xl border-r border-white/5 flex flex-col p-6 space-y-6">
                    <Link href="/" className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400 hover:text-white transition-colors group">
                        <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
                        Back to Dashboard
                    </Link>

                    <div>
                        <h1 className="text-2xl font-black bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                            Cluster Manager
                        </h1>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">
                            {clustersList.length} active groups
                        </p>
                    </div>

                    <div className="flex-1 overflow-y-auto pr-2 space-y-4 custom-scrollbar">
                        {clustersList.map((clusterName, idx) => {
                            const clusterColor = COLORS[idx % COLORS.length];
                            const clusterMembers = mappedCustomers.filter(c => c.cluster_id === clusterName);

                            return (
                                <div key={clusterName} className="bg-slate-900/40 border border-white/5 rounded-2xl p-4 space-y-3">
                                    <div className="flex justify-between items-center group">
                                        <div className="flex items-center gap-2">
                                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: clusterColor }} />
                                            {renamingCluster?.oldName === clusterName ? (
                                                <input
                                                    autoFocus
                                                    value={renamingCluster.newName}
                                                    onChange={e => setRenamingCluster({ oldName: clusterName, newName: e.target.value })}
                                                    onKeyDown={e => e.key === 'Enter' && renameCluster()}
                                                    className="bg-slate-800 border-b border-indigo-500 outline-none text-sm font-bold w-32 px-1 rounded"
                                                />
                                            ) : (
                                                <span className="font-bold text-sm text-slate-200 truncate max-w-[120px]">#{clusterName}</span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            {renamingCluster?.oldName === clusterName ? (
                                                <>
                                                    <button onClick={renameCluster} className="p-1 hover:text-green-400 transition-colors"><Save size={14} /></button>
                                                    <button onClick={() => setRenamingCluster(null)} className="p-1 hover:text-rose-400 transition-colors"><X size={14} /></button>
                                                </>
                                            ) : (
                                                <button
                                                    onClick={() => setRenamingCluster({ oldName: clusterName, newName: clusterName })}
                                                    className="p-1 text-slate-500 hover:text-indigo-400 transition-colors"
                                                >
                                                    <Edit3 size={14} />
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        {clusterMembers.map(member => (
                                            <div key={member.id} className="flex flex-col gap-1 bg-slate-800/30 p-2 rounded-lg border border-white/5">
                                                <p className="text-[10px] font-bold truncate text-slate-100">{member.name}</p>
                                                <div className="flex justify-between items-center">
                                                    <p className="text-[9px] font-mono text-slate-500 truncate max-w-[100px]">{member.id}</p>
                                                    <select
                                                        className="bg-slate-900 text-[9px] font-bold text-slate-400 hover:text-white cursor-pointer outline-none rounded px-1"
                                                        value={member.cluster_id || ''}
                                                        onChange={e => updateCustomer(member.id, e.target.value)}
                                                    >
                                                        <option value={member.cluster_id || ''}>Change Cluster...</option>
                                                        {clustersList.filter(c => c !== member.cluster_id).map(c => (
                                                            <option key={c} value={c}>Move to {c}</option>
                                                        ))}
                                                        <option value="">Ungroup</option>
                                                    </select>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {loading && (
                        <div className="flex items-center justify-center gap-2 text-indigo-400 text-[10px] font-bold py-2 bg-indigo-500/10 rounded-xl">
                            <RefreshCw size={12} className="animate-spin" />
                            Syncing Changes...
                        </div>
                    )}
                </div>

                {/* Full Display Map */}
                <div className="flex-1 relative">
                    <Map
                        customers={mappedCustomers}
                        selectedIds={[]}
                        onSelection={() => { }}
                        clusterColors={clusterColors}
                        fullHeight={true}
                    />
                </div>

            </div>
        </main>
    );
}
