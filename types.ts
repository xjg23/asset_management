export enum AssetStatus {
  AVAILABLE = 'Available',
  BORROWED = 'Borrowed',
  MAINTENANCE = 'Maintenance',
  LOST = 'Lost'
}

export enum TransactionType {
  BORROW = 'Borrow',
  RETURN = 'Return',
  MAINTENANCE_LOG = 'Maintenance'
}

export type UserRole = 'Admin' | 'Staff' | 'Viewer' | 'Operator';

export interface User {
  id: string;
  name: string;
  role: UserRole;
  email: string;
  department?: string;
  password?: string; // For Admin role mainly
}

export interface Asset {
  id: string;
  name: string;
  category: string;
  model: string;
  serialNumber: string;
  purchaseDate: string;
  status: AssetStatus;
  currentHolder?: string; // Name of person holding it
  imageUrl: string;
  qrCode: string; // Mock QR string
  description?: string;
  customFeatures?: Record<string, string>;
}

export interface Transaction {
  id: string;
  assetId: string;
  assetName: string;
  userId: string;
  userName: string;
  type: TransactionType;
  timestamp: number;
  signatureUrl: string; // Base64 signature
  notes?: string;
}

export interface Reservation {
  id: string;
  assetId: string;
  userId: string;
  startDate: string;
  endDate: string;
  status: 'Pending' | 'Confirmed' | 'Cancelled';
}

export interface DashboardStats {
  totalAssets: number;
  borrowedAssets: number;
  availableAssets: number;
  maintenanceAssets: number;
}