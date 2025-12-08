# Requirements Document

## Introduction

The DKU Adventure Rental Management System is a comprehensive web application designed to manage outdoor equipment rental operations across multiple resort partnerships. The system tracks assets, maintenance, expenses, revenue, and automates profit-sharing calculations with resort partners (Harris and Montigo). It provides role-based access for Engineers, Admins, and Managers to handle their respective responsibilities, from maintenance tracking to financial reporting and invoice generation.

## Glossary

- **System**: The DKU Adventure Rental Management System
- **Asset**: Rental equipment including ATV, UTV, Sea Sport, Pool Toys, and Line Sport
- **Resort Partner**: Business partners (Harris and Montigo) where assets are deployed
- **Profit Sharing**: Revenue distribution agreement between DKU Adventure and resort partners
- **Engineer Role**: User role responsible for maintenance and spare part tracking
- **Admin Role**: User role responsible for revenue, expenses, and invoice generation
- **Manager Role**: User role with full system access and approval authority
- **ROI**: Return on Investment calculation for individual assets
- **Preventive Maintenance**: Scheduled maintenance to prevent equipment failure
- **Corrective Maintenance**: Repairs performed after equipment failure
- **Downtime**: Period when an asset is unavailable for rental due to maintenance
- **Approval Workflow**: Process requiring manager authorization for budget requests
- **Invoice**: Financial document generated for resort partners showing revenue and profit sharing

## Requirements

### Requirement 1: User Authentication and Role Management

**User Story:** As a system administrator, I want role-based access control with three distinct user roles, so that users can only access features appropriate to their responsibilities.

#### Acceptance Criteria

1. WHEN a user attempts to log in THEN the System SHALL authenticate the user credentials and assign the appropriate role
2. WHEN an Engineer logs in THEN the System SHALL grant access to maintenance tracking and spare part usage features only
3. WHEN an Admin logs in THEN the System SHALL grant access to revenue input, expense management, budget requests, and invoice generation features
4. WHEN a Manager logs in THEN the System SHALL grant full access to all system features including approvals and configuration
5. WHEN a user attempts to access a feature outside their role permissions THEN the System SHALL deny access and display an authorization error

### Requirement 2: Asset Registration and Tracking

**User Story:** As a Manager, I want to register all rental assets with complete details, so that I can track the lifecycle and financial performance of each asset.

#### Acceptance Criteria

1. WHEN a Manager submits a new asset registration form THEN the System SHALL create an asset record with category, resort assignment, and initial cost
2. WHEN costs are incurred for an asset THEN the System SHALL link and accumulate all maintenance costs, spare part costs, and operational costs to that asset
3. WHEN viewing an asset record THEN the System SHALL calculate and display the ROI based on revenue generated minus total costs incurred
4. WHEN an asset reaches a cost threshold THEN the System SHALL predict lifecycle end date based on historical cost and usage patterns
5. WHEN a Manager requests asset categories THEN the System SHALL support ATV, UTV, Sea Sport, Pool Toys, and Line Sport classifications

### Requirement 3: Maintenance Tracking

**User Story:** As an Engineer, I want to record all maintenance activities and spare part usage, so that asset health and costs are accurately tracked.

#### Acceptance Criteria

1. WHEN an Engineer submits a maintenance record THEN the System SHALL categorize it as preventive or corrective maintenance and link it to the specific asset
2. WHEN spare parts are used during maintenance THEN the System SHALL record the parts, quantities, costs, and associate them with the asset and maintenance record
3. WHEN an asset undergoes maintenance THEN the System SHALL calculate and record the downtime duration from start to completion
4. WHEN viewing maintenance history THEN the System SHALL display all maintenance records with associated costs and downtime for each asset
5. WHEN maintenance is completed THEN the System SHALL update the asset total cost with the maintenance and spare part expenses

### Requirement 4: Expense Management and Approval

**User Story:** As an Admin, I want to input and categorize operational expenses with approval workflows, so that all costs are properly tracked and authorized.

#### Acceptance Criteria

1. WHEN an Admin submits an expense entry THEN the System SHALL categorize it as operational costs, personnel costs, or marketing costs
2. WHEN an expense requires approval THEN the System SHALL create an approval request and notify Managers
3. WHEN a Manager reviews an approval request THEN the System SHALL allow approval or rejection with comments
4. WHEN an expense is approved THEN the System SHALL finalize the expense record and include it in financial reports
5. WHEN viewing expenses THEN the System SHALL display expenses grouped by category with approval status

### Requirement 5: Revenue Recording and Profit Sharing

**User Story:** As an Admin, I want to input daily revenue per resort and automatically calculate profit sharing, so that financial distributions are accurate and transparent.

#### Acceptance Criteria

1. WHEN an Admin inputs daily revenue for a resort THEN the System SHALL record the revenue amount, date, resort, and asset category
2. WHEN revenue is recorded for Harris resort THEN the System SHALL apply profit sharing ratios of 85:15 or 90:10 based on asset category configuration
3. WHEN revenue is recorded for Montigo resort THEN the System SHALL apply profit sharing ratios of 50:50 or 60:40 based on asset category configuration
4. WHEN a Manager modifies profit sharing ratios THEN the System SHALL update the configuration and apply new ratios to subsequent revenue entries
5. WHEN generating profit sharing reports THEN the System SHALL display pre-sharing total revenue and post-sharing amounts for both DKU Adventure and resort partner

### Requirement 6: Invoice Generation

**User Story:** As an Admin, I want to generate professional invoices for resort partners, so that billing is automated and accurately reflects profit sharing agreements.

#### Acceptance Criteria

1. WHEN an Admin initiates invoice generation for a resort and date range THEN the System SHALL compile all revenue data and calculate profit sharing amounts
2. WHEN an invoice is created THEN the System SHALL assign a unique sequential invoice number and set status to draft
3. WHEN generating invoice content THEN the System SHALL include revenue breakdown per asset category, profit sharing calculations, and total amounts due
4. WHEN an Admin finalizes an invoice THEN the System SHALL generate a PDF document with all invoice details formatted professionally
5. WHEN an invoice status changes THEN the System SHALL track status transitions through draft, sent, and paid states
6. WHEN payment is recorded THEN the System SHALL update invoice status to paid and record payment date and amount in payment history

### Requirement 7: Resort Partner Management

**User Story:** As a Manager, I want to add and configure resort partners with custom profit sharing rules, so that the system can scale to new partnerships.

#### Acceptance Criteria

1. WHEN a Manager adds a new resort partner THEN the System SHALL create a resort record with name and contact information
2. WHEN configuring a resort THEN the System SHALL allow Manager to set custom profit sharing percentages for each asset category
3. WHEN viewing resort performance THEN the System SHALL display total revenue, profit sharing amounts, and asset utilization for that resort
4. WHEN a resort is added THEN the System SHALL make it available for asset assignment and revenue recording
5. WHEN profit sharing rules are updated THEN the System SHALL apply changes to future revenue calculations without affecting historical data

### Requirement 8: Manager Dashboard and Reporting

**User Story:** As a Manager, I want an executive dashboard with key performance indicators, so that I can monitor business health and make informed decisions.

#### Acceptance Criteria

1. WHEN a Manager accesses the dashboard THEN the System SHALL display total revenue, total expenses, and net profit with current values
2. WHEN viewing asset performance THEN the System SHALL calculate and display overall asset utilization percentage and ROI per asset unit
3. WHEN there are pending approvals THEN the System SHALL display count and list of pending expense approvals on the dashboard
4. WHEN there are pending invoices THEN the System SHALL display count and list of invoices in draft or sent status
5. WHEN viewing financial health indicators THEN the System SHALL display profit margin percentage, expense-to-revenue ratio, and trend indicators

### Requirement 9: Data Export and Reporting

**User Story:** As an Admin or Manager, I want to export financial and operational data to Excel and PDF formats, so that I can share reports with stakeholders and perform external analysis.

#### Acceptance Criteria

1. WHEN a user requests data export THEN the System SHALL support both Excel and PDF format options
2. WHEN exporting to Excel THEN the System SHALL generate a spreadsheet with properly formatted columns, headers, and data for the selected report type
3. WHEN exporting to PDF THEN the System SHALL generate a formatted document with tables, charts, and summary information
4. WHEN exporting asset data THEN the System SHALL include all tracked costs, maintenance history, and ROI calculations per asset
5. WHEN exporting financial reports THEN the System SHALL include revenue, expenses, profit sharing calculations, and period comparisons

### Requirement 10: Mobile Responsiveness

**User Story:** As a user accessing the system from various devices, I want the interface to adapt to different screen sizes, so that I can perform my tasks on desktop, tablet, or mobile devices.

#### Acceptance Criteria

1. WHEN the System is accessed from a mobile device THEN the interface SHALL adapt layout to fit screen width without horizontal scrolling
2. WHEN viewing tables on mobile THEN the System SHALL provide scrollable or stacked views that maintain data readability
3. WHEN using forms on mobile THEN the System SHALL display input fields with appropriate sizing and touch-friendly controls
4. WHEN navigating on mobile THEN the System SHALL provide a responsive menu system accessible via hamburger icon or similar pattern
5. WHEN viewing dashboards on mobile THEN the System SHALL stack widgets vertically while maintaining chart and data visualization clarity

### Requirement 11: Budget Request Management

**User Story:** As an Admin, I want to submit budget requests for approval, so that planned expenses are authorized before commitment.

#### Acceptance Criteria

1. WHEN an Admin creates a budget request THEN the System SHALL capture the requested amount, category, justification, and submission date
2. WHEN a budget request is submitted THEN the System SHALL create an approval workflow item and notify Managers
3. WHEN a Manager reviews a budget request THEN the System SHALL display request details and allow approval or rejection with comments
4. WHEN a budget request is approved THEN the System SHALL update the request status and allow the Admin to proceed with the expense
5. WHEN viewing budget requests THEN the System SHALL display all requests with status, amounts, and approval history

### Requirement 12: Asset Lifecycle and Performance Analytics

**User Story:** As a Manager, I want to analyze asset performance and lifecycle metrics, so that I can make data-driven decisions about asset replacement and investment.

#### Acceptance Criteria

1. WHEN viewing an asset THEN the System SHALL display total revenue generated, total costs incurred, and current ROI percentage
2. WHEN analyzing asset lifecycle THEN the System SHALL predict remaining useful life based on maintenance frequency, costs, and downtime trends
3. WHEN comparing assets THEN the System SHALL rank assets by utilization rate, ROI, and profitability
4. WHEN an asset shows negative ROI THEN the System SHALL flag it for Manager review with recommendation indicators
5. WHEN viewing asset categories THEN the System SHALL aggregate performance metrics across all assets in each category
