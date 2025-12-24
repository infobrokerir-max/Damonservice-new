export type Role = 'admin' | 'employee';

export interface User {
  id: string;
  username: string;
  password?: string;
  fullName: string;
  role: Role;
  isActive: boolean;
}

export interface Category {
  id: string;
  name: string;
  isActive: boolean;
}

export interface Device {
  id: string;
  modelName: string;
  categoryId: string;
  isActive: boolean;
  // Sensitive fields
  factoryPriceEUR: number;
  length: number;
  weight: number;
}

export interface GlobalSettings {
  id: string;
  isActive: boolean;
  discountMultiplier: number;
  freightRatePerLengthEUR: number;
  customsNumerator: number;
  customsDenominator: number;
  warrantyRate: number;
  internalCommissionFactor: number;
  companyCostFactor: number;
  profitFactor: number;
}

export interface Project {
  id: string;
  name: string;
  userId: string;
  userFullName?: string; // Added for Admin UI convenience
  createdAt: number;
}

export type InquiryStatus = 'pending' | 'approved' | 'rejected';

export interface InquiryLog {
  id: string;
  userId: string;
  userFullName: string;
  deviceId: string;
  
  // Project Context
  projectId: string;
  projectNameSnapshot: string;

  categoryNameSnapshot: string;
  modelNameSnapshot: string;
  sellPriceEURSnapshot: number;
  timestamp: number;
  status: InquiryStatus;
  adminResponseTime?: number;
}

// NEW: Comments / Notes
export interface Comment {
  id: string;
  projectId: string;
  userId: string;
  userFullName: string;
  role: Role;
  content: string;
  timestamp: number;
  isRead: boolean; // If true, the recipient has seen it
}

// DTOs
export interface SafeDeviceDTO {
  id: string;
  modelName: string;
  categoryName: string;
  categoryId: string;
}

export interface RequestStatusDTO {
  requestId: string;
  deviceId: string;
  projectId: string;
  status: InquiryStatus;
  sellPriceEUR: number | null;
  timestamp: number;
}

export interface ProjectSummaryDTO extends Project {
  unreadCount: number;
  lastActivity: number;
}

// NEW: Price Breakdown for Admin Verification
export interface PriceBreakdown {
  inputs: {
    P: number;
    L: number;
    W: number;
  };
  params: {
    D: number;
    F: number;
    CN: number;
    CD: number;
    WR: number;
    COM: number;
    OFF: number;
    PF: number;
  };
  steps: {
    companyPrice: number;
    shipment: number;
    custom: number;
    warranty: number;
    subtotal: number;
    commission: number;
    office: number;
    sellPrice: number;
  };
}
