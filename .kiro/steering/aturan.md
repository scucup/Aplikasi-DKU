---
inclusion: always
---

# Project Guidelines

## Documentation Policy
- Do NOT create documentation files (e.g., summary files, completion reports, or markdown documentation) unless explicitly requested by the user
- Focus on code implementation and direct file edits rather than documentation
- Avoid creating unnecessary files that slow down the actual development process

## Architecture Awareness
This is a **frontend-only application** that communicates directly with Supabase. There is NO backend Express server.

- **Frontend**: React + TypeScript client application (in `client/` directory)
  - Uses Vite, Tailwind CSS, and React Router
  - Supabase client for authentication and direct database access
  - All CRUD operations are performed directly from the frontend to Supabase
  - Row Level Security (RLS) policies in Supabase handle authorization
  
- **Database**: Supabase PostgreSQL
  - Schema and migrations managed through **MCP Supabase tools** (preferred method)
  - Use `mcp_supabase_apply_migration` for DDL operations (CREATE TABLE, ALTER TABLE, etc.)
  - Use `mcp_supabase_execute_sql` for data operations (INSERT, UPDATE, DELETE, SELECT)
  - Use `mcp_supabase_generate_typescript_types` to generate TypeScript types
  - Only use Supabase CLI or dashboard manually if MCP tools fail repeatedly
  - Direct client access from frontend using `@supabase/supabase-js`
  - RLS policies must be properly configured for security

## Important Notes
- The `src/` directory (backend Express code) is NOT used in this architecture
- All data operations happen client-side through Supabase client
- Security is enforced through Supabase RLS policies, not backend middleware
- Authentication is handled by Supabase Auth
- When implementing features, always work in the `client/` directory
- Ensure RLS policies are properly configured before performing CRUD operations

## Unused Backend Files (Legacy)
The following files are from the old backend architecture and are **NOT USED**:

### Backend Auth (Express + JWT) - NOT USED
- `src/routes/auth.ts` - Express auth routes (replaced by Supabase Auth)
- `src/middleware/auth.ts` - Express auth middleware (replaced by RLS policies)

### Backend Database Clients - NOT USED
- `src/lib/supabase.ts` - Backend Supabase client (use `client/src/lib/supabase.ts` instead)
- `src/lib/supabase-helpers.ts` - Backend helpers (not needed)
- `src/lib/prisma.ts` - Prisma client (replaced by Supabase client)

### Backend Examples - NOT USED
- `src/examples/express-routes-example.ts` - Express route examples
- `src/examples/supabase-usage.ts` - Backend Supabase usage examples

### Other Backend Files - NOT USED
- `src/index.ts` - Express server entry point
- `prisma/` directory - Prisma schema and migrations (use Supabase migrations instead)

**Note:** These files can be safely deleted or ignored. Only work in the `client/` directory. 