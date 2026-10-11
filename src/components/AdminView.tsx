import React, { useEffect, useMemo, useState } from 'react';
import { Complaint, User } from '../types';
import { Language, TranslationBoundary } from '../Language';
import {
  ShieldAlert,
  Search,
  Pencil,
  Save,
  X,
} from 'lucide-react';

interface AdminViewProps {
  currentUser: User;
  complaints: Complaint[];
  onRefresh: () => void;
  language: Language;
}

type AdminAccount = {
  id: string;
  name: string;
  emailOrMobile: string;
  password: string;
  role: User['role'];
  department?: User['department'];
  createdAt?: string;
};

export const AdminView: React.FC<AdminViewProps> = ({
  currentUser,
  complaints,
  onRefresh,
  language,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [accounts, setAccounts] = useState<AdminAccount[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<AdminAccount>>({});

  const fetchUsers = async () => {
    setLoadingAccounts(true);
    try {
      const res = await fetch('/api/admin/users', {
        headers: {
          Authorization: `Bearer ${currentUser.id}`,
        },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to load accounts');
      setAccounts(data.users || []);
    } catch (error) {
      console.warn('Failed to load admin users:', error);
    } finally {
      setLoadingAccounts(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [currentUser.id]);

  const filtered = complaints.filter(
    (c) =>
      c.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.trackingId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.citizenName && c.citizenName.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const departmentAccounts = useMemo(
    () => accounts.filter((u) => u.role === 'department' || u.role === 'nagar_nigam' || u.role === 'admin'),
    [accounts]
  );

  const startEditing = (account: AdminAccount) => {
    setEditingId(account.id);
    setFormData({
      name: account.name,
      emailOrMobile: account.emailOrMobile,
      password: account.password,
      role: account.role,
      department: account.department,
    });
  };

  const cancelEditing = () => {
    setEditingId(null);
    setFormData({});
  };

  const saveAccount = async () => {
    if (!editingId) return;

    try {
      const payload = {
        name: formData.name,
        emailOrMobile: formData.emailOrMobile,
        password: formData.password,
        role: formData.role,
        department: formData.department,
      };

      const res = await fetch(`/api/admin/users/${editingId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${currentUser.id}`,
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Update failed');
      cancelEditing();
      fetchUsers();
      onRefresh();
    } catch (error) {
      console.warn('Failed to update account:', error);
    }
  };

  return (
    <TranslationBoundary language={language}>
      <div className="space-y-6">
        <div className="p-4 bg-amber-50 border border-amber-300 rounded-2xl flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-600 text-white rounded-xl">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                <span>मुख्य व्यवस्थापक ऑडिट मोड (Full Administrative Access)</span>
                <span className="bg-amber-200 text-amber-900 text-[10px] px-2 py-0.5 rounded-full font-bold">
                  Tier-1 Admin
                </span>
              </div>
              <p className="text-[11px] text-amber-900 mt-0.5">
                नीचे सभी विभागीय उपयोगकर्ता, उनके यूज़रनेम और पासवर्ड दिखाए जा रहे हैं। एडमिन इन्हें सीधे अपडेट कर सकता है।
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <span className="text-xs font-bold text-slate-500 uppercase">कुल दर्ज मामले</span>
            <div className="text-2xl font-black text-slate-900 mt-1">{complaints.length}</div>
            <span className="text-[11px] text-slate-400">नागरिक पहचान ऑडिट रिकॉर्ड्स</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <span className="text-xs font-bold text-emerald-600 uppercase">सक्रिय उपयोगकर्ता</span>
            <div className="text-2xl font-black text-emerald-700 mt-1">{departmentAccounts.length + 2}</div>
            <span className="text-[11px] text-emerald-500">एडमिन, नगर निगम, विभाग</span>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
            <span className="text-xs font-bold text-indigo-600 uppercase">विभागीय ऑपरेटर</span>
            <div className="text-2xl font-black text-indigo-700 mt-1">{departmentAccounts.length}</div>
            <span className="text-[11px] text-indigo-500">सड़क, सफाई, बिजली, जल</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-200">
            <h3 className="text-sm font-bold text-slate-900">उपयोगकर्ता प्रबंधन (User Management)</h3>
            <p className="text-xs text-slate-500 mt-1">एडमिन यूजर आईडी, नाम, विभाग और पासवर्ड सीधे देख और अपडेट कर सकता है।</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3.5">नाम</th>
                  <th className="p-3.5">रोल</th>
                  <th className="p-3.5">विभाग</th>
                  <th className="p-3.5">उपयोगकर्ता ID</th>
                  <th className="p-3.5">पासवर्ड</th>
                  <th className="p-3.5">एक्शन</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loadingAccounts ? (
                  <tr>
                    <td colSpan={6} className="p-4 text-center text-slate-500">लोड हो रहा है...</td>
                  </tr>
                ) : (
                  accounts.map((account) => (
                    <tr key={account.id} className="hover:bg-slate-50/50 transition-colors align-top">
                      <td className="p-3.5">
                        {editingId === account.id ? (
                          <input
                            type="text"
                            value={formData.name || ''}
                            onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                            className="w-full border border-slate-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        ) : (
                          <div className="font-bold text-slate-900">{account.name}</div>
                        )}
                      </td>

                      <td className="p-3.5">
                        {editingId === account.id ? (
                          <select
                            value={formData.role || account.role}
                            onChange={(e) => setFormData((prev) => ({ ...prev, role: e.target.value as User['role'] }))}
                            className="w-full border border-slate-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="admin">admin</option>
                            <option value="nagar_nigam">nagar_nigam</option>
                            <option value="department">department</option>
                            <option value="nagrik">nagrik</option>
                          </select>
                        ) : (
                          <span className="font-semibold text-indigo-700 uppercase">{account.role}</span>
                        )}
                      </td>

                      <td className="p-3.5">
                        {editingId === account.id ? (
                          <select
                            value={formData.department || account.department || 'sadak'}
                            onChange={(e) => setFormData((prev) => ({ ...prev, department: e.target.value as User['department'] }))}
                            className="w-full border border-slate-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="sadak">sadak</option>
                            <option value="safai">safai</option>
                            <option value="bijli">bijli</option>
                            <option value="jal">jal</option>
                          </select>
                        ) : (
                          <span className="font-semibold text-slate-700 uppercase">{account.department || '-'}</span>
                        )}
                      </td>

                      <td className="p-3.5">
                        {editingId === account.id ? (
                          <input
                            type="text"
                            value={formData.emailOrMobile || ''}
                            onChange={(e) => setFormData((prev) => ({ ...prev, emailOrMobile: e.target.value }))}
                            className="w-full border border-slate-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        ) : (
                          <span className="font-mono text-slate-700">{account.emailOrMobile}</span>
                        )}
                      </td>

                      <td className="p-3.5">
                        {editingId === account.id ? (
                          <input
                            type="text"
                            value={formData.password || ''}
                            onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
                            className="w-full border border-slate-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        ) : (
                          <span className="font-mono font-bold text-rose-700">{account.password}</span>
                        )}
                      </td>

                      <td className="p-3.5">
                        {editingId === account.id ? (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={saveAccount}
                              className="inline-flex items-center gap-1 bg-emerald-600 text-white px-2 py-1.5 rounded-lg hover:bg-emerald-700"
                            >
                              <Save className="w-3.5 h-3.5" /> Save
                            </button>
                            <button
                              type="button"
                              onClick={cancelEditing}
                              className="inline-flex items-center gap-1 bg-slate-200 text-slate-700 px-2 py-1.5 rounded-lg hover:bg-slate-300"
                            >
                              <X className="w-3.5 h-3.5" /> Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => startEditing(account)}
                            className="inline-flex items-center gap-1 bg-blue-600 text-white px-2 py-1.5 rounded-lg hover:bg-blue-700"
                          >
                            <Pencil className="w-3.5 h-3.5" /> Edit
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                संपूर्ण नागरिक शिकायत एवं पहचान रजिस्टर (Citizen Identity Audit Register)
              </h3>
              <p className="text-xs text-slate-500">
                गोपनीय प्रशासनिक रिकॉर्ड — शिकायतकर्ता का नाम एवं संपर्क नंबर केवल यहाँ दृश्यमान है।
              </p>
            </div>

            <div className="relative min-w-[240px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="नाम, ट्रैकिंग ID या शीर्षक से खोजें..."
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="p-3.5">ट्रैकिंग ID</th>
                  <th className="p-3.5">समस्या एवं विभाग</th>
                  <th className="p-3.5 bg-amber-50/70 text-amber-900 font-extrabold">नागरिक की पहचान (Citizen Identity)</th>
                  <th className="p-3.5">प्राथमिकता / स्कोर</th>
                  <th className="p-3.5">विभाग समय (ETA)</th>
                  <th className="p-3.5">वर्तमान स्थिति</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-3.5 font-mono font-bold text-slate-800">{c.trackingId}</td>
                    <td className="p-3.5 max-w-[240px]">
                      <div className="font-bold text-slate-900 truncate">{c.title}</div>
                      <div className="text-[11px] text-slate-500 truncate">📍 {c.location?.address}</div>
                      <span className="text-[10px] font-semibold text-indigo-700 uppercase">{c.category}</span>
                    </td>
                    <td className="p-3.5 bg-amber-50/40">
                      <div className="font-bold text-slate-900">{c.citizenName || 'रमेश कुमार (नागरिक)'}</div>
                      <div className="text-[11px] text-slate-600 font-mono">{c.citizenContact || '+91 98765 43210'}</div>
                      <span className="text-[9px] text-amber-800 font-bold bg-amber-100 px-1.5 py-0.5 rounded">केवल एडमिन दृश्य</span>
                    </td>
                    <td className="p-3.5">
                      <span className="font-extrabold text-red-600">{c.priority?.totalScore} अंक</span>
                      <span className="block text-[10px] text-slate-500">{c.priority?.level?.toUpperCase()}</span>
                    </td>
                    <td className="p-3.5 text-[11px]">
                      {c.departmentEta ? (
                        <span className="font-bold text-emerald-800">{c.departmentEta}</span>
                      ) : (
                        <span className="text-slate-400">{c.aiAnalysis?.aiEtaText || 'AI का अंदाज़ा'}</span>
                      )}
                    </td>
                    <td className="p-3.5">
                      <span
                        className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                          c.status === 'ho_gaya'
                            ? 'bg-emerald-100 text-emerald-800'
                            : c.status === 'kaam_chalu'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {c.status === 'ho_gaya'
                          ? 'समाधान'
                          : c.status === 'kaam_chalu'
                          ? 'काम चालू'
                          : 'दर्ज'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </TranslationBoundary>
  );
};
