import { Asset, AssetStatus, Transaction, TransactionType, User, Reservation } from './types';

// --- TRANSLATIONS ---
export const TRANSLATIONS = {
  zh: {
    appTitle: "资产卫士 AI",
    selectInterface: "请选择您的操作界面。实际生产环境中，系统将自动识别设备类型（移动端小程序 或 桌面管理端）。",
    mobileApp: "微信小程序端",
    mobileDesc: "模拟微信小程序界面。扫码查看资产信息，电子手签完成借用与归还。",
    webAdmin: "网页管理端",
    webDesc: "全功能桌面仪表盘。管理资产台账、用户权限，查看完整流水，并使用AI分析资产利用率。",
    
    // Status
    status_Available: "可用",
    status_Borrowed: "已借出",
    status_Maintenance: "维修中",
    status_Lost: "已丢失",

    // Roles
    role_Admin: "管理员",
    role_Staff: "员工",
    role_Viewer: "访客 (仅查看)",
    role_Operator: "操作员 (借还操作)",

    // Admin View
    dashboard: "数据仪表盘",
    assets: "资产台账",
    users: "用户管理",
    reservations: "预约管理",
    ledger: "流转记录",
    searchPlaceholder: "全局搜索...",
    notifications: "通知消息",
    noNotifications: "暂无新消息",
    aiInsight: "AI 智能洞察引擎",
    aiAnalyzing: "正在分析资产数据...",
    aiGenerate: "生成报告",
    aiPrompt: "点击生成一份基于近期交易日志的综合资产分析报告。",
    totalAssets: "资产总数",
    borrowed: "已借出",
    available: "可用资产",
    maintenance: "维修中",
    statusDist: "资产状态分布",
    categoryStats: "资产类别统计",
    
    // Asset Table
    assetList: "资产列表",
    bulkEdit: "批量编辑",
    importCSV: "导入 CSV",
    export: "导出",
    downloadQR: "下载二维码",
    filter: "筛选",
    clearFilters: "清除筛选",
    addAsset: "新增资产",
    
    // Table Headers
    th_id: "ID",
    th_name: "资产名称",
    th_category: "类别",
    th_status: "状态",
    th_holder: "持有者",
    th_action: "操作",
    
    // Modals
    editAsset: "编辑资产 & 二维码",
    newAsset: "新增资产",
    cancel: "取消",
    save: "保存",
    update: "更新",
    
    // User Mgmt
    userDir: "用户目录",
    addUser: "新增用户",
    th_email: "邮箱",
    th_dept: "部门",
    th_role: "角色",

    // Categories
    cat_Laptop: "笔记本电脑",
    cat_Camera: "相机",
    cat_Drone: "无人机",
    cat_Tablet: "平板电脑",
    cat_Office: "办公设备",
    
    // Mobile
    scanTap: "点击扫码",
    adminLogin: "管理员登录",
    password: "密码",
    enterPassword: "请输入密码",
    enterAdmin: "进入管理后台",
    scanResult: "扫描结果",
    borrow: "借用设备",
    return: "归还设备",
    confirm: "确认",
    signerName: "借用人/归还人姓名",
    signBox: "电子签名区域",
    conditionNotes: "状况备注 (选填)",
    history: "流转记录",
    noHistory: "暂无记录",
    success: "成功",
    
    // Misc
    unknown: "未知",
    general: "通用"
  },
  en: {
    appTitle: "AssetGuard AI",
    selectInterface: "Select your interface. In production, this allows switching between Mobile and Admin views.",
    mobileApp: "Mobile Mini-Program",
    mobileDesc: "Simulates WeChat Mini Program. Scan QR, view details, borrow/return with e-signature.",
    webAdmin: "Web Admin Dashboard",
    webDesc: "Full desktop dashboard. Manage inventory, users, ledgers, and AI analysis.",

    // Status
    status_Available: "Available",
    status_Borrowed: "Borrowed",
    status_Maintenance: "Maintenance",
    status_Lost: "Lost",

    // Roles
    role_Admin: "Admin",
    role_Staff: "Staff",
    role_Viewer: "Viewer",
    role_Operator: "Operator",

    // Admin View
    dashboard: "Dashboard",
    assets: "Asset Registry",
    users: "User Management",
    reservations: "Reservations",
    ledger: "Ledger",
    searchPlaceholder: "Search...",
    notifications: "Notifications",
    noNotifications: "No new notifications",
    aiInsight: "AI Insight Engine",
    aiAnalyzing: "Analyzing...",
    aiGenerate: "Generate Report",
    aiPrompt: "Click to generate an AI analysis of your asset fleet.",
    totalAssets: "Total Assets",
    borrowed: "Borrowed",
    available: "Available",
    maintenance: "Maintenance",
    statusDist: "Status Distribution",
    categoryStats: "Category Statistics",

    // Asset Table
    assetList: "Inventory List",
    bulkEdit: "Bulk Edit",
    importCSV: "Import CSV",
    export: "Export",
    downloadQR: "Download QRs",
    filter: "Filters",
    clearFilters: "Clear Filters",
    addAsset: "Add Asset",

    // Table Headers
    th_id: "ID",
    th_name: "Asset Name",
    th_category: "Category",
    th_status: "Status",
    th_holder: "Holder",
    th_action: "Action",

    // Modals
    editAsset: "Edit Asset & QR",
    newAsset: "New Asset",
    cancel: "Cancel",
    save: "Save",
    update: "Update",

    // User Mgmt
    userDir: "User Directory",
    addUser: "Add User",
    th_email: "Email",
    th_dept: "Department",
    th_role: "Role",

    // Categories
    cat_Laptop: "Laptop",
    cat_Camera: "Camera",
    cat_Drone: "Drone",
    cat_Tablet: "Tablet",
    cat_Office: "Office",

    // Mobile
    scanTap: "Tap to Scan",
    adminLogin: "Admin Login",
    password: "Password",
    enterPassword: "Enter Password",
    enterAdmin: "Enter Dashboard",
    scanResult: "Scan Result",
    borrow: "Borrow Device",
    return: "Return Device",
    confirm: "Confirm",
    signerName: "Name",
    signBox: "Signature Area",
    conditionNotes: "Condition Notes (Optional)",
    history: "History",
    noHistory: "No History",
    success: "Success",

    // Misc
    unknown: "Unknown",
    general: "General"
  }
};

export const MOCK_USERS: User[] = [
  {
    id: 'U001',
    name: 'Alice Chen',
    role: 'Staff',
    email: 'alice.c@company.com',
    department: 'Design',
    password: '123'
  },
  {
    id: 'U002',
    name: 'Bob Smith',
    role: 'Operator',
    email: 'bob.s@company.com',
    department: 'Engineering',
    password: '123'
  },
  {
    id: 'U003',
    name: 'Carol Admin',
    role: 'Admin',
    email: 'carol.d@company.com',
    department: 'IT Support',
    password: '123456'
  },
  {
    id: 'U004',
    name: 'David View',
    role: 'Viewer',
    email: 'david.v@company.com',
    department: 'Audit',
    password: '123'
  }
];

export const MOCK_ASSETS: Asset[] = [
  {
    id: 'AST-001',
    name: 'MacBook Pro 16"',
    category: 'Laptop',
    model: 'M3 Max',
    serialNumber: 'FVFX1234K9',
    purchaseDate: '2024-01-15',
    status: AssetStatus.AVAILABLE,
    imageUrl: 'https://picsum.photos/400/300?random=1',
    qrCode: 'qr-ast-001',
    description: 'High performance laptop.',
    customFeatures: { "Color": "Space Gray", "RAM": "64GB" }
  },
  {
    id: 'AST-002',
    name: 'Sony Alpha a7 IV',
    category: 'Camera',
    model: 'ILCE-7M4',
    serialNumber: 'SNY887221',
    purchaseDate: '2023-11-20',
    status: AssetStatus.BORROWED,
    currentHolder: 'Alice Chen',
    imageUrl: 'https://picsum.photos/400/300?random=2',
    qrCode: 'qr-ast-002',
    description: 'Full frame mirrorless.',
    customFeatures: { "Lens": "24-70mm GM", "Warranty": "Extended" }
  },
  {
    id: 'AST-003',
    name: 'DJI Mavic 3 Pro',
    category: 'Drone',
    model: 'Mavic 3',
    serialNumber: 'DJI998877',
    purchaseDate: '2024-02-10',
    status: AssetStatus.MAINTENANCE,
    imageUrl: 'https://picsum.photos/400/300?random=3',
    qrCode: 'qr-ast-003',
    description: 'Triple camera drone.'
  },
  {
    id: 'AST-004',
    name: 'Projector 4K',
    category: 'Office',
    model: 'Epson Pro',
    serialNumber: 'EPS445566',
    purchaseDate: '2023-05-05',
    status: AssetStatus.AVAILABLE,
    imageUrl: 'https://picsum.photos/400/300?random=4',
    qrCode: 'qr-ast-004',
    description: 'Main meeting room projector.',
    customFeatures: { "Resolution": "4K", "Mount": "Ceiling" }
  },
  {
    id: 'AST-005',
    name: 'iPad Pro 12.9"',
    category: 'Tablet',
    model: '6th Gen',
    serialNumber: 'APP998811',
    purchaseDate: '2024-03-01',
    status: AssetStatus.AVAILABLE,
    imageUrl: 'https://picsum.photos/400/300?random=5',
    qrCode: 'qr-ast-005',
    description: 'Design tablet.',
    customFeatures: { "Storage": "1TB", "Connectivity": "5G + Wi-Fi" }
  }
];

export const MOCK_TRANSACTIONS: Transaction[] = [
  {
    id: 'TX-1001',
    assetId: 'AST-002',
    assetName: 'Sony Alpha a7 IV',
    userId: 'U001',
    userName: 'Alice Chen',
    type: TransactionType.BORROW,
    timestamp: Date.now() - 86400000 * 2,
    signatureUrl: '',
    notes: 'Project photoshoot'
  },
  {
    id: 'TX-1002',
    assetId: 'AST-003',
    assetName: 'DJI Mavic 3 Pro',
    userId: 'U002',
    userName: 'Bob Smith',
    type: TransactionType.MAINTENANCE_LOG,
    timestamp: Date.now() - 86400000 * 5,
    signatureUrl: '',
    notes: 'Propeller check'
  }
];

export const MOCK_RESERVATIONS: Reservation[] = [
  {
    id: 'RES-001',
    assetId: 'AST-004',
    userId: 'U001',
    startDate: '2024-06-01',
    endDate: '2024-06-03',
    status: 'Confirmed'
  }
];