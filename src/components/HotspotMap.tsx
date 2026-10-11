import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { Complaint } from '../types';

interface HotspotMapProps {
  complaints: Complaint[];
  selectedComplaintId?: string | null;
  onSelectComplaint?: (complaint: Complaint) => void;
  height?: string;
  showSampleNotice?: boolean;
}

export const HotspotMap: React.FC<HotspotMapProps> = ({
  complaints,
  selectedComplaintId,
  onSelectComplaint,
  height = '500px',
  showSampleNotice = true,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  // Initialize Map once
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      // Default center: Hazratganj / Lucknow Civic Core (26.8467, 80.9462)
      const map = L.map(mapContainerRef.current, {
        center: [26.8467, 80.9462],
        zoom: 13,
        scrollWheelZoom: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors | SmartNagar Civic GIS',
        maxZoom: 18,
      }).addTo(map);

      markersLayerRef.current = L.layerGroup().addTo(map);
      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update Markers & Density Circles
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersLayer = markersLayerRef.current;
    if (!map || !markersLayer) return;

    markersLayer.clearLayers();

    const bounds = L.latLngBounds([]);

    // Category Hindi names
    const catLabels: Record<string, string> = {
      sadak: 'सड़क एवं PWD',
      safai: 'स्वच्छता विंग',
      bijli: 'विद्युत विभाग',
      jal: 'जल संस्थान',
    };

    complaints.forEach((c) => {
      const lat = c.location?.lat || 26.8467;
      const lng = c.location?.lng || 80.9462;
      bounds.extend([lat, lng]);

      // Pin Color based on Priority / Status
      let pinColor = '#3b82f6'; // blue default
      let haloColor = 'rgba(59, 130, 246, 0.2)';
      let pulseAnim = '';

      if (c.status === 'ho_gaya') {
        pinColor = '#10b981'; // green resolved
        haloColor = 'rgba(16, 185, 129, 0.15)';
      } else if (c.priority?.level === 'turant') {
        pinColor = '#ef4444'; // red critical
        haloColor = 'rgba(239, 68, 68, 0.35)';
        pulseAnim = 'animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;';
      } else if (c.priority?.level === 'gambhir') {
        pinColor = '#f97316'; // orange high
        haloColor = 'rgba(249, 115, 22, 0.25)';
      } else if (c.priority?.level === 'madhyam') {
        pinColor = '#eab308'; // yellow medium
        haloColor = 'rgba(234, 179, 8, 0.2)';
      }

      // Add density heat circle around unresolved complaints
      if (c.status !== 'ho_gaya') {
        L.circle([lat, lng], {
          color: pinColor,
          fillColor: haloColor,
          fillOpacity: 0.35,
          radius: c.priority?.level === 'turant' ? 380 : 250,
          weight: 1.5,
        }).addTo(markersLayer);
      }

      // Custom HTML Marker Icon
      const customIcon = L.divIcon({
        className: 'custom-civic-pin',
        html: `
          <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 34px; height: 34px;">
            ${
              c.priority?.level === 'turant' && c.status !== 'ho_gaya'
                ? `<div style="position: absolute; width: 44px; height: 44px; border-radius: 9999px; background: rgba(239, 68, 68, 0.4); ${pulseAnim}"></div>`
                : ''
            }
            <div style="width: 32px; height: 32px; border-radius: 50%; background: ${pinColor}; border: 2.5px solid white; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 13px;">
              ${
                c.category === 'sadak'
                  ? '🛣️'
                  : c.category === 'safai'
                  ? '🧹'
                  : c.category === 'bijli'
                  ? '⚡'
                  : '💧'
              }
            </div>
          </div>
        `,
        iconSize: [34, 34],
        iconAnchor: [17, 17],
      });

      const marker = L.marker([lat, lng], { icon: customIcon });

      // Popup Content
      const popupHtml = `
        <div style="font-family: sans-serif; min-width: 210px; max-width: 260px; padding: 2px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
            <span style="font-size: 11px; font-weight: 700; color: #4b5563;">${c.trackingId}</span>
            <span style="font-size: 10px; padding: 2px 6px; border-radius: 9999px; font-weight: 600; color: white; background: ${pinColor};">
              ${c.status === 'ho_gaya' ? 'समाधान हो गया' : c.priority?.level === 'turant' ? 'तुरंत' : c.priority?.level === 'gambhir' ? 'गंभीर' : 'मध्यम'}
            </span>
          </div>
          <div style="font-size: 13px; font-weight: 700; color: #111827; line-height: 1.3; margin-bottom: 4px;">
            ${c.title}
          </div>
          <div style="font-size: 11px; color: #6b7280; margin-bottom: 6px;">
            📍 ${c.location.address || 'क्षेत्र'}
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; font-size: 11px; border-top: 1px solid #e5e7eb; padding-top: 6px;">
            <span style="color: #4b5563; font-weight: 600;">${catLabels[c.category] || c.category}</span>
            <span style="font-weight: 700; color: #dc2626;">स्कोर: ${c.priority?.totalScore || 0}</span>
          </div>
          ${
            c.departmentEta
              ? `<div style="font-size: 10px; color: #0284c7; margin-top: 4px; font-weight: 600;">विभाग समय: ${c.departmentEta}</div>`
              : `<div style="font-size: 10px; color: #64748b; margin-top: 4px;">${c.aiAnalysis?.aiEtaText || 'AI का अंदाज़ा: 2 दिन'}</div>`
          }
        </div>
      `;

      marker.bindPopup(popupHtml);

      if (onSelectComplaint) {
        marker.on('click', () => {
          onSelectComplaint(c);
        });
      }

      marker.addTo(markersLayer);
    });

    if (complaints.length > 0 && bounds.isValid()) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
    }
  }, [complaints, onSelectComplaint]);

  return (
    <div className="relative rounded-2xl overflow-hidden border border-slate-200 shadow-sm bg-slate-50">
      <div ref={mapContainerRef} style={{ height, width: '100%' }} />

      {showSampleNotice && (
        <div className="absolute top-3 right-3 z-[1000] bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-300 shadow-md text-xs flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
          <span className="font-semibold text-slate-700">नमूना डेटा (Sample Data)</span>
          <span className="text-[10px] text-slate-500 border-l border-slate-200 pl-2">
            क्लस्टर व हॉटस्पॉट सिमुलेशन
          </span>
        </div>
      )}

      {/* Map Legend */}
      <div className="absolute bottom-3 left-3 z-[1000] bg-white/95 backdrop-blur-md px-3 py-2 rounded-xl border border-slate-200 shadow-md text-xs">
        <div className="text-[11px] font-bold text-slate-700 mb-1.5">प्राथमिकता हॉटस्पॉट (Priority Legend)</div>
        <div className="flex flex-wrap items-center gap-3 text-[11px]">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500"></span>
            <span className="text-slate-600 font-medium">तुरंत (स्कोर &gt; 85)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span>
            <span className="text-slate-600 font-medium">गंभीर (60 - 85)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-500"></span>
            <span className="text-slate-600 font-medium">मध्यम</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            <span className="text-slate-600 font-medium">समाधान हो गया</span>
          </div>
        </div>
      </div>
    </div>
  );
};
