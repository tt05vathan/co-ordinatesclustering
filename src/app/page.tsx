'use client';

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { Customer } from '@/lib/kv';
import { AlertCircle, CheckCircle2, MapPin, Layers, Save, X } from 'lucide-react';

const Map = dynamic(() => import('@/components/Map'), {
  ssr: false,
  loading: () => (
    <div className="w-full bg-slate-900 animate-pulse rounded-2xl flex items-center justify-center text-slate-400" style={{ height: 'calc(100vh - 120px)', minHeight: 500 }}>
      Loading Map…
    </div>
  ),
});

export default function Home() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [clusterName, setClusterName] = useState('');
  const [geocodingId, setGeocodingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchCustomers(); }, []);

  const fetchCustomers = async () => {
    try {
      const res = await fetch('/api/customers');
      const data = await res.json();
      setCustomers(Array.isArray(data) ? data : []);
    } catch { console.error('Failed to fetch'); }
  };

  const applyCluster = async () => {
    if (!clusterName.trim() || selectedIds.length === 0) return;
    setSaving(true);
    try {
      await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates: selectedIds.map(id => ({ id, cluster_id: clusterName.trim() })) }),
      });
      await fetchCustomers();
      setSelectedIds([]);
      setClusterName('');
    } finally { setSaving(false); }
  };

  const handlePinLocation = async (lat: number, lng: number) => {
    if (!geocodingId) return;
    setSaving(true);
    try {
      await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates: [{ id: geocodingId, lat, lng }] }),
      });
      await fetchCustomers();
      setGeocodingId(null);
    } finally { setSaving(false); }
  };

  const seedData = async () => { await fetch('/api/customers', { method: 'PUT' }); fetchCustomers(); };

  const mappedCustomers = customers.filter(c => c.lat && c.lng);
  const unmappedCustomers = customers.filter(c => !c.lat || !c.lng);
  const clusteredCount = mappedCustomers.filter(c => c.cluster_id).length;
  const clusters = Array.from(new Set(mappedCustomers.filter(c => c.cluster_id).map(c => c.cluster_id)));

  return (
    <main className="min-h-screen bg-[#0f172a] text-slate-100 font-sans">
      <div className="max-w-[1700px] mx-auto px-6 pt-6 pb-4 space-y-5">
        {/* Header */}
        <header className="flex justify-between items-center border-b border-white/5 pb-3">
          <div className="shrink-0">
            <h1 className="text-xl font-black tracking-tight bg-gradient-to-r from-indigo-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
              Clustering Map Pro Max
            </h1>
          </div>

          {/* Stats Boxes - In the middle */}
          <div className="hidden md:flex items-center gap-3">
            <div className="bg-slate-900/60 border border-white/5 px-3 py-1.5 rounded-xl flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Mapped</span>
              <span className="text-xs font-black text-white">{mappedCustomers.length}</span>
            </div>
            <div className="bg-slate-900/60 border border-white/5 px-3 py-1.5 rounded-xl flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Clustered</span>
              <span className="text-xs font-black text-white">{clusteredCount}</span>
            </div>
            <div className="bg-slate-900/60 border border-white/5 px-3 py-1.5 rounded-xl flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Unmapped</span>
              <span className="text-xs font-black text-white">{unmappedCustomers.length}</span>
            </div>
            <div className="bg-slate-900/60 border border-white/5 px-3 py-1.5 rounded-xl flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Clusters</span>
              <span className="text-xs font-black text-white">{clusters.length}</span>
            </div>
          </div>

          <div className="flex gap-3">
            <a
              href="/clusters"
              className="group flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-indigo-400 hover:text-indigo-300 transition-all px-4 py-1.5 bg-indigo-500/10 rounded-xl border border-indigo-500/20"
            >
              <Layers size={13} className="group-hover:rotate-12 transition-transform" />
              View Clusters
            </a>
     
          </div>
        </header>


        {/* Main Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">

          {/* Left: Unmapped Customers */}
          <div className="xl:col-span-2">
            <div className="bg-slate-800/40 border border-white/10 rounded-2xl p-4 shadow-xl flex flex-col" style={{ height: 'calc(100vh - 120px)', minHeight: 500 }}>
              <div className="flex items-center gap-2 mb-3 text-amber-400">
                <AlertCircle size={16} />
                <h2 className="font-bold text-xs uppercase tracking-wider">Unmapped ({unmappedCustomers.length})</h2>
              </div>
              <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                {unmappedCustomers.length > 0 ? unmappedCustomers.map(c => (
                  <div key={c.id} className={`p-2.5 rounded-xl border transition-all ${geocodingId === c.id ? 'bg-amber-400/15 border-amber-400' : 'bg-slate-900/50 border-white/5 hover:border-white/20'}`}>
                    <div className="flex justify-between items-center gap-1">
                      <div className="min-w-0">
                        <p className="font-semibold text-xs truncate">{c.name}</p>
                        <p className="text-[10px] font-mono text-slate-500 truncate">{c.id}</p>
                      </div>
                      <button onClick={() => setGeocodingId(geocodingId === c.id ? null : c.id)} className={`shrink-0 p-1.5 rounded-lg transition-all ${geocodingId === c.id ? 'bg-amber-400 text-amber-950' : 'bg-slate-800 text-slate-400 hover:text-white'}`}>
                        <MapPin size={13} />
                      </button>
                    </div>
                    {geocodingId === c.id && <p className="text-[9px] text-amber-400 font-bold mt-1 animate-pulse">↑ Click map to pin</p>}
                  </div>
                )) : (
                  <div className="text-center py-16 text-slate-600">
                    <CheckCircle2 size={28} className="mx-auto mb-3 opacity-20" />
                    <p className="text-[10px] italic">All mapped!</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Center: Map */}
          <div className="xl:col-span-8">
            <Map
              customers={customers}
              selectedIds={selectedIds}
              onSelection={setSelectedIds}
              geocodingMode={geocodingId ? { customerId: geocodingId, onPin: handlePinLocation } : undefined}
            />
          </div>

          {/* Right: Cluster Assignment + Inventory */}
          <div className="xl:col-span-2 flex flex-col gap-4" style={{ height: 'calc(100vh - 120px)', minHeight: 500 }}>

            {/* Cluster Assignment Panel — always visible */}
            <div className="bg-slate-800/40 border border-white/10 rounded-2xl p-4 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full  opacity-60" />
              <div className="flex items-center gap-2 mb-4 text-indigo-400">
                <Layers size={16} />
                <h2 className="font-bold text-xs uppercase tracking-wider">Assign Cluster</h2>
              </div>

              <div className="mb-3">
                <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Selected</p>
                <p className="text-xl font-black text-white">
                  {selectedIds.length}
                  <span className="text-xs font-normal text-slate-500 ml-1">customers</span>
                </p>
              </div>

              <div className="mb-3">
                <label className="text-[10px] uppercase tracking-widest text-slate-400 font-bold block mb-1.5">Cluster Name / ID</label>
                <input
                  type="text"
                  value={clusterName}
                  onChange={e => setClusterName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && applyCluster()}
                  placeholder="e.g. ZONE_A"
                  className="w-full bg-slate-900 border border-slate-700/50 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all placeholder:text-slate-600 font-mono"
                />
              </div>

              <button
                onClick={applyCluster}
                disabled={saving || selectedIds.length === 0 || !clusterName.trim()}
                className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold py-2.5 rounded-lg shadow-lg transition-all flex items-center justify-center gap-2 text-sm"
              >
                {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={15} />}
                Apply to All
              </button>

              {selectedIds.length > 0 && (
                <button onClick={() => setSelectedIds([])} className="w-full mt-2 text-slate-500 hover:text-rose-400 text-[10px] font-bold uppercase tracking-widest py-1.5 transition-colors flex items-center justify-center gap-1">
                  <X size={11} /> Clear selection
                </button>
              )}

              {selectedIds.length === 0 && (
                <p className="text-[10px] text-slate-600 italic text-center mt-3 leading-relaxed">
                  Click markers or draw shapes on the map to select customers
                </p>
              )}
            </div>

            {/* Cluster Inventory */}
            <div className="bg-slate-800/20 border border-white/5 rounded-2xl p-4 shadow-xl flex-1 overflow-hidden flex flex-col">
              <h3 className="font-bold text-[10px] uppercase tracking-widest text-slate-500 mb-3">Live Inventory</h3>
              <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                {clusters.length > 0 ? clusters.map(cluster => (
                  <div key={cluster} className="flex justify-between items-center bg-slate-900/50 px-3 py-2 rounded-lg border border-white/5">
                    <span className="font-mono text-xs text-indigo-300 truncate">#{cluster}</span>
                    <span className="shrink-0 ml-2 text-[10px] font-bold bg-indigo-500/15 text-indigo-400 px-1.5 py-0.5 rounded-md">
                      {mappedCustomers.filter(c => c.cluster_id === cluster).length}
                    </span>
                  </div>
                )) : (
                  <p className="text-[10px] text-slate-600 italic text-center py-6">No clusters yet</p>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
    </main>
  );
}
