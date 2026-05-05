import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { motion } from 'motion/react';
import { Globe, ShieldAlert, Activity, MessageSquare } from 'lucide-react';
import { cn } from '../lib/utils';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';

import { getApiUrl } from '../lib/api';

// Fix for Leaflet icons in React
import L from 'leaflet';

// @ts-ignore
import icon from 'leaflet/dist/images/marker-icon.png';
// @ts-ignore
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

export default function MapView() {
  const [threats, setThreats] = useState<any[]>([]);
  const [liveIntel, setLiveIntel] = useState<any[]>([]);

  useEffect(() => {
    // 1. Initial Map Seed Data
    fetch(getApiUrl('/api/map-data'))
      .then(res => res.json())
      .then(data => setThreats(Array.isArray(data) ? data : []))
      .catch(() => setThreats([]));

    // 2. Real-time Live Intel Sync from Firestore
    const q = query(collection(db, 'reports'), orderBy('createdAt', 'desc'), limit(10));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const liveReports = snapshot.docs.map(doc => {
        const data = doc.data({ serverTimestamps: 'estimate' });
        // Generate pseudo-location based on node/metadata if not present
        // In a real app, this would come from sanitized geolocation
        return {
          id: doc.id,
          city: `ARHAM_NODE_${data.reporterId?.substring(0,4)}`,
          lat: 20 + (Math.random() * 20 - 10), // Random cluster around India/SEA
          lng: 80 + (Math.random() * 40 - 20),
          intensity: data.riskScore || 85,
          type: 'NEURAL_DETECTION',
          content: data.content
        };
      });
      setLiveIntel(liveReports);
    });

    return () => unsubscribe();
  }, []);

  const allThreats = [...threats, ...liveIntel];

  return (
    <div className="space-y-8 py-8">
      <div className="flex justify-between items-end">
        <div className="space-y-1">
          <h1 className="text-4xl font-headline font-black text-white uppercase tracking-tighter italic flex items-center gap-4">
            <Globe className="text-primary" />
            Global_Threat_Matrix
          </h1>
          <p className="text-xs font-mono text-slate-500 uppercase tracking-[0.3em]">Neural Link Synchronization: ACTIVE</p>
        </div>
        <div className="flex gap-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-error rounded-full animate-pulse" />
            <span className="text-[10px] font-mono text-slate-500 uppercase">Live Detection</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-primary rounded-full" />
            <span className="text-[10px] font-mono text-slate-500 uppercase">Established Node</span>
          </div>
        </div>
      </div>

      <div className="glass-panel rounded-[3rem] overflow-hidden border-white/10 shadow-cyber-glow h-[600px] relative">
        <MapContainer 
          center={[20, 80]} 
          zoom={4} 
          style={{ height: '100%', width: '100%', background: '#0a0c10' }}
          zoomControl={false}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
          />
          {allThreats.map((threat, idx) => (
            <CircleMarker
              key={`${threat.id}-${idx}`}
              center={[threat.lat, threat.lng]}
              radius={threat.intensity / 4}
              pathOptions={{
                fillColor: threat.type === 'NEURAL_DETECTION' ? '#8ed5ff' : '#ff4d4d',
                color: threat.type === 'NEURAL_DETECTION' ? '#8ed5ff' : '#ff4d4d',
                weight: threat.type === 'NEURAL_DETECTION' ? 2 : 1,
                opacity: 0.8,
                fillOpacity: 0.3
              }}
            >
              <Popup className="cyber-popup">
                <div className="p-2 space-y-2 max-w-[200px]">
                  <h4 className="font-headline font-black text-xs uppercase tracking-tight text-white">{threat.city}</h4>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-mono text-primary uppercase font-bold">{threat.type}</span>
                    <span className="text-[9px] font-mono text-slate-500">Risk: {threat.intensity}%</span>
                  </div>
                  {threat.content && (
                    <p className="text-[8px] font-mono text-slate-400 border-t border-white/5 pt-2 italic line-clamp-2">
                      "{threat.content}"
                    </p>
                  )}
                </div>
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>

        {/* Overlay UI */}
        <div className="absolute bottom-8 left-8 z-[1000] space-y-4">
          <div className="glass-panel p-6 rounded-3xl border-primary/20 backdrop-blur-md max-w-[300px]">
            <div className="flex items-center gap-3 mb-4">
              <Activity className="w-4 h-4 text-primary" />
              <span className="text-xs font-headline font-black text-white uppercase tracking-widest">NEURAL_LIVE_INTEL</span>
            </div>
            <div className="space-y-3">
              {liveIntel.length > 0 ? liveIntel.slice(0, 3).map((threat, i) => (
                <motion.div 
                  key={i} 
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-center gap-3"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                  <span className="text-[9px] font-mono text-slate-300 uppercase truncate">{threat.city} // SCAN_DETECTED</span>
                </motion.div>
              )) : (
                <div className="flex items-center gap-3 opacity-30">
                  <MessageSquare className="w-3 h-3" />
                  <span className="text-[9px] font-mono text-slate-500 uppercase">Listening for global threats...</span>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="absolute top-8 right-8 z-[1000]">
          <div className="glass-panel p-4 rounded-2xl border-white/10 flex items-center gap-4">
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-mono text-slate-500 uppercase tracking-widest">Neural Load</span>
              <span className="text-xl font-headline font-black text-white italic">{(allThreats.length * 1.5).toFixed(0)} TP/s</span>
            </div>
            <div className="w-[1px] h-8 bg-white/10" />
            <ShieldAlert className="w-6 h-6 text-error animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  );
}
