import React, { useState, useEffect, useRef } from 'react';
import { Complaint, User, PriorityLevel, DepartmentType } from '../types';
import { checkImageBlur, BlurCheckResult } from '../lib/blurDetection';
import { Language, TranslationBoundary } from '../Language';
import {
  Camera,
  Upload,
  MapPin,
  CloudRain,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Send,
  FileText,
  Shield,
  Layers,
  ChevronRight,
  Info,
  RefreshCw,
  Eye,
} from 'lucide-react';

const IMAGE_FETCH_TIMEOUT_MS = 15_000;
const AI_DIAGNOSIS_TIMEOUT_MS = 45_000;

interface AiDiagnosisResult {
  problemTitle: string;
  category: DepartmentType;
  severity: PriorityLevel;
  severityReason: string;
  hindiDraft: string;
  aiEstimatedDays: number;
  aiEtaText: string;
  safetyRisk: string;
  isCivicIssue: boolean;
  locationMatches: boolean;
  verificationReason: string;
}

interface AiDiagnosisResponse {
  aiAnalysis: AiDiagnosisResult;
  aiProvider: 'gemini' | 'groq';
  weather: any;
  priority: any;
}

interface NagrikViewProps {
  currentUser: User;
  diagnosisToken: string;
  onComplaintCreated: () => void;
  complaints: Complaint[];
  loadingComplaints: boolean;
  language: Language;
}

export const NagrikView: React.FC<NagrikViewProps> = ({
  currentUser,
  diagnosisToken,
  onComplaintCreated,
  complaints,
  loadingComplaints,
  language,
}) => {
  const maxPhotoSizeBytes = 4 * 1024 * 1024;
  const [activeTab, setActiveTab] = useState<'create' | 'my_complaints'>('create');

  // Form states
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [blurResult, setBlurResult] = useState<BlurCheckResult | null>(null);
  const [blurWarningDismissed, setBlurWarningDismissed] = useState(false);

  const [analyzingAi, setAnalyzingAi] = useState(false);
  const [aiDiagnosed, setAiDiagnosed] = useState<AiDiagnosisResult | null>(null);
  const [aiProvider, setAiProvider] = useState<'gemini' | 'groq' | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [photoVerificationError, setPhotoVerificationError] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<DepartmentType>('sadak');
  const [hindiDraft, setHindiDraft] = useState('');
  const [locationText, setLocationText] = useState('हजरतगंज मेन रोड, पिलर सं. 44, वार्ड 12');
  const [ward, setWard] = useState('वार्ड 12 - हजरतगंज');
  const [lat, setLat] = useState(26.8524);
  const [lng, setLng] = useState(80.9412);
  const [gettingLocation, setGettingLocation] = useState(false);

  const [weatherData, setWeatherData] = useState<any | null>(null);
  const [priorityBreakdown, setPriorityBreakdown] = useState<any | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sample photos for 1-click easy testing in browser/iframe
  const sampleCivicPhotos = [
    {
      title: 'सड़क गड्ढा (Pothole)',
      cat: 'sadak' as DepartmentType,
      url: 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=600&q=80',
    },
    {
      title: 'कचरा ढेर (Garbage)',
      cat: 'safai' as DepartmentType,
      url: 'https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&w=600&q=80',
    },
    {
      title: 'लटकता बिजली तार (Electric Wire)',
      cat: 'bijli' as DepartmentType,
      url: 'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?auto=format&fit=crop&w=600&q=80',
    },
    {
      title: 'ओवरफ्लो नाला (Sewer Overflow)',
      cat: 'jal' as DepartmentType,
      url: 'https://images.unsplash.com/photo-1618477388954-7852f32655ec?auto=format&fit=crop&w=600&q=80',
    },
  ];

  // Handle Photo selection & Browser Blur Detection
  const handlePhotoSelect = async (dataUrl: string) => {
    setPhotoBase64(dataUrl);
    setBlurWarningDismissed(false);
    setSubmitSuccess(null);
    setAiDiagnosed(null);
    setAiError(null);
    setAiProvider(null);
    setPhotoVerificationError(null);

    // 1. Browser Photo Quality Check
    const quality = await checkImageBlur(dataUrl);
    setBlurResult(quality);

    // 2. Trigger AI Diagnosis
    triggerAiDiagnosis(dataUrl);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setAiError('कृपया JPG, PNG या WEBP फोटो चुनें।');
      return;
    }
    if (file.size > maxPhotoSizeBytes) {
      setAiError('फोटो 4 MB से छोटी होनी चाहिए।');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result;
      if (typeof dataUrl !== 'string') {
        setAiError('चुनी गई फोटो पढ़ी नहीं जा सकी। कृपया दूसरी फोटो चुनें।');
        return;
      }
      void handlePhotoSelect(dataUrl);
    };
    reader.onerror = () => setAiError('चुनी गई फोटो पढ़ी नहीं जा सकी। कृपया दूसरी फोटो चुनें।');
    reader.readAsDataURL(file);
  };

  // Convert remote sample image to base64
  const handleSamplePhoto = async (url: string) => {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(IMAGE_FETCH_TIMEOUT_MS) });
      if (!res.ok) {
        throw new Error(`Sample photo download failed (${res.status}).`);
      }
      const blob = await res.blob();
      if (!blob.type.startsWith('image/')) {
        throw new Error('Sample URL did not return an image.');
      }
      if (blob.size > maxPhotoSizeBytes) {
        setAiError('नमूना फोटो 4 MB सीमा से बड़ी है। कृपया दूसरी फोटो अपलोड करें।');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          handlePhotoSelect(reader.result);
        } else {
          setAiError('नमूना फोटो पढ़ी नहीं जा सकी। कृपया अपनी फोटो अपलोड करें।');
        }
      };
      reader.readAsDataURL(blob);
    } catch (error) {
      console.error('Sample photo download failed:', error);
      setAiError('नमूना फोटो लोड नहीं हुई। कृपया अपनी फोटो अपलोड करके प्रयास करें।');
    }
  };

  // Call Server-Side AI Diagnosis
  const triggerAiDiagnosis = async (
    imgBase64: string,
    address = locationText,
    latitude = lat,
    longitude = lng
  ): Promise<AiDiagnosisResponse | null> => {
    setAnalyzingAi(true);
    try {
      const res = await fetch('/api/ai/diagnose', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${diagnosisToken}`,
        },
        body: JSON.stringify({
          imageBase64: imgBase64,
          lat: latitude,
          lng: longitude,
          locationText: address,
        }),
        signal: AbortSignal.timeout(AI_DIAGNOSIS_TIMEOUT_MS),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'AI विश्लेषण नहीं हो पाया। कृपया दोबारा प्रयास करें।');
      }
      if (!data.aiAnalysis) {
        throw new Error('AI से मान्य विश्लेषण नहीं मिला। कृपया दोबारा प्रयास करें।');
      }
      if (
        typeof data.aiAnalysis.isCivicIssue !== 'boolean' ||
        typeof data.aiAnalysis.locationMatches !== 'boolean' ||
        typeof data.aiAnalysis.verificationReason !== 'string' ||
        (data.aiProvider !== 'gemini' && data.aiProvider !== 'groq')
      ) {
        throw new Error('AI फोटो और स्थान सत्यापन पूरा नहीं कर सका। कृपया पुनः प्रयास करें।');
      }
      const diagnosis = data as AiDiagnosisResponse;
      setAiDiagnosed(data.aiAnalysis);
      setAiProvider(data.aiProvider);
      setTitle(data.aiAnalysis.problemTitle);
      setCategory(data.aiAnalysis.category);
      setHindiDraft(data.aiAnalysis.hindiDraft);
      setWeatherData(data.weather);
      setPriorityBreakdown(data.priority);
      return diagnosis;
    } catch (err) {
      console.error('Diagnosis failed:', err);
      setAiError(err instanceof Error ? err.message : 'AI विश्लेषण नहीं हो पाया। कृपया दोबारा प्रयास करें।');
      return null;
    } finally {
      setAnalyzingAi(false);
    }
  };

  // Browser Geolocation
  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      alert('ब्राउज़र में GPS उपलब्ध नहीं है। डिफ़ॉल्ट वार्ड सेट किया गया।');
      return;
    }
    setGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude);
        setLng(pos.coords.longitude);
        setLocationText(`GPS निर्देशांक: ${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}`);
        setGettingLocation(false);
      },
      () => {
        setGettingLocation(false);
        setLocationText('हजरतगंज चौराहा, निकट मेट्रो स्टेशन, वार्ड 12');
      },
      { timeout: 5000 }
    );
  };

  // Submit Complaint
  const handleSubmitComplaint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!photoBase64) {
      alert('कृपया समस्या की फोटो खींचें या अपलोड करें।');
      return;
    }

    setSubmitting(true);
    setPhotoVerificationError(null);
    try {
      const selectedCategory = category;
      const verification = await triggerAiDiagnosis(photoBase64, locationText, lat, lng);
      if (!verification) {
        throw new Error('AI फोटो सत्यापन पूरा नहीं हो सका। कृपया पुनः प्रयास करें।');
      }

      const verifiedAnalysis = verification.aiAnalysis;
      let verificationMessage: string | null = null;
      if (!verifiedAnalysis.isCivicIssue) {
        verificationMessage = language === 'hi'
          ? `यह फोटो किसी वास्तविक नगर-निगम समस्या की नहीं लगती। शिकायत जमा नहीं हुई। ${verifiedAnalysis.verificationReason}`
          : `This photo does not appear to show a real municipal issue. The complaint was not submitted. ${verifiedAnalysis.verificationReason}`;
      } else if (!verifiedAnalysis.locationMatches) {
        verificationMessage = language === 'hi'
          ? `फोटो में दिखने वाला स्थान दिए गए पते से मेल नहीं खाता या सत्यापित नहीं हो सका। शिकायत जमा नहीं हुई। ${verifiedAnalysis.verificationReason}`
          : `The visible location could not be verified against the entered address. The complaint was not submitted. ${verifiedAnalysis.verificationReason}`;
      } else if (verifiedAnalysis.category !== selectedCategory) {
        verificationMessage = language === 'hi'
          ? 'फोटो में दिखी समस्या चुने गए विभाग से मेल नहीं खाती। सही विभाग चुनें या संबंधित फोटो अपलोड करें।'
          : 'The issue in the photo does not match the selected department. Choose the correct department or upload a relevant photo.';
      }

      if (verificationMessage) {
        setPhotoVerificationError(verificationMessage);
        alert(verificationMessage);
        return;
      }

      const token = currentUser.id;
      const res = await fetch('/api/complaints', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title,
          description: title,
          hindiDraft,
          category: verifiedAnalysis.category,
          photoUrl: photoBase64,
          location: {
            lat,
            lng,
            address: locationText,
            ward,
          },
          aiAnalysis: {
            problemIdentified: verifiedAnalysis.problemTitle,
            detectedSeverity: verifiedAnalysis.severity,
            detectedCategory: verifiedAnalysis.category,
            severityReason: verifiedAnalysis.severityReason,
            aiEstimatedDays: verifiedAnalysis.aiEstimatedDays,
            aiEtaText: verifiedAnalysis.aiEtaText,
          },
          priority: verification.priority,
          weather: verification.weather,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'शिकायत दर्ज नहीं हो सकी');

      setSubmitSuccess(data.message || 'शिकायत सफलतापूर्वक दर्ज हो गई!');
      onComplaintCreated();
      // Switch to my complaints tab after brief delay
      setTimeout(() => {
        setActiveTab('my_complaints');
        setPhotoBase64(null);
        setAiDiagnosed(null);
        setSubmitSuccess(null);
      }, 1800);
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const getPriorityBadge = (level?: PriorityLevel) => {
    switch (level) {
      case 'turant':
        return { label: 'तुरंत (Immediate)', bg: 'bg-red-500 text-white' };
      case 'gambhir':
        return { label: 'गंभीर (High)', bg: 'bg-orange-500 text-white' };
      case 'madhyam':
        return { label: 'मध्यम (Medium)', bg: 'bg-amber-500 text-white' };
      default:
        return { label: 'सामान्य (Low)', bg: 'bg-blue-500 text-white' };
    }
  };

  return (
    <TranslationBoundary language={language}>
    <div className="space-y-6">
      {/* Citizen Navigation Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('create')}
          className={`py-3 px-6 font-bold text-sm border-b-2 flex items-center gap-2 cursor-pointer transition-all ${
            activeTab === 'create'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Camera className="w-4 h-4" />
          <span>नई शिकायत दर्ज करें (New Complaint)</span>
        </button>
        <button
          onClick={() => setActiveTab('my_complaints')}
          className={`py-3 px-6 font-bold text-sm border-b-2 flex items-center gap-2 cursor-pointer transition-all ${
            activeTab === 'my_complaints'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>मेरी शिकायतें (My Complaints)</span>
          <span className="ml-1 px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700 font-bold">
            {complaints.length}
          </span>
        </button>
      </div>

      {activeTab === 'create' ? (
        <div className="grid lg:grid-cols-12 gap-6">
          {/* Left Column: Photo capture, quality check & sample picker */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
              <h3 className="font-bold text-sm text-slate-900 mb-2 flex items-center gap-2">
                <Camera className="w-4 h-4 text-blue-600" />
                1. समस्या की फोटो लें या अपलोड करें
              </h3>
              <p className="text-xs text-slate-500 mb-4">
                कैमरा से फोटो खींचें। ब्राउज़र स्वतः फोटो की स्पष्टता जाँचेगा।
              </p>

              {/* Photo Box */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition-all ${
                  photoBase64
                    ? 'border-blue-500 bg-blue-50/20'
                    : 'border-slate-300 hover:border-blue-400 bg-slate-50 hover:bg-slate-100/60'
                }`}
              >
                {photoBase64 ? (
                  <div className="relative">
                    <img
                      src={photoBase64}
                      alt="Civic Issue"
                      className="w-full h-56 object-cover rounded-xl shadow-xs"
                    />
                    <div className="absolute bottom-2 right-2 bg-slate-900/80 text-white text-[10px] px-2.5 py-1 rounded-md backdrop-blur-xs">
                      फोटो बदलने के लिए क्लिक करें
                    </div>
                  </div>
                ) : (
                  <div className="py-8 space-y-3">
                    <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mx-auto">
                      <Upload className="w-6 h-6" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-blue-600">फोटो चुनें या यहाँ खींचें</span>
                      <p className="text-[11px] text-slate-400 mt-0.5">JPG, PNG, WEBP (अधिकतम 4 MB)</p>
                    </div>
                  </div>
                )}
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                />
              </div>

              {/* Browser Photo Quality Warning (if blurry) */}
              {blurResult && blurResult.isBlurry && !blurWarningDismissed && (
                <div className="mt-3 p-3.5 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-900 space-y-2 animate-in fade-in">
                  <div className="flex items-start gap-2 font-bold text-amber-950">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <span>फोटो गुणवत्ता चेतावनी (Quality Check: Score {blurResult.score}/100)</span>
                  </div>
                  <p className="text-[11px] text-amber-800 leading-relaxed">
                    {blurResult.warningMessage ||
                      '⚠️ फोटो धुंधली (Blurry) या कम रोशनी वाली लग रही है। विभाग को समस्या स्पष्ट समझने में परेशानी हो सकती है।'}
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[11px] font-bold"
                    >
                      पुनः साफ़ फोटो लें
                    </button>
                    <button
                      type="button"
                      onClick={() => setBlurWarningDismissed(true)}
                      className="px-3 py-1 bg-white border border-amber-300 text-amber-900 hover:bg-amber-100 rounded-lg text-[11px]"
                    >
                      इसी फोटो के साथ आगे बढ़ें
                    </button>
                  </div>
                </div>
              )}

              {/* Quality pass chip */}
              {blurResult && !blurResult.isBlurry && (
                <div className="mt-2 text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>फोटो स्पष्ट है (गुणवत्ता स्कोर: {blurResult.score}/100)</span>
                </div>
              )}

              {/* Sample Civic Photos Picker for Fast Demo */}
              <div className="mt-4 pt-4 border-t border-slate-100">
                <span className="text-[11px] font-bold text-slate-600 block mb-2">
                  या त्वरित परीक्षण हेतु नमूना फोटो चुनें:
                </span>
                <div className="grid grid-cols-2 gap-2">
                  {sampleCivicPhotos.map((s, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSamplePhoto(s.url)}
                      className="p-2 text-left rounded-xl border border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 transition-all text-xs flex items-center gap-2"
                    >
                      <img src={s.url} alt={s.title} className="w-8 h-8 rounded-lg object-cover" />
                      <span className="font-semibold text-[11px] text-slate-800 leading-tight">
                        {s.title}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Weather factor live widget */}
            {weatherData && (
              <div className="bg-gradient-to-br from-sky-500 to-blue-700 text-white p-4 rounded-2xl shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-sky-100 flex items-center gap-1.5">
                    <CloudRain className="w-4 h-4" />
                    लाइव मौसम पूर्वानुमान (Open-Meteo)
                  </span>
                  <span className="text-xs bg-white/20 px-2 py-0.5 rounded-md font-semibold">
                    {weatherData.temp}°C
                  </span>
                </div>
                <div className="space-y-1.5 text-xs">
                  <div className="font-semibold text-sm">{weatherData.weatherCondition}</div>
                  <div className="text-sky-100 text-[11px]">
                    अगले 48 घंटे में अनुमानित वर्षा: <strong>{weatherData.precipitationNext48h} mm</strong> (सम्भावना: {weatherData.precipitationProbability}%)
                  </div>
                  {weatherData.rainAlert && (
                    <div className="mt-2 bg-amber-400 text-amber-950 font-bold px-2.5 py-1 rounded-lg text-[11px] flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      बारिश से जलभराव/गड्ढा खतरा: प्राथमिकता स्कोर में +25 अंक की वृद्धि!
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: AI Diagnosis, Hindi Draft & Submission Form */}
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-600" />
                  2. AI समस्या विश्लेषण एवं प्रारूप (AI Diagnosis)
                </h3>
                {analyzingAi && (
                  <span className="text-xs text-purple-600 font-semibold flex items-center gap-1 animate-pulse">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Gemini व्यस्त हो तो कुछ सेकंड में Groq backup आज़माया जाएगा...
                  </span>
                )}
                {!analyzingAi && aiProvider === 'groq' && (
                  <span className="text-xs text-emerald-700 font-semibold">Backup AI: Groq</span>
                )}
              </div>

              {aiError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{aiError}</span>
                </div>
              )}
              {photoVerificationError && (
                <div role="alert" className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs">
                  {photoVerificationError}
                </div>
              )}
              {aiDiagnosed && (
                <div
                  role={aiDiagnosed.isCivicIssue && aiDiagnosed.locationMatches ? 'status' : 'alert'}
                  className={`p-3 border rounded-xl text-xs ${
                    aiDiagnosed.isCivicIssue && aiDiagnosed.locationMatches
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                      : 'bg-amber-50 border-amber-200 text-amber-900'
                  }`}
                >
                  {aiDiagnosed.verificationReason}
                </div>
              )}

              {submitSuccess && (
                <div className="p-4 bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-xl text-sm flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div className="font-bold">{submitSuccess}</div>
                </div>
              )}

              <form onSubmit={handleSubmitComplaint} className="space-y-4">
                {/* Title */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    समस्या का शीर्षक (Problem Title)
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="AI फोटो देखकर शीर्षक भरेगा या स्वयं लिखें"
                    className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none font-medium"
                  />
                </div>

                {/* Category & Severity row */}
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      संबंधित विभाग (Assigned Department)
                    </label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value as DepartmentType)}
                      className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none font-semibold bg-white"
                    >
                      <option value="sadak">सड़क एवं PWD (Roads & Potholes)</option>
                      <option value="safai">सफाई एवं कचरा प्रबंधन (Sanitation)</option>
                      <option value="bijli">विद्युत एवं स्ट्रीटलाइट (Electricity)</option>
                      <option value="jal">जल संस्थान एवं नाला (Water & Drainage)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      गंभीरता एवं प्राथमिकता स्तर (Severity)
                    </label>
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-3 py-2 text-xs font-bold rounded-xl flex-1 text-center ${
                          getPriorityBadge(priorityBreakdown?.level || aiDiagnosed?.severity).bg
                        }`}
                      >
                        {getPriorityBadge(priorityBreakdown?.level || aiDiagnosed?.severity).label}
                      </span>
                      {priorityBreakdown && (
                        <span className="text-xs font-extrabold text-slate-700 px-2 py-1 bg-slate-100 rounded-lg">
                          स्कोर: {priorityBreakdown.totalScore}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* AI Reason explanation */}
                {aiDiagnosed?.severityReason && (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 space-y-1">
                    <span className="font-bold text-slate-900 flex items-center gap-1">
                      <Info className="w-3.5 h-3.5 text-blue-600" /> AI द्वारा निर्धारित कारण (Reason):
                    </span>
                    <p className="text-slate-600">{aiDiagnosed.severityReason}</p>
                  </div>
                )}

                {/* AI Time Estimate Card with CLEAR MANDATORY LABEL */}
                <div className="p-3.5 bg-sky-50/70 border border-sky-200 rounded-xl flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Clock className="w-5 h-5 text-sky-700 shrink-0" />
                    <div>
                      <div className="text-xs font-bold text-sky-950">
                        {aiDiagnosed?.aiEtaText || 'AI का अंदाज़ा: 2 दिन'}
                      </div>
                      <div className="text-[11px] font-semibold text-amber-700">
                        ⚠️ AI का अंदाज़ा, पक्का वादा नहीं
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] bg-sky-200/60 text-sky-900 font-bold px-2 py-1 rounded-md">
                    अनुमानित
                  </span>
                </div>

                {/* Location with GPS button */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    स्थान / वार्ड / लैंडमार्क (Location)
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                      <input
                        type="text"
                        required
                        value={locationText}
                        onChange={(e) => setLocationText(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleGetLocation}
                      disabled={gettingLocation}
                      className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors"
                    >
                      <MapPin className="w-3.5 h-3.5 text-blue-600" />
                      <span>{gettingLocation ? 'खोज रहा...' : 'GPS स्थान'}</span>
                    </button>
                  </div>
                </div>

                {/* Auto Hindi Draft for Nagar Nigam */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-700">
                      हिंदी में तैयार शिकायत पत्र (Hindi Draft)
                    </label>
                    <span className="text-[10px] text-purple-600 font-semibold">
                      AI द्वारा स्वतः निर्मित (संपादनीय)
                    </span>
                  </div>
                  <textarea
                    rows={4}
                    value={hindiDraft}
                    onChange={(e) => setHindiDraft(e.target.value)}
                    placeholder="AI फोटो विश्लेषण के पश्चात औपचारिक शिकायत पत्र तैयार करेगा..."
                    className="w-full p-3 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-blue-500 focus:outline-none font-sans text-slate-800 leading-relaxed"
                  />
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={submitting || analyzingAi || !photoBase64}
                  className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 text-white font-bold rounded-xl text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {submitting ? (
                    'शिकायत दर्ज हो रही है...'
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>शिकायत दर्ज करें (Submit Complaint)</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      ) : (
        /* My Complaints Tab */
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">मेरी दर्ज शिकायतें (My Complaints)</h2>
              <p className="text-xs text-slate-500">
                निजता नियम: यहाँ केवल आपकी स्वयं की शिकायतें दिखाई देती हैं। अन्य नागरिकों की शिकायतें अगोचर हैं।
              </p>
            </div>
            <button
              onClick={() => setActiveTab('create')}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-xs"
            >
              + नई शिकायत
            </button>
          </div>

          {loadingComplaints ? (
            <div className="p-12 text-center text-slate-500 text-sm">शिकायतें लोड हो रही हैं...</div>
          ) : complaints.length === 0 ? (
            <div className="p-12 bg-white rounded-2xl border border-slate-200 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <FileText className="w-6 h-6" />
              </div>
              <div className="font-bold text-slate-800 text-sm">अभी आपकी कोई शिकायत दर्ज नहीं है</div>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                सड़क, सफाई, बिजली या पानी की किसी भी समस्या की फोटो खींचकर दर्ज करें।
              </p>
              <button
                onClick={() => setActiveTab('create')}
                className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold"
              >
                पहली शिकायत दर्ज करें
              </button>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {complaints.map((c) => {
                const priorityBadge = getPriorityBadge(c.priority?.level);
                return (
                  <div
                    key={c.id}
                    className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden flex flex-col justify-between"
                  >
                    <div>
                      {/* Card Header */}
                      <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                        <div>
                          <span className="text-xs font-mono font-bold text-slate-700">
                            {c.trackingId}
                          </span>
                          <span className="text-[11px] text-slate-400 block">
                            {new Date(c.createdAt).toLocaleDateString('hi-IN', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric',
                            })}
                          </span>
                        </div>
                        <span
                          className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${priorityBadge.bg}`}
                        >
                          {priorityBadge.label} (स्कोर: {c.priority?.totalScore})
                        </span>
                      </div>

                      {/* Card Body */}
                      <div className="p-4 space-y-3">
                        <div className="flex gap-3">
                          <img
                            src={c.photoUrl}
                            alt={c.title}
                            className="w-20 h-20 rounded-xl object-cover border border-slate-200 shrink-0"
                          />
                          <div className="space-y-1">
                            <h4 className="text-sm font-bold text-slate-900 leading-tight">
                              {c.title}
                            </h4>
                            <div className="text-xs text-slate-500 flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-slate-400" />
                              <span className="truncate">{c.location?.address}</span>
                            </div>
                            <div className="text-[11px] font-semibold text-indigo-700">
                              विभाग: {c.category === 'sadak' ? 'सड़क एवं PWD' : c.category === 'safai' ? 'सफाई प्रबंधन' : c.category === 'bijli' ? 'विद्युत विभाग' : 'जल संस्थान'}
                            </div>
                          </div>
                        </div>

                        {/* Estimated Time (Department Official vs AI Estimate) */}
                        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                          {c.departmentEta ? (
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-1.5 font-bold text-emerald-800">
                                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                <span>विभाग द्वारा निर्धारित समय: {c.departmentEta}</span>
                              </div>
                              <span className="text-[10px] text-slate-500">
                                अधिकारी: {c.departmentAssignedTo || 'विभागीय दल'}
                              </span>
                            </div>
                          ) : (
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-1.5 font-bold text-sky-900">
                                <Clock className="w-4 h-4 text-sky-600" />
                                <span>{c.aiAnalysis?.aiEtaText || 'AI का अंदाज़ा: 2 दिन'}</span>
                              </div>
                              <div className="text-[10px] font-bold text-amber-700">
                                ⚠️ AI का अंदाज़ा, पक्का वादा नहीं
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Status timeline */}
                        <div className="pt-2">
                          <div className="text-[11px] font-bold text-slate-700 mb-2">स्थिति प्रगति (Status):</div>
                          <div className="flex items-center gap-1 text-[11px]">
                            {/* Step 1: Darj */}
                            <div
                              className={`flex-1 text-center py-1.5 rounded-lg font-bold ${
                                c.status === 'darj'
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              दर्ज (Registered)
                            </div>
                            <ChevronRight className="w-3 h-3 text-slate-300 shrink-0" />
                            {/* Step 2: Kaam Chalu */}
                            <div
                              className={`flex-1 text-center py-1.5 rounded-lg font-bold ${
                                c.status === 'kaam_chalu'
                                  ? 'bg-amber-500 text-white'
                                  : c.status === 'ho_gaya'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-slate-100 text-slate-400'
                              }`}
                            >
                              काम चालू (In Progress)
                            </div>
                            <ChevronRight className="w-3 h-3 text-slate-300 shrink-0" />
                            {/* Step 3: Ho Gaya */}
                            <div
                              className={`flex-1 text-center py-1.5 rounded-lg font-bold ${
                                c.status === 'ho_gaya'
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-slate-100 text-slate-400'
                              }`}
                            >
                              हो गया (Resolved)
                            </div>
                          </div>
                        </div>

                        {/* Resolution Note if resolved */}
                        {c.status === 'ho_gaya' && (
                          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 space-y-1">
                            <div className="font-bold flex items-center gap-1.5">
                              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                              समाधान विवरण:
                            </div>
                            <p className="text-[11px] text-emerald-800">{c.resolutionNote || 'कार्य सफलतापूर्वक संपन्न हुआ।'}</p>
                            {c.resolutionPhotoUrl && (
                              <img
                                src={c.resolutionPhotoUrl}
                                alt="Resolution"
                                className="w-full h-28 object-cover rounded-lg mt-1 border border-emerald-200"
                              />
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
    </TranslationBoundary>
  );
};
