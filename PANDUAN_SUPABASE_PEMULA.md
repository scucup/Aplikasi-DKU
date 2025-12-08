# 🎯 Panduan Setup Supabase untuk Pemula - DKU Adventure

## 📋 Yang Anda Butuhkan
- ✅ Akun Supabase (sudah punya)
- ✅ Akses ke Kiro (sudah punya)
- ⏱️ Waktu: sekitar 15-20 menit

---

## 🚀 LANGKAH 1: Buat Project Baru di Supabase

### 1.1 Buka Supabase
1. Buka browser Anda (Chrome, Firefox, dll)
2. Pergi ke: **https://supabase.com**
3. Klik tombol **"Sign In"** di pojok kanan atas
4. Login dengan akun Anda

### 1.2 Buat Project Baru
1. Setelah login, Anda akan melihat dashboard
2. Klik tombol hijau **"New Project"** (atau "+ New Project")
3. Isi form seperti ini:
   - **Name**: `dku-adventure` (atau nama apa saja yang Anda suka)
   - **Database Password**: Buat password yang kuat (SIMPAN PASSWORD INI!)
     - Contoh: `DkuAdventure2024!` 
     - ⚠️ **PENTING**: Tulis password ini di notepad/kertas!
   - **Region**: Pilih **Southeast Asia (Singapore)** (paling dekat dengan Indonesia)
   - **Pricing Plan**: Pilih **Free** (gratis)
4. Klik tombol **"Create new project"**
5. Tunggu 2-3 menit sampai project selesai dibuat (ada loading bar)

---

## 🔑 LANGKAH 2: Ambil Informasi Koneksi Database

### CARA 1: Lewat Project Settings (Coba ini dulu)

#### 2.1 Buka Project Settings
1. Di dashboard Supabase, lihat menu di sebelah kiri
2. Klik icon **⚙️ Settings** (paling bawah)
3. Klik **"Database"** di menu Settings

#### 2.2 Cari Connection String
1. Scroll ke bawah sampai menemukan bagian **"Connection string"** atau **"Connection pooling"**
2. Jika ada beberapa tab, pilih tab **"URI"** atau **"Connection string"**
3. Anda akan melihat text panjang seperti ini:
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.xxxxxxxxxxxxx.supabase.co:5432/postgres
   ```
4. Klik tombol **"Copy"** di sebelah kanan text tersebut
5. Paste ke notepad dulu
6. **Lanjut ke Langkah 2.4**

---

### CARA 2: Lewat Connect Button (Jika Cara 1 tidak ketemu)

#### 2.3 Alternatif - Pakai Tombol Connect
1. Di dashboard Supabase, lihat bagian atas halaman
2. Cari dan klik tombol **"Connect"** (biasanya warna hijau/biru)
3. Akan muncul popup/modal
4. Pilih **"URI"** atau **"Connection String"** atau **"Postgres"**
5. Copy text yang muncul (biasanya dimulai dengan `postgresql://`)
6. Paste ke notepad

---

### 2.4 Ganti [YOUR-PASSWORD]
1. Di text yang Anda copy, cari tulisan `[YOUR-PASSWORD]`
2. Ganti dengan password yang Anda buat di Langkah 1.2
3. Contoh hasil akhir:
   ```
   postgresql://postgres:DkuAdventure2024!@db.xxxxxxxxxxxxx.supabase.co:5432/postgres
   ```
4. **SIMPAN INI!** Kita akan pakai sebentar lagi

---

### ⚠️ MASIH TIDAK KETEMU? Coba Cara Manual Ini:

Jika kedua cara di atas tidak berhasil, kita bisa buat connection string secara manual:

1. Di Supabase, buka **Settings** → **Database**
2. Cari informasi berikut (biasanya ada di bagian "Connection info"):
   - **Host**: (contoh: `db.xxxxxxxxxxxxx.supabase.co`)
   - **Database name**: (biasanya `postgres`)
   - **Port**: (biasanya `5432`)
   - **User**: (biasanya `postgres`)

3. Gabungkan menjadi format ini:
   ```
   postgresql://postgres:PASSWORD_ANDA@HOST:5432/postgres
   ```

4. Contoh lengkap:
   ```
   postgresql://postgres:DkuAdventure2024!@db.abcdefghijklmnop.supabase.co:5432/postgres
   ```

**Jika masih bingung, screenshot halaman Settings → Database Anda dan tanyakan ke saya!**

---

## 💾 LANGKAH 3: Masukkan Connection String ke Project

### 3.1 Buka File .env
1. Di Kiro, lihat panel sebelah kiri (File Explorer)
2. Cari file bernama **`.env`**
3. Klik file tersebut untuk membukanya

### 3.2 Edit File .env
1. Anda akan melihat baris seperti ini:
   ```
   DATABASE_URL="your-database-url-here"
   ```
2. Ganti `your-database-url-here` dengan connection string dari Langkah 2.3
3. Pastikan tetap ada tanda kutip `"` di awal dan akhir
4. Contoh hasil akhir:
   ```
   DATABASE_URL="postgresql://postgres:DkuAdventure2024!@db.xxxxxxxxxxxxx.supabase.co:5432/postgres"
   ```
5. Tekan **Ctrl + S** untuk save file

---

## 🗄️ LANGKAH 4: Buat Tabel di Database

Sekarang kita akan membuat tabel-tabel yang dibutuhkan aplikasi.

### 4.1 Buka Terminal di Kiro
1. Di Kiro, lihat menu atas
2. Klik **"Terminal"** → **"New Terminal"**
3. Akan muncul panel terminal di bawah

### 4.2 Install Dependencies
Ketik perintah ini di terminal (copy-paste saja):
```
npm install
```
Tekan **Enter** dan tunggu sampai selesai (1-2 menit)

### 4.3 Generate Prisma Client
Ketik perintah ini:
```
npx prisma generate
```
Tekan **Enter** dan tunggu sampai selesai

### 4.4 Buat Tabel di Database
Ketik perintah ini:
```
npx prisma db push
```
Tekan **Enter** dan tunggu sampai selesai

✅ Jika berhasil, Anda akan melihat pesan:
```
Your database is now in sync with your Prisma schema.
```

---

## ✅ LANGKAH 5: Verifikasi Setup Berhasil

### 5.1 Cek di Supabase Dashboard
1. Kembali ke browser (Supabase)
2. Di menu kiri, klik icon **📊 Table Editor**
3. Anda seharusnya melihat tabel-tabel baru:
   - User
   - Asset
   - Rental
   - Payment
   - Maintenance
   - Notification
   - AuditLog

### 5.2 Test Koneksi dari Kiro
Di terminal Kiro, ketik:
```
node verify-setup.js
```

✅ Jika berhasil, Anda akan melihat:
```
✓ Database connection successful
✓ All tables exist
```

---

## 🎉 SELESAI!

Database Supabase Anda sudah siap digunakan!

---

## ❓ Troubleshooting (Jika Ada Masalah)

### Masalah 1: "Error: P1001 Can't reach database server"
**Solusi:**
- Cek koneksi internet Anda
- Pastikan connection string di file `.env` sudah benar
- Pastikan tidak ada spasi di awal atau akhir connection string

### Masalah 2: "Authentication failed"
**Solusi:**
- Password di connection string salah
- Ulangi Langkah 2.3, pastikan password benar

### Masalah 3: "Command not found: npx"
**Solusi:**
- Node.js belum terinstall
- Download dan install Node.js dari: https://nodejs.org
- Pilih versi LTS (yang direkomendasikan)
- Restart Kiro setelah install

---

## 📞 Butuh Bantuan Lebih Lanjut?

Jika masih ada yang tidak jelas, tanyakan saja ke saya di chat ini! Saya akan bantu step by step.

Contoh pertanyaan yang bisa Anda tanyakan:
- "Saya tidak menemukan tombol New Project"
- "Error saat menjalankan npx prisma db push"
- "Connection string saya seperti ini: [paste connection string], apakah sudah benar?"

---

## 📝 Checklist

Centang setiap langkah yang sudah selesai:

- [ ] Buat project baru di Supabase
- [ ] Simpan database password
- [ ] Copy connection string
- [ ] Ganti [YOUR-PASSWORD] dengan password asli
- [ ] Edit file .env
- [ ] Jalankan npm install
- [ ] Jalankan npx prisma generate
- [ ] Jalankan npx prisma db push
- [ ] Verifikasi tabel sudah muncul di Supabase
- [ ] Test koneksi dengan verify-setup.js

---

**Dibuat khusus untuk pemula yang baru belajar coding! 💪**
