# Design Document: DKU Adventure Rental Management System

## Overview

The DKU Adventure Rental Management System is a full-stack web application built to manage outdoor equipment rental operations across multiple resort partnerships. The system provides comprehensive tracking of assets, maintenance, expenses, and revenue with automated profit-sharing calculations and invoice generation.

The application follows a three-tier architecture with a React-based frontend, Node.js/Express backend API, and PostgreSQL database. The system implements role-based access control (RBAC) for three user types: Engineers, Admins, and Managers, each with specific permissions and workflows.

## Architecture

### System Architecture

The application uses a modern web architecture with clear separation of concerns:

```
┌─────────────────────────────────────────────────────────┐
│                    Client Layer                          │
│  React SPA + TailwindCSS + React Router + Zustand       │
│  (Mobile Responsive, Role-based UI)                     │
└────────────────────┬────────────────────────────────────┘
                     │ HTTPS/REST API
┌────────────────────▼────────────────────────────────────┐
│                  API Layer                               │
│  Node.js + Express + JWT Auth + Role Middleware         │
│  (Business Logic, Validation, Authorization)            │
└────────────────────┬────────────────────────────────────┘
                     │ SQL Queries
┌────────────────────▼────────────────────────────────────┐
│                 Data Layer                               │
│  PostgreSQL + Prisma ORM                                │
│  (Relational Data, Transactions, Constraints)           │
└─────────────────────────────────────────────────────────┘
```

### Technology Stack

**Frontend:**
- React 18 with TypeScript for type safety
- TailwindCSS for responsive UI styling
- React Router for client-side routing
- Zustand for state management
- Recharts for dashboard visualizations
- React-PDF for invoice generation
- Axios for API communication

**Backend:**
- Node.js with Express framework
- TypeScript for type safety
- Prisma ORM for database access
- JWT for authentication
- bcrypt for password hashing
- express-validator for input validation
- PDFKit for server-side PDF generation

**Database:**
- PostgreSQL 14+ for relational data storage
- Prisma migrations for schema management

**Deployment:**
- Docker containers for consistent environments
- Nginx as reverse proxy
- PM2 for Node.js process management

## Components and Interfaces

### Frontend Components

**Authentication Module:**
- `LoginPage`: User authentication interface
- `AuthProvider`: Context provider for authentication state
- `ProtectedRoute`: Route wrapper for role-based access control

**Asset Management Module:**
- `AssetRegistrationForm`: Form for registering new assets
- `AssetList`: Paginated list of all assets with filters
- `AssetDetailView`: Detailed view showing costs, ROI, and lifecycle
- `AssetPerformanceChart`: Visualization of asset utilization and ROI

**Maintenance Module:**
- `MaintenanceForm`: Form for recording maintenance activities
- `MaintenanceHistory`: Timeline view of maintenance records
- `SparePartUsageForm`: Form for recording spare part consumption
- `DowntimeTracker`: Component showing asset availability

**Expense Module:**
- `ExpenseForm`: Form for submitting expenses
- `ExpenseList`: List with category filters and approval status
- `ApprovalQueue`: Manager view of pending approvals
- `BudgetRequestForm`: Form for submitting budget requests

**Revenue Module:**
- `RevenueEntryForm`: Daily revenue input form per resort
- `ProfitSharingCalculator`: Real-time profit sharing calculation display
- `RevenueReport`: Pre and post-sharing revenue reports

**Invoice Module:**
- `InvoiceGenerator`: Interface for creating invoices
- `InvoiceList`: List of all invoices with status filters
- `InvoicePreview`: Preview before PDF generation
- `InvoicePDF`: PDF template component
- `PaymentRecorder`: Form for recording payments

**Resort Module:**
- `ResortForm`: Form for adding/editing resort partners
- `ResortList`: List of all resort partners
- `ProfitSharingConfig`: Interface for configuring profit sharing rules
- `ResortPerformanceView`: Performance metrics per resort

**Dashboard Module:**
- `ManagerDashboard`: Executive overview with KPIs
- `RevenueChart`: Revenue trends visualization
- `ExpenseChart`: Expense breakdown visualization
- `AssetUtilizationWidget`: Asset utilization metrics
- `PendingApprovalsWidget`: Quick view of pending items
- `FinancialHealthIndicators`: Key financial ratios

**Reporting Module:**
- `ReportGenerator`: Interface for selecting report type and parameters
- `ExcelExporter`: Component for generating Excel files
- `PDFExporter`: Component for generating PDF reports

### Backend API Endpoints

**Authentication API (`/api/auth`):**
- `POST /login`: Authenticate user and return JWT token
- `POST /logout`: Invalidate user session
- `GET /me`: Get current user profile and role

**Asset API (`/api/assets`):**
- `POST /`: Create new asset (Manager only)
- `GET /`: List all assets with pagination and filters
- `GET /:id`: Get asset details with cost breakdown
- `PUT /:id`: Update asset information (Manager only)
- `DELETE /:id`: Soft delete asset (Manager only)
- `GET /:id/roi`: Calculate and return ROI for specific asset
- `GET /:id/lifecycle`: Get lifecycle prediction for asset

**Maintenance API (`/api/maintenance`):**
- `POST /`: Create maintenance record (Engineer, Admin, Manager)
- `GET /`: List maintenance records with filters
- `GET /:id`: Get maintenance record details
- `PUT /:id`: Update maintenance record
- `POST /:id/spare-parts`: Add spare parts to maintenance record
- `GET /asset/:assetId`: Get maintenance history for specific asset

**Expense API (`/api/expenses`):**
- `POST /`: Create expense entry (Admin, Manager)
- `GET /`: List expenses with category and status filters
- `GET /:id`: Get expense details
- `PUT /:id`: Update expense (Admin, Manager)
- `POST /:id/approve`: Approve expense (Manager only)
- `POST /:id/reject`: Reject expense (Manager only)

**Budget Request API (`/api/budget-requests`):**
- `POST /`: Create budget request (Admin)
- `GET /`: List budget requests
- `GET /:id`: Get budget request details
- `POST /:id/approve`: Approve budget request (Manager only)
- `POST /:id/reject`: Reject budget request (Manager only)

**Revenue API (`/api/revenue`):**
- `POST /`: Record daily revenue (Admin, Manager)
- `GET /`: List revenue records with filters
- `GET /:id`: Get revenue record details
- `PUT /:id`: Update revenue record (Admin, Manager)
- `GET /profit-sharing`: Calculate profit sharing for date range
- `GET /reports/pre-sharing`: Generate pre-sharing report
- `GET /reports/post-sharing`: Generate post-sharing report

**Invoice API (`/api/invoices`):**
- `POST /generate`: Generate invoice for resort and date range (Admin, Manager)
- `GET /`: List all invoices with status filters
- `GET /:id`: Get invoice details
- `PUT /:id/status`: Update invoice status (Admin, Manager)
- `POST /:id/payment`: Record payment (Admin, Manager)
- `GET /:id/pdf`: Generate and download invoice PDF
- `GET /next-number`: Get next sequential invoice number

**Resort API (`/api/resorts`):**
- `POST /`: Create resort partner (Manager only)
- `GET /`: List all resort partners
- `GET /:id`: Get resort details
- `PUT /:id`: Update resort information (Manager only)
- `PUT /:id/profit-sharing`: Update profit sharing configuration (Manager only)
- `GET /:id/performance`: Get performance metrics for resort

**Dashboard API (`/api/dashboard`):**
- `GET /summary`: Get executive summary (revenue, expenses, profit)
- `GET /asset-performance`: Get asset utilization and ROI metrics
- `GET /pending-approvals`: Get count and list of pending approvals
- `GET /pending-invoices`: Get count and list of pending invoices
- `GET /financial-health`: Get financial health indicators

**Export API (`/api/export`):**
- `POST /excel`: Generate Excel export for specified data
- `POST /pdf`: Generate PDF report for specified data

### Database Schema

**Users Table:**
```sql
users (
  id: UUID PRIMARY KEY,
  email: VARCHAR(255) UNIQUE NOT NULL,
  password_hash: VARCHAR(255) NOT NULL,
  name: VARCHAR(255) NOT NULL,
  role: ENUM('ENGINEER', 'ADMIN', 'MANAGER') NOT NULL,
  created_at: TIMESTAMP DEFAULT NOW(),
  updated_at: TIMESTAMP DEFAULT NOW()
)
```

**Resorts Table:**
```sql
resorts (
  id: UUID PRIMARY KEY,
  name: VARCHAR(255) NOT NULL,
  contact_name: VARCHAR(255),
  contact_email: VARCHAR(255),
  contact_phone: VARCHAR(50),
  created_at: TIMESTAMP DEFAULT NOW(),
  updated_at: TIMESTAMP DEFAULT NOW()
)
```

**Profit Sharing Config Table:**
```sql
profit_sharing_configs (
  id: UUID PRIMARY KEY,
  resort_id: UUID REFERENCES resorts(id),
  asset_category: ENUM('ATV', 'UTV', 'SEA_SPORT', 'POOL_TOYS', 'LINE_SPORT') NOT NULL,
  dku_percentage: DECIMAL(5,2) NOT NULL,
  resort_percentage: DECIMAL(5,2) NOT NULL,
  effective_from: DATE NOT NULL,
  created_at: TIMESTAMP DEFAULT NOW(),
  UNIQUE(resort_id, asset_category, effective_from)
)
```

**Assets Table:**
```sql
assets (
  id: UUID PRIMARY KEY,
  name: VARCHAR(255) NOT NULL,
  category: ENUM('ATV', 'UTV', 'SEA_SPORT', 'POOL_TOYS', 'LINE_SPORT') NOT NULL,
  resort_id: UUID REFERENCES resorts(id),
  purchase_date: DATE NOT NULL,
  purchase_cost: DECIMAL(15,2) NOT NULL,
  status: ENUM('ACTIVE', 'MAINTENANCE', 'RETIRED') DEFAULT 'ACTIVE',
  created_at: TIMESTAMP DEFAULT NOW(),
  updated_at: TIMESTAMP DEFAULT NOW()
)
```

**Maintenance Records Table:**
```sql
maintenance_records (
  id: UUID PRIMARY KEY,
  asset_id: UUID REFERENCES assets(id),
  type: ENUM('PREVENTIVE', 'CORRECTIVE') NOT NULL,
  description: TEXT NOT NULL,
  start_date: TIMESTAMP NOT NULL,
  end_date: TIMESTAMP,
  labor_cost: DECIMAL(15,2) DEFAULT 0,
  performed_by: UUID REFERENCES users(id),
  created_at: TIMESTAMP DEFAULT NOW(),
  updated_at: TIMESTAMP DEFAULT NOW()
)
```

**Spare Parts Table:**
```sql
spare_parts (
  id: UUID PRIMARY KEY,
  maintenance_record_id: UUID REFERENCES maintenance_records(id),
  part_name: VARCHAR(255) NOT NULL,
  quantity: INTEGER NOT NULL,
  unit_cost: DECIMAL(15,2) NOT NULL,
  total_cost: DECIMAL(15,2) GENERATED ALWAYS AS (quantity * unit_cost) STORED,
  created_at: TIMESTAMP DEFAULT NOW()
)
```

**Expenses Table:**
```sql
expenses (
  id: UUID PRIMARY KEY,
  category: ENUM('OPERATIONAL', 'PERSONNEL', 'MARKETING') NOT NULL,
  description: TEXT NOT NULL,
  amount: DECIMAL(15,2) NOT NULL,
  date: DATE NOT NULL,
  submitted_by: UUID REFERENCES users(id),
  status: ENUM('PENDING', 'APPROVED', 'REJECTED') DEFAULT 'PENDING',
  approved_by: UUID REFERENCES users(id),
  approval_date: TIMESTAMP,
  approval_comments: TEXT,
  created_at: TIMESTAMP DEFAULT NOW(),
  updated_at: TIMESTAMP DEFAULT NOW()
)
```

**Budget Requests Table:**
```sql
budget_requests (
  id: UUID PRIMARY KEY,
  category: ENUM('OPERATIONAL', 'PERSONNEL', 'MARKETING') NOT NULL,
  amount: DECIMAL(15,2) NOT NULL,
  justification: TEXT NOT NULL,
  submitted_by: UUID REFERENCES users(id),
  status: ENUM('PENDING', 'APPROVED', 'REJECTED') DEFAULT 'PENDING',
  approved_by: UUID REFERENCES users(id),
  approval_date: TIMESTAMP,
  approval_comments: TEXT,
  created_at: TIMESTAMP DEFAULT NOW(),
  updated_at: TIMESTAMP DEFAULT NOW()
)
```

**Revenue Records Table:**
```sql
revenue_records (
  id: UUID PRIMARY KEY,
  resort_id: UUID REFERENCES resorts(id),
  asset_category: ENUM('ATV', 'UTV', 'SEA_SPORT', 'POOL_TOYS', 'LINE_SPORT') NOT NULL,
  date: DATE NOT NULL,
  amount: DECIMAL(15,2) NOT NULL,
  recorded_by: UUID REFERENCES users(id),
  created_at: TIMESTAMP DEFAULT NOW(),
  updated_at: TIMESTAMP DEFAULT NOW(),
  UNIQUE(resort_id, asset_category, date)
)
```

**Invoices Table:**
```sql
invoices (
  id: UUID PRIMARY KEY,
  invoice_number: VARCHAR(50) UNIQUE NOT NULL,
  resort_id: UUID REFERENCES resorts(id),
  start_date: DATE NOT NULL,
  end_date: DATE NOT NULL,
  total_revenue: DECIMAL(15,2) NOT NULL,
  dku_share: DECIMAL(15,2) NOT NULL,
  resort_share: DECIMAL(15,2) NOT NULL,
  status: ENUM('DRAFT', 'SENT', 'PAID') DEFAULT 'DRAFT',
  generated_by: UUID REFERENCES users(id),
  created_at: TIMESTAMP DEFAULT NOW(),
  updated_at: TIMESTAMP DEFAULT NOW()
)
```

**Invoice Line Items Table:**
```sql
invoice_line_items (
  id: UUID PRIMARY KEY,
  invoice_id: UUID REFERENCES invoices(id),
  asset_category: ENUM('ATV', 'UTV', 'SEA_SPORT', 'POOL_TOYS', 'LINE_SPORT') NOT NULL,
  revenue: DECIMAL(15,2) NOT NULL,
  dku_percentage: DECIMAL(5,2) NOT NULL,
  resort_percentage: DECIMAL(5,2) NOT NULL,
  dku_amount: DECIMAL(15,2) NOT NULL,
  resort_amount: DECIMAL(15,2) NOT NULL,
  created_at: TIMESTAMP DEFAULT NOW()
)
```

**Payment History Table:**
```sql
payment_history (
  id: UUID PRIMARY KEY,
  invoice_id: UUID REFERENCES invoices(id),
  payment_date: DATE NOT NULL,
  amount: DECIMAL(15,2) NOT NULL,
  payment_method: VARCHAR(100),
  notes: TEXT,
  recorded_by: UUID REFERENCES users(id),
  created_at: TIMESTAMP DEFAULT NOW()
)
```

## Data Models

### TypeScript Interfaces

**User Model:**
```typescript
interface User {
  id: string;
  email: string;
  name: string;
  role: 'ENGINEER' | 'ADMIN' | 'MANAGER';
  createdAt: Date;
  updatedAt: Date;
}
```

**Resort Model:**
```typescript
interface Resort {
  id: string;
  name: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  profitSharingConfigs: ProfitSharingConfig[];
  createdAt: Date;
  updatedAt: Date;
}
```

**Profit Sharing Config Model:**
```typescript
interface ProfitSharingConfig {
  id: string;
  resortId: string;
  assetCategory: AssetCategory;
  dkuPercentage: number;
  resortPercentage: number;
  effectiveFrom: Date;
  createdAt: Date;
}
```

**Asset Model:**
```typescript
interface Asset {
  id: string;
  name: string;
  category: AssetCategory;
  resortId: string;
  resort?: Resort;
  purchaseDate: Date;
  purchaseCost: number;
  status: 'ACTIVE' | 'MAINTENANCE' | 'RETIRED';
  totalMaintenanceCost?: number;
  totalRevenue?: number;
  roi?: number;
  createdAt: Date;
  updatedAt: Date;
}

type AssetCategory = 'ATV' | 'UTV' | 'SEA_SPORT' | 'POOL_TOYS' | 'LINE_SPORT';
```

**Maintenance Record Model:**
```typescript
interface MaintenanceRecord {
  id: string;
  assetId: string;
  asset?: Asset;
  type: 'PREVENTIVE' | 'CORRECTIVE';
  description: string;
  startDate: Date;
  endDate?: Date;
  laborCost: number;
  performedBy: string;
  performer?: User;
  spareParts: SparePart[];
  totalCost?: number;
  downtimeHours?: number;
  createdAt: Date;
  updatedAt: Date;
}
```

**Spare Part Model:**
```typescript
interface SparePart {
  id: string;
  maintenanceRecordId: string;
  partName: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  createdAt: Date;
}
```

**Expense Model:**
```typescript
interface Expense {
  id: string;
  category: 'OPERATIONAL' | 'PERSONNEL' | 'MARKETING';
  description: string;
  amount: number;
  date: Date;
  submittedBy: string;
  submitter?: User;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  approvedBy?: string;
  approver?: User;
  approvalDate?: Date;
  approvalComments?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

**Budget Request Model:**
```typescript
interface BudgetRequest {
  id: string;
  category: 'OPERATIONAL' | 'PERSONNEL' | 'MARKETING';
  amount: number;
  justification: string;
  submittedBy: string;
  submitter?: User;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  approvedBy?: string;
  approver?: User;
  approvalDate?: Date;
  approvalComments?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

**Revenue Record Model:**
```typescript
interface RevenueRecord {
  id: string;
  resortId: string;
  resort?: Resort;
  assetCategory: AssetCategory;
  date: Date;
  amount: number;
  recordedBy: string;
  recorder?: User;
  createdAt: Date;
  updatedAt: Date;
}
```

**Invoice Model:**
```typescript
interface Invoice {
  id: string;
  invoiceNumber: string;
  resortId: string;
  resort?: Resort;
  startDate: Date;
  endDate: Date;
  totalRevenue: number;
  dkuShare: number;
  resortShare: number;
  status: 'DRAFT' | 'SENT' | 'PAID';
  generatedBy: string;
  generator?: User;
  lineItems: InvoiceLineItem[];
  payments: PaymentHistory[];
  createdAt: Date;
  updatedAt: Date;
}
```

**Invoice Line Item Model:**
```typescript
interface InvoiceLineItem {
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
```

**Payment History Model:**
```typescript
interface PaymentHistory {
  id: string;
  invoiceId: string;
  paymentDate: Date;
  amount: number;
  paymentMethod?: string;
  notes?: string;
  recordedBy: string;
  recorder?: User;
  createdAt: Date;
}
```

**Dashboard Summary Model:**
```typescript
interface DashboardSummary {
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  profitMargin: number;
  assetUtilization: number;
  averageROI: number;
  pendingApprovalsCount: number;
  pendingInvoicesCount: number;
}
```


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Authentication and Authorization Properties

**Property 1: Valid credentials authenticate successfully**
*For any* valid user credentials, authentication should succeed and return the user's assigned role.
**Validates: Requirements 1.1**

**Property 2: Unauthorized access is denied**
*For any* user and any endpoint outside their role permissions, the system should deny access and return an authorization error.
**Validates: Requirements 1.5**

### Asset Management Properties

**Property 3: Asset creation preserves all fields**
*For any* valid asset registration data, creating an asset should result in a record containing all submitted fields (name, category, resort, purchase date, purchase cost).
**Validates: Requirements 2.1**

**Property 4: Cost accumulation is additive**
*For any* asset and any sequence of costs added (maintenance, spare parts, operational), the total cost should equal the sum of all individual costs.
**Validates: Requirements 2.2**

**Property 5: ROI calculation correctness**
*For any* asset with total revenue R and total costs C, the ROI should equal (R - C) / C when C > 0.
**Validates: Requirements 2.3**

### Maintenance Tracking Properties

**Property 6: Maintenance record creation links to asset**
*For any* valid maintenance data, creating a maintenance record should link it to the specified asset and categorize it correctly as preventive or corrective.
**Validates: Requirements 3.1**

**Property 7: Spare part costs aggregate correctly**
*For any* maintenance record with spare parts, the total spare part cost should equal the sum of (quantity × unit_cost) for all parts.
**Validates: Requirements 3.2**

**Property 8: Downtime calculation accuracy**
*For any* completed maintenance record with start_date and end_date, the downtime should equal end_date - start_date.
**Validates: Requirements 3.3**

**Property 9: Maintenance history completeness**
*For any* asset, querying its maintenance history should return all maintenance records associated with that asset.
**Validates: Requirements 3.4**

**Property 10: Maintenance costs propagate to asset**
*For any* asset, when a maintenance record is added with cost M, the asset's total cost should increase by M.
**Validates: Requirements 3.5**

### Expense Management Properties

**Property 11: Expense creation with category**
*For any* valid expense data, creating an expense should result in a record with the specified category (operational, personnel, or marketing).
**Validates: Requirements 4.1**

**Property 12: New expenses require approval**
*For any* newly created expense, its initial status should be 'PENDING'.
**Validates: Requirements 4.2**

**Property 13: Approval actions change status**
*For any* pending expense, when a manager approves it, the status should change to 'APPROVED'; when rejected, the status should change to 'REJECTED'.
**Validates: Requirements 4.3, 4.4**

**Property 14: Expense filtering by category**
*For any* category filter, querying expenses should return only expenses matching that category.
**Validates: Requirements 4.5**

### Revenue and Profit Sharing Properties

**Property 15: Revenue record creation completeness**
*For any* valid revenue data, creating a revenue record should capture all fields: amount, date, resort, and asset category.
**Validates: Requirements 5.1**

**Property 16: Profit sharing calculation accuracy**
*For any* revenue record with amount A and profit sharing configuration with DKU percentage D and resort percentage R, the DKU share should equal A × (D/100) and resort share should equal A × (R/100), where D + R = 100.
**Validates: Requirements 5.2, 5.3**

**Property 17: Profit sharing temporal consistency**
*For any* profit sharing configuration change at date T, revenue records before T should use old ratios and revenue records after T should use new ratios.
**Validates: Requirements 5.4, 7.5**

**Property 18: Profit sharing report accuracy**
*For any* set of revenue records, the total pre-sharing revenue should equal the sum of all revenue amounts, and post-sharing amounts should equal the sum of calculated shares.
**Validates: Requirements 5.5**

### Invoice Generation Properties

**Property 19: Invoice includes all revenue in range**
*For any* resort and date range [start, end], generating an invoice should include all revenue records for that resort where date is between start and end inclusive.
**Validates: Requirements 6.1**

**Property 20: Invoice numbers are unique and sequential**
*For any* two invoices created at different times, the later invoice should have a higher invoice number than the earlier one, and no two invoices should have the same number.
**Validates: Requirements 6.2**

**Property 21: Invoice line items completeness**
*For any* invoice, it should contain line items for each asset category that has revenue in the invoice date range.
**Validates: Requirements 6.3**

**Property 22: Invoice PDF contains data**
*For any* invoice, the generated PDF should contain the invoice number, resort name, date range, and all line item amounts.
**Validates: Requirements 6.4**

**Property 23: Invoice status transitions are valid**
*For any* invoice, status transitions should follow the sequence: DRAFT → SENT → PAID, and no other transitions should be allowed.
**Validates: Requirements 6.5**

**Property 24: Payment recording updates status**
*For any* invoice with status SENT, when a payment is recorded, the status should change to PAID and a payment history record should be created.
**Validates: Requirements 6.6**

### Resort Management Properties

**Property 25: Resort creation preserves fields**
*For any* valid resort data, creating a resort should result in a record containing all submitted fields (name, contact information).
**Validates: Requirements 7.1**

**Property 26: Profit sharing configuration per category**
*For any* resort and asset category, a manager should be able to set and retrieve profit sharing percentages specific to that combination.
**Validates: Requirements 7.2**

**Property 27: Resort performance calculation**
*For any* resort, the performance metrics should be calculated as: total revenue = sum of all revenue records, profit sharing = sum of calculated shares, utilization = (active assets / total assets) × 100.
**Validates: Requirements 7.3**

**Property 28: New resorts are immediately available**
*For any* newly created resort, it should immediately appear in resort selection lists for asset assignment and revenue recording.
**Validates: Requirements 7.4**

### Dashboard Properties

**Property 29: Dashboard summary calculations**
*For any* point in time, the dashboard should display: total revenue = sum of all revenue records, total expenses = sum of all approved expenses, net profit = total revenue - total expenses.
**Validates: Requirements 8.1**

**Property 30: Asset performance aggregation**
*For any* set of assets, overall utilization should equal (sum of individual utilizations) / (number of assets), and average ROI should equal (sum of individual ROIs) / (number of assets).
**Validates: Requirements 8.2**

**Property 31: Pending items filtering**
*For any* dashboard view, pending approvals count should equal the number of expenses with status 'PENDING', and pending invoices count should equal the number of invoices with status 'DRAFT' or 'SENT'.
**Validates: Requirements 8.3, 8.4**

**Property 32: Financial ratios correctness**
*For any* financial data, profit margin should equal (net profit / total revenue) × 100, and expense-to-revenue ratio should equal (total expenses / total revenue) × 100.
**Validates: Requirements 8.5**

### Export Properties

**Property 33: Excel export contains data**
*For any* data export request, the generated Excel file should contain all records matching the export criteria with proper column headers.
**Validates: Requirements 9.2**

**Property 34: PDF export contains data**
*For any* data export request, the generated PDF should contain all records matching the export criteria in formatted tables.
**Validates: Requirements 9.3**

**Property 35: Asset export completeness**
*For any* asset export, the output should include the asset details, all maintenance records, all associated costs, and calculated ROI.
**Validates: Requirements 9.4**

**Property 36: Financial export completeness**
*For any* financial report export, the output should include all revenue records, all expense records, profit sharing calculations, and period totals.
**Validates: Requirements 9.5**

### Budget Request Properties

**Property 37: Budget request creation completeness**
*For any* valid budget request data, creating a budget request should capture all fields: amount, category, justification, and submission date.
**Validates: Requirements 11.1**

**Property 38: New budget requests require approval**
*For any* newly created budget request, its initial status should be 'PENDING'.
**Validates: Requirements 11.2**

**Property 39: Budget request approval actions**
*For any* pending budget request, when a manager approves it, the status should change to 'APPROVED'; when rejected, the status should change to 'REJECTED'.
**Validates: Requirements 11.3, 11.4**

**Property 40: Budget request retrieval completeness**
*For any* query for budget requests, all budget requests should be returned with their status, amounts, and approval history.
**Validates: Requirements 11.5**

### Asset Analytics Properties

**Property 41: Asset detail calculations**
*For any* asset, the displayed total revenue should equal the sum of all revenue for that asset's category at its resort, total costs should equal purchase cost plus all maintenance costs, and ROI should be calculated as (total revenue - total costs) / total costs.
**Validates: Requirements 12.1**

**Property 42: Asset ranking consistency**
*For any* set of assets sorted by a metric (utilization, ROI, or profitability), each asset should have a value greater than or equal to the next asset in the sorted list.
**Validates: Requirements 12.3**

**Property 43: Negative ROI flagging**
*For any* asset with ROI < 0, the system should flag it as requiring manager review.
**Validates: Requirements 12.4**

**Property 44: Category aggregation correctness**
*For any* asset category, the aggregated metrics should equal: total revenue = sum of revenue for all assets in category, average ROI = sum of ROIs / count of assets, utilization = (active assets in category / total assets in category) × 100.
**Validates: Requirements 12.5**

## Error Handling

### Authentication Errors
- Invalid credentials: Return 401 Unauthorized with clear error message
- Expired JWT token: Return 401 Unauthorized and prompt re-login
- Missing authentication: Return 401 Unauthorized

### Authorization Errors
- Insufficient permissions: Return 403 Forbidden with role requirement message
- Invalid role: Return 403 Forbidden

### Validation Errors
- Missing required fields: Return 400 Bad Request with list of missing fields
- Invalid data types: Return 400 Bad Request with field-specific error messages
- Invalid enum values: Return 400 Bad Request with list of valid options
- Date range errors: Return 400 Bad Request when end date is before start date
- Negative amounts: Return 400 Bad Request for financial fields

### Business Logic Errors
- Duplicate revenue record: Return 409 Conflict when trying to create revenue for same resort/category/date
- Invalid status transition: Return 400 Bad Request when attempting invalid invoice status change
- Asset not found: Return 404 Not Found with asset ID
- Resort not found: Return 404 Not Found with resort ID
- Maintenance record not found: Return 404 Not Found
- Invoice not found: Return 404 Not Found

### Database Errors
- Connection failure: Return 503 Service Unavailable and log error
- Transaction failure: Rollback transaction and return 500 Internal Server Error
- Constraint violation: Return 409 Conflict with constraint details

### External Service Errors
- PDF generation failure: Return 500 Internal Server Error and log error details
- Excel generation failure: Return 500 Internal Server Error and log error details
- Email notification failure: Log error but don't fail the main operation

### Error Response Format
All errors should follow consistent JSON format:
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": {
      "field": "specific field error"
    }
  }
}
```

## Testing Strategy

### Unit Testing

The system will use **Jest** as the testing framework for both frontend and backend unit tests.

**Backend Unit Tests:**
- Test individual service functions for business logic
- Test API route handlers for request/response handling
- Test database queries and data transformations
- Test authentication and authorization middleware
- Test utility functions (date calculations, ROI calculations, profit sharing calculations)
- Test error handling and validation logic

**Frontend Unit Tests:**
- Test React components with React Testing Library
- Test state management logic (Zustand stores)
- Test utility functions and calculations
- Test form validation logic
- Test API client functions

**Key areas for unit testing:**
- ROI calculation functions
- Profit sharing calculation functions
- Downtime calculation from date ranges
- Invoice number generation
- Status transition validation
- Financial aggregation functions
- Date range validation

### Property-Based Testing

The system will use **fast-check** for property-based testing in TypeScript.

**Configuration:**
- Each property-based test MUST run a minimum of 100 iterations
- Each property-based test MUST be tagged with a comment explicitly referencing the correctness property from this design document
- Tag format: `// Feature: dku-adventure-rental-management, Property {number}: {property_text}`
- Each correctness property MUST be implemented by a SINGLE property-based test

**Property Test Coverage:**

The following correctness properties will be implemented as property-based tests:

- Property 1: Valid credentials authenticate successfully
- Property 2: Unauthorized access is denied
- Property 3: Asset creation preserves all fields
- Property 4: Cost accumulation is additive
- Property 5: ROI calculation correctness
- Property 6: Maintenance record creation links to asset
- Property 7: Spare part costs aggregate correctly
- Property 8: Downtime calculation accuracy
- Property 9: Maintenance history completeness
- Property 10: Maintenance costs propagate to asset
- Property 11: Expense creation with category
- Property 12: New expenses require approval
- Property 13: Approval actions change status
- Property 14: Expense filtering by category
- Property 15: Revenue record creation completeness
- Property 16: Profit sharing calculation accuracy
- Property 17: Profit sharing temporal consistency
- Property 18: Profit sharing report accuracy
- Property 19: Invoice includes all revenue in range
- Property 20: Invoice numbers are unique and sequential
- Property 21: Invoice line items completeness
- Property 22: Invoice PDF contains data
- Property 23: Invoice status transitions are valid
- Property 24: Payment recording updates status
- Property 25: Resort creation preserves fields
- Property 26: Profit sharing configuration per category
- Property 27: Resort performance calculation
- Property 28: New resorts are immediately available
- Property 29: Dashboard summary calculations
- Property 30: Asset performance aggregation
- Property 31: Pending items filtering
- Property 32: Financial ratios correctness
- Property 33: Excel export contains data
- Property 34: PDF export contains data
- Property 35: Asset export completeness
- Property 36: Financial export completeness
- Property 37: Budget request creation completeness
- Property 38: New budget requests require approval
- Property 39: Budget request approval actions
- Property 40: Budget request retrieval completeness
- Property 41: Asset detail calculations
- Property 42: Asset ranking consistency
- Property 43: Negative ROI flagging
- Property 44: Category aggregation correctness

**Property Test Generators:**

Custom generators will be created for:
- Valid user credentials with different roles
- Asset data with various categories and costs
- Maintenance records with date ranges
- Spare parts with quantities and costs
- Revenue records with different amounts and dates
- Profit sharing configurations with valid percentage pairs
- Invoice data with line items
- Expense data with categories and amounts
- Budget request data

### Integration Testing

Integration tests will verify end-to-end workflows:
- User authentication flow through login to accessing protected resources
- Asset lifecycle: creation → maintenance → cost tracking → ROI calculation
- Expense approval workflow: submission → pending → manager approval → finalized
- Revenue to invoice flow: daily revenue entry → invoice generation → PDF creation → payment recording
- Resort configuration: creation → profit sharing setup → revenue recording → performance calculation

### Test Database

- Use a separate test database with the same schema as production
- Reset database state between test suites
- Use database transactions that rollback after each test
- Seed test data for consistent test scenarios

### Code Coverage Goals

- Minimum 80% code coverage for backend services
- Minimum 70% code coverage for frontend components
- 100% coverage for critical business logic (ROI calculations, profit sharing, invoice generation)

### Continuous Integration

- Run all tests on every pull request
- Block merges if tests fail
- Generate and publish coverage reports
- Run property-based tests with increased iterations (1000+) in CI environment for thorough validation
