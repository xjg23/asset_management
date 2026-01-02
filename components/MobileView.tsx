import React, { useState } from 'react';
import { Asset, AssetStatus, TransactionType } from '../types';
import { TRANSLATIONS } from '../constants';
import { ScanLine, ArrowLeft, Box, User, ClipboardList, PenTool, Shield, Lock, Search, Filter, Settings, Save, AlertCircle } from 'lucide-react';
import SignaturePad from './SignaturePad';

interface MobileViewProps {
  assets: Asset[];
  onTransaction: (assetId: string, type: TransactionType, userName: string, signature: string, notes?: string) => void;
  transactions: any[]; // For history view
  lang: 'zh' | 'en';
}

const MobileView: React.FC<MobileViewProps> = ({ assets, onTransaction, transactions, lang }) => {
  const [viewState, setViewState] = useState<'home' | 'scan_result' | 'sign_flow' | 'history' | 'admin_login' | 'admin_dashboard'>('home');
  const [scannedAsset, setScannedAsset] = useState<Asset | null>(null);
  const [userName, setUserName] = useState('');
  const [flowType, setFlowType] = useState<TransactionType>(TransactionType.BORROW);
  
  const t = (key: string) => (TRANSLATIONS[lang] as any)[key] || key;
  
  // Admin State
  const [currentAdminPassword, setCurrentAdminPassword] = useState('123456');
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [adminSearch, setAdminSearch] = useState('');
  
  // Password Change State
  const [showPasswordChange, setShowPasswordChange] = useState(false);
  const [newPassword, setNewPassword] = useState('');

  // Simulates scanning a QR code by randomly picking an asset or specific logic
  const handleSimulateScan = () => {
    // In a real app, this would open camera. Here we pick a random asset to simulate "Scan Success"
    const randomAsset = assets[Math.floor(Math.random() * assets.length)];
    setScannedAsset(randomAsset);
    setViewState('scan_result');
  };

  const startTransaction = (type: TransactionType) => {
    setFlowType(type);
    setViewState('sign_flow');
  };

  const handleSignatureComplete = (signature: string, notes?: string) => {
    if (scannedAsset && userName) {
      onTransaction(scannedAsset.id, flowType, userName, signature, notes);
      setViewState('home');
      setScannedAsset(null);
      setUserName('');
      alert(`${flowType} ${t('success')}!`);
    } else {
      alert(t('signerName'));
    }
  };

  const getAssetHistory = (assetId: string) => {
    return transactions
      .filter(t => t.assetId === assetId)
      .sort((a, b) => b.timestamp - a.timestamp);
  };

  const handleAdminLogin = () => {
      if (adminPasswordInput === currentAdminPassword) {
          setIsAdminLoggedIn(true);
          setViewState('admin_dashboard');
          setAdminPasswordInput('');
      } else {
          alert("Error (Default: 123456)");
      }
  };

  const updateAdminPassword = () => {
      if (newPassword.length >= 4) {
          setCurrentAdminPassword(newPassword);
          setShowPasswordChange(false);
          setNewPassword('');
          alert(t('success'));
      } else {
          alert("Min 4 chars");
      }
  };

  // -- Sub-Components for Mobile View --

  const Home = () => (
    <div className="flex flex-col items-center justify-center h-full p-6 space-y-8 bg-slate-50 relative">
      <button 
        onClick={() => setViewState(isAdminLoggedIn ? 'admin_dashboard' : 'admin_login')}
        className="absolute top-6 right-6 p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors"
      >
          <Shield size={24} />
      </button>

      <div className="text-center space-y-2">
        <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-indigo-200">
          <Box className="text-white w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold text-slate-800">{t('appTitle')}</h1>
        <p className="text-slate-500">Mobile Asset Manager</p>
      </div>

      <button
        onClick={handleSimulateScan}
        className="w-48 h-48 rounded-full bg-white border-8 border-indigo-50 shadow-xl flex flex-col items-center justify-center active:scale-95 transition-transform"
      >
        <ScanLine className="w-16 h-16 text-indigo-600 mb-2" />
        <span className="font-semibold text-slate-700">{t('scanTap')}</span>
      </button>

      <div className="absolute bottom-8 text-xs text-slate-400">
        Mini-Program V1.0
      </div>
    </div>
  );

  const AdminLogin = () => (
      <div className="h-full flex flex-col justify-center p-8 bg-white">
          <button onClick={() => setViewState('home')} className="absolute top-6 left-6 text-slate-500">
              <ArrowLeft />
          </button>
          <div className="text-center mb-8">
              <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Lock className="text-slate-600" />
              </div>
              <h2 className="text-2xl font-bold text-slate-800">{t('adminLogin')}</h2>
          </div>
          <div className="space-y-4">
              <input 
                type="password" 
                value={adminPasswordInput}
                onChange={(e) => setAdminPasswordInput(e.target.value)}
                placeholder={t('enterPassword')}
                className="w-full p-4 border border-slate-200 rounded-xl bg-slate-50 text-center text-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              />
              <button 
                onClick={handleAdminLogin}
                className="w-full py-4 bg-indigo-600 text-white font-bold rounded-xl shadow-lg hover:bg-indigo-700 active:scale-95 transition-all"
              >
                  {t('enterAdmin')}
              </button>
          </div>
      </div>
  );

  const AdminDashboard = () => {
      const filteredAssets = assets.filter(a => 
        a.name.toLowerCase().includes(adminSearch.toLowerCase()) || 
        a.id.toLowerCase().includes(adminSearch.toLowerCase())
      );

      return (
          <div className="h-full flex flex-col bg-slate-50">
              <div className="bg-white p-4 shadow-sm z-10">
                  <div className="flex justify-between items-center mb-4">
                      <button onClick={() => setViewState('home')} className="p-2 -ml-2">
                          <ArrowLeft className="text-slate-600" />
                      </button>
                      <h2 className="font-bold text-lg text-slate-800">Mobile Admin</h2>
                      <button 
                        onClick={() => setShowPasswordChange(!showPasswordChange)}
                        className={`p-2 rounded-lg ${showPasswordChange ? 'bg-indigo-100 text-indigo-700' : 'text-slate-600 hover:bg-slate-100'}`}
                      >
                          <Settings size={20} />
                      </button>
                  </div>
                  
                  {showPasswordChange && (
                      <div className="mb-4 p-4 bg-slate-50 rounded-xl border border-indigo-100 animate-in fade-in slide-in-from-top-2">
                          <label className="text-xs font-semibold text-slate-500 mb-1 block">New Password</label>
                          <div className="flex gap-2">
                            <input 
                                type="text"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="flex-1 p-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-indigo-500"
                            />
                            <button 
                                onClick={updateAdminPassword}
                                className="px-4 bg-indigo-600 text-white rounded-lg text-sm font-medium"
                            >
                                Update
                            </button>
                          </div>
                      </div>
                  )}

                  <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                      <input 
                        type="text" 
                        placeholder={t('searchPlaceholder')}
                        value={adminSearch}
                        onChange={(e) => setAdminSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg bg-slate-50 text-sm focus:outline-none focus:border-indigo-500"
                      />
                  </div>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-3 mb-4">
                      <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                          <div className="text-xs text-slate-500">{t('totalAssets')}</div>
                          <div className="text-xl font-bold text-slate-800">{assets.length}</div>
                      </div>
                      <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                          <div className="text-xs text-slate-500">{t('borrowed')}</div>
                          <div className="text-xl font-bold text-indigo-600">
                              {assets.filter(a => a.status !== AssetStatus.AVAILABLE).length}
                          </div>
                      </div>
                  </div>

                  {filteredAssets.map(asset => (
                      <div key={asset.id} onClick={() => { setScannedAsset(asset); setViewState('scan_result'); }} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex items-center gap-3 active:bg-slate-50 transition-colors">
                          <img src={asset.imageUrl} className="w-12 h-12 rounded bg-slate-200 object-cover" />
                          <div className="flex-1">
                              <div className="font-semibold text-slate-800">{asset.name}</div>
                              <div className="text-xs text-slate-400">{asset.id}</div>
                          </div>
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                  asset.status === AssetStatus.AVAILABLE ? 'bg-emerald-100 text-emerald-700' :
                                  asset.status === AssetStatus.BORROWED ? 'bg-indigo-100 text-indigo-700' :
                                  asset.status === AssetStatus.LOST ? 'bg-red-100 text-red-700' :
                                  'bg-amber-100 text-amber-700'
                               }`}>
                              {t(`status_${asset.status}`)}
                          </span>
                      </div>
                  ))}
              </div>
          </div>
      );
  }

  const AssetDetail = () => {
    if (!scannedAsset) return null;
    const history = getAssetHistory(scannedAsset.id);

    return (
      <div className="bg-slate-50 min-h-full pb-20">
        {/* Header Image */}
        <div className="relative h-64 w-full bg-slate-200">
            <img src={scannedAsset.imageUrl} alt={scannedAsset.name} className="w-full h-full object-cover" />
            <button 
                onClick={() => setViewState(isAdminLoggedIn ? 'admin_dashboard' : 'home')}
                className="absolute top-4 left-4 p-2 bg-white/80 backdrop-blur rounded-full shadow-sm"
            >
                <ArrowLeft className="w-6 h-6 text-slate-700" />
            </button>
            <div className={`absolute bottom-4 right-4 px-3 py-1 backdrop-blur rounded-full text-white text-xs font-medium ${
                 scannedAsset.status === AssetStatus.LOST ? 'bg-red-600/80' : 'bg-black/60'
            }`}>
                {t(`status_${scannedAsset.status}`)}
            </div>
        </div>

        <div className="p-6 -mt-6 bg-white rounded-t-3xl relative z-10 shadow-sm space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-slate-900">{scannedAsset.name}</h2>
                <p className="text-slate-500 text-sm mt-1">{scannedAsset.model} • {scannedAsset.serialNumber}</p>
                {scannedAsset.description && (
                    <p className="text-slate-600 text-sm mt-2 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100">
                        {scannedAsset.description}
                    </p>
                )}
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-xl">
                    <div className="text-xs text-slate-500 uppercase font-semibold mb-1">{t('th_category')}</div>
                    <div className="font-medium text-slate-800">{scannedAsset.category}</div>
                </div>
                <div className="p-4 bg-slate-50 rounded-xl">
                    <div className="text-xs text-slate-500 uppercase font-semibold mb-1">{t('th_id')}</div>
                    <div className="font-medium text-slate-800">{scannedAsset.id}</div>
                </div>
            </div>

            {/* Actions */}
            <div className="pt-2">
                {scannedAsset.status === AssetStatus.LOST ? (
                     <div className="p-4 bg-red-50 text-red-600 rounded-xl text-center text-sm font-medium border border-red-100">
                         {t('status_Lost')}
                     </div>
                ) : scannedAsset.status === AssetStatus.AVAILABLE ? (
                    <button
                        onClick={() => startTransaction(TransactionType.BORROW)}
                        className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-lg shadow-indigo-200 flex items-center justify-center gap-2"
                    >
                        <User className="w-5 h-5" />
                        {t('borrow')}
                    </button>
                ) : (
                    <button
                        onClick={() => startTransaction(TransactionType.RETURN)}
                        className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl shadow-lg shadow-emerald-200 flex items-center justify-center gap-2"
                    >
                        <ClipboardList className="w-5 h-5" />
                        {t('return')}
                    </button>
                )}
            </div>

            {/* History Feed */}
            <div className="pt-4">
                <h3 className="text-lg font-bold text-slate-900 mb-4">{t('history')}</h3>
                <div className="space-y-4">
                    {history.length > 0 ? history.map(t => (
                        <div key={t.id} className="flex gap-4 items-start">
                            <div className={`mt-1 min-w-2 h-2 rounded-full ${t.type === TransactionType.BORROW ? 'bg-indigo-500' : 'bg-emerald-500'}`} />
                            <div>
                                <div className="text-sm font-medium text-slate-800">
                                    {t.userName}: {t.userName}
                                </div>
                                <div className="text-xs text-slate-500">
                                    {new Date(t.timestamp).toLocaleString()}
                                </div>
                                {t.notes && (
                                    <div className="text-xs text-slate-500 italic mt-1 bg-slate-100 p-2 rounded">
                                        Note: {t.notes}
                                    </div>
                                )}
                            </div>
                        </div>
                    )) : (
                        <div className="text-center py-8 text-slate-400 text-sm">{t('noHistory')}</div>
                    )}
                </div>
            </div>
        </div>
      </div>
    );
  };

  const SignFlow = () => {
    const [notes, setNotes] = useState('');

    return (
    <div className="bg-slate-50 min-h-full flex flex-col">
       <div className="bg-white p-4 shadow-sm flex items-center gap-4">
          <button onClick={() => setViewState('scan_result')}>
             <ArrowLeft className="text-slate-600" />
          </button>
          <h2 className="font-bold text-lg">{t('confirm')} {flowType}</h2>
       </div>

       <div className="flex-1 p-6 space-y-6">
          <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700">
                  {t('signerName')}
              </label>
              <input 
                 type="text" 
                 value={userName}
                 onChange={(e) => setUserName(e.target.value)}
                 placeholder="Full Name"
                 className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
              />
          </div>

          {flowType === TransactionType.RETURN && (
              <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-amber-500" />
                      {t('conditionNotes')}
                  </label>
                  <textarea 
                     value={notes}
                     onChange={(e) => setNotes(e.target.value)}
                     className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none h-24 resize-none"
                  />
              </div>
          )}

          <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <PenTool className="w-4 h-4" />
                  {t('signBox')}
              </label>
              <SignaturePad onSave={(sig) => handleSignatureComplete(sig, notes)} />
          </div>
       </div>
    </div>
    );
  };

  return (
    <div className="w-full h-full relative overflow-hidden bg-slate-50">
      {viewState === 'home' && <Home />}
      {viewState === 'scan_result' && <AssetDetail />}
      {viewState === 'sign_flow' && <SignFlow />}
      {viewState === 'admin_login' && <AdminLogin />}
      {viewState === 'admin_dashboard' && <AdminDashboard />}
    </div>
  );
};

export default MobileView;