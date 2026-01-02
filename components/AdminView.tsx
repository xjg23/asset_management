import React, { useState, useEffect, useRef } from 'react';
import { Asset, AssetStatus, Transaction, User, UserRole, Reservation } from '../types';
import { analyzeAssetHealth } from '../services/geminiService';
import { TRANSLATIONS } from '../constants';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { LayoutDashboard, Package, History, Sparkles, Plus, Search, Filter, Calendar, X, Users, QrCode, Edit2, Save, Download, Bell, AlertTriangle, Upload, CalendarDays, Image as ImageIcon, Trash2, List, CheckSquare, Settings2, Loader } from 'lucide-react';
import JSZip from 'jszip';
import QRCode from 'qrcode';

interface AdminViewProps {
  assets: Asset[];
  transactions: Transaction[];
  users: User[];
  reservations: Reservation[];
  onAddAsset: (asset: Asset) => void;
  onBulkAddAssets: (assets: Asset[]) => void;
  onUpdateAsset: (asset: Asset) => void;
  onBulkUpdateAssets: (assets: Asset[]) => void;
  onAddUser: (user: User) => void;
  onUpdateUser: (user: User) => void;
  onAddReservation: (reservation: Reservation) => void;
  lang: 'zh' | 'en';
}

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'warning' | 'critical';
  timestamp: number;
}

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444'];

const AdminView: React.FC<AdminViewProps> = ({ assets, transactions, users, reservations, onAddAsset, onBulkAddAssets, onUpdateAsset, onBulkUpdateAssets, onAddUser, onUpdateUser, onAddReservation, lang }) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'assets' | 'users' | 'reservations' | 'ledger'>('dashboard');
  const [aiAnalysis, setAiAnalysis] = useState<string>('');
  const [loadingAi, setLoadingAi] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const t = (key: string) => (TRANSLATIONS[lang] as any)[key] || key;

  // Notifications State
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  // Asset Filter States
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Bulk Edit State
  const [selectedAssetIds, setSelectedAssetIds] = useState<Set<string>>(new Set());
  const [isBulkEditModalOpen, setIsBulkEditModalOpen] = useState(false);
  const [bulkEditForm, setBulkEditForm] = useState<{ status?: AssetStatus | '', category?: string }>({ status: '', category: '' });

  // Modals State
  const [isAssetModalOpen, setIsAssetModalOpen] = useState(false);
  const [editingAsset, setEditingAsset] = useState<Asset | null>(null); // Null means adding new
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isReservationModalOpen, setIsReservationModalOpen] = useState(false);

  // QR Download Confirmation State
  const [isQrConfirmModalOpen, setIsQrConfirmModalOpen] = useState(false);
  const [isGeneratingQr, setIsGeneratingQr] = useState(false);

  // Forms State
  const [newAssetForm, setNewAssetForm] = useState<Partial<Asset>>({});
  const [newUserForm, setNewUserForm] = useState<Partial<User>>({});
  const [newReservationForm, setNewReservationForm] = useState<Partial<Reservation>>({});
  
  // Custom Features Form State (Array for easier rendering in form)
  const [customFeaturesList, setCustomFeaturesList] = useState<{key: string, value: string}[]>([]);

  // Refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Check for critical events on load/update
  useEffect(() => {
    const newNotifications: Notification[] = [];
    
    // Check 1: Lost Assets
    const lostAssets = assets.filter(a => a.status === AssetStatus.LOST);
    lostAssets.forEach(a => {
      newNotifications.push({
        id: `lost-${a.id}`,
        title: lang === 'zh' ? '资产报失提醒' : 'Asset Lost Alert',
        message: `${a.name} (${a.id}) ${lang === 'zh' ? '目前状态为“已丢失”' : 'is marked as Lost'}.`,
        type: 'critical',
        timestamp: Date.now()
      });
    });

    // Check 2: Extended Borrowing (> 7 days)
    const now = Date.now();
    const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
    
    assets.filter(a => a.status === AssetStatus.BORROWED).forEach(a => {
       // Find last borrow tx
       const lastTx = transactions
         .filter(t => t.assetId === a.id && t.type === 'Borrow')
         .sort((x, y) => y.timestamp - x.timestamp)[0];
       
       if (lastTx && (now - lastTx.timestamp > sevenDaysMs)) {
         newNotifications.push({
           id: `overdue-${a.id}`,
           title: lang === 'zh' ? '超期借用提醒' : 'Overdue Alert',
           message: `${a.name} ${lang === 'zh' ? '已被' : 'held by'} ${lastTx.userName} ${lang === 'zh' ? '借用超过7天' : 'for >7 days'}.`,
           type: 'warning',
           timestamp: Date.now()
         });
       }
    });

    setNotifications(newNotifications);
  }, [assets, transactions, lang]);

  const handleAiAnalysis = async () => {
    setLoadingAi(true);
    const result = await analyzeAssetHealth(assets, transactions);
    setAiAnalysis(result);
    setLoadingAi(false);
  };

  // --- Filtering Logic ---
  const statusData = [
    { name: t('status_Available'), value: assets.filter(a => a.status === AssetStatus.AVAILABLE).length },
    { name: t('status_Borrowed'), value: assets.filter(a => a.status === AssetStatus.BORROWED).length },
    { name: t('status_Maintenance'), value: assets.filter(a => a.status === AssetStatus.MAINTENANCE).length },
    { name: t('status_Lost'), value: assets.filter(a => a.status === AssetStatus.LOST).length },
  ];

  const categoryData = Object.entries(assets.reduce((acc, curr) => {
    acc[curr.category] = (acc[curr.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>)).map(([name, value]) => ({ name, value }));

  const uniqueCategories = Array.from(new Set(assets.map(a => a.category))).sort();

  // Dynamic Custom Feature Columns
  const getAllCustomFeatureKeys = (assets: Asset[]) => {
      const keys = new Set<string>();
      assets.forEach(a => {
          if (a.customFeatures) {
              Object.keys(a.customFeatures).forEach(k => keys.add(k));
          }
      });
      return Array.from(keys).sort();
  };
  const dynamicFeatureColumns = getAllCustomFeatureKeys(assets);

  const filteredAssets = assets.filter(a => {
    const matchesSearch = a.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          a.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          a.serialNumber.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Advanced Filters
    const matchesStatus = statusFilter === 'All' || a.status === statusFilter;
    const matchesCategory = categoryFilter === 'All' || a.category === categoryFilter;
    
    let matchesDate = true;
    if (startDate) {
        matchesDate = matchesDate && new Date(a.purchaseDate) >= new Date(startDate);
    }
    if (endDate) {
        matchesDate = matchesDate && new Date(a.purchaseDate) <= new Date(endDate);
    }

    return matchesSearch && matchesStatus && matchesCategory && matchesDate;
  });

  const filteredTransactions = transactions.filter(t => 
    t.assetName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.userName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredUsers = users.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const resetFilters = () => {
    setStatusFilter('All');
    setCategoryFilter('All');
    setStartDate('');
    setEndDate('');
  };

  const activeFilterCount = (statusFilter !== 'All' ? 1 : 0) + (categoryFilter !== 'All' ? 1 : 0) + (startDate ? 1 : 0) + (endDate ? 1 : 0);

  // --- Handlers ---
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
        setSelectedAssetIds(new Set(filteredAssets.map(a => a.id)));
    } else {
        setSelectedAssetIds(new Set());
    }
  };

  const handleSelectAsset = (id: string) => {
    const newSet = new Set(selectedAssetIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedAssetIds(newSet);
  };

  const openBulkEditModal = () => {
      setBulkEditForm({ status: '', category: '' });
      setIsBulkEditModalOpen(true);
  };

  const saveBulkEdit = () => {
      const updates: Asset[] = [];
      selectedAssetIds.forEach(id => {
          const original = assets.find(a => a.id === id);
          if (original) {
              const updated = { ...original };
              let changed = false;
              if (bulkEditForm.status) {
                   updated.status = bulkEditForm.status;
                   changed = true;
              }
              if (bulkEditForm.category) {
                   updated.category = bulkEditForm.category;
                   changed = true;
              }
              if (changed) updates.push(updated);
          }
      });
      if (updates.length > 0) {
        onBulkUpdateAssets(updates);
        alert(`${t('success')}: ${updates.length}`);
      }
      setIsBulkEditModalOpen(false);
      setSelectedAssetIds(new Set());
  };

  const handleExportCSV = () => {
    if (filteredAssets.length === 0) return;

    const featureHeaders = dynamicFeatureColumns;
    
    const headers = [t('th_id'), t('th_name'), t('th_category'), 'Model', 'SN', t('th_status'), t('th_holder'), 'Date', 'Desc', ...featureHeaders];
    const rows = filteredAssets.map(a => {
        const featureValues = featureHeaders.map(key => `"${a.customFeatures?.[key] || ''}"`);
        return [
            a.id,
            `"${a.name}"`, 
            a.category,
            `"${a.model}"`,
            a.serialNumber,
            a.status,
            a.currentHolder || '',
            a.purchaseDate,
            `"${a.description || ''}"`,
            ...featureValues
        ];
    });

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
        + headers.join(",") + "\n" 
        + rows.map(r => r.join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `assets_export_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadQRs = () => {
    if (filteredAssets.length === 0) return;
    setIsQrConfirmModalOpen(true);
  };

  const processDownloadQRs = async () => {
    setIsGeneratingQr(true);
    
    const zip = new JSZip();
    const folder = zip.folder("asset_qrs");
    
    if (!folder) {
        setIsGeneratingQr(false);
        return;
    }

    try {
        const promises = filteredAssets.map(async (asset) => {
            try {
                // Use client-side generation to avoid CORS and API rate limits
                const dataUrl = await QRCode.toDataURL(asset.id, { width: 400, margin: 1 });
                const base64Data = dataUrl.split(',')[1];
                folder.file(`${asset.id}_qr.png`, base64Data, {base64: true});
            } catch (err) {
                console.error(`Failed to generate QR for ${asset.id}`, err);
            }
        });

        await Promise.all(promises);

        const content = await zip.generateAsync({ type: "blob" });
        const url = URL.createObjectURL(content);
        const link = document.createElement("a");
        link.href = url;
        link.download = `asset_qrs_${new Date().toISOString().slice(0,10)}.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    } catch (e) {
        console.error("Error generating QR zip:", e);
        alert("Error generating QRs");
    } finally {
        setIsGeneratingQr(false);
        setIsQrConfirmModalOpen(false);
    }
  };

  const handleImportCSVClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      const lines = content.split('\n');
      const newAssets: Asset[] = [];
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line) {
          const [name, category, model, serialNumber] = line.split(',').map(s => s.trim().replace(/^"|"$/g, ''));
          if (name) {
             const id = `AST-${Math.floor(Math.random() * 100000)}`;
             newAssets.push({
               id,
               name,
               category: category || 'General',
               model: model || 'Standard',
               serialNumber: serialNumber || 'N/A',
               purchaseDate: new Date().toISOString().split('T')[0],
               status: AssetStatus.AVAILABLE,
               imageUrl: `https://picsum.photos/400/300?random=${Math.random()}`,
               qrCode: `qr-${id}`,
               description: 'CSV Import'
             });
          }
        }
      }
      if (newAssets.length > 0) {
        onBulkAddAssets(newAssets);
        alert(`${t('success')} : ${newAssets.length}`);
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const openAddAssetModal = () => {
    setEditingAsset(null);
    setNewAssetForm({
        id: `AST-${Math.floor(Math.random() * 10000)}`,
        status: AssetStatus.AVAILABLE,
        purchaseDate: new Date().toISOString().split('T')[0]
    });
    setCustomFeaturesList([]);
    setIsAssetModalOpen(true);
  };

  const openViewAssetModal = (asset: Asset) => {
      setEditingAsset(asset);
      setNewAssetForm(asset);
      const features = asset.customFeatures ? 
        Object.entries(asset.customFeatures).map(([key, value]) => ({ key, value })) : [];
      setCustomFeaturesList(features);
      setIsAssetModalOpen(true);
  };

  const handleAssetImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
        const reader = new FileReader();
        reader.onloadend = () => {
            setNewAssetForm(prev => ({ ...prev, imageUrl: reader.result as string }));
        };
        reader.readAsDataURL(file);
    }
  };

  const triggerImageUpload = () => {
    imageInputRef.current?.click();
  };

  const handleFeatureChange = (index: number, field: 'key' | 'value', text: string) => {
      const newList = [...customFeaturesList];
      newList[index][field] = text;
      setCustomFeaturesList(newList);
  };

  const addFeatureRow = () => {
      setCustomFeaturesList([...customFeaturesList, { key: '', value: '' }]);
  };

  const removeFeatureRow = (index: number) => {
      const newList = [...customFeaturesList];
      newList.splice(index, 1);
      setCustomFeaturesList(newList);
  };

  const saveAsset = () => {
      const customFeaturesRecord: Record<string, string> = {};
      customFeaturesList.forEach(item => {
          if (item.key.trim()) {
              customFeaturesRecord[item.key.trim()] = item.value.trim();
          }
      });

      const finalAssetForm = {
          ...newAssetForm,
          imageUrl: newAssetForm.imageUrl || `https://picsum.photos/400/300?random=${Math.floor(Math.random() * 1000)}`,
          customFeatures: customFeaturesRecord
      };

      if (editingAsset) {
          if (finalAssetForm.name && finalAssetForm.id) {
              onUpdateAsset({
                  ...editingAsset,
                  ...finalAssetForm as Asset
              });
              setIsAssetModalOpen(false);
          }
      } else {
          if (finalAssetForm.name && finalAssetForm.id) {
            onAddAsset({
                id: finalAssetForm.id,
                name: finalAssetForm.name || t('unknown'),
                category: finalAssetForm.category || t('general'),
                model: finalAssetForm.model || 'Standard',
                serialNumber: finalAssetForm.serialNumber || 'N/A',
                purchaseDate: finalAssetForm.purchaseDate || new Date().toISOString(),
                status: finalAssetForm.status || AssetStatus.AVAILABLE,
                imageUrl: finalAssetForm.imageUrl as string,
                qrCode: `qr-${finalAssetForm.id}`,
                description: finalAssetForm.description,
                customFeatures: customFeaturesRecord
            });
            setIsAssetModalOpen(false);
          }
      }
  };

  const openAddUserModal = () => {
      setEditingUser(null);
      setNewUserForm({
          id: `U${Math.floor(Math.random() * 1000)}`,
          role: 'Staff',
          password: '123'
      });
      setIsUserModalOpen(true);
  };

  const openEditUserModal = (user: User) => {
      setEditingUser(user);
      setNewUserForm(user);
      setIsUserModalOpen(true);
  };

  const saveUser = () => {
      if (newUserForm.name && newUserForm.email) {
          const userPayload = {
              id: newUserForm.id || `U${Date.now()}`,
              name: newUserForm.name,
              email: newUserForm.email,
              role: newUserForm.role || 'Staff',
              department: newUserForm.department,
              password: newUserForm.password || (newUserForm.role === 'Admin' ? '123456' : '123')
          };

          if (editingUser) {
              onUpdateUser(userPayload);
          } else {
              onAddUser(userPayload);
          }
          setIsUserModalOpen(false);
      }
  };

  const openAddReservationModal = () => {
      setNewReservationForm({
          id: `RES-${Math.floor(Math.random() * 1000)}`,
          status: 'Confirmed'
      });
      setIsReservationModalOpen(true);
  };

  const saveReservation = () => {
      if (newReservationForm.assetId && newReservationForm.userId && newReservationForm.startDate && newReservationForm.endDate) {
          onAddReservation({
              id: newReservationForm.id || `RES-${Date.now()}`,
              assetId: newReservationForm.assetId,
              userId: newReservationForm.userId,
              startDate: newReservationForm.startDate,
              endDate: newReservationForm.endDate,
              status: newReservationForm.status as 'Pending' | 'Confirmed' | 'Cancelled' || 'Confirmed'
          });
          setIsReservationModalOpen(false);
      } else {
          alert('Missing fields');
      }
  };

  // Keep for simple display in modals where perf/cors isn't as critical (or browser handles it differently)
  const getQrUrl = (data: string) => `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(data)}`;

  return (
    <div className="flex h-screen bg-slate-100">
      {/* Sidebar */}
      <div className="w-64 bg-slate-900 text-slate-300 flex flex-col">
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
             <div className="w-8 h-8 bg-indigo-500 rounded-lg flex items-center justify-center text-white font-bold">AG</div>
             <span className="text-white font-bold text-lg">AdminPortal</span>
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <button 
            onClick={() => setActiveTab('dashboard')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'dashboard' ? 'bg-indigo-600 text-white' : 'hover:bg-slate-800'}`}
          >
            <LayoutDashboard size={20} />
            {t('dashboard')}
          </button>
          <button 
            onClick={() => setActiveTab('assets')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'assets' ? 'bg-indigo-600 text-white' : 'hover:bg-slate-800'}`}
          >
            <Package size={20} />
            {t('assets')}
          </button>
          <button 
            onClick={() => setActiveTab('users')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'users' ? 'bg-indigo-600 text-white' : 'hover:bg-slate-800'}`}
          >
            <Users size={20} />
            {t('users')}
          </button>
          <button 
            onClick={() => setActiveTab('reservations')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'reservations' ? 'bg-indigo-600 text-white' : 'hover:bg-slate-800'}`}
          >
            <CalendarDays size={20} />
            {t('reservations')}
          </button>
          <button 
            onClick={() => setActiveTab('ledger')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${activeTab === 'ledger' ? 'bg-indigo-600 text-white' : 'hover:bg-slate-800'}`}
          >
            <History size={20} />
            {t('ledger')}
          </button>
        </nav>
        <div className="p-4 border-t border-slate-800 text-xs text-slate-500">
          System Status: Online <br/>
          v2.6.2
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto relative">
        <header className="bg-white shadow-sm border-b border-slate-200 p-6 flex justify-between items-center sticky top-0 z-20">
           <h1 className="text-2xl font-bold text-slate-800 capitalize">
               {activeTab === 'dashboard' ? t('dashboard') : 
                activeTab === 'assets' ? t('assets') : 
                activeTab === 'users' ? t('users') : 
                activeTab === 'reservations' ? t('reservations') : t('ledger')}
           </h1>
           <div className="flex items-center gap-4">
              <div className="relative">
                 <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                 <input 
                    type="text" 
                    placeholder={t('searchPlaceholder')} 
                    className="pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none w-64"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                 />
              </div>

              {/* Notification Bell */}
              <div className="relative">
                  <button 
                    onClick={() => setShowNotifications(!showNotifications)}
                    className="relative p-2 rounded-full hover:bg-slate-100 text-slate-500 hover:text-indigo-600 transition-colors"
                  >
                      <Bell size={20} />
                      {notifications.length > 0 && (
                          <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
                      )}
                  </button>
                  {showNotifications && (
                      <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden z-50">
                          <div className="p-3 border-b border-slate-100 bg-slate-50 font-semibold text-xs text-slate-500 uppercase">
                              {t('notifications')}
                          </div>
                          <div className="max-h-64 overflow-y-auto">
                              {notifications.length === 0 ? (
                                  <div className="p-4 text-center text-slate-400 text-sm">{t('noNotifications')}</div>
                              ) : (
                                  notifications.map(n => (
                                      <div key={n.id} className="p-3 border-b border-slate-50 hover:bg-slate-50 transition-colors">
                                          <div className="flex items-start gap-3">
                                              {n.type === 'critical' ? (
                                                  <AlertTriangle size={16} className="text-red-500 mt-0.5" />
                                              ) : (
                                                  <Bell size={16} className="text-amber-500 mt-0.5" />
                                              )}
                                              <div>
                                                  <div className="text-sm font-semibold text-slate-800">{n.title}</div>
                                                  <p className="text-xs text-slate-500 mt-1">{n.message}</p>
                                                  <div className="text-[10px] text-slate-400 mt-2">{new Date(n.timestamp).toLocaleTimeString()}</div>
                                              </div>
                                          </div>
                                      </div>
                                  ))
                              )}
                          </div>
                      </div>
                  )}
              </div>

              <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-700 font-bold">
                 AD
              </div>
           </div>
        </header>

        <main className="p-8">
           {activeTab === 'dashboard' && (
             <div className="space-y-6">
                {/* AI Section */}
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-6 text-white shadow-lg">
                   <div className="flex items-start justify-between">
                      <div>
                        <h2 className="text-xl font-bold flex items-center gap-2">
                           <Sparkles className="w-5 h-5" />
                           {t('aiInsight')}
                        </h2>
                        <p className="text-indigo-100 mt-2 max-w-2xl text-sm leading-relaxed">
                          {loadingAi ? t('aiAnalyzing') : aiAnalysis || t('aiPrompt')}
                        </p>
                      </div>
                      <button 
                        onClick={handleAiAnalysis}
                        disabled={loadingAi}
                        className="px-6 py-2 bg-white text-indigo-600 rounded-lg font-semibold hover:bg-indigo-50 transition-colors disabled:opacity-70"
                      >
                         {loadingAi ? t('aiAnalyzing') : t('aiGenerate')}
                      </button>
                   </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                   <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                      <div className="text-slate-500 text-sm font-medium uppercase">{t('totalAssets')}</div>
                      <div className="text-3xl font-bold text-slate-900 mt-2">{assets.length}</div>
                   </div>
                   <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                      <div className="text-slate-500 text-sm font-medium uppercase">{t('borrowed')}</div>
                      <div className="text-3xl font-bold text-indigo-600 mt-2">{statusData[1].value}</div>
                   </div>
                   <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                      <div className="text-slate-500 text-sm font-medium uppercase">{t('available')}</div>
                      <div className="text-3xl font-bold text-emerald-600 mt-2">{statusData[0].value}</div>
                   </div>
                   <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                      <div className="text-slate-500 text-sm font-medium uppercase">{t('maintenance')}</div>
                      <div className="text-3xl font-bold text-amber-500 mt-2">{statusData[2].value}</div>
                   </div>
                </div>

                {/* Charts */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                      <h3 className="text-lg font-bold text-slate-800 mb-6">{t('statusDist')}</h3>
                      <div className="h-64">
                         <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                               <Pie data={statusData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                                  {statusData.map((entry, index) => (
                                     <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                  ))}
                               </Pie>
                               <Tooltip />
                            </PieChart>
                         </ResponsiveContainer>
                      </div>
                      <div className="flex justify-center gap-4 mt-4">
                         {statusData.map((entry, index) => (
                            <div key={entry.name} className="flex items-center gap-2 text-xs">
                               <div className="w-3 h-3 rounded-full" style={{backgroundColor: COLORS[index]}} />
                               {entry.name}
                            </div>
                         ))}
                      </div>
                   </div>
                   <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                      <h3 className="text-lg font-bold text-slate-800 mb-6">{t('categoryStats')}</h3>
                      <div className="h-64">
                         <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={categoryData}>
                               <XAxis dataKey="name" axisLine={false} tickLine={false} />
                               <YAxis axisLine={false} tickLine={false} />
                               <Tooltip cursor={{fill: 'transparent'}} />
                               <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} />
                            </BarChart>
                         </ResponsiveContainer>
                      </div>
                   </div>
                </div>
             </div>
           )}

           {activeTab === 'assets' && (
             <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 border-b border-slate-200 bg-slate-50">
                    <div className="flex justify-between items-center">
                        <h3 className="font-semibold text-slate-700">{t('assetList')}</h3>
                        <div className="flex items-center gap-2">
                             {selectedAssetIds.size > 0 && (
                                 <button
                                    onClick={openBulkEditModal}
                                    className="px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 flex items-center gap-2 animate-in fade-in zoom-in duration-200"
                                 >
                                    <Settings2 size={16} /> {t('bulkEdit')} ({selectedAssetIds.size})
                                 </button>
                             )}
                             <input 
                                type="file" 
                                accept=".csv" 
                                ref={fileInputRef} 
                                onChange={handleFileUpload} 
                                className="hidden" 
                             />
                             <button
                                onClick={handleImportCSVClick}
                                className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center gap-2"
                             >
                                 <Upload size={16} /> {t('importCSV')}
                             </button>
                             <button
                                onClick={handleExportCSV}
                                className="px-3 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-2"
                             >
                                 <Download size={16} /> {t('export')}
                             </button>
                             <button
                                onClick={handleDownloadQRs}
                                className="px-3 py-2 bg-slate-600 text-white rounded-lg text-sm font-medium hover:bg-slate-700 flex items-center gap-2"
                             >
                                 <QrCode size={16} /> {t('downloadQR')}
                             </button>
                             <button 
                                onClick={() => setShowFilters(!showFilters)}
                                className={`px-3 py-2 rounded-lg text-sm font-medium border flex items-center gap-2 transition-colors ${showFilters ? 'bg-indigo-50 border-indigo-200 text-indigo-700' : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'}`}
                             >
                                <Filter size={16} />
                                {t('filter')}
                                {activeFilterCount > 0 && <span className="bg-indigo-600 text-white text-[10px] px-1.5 rounded-full">{activeFilterCount}</span>}
                             </button>
                            <button 
                                onClick={openAddAssetModal}
                                className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 flex items-center gap-2"
                            >
                                <Plus size={16} /> {t('addAsset')}
                            </button>
                        </div>
                    </div>
                    
                    {showFilters && (
                        <div className="mt-4 pt-4 border-t border-slate-200 grid grid-cols-1 md:grid-cols-4 gap-4 animate-in fade-in slide-in-from-top-2">
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 mb-1">{t('th_status')}</label>
                                <select 
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                    className="w-full p-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                >
                                    <option value="All">All</option>
                                    {Object.values(AssetStatus).map(s => <option key={s} value={s}>{t(`status_${s}`)}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 mb-1">{t('th_category')}</label>
                                <select 
                                    value={categoryFilter}
                                    onChange={(e) => setCategoryFilter(e.target.value)}
                                    className="w-full p-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                >
                                    <option value="All">All</option>
                                    {uniqueCategories.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 mb-1">Date (Start)</label>
                                <div className="relative">
                                    <Calendar className="absolute left-2.5 top-2.5 text-slate-400 w-4 h-4 pointer-events-none" />
                                    <input 
                                        type="date" 
                                        value={startDate}
                                        onChange={(e) => setStartDate(e.target.value)}
                                        className="w-full pl-9 p-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-slate-500 mb-1">Date (End)</label>
                                <div className="relative">
                                    <Calendar className="absolute left-2.5 top-2.5 text-slate-400 w-4 h-4 pointer-events-none" />
                                    <input 
                                        type="date" 
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                        className="w-full pl-9 p-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                    />
                                </div>
                            </div>
                            {activeFilterCount > 0 && (
                                <div className="md:col-span-4 flex justify-end">
                                    <button 
                                        onClick={resetFilters}
                                        className="text-xs text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1"
                                    >
                                        <X size={12} /> {t('clearFilters')}
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm text-slate-600 whitespace-nowrap">
                    <thead className="bg-slate-50 text-slate-500 uppercase font-semibold">
                        <tr>
                            <th className="p-4 w-4">
                                <input 
                                    type="checkbox" 
                                    onChange={handleSelectAll}
                                    checked={filteredAssets.length > 0 && selectedAssetIds.size === filteredAssets.length}
                                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                />
                            </th>
                            <th className="p-4">{t('th_id')}</th>
                            <th className="p-4">{t('th_name')}</th>
                            <th className="p-4">{t('th_category')}</th>
                            <th className="p-4">{t('th_status')}</th>
                            <th className="p-4">{t('th_holder')}</th>
                            {dynamicFeatureColumns.map(key => (
                                <th key={key} className="p-4">{key}</th>
                            ))}
                            <th className="p-4">{t('th_action')}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredAssets.length > 0 ? filteredAssets.map(asset => (
                            <tr key={asset.id} className="hover:bg-slate-50 group cursor-pointer" onDoubleClick={() => openViewAssetModal(asset)}>
                                <td className="p-4" onClick={(e) => e.stopPropagation()}>
                                    <input 
                                        type="checkbox" 
                                        checked={selectedAssetIds.has(asset.id)}
                                        onChange={() => handleSelectAsset(asset.id)}
                                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                    />
                                </td>
                                <td className="p-4 font-mono text-slate-500">{asset.id}</td>
                                <td className="p-4 font-medium text-slate-800 flex items-center gap-3">
                                    <img src={asset.imageUrl} className="w-8 h-8 rounded object-cover bg-slate-200" alt="" />
                                    <div>
                                        <div>{asset.name}</div>
                                        <div className="text-xs text-slate-400 font-mono">{asset.serialNumber}</div>
                                    </div>
                                </td>
                                <td className="p-4">{asset.category}</td>
                                <td className="p-4">
                                <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                    asset.status === AssetStatus.AVAILABLE ? 'bg-emerald-100 text-emerald-700' :
                                    asset.status === AssetStatus.BORROWED ? 'bg-indigo-100 text-indigo-700' :
                                    asset.status === AssetStatus.LOST ? 'bg-red-100 text-red-700' :
                                    'bg-amber-100 text-amber-700'
                                }`}>
                                    {t(`status_${asset.status}`)}
                                </span>
                                </td>
                                <td className="p-4">{asset.currentHolder || '-'}</td>
                                {dynamicFeatureColumns.map(key => (
                                    <td key={key} className="p-4 text-xs text-slate-500">
                                        {asset.customFeatures?.[key] || '-'}
                                    </td>
                                ))}
                                <td className="p-4">
                                    <button onClick={(e) => { e.stopPropagation(); openViewAssetModal(asset); }} className="text-indigo-600 hover:text-indigo-800 font-medium text-xs border border-indigo-200 px-2 py-1 rounded">
                                        Edit / QR
                                    </button>
                                </td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan={7 + dynamicFeatureColumns.length} className="p-8 text-center text-slate-400">
                                    No assets found.
                                </td>
                            </tr>
                        )}
                    </tbody>
                    </table>
                </div>
             </div>
           )}

            {activeTab === 'users' && (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                        <h3 className="font-semibold text-slate-700">{t('userDir')}</h3>
                        <button 
                            onClick={openAddUserModal}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 flex items-center gap-2"
                        >
                            <Plus size={16} /> {t('addUser')}
                        </button>
                    </div>
                    <table className="w-full text-left text-sm text-slate-600">
                        <thead className="bg-slate-50 text-slate-500 uppercase font-semibold">
                            <tr>
                                <th className="p-4">Name</th>
                                <th className="p-4">{t('th_role')}</th>
                                <th className="p-4">{t('th_email')}</th>
                                <th className="p-4">{t('th_dept')}</th>
                                <th className="p-4 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredUsers.map(user => (
                                <tr key={user.id} className="hover:bg-slate-50">
                                    <td className="p-4 font-medium text-slate-800">{user.name}</td>
                                    <td className="p-4">
                                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                            user.role === 'Admin' ? 'bg-purple-100 text-purple-700' :
                                            user.role === 'Staff' ? 'bg-blue-100 text-blue-700' :
                                            'bg-slate-100 text-slate-700'
                                        }`}>
                                            {t(`role_${user.role}`)}
                                        </span>
                                    </td>
                                    <td className="p-4">{user.email}</td>
                                    <td className="p-4">{user.department || '-'}</td>
                                    <td className="p-4 text-right">
                                        <button 
                                            onClick={() => openEditUserModal(user)}
                                            className="text-slate-400 hover:text-indigo-600 transition-colors"
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {activeTab === 'reservations' && (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                        <h3 className="font-semibold text-slate-700">Active Reservations</h3>
                        <button 
                            onClick={openAddReservationModal}
                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 flex items-center gap-2"
                        >
                            <Plus size={16} /> New Reservation
                        </button>
                    </div>
                    <table className="w-full text-left text-sm text-slate-600">
                        <thead className="bg-slate-50 text-slate-500 uppercase font-semibold">
                            <tr>
                                <th className="p-4">ID</th>
                                <th className="p-4">Asset</th>
                                <th className="p-4">User</th>
                                <th className="p-4">Start</th>
                                <th className="p-4">End</th>
                                <th className="p-4">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {reservations.map(res => {
                                const asset = assets.find(a => a.id === res.assetId);
                                const user = users.find(u => u.id === res.userId);
                                return (
                                    <tr key={res.id} className="hover:bg-slate-50">
                                        <td className="p-4 font-mono text-slate-500">{res.id}</td>
                                        <td className="p-4 font-medium text-slate-800">{asset ? asset.name : res.assetId}</td>
                                        <td className="p-4">{user ? user.name : res.userId}</td>
                                        <td className="p-4">{res.startDate}</td>
                                        <td className="p-4">{res.endDate}</td>
                                        <td className="p-4">
                                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                                                res.status === 'Confirmed' ? 'bg-indigo-100 text-indigo-700' :
                                                res.status === 'Pending' ? 'bg-amber-100 text-amber-700' :
                                                'bg-slate-100 text-slate-700'
                                            }`}>
                                                {res.status}
                                            </span>
                                        </td>
                                    </tr>
                                );
                            })}
                            {reservations.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-slate-400">
                                        No upcoming reservations.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}

           {activeTab === 'ledger' && (
             <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                    <h3 className="font-semibold text-slate-700">{t('ledger')}</h3>
                    <button className="p-2 hover:bg-slate-200 rounded-lg text-slate-600">
                        <Filter size={18} />
                    </button>
                </div>
                <table className="w-full text-left text-sm text-slate-600">
                   <thead className="bg-slate-50 text-slate-500 uppercase font-semibold">
                      <tr>
                         <th className="p-4">ID</th>
                         <th className="p-4">Time</th>
                         <th className="p-4">Type</th>
                         <th className="p-4">Asset</th>
                         <th className="p-4">Category</th>
                         <th className="p-4">User</th>
                         <th className="p-4">Department</th>
                         <th className="p-4">Signature</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100">
                      {filteredTransactions.sort((a,b) => b.timestamp - a.timestamp).map(tx => {
                         const user = users.find(u => u.id === tx.userId);
                         const asset = assets.find(a => a.id === tx.assetId);
                         return (
                             <tr key={tx.id} className="hover:bg-slate-50">
                                <td className="p-4 font-mono text-slate-500">{tx.id}</td>
                                <td className="p-4">{new Date(tx.timestamp).toLocaleString()}</td>
                                <td className="p-4">
                                    <span className={`font-semibold ${tx.type === 'Borrow' ? 'text-indigo-600' : tx.type === 'Return' ? 'text-emerald-600' : 'text-slate-600'}`}>
                                        {tx.type}
                                    </span>
                                </td>
                                <td className="p-4 font-medium">{tx.assetName}</td>
                                <td className="p-4 text-slate-500">{asset?.category || '-'}</td>
                                <td className="p-4">{tx.userName}</td>
                                <td className="p-4 text-slate-500">{user?.department || '-'}</td>
                                <td className="p-4">
                                    {tx.signatureUrl ? (
                                        <div className="relative group">
                                            <img 
                                                src={tx.signatureUrl} 
                                                className="h-10 w-auto bg-white border border-slate-200 rounded p-1 cursor-pointer hover:scale-105 transition-transform" 
                                                alt="Signature"
                                            />
                                            {/* Tooltip for larger view */}
                                            <div className="absolute bottom-full right-0 mb-2 hidden group-hover:block w-64 bg-white border border-slate-200 shadow-xl rounded-lg p-2 z-50">
                                                 <div className="text-xs text-slate-400 mb-1 border-b pb-1">Signed by {tx.userName}</div>
                                                 <img src={tx.signatureUrl} className="w-full h-auto bg-white" alt="Full Signature" />
                                            </div>
                                        </div>
                                    ) : (
                                        <span className="text-slate-400 text-xs opacity-50">N/A</span>
                                    )}
                                </td>
                             </tr>
                         );
                      })}
                   </tbody>
                </table>
             </div>
           )}
        </main>

        {/* --- MODALS --- */}

        {/* Bulk Edit Modal */}
        {isBulkEditModalOpen && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">
                    <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                        <h2 className="text-lg font-bold text-slate-800">{t('bulkEdit')} ({selectedAssetIds.size})</h2>
                        <button onClick={() => setIsBulkEditModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full">
                            <X size={20} className="text-slate-500" />
                        </button>
                    </div>
                    <div className="p-6 space-y-4">
                        <div className="text-sm text-slate-500 bg-slate-50 p-3 rounded-lg border border-slate-100">
                            Apply changes to {selectedAssetIds.size} items.
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">{t('th_status')}</label>
                            <select 
                                value={bulkEditForm.status}
                                onChange={(e) => setBulkEditForm(prev => ({ ...prev, status: e.target.value as AssetStatus | '' }))}
                                className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                            >
                                <option value="">(No Change)</option>
                                {Object.values(AssetStatus).map(s => <option key={s} value={s}>{t(`status_${s}`)}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">{t('th_category')}</label>
                            <select 
                                value={bulkEditForm.category}
                                onChange={(e) => setBulkEditForm(prev => ({ ...prev, category: e.target.value }))}
                                className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                            >
                                <option value="">(No Change)</option>
                                {uniqueCategories.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                        <button onClick={() => setIsBulkEditModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg font-medium">{t('cancel')}</button>
                        <button onClick={saveBulkEdit} className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 flex items-center gap-2">
                            <Save size={18} /> {t('update')}
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* Asset Modal */}
        {isAssetModalOpen && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
                    <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                        <h2 className="text-xl font-bold text-slate-800">
                            {editingAsset ? t('editAsset') : t('newAsset')}
                        </h2>
                        <button onClick={() => setIsAssetModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full">
                            <X size={20} className="text-slate-500" />
                        </button>
                    </div>
                    <div className="p-8 overflow-y-auto flex-1">
                        <div className="flex flex-col md:flex-row gap-8">
                            {/* Form Side */}
                            <div className="flex-1 space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">{t('th_name')}</label>
                                        <input 
                                            type="text" 
                                            value={newAssetForm.name || ''}
                                            onChange={e => setNewAssetForm({...newAssetForm, name: e.target.value})}
                                            className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Asset ID</label>
                                        <input 
                                            type="text" 
                                            value={newAssetForm.id || ''}
                                            readOnly
                                            className="w-full p-2 border border-slate-200 bg-slate-50 rounded-lg text-slate-500"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">{t('th_category')}</label>
                                    <input 
                                        list="category-options"
                                        type="text"
                                        value={newAssetForm.category || ''}
                                        onChange={e => setNewAssetForm({...newAssetForm, category: e.target.value})}
                                        className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                        placeholder="Select or type new..."
                                    />
                                    <datalist id="category-options">
                                        {uniqueCategories.map(c => <option key={c} value={c} />)}
                                    </datalist>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Model</label>
                                        <input 
                                            type="text" 
                                            value={newAssetForm.model || ''}
                                            onChange={e => setNewAssetForm({...newAssetForm, model: e.target.value})}
                                            className="w-full p-2 border border-slate-300 rounded-lg outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-slate-700 mb-1">Serial Number</label>
                                        <input 
                                            type="text" 
                                            value={newAssetForm.serialNumber || ''}
                                            onChange={e => setNewAssetForm({...newAssetForm, serialNumber: e.target.value})}
                                            className="w-full p-2 border border-slate-300 rounded-lg outline-none"
                                        />
                                    </div>
                                </div>
                                {/* Description Field */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                                    <textarea 
                                        value={newAssetForm.description || ''}
                                        onChange={e => setNewAssetForm({...newAssetForm, description: e.target.value})}
                                        className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none h-20 resize-none"
                                    />
                                </div>
                                
                                {/* Custom Features Section */}
                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <label className="block text-sm font-medium text-slate-700">Custom Features</label>
                                        <button 
                                            type="button" 
                                            onClick={addFeatureRow}
                                            className="text-xs bg-indigo-50 text-indigo-600 px-2 py-1 rounded hover:bg-indigo-100 flex items-center gap-1"
                                        >
                                            <Plus size={12} /> Add
                                        </button>
                                    </div>
                                    <div className="space-y-2 bg-slate-50 p-3 rounded-lg border border-slate-200">
                                        {customFeaturesList.map((feature, index) => (
                                            <div key={index} className="flex gap-2">
                                                <input 
                                                    type="text" 
                                                    placeholder="Key"
                                                    value={feature.key}
                                                    onChange={(e) => handleFeatureChange(index, 'key', e.target.value)}
                                                    className="flex-1 p-2 text-sm border border-slate-300 rounded outline-none"
                                                />
                                                <input 
                                                    type="text" 
                                                    placeholder="Value"
                                                    value={feature.value}
                                                    onChange={(e) => handleFeatureChange(index, 'value', e.target.value)}
                                                    className="flex-1 p-2 text-sm border border-slate-300 rounded outline-none"
                                                />
                                                <button 
                                                    onClick={() => removeFeatureRow(index)}
                                                    className="p-2 text-red-500 hover:bg-red-50 rounded"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        ))}
                                        {customFeaturesList.length === 0 && (
                                            <div className="text-center text-xs text-slate-400 py-2">No custom features.</div>
                                        )}
                                    </div>
                                </div>

                                {/* Status for Admins to manually override */}
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">{t('th_status')}</label>
                                    <select 
                                        value={newAssetForm.status || AssetStatus.AVAILABLE}
                                        onChange={e => setNewAssetForm({...newAssetForm, status: e.target.value as AssetStatus})}
                                        className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                    >
                                        {Object.values(AssetStatus).map(s => <option key={s} value={s}>{t(`status_${s}`)}</option>)}
                                    </select>
                                </div>
                            </div>

                            {/* Visual & QR Side */}
                            <div className="w-full md:w-64 flex flex-col items-center gap-6">
                                {newAssetForm.id ? (
                                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center">
                                        <h3 className="text-sm font-bold text-slate-500 mb-2 flex items-center gap-2">
                                            <QrCode size={16} /> QR Code
                                        </h3>
                                        <img 
                                            src={getQrUrl(newAssetForm.id)} 
                                            alt="Asset QR" 
                                            className="w-40 h-40 object-contain"
                                        />
                                        <p className="text-xs text-center text-slate-400 mt-2 font-mono">{newAssetForm.id}</p>
                                    </div>
                                ) : (
                                    <div className="w-40 h-40 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 text-xs">
                                        Generated after ID
                                    </div>
                                )}
                                
                                <div className="w-full flex flex-col gap-2">
                                    <label className="text-sm font-bold text-slate-500 flex items-center gap-2">
                                        <ImageIcon size={16} /> Image
                                    </label>
                                    <div className="relative group">
                                         <img 
                                            src={newAssetForm.imageUrl || (editingAsset ? editingAsset.imageUrl : 'https://placehold.co/400x300?text=No+Image')} 
                                            alt="Asset" 
                                            className="w-full h-32 object-cover rounded-lg bg-slate-100 border border-slate-200" 
                                         />
                                         <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                                             <button 
                                                onClick={triggerImageUpload}
                                                className="bg-white text-slate-800 px-3 py-1 rounded-full text-xs font-semibold shadow-lg hover:scale-105 transition-transform"
                                             >
                                                Change
                                             </button>
                                         </div>
                                    </div>
                                    <input 
                                        type="file" 
                                        ref={imageInputRef}
                                        accept="image/*"
                                        onChange={handleAssetImageUpload}
                                        className="hidden"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                        <button onClick={() => setIsAssetModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg font-medium">{t('cancel')}</button>
                        <button onClick={saveAsset} className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 flex items-center gap-2">
                            <Save size={18} /> {t('save')}
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* User Modal */}
        {isUserModalOpen && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
                    <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                        <h2 className="text-xl font-bold text-slate-800">
                            {editingUser ? 'Edit User' : t('addUser')}
                        </h2>
                        <button onClick={() => setIsUserModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full">
                            <X size={20} className="text-slate-500" />
                        </button>
                    </div>
                    <div className="p-6 space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Name</label>
                            <input 
                                type="text" 
                                value={newUserForm.name || ''}
                                onChange={e => setNewUserForm({...newUserForm, name: e.target.value})}
                                className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">{t('th_email')}</label>
                            <input 
                                type="email" 
                                value={newUserForm.email || ''}
                                onChange={e => setNewUserForm({...newUserForm, email: e.target.value})}
                                className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">{t('th_role')}</label>
                                <select 
                                    value={newUserForm.role || 'Staff'}
                                    onChange={e => setNewUserForm({...newUserForm, role: e.target.value as UserRole})}
                                    className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                >
                                    <option value="Staff">{t('role_Staff')}</option>
                                    <option value="Admin">{t('role_Admin')}</option>
                                    <option value="Viewer">{t('role_Viewer')}</option>
                                    <option value="Operator">{t('role_Operator')}</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">{t('th_dept')}</label>
                                <input 
                                    type="text" 
                                    value={newUserForm.department || ''}
                                    onChange={e => setNewUserForm({...newUserForm, department: e.target.value})}
                                    className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                />
                            </div>
                        </div>
                        {/* Password field - optional, only if needed */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">{t('password')}</label>
                            <input 
                                type="text" 
                                placeholder={editingUser ? '(Unchanged)' : 'Default: 123 (Admin: 123456)'}
                                value={newUserForm.password || ''}
                                onChange={e => setNewUserForm({...newUserForm, password: e.target.value})}
                                className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                            />
                        </div>
                    </div>
                    <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                        <button onClick={() => setIsUserModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg font-medium">{t('cancel')}</button>
                        <button onClick={saveUser} className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 flex items-center gap-2">
                            <Save size={18} /> {t('save')}
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* Reservation Modal */}
        {isReservationModalOpen && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
                    <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                        <h2 className="text-xl font-bold text-slate-800">New Reservation</h2>
                        <button onClick={() => setIsReservationModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full">
                            <X size={20} className="text-slate-500" />
                        </button>
                    </div>
                    <div className="p-6 space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Asset</label>
                            <select 
                                value={newReservationForm.assetId || ''}
                                onChange={e => setNewReservationForm({...newReservationForm, assetId: e.target.value})}
                                className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                            >
                                <option value="">Select Asset...</option>
                                {assets.map(a => <option key={a.id} value={a.id}>{a.name} ({a.id})</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">User</label>
                            <select 
                                value={newReservationForm.userId || ''}
                                onChange={e => setNewReservationForm({...newReservationForm, userId: e.target.value})}
                                className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                            >
                                <option value="">Select User...</option>
                                {users.map(u => <option key={u.id} value={u.id}>{u.name} ({u.role})</option>)}
                            </select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">Start</label>
                                <input 
                                    type="date" 
                                    value={newReservationForm.startDate || ''}
                                    onChange={e => setNewReservationForm({...newReservationForm, startDate: e.target.value})}
                                    className="w-full p-2 border border-slate-300 rounded-lg outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">End</label>
                                <input 
                                    type="date" 
                                    value={newReservationForm.endDate || ''}
                                    onChange={e => setNewReservationForm({...newReservationForm, endDate: e.target.value})}
                                    className="w-full p-2 border border-slate-300 rounded-lg outline-none"
                                />
                            </div>
                        </div>
                    </div>
                    <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                        <button onClick={() => setIsReservationModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg font-medium">{t('cancel')}</button>
                        <button onClick={saveReservation} className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 flex items-center gap-2">
                            <Save size={18} /> {t('save')}
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* QR Download Confirmation Modal */}
        {isQrConfirmModalOpen && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">
                    <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                        <h2 className="text-lg font-bold text-slate-800">{lang === 'zh' ? '确认下载' : 'Confirm Download'}</h2>
                        {!isGeneratingQr && (
                            <button onClick={() => setIsQrConfirmModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full">
                                <X size={20} className="text-slate-500" />
                            </button>
                        )}
                    </div>
                    <div className="p-6">
                        <div className="flex flex-col items-center justify-center text-center space-y-4">
                            <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600">
                                <QrCode size={24} />
                            </div>
                            <p className="text-slate-600">
                                {lang === 'zh' 
                                  ? `即将生成并下载 ${filteredAssets.length} 个资产的二维码。` 
                                  : `You are about to generate and download QR codes for ${filteredAssets.length} assets.`}
                            </p>
                            <p className="text-xs text-slate-400">
                                {lang === 'zh' ? '这可能需要几秒钟时间。' : 'This might take a few seconds.'}
                            </p>
                        </div>
                    </div>
                    <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                        <button 
                            onClick={() => setIsQrConfirmModalOpen(false)} 
                            disabled={isGeneratingQr}
                            className="px-4 py-2 text-slate-600 hover:bg-slate-200 rounded-lg font-medium disabled:opacity-50"
                        >
                            {t('cancel')}
                        </button>
                        <button 
                            onClick={processDownloadQRs} 
                            disabled={isGeneratingQr}
                            className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 flex items-center gap-2 disabled:bg-indigo-400"
                        >
                            {isGeneratingQr ? (
                                <>
                                    <Loader size={18} className="animate-spin" />
                                    {lang === 'zh' ? '生成中...' : 'Generating...'}
                                </>
                            ) : (
                                <>
                                    <Download size={18} />
                                    {lang === 'zh' ? '确认下载' : 'Download'}
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        )}

      </div>
    </div>
  );
};

export default AdminView;