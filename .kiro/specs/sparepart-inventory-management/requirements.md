# Requirements Document

## Introduction

This document outlines the requirements for the Sparepart Inventory Management System for DKU Adventure Rental Management. The system will track sparepart inventory, automatically update stock when used in maintenance, track costs per asset, and integrate with the expense approval workflow.

## Glossary

- **Sparepart**: A replacement component used in asset maintenance
- **Inventory**: The current stock quantity of spareparts available
- **Purchase Order**: A record of spareparts purchased from a supplier
- **Stock Transaction**: Any change in sparepart inventory (purchase or usage)
- **Asset Category**: Classification of assets (ATV, UTV, SEA_SPORT, POOL_TOYS, LINE_SPORT)
- **Engineer**: User role responsible for maintenance and sparepart usage
- **Admin**: User role responsible for financial operations
- **Manager**: User role with approval authority for expenses

## Requirements

### Requirement 1

**User Story:** As an Engineer, I want to record sparepart purchases with detailed information, so that I can track inventory and costs accurately.

#### Acceptance Criteria

1. WHEN an Engineer creates a new sparepart purchase record THEN the system SHALL capture sparepart name, category, resort, purchase date, supplier, quantity, unit, and unit price
2. WHEN an Engineer purchases multiple sparepart types from one supplier THEN the system SHALL allow adding multiple line items in a single purchase order
3. WHEN a purchase order is created THEN the system SHALL automatically calculate total cost for each line item (quantity × unit price)
4. WHEN a purchase order is saved THEN the system SHALL automatically increase inventory stock for each sparepart
5. WHEN a purchase order is created THEN the system SHALL generate a unique purchase order number

### Requirement 2

**User Story:** As an Engineer, I want to see available sparepart inventory when performing maintenance, so that I know which parts are in stock.

#### Acceptance Criteria

1. WHEN an Engineer opens the maintenance form THEN the system SHALL display current stock quantity for all spareparts
2. WHEN an Engineer selects a sparepart for maintenance THEN the system SHALL show if sufficient quantity is available
3. WHEN an Engineer attempts to use more spareparts than available THEN the system SHALL prevent the transaction and display a warning message
4. WHEN viewing sparepart inventory THEN the system SHALL display sparepart name, category, current stock, unit, and last purchase date
5. WHEN inventory reaches zero THEN the system SHALL mark the sparepart as "Out of Stock"

### Requirement 3

**User Story:** As an Engineer, I want the system to automatically update inventory when I use spareparts in maintenance, so that stock levels are always accurate.

#### Acceptance Criteria

1. WHEN an Engineer completes a maintenance record with spareparts THEN the system SHALL automatically decrease inventory stock by the quantity used
2. WHEN inventory is updated THEN the system SHALL create a stock transaction record with type "USAGE"
3. WHEN a maintenance record is deleted THEN the system SHALL restore the sparepart inventory to previous levels
4. WHEN sparepart usage is recorded THEN the system SHALL link the transaction to the specific maintenance record
5. WHEN multiple spareparts are used in one maintenance THEN the system SHALL update inventory for all parts atomically

### Requirement 4

**User Story:** As a Manager, I want to track sparepart costs per asset, so that I can monitor maintenance expenses for each unit.

#### Acceptance Criteria

1. WHEN spareparts are used in maintenance THEN the system SHALL calculate total sparepart cost using current unit prices
2. WHEN viewing an asset's maintenance history THEN the system SHALL display total sparepart costs for that asset
3. WHEN generating maintenance reports THEN the system SHALL include sparepart cost breakdown by asset
4. WHEN a maintenance record is created THEN the system SHALL automatically update the asset's total maintenance cost
5. WHEN viewing asset details THEN the system SHALL display cumulative sparepart costs over the asset's lifetime

### Requirement 5

**User Story:** As an Engineer, I want the system to automatically create an expense request when I purchase spareparts, so that the purchase can be approved and paid.

#### Acceptance Criteria

1. WHEN an Engineer creates a sparepart purchase order THEN the system SHALL automatically create a pending expense record
2. WHEN an expense is created from a purchase order THEN the system SHALL use the same description and total amount
3. WHEN an expense is created THEN the system SHALL set category to "OPERATIONAL" and status to "PENDING"
4. WHEN an expense is created THEN the system SHALL link it to the originating purchase order
5. WHEN a purchase order is saved THEN the system SHALL send a notification to Admin and Manager roles

### Requirement 6

**User Story:** As an Admin or Manager, I want to receive notifications when sparepart purchases require expense approval, so that I can review and approve them promptly.

#### Acceptance Criteria

1. WHEN a sparepart purchase order is created THEN the system SHALL send notifications to all users with Admin or Manager roles
2. WHEN a notification is sent THEN the system SHALL include purchase order number, total amount, and description
3. WHEN an Admin or Manager views notifications THEN the system SHALL display unread count
4. WHEN an Admin or Manager clicks a notification THEN the system SHALL navigate to the expense approval page
5. WHEN an expense is approved or rejected THEN the system SHALL send a notification back to the Engineer who created the purchase

### Requirement 7

**User Story:** As a Manager, I want to approve or reject sparepart purchase expenses, so that I can control spending.

#### Acceptance Criteria

1. WHEN a Manager views pending expenses THEN the system SHALL display expenses linked to sparepart purchases
2. WHEN a Manager approves an expense THEN the system SHALL update expense status to "APPROVED" and record approval date and approver
3. WHEN a Manager rejects an expense THEN the system SHALL update expense status to "REJECTED" and allow adding rejection comments
4. WHEN an expense is rejected THEN the system SHALL reverse the inventory increase from the purchase order
5. WHEN an expense is approved THEN the system SHALL maintain the inventory levels

### Requirement 8

**User Story:** As an Engineer, I want to view sparepart inventory by resort and category, so that I can quickly find available parts for specific assets.

#### Acceptance Criteria

1. WHEN viewing sparepart inventory THEN the system SHALL allow filtering by resort
2. WHEN viewing sparepart inventory THEN the system SHALL allow filtering by asset category
3. WHEN viewing sparepart inventory THEN the system SHALL display parts sorted by stock quantity (lowest first)
4. WHEN viewing sparepart inventory THEN the system SHALL highlight parts with low stock (below minimum threshold)
5. WHEN viewing sparepart inventory THEN the system SHALL allow searching by sparepart name or supplier

### Requirement 9

**User Story:** As a Manager, I want to set minimum stock levels for critical spareparts, so that I receive alerts when reordering is needed.

#### Acceptance Criteria

1. WHEN a Manager configures a sparepart THEN the system SHALL allow setting a minimum stock level
2. WHEN inventory falls below minimum level THEN the system SHALL create a notification for Manager and Engineer roles
3. WHEN viewing low stock alerts THEN the system SHALL display sparepart name, current stock, minimum level, and last supplier
4. WHEN a low stock alert is created THEN the system SHALL mark it as "URGENT" priority
5. WHEN stock is replenished above minimum level THEN the system SHALL automatically close the alert

### Requirement 10

**User Story:** As an Admin, I want to generate sparepart inventory reports, so that I can analyze usage patterns and costs.

#### Acceptance Criteria

1. WHEN generating an inventory report THEN the system SHALL display total inventory value (stock × unit price)
2. WHEN generating a usage report THEN the system SHALL show sparepart consumption by time period
3. WHEN generating a cost report THEN the system SHALL display sparepart expenses by resort and asset category
4. WHEN viewing reports THEN the system SHALL allow exporting to PDF or Excel format
5. WHEN generating reports THEN the system SHALL include date range filters and grouping options
