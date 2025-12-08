# Project Structure

## Overview

This document describes the complete project structure for the DKU Adventure Rental Management System.

## Directory Structure

```
dku-adventure-rental-management/
├── .kiro/                          # Kiro specs and configuration
│   └── specs/
│       └── dku-adventure-rental-management/
│           ├── requirements.md     # Feature requirements
│           ├── design.md          # System design
│           └── tasks.md           # Implementation tasks
│
├── src/                           # Backend source code
│   ├── lib/                       # Shared libraries
│   │   └── prisma.ts             # Prisma client instance
│   ├── types/                     # TypeScript type definitions
│   │   └── index.ts              # Shared types
│   └── index.ts                   # Backend entry point
│
├── client/                        # Frontend React application
│   ├── src/
│   │   ├── types/                # Frontend type definitions
│   │   │   └── index.ts          # Shared types
│   │   ├── App.tsx               # Main app component
│   │   ├── main.tsx              # Frontend entry point
│   │   └── index.css             # Global styles with Tailwind
│   ├── index.html                # HTML template
│   ├── vite.config.ts            # Vite configuration
│   ├── tsconfig.json             # TypeScript config for frontend
│   ├── tsconfig.node.json        # TypeScript config for Vite
│   ├── tailwind.config.js        # TailwindCSS configuration
│   ├── postcss.config.js         # PostCSS configuration
│   └── package.json              # Frontend dependencies
│
├── prisma/                        # Database schema and migrations
│   └── schema.prisma             # Prisma schema definition
│
├── dist/                          # Compiled backend code (generated)
├── node_modules/                  # Backend dependencies (generated)
│
├── .env                          # Environment variables (not in git)
├── .env.example                  # Environment variables template
├── .gitignore                    # Git ignore rules
├── package.json                  # Backend dependencies and scripts
├── tsconfig.json                 # TypeScript config for backend
├── README.md                     # Project documentation
├── PROJECT_STRUCTURE.md          # This file
└── verify-setup.js               # Setup verification script

```

## Key Files

### Backend Configuration

- **package.json**: Backend dependencies (Express, Prisma, JWT, bcrypt, etc.)
- **tsconfig.json**: TypeScript compiler configuration for backend
- **src/index.ts**: Express server entry point with health check endpoint
- **src/lib/prisma.ts**: Prisma client singleton instance
- **src/types/index.ts**: Shared TypeScript interfaces and types

### Frontend Configuration

- **client/package.json**: Frontend dependencies (React, Vite, TailwindCSS, Zustand, Axios)
- **client/vite.config.ts**: Vite bundler configuration with proxy setup
- **client/tsconfig.json**: TypeScript configuration for React
- **client/tailwind.config.js**: TailwindCSS utility classes configuration
- **client/src/main.tsx**: React application entry point
- **client/src/App.tsx**: Root React component
- **client/src/types/index.ts**: Frontend type definitions (mirrors backend)

### Database

- **prisma/schema.prisma**: Complete database schema with all models:
  - Users (authentication and roles)
  - Resorts (partner management)
  - ProfitSharingConfigs (profit sharing rules)
  - Assets (rental equipment)
  - MaintenanceRecords (maintenance tracking)
  - SpareParts (spare parts usage)
  - Expenses (expense management)
  - BudgetRequests (budget approval workflow)
  - RevenueRecords (daily revenue)
  - Invoices (invoice generation)
  - InvoiceLineItems (invoice details)
  - PaymentHistory (payment tracking)

### Environment

- **.env**: Local environment variables (DATABASE_URL, JWT_SECRET, etc.)
- **.env.example**: Template for environment variables

## Technology Stack

### Backend
- **Runtime**: Node.js
- **Framework**: Express.js
- **Language**: TypeScript
- **ORM**: Prisma
- **Database**: PostgreSQL
- **Authentication**: JWT + bcrypt
- **Validation**: express-validator

### Frontend
- **Framework**: React 18
- **Language**: TypeScript
- **Build Tool**: Vite
- **Styling**: TailwindCSS
- **State Management**: Zustand
- **HTTP Client**: Axios
- **Routing**: React Router (to be added)

## Scripts

### Backend Scripts
- `npm run dev`: Start development server with hot reload
- `npm run build`: Compile TypeScript to JavaScript
- `npm start`: Run production server
- `npm run prisma:generate`: Generate Prisma client
- `npm run prisma:migrate`: Run database migrations
- `npm run prisma:studio`: Open Prisma Studio (database GUI)

### Frontend Scripts
- `npm run client:dev`: Start Vite development server
- `npm run client:build`: Build frontend for production
- `npm run client:preview`: Preview production build

## Next Steps

1. **Database Setup**: Update `.env` with PostgreSQL credentials
2. **Run Migrations**: Execute `npm run prisma:migrate` to create database tables
3. **Start Development**: 
   - Backend: `npm run dev`
   - Frontend: `npm run client:dev`
4. **Implement Features**: Follow tasks in `.kiro/specs/dku-adventure-rental-management/tasks.md`

## Port Configuration

- **Backend API**: http://localhost:3000
- **Frontend**: http://localhost:5173
- **Vite Proxy**: API requests from frontend are proxied to backend

## Environment Variables

Required environment variables (see `.env.example`):

- `DATABASE_URL`: PostgreSQL connection string
- `PORT`: Backend server port (default: 3000)
- `NODE_ENV`: Environment (development/production)
- `JWT_SECRET`: Secret key for JWT token signing
- `JWT_EXPIRES_IN`: JWT token expiration time
- `CORS_ORIGIN`: Allowed CORS origin (frontend URL)
