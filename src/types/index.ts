// Shared types for the application

export type UserRole = 'ENGINEER' | 'ADMIN' | 'MANAGER';

export type AssetCategory = 'ATV' | 'UTV' | 'SEA_SPORT' | 'POOL_TOYS' | 'LINE_SPORT';

export type AssetStatus = 'ACTIVE' | 'MAINTENANCE' | 'RETIRED';

export type MaintenanceType = 'PREVENTIVE' | 'CORRECTIVE';

export type ExpenseCategory = 'OPERATIONAL' | 'PERSONNEL' | 'MARKETING';

export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export type InvoiceStatus = 'DRAFT' | 'SENT' | 'PAID';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: Date;
  updatedAt: Date;
}

export interface Resort {
  id: string;
  name: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProfitSharingConfig {
  id: string;
  resortId: string;
  assetCategory: AssetCategory;
  dkuPercentage: number;
  resortPercentage: number;
  effectiveFrom: Date;
  createdAt: Date;
}

export interface Asset {
  id: string;
  name: string;
  category: AssetCategory;
  resortId: string;
  purchaseDate: Date;
  purchaseCost: number;
  status: AssetStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface MaintenanceRecord {
  id: string;
  assetId: string;
  type: MaintenanceType;
  description: string;
  startDate: Date;
  endDate?: Date;
  laborCost: number;
  performedBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface SparePart {
  id: string;
  maintenanceRecordId: string;
  partName: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  createdAt: Date;
}

export interface Expense {
  id: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  date: Date;
  submittedBy: string;
  status: ApprovalStatus;
  approvedBy?: string;
  approvalDate?: Date;
  approvalComments?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface BudgetRequest {
  id: string;
  category: ExpenseCategory;
  amount: number;
  justification: string;
  submittedBy: string;
  status: ApprovalStatus;
  approvedBy?: string;
  approvalDate?: Date;
  approvalComments?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface RevenueRecord {
  id: string;
  resortId: string;
  assetCategory: AssetCategory;
  date: Date;
  amount: number;
  recordedBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  resortId: string;
  startDate: Date;
  endDate: Date;
  totalRevenue: number;
  dkuShare: number;
  resortShare: number;
  status: InvoiceStatus;
  generatedBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface InvoiceLineItem {
  id: string;
  invoiceId: string;
  assetCategory: AssetCategory;
  revenue: number;
  dkuPercentage: number;
  resortPercentage: number;
  dkuAmount: number;
  resortAmount: number;
  createdAt: Date;
}

export interface PaymentHistory {
  id: string;
  invoiceId: string;
  paymentDate: Date;
  amount: number;
  paymentMethod?: string;
  notes?: string;
  recordedBy: string;
  createdAt: Date;
}

export interface DashboardSummary {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  profitMargin: number;
  assetUtilization: number;
  averageROI: number;
  pendingApprovalsCount: number;
  pendingInvoicesCount: number;
}
