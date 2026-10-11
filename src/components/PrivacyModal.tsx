import React from 'react';
import { ShieldCheck, Lock, EyeOff, Server, Key, AlertTriangle, FileCheck2, X } from 'lucide-react';
import { Language, TranslationBoundary } from '../Language';

interface PrivacyModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
}

export const PrivacyModal: React.FC<PrivacyModalProps> = ({ isOpen, onClose, language }) => {
  if (!isOpen) return null;

  return (
    <TranslationBoundary language={language}>
    <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white p-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-xl">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold">नागरिक निजता एवं सुरक्षा आर्किटेक्चर (Privacy Design)</h2>
              <p className="text-xs text-emerald-100">Zero Citizen Data Leakage to Departments & Central HQ</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/20 transition-colors text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 text-sm">
          {/* Core Principle Card */}
          <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200">
            <div className="flex items-start gap-3">
              <EyeOff className="w-5 h-5 text-emerald-700 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-emerald-950">1. सर्वर-स्तरीय डेटा फ़िल्टर (Zero-Leakage API Response)</h3>
                <p className="text-emerald-800 text-xs mt-1 leading-relaxed">
                  विभाग (सड़क, सफाई, बिजली, जल) और नगर निगम मुख्यालय के API रिस्पॉन्स से नागरिक का नाम, मोबाइल नंबर और ईमेल <strong>सर्वर स्तर पर पूरी तरह हटा (strip)</strong> दिए जाते हैं। यह केवल स्क्रीन से छिपाना नहीं है—डेटा नेटवर्क पैकेट में भी नहीं भेजा जाता।
                </p>
              </div>
            </div>
          </div>

          {/* Matrix Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="bg-slate-100 px-4 py-2 font-bold text-xs text-slate-700 uppercase tracking-wider">
              डेटा एक्सेस अनुमति मैट्रिक्स (Data Access Matrix)
            </div>
            <div className="divide-y divide-slate-100 text-xs">
              <div className="grid grid-cols-3 p-3 bg-white font-semibold text-slate-500">
                <div>रोल (Role)</div>
                <div>क्या दिखेगा?</div>
                <div>क्या कभी नहीं दिखेगा? (Blocked)</div>
              </div>
              <div className="grid grid-cols-3 p-3 bg-slate-50 items-center">
                <div className="font-bold text-slate-800 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                  नागरिक (Nagrik)
                </div>
                <div className="text-slate-700">केवल अपनी शिकायतें और उनका रियल-टाइम स्टेटस</div>
                <div className="text-rose-600 font-medium">अन्य नागरिकों की शिकायतें</div>
              </div>
              <div className="grid grid-cols-3 p-3 bg-white items-center">
                <div className="font-bold text-slate-800 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
                  विभाग (Department)
                </div>
                <div className="text-slate-700">केवल अपने विभाग की शिकायत, फोटो, लोकेशन, प्राथमिकता</div>
                <div className="text-rose-600 font-bold">नागरिक का नाम, मोबाइल, ईमेल (सर्वर ब्लॉक)</div>
              </div>
              <div className="grid grid-cols-3 p-3 bg-slate-50 items-center">
                <div className="font-bold text-slate-800 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                  नगर निगम (Nigam HQ)
                </div>
                <div className="text-slate-700">सभी शिकायतें, हॉटस्पॉट मैप, लंबित विश्लेषण</div>
                <div className="text-rose-600 font-bold">नागरिक का नाम, मोबाइल, ईमेल (सर्वर ब्लॉक)</div>
              </div>
              <div className="grid grid-cols-3 p-3 bg-white items-center">
                <div className="font-bold text-slate-800 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  एडमिन (Chief Admin)
                </div>
                <div className="text-slate-700">सभी रिकॉर्ड, सिस्टम सेटिंग्स, नागरिक पहचान ऑडिट</div>
                <div className="text-slate-400 font-medium">-</div>
              </div>
            </div>
          </div>

          {/* Technical Implementation details */}
          <div className="grid sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
              <div className="flex items-center gap-2 font-bold text-slate-800 mb-1.5">
                <Lock className="w-4 h-4 text-indigo-600" />
                सुरक्षित टोकन एवं पासवर्ड हैशिंग
              </div>
              <p className="text-slate-600 leading-relaxed">
                पासवर्ड प्लेन टेक्स्ट में कभी सुरक्षित नहीं होते। सेशन आधारित रोल-बेस्ड ऑथराइजेशन से हर रिक्वेस्ट की सुरक्षा सत्यापित होती है।
              </p>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
              <div className="flex items-center gap-2 font-bold text-slate-800 mb-1.5">
                <Server className="w-4 h-4 text-emerald-600" />
                अधिकृत मीडिया एंडपॉइंट्स
              </div>
              <p className="text-slate-600 leading-relaxed">
                शिकायत फोटो पब्लिक ओपन डायरेक्टरी में नहीं होतीं। वे केवल लॉगिन अधिकृत उपयोगकर्ता को ही सर्व की जाती हैं।
              </p>
            </div>
          </div>

          {/* Transparent Disclaimers & Roadmap */}
          <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 space-y-2 text-xs">
            <div className="flex items-center gap-2 font-bold text-amber-900">
              <AlertTriangle className="w-4 h-4 text-amber-700" />
              रोडमैप एवं महत्वपूर्ण स्पष्टीकरण (Roadmap Notes)
            </div>
            <ul className="list-disc list-inside space-y-1 text-amber-800">
              <li>
                <strong>OTP लॉगिन:</strong> वर्तमान में पासवर्ड आधारित लॉगिन है। SMS/Email OTP वेरिफिकेशन आगामी रिलीज (Phase 2) के रोडमैप में है।
              </li>
              <li>
                <strong>फोटो में चेहरा/नंबर प्लेट ब्लर:</strong> सड़क की फोटो में वाहनों की नंबर प्लेट व राहगीरों के चेहरों को AI से स्वतः ब्लर करने का मॉड्यूल रोडमैप में प्रस्तावित है।
              </li>
              <li>
                <strong>AI समय अंदाज़ा:</strong> AI का समय (ETA) केवल प्रारंभिक अनुमान है। विभाग द्वारा दर्ज किया गया समय ही आधिकारिक मान्य होता है।
              </li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-sm font-semibold transition-colors"
          >
            समझ गया (Understood)
          </button>
        </div>
      </div>
    </div>
    </TranslationBoundary>
  );
};
