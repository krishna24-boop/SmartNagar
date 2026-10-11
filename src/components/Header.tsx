import React from 'react';
import { User, UserRole } from '../types';
import { Building2, ShieldCheck, LogOut, Languages } from 'lucide-react';
import { Language, TranslationBoundary } from '../Language';

interface HeaderProps {
  currentUser: User | null;
  language: Language;
  onLanguageChange: (language: Language) => void;
  onOpenPrivacy: () => void;
  onLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  language,
  onLanguageChange,
  onOpenPrivacy,
  onLogout,
}) => {
  const getRoleBadge = (role?: UserRole) => {
    switch (role) {
      case 'nagrik':
        return {
          label: language === 'hi' ? 'नागरिक पोर्टल' : 'Citizen Portal',
          en: 'Citizen Portal',
          bg: 'bg-blue-100 text-blue-800 border-blue-200',
        };
      case 'department':
        return {
          label: language === 'hi' ? 'विभागीय डैशबोर्ड' : 'Department Dashboard',
          en: 'Department View',
          bg: 'bg-amber-100 text-amber-800 border-amber-200',
        };
      case 'nagar_nigam':
        return {
          label: language === 'hi' ? 'नगर निगम मुख्यालय' : 'Municipal Headquarters',
          en: 'Municipal Central HQ',
          bg: 'bg-purple-100 text-purple-800 border-purple-200',
        };
      case 'admin':
        return {
          label: language === 'hi' ? 'सिस्टम प्रशासक' : 'System Administrator',
          en: 'System Admin',
          bg: 'bg-rose-100 text-rose-800 border-rose-200',
        };
      default:
        return {
          label: 'अतिथि (Guest)',
          en: 'Guest',
          bg: 'bg-slate-100 text-slate-700 border-slate-200',
        };
    }
  };

  const badge = getRoleBadge(currentUser?.role);

  return (
    <TranslationBoundary language={language}>
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
      {/* Top micro-bar */}
      <div className="bg-slate-900 text-slate-300 px-4 py-1.5 text-xs flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span className="font-medium text-white">{language === 'hi' ? 'स्मार्ट नगर निगम AI समाधान प्रणाली' : 'Smart Municipal AI Solutions'}</span>
          <span className="hidden sm:inline text-slate-400">| {language === 'hi' ? 'मौसम-संचालित प्राथमिकता स्कोरिंग' : 'Weather-based priority scoring'}</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenPrivacy}
            className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300 font-medium transition-colors cursor-pointer"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>{language === 'hi' ? 'नागरिक निजता सुरक्षा (Zero-Leakage)' : 'Citizen privacy protection (Zero-Leakage)'}</span>
          </button>
        </div>
      </div>

      {/* Main navigation header */}
      <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-slate-900 tracking-tight">स्मार्टनगर (SmartNagar)</h1>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badge.bg}`}>
                {badge.label}
              </span>
            </div>
            <p className="text-xs text-slate-500">{language === 'hi' ? 'AI-संचालित नागरिक समस्या निवारण एवं प्राथमिकता तंत्र' : 'AI-powered civic issue resolution and prioritization'}</p>
          </div>
        </div>

        {/* Right side controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={() => onLanguageChange(language === 'hi' ? 'en' : 'hi')}
            className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors"
            aria-label={language === 'hi' ? 'Switch to English' : 'हिंदी में बदलें'}
          >
            <Languages className="w-4 h-4" />
            {language === 'hi' ? 'English' : 'हिंदी'}
          </button>
          {currentUser ? (
            <div className="flex items-center gap-3">
              <div className="hidden md:flex flex-col text-right">
                <span className="text-xs font-bold text-slate-900 leading-tight">{currentUser.name}</span>
                <span className="text-[11px] text-slate-500 truncate max-w-[180px]">
                  {currentUser.emailOrMobile}
                </span>
              </div>

              <button
                onClick={onLogout}
                className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                title={language === 'hi' ? 'लॉगआउट' : 'Log out'}
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
    </TranslationBoundary>
  );
};
