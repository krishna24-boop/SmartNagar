import React, { useState } from 'react';
import { User } from '../types';
import { Lock, Mail, Building2, ArrowRight, X, Languages, UserRoundPlus } from 'lucide-react';
import { Language } from '../Language';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: User, token: string, diagnosisToken: string) => void;
  required?: boolean;
  language: Language;
  onLanguageChange: (language: Language) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  required = false,
  language,
  onLanguageChange,
}) => {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [emailOrMobile, setEmailOrMobile] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const isSignup = mode === 'signup';
      const res = await fetch(isSignup ? '/api/auth/register' : '/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...(isSignup ? { name } : {}), emailOrMobile, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || (isSignup ? 'Registration failed' : 'Login failed'));
      if (typeof data.diagnosisToken !== 'string') {
        throw new Error('लॉगिन सत्र शुरू नहीं हो सका। कृपया दोबारा प्रयास करें।');
      }
      onLoginSuccess(data.user, data.token, data.diagnosisToken);
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-gradient-to-br from-slate-950/95 via-slate-900/90 to-blue-950/95 backdrop-blur-sm animate-in fade-in">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -left-20 w-96 h-96 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="absolute -bottom-32 -right-20 w-96 h-96 rounded-full bg-indigo-500/10 blur-3xl" />
      </div>
      <div className="relative bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-white/30 overflow-hidden flex flex-col max-h-[94vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-blue-950 text-white p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/20 border border-blue-300/20 flex items-center justify-center">
              <Building2 className="w-6 h-6 text-blue-300" />
            </div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-blue-300 mb-1">SmartNagar Civic Portal</p>
              <h2 className="text-lg font-bold text-white">
                {mode === 'login'
                  ? language === 'hi' ? 'पोर्टल लॉगिन' : 'Portal Login'
                  : language === 'hi' ? 'नागरिक खाता बनाएं' : 'Create Citizen Account'}
              </h2>
              <p className="text-xs text-slate-300 mt-1">
                {language === 'hi'
                  ? 'शिकायत दर्ज करें और अपनी प्रोफ़ाइल देखें'
                  : 'Report civic issues and manage your profile'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onLanguageChange(language === 'hi' ? 'en' : 'hi')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold transition-colors"
              aria-label={language === 'hi' ? 'Switch to English' : 'हिंदी में बदलें'}
            >
              <Languages className="w-4 h-4" />
              {language === 'hi' ? 'English' : 'हिंदी'}
            </button>
            {!required && (
              <button
                onClick={onClose}
                aria-label={language === 'hi' ? 'लॉगिन बंद करें' : 'Close login'}
                className="p-2 rounded-xl hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        <div className="p-6 overflow-y-auto space-y-6">
          <div className="flex p-1 bg-slate-100 rounded-xl">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError(null);
              }}
              className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${
                mode === 'login' ? 'bg-white shadow text-slate-900' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {language === 'hi' ? 'लॉगिन' : 'Login'}
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('signup');
                setError(null);
              }}
              className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${
                mode === 'signup' ? 'bg-white shadow text-slate-900' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {language === 'hi' ? 'नया नागरिक खाता' : 'Create Account'}
            </button>
          </div>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0"></span>
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {language === 'hi' ? 'पूरा नाम' : 'Full name'}
                </label>
                <div className="relative">
                  <UserRoundPlus className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder={language === 'hi' ? 'अपना पूरा नाम लिखें' : 'Enter your full name'}
                    className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            )}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {language === 'hi' ? 'ईमेल या मोबाइल नंबर' : 'Email or mobile number'}
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  required
                  value={emailOrMobile}
                  onChange={(e) => setEmailOrMobile(e.target.value)}
                  placeholder={language === 'hi' ? 'ईमेल या मोबाइल नंबर दर्ज करें' : 'Enter email or mobile number'}
                  className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                {language === 'hi' ? 'पासवर्ड' : 'Password'}
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-600">
              ℹ️ <strong>{language === 'hi' ? 'नोट:' : 'Note:'}</strong>{' '}
              {mode === 'signup'
                ? language === 'hi'
                  ? 'खाता बनने के बाद आपकी नागरिक प्रोफ़ाइल खुल जाएगी।'
                  : 'Your citizen profile will open after account creation.'
                : language === 'hi'
                  ? 'अपने पंजीकृत ईमेल/मोबाइल और पासवर्ड से लॉगिन करें।'
                  : 'Sign in with your registered email/mobile and password.'}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-xl text-sm shadow-md transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                language === 'hi' ? 'कृपया प्रतीक्षा करें...' : 'Please wait...'
              ) : (
                <>
                  {mode === 'login'
                    ? language === 'hi' ? 'पोर्टल में प्रवेश करें' : 'Sign in'
                    : language === 'hi' ? 'खाता बनाएं और प्रोफ़ाइल खोलें' : 'Create account and open profile'}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
