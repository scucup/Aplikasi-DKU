# Setup Supabase Client untuk DKU Adventure

## 📋 Overview

Proyek ini sekarang menggunakan **Supabase Client** langsung untuk berkomunikasi dengan database PostgreSQL, menggantikan Prisma ORM. Setup ini memberikan:

- ✅ Type-safe database operations dengan TypeScript
- ✅ Real-time subscriptions (opsional)
- ✅ Built-in authentication support
- ✅ Row Level Security (RLS) support
- ✅ Direct PostgreSQL access

## 🔧 Instalasi

Package sudah terinstall:
```bash
# Backend
npm install @supabase/supabase-js

# Frontend
cd client && npm install @supabase/supabase-js
```

## 🔑 Environment Variables

### Backend (.env)
```env
SUPABASE_URL=https://zkzvhjcznesponulbfkv.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

### Frontend (client/.env)
```env
VITE_SUPABASE_URL=https://zkzvhjcznesponulbfkv.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_API_URL=http://localhost:3000
```

## 📁 Struktur File

```
src/
├── lib/
│   ├── supabase.ts              # Supabase client initialization
│   └── supabase-helpers.ts      # Generic helper functions
├── types/
│   └── supabase.ts              # Auto-generated TypeScript types
└── examples/
    └── supabase-usage.ts        # Contoh penggunaan lengkap

client/src/
└── lib/
    └── supabase.ts              # Supabase client untuk frontend
```

## 🚀 Cara Penggunaan

### 1. Import Supabase Client

```typescript
import { supabase } from './lib/supabase';
```

### 2. Basic CRUD Operations

#### SELECT (Read)
```typescript
// Get all records
const { data, error } = await supabase
  .from('users')
  .select('*');

// Get with filter
const { data, error } = await supabase
  .from('assets')
  .select('*')
  .eq('status', 'ACTIVE')
  .eq('category', 'ATV');

// Get single record
const { data, error } = await supabase
  .from('users')
  .select('*')
  .eq('id', userId)
  .single();
```

#### INSERT (Create)
```typescript
const { data, error } = await supabase
  .from('resorts')
  .insert({
    id: 'resort-1',
    name: 'Beach Resort',
    contact_email: 'contact@resort.com',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  })
  .select()
  .single();
```

#### UPDATE
```typescript
const { data, error } = await supabase
  .from('assets')
  .update({ 
    status: 'MAINTENANCE',
    updated_at: new Date().toISOString()
  })
  .eq('id', assetId)
  .select()
  .single();
```

#### DELETE
```typescript
const { error } = await supabase
  .from('assets')
  .delete()
  .eq('id', assetId);
```

### 3. Advanced Queries

#### JOIN dengan Foreign Keys
```typescript
const { data, error } = await supabase
  .from('assets')
  .select(`
    *,
    resort:resorts(*),
    maintenance_records(*)
  `);
```

#### Pagination
```typescript
const page = 1;
const pageSize = 10;
const from = (page - 1) * pageSize;
const to = from + pageSize - 1;

const { data, error, count } = await supabase
  .from('assets')
  .select('*', { count: 'exact' })
  .range(from, to)
  .order('created_at', { ascending: false });
```

#### Search
```typescript
const { data, error } = await supabase
  .from('resorts')
  .select('*')
  .ilike('name', `%${searchTerm}%`);
```

#### Count
```typescript
const { count, error } = await supabase
  .from('assets')
  .select('*', { count: 'exact', head: true })
  .eq('status', 'ACTIVE');
```

### 4. Type Safety

```typescript
import type { Database } from './types/supabase';

type User = Database['public']['Tables']['users']['Row'];
type Asset = Database['public']['Tables']['assets']['Row'];
type AssetInsert = Database['public']['Tables']['assets']['Insert'];
type AssetUpdate = Database['public']['Tables']['assets']['Update'];

// Gunakan types untuk function parameters
async function createAsset(asset: AssetInsert): Promise<Asset> {
  const { data, error } = await supabase
    .from('assets')
    .insert(asset)
    .select()
    .single();
    
  if (error) throw error;
  return data;
}
```

### 5. Error Handling

```typescript
try {
  const { data, error } = await supabase
    .from('users')
    .select('*');
    
  if (error) throw error;
  
  return data;
} catch (err) {
  console.error('Database error:', err);
  throw err;
}
```

## 🔐 Row Level Security (RLS)

Saat ini RLS belum diaktifkan. Untuk mengaktifkan:

```sql
-- Enable RLS untuk table users
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Buat policy
CREATE POLICY "Users can view their own data"
  ON users
  FOR SELECT
  USING (auth.uid() = id);
```

## 📚 Helper Functions

File `src/lib/supabase-helpers.ts` menyediakan generic functions:

```typescript
import { fetchAll, fetchOne, insertOne, updateOne, deleteOne } from './lib/supabase-helpers';

// Fetch all
const users = await fetchAll('users');

// Fetch with options
const activeAssets = await fetchAll('assets', {
  filter: { status: 'ACTIVE' },
  orderBy: { column: 'created_at', ascending: false },
  limit: 10
});

// Fetch one
const user = await fetchOne('users', userId);

// Insert
const newResort = await insertOne('resorts', resortData);

// Update
const updated = await updateOne('assets', assetId, { status: 'RETIRED' });

// Delete
await deleteOne('assets', assetId);
```

## 🎯 Contoh Lengkap

Lihat file `src/examples/supabase-usage.ts` untuk 15+ contoh penggunaan praktis.

## 🔄 Migrasi dari Prisma

### Sebelum (Prisma):
```typescript
const users = await prisma.user.findMany({
  where: { role: 'ADMIN' },
  include: { expenses: true }
});
```

### Sesudah (Supabase):
```typescript
const { data: users } = await supabase
  .from('users')
  .select('*, expenses(*)')
  .eq('role', 'ADMIN');
```

## 📖 Resources

- [Supabase JS Client Docs](https://supabase.com/docs/reference/javascript/introduction)
- [Supabase Database Guide](https://supabase.com/docs/guides/database)
- [PostgreSQL Functions](https://supabase.com/docs/guides/database/functions)

## 🆘 Troubleshooting

### Error: "Missing Supabase environment variables"
Pastikan file `.env` sudah ada dan berisi `SUPABASE_URL` dan `SUPABASE_ANON_KEY`.

### Error: "relation does not exist"
Pastikan migrations sudah dijalankan dan table sudah ada di database.

### Type errors
Regenerate types dengan:
```bash
# Menggunakan Supabase CLI (jika terinstall)
supabase gen types typescript --project-id zkzvhjcznesponulbfkv > src/types/supabase.ts
```

## ✅ Next Steps

1. ✅ Supabase client sudah terinstall
2. ✅ Environment variables sudah dikonfigurasi
3. ✅ TypeScript types sudah digenerate
4. ✅ Helper functions sudah tersedia
5. ⏳ Implementasi API endpoints dengan Supabase
6. ⏳ Update frontend untuk menggunakan Supabase client
7. ⏳ Setup Row Level Security (RLS) policies
8. ⏳ Implementasi real-time subscriptions (opsional)
