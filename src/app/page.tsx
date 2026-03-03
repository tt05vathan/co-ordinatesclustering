'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { Customer } from '@/lib/kv';
import { Layers, Save, Plus, MapPin, AlertCircle, CheckCircle2 } from 'lucide-react';

const Map = dynamic(() => import('@/components/Map'), {
  ssr: false,
  loading: () => <div className="w-full h-[600px] bg-slate-900 animate-pulse rounded-2xl flex items-center justify-center text-slate-400">Loading Map...</div>
});

export default function Home() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [clusterName, setClusterName] = useState('');
  const [loading, setLoading] = useState(false);
  const [geocodingId, setGeocodingId] = useState<string | null>(null);

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

  const saveUpdates = async (updates: Partial<Customer>[]) => {
    setLoading(true);
    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates }),
      });

      if (res.ok) {
        await fetchCustomers();
        return true;
      }
      return false;
    } catch {
      return false;
    } finally {
      setLoading(false);
    }
  };

  const applyCluster = async () => {
    if (!clusterName) return alert('Please enter a cluster name');
    const updates = selectedIds.map(id => ({ id, cluster_id: clusterName }));
    if (await saveUpdates(updates)) {
      setSelectedIds([]);
      setClusterName('');
    }
  };

  const assignLocation = async (lat: number, lng: number) => {
    if (!geocodingId) return;
    const updates = [{ id: geocodingId, lat, lng }];
    if (await saveUpdates(updates)) {
      setGeocodingId(null);
    }
  };

  const seedData = async () => {
    await fetch('/api/customers', { method: 'PUT' });
    fetchCustomers();
  };

  const mappedCustomers = customers.filter(c => c.lat && c.lng);
  const unmappedCustomers = customers.filter(c => !c.lat || !c.lng);

  return (
    <main className="min-h-screen bg-[#0f172a] text-slate-100 p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        <header className="flex justify-between items-end border-b border-white/5 pb-6">
          <div>
            <h1 className="text-4xl font-black tracking-tight bg-gradient-to-r from-indigo-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
              ClusterMap Pro
            </h1>
            <p className="text-slate-400 mt-2 font-medium">Smart Geospatial Customer Segmentation</p>
          </div>
          <button
            onClick={seedData}
            className="text-xs font-bold uppercase tracking-widest text-slate-500 hover:text-indigo-400 transition-all px-3 py-1 bg-white/5 rounded-full border border-white/10"
          >
            Seed Sample Data
          </button>
        </header>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
          {/* Left Sidebar: Unmapped Customers */}
          <div className="xl:col-span-3 space-y-6">
            <div className="bg-slate-800/40 backdrop-blur-xl border border-white/10 rounded-2xl p-5 shadow-xl h-[600px] flex flex-col">
              <div className="flex items-center gap-2 mb-4 text-amber-400">
                <AlertCircle size={18} />
                <h2 className="font-bold text-sm uppercase tracking-wider">Unmapped ({unmappedCustomers.length})</h2>
              </div>

              <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                {unmappedCustomers.length > 0 ? (
                  unmappedCustomers.map(customer => (
                    <div
                      key={customer.id}
                      className={`p-3 rounded-xl border transition-all ${geocodingId === customer.id ? 'bg-amber-400/20 border-amber-400 shadow-lg' : 'bg-slate-900/50 border-white/5 hover:border-white/20'}`}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div className="max-w-[150px]">
                          <p className="font-bold text-sm truncate">{customer.name}</p>
                          <p className="text-[10px] font-mono text-slate-500 truncate">{customer.id}</p>
                        </div>
                        <button
                          onClick={() => setGeocodingId(geocodingId === customer.id ? null : customer.id)}
                          className={`p-2 rounded-lg transition-all ${geocodingId === customer.id ? 'bg-amber-400 text-amber-950' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
                        >
                          <MapPin size={16} />
                        </button>
                      </div>
                      {geocodingId === customer.id && (
                        <p className="text-[10px] text-amber-400 font-bold animate-pulse">Click map to pin location</p>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="text-center py-20 text-slate-600">
                    <CheckCircle2 size={32} className="mx-auto mb-4 opacity-20" />
                    <p className="text-xs font-medium italic">All customers mapped</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Center: Map */}
          <div className="xl:col-span-6">
            <Map
              customers={customers}
              onSelection={handleSelection}
              geocodingMode={geocodingId ? { customerId: geocodingId, onPin: assignLocation } : undefined}
            />
          </div>

          {/* Right Sidebar: Cluster Controls */}
          <div className="xl:col-span-3 space-y-6">
            <div className="bg-slate-800/40 backdrop-blur-2xl border border-white/10 rounded-2xl p-6 shadow-2xl relative overflow-hidden group">
              <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500 opacity-50 group-hover:w-2 transition-all" />
              <div className="flex items-center gap-2 mb-6 text-indigo-400">
                <Layers size={18} />
                <h2 className="font-bold text-sm uppercase tracking-wider">Segmentation</h2>
              </div>

              {selectedIds.length > 0 ? (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                  <div className="bg-slate-900/80 rounded-xl p-3 border border-white/5">
                    <p className="text-xs text-slate-500 uppercase font-black mb-1">Target</p>
                    <p className="text-lg font-bold text-indigo-100">{selectedIds.length} Selection</p>
                  </div>

                  <div className="space-y-3">
                    <label className="text-[10px] uppercase tracking-widest text-slate-400 font-black">Cluster Identifier</label>
                    <input
                      type="text"
                      value={clusterName}
                      onChange={(e) => setClusterName(e.target.value)}
                      placeholder="e.g. ZONE_B"
                      className="w-full bg-slate-900 border border-slate-700/50 rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder:text-slate-600 font-mono text-sm"
                    />
                  </div>

                  <button
                    onClick={applyCluster}
                    disabled={loading}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold py-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-3"
                  >
                    {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={18} />}
                    Apply
                  </button>

                  <button
                    onClick={() => setSelectedIds([])}
                    className="w-full text-slate-500 hover:text-rose-400 text-[10px] font-black uppercase tracking-widest py-2 transition-colors"
                  >
                    Discard Selection
                  </button>
                </div>
              ) : (
                <div className="text-center py-12 space-y-4">
                  <div className="w-16 h-16 bg-slate-900/50 rounded-2xl flex items-center justify-center mx-auto text-slate-700 border border-white/5">
                    <Plus size={32} />
                  </div>
                  <p className="text-[10px] text-slate-500 font-medium leading-relaxed px-4">
                    Draw shapes on the map or click markers to define clusters.
                  </p>
                </div>
              )}
            </div>

            <div className="bg-slate-800/20 backdrop-blur-xl border border-white/5 rounded-2xl p-6 shadow-xl max-h-[250px] overflow-y-auto custom-scrollbar">
              <h3 className="font-bold text-[10px] uppercase tracking-widest text-slate-500 mb-4">Live Inventory</h3>
              <div className="space-y-3">
                {Array.from(new Set(mappedCustomers.filter(c => c.cluster_id).map(c => c.cluster_id))).length > 0 ? (
                  Array.from(new Set(mappedCustomers.filter(c => c.cluster_id).map(c => c.cluster_id))).map(cluster => (
                    <div key={cluster} className="flex justify-between items-center bg-slate-900/30 px-3 py-2 rounded-lg border border-white/5 hover:bg-slate-900/50 transition-colors">
                      <span className="font-mono text-xs text-indigo-300">#{cluster}</span>
                      <span className="text-[10px] font-bold bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded">
                        {mappedCustomers.filter(c => c.cluster_id === cluster).length}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-[10px] text-slate-600 italic text-center py-4">No clusters defined</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
