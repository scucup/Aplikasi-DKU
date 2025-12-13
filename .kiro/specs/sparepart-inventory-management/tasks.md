# Implementation Plan - Sparepart Inventory Management System

## Phase 1: Database Setup

- [ ] 1. Create database schema and tables
  - Create purchase_orders table with RLS policies
  - Create purchase_order_items table with RLS policies
  - Create sparepart_inventory table with RLS policies
  - Create stock_transactions table with RLS policies
  - Create sparepart_notifications table with RLS policies
  - _Requirements: 1.1, 1.2, 2.1, 3.1_

- [ ] 2. Create database triggers and functions
  - [ ] 2.1 Create auto_generate_po_number trigger
    - Generate unique PO numbers with format PO-YYYYMMDD-XXXX
    - _Requirements: 1.5_
  
  - [ ] 2.2 Create auto_calculate_line_total trigger
    - Calculate total_price = quantity × unit_price for line items
    - _Requirements: 1.3_
  
  - [ ] 2.3 Create auto_calculate_po_total trigger
    - Sum all line item totals for purchase order
    - _Requirements: 1.3_
  
  - [ ] 2.4 Create auto_update_maintenance_cost trigger
    - Update sparepart costs in maintenance records
    - _Requirements: 4.1, 4.4_

- [ ] 3. Create database indexes for performance
  - Create indexes on sparepart_inventory (resort_id, asset_category, current_stock)
  - Create indexes on stock_transactions (inventory_id, created_at)
  - Create indexes on sparepart_notifications (recipient_role, is_read)
  - _Requirements: Performance optimization_

- [ ] 4. Checkpoint - Verify database setup
  - Ensure all tests pass, ask the user if questions arise.

## Phase 2: Backend Functions & Business Logic

- [ ] 5. Implement purchase order creation
  - [ ] 5.1 Create createPurchaseOrder function
    - Validate input data
    - Create purchase order record
    - Create line items
    - Return order ID
    - _Requirements: 1.1, 1.2, 1.3_
  
  - [ ] 5.2 Create updateInventoryFromPurchase function
    - Find or create inventory records
    - Increase stock quantities
    - Update last purchase info
    - Create stock transactions
    - _Requirements: 1.4, 3.1_
  
  - [ ] 5.3 Create autoCreateExpense function
    - Create expense record from purchase order
    - Link expense to purchase order
    - Set status to PENDING
    - _Requirements: 5.1, 5.2, 5.3, 5.4_
  
  - [ ] 5.4 Create sendPurchaseNotifications function
    - Send notifications to Admin and Manager roles
    - Include PO details and amount
    - _Requirements: 5.5, 6.1, 6.2_

- [ ] 6. Implement sparepart usage in maintenance
  - [ ] 6.1 Create validateSparepartStock function
    - Check if sufficient stock available
    - Return validation result with details
    - _Requirements: 2.2, 2.3_
  
  - [ ] 6.2 Create useSparepart function
    - Decrease inventory stock
    - Create USAGE stock transactions
    - Update maintenance sparepart costs
    - _Requirements: 3.1, 3.2, 3.4, 3.5_
  
  - [ ] 6.3 Create reverseSparepartUsage function
    - Restore inventory when maintenance deleted
    - Create REVERSAL transactions
    - _Requirements: 3.3_

- [ ] 7. Implement expense approval integration
  - [ ] 7.1 Create handleExpenseApproval function
    - Update expense status
    - Maintain inventory levels
    - Send notification to Engineer
    - _Requirements: 7.2, 7.5_
  
  - [ ] 7.2 Create handleExpenseRejection function
    - Update expense status
    - Reverse inventory from purchase
    - Send notification to Engineer
    - _Requirements: 7.3, 7.4_

- [ ] 8. Implement low stock monitoring
  - [ ] 8.1 Create checkLowStock function
    - Query inventory below minimum levels
    - Create URGENT notifications
    - Send to Engineer and Manager roles
    - _Requirements: 9.2, 9.3, 9.4_
  
  - [ ] 8.2 Create clearLowStockAlert function
    - Close alerts when stock replenished
    - _Requirements: 9.5_

- [ ] 9. Checkpoint - Test backend functions
  - Ensure all tests pass, ask the user if questions arise.

## Phase 3: Frontend Components

- [ ] 10. Build Sparepart Inventory Dashboard
  - [ ] 10.1 Create SparepartInventoryPage component
    - Display inventory table with all columns
    - Implement color coding for stock levels
    - Add quick action buttons
    - _Requirements: 2.4, 8.1, 8.2, 8.3_
  
  - [ ] 10.2 Add filtering and search functionality
    - Filter by resort
    - Filter by asset category
    - Filter by stock status
    - Search by name or supplier
    - _Requirements: 8.1, 8.2, 8.5_
  
  - [ ] 10.3 Add stock level indicators
    - Green for sufficient stock
    - Yellow for low stock
    - Red for out of stock
    - _Requirements: 2.5, 8.4_

- [ ] 11. Build Purchase Order Form
  - [ ] 11.1 Create PurchaseOrderForm component
    - Multi-step form layout
    - Step 1: Basic info (resort, supplier, date)
    - Step 2: Line items
    - Step 3: Review and submit
    - _Requirements: 1.1, 1.2_
  
  - [ ] 11.2 Create PurchaseOrderLineItem component
    - Input fields for all item details
    - Auto-calculate total
    - Remove item button
    - _Requirements: 1.2, 1.3_
  
  - [ ] 11.3 Add line item management
    - Add new line item button
    - Remove line item functionality
    - Validate at least one item
    - _Requirements: 1.2_
  
  - [ ] 11.4 Add form validation and submission
    - Validate all required fields
    - Calculate grand total
    - Submit to backend
    - Show success/error messages
    - _Requirements: 1.1, 1.3, 1.5_

- [ ] 12. Enhance Maintenance Form
  - [ ] 12.1 Add sparepart selection to maintenance form
    - Dropdown with available spareparts
    - Display current stock quantity
    - Show unit and last price
    - _Requirements: 2.1, 2.2_
  
  - [ ] 12.2 Add stock validation
    - Check stock before allowing selection
    - Show warning if insufficient
    - Prevent submission if stock unavailable
    - _Requirements: 2.3_
  
  - [ ] 12.3 Add cost calculation display
    - Show sparepart costs
    - Show labor costs
    - Show total maintenance cost
    - _Requirements: 4.1, 4.2_

- [ ] 13. Build Notification Center
  - [ ] 13.1 Create NotificationCenter component
    - Display notification list
    - Show unread count badge
    - Group by type and priority
    - _Requirements: 6.1, 6.2, 6.3_
  
  - [ ] 13.2 Add notification interactions
    - Mark as read functionality
    - Click to navigate to reference
    - Filter by type and priority
    - _Requirements: 6.4_
  
  - [ ] 13.3 Implement real-time updates
    - Subscribe to notification changes
    - Auto-refresh notification list
    - Show toast for new notifications
    - _Requirements: 6.1, 6.5_

- [ ] 14. Build Inventory Reports Page
  - [ ] 14.1 Create InventoryReportsPage component
    - Report type selector
    - Date range picker
    - Grouping options
    - _Requirements: 10.1, 10.2, 10.3_
  
  - [ ] 14.2 Add report generation
    - Generate inventory value report
    - Generate usage analysis report
    - Generate cost tracking report
    - _Requirements: 10.1, 10.2, 10.3_
  
  - [ ] 14.3 Add export functionality
    - Export to PDF
    - Export to Excel
    - _Requirements: 10.4_

- [ ] 15. Checkpoint - Test frontend components
  - Ensure all tests pass, ask the user if questions arise.

## Phase 4: Integration & Testing

- [ ] 16. Integrate purchase order flow
  - Connect form to backend
  - Test inventory updates
  - Test expense creation
  - Test notifications
  - _Requirements: 1.1-1.5, 5.1-5.5_

- [ ] 17. Integrate maintenance sparepart usage
  - Connect maintenance form to inventory
  - Test stock validation
  - Test stock deduction
  - Test cost updates
  - _Requirements: 2.1-2.5, 3.1-3.5, 4.1-4.5_

- [ ] 18. Integrate expense approval workflow
  - Connect expense approval to inventory
  - Test approval flow
  - Test rejection and reversal
  - Test notifications
  - _Requirements: 7.1-7.3, 7.4, 7.5_

- [ ] 19. Test low stock monitoring
  - Test low stock detection
  - Test alert creation
  - Test alert clearing
  - _Requirements: 9.1-9.5_

- [ ] 20. Final Checkpoint - End-to-end testing
  - Ensure all tests pass, ask the user if questions arise.

## Phase 5: Polish & Deployment

- [ ] 21. Add loading states and error handling
  - Add loading spinners
  - Add error messages
  - Add success confirmations
  - Handle edge cases

- [ ] 22. Optimize performance
  - Add pagination to inventory list
  - Optimize database queries
  - Add caching where appropriate

- [ ] 23. Update documentation
  - Update user guide
  - Update API documentation
  - Add inline code comments

- [ ] 24. Deploy to production
  - Run final tests
  - Deploy database changes
  - Deploy frontend changes
  - Monitor for issues
