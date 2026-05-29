import { useEffect, useState, useMemo, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout';
import { fetchAllRevenueRecords, fetchProfitConfigs, processRevenueWithProfitSharing } from '../lib/profitSharing';

type AssetCategory = 'ATV' | 'UTV' | 'SEA_SPORT' | 'POOL_TOYS' | 'LINE_SPORT';

interface RevenueRecord {
  id: string;
  resort_id: string;
  asset_category: AssetCategory;
  date: string;
  billing_no: string | null;
  amount: number;
  discount: number;
  discount_percentage: number;
  discount_type: 'PERCENTAGE' | 'FIXED_AMOUNT';
  tax_service: number;
  tax_service_percentage: number;
  tax_service_type: 'PERCENTAGE' | 'FIXED_AMOUNT';
  recorded_by: string;
  resort?: { name: string };
  dku_percentage?: number;
  dku_share?: number;
}

export default function Revenue() {
  const { user, profile } = useAuth();
  const [records, setRecords] = useState<RevenueRecord[]>([]);
  const [resorts, setResorts] = useState<any[]>([]);
  const [availableCategories, setAvailableCategories] = useState<AssetCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState<RevenueRecord | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [selectedResort, setSelectedResort] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [formData, setFormData] = useState({
    resort_id: '',
    asset_category: '' as AssetCategory | '',
    date: new Date().toISOString().split('T')[0],
    billing_no: '',
    amount: '',
    discount_type: 'PERCENTAGE' as 'PERCENTAGE' | 'FIXED_AMOUNT',
    discount_value: '',
    tax_service_type: 'PERCENTAGE' as 'PERCENTAGE' | 'FIXED_AMOUNT',
    tax_service_value: '',
  });

  const canCreate = profile?.role === 'ADMIN' || profile?.role === 'MANAGER';

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    // Fetch all initial data in parallel
    Promise.all([fetchRecords(), fetchResorts()]);
  }, []);

  const fetchResorts = async () => {
    const { data } = await supabase.from('resorts').select('id, name');
    setResorts(data || []);
  };

  const fetchAvailableCategories = async (resortId: string) => {
    if (!resortId) {
      setAvailableCategories([]);
      return;
    }

    try {
      // Fetch profit sharing configs for the selected resort
      const { data, error } = await supabase
        .from('profit_sharing_configs')
        .select('asset_category')
        .eq('resort_id', resortId);

      if (error) throw error;

      // Remove duplicates using Set (for resorts with multiple configs per category)
      const categories = data?.map(config => config.asset_category) || [];
      const uniqueCategories = [...new Set(categories)];
      setAvailableCategories(uniqueCategories as AssetCategory[]);
      
      // Reset asset_category if current selection is not available
      if (formData.asset_category && !uniqueCategories.includes(formData.asset_category)) {
        setFormData(prev => ({ ...prev, asset_category: '' }));
      }
    } catch (error) {
      console.error('Error fetching available categories:', error);
      setAvailableCategories([]);
    }
  };

  const fetchRecords = async () => {
    try {
      // Fetch revenue records and profit configs in PARALLEL for faster loading
      const [allRecords, profitConfigs] = await Promise.all([
        fetchAllRevenueRecords(supabase),
        fetchProfitConfigs(supabase),
      ]);
      const recordsWithSharing = processRevenueWithProfitSharing(allRecords, profitConfigs);
      setRecords(recordsWithSharing);
    } catch (error) {
      console.error('Error fetching revenue records:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (record: RevenueRecord) => {
    setEditingRecord(record);
    const taxServiceType = record.tax_service_type || 'PERCENTAGE';
    const taxServiceValue = taxServiceType === 'PERCENTAGE' 
      ? (record.tax_service_percentage?.toString() || '')
      : (record.tax_service?.toString() || '');
    
    const discountType = record.discount_type || 'PERCENTAGE';
    const discountValue = discountType === 'PERCENTAGE'
      ? (record.discount_percentage?.toString() || '')
      : (record.discount?.toString() || '');
    
    setFormData({
      resort_id: record.resort_id,
      asset_category: record.asset_category,
      date: record.date,
      billing_no: record.billing_no || '',
      amount: record.amount.toString(),
      discount_type: discountType,
      discount_value: discountValue,
      tax_service_type: taxServiceType,
      tax_service_value: taxServiceValue,
    });
    fetchAvailableCategories(record.resort_id);
    setShowModal(true);
  };

  const handleDelete = async (recordId: string, billingNo: string) => {
    try {
      // Konfirmasi sebelum menghapus
      const isConfirmed = window.confirm(
        `Are you sure you want to delete revenue record "${billingNo || 'No Billing Number'}"?\n\nThis action cannot be undone.`
      );
      
      if (!isConfirmed) {
        return;
      }
      
      setDeletingId(recordId);
      
      // Hapus dari database
      const { error } = await supabase
        .from('revenue_records')
        .delete()
        .eq('id', recordId);
      
      if (error) {
        console.error('Database error:', error);
        throw new Error(`Failed to delete record: ${error.message}`);
      }
      
      // Refresh data setelah berhasil delete
      await fetchRecords();
      alert('Revenue record deleted successfully!');
      
    } catch (error) {
      console.error('Error deleting revenue record:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      alert(`Error: ${errorMessage}`);
    } finally {
      setDeletingId(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const amount = parseFloat(formData.amount);
      
      // Calculate discount based on type
      // Amount already includes discount, so extract discount portion: amount / (1 + rate) * rate
      let discountAmount = 0;
      let discountPercentage = 0;
      
      if (formData.discount_value) {
        const discountValue = parseFloat(formData.discount_value);
        if (formData.discount_type === 'PERCENTAGE') {
          discountPercentage = discountValue;
          // Simple percentage calculation for all resorts
          discountAmount = amount * (discountValue / 100);
        } else {
          // FIXED_AMOUNT
          discountAmount = discountValue;
          discountPercentage = amount > 0 ? (discountValue / amount) * 100 : 0;
        }
      }
      
      const amountAfterDiscount = amount - discountAmount;
      
      // Calculate tax & service based on type
      let taxServiceAmount = 0;
      let taxServicePercentage = 0;
      
      if (formData.tax_service_value) {
        const taxServiceValue = parseFloat(formData.tax_service_value);
        if (formData.tax_service_type === 'PERCENTAGE') {
          taxServicePercentage = taxServiceValue;
          // Calculate from amount after discount for all resorts
          taxServiceAmount = amountAfterDiscount / (1 + taxServiceValue / 100) * (taxServiceValue / 100);
        } else {
          // FIXED_AMOUNT
          taxServiceAmount = taxServiceValue;
          taxServicePercentage = amountAfterDiscount > 0 ? (taxServiceValue / amountAfterDiscount) * 100 : 0;
        }
      }

      const recordData = {
        resort_id: formData.resort_id,
        asset_category: formData.asset_category,
        date: formData.date,
        billing_no: formData.billing_no || null,
        amount: amount,
        discount_type: formData.discount_type,
        discount_percentage: discountPercentage,
        discount: discountAmount,
        tax_service_type: formData.tax_service_type,
        tax_service_percentage: taxServicePercentage,
        tax_service: taxServiceAmount,
      };

      if (editingRecord) {
        // Update existing record
        const { error } = await supabase
          .from('revenue_records')
          .update(recordData)
          .eq('id', editingRecord.id);

        if (error) throw error;
      } else {
        // Create new record
        const { error } = await supabase.from('revenue_records').insert([
          {
            id: crypto.randomUUID(),
            ...recordData,
            recorded_by: user?.id,
          },
        ]);

        if (error) throw error;
      }

      setShowModal(false);
      setEditingRecord(null);
      setFormData({
        resort_id: '',
        asset_category: '',
        date: new Date().toISOString().split('T')[0],
        billing_no: '',
        amount: '',
        discount_type: 'PERCENTAGE',
        discount_value: '',
        tax_service_type: 'PERCENTAGE',
        tax_service_value: '',
      });
      setAvailableCategories([]);
      fetchRecords();
    } catch (error: any) {
      alert(`Error ${editingRecord ? 'updating' : 'creating'} revenue record: ` + error.message);
    }
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingRecord(null);
    setFormData({
      resort_id: '',
      asset_category: '',
      date: new Date().toISOString().split('T')[0],
      billing_no: '',
      amount: '',
      discount_type: 'PERCENTAGE',
      discount_value: '',
      tax_service_type: 'PERCENTAGE',
      tax_service_value: '',
    });
    setAvailableCategories([]);
  };

  // Filter function to be used for both table and summary - memoized
  const filterRecords = useCallback((record: RevenueRecord) => {
    const billingNo = record.billing_no || '';
    const search = debouncedSearchTerm.toLowerCase();
    const matchesSearch = billingNo.toLowerCase().includes(search);
    
    // Resort filtering
    const matchesResort = selectedResort === 'all' || record.resort_id === selectedResort;
    
    // Category filtering
    const matchesCategory = selectedCategory === 'all' || record.asset_category === selectedCategory;
    
    // Date filtering
    let matchesDate = true;
    if (startDate || endDate) {
      const recordDate = new Date(record.date);
      if (startDate) {
        matchesDate = matchesDate && recordDate >= new Date(startDate);
      }
      if (endDate) {
        matchesDate = matchesDate && recordDate <= new Date(endDate);
      }
    }
    
    return matchesSearch && matchesResort && matchesCategory && matchesDate;
  }, [debouncedSearchTerm, selectedResort, selectedCategory, startDate, endDate]);

  // Get filtered records - memoized
  const filteredRecords = useMemo(() => {
    return records.filter(filterRecords);
  }, [records, filterRecords]);

  // Check if any filter is active
  const isFilterActive = debouncedSearchTerm || selectedResort !== 'all' || selectedCategory !== 'all' || startDate || endDate;

  // Calculate totals based on filtered records - memoized
  const statistics = useMemo(() => {
    const totalRevenue = filteredRecords.reduce((sum, record) => sum + Number(record.amount), 0);
    const totalNetAmount = filteredRecords.reduce((sum, record) => {
      const netAmount = Number(record.amount) - (Number(record.discount) || 0) - (Number(record.tax_service) || 0);
      return sum + netAmount;
    }, 0);
    const totalDkuShare = filteredRecords.reduce((sum, record) => {
      const dkuShare = record.dku_share || 0;
      return sum + Number(dkuShare);
    }, 0);

    return {
      totalRevenue,
      totalNetAmount,
      totalDkuShare,
      count: filteredRecords.length
    };
  }, [filteredRecords]);

  return (
    <Layout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h1 className="text-xl font-bold text-white">Revenue</h1>
            <p className="text-xs text-slate-400">Track all revenue records</p>
          </div>
          {canCreate && (
            <button
              onClick={() => setShowModal(true)}
              className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all text-sm font-medium"
            >
              + Add Revenue
            </button>
          )}
        </div>

        {/* Statistics Cards - Compact */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="bg-navy-900 rounded-xl p-4 border border-navy-700/50">
            <div className="text-xs text-slate-400 font-medium mb-1 uppercase tracking-wider">
              Total Revenue {isFilterActive && <span className="text-yellow-400">(Filtered)</span>}
            </div>
            <div className="text-lg font-bold text-white whitespace-nowrap">
              Rp{'\u00A0'}{statistics.totalRevenue.toLocaleString('id-ID')}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              {statistics.count} records {isFilterActive && `of ${records.length}`}
            </div>
          </div>
          <div className="bg-navy-900 rounded-xl p-4 border border-navy-700/50">
            <div className="text-xs text-slate-400 font-medium mb-1 uppercase tracking-wider">
              Net Amount {isFilterActive && <span className="text-yellow-400">(Filtered)</span>}
            </div>
            <div className="text-lg font-bold text-white whitespace-nowrap">
              Rp{'\u00A0'}{statistics.totalNetAmount.toLocaleString('id-ID')}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              After discount & tax
            </div>
          </div>
          <div className="bg-navy-900 rounded-xl p-4 border border-navy-700/50">
            <div className="text-xs text-slate-400 font-medium mb-1 uppercase tracking-wider">
              DKU Share {isFilterActive && <span className="text-yellow-400">(Filtered)</span>}
            </div>
            <div className="text-lg font-bold text-emerald-400 whitespace-nowrap">
              Rp{'\u00A0'}{statistics.totalDkuShare.toLocaleString('id-ID')}
            </div>
            <div className="text-[11px] text-slate-500 mt-1">
              Profit sharing
            </div>
          </div>
        </div>

        {!canCreate && (
          <div className="p-3 bg-yellow-900/20 border border-yellow-600/30 rounded-lg">
            <p className="text-xs text-yellow-300">
              You don't have permission to create revenue records. Only ADMIN and MANAGER can create.
            </p>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-navy-600 border-t-blue-500"></div>
          </div>
        ) : (
          <div className="bg-navy-900 rounded-xl border border-navy-700/50 overflow-hidden">
            {/* Compact Filters */}
            <div className="p-4 border-b border-navy-700/50">
              <div className="flex flex-wrap gap-2 items-center">
                <div className="relative flex-1 min-w-[180px] max-w-[240px]">
                  <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Search billing no..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 bg-navy-800 border border-navy-600/50 rounded-lg text-white text-sm placeholder-slate-500 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <select
                  value={selectedResort}
                  onChange={(e) => setSelectedResort(e.target.value)}
                  className="px-3 py-1.5 bg-navy-800 border border-navy-600/50 rounded-lg text-white text-sm focus:ring-1 focus:ring-blue-500"
                >
                  <option value="all">All Resorts</option>
                  {resorts.map(resort => (
                    <option key={resort.id} value={resort.id}>{resort.name}</option>
                  ))}
                </select>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-3 py-1.5 bg-navy-800 border border-navy-600/50 rounded-lg text-white text-sm focus:ring-1 focus:ring-blue-500"
                >
                  <option value="all">All Categories</option>
                  <option value="ATV">ATV</option>
                  <option value="UTV">UTV</option>
                  <option value="SEA_SPORT">Sea Sport</option>
                  <option value="POOL_TOYS">Pool Toys</option>
                  <option value="LINE_SPORT">Line Sport</option>
                </select>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="px-3 py-1.5 bg-navy-800 border border-navy-600/50 rounded-lg text-white text-sm focus:ring-1 focus:ring-blue-500"
                />
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="px-3 py-1.5 bg-navy-800 border border-navy-600/50 rounded-lg text-white text-sm focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-navy-700/50 bg-navy-800/50">
                    <th className="text-left py-2.5 px-3 text-slate-400 font-medium text-xs uppercase tracking-wider">Date</th>
                    <th className="text-left py-2.5 px-3 text-slate-400 font-medium text-xs uppercase tracking-wider">Billing No.</th>
                    <th className="text-left py-2.5 px-3 text-slate-400 font-medium text-xs uppercase tracking-wider">Resort</th>
                    <th className="text-left py-2.5 px-3 text-slate-400 font-medium text-xs uppercase tracking-wider">Category</th>
                    <th className="text-right py-2.5 px-3 text-slate-400 font-medium text-xs uppercase tracking-wider whitespace-nowrap">Amount</th>
                    <th className="text-right py-2.5 px-3 text-slate-400 font-medium text-xs uppercase tracking-wider whitespace-nowrap">Discount</th>
                    <th className="text-right py-2.5 px-3 text-slate-400 font-medium text-xs uppercase tracking-wider whitespace-nowrap">Tax & Svc</th>
                    <th className="text-right py-2.5 px-3 text-slate-400 font-medium text-xs uppercase tracking-wider whitespace-nowrap">Net Amount</th>
                    <th className="text-right py-2.5 px-3 text-slate-400 font-medium text-xs uppercase tracking-wider whitespace-nowrap">DKU Share</th>
                    {canCreate && <th className="text-center py-2.5 px-3 text-slate-400 font-medium text-xs uppercase tracking-wider">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-navy-700/30">
                  {filteredRecords.map((record) => {
                    const discountPercentage = Number(record.discount_percentage) || 0;
                    const discount = Number(record.discount) || 0;
                    const taxServicePercentage = Number(record.tax_service_percentage) || 0;
                    const taxService = Number(record.tax_service) || 0;
                    const netAmount = Number(record.amount) - discount - taxService;
                    const dkuShare = record.dku_share || 0;
                    const dkuPercentage = record.dku_percentage || 0;
                    
                    return (
                      <tr key={record.id} className="hover:bg-navy-800/50 transition-colors">
                        <td className="py-2.5 px-3 text-slate-300 text-xs whitespace-nowrap">
                          {new Date(record.date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="py-2.5 px-3 text-slate-400 text-xs">
                          {record.billing_no || '-'}
                        </td>
                        <td className="py-2.5 px-3 text-slate-300 text-xs max-w-[120px] truncate">
                          {(record as any).resort?.name || '-'}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="px-1.5 py-0.5 bg-amber-500/10 text-amber-400 rounded text-[10px] font-medium">
                            {record.asset_category.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right whitespace-nowrap">
                          <span className="text-slate-300 text-xs">Rp{'\u00A0'}{Number(record.amount).toLocaleString('id-ID')}</span>
                        </td>
                        <td className="py-2.5 px-3 text-right whitespace-nowrap">
                          {discount > 0 ? (
                            <span className="text-red-400 text-xs">-{discountPercentage}%</span>
                          ) : (
                            <span className="text-slate-600 text-xs">-</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right whitespace-nowrap">
                          {taxService > 0 ? (
                            <span className="text-orange-400 text-xs">
                              {record.tax_service_type === 'PERCENTAGE' ? `-${taxServicePercentage.toFixed(0)}%` : `Rp${'\u00A0'}${taxService.toLocaleString('id-ID')}`}
                            </span>
                          ) : (
                            <span className="text-slate-600 text-xs">-</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right whitespace-nowrap">
                          <span className="text-white font-semibold text-xs">Rp{'\u00A0'}{netAmount.toLocaleString('id-ID')}</span>
                        </td>
                        <td className="py-2.5 px-3 text-right whitespace-nowrap">
                          <div>
                            <span className="text-emerald-400 font-semibold text-xs">Rp{'\u00A0'}{dkuShare.toLocaleString('id-ID')}</span>
                            <span className="text-slate-500 text-[10px] ml-1">({dkuPercentage}%)</span>
                          </div>
                        </td>
                        {canCreate && (
                          <td className="py-2.5 px-3">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => handleEdit(record)}
                                className="w-7 h-7 flex items-center justify-center bg-blue-600/20 text-blue-400 rounded hover:bg-blue-600/40 transition-colors"
                                title="Edit"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => handleDelete(record.id, record.billing_no || '')}
                                disabled={deletingId === record.id}
                                className="w-7 h-7 flex items-center justify-center bg-red-600/20 text-red-400 rounded hover:bg-red-600/40 transition-colors disabled:opacity-50"
                                title="Delete"
                              >
                                {deletingId === record.id ? (
                                  <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                  </svg>
                                ) : (
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                )}
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                  {filteredRecords.length === 0 && (
                    <tr>
                      <td colSpan={canCreate ? 10 : 9} className="py-12 text-center text-slate-500 text-sm">
                        {isFilterActive 
                          ? 'No revenue records match your filters' 
                          : 'No revenue records yet'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-navy-900 rounded-2xl p-8 max-w-md w-full border border-navy-600/50">
              <h2 className="text-2xl font-bold text-white mb-6">
                {editingRecord ? 'Edit Revenue Record' : 'Add Revenue Record'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-white/90 mb-1">Resort *</label>
                  <select
                    required
                    value={formData.resort_id}
                    onChange={(e) => {
                      const resortId = e.target.value;
                      setFormData({ ...formData, resort_id: resortId, asset_category: '' });
                      fetchAvailableCategories(resortId);
                    }}
                    className="w-full px-4 py-2 bg-navy-800 border border-navy-600/50 text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Resort</option>
                    {resorts.map((resort) => (
                      <option key={resort.id} value={resort.id}>
                        {resort.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/90 mb-1">
                    Asset Category *
                  </label>
                  <select
                    required
                    value={formData.asset_category}
                    onChange={(e) =>
                      setFormData({ ...formData, asset_category: e.target.value as AssetCategory })
                    }
                    disabled={!formData.resort_id || availableCategories.length === 0}
                    className="w-full px-4 py-2 bg-navy-800 border border-navy-600/50 text-white rounded-lg focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="">
                      {!formData.resort_id 
                        ? 'Select Resort First' 
                        : availableCategories.length === 0 
                        ? 'No Active Categories' 
                        : 'Select Category'}
                    </option>
                    {availableCategories.map((category) => (
                      <option key={category} value={category}>
                        {category.replace('_', ' ')}
                      </option>
                    ))}
                  </select>
                  {formData.resort_id && availableCategories.length === 0 && (
                    <p className="text-xs text-yellow-300 mt-1">
                      No active asset categories configured for this resort
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/90 mb-1">Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-4 py-2 bg-navy-800 border border-navy-600/50 text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/90 mb-1">
                    Billing No. <span className="text-slate-400 text-xs">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={formData.billing_no}
                    onChange={(e) => setFormData({ ...formData, billing_no: e.target.value })}
                    className="w-full px-4 py-2 bg-navy-800 border border-navy-600/50 text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter billing number"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/90 mb-1">Amount *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full px-4 py-2 bg-navy-800 border border-navy-600/50 text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter revenue amount"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/90 mb-1">
                    Discount <span className="text-slate-400 text-xs">(Optional)</span>
                  </label>
                  <div className="flex gap-2 mb-2">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, discount_type: 'PERCENTAGE', discount_value: '' })}
                      className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        formData.discount_type === 'PERCENTAGE'
                          ? 'bg-blue-600 text-white'
                          : 'bg-navy-800 text-slate-400 hover:bg-navy-800'
                      }`}
                    >
                      Percentage (%)
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, discount_type: 'FIXED_AMOUNT', discount_value: '' })}
                      className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        formData.discount_type === 'FIXED_AMOUNT'
                          ? 'bg-blue-600 text-white'
                          : 'bg-navy-800 text-slate-400 hover:bg-navy-800'
                      }`}
                    >
                      Fixed Amount (Rp)
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      max={formData.discount_type === 'PERCENTAGE' ? '100' : undefined}
                      step="0.01"
                      value={formData.discount_value}
                      onChange={(e) => setFormData({ ...formData, discount_value: e.target.value })}
                      className="w-full px-4 py-2 pr-12 bg-navy-800 border border-navy-600/50 text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder={formData.discount_type === 'PERCENTAGE' ? 'Enter percentage' : 'Enter amount'}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                      {formData.discount_type === 'PERCENTAGE' ? '%' : 'Rp'}
                    </span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/90 mb-1">
                    Tax & Service <span className="text-slate-400 text-xs">(Optional)</span>
                  </label>
                  <div className="flex gap-2 mb-2">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, tax_service_type: 'PERCENTAGE', tax_service_value: '' })}
                      className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        formData.tax_service_type === 'PERCENTAGE'
                          ? 'bg-blue-600 text-white'
                          : 'bg-navy-800 text-slate-400 hover:bg-navy-800'
                      }`}
                    >
                      Percentage (%)
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, tax_service_type: 'FIXED_AMOUNT', tax_service_value: '' })}
                      className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        formData.tax_service_type === 'FIXED_AMOUNT'
                          ? 'bg-blue-600 text-white'
                          : 'bg-navy-800 text-slate-400 hover:bg-navy-800'
                      }`}
                    >
                      Fixed Amount (Rp)
                    </button>
                  </div>
                  <div className="relative">
                    <input
                      type="number"
                      min="0"
                      max={formData.tax_service_type === 'PERCENTAGE' ? '100' : undefined}
                      step="0.01"
                      value={formData.tax_service_value}
                      onChange={(e) => setFormData({ ...formData, tax_service_value: e.target.value })}
                      className="w-full px-4 py-2 pr-12 bg-navy-800 border border-navy-600/50 text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder={formData.tax_service_type === 'PERCENTAGE' ? 'Enter percentage' : 'Enter amount'}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                      {formData.tax_service_type === 'PERCENTAGE' ? '%' : 'Rp'}
                    </span>
                  </div>
                </div>
                {formData.amount && (parseFloat(formData.discount_value || '0') > 0 || parseFloat(formData.tax_service_value || '0') > 0) && (
                  <div className="p-3 bg-navy-800 rounded-lg border border-navy-700/50">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-400">Revenue:</span>
                      <span className="text-white font-medium">
                        Rp {parseFloat(formData.amount).toLocaleString('id-ID')}
                      </span>
                    </div>
                    {formData.discount_value && parseFloat(formData.discount_value) > 0 && (
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-slate-400">
                          Discount {formData.discount_type === 'PERCENTAGE' ? `(${formData.discount_value}%)` : ''}:
                        </span>
                        <span className="text-red-400 font-medium">
                          - Rp {(() => {
                            const amount = parseFloat(formData.amount);
                            const discountValue = parseFloat(formData.discount_value);
                            
                            let discount;
                            if (formData.discount_type === 'PERCENTAGE') {
                              // Simple percentage calculation for all resorts
                              discount = amount * (discountValue / 100);
                            } else {
                              discount = discountValue;
                            }
                            return discount.toLocaleString('id-ID');
                          })()}
                        </span>
                      </div>
                    )}
                    {formData.tax_service_value && parseFloat(formData.tax_service_value) > 0 && (
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-slate-400">
                          Tax & Service {formData.tax_service_type === 'PERCENTAGE' ? `(${formData.tax_service_value}%)` : ''}:
                        </span>
                        <span className="text-orange-400 font-medium">
                          - Rp {(() => {
                            const amount = parseFloat(formData.amount);
                            const discountValue = parseFloat(formData.discount_value || '0');
                            
                            let discountAmount;
                            if (formData.discount_type === 'PERCENTAGE') {
                              // Simple percentage calculation for all resorts
                              discountAmount = amount * (discountValue / 100);
                            } else {
                              discountAmount = discountValue;
                            }
                            const amountAfterDiscount = amount - discountAmount;
                            const taxServiceValue = parseFloat(formData.tax_service_value);
                            
                            let taxService;
                            if (formData.tax_service_type === 'PERCENTAGE') {
                              // Calculate from amount after discount for all resorts
                              taxService = amountAfterDiscount / (1 + taxServiceValue / 100) * (taxServiceValue / 100);
                            } else {
                              taxService = taxServiceValue;
                            }
                            return taxService.toLocaleString('id-ID');
                          })()}
                        </span>
                      </div>
                    )}
                    <div className="border-t border-navy-700/50 mt-2 pt-2 flex justify-between text-sm">
                      <span className="text-white/90 font-semibold">Net Amount:</span>
                      <span className="text-green-400 font-bold">
                        Rp {(() => {
                          const amount = parseFloat(formData.amount);
                          const discountValue = parseFloat(formData.discount_value || '0');
                          
                          let discountAmount;
                          if (formData.discount_type === 'PERCENTAGE') {
                            // Simple percentage calculation for all resorts
                            discountAmount = amount * (discountValue / 100);
                          } else {
                            discountAmount = discountValue;
                          }
                          const amountAfterDiscount = amount - discountAmount;
                          const taxServiceValue = parseFloat(formData.tax_service_value || '0');
                          
                          let taxService;
                          if (formData.tax_service_type === 'PERCENTAGE') {
                            // Calculate from amount after discount for all resorts
                            taxService = amountAfterDiscount / (1 + taxServiceValue / 100) * (taxServiceValue / 100);
                          } else {
                            taxService = taxServiceValue;
                          }
                          return (amountAfterDiscount - taxService).toLocaleString('id-ID');
                        })()}
                      </span>
                    </div>
                  </div>
                )}
                <div className="flex gap-3 mt-6">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    className="flex-1 px-4 py-2 bg-navy-800 text-white rounded-lg hover:bg-navy-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
                  >
                    {editingRecord ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
