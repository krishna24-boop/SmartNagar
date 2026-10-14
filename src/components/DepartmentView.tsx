import React, { useRef, useState } from 'react';
import { Complaint, User, DepartmentType, ComplaintStatus } from '../types';
import { Language, TranslationBoundary } from '../Language';
import { HotspotMap } from './HotspotMap';
import {
  ShieldAlert,
  Clock,
  CheckCircle2,
  AlertTriangle,
  MapPin,
  Calendar,
  CloudRain,
  ChevronRight,
  Filter,
  ArrowUpRight,
  Send,
  Lock,
  Wrench,
  Camera,
  Check,
} from 'lucide-react';

interface DepartmentViewProps {
  currentUser: User;
  complaints: Complaint[];
  onStatusUpdated: () => void;
  language: Language;
}

export const DepartmentView: React.FC<DepartmentViewProps> = ({
  currentUser,
  complaints,
  onStatusUpdated,
  language,
}) => {
  const departmentNameMap: Record<DepartmentType, string> = {
    sadak: 'सड़क एवं PWD विंग (Roads & Potholes)',
    safai: 'स्वच्छता एवं ठोस अपशिष्ट (Sanitation & Waste)',
    bijli: 'मार्ग प्रकाश एवं विद्युत अनुरक्षण (Electricity & Lighting)',
    jal: 'जल संस्थान एवं जल निकासी (Water & Drainage)',
  };

  const currentDept = currentUser.department || 'sadak';
  const deptTitle = departmentNameMap[currentDept] || 'विभागीय डैशबोर्ड';

  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('pending'); // 'pending' | 'in_progress' | 'resolved' | 'all'

  // Modal / action state for updating a complaint
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [newStatus, setNewStatus] = useState<ComplaintStatus>('kaam_chalu');
  const [departmentEta, setDepartmentEta] = useState('');
  const [departmentNote, setDepartmentNote] = useState('');
  const [resolutionPhotoUrl, setResolutionPhotoUrl] = useState('');
  const [resolutionNote, setResolutionNote] = useState('');
  const [updating, setUpdating] = useState(false);
  const [resolutionPhotoError, setResolutionPhotoError] = useState('');
  const resolutionPhotoInputRef = useRef<HTMLInputElement>(null);

  // Filter complaints
  const filtered = complaints.filter((c) => {
    if (filterPriority !== 'all' && c.priority?.level !== filterPriority) return false;
    if (filterStatus === 'pending' && c.status !== 'darj') return false;
    if (filterStatus === 'in_progress' && c.status !== 'kaam_chalu') return false;
    if (filterStatus === 'resolved' && c.status !== 'ho_gaya') return false;
    return true;
  });

  const openActionModal = (c: Complaint) => {
    setSelectedComplaint(c);
    setNewStatus(c.status === 'darj' ? 'kaam_chalu' : c.status);
    setDepartmentEta(c.departmentEta || '2 दिन में कार्य पूर्ण होगा');
    setDepartmentNote(c.departmentNote || '');
    setResolutionNote(c.resolutionNote || 'स्थल पर कार्य पूर्ण कर दिया गया है।');
    setResolutionPhotoUrl(c.resolutionPhotoUrl || '');
    setResolutionPhotoError('');
  };

  const handleResolutionPhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setResolutionPhotoError('कृपया image फोटो चुनें।');
      return;
    }
    if (file.size > 16 * 1024 * 1024) {
      setResolutionPhotoError('फोटो का आकार 16 MB से कम होना चाहिए।');
      return;
    }

    try {
      const image = await createImageBitmap(file);
      const scale = Math.min(1, 1280 / Math.max(image.width, image.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Canvas is unavailable.');
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      image.close();
      setResolutionPhotoUrl(canvas.toDataURL('image/jpeg', 0.8));
      setResolutionPhotoError('');
    } catch (error) {
      console.error('Failed to process resolution proof photo:', error);
      setResolutionPhotoError('फोटो प्रोसेस नहीं हो सकी। दूसरी फोटो चुनें।');
    }
  };

  const handleSaveAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedComplaint) return;
    if (newStatus === 'ho_gaya' && !resolutionPhotoUrl.startsWith('data:image/')) {
      setResolutionPhotoError('शिकायत पूरी करने के लिए काम के बाद की फोटो अपलोड करना जरूरी है।');
      return;
    }

    setUpdating(true);
    try {
      const res = await fetch(`/api/complaints/${selectedComplaint.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${currentUser.id}`,
        },
        body: JSON.stringify({
          status: newStatus,
          departmentEta,
          departmentNote,
          resolutionPhotoUrl: newStatus === 'ho_gaya' ? resolutionPhotoUrl : undefined,
          resolutionNote: newStatus === 'ho_gaya' ? resolutionNote : undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        const message = data.error || 'अपडेट विफल रहा';
        if (newStatus === 'ho_gaya') setResolutionPhotoError(message);
        throw new Error(message);
      }

      onStatusUpdated();
      setSelectedComplaint(null);
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <TranslationBoundary language={language}>
    <div className="space-y-6">
      {/* Privacy Guarantee Banner */}
      <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-2xl flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-600 text-white rounded-xl">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
              <span>सर्वर-स्तरीय नागरिक निजता सुरक्षा (Citizen Privacy Active)</span>
              <span className="bg-emerald-200 text-emerald-800 text-[10px] px-2 py-0.5 rounded-full font-bold">
                Zero Personal Data
              </span>
            </div>
            <p className="text-[11px] text-emerald-800 mt-0.5">
              इस विभागीय डैशबोर्ड के API रिस्पॉन्स से नागरिक का नाम, मोबाइल नंबर व ईमेल सर्वर स्तर पर पूरी तरह विलोपित (strip) हैं।
            </p>
          </div>
        </div>
      </div>

      {/* Header Info & Stats */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">
            विभागीय कार्यभार
          </span>
          <h2 className="text-lg font-bold text-slate-900">{deptTitle}</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            प्राथमिकता स्कोर व आगामी मौसम जोखिम के आधार पर शिकायतों का निस्तारण करें।
          </p>
        </div>

        {/* Quick KPI stats */}
        <div className="flex items-center gap-3">
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-center min-w-[90px]">
            <span className="text-[10px] font-bold text-red-600 block">तुरंत (Critical)</span>
            <span className="text-base font-extrabold text-red-700">
              {complaints.filter((c) => c.priority?.level === 'turant' && c.status !== 'ho_gaya').length}
            </span>
          </div>
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-center min-w-[90px]">
            <span className="text-[10px] font-bold text-amber-600 block">लंबित (Pending)</span>
            <span className="text-base font-extrabold text-amber-700">
              {complaints.filter((c) => c.status === 'darj').length}
            </span>
          </div>
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-center min-w-[90px]">
            <span className="text-[10px] font-bold text-emerald-600 block">निस्तारित (Resolved)</span>
            <span className="text-base font-extrabold text-emerald-700">
              {complaints.filter((c) => c.status === 'ho_gaya').length}
            </span>
          </div>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 text-xs">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="font-bold text-slate-700">स्थिति:</span>
          <div className="flex gap-1">
            {[
              { id: 'pending', label: 'दर्ज (लंबित)' },
              { id: 'in_progress', label: 'काम चालू' },
              { id: 'resolved', label: 'हो गया (समाधान)' },
              { id: 'all', label: 'सभी' },
            ].map((st) => (
              <button
                key={st.id}
                onClick={() => setFilterStatus(st.id)}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                  filterStatus === st.id
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-700">प्राथमिकता:</span>
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-slate-300 font-semibold bg-white"
          >
            <option value="all">सभी प्राथमिकता स्तर</option>
            <option value="turant">तुरंत (Immediate)</option>
            <option value="gambhir">गंभीर (High)</option>
            <option value="madhyam">मध्यम (Medium)</option>
            <option value="kam">सामान्य (Low)</option>
          </select>
        </div>
      </div>

      <section className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900">शिकायतों का स्थान (Complaint Locations)</h3>
          <p className="text-xs text-slate-500 mt-1">मैप पर अपने विभाग की शिकायत के पिन को चुनकर जगह देखें।</p>
        </div>
        {complaints.length > 0 ? (
          <HotspotMap complaints={complaints} height="360px" showSampleNotice={false} />
        ) : (
          <div className="h-36 rounded-xl border border-dashed border-slate-300 bg-slate-50 flex items-center justify-center text-sm text-slate-500">
            अभी आपके विभाग में मैप पर दिखाने के लिए कोई शिकायत नहीं है।
          </div>
        )}
      </section>

      {/* Complaints Queue */}
      {filtered.length === 0 ? (
        <div className="p-12 bg-white rounded-2xl border border-slate-200 text-center text-slate-500 text-sm">
          इस फिल्टर के अंतर्गत कोई शिकायत लंबित नहीं है।
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {filtered.map((c) => (
            <div
              key={c.id}
              className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col justify-between"
            >
              <div>
                {/* Header */}
                <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-slate-700">
                      {c.trackingId}
                    </span>
                    {c.isLate && c.status !== 'ho_gaya' && (
                      <span className="text-[10px] bg-red-100 text-red-700 font-bold px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
                        <AlertTriangle className="w-3 h-3" />
                        SLA विलंबित ({c.hoursElapsed}h)
                      </span>
                    )}
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${
                      c.priority?.level === 'turant'
                        ? 'bg-red-500 text-white'
                        : c.priority?.level === 'gambhir'
                        ? 'bg-orange-500 text-white'
                        : 'bg-amber-500 text-white'
                    }`}
                  >
                    स्कोर: {c.priority?.totalScore} ({c.priority?.level?.toUpperCase()})
                  </span>
                </div>

                {/* Content */}
                <div className="p-4 space-y-3">
                  <div className="flex gap-3">
                    <img
                      src={c.photoUrl}
                      alt={c.title}
                      className="w-24 h-24 rounded-xl object-cover border border-slate-200 shrink-0"
                    />
                    <div className="space-y-1 flex-1">
                      <h4 className="text-sm font-bold text-slate-900 leading-tight">{c.title}</h4>
                      <div className="text-xs text-slate-500 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="line-clamp-1">{c.location?.address}</span>
                      </div>
                      <div className="text-[11px] text-slate-600 line-clamp-2">
                        {c.description}
                      </div>
                    </div>
                  </div>

                  {/* Weather Risk Factor */}
                  {c.weather?.rainAlert && (
                    <div className="p-2.5 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-center gap-2">
                      <CloudRain className="w-4 h-4 text-blue-600 shrink-0" />
                      <div className="text-[11px]">
                        <strong>मौसम प्रभाव:</strong> 48h में {c.weather.precipitationNext48h}mm वर्षा पूर्वानुमान — प्राथमिकता में +{c.priority?.weatherPoints || 25} अंक जोड़े गए।
                      </div>
                    </div>
                  )}

                  {/* Priority Breakdown Reason */}
                  <div className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <span className="font-semibold text-slate-700">स्कोर विवरण: </span>
                    {c.priority?.reason}
                  </div>

                  {/* Official ETA or AI ETA */}
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs flex items-center justify-between">
                    <div>
                      <span className="text-[11px] text-slate-500 block">कार्य समय सीमा (ETA):</span>
                      {c.departmentEta ? (
                        <span className="font-bold text-emerald-800">
                          आधिकारिक: {c.departmentEta}
                        </span>
                      ) : (
                        <div className="font-bold text-amber-800">
                          {c.aiAnalysis?.aiEtaText || 'AI का अंदाज़ा: 2 दिन'}
                          <span className="block text-[10px] text-amber-600">
                            (AI का अंदाज़ा, पक्का वादा नहीं)
                          </span>
                        </div>
                      )}
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-1 rounded-md ${
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
                        : 'दर्ज (लंबित)'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="p-4 bg-slate-50/60 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => openActionModal(c)}
                  className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <Wrench className="w-3.5 h-3.5" />
                  <span>समय सीमा एवं स्थिति अपडेट करें (Update Action)</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Action / ETA Modal */}
      {selectedComplaint && (
        <div className="fixed inset-0 z-[1150] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="bg-indigo-700 text-white p-4 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm">विभागीय कार्रवाई (Department Action)</h3>
                <p className="text-xs text-indigo-200">{selectedComplaint.trackingId} - {selectedComplaint.title}</p>
              </div>
              <button
                onClick={() => setSelectedComplaint(null)}
                className="text-white hover:text-indigo-200 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveAction} className="p-5 space-y-4 text-xs">
              {/* Status Selector */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  कार्य की वर्तमान स्थिति (Complaint Status)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'darj' as ComplaintStatus, label: 'दर्ज (लंबित)' },
                    { id: 'kaam_chalu' as ComplaintStatus, label: 'काम चालू (In Progress)' },
                    { id: 'ho_gaya' as ComplaintStatus, label: 'हो गया (Resolved)' },
                  ].map((st) => (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => setNewStatus(st.id)}
                      className={`p-2 rounded-xl border text-center font-bold transition-all ${
                        newStatus === st.id
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-900 ring-2 ring-indigo-500'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {st.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Department Official ETA (Overrides AI Estimate) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-bold text-slate-700">
                    आधिकारिक समय सीमा (Official Department ETA)
                  </label>
                  <span className="text-[10px] text-indigo-600 font-semibold">
                    (यह समय AI के अंदाज़े को बदल देगा)
                  </span>
                </div>
                <input
                  type="text"
                  required
                  value={departmentEta}
                  onChange={(e) => setDepartmentEta(e.target.value)}
                  placeholder="जैसे: 2 दिन में (12 अक्टूबर तक)"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  नागरिक को यह समय विभाग के आधिकारिक वादे के रूप में दिखाई देगा।
                </span>
              </div>

              {/* Department Worker Note */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  विभागीय टिप्पणी / आवंटित दल (Action Note)
                </label>
                <textarea
                  rows={2}
                  value={departmentNote}
                  onChange={(e) => setDepartmentNote(e.target.value)}
                  placeholder="जैसे: टीम-3 को मरम्मत हेतु आवश्यक सामग्री के साथ रवाना कर दिया गया है।"
                  className="w-full p-2.5 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* If marking Resolved: proof photo & note */}
              {newStatus === 'ho_gaya' && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2">
                  <span className="font-bold text-emerald-950 block">समाधान सत्यापन (Resolution Proof):</span>
                  <div>
                    <label className="block text-[11px] text-emerald-900 mb-1">काम पूरा होने के बाद की फोटो अपलोड करें (अधिकतम 16 MB):</label>
                    <input
                      ref={resolutionPhotoInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleResolutionPhotoUpload}
                      className="sr-only"
                    />
                    <button
                      type="button"
                      onClick={() => resolutionPhotoInputRef.current?.click()}
                      className="px-3 py-2 bg-white border border-emerald-300 rounded-lg font-bold text-emerald-900 hover:bg-emerald-100"
                    >
                      {resolutionPhotoUrl.startsWith('data:image/') ? 'दूसरी फोटो चुनें' : 'समाधान फोटो चुनें'}
                    </button>
                    {resolutionPhotoUrl && (
                      <img
                        src={resolutionPhotoUrl}
                        alt="समाधान का प्रमाण"
                        className="mt-2 w-full max-h-48 object-cover rounded-lg border border-emerald-200"
                      />
                    )}
                    {resolutionPhotoError && <p className="mt-1 text-[11px] text-rose-700">{resolutionPhotoError}</p>}
                  </div>
                  <div>
                    <label className="block text-[11px] text-emerald-900 mb-0.5">समाधान टिप्पणी:</label>
                    <input
                      type="text"
                      value={resolutionNote}
                      onChange={(e) => setResolutionNote(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-white rounded-lg border border-emerald-300"
                    />
                  </div>
                </div>
              )}

              {/* Buttons */}
              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedComplaint(null)}
                  className="px-4 py-2 border border-slate-300 rounded-xl font-bold text-slate-700"
                >
                  रद्द करें
                </button>
                <button
                  type="submit"
                  disabled={updating || (newStatus === 'ho_gaya' && !resolutionPhotoUrl.startsWith('data:image/'))}
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold flex items-center gap-1.5 shadow-sm"
                >
                  {updating ? 'अपडेट हो रहा है...' : 'सुरक्षित करें (Save Update)'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
    </TranslationBoundary>
  );
};
