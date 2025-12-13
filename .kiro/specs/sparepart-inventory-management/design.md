# Design Document - Sparepart Inventory Management System

## Overview

The Sparepart Inventory Management System is a comprehensive solution for tracking sparepart purchases, inventory levels, usage in maintenance activities, and integration with the expense approval workflow. The system automatically updates inventory when spareparts are purchased or used, tracks costs per asset, and sends notifications to relevant stakeholders.

## Architecture

### System Components

1. **Frontend (React + TypeScript)**
   - Sparepart Inventory Dashboard
   - Purchase Order Form
   - Maintenance Form (Enhanced)
   - Expense Management (Enhanced)
   - Notification Center (Enhanced)

2. **Backend (Supabase)**
   - PostgreSQL Database
   - Row Level Security (RLS) Policies
   - Database Triggers for automation
   - Real-time subscriptions for notifications

3. **Integration Points**
   - Maintenance Records → Inventory Updates
   - Purchase Orders → Expense Creation
   - Expense Approval → Inventory Confirmation

## Data Models

### New Tables

#### 1. purchase_orders
```sql
CREATE TABLE purchase_orders (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  po_number TEXT UNIQUE NOT NULL,
  resort_id TEXT NOT NULL REFERENCES resorts(id),
  supplier_name TEXT NOT NULL,
  purchase_date DATE NOT NULL,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'PENDING', -- PENDING, APPROVED, REJECTED
  expense_id TEXT REFERENCES expenses(id),
  created_by TEXT NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT now()
);
```

#### 2. purchase_order_items
```sql
CREATE TABLE purchase_order_items (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  purchase_order_id TEXT NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  sparepart_name TEXT NOT NULL,
  asset_category AssetCategory NOT NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit TEXT NOT NULL, -- pcs, liter, kg, etc
  unit_price NUMERIC NOT NULL CHECK (unit_price >= 0),
  total_price NUMERIC NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 3. sparepart_inventory
```sql
CREATE TABLE sparepart_inventory (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  sparepart_name TEXT NOT NULL,
  asset_category AssetCategory NOT NULL,
  resort_id TEXT NOT NULL REFERENCES resorts(id),
  current_stock INTEGER NOT NULL DEFAULT 0 CHECK (current_stock >= 0),
  unit TEXT NOT NULL,
  last_unit_price NUMERIC NOT NULL DEFAULT 0,
  min_stock_level INTEGER DEFAULT 5,
  last_purchase_date DATE,
  last_supplier TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT now(),
  UNIQUE(sparepart_name, asset_category, resort_id)
);
```

#### 4. stock_transactions
```sql
CREATE TABLE stock_transactions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  inventory_id TEXT NOT NULL REFERENCES sparepart_inventory(id),
  transaction_type TEXT NOT NULL, -- PURCHASE, USAGE, ADJUSTMENT, REVERSAL
  quantity INTEGER NOT NULL,
  unit_price NUMERIC,
  reference_type TEXT, -- PURCHASE_ORDER, MAINTENANCE_RECORD
  reference_id TEXT,
  notes TEXT,
  created_by TEXT NOT NULL REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### 5. sparepart_notifications
```sql
CREATE TABLE sparepart_notifications (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  notification_type TEXT NOT NULL, -- PURCHASE_CREATED, LOW_STOCK, EXPENSE_APPROVED, EXPENSE_REJECTED
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  reference_type TEXT, -- PURCHASE_ORDER, EXPENSE, INVENTORY
  reference_id TEXT,
  recipient_role TEXT[], -- Array of roles: ENGINEER, ADMIN, MANAGER
  is_read BOOLEAN DEFAULT false,
  priority TEXT DEFAULT 'NORMAL', -- LOW, NORMAL, HIGH, URGENT
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Modified Tables

#### Update: maintenance_spareparts
```sql
-- Add unit_price to track cost at time of usage
ALTER TABLE maintenance_spareparts 
ADD COLUMN unit_price NUMERIC DEFAULT 0,
ADD COLUMN total_cost NUMERIC DEFAULT 0;
```

## Components and Interfaces

### Frontend Components

#### 1. SparepartInventoryPage
- **Purpose**: Display current inventory with filtering and search
- **Features**:
  - Table view with columns: Name, Category, Resort, Stock, Unit, Last Price, Status
  - Filters: Resort, Category, Stock Status (In Stock, Low Stock, Out of Stock)
  - Search by name or supplier
  - Color coding for stock levels (green: sufficient, yellow: low, red: out)
  - Quick action buttons: Add Purchase, View History

#### 2. PurchaseOrderForm
- **Purpose**: Create new sparepart purchase orders
- **Features**:
  - Multi-step form:
    - Step 1: Basic Info (Resort, Supplier, Purchase Date)
    - Step 2: Line Items (Add multiple spareparts)
    - Step 3: Review & Submit
  - Dynamic line item addition/removal
  - Auto-calculate totals
  - Validation for required fields
  - Preview before submission

#### 3. PurchaseOrderLineItem
- **Purpose**: Individual line item in purchase order
- **Fields**:
  - Sparepart Name (text input with autocomplete)
  - Asset Category (dropdown)
  - Quantity (number input)
  - Unit (dropdown: pcs, liter, kg, box, set)
  - Unit Price (number input)
  - Total (auto-calculated, read-only)
- **Actions**: Remove item button

#### 4. MaintenanceFormEnhanced
- **Purpose**: Enhanced maintenance form with sparepart selection
- **Features**:
  - Sparepart selection dropdown with stock info
  - Real-time stock availability check
  - Warning if insufficient stock
  - Auto-calculate sparepart costs
  - Display total maintenance cost (labor + spareparts)

#### 5. NotificationCenter
- **Purpose**: Display and manage notifications
- **Features**:
  - Unread count badge
  - Notification list with icons by type
  - Mark as read functionality
  - Click to navigate to relevant page
  - Filter by type and priority
  - Auto-refresh with real-time updates

#### 6. InventoryReportsPage
- **Purpose**: Generate and view inventory reports
- **Features**:
  - Report types: Inventory Value, Usage Analysis, Cost Tracking
  - Date range selector
  - Grouping options: Resort, Category, Supplier
  - Export to PDF/Excel
  - Charts and visualizations

### Backend Functions

#### 1. createPurchaseOrder()
```typescript
async function createPurchaseOrder(
  orderData: {
    resort_id: string;
    supplier_name: string;
    purchase_date: string;
    items: PurchaseOrderItem[];
  },
  userId: string
): Promise<{ orderId: string; expenseId: string }>
```
- Generate unique PO number
- Create purchase order record
- Create line items
- Update inventory for each item
- Create stock transactions
- Auto-create expense record
- Send notifications to Admin/Manager
- Return order and expense IDs

#### 2. updateInventoryFromPurchase()
```typescript
async function updateInventoryFromPurchase(
  items: PurchaseOrderItem[],
  purchaseOrderId: string,
  userId: string
): Promise<void>
```
- For each item, find or create inventory record
- Increase current_stock by quantity
- Update last_unit_price, last_purchase_date, last_supplier
- Create PURCHASE stock transaction
- Check if stock was below minimum and clear low stock alert

#### 3. useSparepart()
```typescript
async function useSparepart(
  maintenanceRecordId: string,
  sparepartUsage: {
    inventory_id: string;
    quantity: number;
  }[],
  userId: string
): Promise<void>
```
- Validate sufficient stock for all items
- Decrease inventory stock
- Create USAGE stock transactions
- Update maintenance_spareparts with costs
- Update maintenance_records.sparepart_cost
- Check if stock falls below minimum and create alert

#### 4. reverseInventoryFromRejection()
```typescript
async function reverseInventoryFromRejection(
  purchaseOrderId: string
): Promise<void>
```
- Find all items in purchase order
- Decrease inventory stock by quantities
- Create REVERSAL stock transactions
- Update purchase order status to REJECTED

#### 5. checkLowStock()
```typescript
async function checkLowStock(): Promise<void>
```
- Query inventory where current_stock < min_stock_level
- Create notifications for each low stock item
- Mark as URGENT priority
- Send to ENGINEER and MANAGER roles

## Database Triggers

### 1. auto_generate_po_number
```sql
CREATE OR REPLACE FUNCTION generate_po_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.po_number := 'PO-' || TO_CHAR(CURRENT_DATE, 'YYYYMMDD') || '-' || 
                   LPAD(NEXTVAL('po_sequence')::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_generate_po_number
BEFORE INSERT ON purchase_orders
FOR EACH ROW
EXECUTE FUNCTION generate_po_number();
```

### 2. auto_calculate_po_total
```sql
CREATE OR REPLACE FUNCTION calculate_po_total()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE purchase_orders
  SET total_amount = (
    SELECT COALESCE(SUM(total_price), 0)
    FROM purchase_order_items
    WHERE purchase_order_id = NEW.purchase_order_id
  )
  WHERE id = NEW.purchase_order_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calculate_po_total
AFTER INSERT OR UPDATE OR DELETE ON purchase_order_items
FOR EACH ROW
EXECUTE FUNCTION calculate_po_total();
```

### 3. auto_calculate_line_total
```sql
CREATE OR REPLACE FUNCTION calculate_line_total()
RETURNS TRIGGER AS $$
BEGIN
  NEW.total_price := NEW.quantity * NEW.unit_price;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_calculate_line_total
BEFORE INSERT OR UPDATE ON purchase_order_items
FOR EACH ROW
EXECUTE FUNCTION calculate_line_total();
```

### 4. auto_update_maintenance_cost
```sql
CREATE OR REPLACE FUNCTION update_maintenance_sparepart_cost()
RETURNS TRIGGER AS $$
BEGIN
  -- Get current unit price from inventory
  SELECT last_unit_price INTO NEW.unit_price
  FROM sparepart_inventory
  WHERE id = (
    SELECT inventory_id 
    FROM maintenance_spareparts 
    WHERE id = NEW.id
  );
  
  NEW.total_cost := NEW.quantity * NEW.unit_price;
  
  -- Update maintenance record total
  UPDATE maintenance_records
  SET sparepart_cost = (
    SELECT COALESCE(SUM(total_cost), 0)
    FROM maintenance_spareparts
    WHERE maintenance_record_id = NEW.maintenance_record_id
  )
  WHERE id = NEW.maintenance_record_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_maintenance_sparepart_cost
BEFORE INSERT OR UPDATE ON maintenance_spareparts
FOR EACH ROW
EXECUTE FUNCTION update_maintenance_sparepart_cost();
```

## Error Handling

### Validation Rules

1. **Purchase Order Creation**
   - At least one line item required
   - All quantities must be positive
   - All prices must be non-negative
   - Resort must exist
   - User must have ENGINEER role

2. **Sparepart Usage**
   - Sufficient stock must be available
   - Maintenance record must exist
   - Quantities must be positive
   - User must have ENGINEER role

3. **Expense Approval**
   - Only MANAGER can approve/reject
   - Expense must be in PENDING status
   - Comments required for rejection

### Error Messages

- "Insufficient stock for {sparepart_name}. Available: {current_stock}, Required: {requested_quantity}"
- "Purchase order must have at least one line item"
- "Only managers can approve expenses"
- "This expense has already been processed"

## Testing Strategy

### Unit Tests

1. **Purchase Order Creation**
   - Test PO number generation
   - Test total calculation
   - Test inventory update
   - Test expense creation

2. **Inventory Management**
   - Test stock increase on purchase
   - Test stock decrease on usage
   - Test stock reversal on rejection
   - Test low stock detection

3. **Cost Tracking**
   - Test sparepart cost calculation
   - Test maintenance total update
   - Test asset cost accumulation

### Integration Tests

1. **End-to-End Purchase Flow**
   - Create purchase order
   - Verify inventory increase
   - Verify expense creation
   - Verify notifications sent
   - Approve expense
   - Verify final state

2. **End-to-End Usage Flow**
   - Create maintenance record
   - Use spareparts
   - Verify inventory decrease
   - Verify cost updates
   - Verify low stock alerts

3. **Rejection Flow**
   - Create purchase order
   - Reject expense
   - Verify inventory reversal
   - Verify notifications

## Security Considerations

### Row Level Security (RLS) Policies

1. **purchase_orders**
   - ENGINEER: Can create and view own orders
   - ADMIN/MANAGER: Can view all orders

2. **sparepart_inventory**
   - ENGINEER: Can view all inventory
   - ADMIN/MANAGER: Can view and modify all inventory

3. **sparepart_notifications**
   - Users can only view notifications for their role
   - Users can only mark their own notifications as read

### Data Validation

- All monetary values must be non-negative
- Stock quantities cannot go negative
- Only authorized roles can perform specific actions
- Audit trail maintained for all transactions

## Performance Optimization

1. **Database Indexes**
   ```sql
   CREATE INDEX idx_inventory_resort_category ON sparepart_inventory(resort_id, asset_category);
   CREATE INDEX idx_inventory_stock_level ON sparepart_inventory(current_stock, min_stock_level);
   CREATE INDEX idx_transactions_inventory ON stock_transactions(inventory_id, created_at DESC);
   CREATE INDEX idx_notifications_role_read ON sparepart_notifications(recipient_role, is_read);
   ```

2. **Query Optimization**
   - Use materialized views for complex reports
   - Implement pagination for large datasets
   - Cache frequently accessed inventory data

3. **Real-time Updates**
   - Use Supabase real-time subscriptions for notifications
   - Debounce inventory updates to reduce database load

## Deployment Plan

### Phase 1: Database Setup
1. Create new tables
2. Add triggers and functions
3. Set up RLS policies
4. Create indexes

### Phase 2: Backend Integration
1. Implement purchase order functions
2. Implement inventory management functions
3. Implement notification system
4. Test all integrations

### Phase 3: Frontend Development
1. Build inventory dashboard
2. Build purchase order form
3. Enhance maintenance form
4. Build notification center
5. Build reports page

### Phase 4: Testing & Deployment
1. Unit testing
2. Integration testing
3. User acceptance testing
4. Production deployment
5. Monitor and optimize

## Future Enhancements

1. **Barcode/QR Code Integration**
   - Generate codes for spareparts
   - Scan to add to maintenance

2. **Supplier Management**
   - Track supplier performance
   - Automated reordering

3. **Predictive Analytics**
   - Forecast sparepart needs
   - Optimize stock levels

4. **Mobile App**
   - Field technician access
   - Quick stock checks

5. **Integration with Accounting**
   - Export to accounting software
   - Automated reconciliation
