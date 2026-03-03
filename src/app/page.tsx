'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { Customer } from '@/lib/kv';
import { Layers, Save, Trash2, Plus } from 'lucide-react';

const Map = dynamic(() => import('@/components/Map'), {
  ssr: false,
  loading: () => <div className="w-full h-[600px] bg-slate-900 animate-pulse rounded-2xl flex items-center justify-center text-slate-400">Loading Map...</div>
});

export default function Home() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [clusterName, setClusterName] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const res = await fetch('/api/customers');
      const data = await res.json();
      setCustomers(data);
    } catch {
      console.error('Failed to fetch customers');
    }
  };

  const handleSelection = (ids: string[]) => {
    setSelectedIds(ids);
  };

  const saveClusters = async () => {
    if (!clusterName) return alert('Please enter a cluster name');
    setLoading(true);

    const updates = selectedIds.map(id => ({ id, cluster_id: clusterName }));

    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates }),
      });

      if (res.ok) {
        await fetchCustomers();
        setSelectedIds([]);
        setClusterName('');
      } else {
        alert('Failed to save clusters. Make sure KV env vars are set.');
      }
    } catch {
      alert('Error saving clusters');
    } finally {
      setLoading(false);
    }
  };

  const seedData = async () => {
    await fetch('/api/customers', { method: 'PUT' });
    fetchCustomers();
  };

  return (
    <main className="min-h-screen bg-[#0f172a] text-slate-100 p-8 font-sans transition-colors duration-500">
      <div className="max-w-6xl mx-auto space-y-8">
        <header className="flex justify-between items-end border-b border-white/5 pb-6">
          <div>
            <h1 className="text-4xl font-black tracking-tight bg-gradient-to-r from-indigo-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
              ClusterMap Pro
            </h1>
            <p className="text-slate-400 mt-2 font-medium">Smart Geospatial Customer Segmentation</p>
          </div>
          <button
            onClick={seedData}
            className="text-xs font-bold uppercase tracking-widest text-slate-500 hover:text-indigo-400 transition-all px-3 py-1 bg-white/5 rounded-full border border-white/10 hover:border-indigo-400/30"
          >
            Seed Database
          </button>
        </header>

        <section className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-3">
            <Map customers={customers} onSelection={handleSelection} />
          </div>

          <div className="space-y-6">
            <div className="bg-slate-800/40 backdrop-blur-2xl border border-white/10 rounded-2xl p-6 shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500 opacity-50 group-hover:w-2 transition-all" />
              <div className="flex items-center gap-2 mb-6 text-indigo-400">
                <Layers size={18} />
                <h2 className="font-bold text-sm uppercase tracking-wider">Segmentation Control</h2>
              </div>

              {selectedIds.length > 0 ? (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="bg-slate-900/80 rounded-xl p-3 border border-white/5">
                    <p className="text-xs text-slate-500 uppercase font-black mb-1">Target</p>
                    <p className="text-lg font-bold text-indigo-100">
                      {selectedIds.length} <span className="text-slate-500 text-sm font-normal">Customers</span>
                    </p>
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] uppercase tracking-widest text-slate-400 font-black">
                      Assign Cluster Identifier
                    </label>
                    <input
                      type="text"
                      value={clusterName}
                      onChange={(e) => setClusterName(e.target.value)}
                      placeholder="e.g. ZONE_ALPHA"
                      className="w-full bg-slate-900/80 border border-slate-700/50 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500/50 outline-none transition-all placeholder:text-slate-600 font-mono text-sm"
                    />
                  </div>

                  <button
                    onClick={saveClusters}
                    disabled={loading}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold py-4 rounded-xl shadow-lg shadow-indigo-500/30 transition-all flex items-center justify-center gap-3 active:scale-95"
                  >
                    {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={18} />}
                    Apply Changes
                  </button>

                  <button
                    onClick={() => setSelectedIds([])}
                    className="w-full text-slate-500 hover:text-rose-400 text-xs font-bold uppercase tracking-widest py-2 transition-colors flex items-center justify-center gap-2"
                  >
                    <Trash2 size={14} /> Discard Selection
                  </button>
                </div>
              ) : (
                <div className="text-center py-12 space-y-4">
                  <div className="w-16 h-16 bg-slate-900/50 rounded-2xl flex items-center justify-center mx-auto mb-2 text-slate-700 border border-white/5 group-hover:border-indigo-500/20 transition-all">
                    <Plus size={32} />
                  </div>
                  <p className="text-xs text-slate-500 font-medium leading-relaxed px-4">
                    Select markers individually or use the <span className="text-indigo-400">drawing tools</span> on the map to define clusters.
                  </p>
                </div>
              )}
            </div>

            <div className="bg-slate-800/20 backdrop-blur-xl border border-white/5 rounded-2xl p-6 shadow-xl">
              <h3 className="font-bold text-[10px] uppercase tracking-widest text-slate-500 mb-4">Live Inventory</h3>
              <div className="space-y-3">
                {Array.from(new Set(customers.filter(c => c.cluster_id).map(c => c.cluster_id))).length > 0 ? (
                  Array.from(new Set(customers.filter(c => c.cluster_id).map(c => c.cluster_id))).map(cluster => (
                    <div key={cluster} className="flex justify-between items-center bg-slate-900/30 px-4 py-3 rounded-xl border border-white/5 hover:bg-slate-900/50 transition-colors">
                      <span className="font-mono text-sm text-indigo-300">#{cluster}</span>
                      <span className="text-xs font-bold bg-indigo-500/10 text-indigo-400 px-2 py-1 rounded-md">
                        {customers.filter(c => c.cluster_id === cluster).length}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-[10px] text-slate-600 italic text-center py-4">No clusters defined yet</p>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
