import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Asset, AssetStatus, Transaction, TransactionType, User, Reservation } from './types';
import { MOCK_ASSETS, MOCK_TRANSACTIONS, MOCK_USERS, MOCK_RESERVATIONS, TRANSLATIONS } from './constants';
import MobileView from './components/MobileView';
import AdminView from './components/AdminView';
import { Smartphone, Monitor, Globe } from 'lucide-react';

const AppContent: React.FC = () => {
  // Global Mock Database State
  const [assets, setAssets] = useState<Asset[]>(MOCK_ASSETS);
  const [transactions, setTransactions] = useState<Transaction[]>(MOCK_TRANSACTIONS);
  const [users, setUsers] = useState<User[]>(MOCK_USERS);
  const [reservations, setReservations] = useState<Reservation[]>(MOCK_RESERVATIONS);
  const location = useLocation();

  // Language State
  const [lang, setLang] = useState<'zh' | 'en'>('zh');

  const t = (key: string) => {
    return (TRANSLATIONS[lang] as any)[key] || key;
  };

  // Core business logic for handling asset movement
  const handleTransaction = (assetId: string, type: TransactionType, userName: string, signature: string, notes?: string) => {
    const asset = assets.find(a => a.id === assetId);
    if (!asset) return;

    // Create new transaction record
    const newTx: Transaction = {
      id: `TX-${Math.floor(Math.random() * 10000)}`,
      assetId,
      assetName: asset.name,
      userId: `U-${Math.floor(Math.random() * 1000)}`, // Mock ID
      userName,
      type,
      timestamp: Date.now(),
      signatureUrl: signature,
      notes: notes
    };

    // Update Asset Status
    const updatedAssets = assets.map(a => {
      if (a.id === assetId) {
        return {
          ...a,
          status: type === TransactionType.BORROW ? AssetStatus.BORROWED : AssetStatus.AVAILABLE,
          currentHolder: type === TransactionType.BORROW ? userName : undefined
        };
      }
      return a;
    });

    setTransactions(prev => [...prev, newTx]);
    setAssets(updatedAssets);
  };

  const handleAddAsset = (newAsset: Asset) => {
    setAssets(prev => [...prev, newAsset]);
  };

  const handleBulkAddAssets = (newAssets: Asset[]) => {
    setAssets(prev => [...prev, ...newAssets]);
  };

  const handleUpdateAsset = (updatedAsset: Asset) => {
    setAssets(prev => prev.map(a => a.id === updatedAsset.id ? updatedAsset : a));
  };

  const handleBulkUpdateAssets = (updatedAssets: Asset[]) => {
    setAssets(prev => {
        const updateMap = new Map(updatedAssets.map(a => [a.id, a]));
        return prev.map(a => updateMap.has(a.id) ? updateMap.get(a.id)! : a);
    });
  };

  const handleAddUser = (newUser: User) => {
    setUsers(prev => [...prev, newUser]);
  };

  const handleUpdateUser = (updatedUser: User) => {
    setUsers(prev => prev.map(u => u.id === updatedUser.id ? updatedUser : u));
  };

  const handleAddReservation = (reservation: Reservation) => {
    setReservations(prev => [...prev, reservation]);
  };

  // Helper to determine if we should show the role switcher (simulating platform landing)
  const isRoot = location.pathname === '/';

  return (
    <div className="h-screen w-screen bg-slate-50 overflow-hidden font-sans relative">
      {/* Language Toggle */}
      <div className="absolute top-4 right-4 z-50 flex items-center gap-2 bg-white px-3 py-1.5 rounded-full shadow-sm border border-slate-200">
        <Globe size={16} className="text-slate-500" />
        <button 
          onClick={() => setLang('zh')} 
          className={`text-sm font-medium px-2 rounded ${lang === 'zh' ? 'bg-indigo-100 text-indigo-700' : 'text-slate-500 hover:text-indigo-600'}`}
        >
          中文
        </button>
        <div className="w-px h-3 bg-slate-300"></div>
        <button 
          onClick={() => setLang('en')} 
          className={`text-sm font-medium px-2 rounded ${lang === 'en' ? 'bg-indigo-100 text-indigo-700' : 'text-slate-500 hover:text-indigo-600'}`}
        >
          EN
        </button>
      </div>

      {isRoot && (
        <div className="h-full flex flex-col items-center justify-center p-6 space-y-8">
          <div className="text-center space-y-2 max-w-md">
            <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">
              {t('appTitle')}
            </h1>
            <p className="text-slate-500">
              {t('selectInterface')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl">
            <Link to="/mobile" className="group relative block p-8 bg-white border border-slate-200 rounded-2xl shadow-xl hover:shadow-2xl transition-all hover:-translate-y-1">
               <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                 <Smartphone size={100} />
               </div>
               <div className="relative z-10">
                 <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center mb-4">
                   <Smartphone size={24} />
                 </div>
                 <h2 className="text-xl font-bold text-slate-800">{t('mobileApp')}</h2>
                 <p className="text-slate-500 mt-2 text-sm">
                   {t('mobileDesc')}
                 </p>
               </div>
            </Link>

            <Link to="/admin" className="group relative block p-8 bg-white border border-slate-200 rounded-2xl shadow-xl hover:shadow-2xl transition-all hover:-translate-y-1">
               <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                 <Monitor size={100} />
               </div>
               <div className="relative z-10">
                 <div className="w-12 h-12 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center mb-4">
                   <Monitor size={24} />
                 </div>
                 <h2 className="text-xl font-bold text-slate-800">{t('webAdmin')}</h2>
                 <p className="text-slate-500 mt-2 text-sm">
                   {t('webDesc')}
                 </p>
               </div>
            </Link>
          </div>
        </div>
      )}

      <Routes>
        <Route path="/mobile" element={
          <div className="max-w-md mx-auto h-full shadow-2xl bg-white border-x border-slate-200">
            <MobileView assets={assets} transactions={transactions} onTransaction={handleTransaction} lang={lang} />
          </div>
        } />
        <Route path="/admin" element={
          <AdminView 
            assets={assets} 
            transactions={transactions} 
            users={users}
            reservations={reservations}
            onAddAsset={handleAddAsset}
            onBulkAddAssets={handleBulkAddAssets}
            onUpdateAsset={handleUpdateAsset}
            onBulkUpdateAssets={handleBulkUpdateAssets}
            onAddUser={handleAddUser}
            onUpdateUser={handleUpdateUser}
            onAddReservation={handleAddReservation}
            lang={lang}
          />
        } />
      </Routes>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <Router>
      <AppContent />
    </Router>
  );
};

export default App;