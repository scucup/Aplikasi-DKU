// Shared types for the frontend (mirrors backend types)

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
  createdAt: string;
  updatedAt: string;
}

export interface Resort {
  id: string;
  name: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProfitSharingConfig {
  id: string;
  resortId: string;
  assetCategory: AssetCategory;
  dkuPercentage: number;
  resortPercentage: number;
  effectiveFrom: string;
  createdAt: string;
}

export interface Asset {
  id: string;
  name: string;
  category: AssetCategory;
  resortId: string;
  purchaseDate: string;
  purchaseCost: number;
  status: AssetStatus;
  createdAt: string;
  updatedAt: string;
}

export interface MaintenanceRecord {
  id: string;
  assetId: string;
  type: MaintenanceType;
  description: string;
  startDate: string;
  endDate?: string;
  laborCost: number;
  performedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface SparePart {
  id: string;
  maintenanceRecordId: string;
  partName: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  createdAt: string;
}

export interface Expense {
  id: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  date: string;
  submittedBy: string;
  status: ApprovalStatus;
  approvedBy?: string;
  approvalDate?: string;
  approvalComments?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BudgetRequest {
  id: string;
  category: ExpenseCategory;
  amount: number;
  justification: string;
  submittedBy: string;
  status: ApprovalStatus;
  approvedBy?: string;
  approvalDate?: string;
  approvalComments?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RevenueRecord {
  id: string;
  resortId: string;
  assetCategory: AssetCategory;
  date: string;
  amount: number;
  recordedBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  resortId: string;
  startDate: string;
  endDate: string;
  totalRevenue: number;
  dkuShare: number;
  resortShare: number;
  status: InvoiceStatus;
  generatedBy: string;
  createdAt: string;
  updatedAt: string;
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
  createdAt: string;
}

export interface PaymentHistory {
  id: string;
  invoiceId: string;
  paymentDate: string;
  amount: number;
  paymentMethod?: string;
  notes?: string;
  recordedBy: string;
  createdAt: string;
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
