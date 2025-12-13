// Shared types for the frontend (mirrors backend types)

export type UserRole = 'ENGINEER' | 'ADMIN' | 'MANAGER';

export type AssetCategory = 'ATV' | 'UTV' | 'SEA_SPORT' | 'POOL_TOYS' | 'LINE_SPORT';

export type AssetStatus = 'ACTIVE' | 'MAINTENANCE' | 'RETIRED';

export type MaintenanceType = 'PREVENTIVE' | 'CORRECTIVE';

export type ExpenseCategory = 'OPERATIONAL' | 'PERSONNEL' | 'MARKETING' | 'SPAREPART' | 'SALARY' | 'BUSINESS_TRAVEL' | 'OTHER' | 'SERVICE' | 'TOOLS';

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
  companyName?: string;
  address?: string;
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

export type MaintenanceStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

export interface MaintenanceRecord {
  id: string;
  asset_id: string;
  maintenance_type: 'PREVENTIVE' | 'CORRECTIVE' | 'INSPECTION';
  description: string;
  start_date: string;
  end_date?: string;
  cost: number;
  performed_by?: string;
  status: MaintenanceStatus;
  notes?: string;
  created_at: string;
  updated_at: string;
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
  resort_id?: string;
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
  discount?: number;
  discountPercentage?: number;
  taxService?: number;
  taxServicePercentage?: number;
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

// Tool Management Types
export type ToolCondition = 'good' | 'fair' | 'poor' | 'damaged' | 'lost';
export type ToolCategory = 'Hand Tools' | 'Power Tools' | 'Diagnostic Equipment' | 'Safety Equipment' | 'Measuring Tools' | 'Other';
export type ToolMaintenanceType = 'repair' | 'calibration' | 'cleaning' | 'inspection';

export interface Tool {
  id: string;
  name: string;
  category: ToolCategory;
  brand?: string;
  model?: string;
  serial_number?: string;
  resort_id: string;
  condition: ToolCondition;
  purchase_date: string;
  purchase_price: number;
  supplier?: string;
  warranty_until?: string;
  last_maintenance_date?: string;
  notes?: string;
  image_url?: string;
  created_at: string;
  updated_at: string;
}

export interface ToolMaintenanceHistory {
  id: string;
  tool_id: string;
  maintenance_date: string;
  maintenance_type: ToolMaintenanceType;
  description?: string;
  cost?: number;
  performed_by?: string;
  created_at: string;
}

export interface ToolUsageLog {
  id: string;
  tool_id: string;
  user_id?: string;
  borrowed_at: string;
  returned_at?: string;
  purpose?: string;
  condition_before?: ToolCondition;
  condition_after?: ToolCondition;
  notes?: string;
  created_at: string;
}
