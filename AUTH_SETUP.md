# 🔐 Supabase Auth Setup - Frontend-Only Guide

## ✅ Setup Selesai!

Authentication system menggunakan **Supabase Auth** dengan arsitektur **frontend-only** sudah siap digunakan.

## 📋 Yang Sudah Dikonfigurasi

### Frontend
- ✅ Auth Context & Hooks
- ✅ Login & Register pages
- ✅ Protected Route component
- ✅ Supabase client integration
- ✅ Role-based access control

### Database
- ✅ Supabase Auth (built-in)
- ✅ Trigger `on_auth_user_created` - Auto-create user di `public.users`
- ✅ Function `handle_new_user()` - Sync auth.users → public.users
- ✅ Row Level Security (RLS) policies untuk data protection

## 🚀 Cara Menggunakan

### Arsitektur Frontend-Only

Aplikasi ini menggunakan arsitektur **frontend-only** dimana:
- ❌ **TIDAK ADA backend Express server**
- ✅ Frontend langsung berkomunikasi dengan Supabase
- ✅ Authentication dihandle oleh Supabase Auth
- ✅ Authorization dihandle oleh Row Level Security (RLS) policies
- ✅ Semua CRUD operations langsung dari frontend ke Supabase

### 1. Wrap App dengan AuthProvider

```tsx
// main.tsx
import { AuthProvider } from './contexts/AuthContext';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
);
```

### 2. Setup Routes

```tsx
// App.tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import ProtectedRoute from './components/ProtectedRoute';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        
        {/* Admin only route */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute requiredRole="ADMIN">
              <AdminPanel />
            </ProtectedRoute>
          }
        />
        
        {/* Multiple roles */}
        <Route
          path="/reports"
          element={
            <ProtectedRoute requiredRole={['ADMIN', 'MANAGER']}>
              <Reports />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
```

### 3. Gunakan Auth Hook

```tsx
import { useAuth } from './contexts/AuthContext';

function MyComponent() {
  const { user, profile, signIn, signOut, loading } = useAuth();

  if (loading) return <div>Loading...</div>;

  if (!user) {
    return <div>Please login</div>;
  }

  return (
    <div>
      <h1>Welcome, {profile?.name}!</h1>
      <p>Role: {profile?.role}</p>
      <button onClick={signOut}>Logout</button>
    </div>
  );
}
```

### 4. Login Example

```tsx
const { signIn } = useAuth();

const handleLogin = async () => {
  try {
    await signIn('user@example.com', 'password123');
    navigate('/dashboard');
  } catch (error) {
    console.error('Login failed:', error);
  }
};
```

### 5. Register Example

```tsx
const { signUp } = useAuth();

const handleRegister = async () => {
  try {
    await signUp('user@example.com', 'password123', 'John Doe', 'ENGINEER');
    navigate('/dashboard');
  } catch (error) {
    console.error('Registration failed:', error);
  }
};
```

### 6. Direct Supabase Operations (Frontend)

Setelah user login, Anda bisa langsung melakukan operasi database dari frontend:

```typescript
import { supabase } from './lib/supabase';
import { useAuth } from './contexts/AuthContext';

function MyComponent() {
  const { user } = useAuth();

  // Read data
  const fetchData = async () => {
    const { data, error } = await supabase
      .from('properties')
      .select('*')
      .eq('user_id', user?.id);
    
    if (error) console.error(error);
    return data;
  };

  // Create data
  const createProperty = async (propertyData) => {
    const { data, error } = await supabase
      .from('properties')
      .insert([propertyData])
      .select();
    
    if (error) console.error(error);
    return data;
  };

  // Update data
  const updateProperty = async (id, updates) => {
    const { data, error } = await supabase
      .from('properties')
      .update(updates)
      .eq('id', id)
      .select();
    
    if (error) console.error(error);
    return data;
  };

  // Delete data
  const deleteProperty = async (id) => {
    const { error } = await supabase
      .from('properties')
      .delete()
      .eq('id', id);
    
    if (error) console.error(error);
  };
}
```

**Catatan Penting:** Pastikan RLS policies sudah dikonfigurasi dengan benar untuk mengamankan data!

## 🔑 Session Management

### Automatic Session Handling

Supabase client otomatis mengelola session untuk Anda:

- ✅ **Access Token** - Expires in 1 hour (default)
- ✅ **Refresh Token** - Expires in 7 days (default)
- ✅ **Auto Refresh** - Token di-refresh otomatis sebelum expired
- ✅ **Persistent Session** - Session disimpan di localStorage
- ✅ **Auth State Listener** - AuthContext otomatis update saat session berubah

Anda tidak perlu manual handle token refresh atau storage!

## 🗄️ Database Schema

### auth.users (Supabase Built-in)
- Managed by Supabase Auth
- Stores authentication data
- Password hashing handled automatically
- Tidak perlu diakses langsung dari aplikasi

### public.users (Custom Table)
```sql
CREATE TABLE public.users (
  id TEXT PRIMARY KEY,           -- Sync dengan auth.users.id
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  role TEXT NOT NULL,            -- ENGINEER, ADMIN, MANAGER
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

### Auto-Sync Trigger
```sql
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
```

**Cara Kerja:**
1. User register via `supabase.auth.signUp()` dari frontend
2. Supabase Auth membuat user di `auth.users`
3. Trigger otomatis membuat record di `public.users`
4. Data dari `raw_user_meta_data` (name, role) di-copy ke `public.users`
5. Frontend bisa query `public.users` untuk mendapatkan profile data

## 🔒 Security Best Practices

### Frontend-Only Security

1. **Never expose Service Role Key** - Hanya gunakan Anon Key di frontend
2. **Enable RLS Policies** - WAJIB! Ini satu-satunya security layer Anda
3. **Use HTTPS in production** - Protect tokens in transit
4. **Validate input** - Sanitize user input di frontend
5. **Use strong passwords** - Minimum 6 characters (configure di Supabase dashboard)
6. **Configure CORS** - Set allowed origins di Supabase dashboard
7. **Email verification** - Enable di Supabase Auth settings (recommended)

### Row Level Security (RLS) Examples

```sql
-- Users can only read their own profile
CREATE POLICY "Users can view own profile"
  ON public.users
  FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON public.users
  FOR UPDATE
  USING (auth.uid() = id);

-- Only authenticated users can read properties
CREATE POLICY "Authenticated users can view properties"
  ON public.properties
  FOR SELECT
  TO authenticated
  USING (true);

-- Users can only create properties for themselves
CREATE POLICY "Users can create own properties"
  ON public.properties
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Admin can do everything
CREATE POLICY "Admin full access"
  ON public.properties
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'ADMIN'
    )
  );
```

## 🎯 User Roles

### ENGINEER
- Default role
- Basic access

### MANAGER
- Can approve expenses
- Can view reports

### ADMIN
- Full access
- Can manage users
- Can configure system

## 📝 Environment Variables

```env
# Frontend (client/.env)
VITE_SUPABASE_URL=https://zkzvhjcznesponulbfkv.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...

# CATATAN: Tidak ada backend environment variables karena tidak ada backend server!
```

## 🧪 Testing Auth

### Test via UI

1. **Start Development Server**
```bash
cd client
npm run dev
```

2. **Open Browser**
- Navigate to `http://localhost:5173/register`
- Create a new account
- Login dengan credentials yang baru dibuat
- Verify redirect ke dashboard

### Test via Browser Console

```javascript
// Test di browser console (setelah buka aplikasi)
import { supabase } from './lib/supabase';

// Test register
const { data, error } = await supabase.auth.signUp({
  email: 'test@example.com',
  password: 'password123',
  options: {
    data: {
      name: 'Test User',
      role: 'ENGINEER'
    }
  }
});

// Test login
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'test@example.com',
  password: 'password123'
});

// Get current session
const { data: { session } } = await supabase.auth.getSession();
console.log(session);

// Get current user
const { data: { user } } = await supabase.auth.getUser();
console.log(user);

// Logout
await supabase.auth.signOut();
```

## 🐛 Troubleshooting

### "Invalid token" error
- Token expired → Supabase akan auto-refresh, coba reload page
- Clear localStorage dan login ulang
- Check apakah VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY benar

### "User not found in public.users"
- Trigger mungkin gagal → Check database logs di Supabase dashboard
- Verify trigger `on_auth_user_created` exists dan enabled
- Manual fix: Insert user ke public.users dengan id yang sama dengan auth.users.id

### "Email already registered"
- User sudah ada di auth.users
- Gunakan email lain atau reset password via Supabase Auth

### "Row Level Security policy violation"
- RLS policies belum dikonfigurasi atau salah
- Check policies di Supabase dashboard → Authentication → Policies
- Pastikan policy menggunakan `auth.uid()` untuk check user identity

### Session tidak persist setelah reload
- Check localStorage di browser DevTools
- Pastikan `supabase.auth.getSession()` dipanggil saat app init
- Verify AuthContext properly wraps your app

## 📚 Resources

- [Supabase Auth Docs](https://supabase.com/docs/guides/auth)
- [Supabase JS Client](https://supabase.com/docs/reference/javascript/auth-signup)
- [Row Level Security](https://supabase.com/docs/guides/auth/row-level-security)
- [Auth Helpers React](https://supabase.com/docs/guides/auth/auth-helpers/react)

---

**Setup Complete! 🎉**

Auth system dengan arsitektur frontend-only sudah siap digunakan. Mulai dengan:
1. `cd client && npm run dev`
2. Buka `http://localhost:5173/register`
3. Create account dan login

**Catatan Penting:** Pastikan RLS policies sudah dikonfigurasi sebelum production!
