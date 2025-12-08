# 🚀 Quick Start: Supabase Client

## Setup Selesai! ✅

Koneksi Supabase sudah siap digunakan. Berikut cara cepat untuk mulai coding.

## 📦 Yang Sudah Terinstall

- ✅ `@supabase/supabase-js` (backend & frontend)
- ✅ Environment variables configured
- ✅ TypeScript types generated
- ✅ Helper functions ready
- ✅ Example code available

## 🎯 Mulai Coding dalam 3 Langkah

### 1. Import Supabase Client

```typescript
import { supabase } from './lib/supabase';
```

### 2. Gunakan untuk Query

```typescript
// Fetch data
const { data, error } = await supabase
  .from('users')
  .select('*');

if (error) throw error;
console.log(data);
```

### 3. Done! 🎉

## 📚 Contoh Cepat

### Fetch All Records
```typescript
const { data: users } = await supabase.from('users').select('*');
```

### Fetch dengan Filter
```typescript
const { data: activeAssets } = await supabase
  .from('assets')
  .select('*')
  .eq('status', 'ACTIVE');
```

### Insert Data
```typescript
const { data: newResort } = await supabase
  .from('resorts')
  .insert({
    id: 'resort-1',
    name: 'Beach Resort',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  })
  .select()
  .single();
```

### Update Data
```typescript
const { data: updated } = await supabase
  .from('assets')
  .update({ status: 'MAINTENANCE' })
  .eq('id', assetId)
  .select()
  .single();
```

### Delete Data
```typescript
await supabase
  .from('assets')
  .delete()
  .eq('id', assetId);
```

### Query dengan JOIN
```typescript
const { data: assets } = await supabase
  .from('assets')
  .select(`
    *,
    resort:resorts(*),
    maintenance_records(*)
  `);
```

## 🔍 Lihat Contoh Lengkap

1. **Basic Usage**: `src/examples/supabase-usage.ts` (15+ contoh)
2. **Express Routes**: `src/examples/express-routes-example.ts` (REST API)
3. **Full Documentation**: `SUPABASE_SETUP.md`

## 🎨 Frontend Usage (React)

```typescript
import { supabase } from './lib/supabase';

function MyComponent() {
  const [assets, setAssets] = useState([]);

  useEffect(() => {
    async function fetchAssets() {
      const { data } = await supabase
        .from('assets')
        .select('*');
      setAssets(data || []);
    }
    fetchAssets();
  }, []);

  return (
    <div>
      {assets.map(asset => (
        <div key={asset.id}>{asset.name}</div>
      ))}
    </div>
  );
}
```

## 🛠️ Helper Functions

Gunakan helper functions untuk operasi yang lebih simple:

```typescript
import { fetchAll, fetchOne, insertOne, updateOne, deleteOne } from './lib/supabase-helpers';

// Fetch all
const users = await fetchAll('users');

// Fetch one
const user = await fetchOne('users', userId);

// Insert
const newResort = await insertOne('resorts', resortData);

// Update
const updated = await updateOne('assets', assetId, { status: 'RETIRED' });

// Delete
await deleteOne('assets', assetId);
```

## 🔐 Environment Variables

### Backend (.env)
```env
SUPABASE_URL=https://zkzvhjcznesponulbfkv.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Frontend (client/.env)
```env
VITE_SUPABASE_URL=https://zkzvhjcznesponulbfkv.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## 📊 Database Tables

Semua table sudah tersedia:
- `users` - User management
- `resorts` - Resort data
- `assets` - Equipment/assets
- `maintenance_records` - Maintenance tracking
- `spare_parts` - Spare parts inventory
- `expenses` - Expense tracking
- `budget_requests` - Budget requests
- `revenue_records` - Revenue tracking
- `invoices` - Invoice management
- `invoice_line_items` - Invoice details
- `payment_history` - Payment tracking
- `profit_sharing_configs` - Profit sharing configuration

## 🎓 Tips

1. **Type Safety**: Import types dari `src/types/supabase.ts`
2. **Error Handling**: Selalu check `error` dari response
3. **Joins**: Gunakan `select()` dengan nested syntax untuk joins
4. **Pagination**: Gunakan `.range(from, to)` untuk pagination
5. **Search**: Gunakan `.ilike()` untuk case-insensitive search

## 📖 Next Steps

1. Buat API endpoints di Express (lihat `src/examples/express-routes-example.ts`)
2. Implementasi frontend components dengan Supabase
3. Setup Row Level Security (RLS) untuk keamanan
4. Tambahkan real-time subscriptions jika diperlukan

## 🆘 Need Help?

- Lihat `SUPABASE_SETUP.md` untuk dokumentasi lengkap
- Check `src/examples/` untuk contoh-contoh praktis
- Baca [Supabase Docs](https://supabase.com/docs)

---

**Happy Coding! 🚀**
