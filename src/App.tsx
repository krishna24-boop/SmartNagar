import React, { useState, useEffect, useCallback } from 'react';
import { User, Complaint } from './types';
import { Header } from './components/Header';
import { NagrikView } from './components/NagrikView';
import { DepartmentView } from './components/DepartmentView';
import { NagarNigamView } from './components/NagarNigamView';
import { AdminView } from './components/AdminView';
import { AuthModal } from './components/AuthModal';
import { PrivacyModal } from './components/PrivacyModal';
import { Language, TranslationBoundary } from './Language';
import {
  ShieldCheck,
} from 'lucide-react';

export default function App() {
  const [language, setLanguage] = useState<Language>(() =>
    localStorage.getItem('nagarvani-language') === 'en' ? 'en' : 'hi'
  );
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [loadingComplaints, setLoadingComplaints] = useState(false);
  const [privacyModalOpen, setPrivacyModalOpen] = useState(false);

  const handleLanguageChange = (nextLanguage: Language) => {
    setLanguage(nextLanguage);
    localStorage.setItem('nagarvani-language', nextLanguage);
  };

  // Fetch complaints for current logged-in role
  const fetchComplaints = useCallback(async () => {
    if (!currentUser) {
      setComplaints([]);
      return;
    }
    setLoadingComplaints(true);
    try {
      const res = await fetch('/api/complaints', {
        headers: {
          Authorization: `Bearer ${currentUser.id}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setComplaints(data.complaints || []);
      }
    } catch (err) {
      console.warn('Failed to fetch complaints:', err);
    } finally {
      setLoadingComplaints(false);
    }
  }, [currentUser]);

  useEffect(() => {
    fetchComplaints();
  }, [fetchComplaints]);

  if (!currentUser) {
    return (
      <AuthModal
        isOpen
        required
        language={language}
        onLanguageChange={handleLanguageChange}
        onClose={() => undefined}
        onLoginSuccess={(user) => setCurrentUser(user)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 flex flex-col font-sans">
      {/* Top Application Header */}
      <Header
        currentUser={currentUser}
        language={language}
        onLanguageChange={handleLanguageChange}
        onOpenPrivacy={() => setPrivacyModalOpen(true)}
        onLogout={() => {
          setCurrentUser(null);
          setComplaints([]);
        }}
      />

      {/* Main App Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6">
        {currentUser ? (
          <>
            {currentUser.role === 'nagrik' && (
              <NagrikView
                currentUser={currentUser}
                language={language}
                complaints={complaints}
                loadingComplaints={loadingComplaints}
                onComplaintCreated={fetchComplaints}
              />
            )}

            {currentUser.role === 'department' && (
              <DepartmentView
                currentUser={currentUser}
                language={language}
                complaints={complaints}
                onStatusUpdated={fetchComplaints}
              />
            )}

            {currentUser.role === 'nagar_nigam' && (
              <NagarNigamView
                currentUser={currentUser}
                language={language}
                complaints={complaints}
                onRefresh={fetchComplaints}
              />
            )}

            {currentUser.role === 'admin' && (
              <AdminView
                currentUser={currentUser}
                language={language}
                complaints={complaints}
                onRefresh={fetchComplaints}
              />
            )}
          </>
        ) : null}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-4 px-6 text-xs text-slate-500 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-700">स्मार्टनगर (SmartNagar)</span>
            <span>•</span>
            <span>{language === 'hi' ? 'AI-संचालित नागरिक शिकायत एवं नगर निगम प्रबंधन' : 'AI-powered civic complaints and municipal management'}</span>
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <button
              onClick={() => setPrivacyModalOpen(true)}
              className="text-emerald-700 font-semibold hover:underline flex items-center gap-1 cursor-pointer"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>{language === 'hi' ? 'नागरिक पहचान निजता (Server-Level Privacy)' : 'Citizen identity privacy (server-level)'}</span>
            </button>
            <span>•</span>
            <span className="text-slate-400">{language === 'hi' ? 'Open-Meteo मौसम चालित प्राथमिकता' : 'Open-Meteo weather-based prioritization'}</span>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <PrivacyModal
        isOpen={privacyModalOpen}
        language={language}
        onClose={() => setPrivacyModalOpen(false)}
      />
    </div>
  );
}
