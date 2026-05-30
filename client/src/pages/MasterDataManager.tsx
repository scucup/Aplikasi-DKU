import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout';
import { Download, Edit2, Save, X, Search, Database, RefreshCw } from 'lucide-react';
import XLSX from 'xlsx-js-style';

// Table configurations
const TABLE_CONFIGS: Record<string, TableConfig> = {
  resorts: {
    label: 'Resorts',
    table: 'resorts',
    columns: ['id', 'name', 'company_name', 'contact_name', 'contact_email', 'contact_phone', 'address'],
    editableColumns: ['name', 'company_name', 'contact_name', 'contact_email', 'contact_phone', 'address'],
    displayHeaders: { id: 'ID', name: 'Nama Resort', company_name: 'Nama Perusahaan', contact_name: 'Kontak', contact_email: 'Email', contact_phone: 'Telepon', address: 'Alamat' },
  },
  assets: {
    label: 'Assets',
    table: 'assets',
    columns: ['id', 'name', 'category', 'resort_id', 'serial_number', 'purchase_date', 'purchase_cost', 'status'],
    editableColumns: ['name', 'category', 'serial_number', 'purchase_date', 'purchase_cost', 'status'],
    displayHeaders: { id: 'ID', name: 'Nama Asset', category: 'Kategori', resort_id: 'Resort', serial_number: 'Serial Number', purchase_date: 'Tgl Beli', purchase_cost: 'Harga Beli', status: 'Status' },
    selectOptions: { category: ['ATV', 'UTV', 'SEA_SPORT', 'POOL_TOYS', 'LINE_SPORT'], status: ['ACTIVE', 'MAINTENANCE', 'RETIRED'] },
  },
  revenue_records: {
    label: 'Revenue',
    table: 'revenue_records',
    columns: ['id', 'resort_id', 'asset_category', 'date', 'amount', 'discount', 'discount_percentage', 'tax_service', 'tax_service_percentage', 'billing_no'],
    editableColumns: ['asset_category', 'date', 'amount', 'discount', 'discount_percentage', 'tax_service', 'tax_service_percentage', 'billing_no'],
    displayHeaders: { id: 'ID', resort_id: 'Resort', asset_category: 'Kategori', date: 'Tanggal', amount: 'Jumlah', discount: 'Diskon', discount_percentage: 'Diskon %', tax_service: 'Pajak/Service', tax_service_percentage: 'Pajak %', billing_no: 'No. Billing' },
    selectOptions: { asset_category: ['ATV', 'UTV', 'SEA_SPORT', 'POOL_TOYS', 'LINE_SPORT'] },
  },
  expenses: {
    label: 'Expenses',
    table: 'expenses',
    columns: ['id', 'category', 'description', 'amount', 'date', 'status', 'resort_id', 'supplier'],
    editableColumns: ['category', 'description', 'amount', 'date', 'status', 'supplier'],
    displayHeaders: { id: 'ID', category: 'Kategori', description: 'Deskripsi', amount: 'Jumlah', date: 'Tanggal', status: 'Status', resort_id: 'Resort', supplier: 'Supplier' },
    selectOptions: { category: ['OPERATIONAL', 'PERSONNEL', 'MARKETING', 'SPAREPART', 'SALARY', 'BUSINESS_TRAVEL', 'OTHER', 'SERVICE', 'TOOLS', 'FUEL', 'BANK_INSTALLMENT', 'UTILITY', 'TAX', 'BPJS', 'ASSET', 'ZAKAT'], status: ['PENDING', 'APPROVED', 'REJECTED'] },
  },
  invoices: {
    label: 'Invoices',
    table: 'invoices',
    columns: ['id', 'invoice_number', 'resort_id', 'start_date', 'end_date', 'total_revenue', 'dku_share', 'resort_share', 'status', 'invoice_type'],
    editableColumns: ['invoice_number', 'start_date', 'end_date', 'total_revenue', 'dku_share', 'resort_share', 'status', 'invoice_type'],
    displayHeaders: { id: 'ID', invoice_number: 'No. Invoice', resort_id: 'Resort', start_date: 'Tgl Mulai', end_date: 'Tgl Akhir', total_revenue: 'Total Revenue', dku_share: 'DKU Share', resort_share: 'Resort Share', status: 'Status', invoice_type: 'Tipe' },
    selectOptions: { status: ['DRAFT', 'SENT', 'PAID'], invoice_type: ['RENTAL', 'CUSTOM'] },
  },
  maintenance_records: {
    label: 'Maintenance',
    table: 'maintenance_records',
    columns: ['id', 'asset_id', 'maintenance_type', 'description', 'start_date', 'end_date', 'cost', 'status', 'notes'],
    editableColumns: ['maintenance_type', 'description', 'start_date', 'end_date', 'cost', 'status', 'notes'],
    displayHeaders: { id: 'ID', asset_id: 'Asset', maintenance_type: 'Tipe', description: 'Deskripsi', start_date: 'Tgl Mulai', end_date: 'Tgl Selesai', cost: 'Biaya', status: 'Status', notes: 'Catatan' },
    selectOptions: { maintenance_type: ['PREVENTIVE', 'CORRECTIVE', 'INSPECTION'], status: ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'] },
  },
  sparepart_inventory: {
    label: 'Sparepart Inventory',
    table: 'sparepart_inventory',
    columns: ['id', 'sparepart_name', 'asset_category', 'resort_id', 'current_stock', 'unit', 'last_unit_price', 'last_supplier'],
    editableColumns: ['sparepart_name', 'asset_category', 'current_stock', 'unit', 'last_unit_price', 'last_supplier'],
    displayHeaders: { id: 'ID', sparepart_name: 'Nama Sparepart', asset_category: 'Kategori Asset', resort_id: 'Resort', current_stock: 'Stok', unit: 'Satuan', last_unit_price: 'Harga Terakhir', last_supplier: 'Supplier Terakhir' },
  },
  tools: {
    label: 'Tools',
    table: 'tools',
    columns: ['id', 'name', 'category', 'brand', 'model', 'serial_number', 'resort_id', 'condition', 'purchase_date', 'purchase_price', 'supplier'],
    editableColumns: ['name', 'category', 'brand', 'model', 'serial_number', 'condition', 'purchase_date', 'purchase_price', 'supplier'],
    displayHeaders: { id: 'ID', name: 'Nama Tool', category: 'Kategori', brand: 'Merk', model: 'Model', serial_number: 'Serial Number', resort_id: 'Resort', condition: 'Kondisi', purchase_date: 'Tgl Beli', purchase_price: 'Harga', supplier: 'Supplier' },
    selectOptions: { category: ['Hand Tools', 'Power Tools', 'Diagnostic Equipment', 'Safety Equipment', 'Measuring Tools', 'Other'], condition: ['good', 'fair', 'poor', 'damaged', 'lost'] },
  },
  profit_sharing_configs: {
    label: 'Profit Sharing',
    table: 'profit_sharing_configs',
    columns: ['id', 'resort_id', 'asset_category', 'dku_percentage', 'resort_percentage', 'effective_from'],
    editableColumns: ['asset_category', 'dku_percentage', 'resort_percentage', 'effective_from'],
    displayHeaders: { id: 'ID', resort_id: 'Resort', asset_category: 'Kategori', dku_percentage: 'DKU %', resort_percentage: 'Resort %', effective_from: 'Berlaku Dari' },
    selectOptions: { asset_category: ['ATV', 'UTV', 'SEA_SPORT', 'POOL_TOYS', 'LINE_SPORT'] },
  },
  users: {
    label: 'Users',
    table: 'users',
    columns: ['id', 'email', 'name', 'role', 'created_at'],
    editableColumns: ['name', 'role'],
    displayHeaders: { id: 'ID', email: 'Email', name: 'Nama', role: 'Role', created_at: 'Dibuat' },
    selectOptions: { role: ['ENGINEER', 'ADMIN', 'MANAGER'] },
  },
};

interface TableConfig {
  label: string;
  table: string;
  columns: string[];
  editableColumns: string[];
  displayHeaders: Record<string, string>;
  selectOptions?: Record<string, string[]>;
}

interface Resort {
  id: string;
  name: string;
}

export default function MasterDataManager() {
  const { profile } = useAuth();
  const [activeTable, setActiveTable] = useState<string>('resorts');
  const [data, setData] = useState<any[]>([]);
  const [resorts, setResorts] = useState<Resort[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingRow, setEditingRow] = useState<string | null>(null);
  const [editData, setEditData] = useState<Record<string, any>>({});
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const pageSize = 50;

  // Access check
  if (profile?.role !== 'MANAGER') {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-white mb-2">Akses Ditolak</h2>
            <p className="text-slate-400">Halaman ini hanya dapat diakses oleh Manager.</p>
          </div>
        </div>
      </Layout>
    );
  }

  const config = TABLE_CONFIGS[activeTable];

  const fetchResorts = useCallback(async () => {
    const { data } = await supabase.from('resorts').select('id, name').order('name');
    setResorts(data || []);
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const from = page * pageSize;
      const to = from + pageSize - 1;

      // Get count
      const { count } = await supabase
        .from(config.table)
        .select('*', { count: 'exact', head: true });
      setTotalCount(count || 0);

      // Get data
      const { data: result, error } = await supabase
        .from(config.table)
        .select(config.columns.join(', '))
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;
      setData(result || []);
    } catch (error: any) {
      console.error('Error fetching data:', error);
      setMessage({ type: 'error', text: `Gagal memuat data: ${error.message}` });
    } finally {
      setLoading(false);
    }
  }, [activeTable, page, config]);

  useEffect(() => {
    fetchResorts();
  }, [fetchResorts]);

  useEffect(() => {
    setPage(0);
    setEditingRow(null);
    setSearchTerm('');
  }, [activeTable]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const getResortName = (resortId: string) => {
    const resort = resorts.find(r => r.id === resortId);
    return resort?.name || resortId;
  };

  const handleEdit = (row: any) => {
    setEditingRow(row.id);
    setEditData({ ...row });
  };

  const handleCancelEdit = () => {
    setEditingRow(null);
    setEditData({});
  };

  const handleSave = async () => {
    if (!editingRow) return;
    setSaving(true);
    try {
      const updates: Record<string, any> = {};
      config.editableColumns.forEach(col => {
        if (editData[col] !== undefined) {
          updates[col] = editData[col] === '' ? null : editData[col];
        }
      });
      updates.updated_at = new Date().toISOString();

      const { error } = await supabase
        .from(config.table)
        .update(updates)
        .eq('id', editingRow);

      if (error) throw error;

      setMessage({ type: 'success', text: 'Data berhasil diperbarui!' });
      setEditingRow(null);
      setEditData({});
      fetchData();
    } catch (error: any) {
      console.error('Error saving:', error);
      setMessage({ type: 'error', text: `Gagal menyimpan: ${error.message}` });
    } finally {
      setSaving(false);
    }
  };

  const buildStyledSheet = (tableConfig: TableConfig, allData: any[], resortsList: Resort[]) => {
    const getResortNameLocal = (resortId: string) => {
      const resort = resortsList.find(r => r.id === resortId);
      return resort?.name || resortId;
    };

    const ws: XLSX.WorkSheet = {};
    const headers = ['No', ...tableConfig.columns.filter(c => c !== 'id').map(col => tableConfig.displayHeaders[col] || col)];
    const colCount = headers.length;

    // Title style
    const titleStyle = { font: { bold: true, sz: 16, color: { rgb: '1F4E79' } }, alignment: { horizontal: 'center' as const, vertical: 'center' as const } };
    const subtitleStyle = { font: { sz: 11, color: { rgb: '444444' } }, alignment: { horizontal: 'center' as const, vertical: 'center' as const } };
    const headerStyle = {
      font: { bold: true, sz: 11, color: { rgb: 'FFFFFF' } },
      fill: { fgColor: { rgb: '1F4E79' } },
      alignment: { horizontal: 'center' as const, vertical: 'center' as const, wrapText: true },
      border: {
        top: { style: 'thin' as const, color: { rgb: '1F4E79' } },
        bottom: { style: 'thin' as const, color: { rgb: '1F4E79' } },
        left: { style: 'thin' as const, color: { rgb: '1F4E79' } },
        right: { style: 'thin' as const, color: { rgb: '1F4E79' } },
      },
    };
    const cellStyleEven = {
      font: { sz: 10 },
      alignment: { vertical: 'center' as const, wrapText: true },
      border: {
        top: { style: 'thin' as const, color: { rgb: 'D9E2F3' } },
        bottom: { style: 'thin' as const, color: { rgb: 'D9E2F3' } },
        left: { style: 'thin' as const, color: { rgb: 'D9E2F3' } },
        right: { style: 'thin' as const, color: { rgb: 'D9E2F3' } },
      },
    };
    const cellStyleOdd = {
      ...cellStyleEven,
      fill: { fgColor: { rgb: 'F2F7FC' } },
    };

    // Row 1: Title
    const title = `Data ${tableConfig.label} - DKU Adventure`;
    ws['A1'] = { v: title, s: titleStyle };

    // Row 2: Date
    const dateStr = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    ws['A2'] = { v: `Tanggal Export: ${dateStr}`, s: subtitleStyle };

    // Row 3: Total
    ws['A3'] = { v: `Total Data: ${allData.length} records`, s: subtitleStyle };

    // Row 4: Empty
    // Row 5: Headers (row index 4)
    const headerRowIdx = 4;
    headers.forEach((header, colIdx) => {
      const cellRef = XLSX.utils.encode_cell({ r: headerRowIdx, c: colIdx });
      ws[cellRef] = { v: header, s: headerStyle };
    });

    // Data rows starting from row 6 (index 5)
    allData.forEach((row: any, rowIdx: number) => {
      const dataRowIdx = headerRowIdx + 1 + rowIdx;
      const style = rowIdx % 2 === 0 ? cellStyleEven : cellStyleOdd;
      const cols = tableConfig.columns.filter(c => c !== 'id');

      // No column
      const noRef = XLSX.utils.encode_cell({ r: dataRowIdx, c: 0 });
      ws[noRef] = { v: rowIdx + 1, s: { ...style, alignment: { horizontal: 'center' as const, vertical: 'center' as const } } };

      cols.forEach((col, colIdx) => {
        const cellRef = XLSX.utils.encode_cell({ r: dataRowIdx, c: colIdx + 1 });
        let value = row[col];

        // Resolve resort_id to name
        if (col === 'resort_id' && value) {
          value = getResortNameLocal(value);
        }

        // Format numbers as currency
        if (value !== null && value !== undefined && (col.includes('cost') || col.includes('amount') || col.includes('price') || col === 'dku_share' || col === 'resort_share' || col === 'total_revenue' || col === 'discount' || col === 'tax_service')) {
          ws[cellRef] = { v: Number(value), t: 'n', s: { ...style, numFmt: '#,##0' } };
        } else if (value !== null && value !== undefined && col.includes('percentage')) {
          ws[cellRef] = { v: Number(value), t: 'n', s: { ...style, alignment: { horizontal: 'center' as const, vertical: 'center' as const } } };
        } else {
          ws[cellRef] = { v: value ?? '', s: style };
        }
      });
    });

    // Set range
    const lastRow = headerRowIdx + allData.length;
    ws['!ref'] = XLSX.utils.encode_range({ s: { r: 0, c: 0 }, e: { r: lastRow, c: colCount - 1 } });

    // Merge title rows
    ws['!merges'] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: colCount - 1 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: colCount - 1 } },
      { s: { r: 2, c: 0 }, e: { r: 2, c: colCount - 1 } },
    ];

    // Column widths - calculate based on content
    const colWidths = headers.map((header, idx) => {
      let maxLen = header.length;
      if (idx === 0) return { wch: 5 }; // No column
      allData.forEach((row: any) => {
        const cols = tableConfig.columns.filter(c => c !== 'id');
        const col = cols[idx - 1];
        let val = row[col];
        if (col === 'resort_id' && val) val = getResortNameLocal(val);
        const len = String(val ?? '').length;
        if (len > maxLen) maxLen = len;
      });
      return { wch: Math.min(Math.max(maxLen + 2, 12), 35) };
    });
    ws['!cols'] = colWidths;

    // Row heights
    const rowHeights: { hpt: number }[] = [];
    rowHeights[0] = { hpt: 24 }; // Title
    rowHeights[1] = { hpt: 18 }; // Date
    rowHeights[2] = { hpt: 18 }; // Total
    rowHeights[headerRowIdx] = { hpt: 22 }; // Header
    ws['!rows'] = rowHeights;

    // Auto filter on header row
    ws['!autofilter'] = { ref: XLSX.utils.encode_range({ s: { r: headerRowIdx, c: 0 }, e: { r: lastRow, c: colCount - 1 } }) };

    return ws;
  };

  const handleExportExcel = async () => {
    try {
      setMessage({ type: 'success', text: 'Mengunduh data...' });

      // Fetch all data for export
      const { data: allData, error } = await supabase
        .from(config.table)
        .select(config.columns.join(', '))
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (!allData || allData.length === 0) {
        setMessage({ type: 'error', text: 'Tidak ada data untuk diunduh.' });
        return;
      }

      const wb = XLSX.utils.book_new();
      const ws = buildStyledSheet(config, allData, resorts);
      XLSX.utils.book_append_sheet(wb, ws, config.label);
      XLSX.writeFile(wb, `${config.label}_${new Date().toISOString().split('T')[0]}.xlsx`);
      setMessage({ type: 'success', text: 'Data berhasil diunduh!' });
    } catch (error: any) {
      console.error('Error exporting:', error);
      setMessage({ type: 'error', text: `Gagal mengunduh: ${error.message}` });
    }
  };

  const handleExportAll = async () => {
    try {
      setMessage({ type: 'success', text: 'Mengunduh semua data...' });
      const wb = XLSX.utils.book_new();

      // Fetch resorts first for name resolution
      const { data: resortsData } = await supabase.from('resorts').select('id, name').order('name');
      const resortsList: Resort[] = resortsData || [];

      for (const [_key, tableConfig] of Object.entries(TABLE_CONFIGS)) {
        const { data: allData, error } = await supabase
          .from(tableConfig.table)
          .select(tableConfig.columns.join(', '))
          .order('created_at', { ascending: false });

        if (error) {
          console.error(`Error fetching ${tableConfig.label}:`, error);
          continue;
        }

        const ws = buildStyledSheet(tableConfig, allData || [], resortsList);
        XLSX.utils.book_append_sheet(wb, ws, tableConfig.label.substring(0, 31));
      }

      XLSX.writeFile(wb, `All_Data_DKU_${new Date().toISOString().split('T')[0]}.xlsx`);
      setMessage({ type: 'success', text: 'Semua data berhasil diunduh!' });
    } catch (error: any) {
      console.error('Error exporting all:', error);
      setMessage({ type: 'error', text: `Gagal mengunduh: ${error.message}` });
    }
  };

  const filteredData = data.filter(row => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return config.columns.some(col => {
      const val = row[col];
      if (val === null || val === undefined) return false;
      if (col === 'resort_id') return getResortName(val).toLowerCase().includes(term);
      return String(val).toLowerCase().includes(term);
    });
  });

  const formatCellValue = (col: string, value: any) => {
    if (value === null || value === undefined) return '-';
    if (col === 'resort_id') return getResortName(value);
    if (col.includes('cost') || col.includes('amount') || col.includes('price') || col === 'dku_share' || col === 'resort_share' || col === 'total_revenue' || col === 'discount' || col === 'tax_service') {
      return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(Number(value));
    }
    if (col.includes('date') || col === 'effective_from') {
      return new Date(value).toLocaleDateString('id-ID');
    }
    if (col.includes('percentage')) return `${value}%`;
    return String(value);
  };

  const renderEditField = (col: string) => {
    const value = editData[col] ?? '';
    const options = config.selectOptions?.[col];

    if (options) {
      return (
        <select
          value={value}
          onChange={(e) => setEditData({ ...editData, [col]: e.target.value })}
          className="w-full bg-navy-700 border border-navy-500 rounded px-2 py-1 text-white text-xs"
        >
          <option value="">-- Pilih --</option>
          {options.map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      );
    }

    if (col.includes('date') || col === 'effective_from') {
      return (
        <input
          type="date"
          value={value || ''}
          onChange={(e) => setEditData({ ...editData, [col]: e.target.value })}
          className="w-full bg-navy-700 border border-navy-500 rounded px-2 py-1 text-white text-xs"
        />
      );
    }

    if (col.includes('cost') || col.includes('amount') || col.includes('price') || col.includes('percentage') || col === 'current_stock' || col === 'dku_share' || col === 'resort_share' || col === 'total_revenue' || col === 'discount' || col === 'tax_service') {
      return (
        <input
          type="number"
          value={value || ''}
          onChange={(e) => setEditData({ ...editData, [col]: e.target.value })}
          className="w-full bg-navy-700 border border-navy-500 rounded px-2 py-1 text-white text-xs"
          step="any"
        />
      );
    }

    return (
      <input
        type="text"
        value={value || ''}
        onChange={(e) => setEditData({ ...editData, [col]: e.target.value })}
        className="w-full bg-navy-700 border border-navy-500 rounded px-2 py-1 text-white text-xs"
      />
    );
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Database className="w-7 h-7 text-blue-400" />
              Master Data Manager
            </h1>
            <p className="text-slate-400 text-sm mt-1">Edit dan kelola semua data langsung dari aplikasi</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={handleExportAll}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
            >
              <Download className="w-4 h-4" />
              Export Semua
            </button>
          </div>
        </div>

        {/* Message */}
        {message && (
          <div className={`px-4 py-3 rounded-lg text-sm font-medium ${message.type === 'success' ? 'bg-green-600/20 text-green-400 border border-green-600/30' : 'bg-red-600/20 text-red-400 border border-red-600/30'}`}>
            {message.text}
          </div>
        )}

        {/* Table Tabs */}
        <div className="bg-navy-900 rounded-xl border border-navy-700/50 overflow-hidden">
          <div className="flex overflow-x-auto border-b border-navy-700/50 scrollbar-thin">
            {Object.entries(TABLE_CONFIGS).map(([key, cfg]) => (
              <button
                key={key}
                onClick={() => setActiveTable(key)}
                className={`px-4 py-3 text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${
                  activeTable === key
                    ? 'text-blue-400 border-blue-400 bg-navy-800/50'
                    : 'text-slate-400 border-transparent hover:text-white hover:bg-navy-800/30'
                }`}
              >
                {cfg.label}
              </button>
            ))}
          </div>

          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 border-b border-navy-700/50">
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari data..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-navy-800 border border-navy-600/50 rounded-lg text-white text-sm placeholder-slate-400 focus:outline-none focus:border-blue-500"
                />
              </div>
              <button
                onClick={fetchData}
                className="p-2 bg-navy-800 border border-navy-600/50 rounded-lg text-slate-400 hover:text-white transition-colors"
                title="Refresh"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">{totalCount} total data</span>
              <button
                onClick={handleExportExcel}
                className="flex items-center gap-2 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-medium transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                Export {config.label}
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              </div>
            ) : filteredData.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <Database className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Tidak ada data ditemukan</p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-navy-800/50">
                    <th className="px-3 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider">No</th>
                    {config.columns.filter(c => c !== 'id').map(col => (
                      <th key={col} className="px-3 py-3 text-left text-xs font-semibold text-slate-300 uppercase tracking-wider whitespace-nowrap">
                        {config.displayHeaders[col] || col}
                      </th>
                    ))}
                    <th className="px-3 py-3 text-center text-xs font-semibold text-slate-300 uppercase tracking-wider">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-navy-700/50">
                  {filteredData.map((row, index) => (
                    <tr key={row.id} className="hover:bg-navy-800/30 transition-colors">
                      <td className="px-3 py-2.5 text-slate-400 text-xs">{page * pageSize + index + 1}</td>
                      {config.columns.filter(c => c !== 'id').map(col => (
                        <td key={col} className="px-3 py-2.5 text-white text-xs max-w-[200px]">
                          {editingRow === row.id && config.editableColumns.includes(col) ? (
                            renderEditField(col)
                          ) : (
                            <span className="truncate block" title={String(row[col] ?? '')}>
                              {formatCellValue(col, row[col])}
                            </span>
                          )}
                        </td>
                      ))}
                      <td className="px-3 py-2.5 text-center">
                        {editingRow === row.id ? (
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={handleSave}
                              disabled={saving}
                              className="p-1.5 bg-green-600 hover:bg-green-700 text-white rounded transition-colors disabled:opacity-50"
                              title="Simpan"
                            >
                              <Save className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              className="p-1.5 bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
                              title="Batal"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleEdit(row)}
                            className="p-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
                            title="Edit"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-navy-700/50">
              <p className="text-xs text-slate-400">
                Menampilkan {page * pageSize + 1} - {Math.min((page + 1) * pageSize, totalCount)} dari {totalCount}
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPage(Math.max(0, page - 1))}
                  disabled={page === 0}
                  className="px-3 py-1.5 bg-navy-800 border border-navy-600/50 rounded text-xs text-slate-300 hover:bg-navy-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Prev
                </button>
                <span className="px-3 py-1.5 text-xs text-slate-400">
                  {page + 1} / {totalPages}
                </span>
                <button
                  onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                  disabled={page >= totalPages - 1}
                  className="px-3 py-1.5 bg-navy-800 border border-navy-600/50 rounded text-xs text-slate-300 hover:bg-navy-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
