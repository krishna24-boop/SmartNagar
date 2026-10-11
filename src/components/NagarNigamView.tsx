import React, { useState, useEffect } from 'react';
import { Complaint, User, DepartmentType } from '../types';
import { HotspotMap } from './HotspotMap';
import { Language, TranslationBoundary } from '../Language';
import {
  Building2,
  AlertOctagon,
  Clock,
  Layers,
  MapPin,
  Flame,
  CheckCircle2,
  ArrowUpRight,
  Shield,
  Lock,
  BarChart3,
  TrendingUp,
  Filter,
  Eye,
} from 'lucide-react';

interface NagarNigamViewProps {
  currentUser: User;
  complaints: Complaint[];
  onRefresh: () => void;
  language: Language;
}

export const NagarNigamView: React.FC<NagarNigamViewProps> = ({
  currentUser,
  complaints,
  onRefresh,
  language,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'map' | 'late_alerts'>('overview');
  const [analytics, setAnalytics] = useState<any | null>(null);
  const [selectedMapComplaint, setSelectedMapComplaint] = useState<Complaint | null>(null);

  // Fetch summary analytics
  useEffect(() => {
    fetch('/api/analytics/summary', {
      headers: { Authorization: `Bearer ${currentUser.id}` },
    })
      .then((res) => res.json())
      .then((data) => setAnalytics(data))
      .catch((err) => console.warn('Analytics error:', err));
  }, [currentUser.id, complaints]);

  const totalCount = complaints.length;
  const criticalCount = complaints.filter(
    (c) => c.priority?.level === 'turant' && c.status !== 'ho_gaya'
  ).length;
  const lateCount = complaints.filter((c) => c.isLate && c.status !== 'ho_gaya').length;
  const resolvedCount = complaints.filter((c) => c.status === 'ho_gaya').length;
  const resolutionRate = totalCount > 0 ? Math.round((resolvedCount / totalCount) * 100) : 0;

  // Department totals
  const deptBreakdown: Record<DepartmentType, { total: number; pending: number; resolved: number }> = {
    sadak: { total: 0, pending: 0, resolved: 0 },
    safai: { total: 0, pending: 0, resolved: 0 },
    bijli: { total: 0, pending: 0, resolved: 0 },
    jal: { total: 0, pending: 0, resolved: 0 },
  };

  complaints.forEach((c) => {
    const d = deptBreakdown[c.category] || deptBreakdown['sadak'];
    d.total++;
    if (c.status === 'ho_gaya') d.resolved++;
    else d.pending++;
  });

  const lateComplaints = complaints.filter((c) => c.isLate && c.status !== 'ho_gaya');

  return (
    <TranslationBoundary language={language}>
    <div className="space-y-6">
      {/* Privacy Guarantee Notice */}
      <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-2xl flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-600 text-white rounded-xl">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
              <span>नगर निगम मुख्यालय: नागरिक पहचान सुरक्षा नीति (Identity Shield)</span>
              <span className="bg-emerald-200 text-emerald-800 text-[10px] px-2 py-0.5 rounded-full font-bold">
                Privacy Guaranteed
              </span>
            </div>
            <p className="text-[11px] text-emerald-800 mt-0.5">
              केंद्रीय मुख्यालय को केवल नगर की समस्याएं, हॉटस्पॉट व विभागीय प्रदर्शन दिखता है। नागरिक का नाम, मोबाइल नंबर व व्यक्तिगत पहचान <strong>सर्वर से ही नहीं भेजी जाती</strong>।
            </p>
          </div>
        </div>
      </div>

      {/* Top 4 KPI Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 uppercase">कुल शिकायतें</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">{totalCount}</div>
          <span className="text-[11px] text-slate-400">सभी 4 नागरिक विभागों में</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-red-600 uppercase">तुरंत/अति-गंभीर</span>
            <div className="p-2 bg-red-50 text-red-600 rounded-xl">
              <Flame className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-red-600">{criticalCount}</div>
          <span className="text-[11px] text-red-400">स्कोर &gt; 85 (लाइव सुरक्षा खतरा)</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-amber-600 uppercase">SLA विलंबित (Late)</span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-600">{lateCount}</div>
          <span className="text-[11px] text-amber-500">&gt;24-48h से अधिक समय से लंबित</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-emerald-600 uppercase">समाधान दर</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-600">{resolutionRate}%</div>
          <span className="text-[11px] text-emerald-500">{resolvedCount} मामले सफलतापूर्वक पूर्ण</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveSubTab('overview')}
          className={`py-3 px-5 font-bold text-xs sm:text-sm border-b-2 flex items-center gap-2 cursor-pointer transition-all ${
            activeSubTab === 'overview'
              ? 'border-purple-600 text-purple-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>विभागीय लंबित विश्लेषण (Department Pending)</span>
        </button>
        <button
          onClick={() => setActiveSubTab('map')}
          className={`py-3 px-5 font-bold text-xs sm:text-sm border-b-2 flex items-center gap-2 cursor-pointer transition-all ${
            activeSubTab === 'map'
              ? 'border-purple-600 text-purple-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <MapPin className="w-4 h-4" />
          <span>हॉटस्पॉट मानचित्र (Hotspot GIS Map)</span>
        </button>
        <button
          onClick={() => setActiveSubTab('late_alerts')}
          className={`py-3 px-5 font-bold text-xs sm:text-sm border-b-2 flex items-center gap-2 cursor-pointer transition-all ${
            activeSubTab === 'late_alerts'
              ? 'border-purple-600 text-purple-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <AlertOctagon className="w-4 h-4 text-red-500" />
          <span>विलंबित अलर्ट (Late SLA Breaches)</span>
          {lateCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-bold text-xs animate-pulse">
              {lateCount}
            </span>
          )}
        </button>
      </div>

      {/* Subtab 1: Department Overview & Pending Comparison */}
      {activeSubTab === 'overview' && (
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  विभाग-वार लंबित स्थिति (Department-Wise Pending Breakdown)
                </h3>
                <p className="text-xs text-slate-500">
                  प्रत्येक विभाग के कुल मामले, सक्रिय लंबित और निस्तारित का तुलनात्मक दृश्य।
                </p>
              </div>
              <span className="text-xs font-semibold px-2.5 py-1 bg-purple-50 text-purple-700 rounded-lg border border-purple-200">
                केंद्रीय मॉनिटरिंग
              </span>
            </div>

            {/* Department Comparison Cards */}
            <div className="grid md:grid-cols-4 gap-4">
              {[
                { key: 'sadak', name: 'सड़क एवं PWD', color: 'bg-amber-500', text: 'text-amber-700', icon: '🛣️' },
                { key: 'safai', name: 'सफाई प्रबंधन', color: 'bg-emerald-500', text: 'text-emerald-700', icon: '🧹' },
                { key: 'bijli', name: 'विद्युत व लाइट', color: 'bg-purple-500', text: 'text-purple-700', icon: '⚡' },
                { key: 'jal', name: 'जल संस्थान व नाला', color: 'bg-cyan-500', text: 'text-cyan-700', icon: '💧' },
              ].map((d) => {
                const stat = deptBreakdown[d.key as DepartmentType];
                const resolvedPct = stat.total > 0 ? Math.round((stat.resolved / stat.total) * 100) : 0;
                return (
                  <div key={d.key} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-lg">{d.icon}</span>
                      <span className="text-xs font-bold text-slate-700">{d.name}</span>
                    </div>
                    <div>
                      <div className="flex justify-between items-baseline mb-1">
                        <span className="text-xs text-slate-500">लंबित मामले:</span>
                        <span className="text-base font-extrabold text-slate-900">{stat.pending}</span>
                      </div>
                      <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${d.color}`}
                          style={{ width: `${stat.total > 0 ? (stat.pending / stat.total) * 100 : 0}%` }}
                        ></div>
                      </div>
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-200">
                      <span>कुल: {stat.total}</span>
                      <span className="text-emerald-600 font-bold">{resolvedPct}% पूर्ण</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Master Priority Ranking List */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  प्राथमिकता रैंक सूची (City-Wide Dynamic Priority Ranking)
                </h3>
                <p className="text-xs text-slate-500">
                  AI गंभीरता + ओपन-मेटियो बारिश प्रभाव + डुप्लीकेट क्लस्टर + लंबित दिनों के आधार पर क्रमबद्ध
                </p>
              </div>
            </div>

            <div className="divide-y divide-slate-100 overflow-x-auto">
              {complaints.map((c, idx) => (
                <div key={c.id} className="py-3.5 flex items-center justify-between gap-4 text-xs">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-slate-100 font-bold text-slate-600 flex items-center justify-center shrink-0">
                      #{idx + 1}
                    </span>
                    <img src={c.photoUrl} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0" />
                    <div>
                      <div className="font-bold text-slate-900 flex items-center gap-2">
                        <span>{c.title}</span>
                        <span className="text-[10px] font-mono text-slate-500">{c.trackingId}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                        <span>📍 {c.location?.address}</span>
                        <span>•</span>
                        <span className="text-indigo-600 font-semibold">{c.category?.toUpperCase()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {/* Score Chip */}
                    <div className="text-right">
                      <span className="text-sm font-extrabold text-red-600">{c.priority?.totalScore} अंक</span>
                      <span className="block text-[10px] text-slate-500">{c.priority?.level?.toUpperCase()}</span>
                    </div>
                    {/* Status badge */}
                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        c.status === 'ho_gaya'
                          ? 'bg-emerald-100 text-emerald-800'
                          : c.status === 'kaam_chalu'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      {c.status === 'ho_gaya'
                        ? 'समाधान हो गया'
                        : c.status === 'kaam_chalu'
                        ? 'काम चालू'
                        : 'दर्ज'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Subtab 2: Hotspot GIS Map */}
      {activeSubTab === 'map' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200">
            <h3 className="text-sm font-bold text-slate-900 mb-1">
              शहर का हॉटस्पॉट मानचित्र (Civic Hotspot Density Map)
            </h3>
            <p className="text-xs text-slate-500 mb-3">
              यह नक्शा अति-गंभीर समस्याओं के क्लस्टर और आगामी बारिश से संभावित जलभराव क्षेत्रों को प्रदर्शित करता है।
            </p>
            <HotspotMap
              complaints={complaints}
              selectedComplaintId={selectedMapComplaint?.id}
              onSelectComplaint={(c) => setSelectedMapComplaint(c)}
              height="540px"
            />
          </div>
        </div>
      )}

      {/* Subtab 3: Late Alerts */}
      {activeSubTab === 'late_alerts' && (
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-red-900 flex items-center gap-2">
                <AlertOctagon className="w-4 h-4 text-red-600" />
                विलंबित शिकायतें एवं SLA उल्लंघन ट्रैकर (Late Alerts)
              </h3>
              <p className="text-xs text-slate-500">
                निर्धारित समय सीमा से अधिक लंबित शिकायतें — मुख्यालय हस्तक्षेप अपेक्षित।
              </p>
            </div>
          </div>

          {lateComplaints.length === 0 ? (
            <div className="p-8 text-center text-emerald-600 text-sm font-bold bg-emerald-50 rounded-xl">
              ✓ बहुत बढ़िया! कोई भी शिकायत SLA समय सीमा से बाहर नहीं है।
            </div>
          ) : (
            <div className="space-y-3">
              {lateComplaints.map((c) => (
                <div
                  key={c.id}
                  className="p-4 rounded-xl border-2 border-red-200 bg-red-50/40 flex flex-wrap items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3">
                    <img src={c.photoUrl} alt="" className="w-16 h-16 rounded-xl object-cover" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">{c.title}</span>
                        <span className="text-xs font-mono font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded-md">
                          {c.trackingId}
                        </span>
                      </div>
                      <div className="text-xs text-slate-600 mt-1">📍 {c.location?.address}</div>
                      <div className="text-[11px] font-bold text-red-800 mt-1">
                        विलंब अवधि: {c.hoursElapsed} घंटे (निर्धारित SLA: {c.slaHours} घंटे)
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-bold text-indigo-700 block">
                      विभाग: {c.category?.toUpperCase()}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {c.departmentEta ? `विभाग समय: ${c.departmentEta}` : 'विभाग ने समय दर्ज नहीं किया'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
    </TranslationBoundary>
  );
};
