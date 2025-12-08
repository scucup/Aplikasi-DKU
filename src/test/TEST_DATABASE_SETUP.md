# Test Database Setup Guide

This guide will help you set up the test database for running tests in the DKU Adventure Rental Management System.

## Prerequisites

- PostgreSQL 14+ installed and running
- Node.js and npm installed
- Project dependencies installed (`npm install`)

## Quick Setup

### 1. Create Test Database

Connect to PostgreSQL and create the test database:

```sql
-- Connect to PostgreSQL (adjust credentials as needed)
psql -U postgres

-- Create the test database
CREATE DATABASE dku_adventure_test;

-- Grant permissions (if using a different user)
GRANT ALL PRIVILEGES ON DATABASE dku_adventure_test TO your_username;
```

### 2. Configure Environment Variables

Add the test database URL to your `.env` file:

```bash
TEST_DATABASE_URL="postgresql://username:password@localhost:5432/dku_adventure_test?schema=public"
```

Replace `username` and `password` with your PostgreSQL credentials.

### 3. Run Migrations

Apply the database schema to the test database:

```bash
# Set the DATABASE_URL temporarily to point to test database
DATABASE_URL="postgresql://username:password@localhost:5432/dku_adventure_test?schema=public" npx prisma migrate deploy
```

Or use the environment variable:

```bash
# On Windows (PowerShell)
$env:DATABASE_URL="postgresql://username:password@localhost:5432/dku_adventure_test?schema=public"; npx prisma migrate deploy

# On Windows (CMD)
set DATABASE_URL=postgresql://username:password@localhost:5432/dku_adventure_test?schema=public && npx prisma migrate deploy

# On Linux/Mac
DATABASE_URL="postgresql://username:password@localhost:5432/dku_adventure_test?schema=public" npx prisma migrate deploy
```

### 4. Verify Setup

Run the database connection test:

```bash
npm test -- src/test/db-connection.test.ts
```

If successful, you should see:
```
✓ should connect to test database
✓ should be able to query the database
```

## Running Tests

### Backend Tests

```bash
# Run all backend tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Frontend Tests

```bash
# Run all frontend tests
npm run client:test

# Run in watch mode
cd client && npm run test:watch

# Run with coverage
cd client && npm run test:coverage
```

## Test Database Management

### Cleaning Test Data

The test infrastructure automatically cleans the database between test suites using the `cleanDatabase()` helper function. You don't need to manually clean the database.

### Resetting Test Database

If you need to completely reset the test database:

```bash
# Drop and recreate the database
psql -U postgres -c "DROP DATABASE IF EXISTS dku_adventure_test;"
psql -U postgres -c "CREATE DATABASE dku_adventure_test;"

# Run migrations again
DATABASE_URL="postgresql://username:password@localhost:5432/dku_adventure_test?schema=public" npx prisma migrate deploy
```

### Updating Schema

When you make changes to the Prisma schema:

1. Create a migration for the development database:
   ```bash
   npx prisma migrate dev --name your_migration_name
   ```

2. Apply the migration to the test database:
   ```bash
   DATABASE_URL="postgresql://username:password@localhost:5432/dku_adventure_test?schema=public" npx prisma migrate deploy
   ```

## Troubleshooting

### Error: "Can't reach database server"

**Problem**: Tests fail with "Can't reach database server at localhost:5432"

**Solutions**:
1. Ensure PostgreSQL is running:
   ```bash
   # Check if PostgreSQL is running
   # Windows: Check Services or Task Manager
   # Linux: sudo systemctl status postgresql
   # Mac: brew services list
   ```

2. Verify the connection string in `.env`:
   - Check username and password
   - Verify port (default is 5432)
   - Ensure database name is correct

3. Test connection manually:
   ```bash
   psql -U username -d dku_adventure_test
   ```

### Error: "Database does not exist"

**Problem**: Tests fail with "database 'dku_adventure_test' does not exist"

**Solution**: Create the database following step 1 above.

### Error: "Relation does not exist"

**Problem**: Tests fail with "relation 'users' does not exist" or similar

**Solution**: Run migrations on the test database (step 3 above).

### Error: "Permission denied"

**Problem**: Tests fail with permission errors

**Solution**: Grant proper permissions:
```sql
GRANT ALL PRIVILEGES ON DATABASE dku_adventure_test TO your_username;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO your_username;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO your_username;
```

### Tests are slow

**Problem**: Tests take a long time to run

**Solutions**:
1. Use test database transactions that rollback (already implemented in `db-config.ts`)
2. Run tests in parallel (Jest does this by default)
3. Optimize database queries in your code
4. Use the `--maxWorkers` flag to control parallelism:
   ```bash
   npm test -- --maxWorkers=4
   ```

### Port already in use

**Problem**: PostgreSQL port 5432 is already in use

**Solutions**:
1. Stop other PostgreSQL instances
2. Use a different port in your connection string:
   ```
   TEST_DATABASE_URL="postgresql://username:password@localhost:5433/dku_adventure_test?schema=public"
   ```

## Best Practices

1. **Never use production database for tests**: Always use a separate test database
2. **Keep test database clean**: Use `cleanDatabase()` helper in `beforeEach` hooks
3. **Use transactions for isolation**: Use `withRollback()` helper for tests that modify data
4. **Seed minimal data**: Only create the data needed for each specific test
5. **Run migrations regularly**: Keep test database schema in sync with development
6. **Use test helpers**: Leverage `createTestUser()`, `createTestAsset()`, etc. from `helpers.ts`
7. **Clean up connections**: Always close database connections in `afterAll` hooks

## CI/CD Configuration

For continuous integration, you'll need to:

1. Set up PostgreSQL in your CI environment
2. Create the test database
3. Run migrations
4. Set the TEST_DATABASE_URL environment variable
5. Run tests

Example GitHub Actions workflow:

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:14
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: dku_adventure_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run migrations
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/dku_adventure_test
        run: npx prisma migrate deploy
      
      - name: Run tests
        env:
          TEST_DATABASE_URL: postgresql://postgres:postgres@localhost:5432/dku_adventure_test
        run: npm test -- --coverage
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

## Additional Resources

- [Prisma Testing Guide](https://www.prisma.io/docs/guides/testing)
- [Jest Documentation](https://jestjs.io/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Project TESTING.md](../../TESTING.md) - Main testing documentation
