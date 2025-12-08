# Database Setup Guide

This guide will help you set up the PostgreSQL database for the DKU Adventure Rental Management System.

## Prerequisites

- PostgreSQL 14+ installed and running
- Database credentials configured in `.env` file

## Setup Steps

### 1. Install PostgreSQL

If you haven't installed PostgreSQL yet:

**Windows:**
- Download from https://www.postgresql.org/download/windows/
- Run the installer and follow the setup wizard
- Remember the password you set for the `postgres` user

**macOS:**
```bash
brew install postgresql@14
brew services start postgresql@14
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

### 2. Create the Database

Connect to PostgreSQL and create the database:

```bash
# Connect to PostgreSQL
psql -U postgres

# Create the database
CREATE DATABASE dku_adventure;

# Create a user (optional, for better security)
CREATE USER dku_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE dku_adventure TO dku_user;

# Exit psql
\q
```

### 3. Configure Environment Variables

Update your `.env` file with the correct database credentials:

```env
DATABASE_URL="postgresql://username:password@localhost:5432/dku_adventure?schema=public"
```

Replace:
- `username` with your PostgreSQL username (e.g., `postgres` or `dku_user`)
- `password` with your PostgreSQL password
- `localhost:5432` with your database host and port (if different)

### 4. Run Migrations

The migration files have already been created. To apply them to your database:

```bash
npm run prisma:migrate
```

This will:
- Create all database tables
- Set up relationships and constraints
- Apply indexes for performance

### 5. Verify the Setup

Check that all tables were created successfully:

```bash
npx prisma studio
```

This will open Prisma Studio in your browser where you can view all tables.

## Database Schema

The following tables will be created:

- **users** - User accounts with role-based access
- **resorts** - Resort partner information
- **profit_sharing_configs** - Profit sharing rules per resort and asset category
- **assets** - Rental equipment inventory
- **maintenance_records** - Maintenance activity tracking
- **spare_parts** - Spare parts used in maintenance
- **expenses** - Operational expenses
- **budget_requests** - Budget approval requests
- **revenue_records** - Daily revenue entries
- **invoices** - Generated invoices for resort partners
- **invoice_line_items** - Line items within invoices
- **payment_history** - Payment tracking for invoices

## Troubleshooting

### Can't connect to database

**Error:** `Can't reach database server at localhost:5432`

**Solution:**
1. Verify PostgreSQL is running:
   ```bash
   # Windows
   Get-Service postgresql*
   
   # macOS
   brew services list
   
   # Linux
   sudo systemctl status postgresql
   ```

2. Check if PostgreSQL is listening on port 5432:
   ```bash
   netstat -an | findstr 5432  # Windows
   lsof -i :5432               # macOS/Linux
   ```

3. Verify your credentials in `.env` are correct

### Authentication failed

**Error:** `Authentication failed for user`

**Solution:**
1. Verify the username and password in your `DATABASE_URL`
2. Reset the PostgreSQL password if needed:
   ```bash
   psql -U postgres
   ALTER USER postgres PASSWORD 'new_password';
   ```

### Database does not exist

**Error:** `Database "dku_adventure" does not exist`

**Solution:**
Create the database as shown in Step 2 above.

## Next Steps

After successfully setting up the database:

1. Generate the Prisma Client (if not already done):
   ```bash
   npm run prisma:generate
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. The API will be available at `http://localhost:3000`

## Additional Commands

- **View database in browser:** `npx prisma studio`
- **Reset database (WARNING: deletes all data):** `npx prisma migrate reset`
- **Create a new migration:** `npx prisma migrate dev --name migration_name`
- **Apply migrations in production:** `npx prisma migrate deploy`
