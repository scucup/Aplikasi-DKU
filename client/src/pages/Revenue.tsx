import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout';

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
  const [showModal, setShowModal] = useState(false);
  const [editingRecord, setEditingRecord] = useState<RevenueRecord | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
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

  useEffect(() => {
    fetchRecords();
    fetchResorts();
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

      const categories = data?.map(config => config.asset_category) || [];
      setAvailableCategories(categories as AssetCategory[]);
      
      // Reset asset_category if current selection is not available
      if (formData.asset_category && !categories.includes(formData.asset_category)) {
        setFormData(prev => ({ ...prev, asset_category: '' }));
      }
    } catch (error) {
      console.error('Error fetching available categories:', error);
      setAvailableCategories([]);
    }
  };

  const fetchRecords = async () => {
    try {
      const { data: revenueData, error: revenueError } = await supabase
        .from('revenue_records')
        .select('*, resort:resorts(name)')
        .order('date', { ascending: false });

      if (revenueError) throw revenueError;

      // Fetch profit sharing configs
      const { data: profitConfigs, error: profitError } = await supabase
        .from('profit_sharing_configs')
        .select('*');

      if (profitError) throw profitError;

      // Merge profit sharing data with revenue records
      const recordsWithSharing = revenueData?.map(record => {
        const config = profitConfigs?.find(
          c => c.resort_id === record.resort_id && c.asset_category === record.asset_category
        );
        const netAmount = Number(record.amount) - (Number(record.discount) || 0) - (Number(record.tax_service) || 0);
        const dkuPercentage = config?.dku_percentage || 0;
        const dkuShare = (netAmount * dkuPercentage) / 100;
        
        return {
          ...record,
          dku_percentage: dkuPercentage,
          dku_share: dkuShare,
        };
      }) || [];

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

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this revenue record?')) return;

    try {
      const { error } = await supabase
        .from('revenue_records')
        .delete()
        .eq('id', id);

      if (error) throw error;
      fetchRecords();
    } catch (error: any) {
      alert('Error deleting revenue record: ' + error.message);
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
          // Amount already includes discount, so extract discount portion
          discountAmount = amount / (1 + discountValue / 100) * (discountValue / 100);
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
          // Amount already includes tax, so extract tax portion: amount / (1 + rate) * rate
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

  // Filter function to be used for both table and summary
  const filterRecords = (record: RevenueRecord) => {
    const billingNo = record.billing_no || '';
    const search = searchTerm.toLowerCase();
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
  };

  // Get filtered records
  const filteredRecords = records.filter(filterRecords);

  // Calculate totals based on filtered records
  const totalRevenue = filteredRecords.reduce((sum, record) => sum + Number(record.amount), 0);
  const totalNetAmount = filteredRecords.reduce((sum, record) => {
    const netAmount = Number(record.amount) - (Number(record.discount) || 0) - (Number(record.tax_service) || 0);
    return sum + netAmount;
  }, 0);
  const totalDkuShare = filteredRecords.reduce((sum, record) => sum + (record.dku_share || 0), 0);

  // Check if any filter is active
  const isFilterActive = searchTerm || selectedResort !== 'all' || selectedCategory !== 'all' || startDate || endDate;

  return (
    <Layout>
      <div className="max-w-7xl mx-auto p-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-white">Revenue Records</h1>
          {canCreate && (
            <button
              onClick={() => setShowModal(true)}
              className="px-6 py-3 bg-gradient-to-br from-purple-600 to-pink-600 text-white rounded-xl shadow-lg hover:shadow-xl transition-all"
            >
              + Add Revenue
            </button>
          )}
        </div>

        {/* Statistics Cards - same style as Expenses */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-purple-900/30 backdrop-blur-sm rounded-xl p-4 border border-purple-500/30">
            <div className="text-sm text-purple-200 font-medium mb-1">
              Total Revenue {isFilterActive && <span className="text-yellow-300">(Filtered)</span>}
            </div>
            <div className="text-2xl font-bold text-white">
              Rp {totalRevenue.toLocaleString('id-ID')}
            </div>
            <div className="text-xs text-purple-300 mt-1">
              {filteredRecords.length} records {isFilterActive && `of ${records.length}`}
            </div>
          </div>
          <div className="bg-blue-900/30 backdrop-blur-sm rounded-xl p-4 border border-blue-500/30">
            <div className="text-sm text-blue-200 font-medium mb-1">
              Total Net Amount {isFilterActive && <span className="text-yellow-300">(Filtered)</span>}
            </div>
            <div className="text-2xl font-bold text-white">
              Rp {totalNetAmount.toLocaleString('id-ID')}
            </div>
            <div className="text-xs text-blue-300 mt-1">
              After discount & tax
            </div>
          </div>
          <div className="bg-green-900/30 backdrop-blur-sm rounded-xl p-4 border border-green-500/30">
            <div className="text-sm text-green-200 font-medium mb-1">
              Total DKU Share {isFilterActive && <span className="text-yellow-300">(Filtered)</span>}
            </div>
            <div className="text-2xl font-bold text-white">
              Rp {totalDkuShare.toLocaleString('id-ID')}
            </div>
            <div className="text-xs text-green-300 mt-1">
              Profit sharing
            </div>
          </div>
        </div>

        {!canCreate && (
          <div className="mb-4 p-4 bg-yellow-900/30 border border-yellow-500/30 rounded-lg backdrop-blur-sm">
            <p className="text-sm text-yellow-200">
              You don't have permission to create revenue records. Only ADMIN and MANAGER can create.
            </p>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-500/30 border-t-neon-purple"></div>
          </div>
        ) : (
          <div className="bg-purple-900/20 backdrop-blur-sm rounded-2xl p-6 border border-purple-500/20">
            {/* Filters - same style as Assets page */}
            <div className="bg-purple-900/20 backdrop-blur-sm rounded-xl shadow-lg p-6 border border-purple-500/20 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div className="relative">
                  <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/50 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Search billing no..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-purple-800/50 border border-purple-500/30 rounded-lg text-white placeholder-white/50 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                
                <select
                  value={selectedResort}
                  onChange={(e) => setSelectedResort(e.target.value)}
                  className="px-4 py-2 bg-purple-800/50 border border-purple-500/30 rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                >
                  <option value="all">All Resorts</option>
                  {resorts.map(resort => (
                    <option key={resort.id} value={resort.id}>{resort.name}</option>
                  ))}
                </select>
                
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="px-4 py-2 bg-purple-800/50 border border-purple-500/30 rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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
                  placeholder="Start Date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="px-4 py-2 bg-purple-800/50 border border-purple-500/30 rounded-lg text-white placeholder-white/50 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
                
                <input
                  type="date"
                  placeholder="End Date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="px-4 py-2 bg-purple-800/50 border border-purple-500/30 rounded-lg text-white placeholder-white/50 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-purple-500/20">
                    <th className="text-left py-3 px-4 text-white/90 font-semibold">Date</th>
                    <th className="text-left py-3 px-4 text-white/90 font-semibold">Billing No.</th>
                    <th className="text-left py-3 px-4 text-white/90 font-semibold">Resort</th>
                    <th className="text-left py-3 px-4 text-white/90 font-semibold">Category</th>
                    <th className="text-right py-3 px-4 text-white/90 font-semibold">Amount</th>
                    <th className="text-right py-3 px-4 text-white/90 font-semibold">Discount</th>
                    <th className="text-right py-3 px-4 text-white/90 font-semibold">Tax & Service</th>
                    <th className="text-right py-3 px-4 text-white/90 font-semibold">Net Amount</th>
                    <th className="text-right py-3 px-4 text-white/90 font-semibold">DKU Share</th>
                    {canCreate && <th className="text-center py-3 px-4 text-white/90 font-semibold">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {filteredRecords.map((record) => {
                    const discountPercentage = Number(record.discount_percentage) || 0;
                    const discount = Number(record.discount) || 0;
                    const taxServicePercentage = Number(record.tax_service_percentage) || 0;
                    const taxService = Number(record.tax_service) || 0;
                    const netAmount = Number(record.amount) - discount - taxService;
                    const dkuShare = record.dku_share || 0;
                    const dkuPercentage = record.dku_percentage || 0;
                    
                    return (
                      <tr key={record.id} className="border-b border-purple-500/10 hover:bg-purple-500/10 transition-colors">
                        <td className="py-3 px-4 text-white">
                          {new Date(record.date).toLocaleDateString('id-ID', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </td>
                        <td className="py-3 px-4 text-white/70">
                          {record.billing_no || '-'}
                        </td>
                        <td className="py-3 px-4 text-white/70">
                          {(record as any).resort?.name || '-'}
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">
                            {record.asset_category}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right text-white/70">
                          Rp {Number(record.amount).toLocaleString('id-ID')}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {discount > 0 ? (
                            <div className="text-right">
                              <span className="text-red-400 font-medium">
                                - Rp {discount.toLocaleString('id-ID')}
                              </span>
                              <div className="text-xs text-red-300/70">
                                ({discountPercentage}%)
                              </div>
                            </div>
                          ) : (
                            <span className="text-white/50">-</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {taxService > 0 ? (
                            <div className="text-right">
                              <span className="text-orange-400 font-medium">
                                - Rp {taxService.toLocaleString('id-ID')}
                              </span>
                              <div className="text-xs text-orange-300/70">
                                {record.tax_service_type === 'PERCENTAGE' 
                                  ? `(${taxServicePercentage.toFixed(1)}%)`
                                  : '(Fixed)'}
                              </div>
                            </div>
                          ) : (
                            <span className="text-white/50">-</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className="text-white font-bold">
                            Rp {netAmount.toLocaleString('id-ID')}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="text-right">
                            <span className="text-green-400 font-bold">
                              Rp {dkuShare.toLocaleString('id-ID')}
                            </span>
                            <div className="text-xs text-green-300/70">
                              ({dkuPercentage}%)
                            </div>
                          </div>
                        </td>
                        {canCreate && (
                          <td className="py-3 px-4">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                onClick={() => handleEdit(record)}
                                className="p-2 bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 rounded-lg transition-colors"
                                title="Edit"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => handleDelete(record.id)}
                                className="p-2 bg-red-600/20 hover:bg-red-600/40 text-red-400 rounded-lg transition-colors"
                                title="Delete"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                  {filteredRecords.length === 0 && (
                    <tr>
                      <td colSpan={canCreate ? 10 : 9} className="py-8 text-center text-white/50">
                        {isFilterActive 
                          ? 'No revenue records match your filters' 
                          : 'No revenue records available'}
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
            <div className="bg-gradient-to-br from-purple-900 to-slate-900 rounded-2xl p-8 max-w-md w-full border border-purple-500/30">
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
                    className="w-full px-4 py-2 bg-purple-800/50 border border-purple-500/30 text-white rounded-lg focus:ring-2 focus:ring-purple-500"
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
                    className="w-full px-4 py-2 bg-purple-800/50 border border-purple-500/30 text-white rounded-lg focus:ring-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
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
                    className="w-full px-4 py-2 bg-purple-800/50 border border-purple-500/30 text-white rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/90 mb-1">
                    Billing No. <span className="text-white/60 text-xs">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={formData.billing_no}
                    onChange={(e) => setFormData({ ...formData, billing_no: e.target.value })}
                    className="w-full px-4 py-2 bg-purple-800/50 border border-purple-500/30 text-white rounded-lg focus:ring-2 focus:ring-purple-500"
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
                    className="w-full px-4 py-2 bg-purple-800/50 border border-purple-500/30 text-white rounded-lg focus:ring-2 focus:ring-purple-500"
                    placeholder="Enter revenue amount"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/90 mb-1">
                    Discount <span className="text-white/60 text-xs">(Optional)</span>
                  </label>
                  <div className="flex gap-2 mb-2">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, discount_type: 'PERCENTAGE', discount_value: '' })}
                      className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        formData.discount_type === 'PERCENTAGE'
                          ? 'bg-purple-600 text-white'
                          : 'bg-purple-800/30 text-white/60 hover:bg-purple-800/50'
                      }`}
                    >
                      Percentage (%)
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, discount_type: 'FIXED_AMOUNT', discount_value: '' })}
                      className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        formData.discount_type === 'FIXED_AMOUNT'
                          ? 'bg-purple-600 text-white'
                          : 'bg-purple-800/30 text-white/60 hover:bg-purple-800/50'
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
                      className="w-full px-4 py-2 pr-12 bg-purple-800/50 border border-purple-500/30 text-white rounded-lg focus:ring-2 focus:ring-purple-500"
                      placeholder={formData.discount_type === 'PERCENTAGE' ? 'Enter percentage' : 'Enter amount'}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60">
                      {formData.discount_type === 'PERCENTAGE' ? '%' : 'Rp'}
                    </span>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-white/90 mb-1">
                    Tax & Service <span className="text-white/60 text-xs">(Optional)</span>
                  </label>
                  <div className="flex gap-2 mb-2">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, tax_service_type: 'PERCENTAGE', tax_service_value: '' })}
                      className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        formData.tax_service_type === 'PERCENTAGE'
                          ? 'bg-purple-600 text-white'
                          : 'bg-purple-800/30 text-white/60 hover:bg-purple-800/50'
                      }`}
                    >
                      Percentage (%)
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, tax_service_type: 'FIXED_AMOUNT', tax_service_value: '' })}
                      className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        formData.tax_service_type === 'FIXED_AMOUNT'
                          ? 'bg-purple-600 text-white'
                          : 'bg-purple-800/30 text-white/60 hover:bg-purple-800/50'
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
                      className="w-full px-4 py-2 pr-12 bg-purple-800/50 border border-purple-500/30 text-white rounded-lg focus:ring-2 focus:ring-purple-500"
                      placeholder={formData.tax_service_type === 'PERCENTAGE' ? 'Enter percentage' : 'Enter amount'}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60">
                      {formData.tax_service_type === 'PERCENTAGE' ? '%' : 'Rp'}
                    </span>
                  </div>
                </div>
                {formData.amount && (parseFloat(formData.discount_value || '0') > 0 || parseFloat(formData.tax_service_value || '0') > 0) && (
                  <div className="p-3 bg-purple-800/30 rounded-lg border border-purple-500/20">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-white/70">Revenue:</span>
                      <span className="text-white font-medium">
                        Rp {parseFloat(formData.amount).toLocaleString('id-ID')}
                      </span>
                    </div>
                    {formData.discount_value && parseFloat(formData.discount_value) > 0 && (
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-white/70">
                          Discount {formData.discount_type === 'PERCENTAGE' ? `(${formData.discount_value}%)` : ''}:
                        </span>
                        <span className="text-red-400 font-medium">
                          - Rp {(() => {
                            const amount = parseFloat(formData.amount);
                            const discountValue = parseFloat(formData.discount_value);
                            // Amount already includes discount, so extract discount portion
                            const discount = formData.discount_type === 'PERCENTAGE'
                              ? amount / (1 + discountValue / 100) * (discountValue / 100)
                              : discountValue;
                            return discount.toLocaleString('id-ID');
                          })()}
                        </span>
                      </div>
                    )}
                    {formData.tax_service_value && parseFloat(formData.tax_service_value) > 0 && (
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-white/70">
                          Tax & Service {formData.tax_service_type === 'PERCENTAGE' ? `(${formData.tax_service_value}%)` : ''}:
                        </span>
                        <span className="text-orange-400 font-medium">
                          - Rp {(() => {
                            const amount = parseFloat(formData.amount);
                            const discountValue = parseFloat(formData.discount_value || '0');
                            // Amount already includes discount, so extract discount portion
                            const discountAmount = formData.discount_type === 'PERCENTAGE'
                              ? amount / (1 + discountValue / 100) * (discountValue / 100)
                              : discountValue;
                            const amountAfterDiscount = amount - discountAmount;
                            const taxServiceValue = parseFloat(formData.tax_service_value);
                            // Amount already includes tax, so extract tax portion: amount / (1 + rate) * rate
                            const taxService = formData.tax_service_type === 'PERCENTAGE'
                              ? amountAfterDiscount / (1 + taxServiceValue / 100) * (taxServiceValue / 100)
                              : taxServiceValue;
                            return taxService.toLocaleString('id-ID');
                          })()}
                        </span>
                      </div>
                    )}
                    <div className="border-t border-purple-500/20 mt-2 pt-2 flex justify-between text-sm">
                      <span className="text-white/90 font-semibold">Net Amount:</span>
                      <span className="text-green-400 font-bold">
                        Rp {(() => {
                          const amount = parseFloat(formData.amount);
                          const discountValue = parseFloat(formData.discount_value || '0');
                          // Amount already includes discount, so extract discount portion
                          const discountAmount = formData.discount_type === 'PERCENTAGE'
                            ? amount / (1 + discountValue / 100) * (discountValue / 100)
                            : discountValue;
                          const amountAfterDiscount = amount - discountAmount;
                          const taxServiceValue = parseFloat(formData.tax_service_value || '0');
                          // Amount already includes tax, so extract tax portion: amount / (1 + rate) * rate
                          const taxService = formData.tax_service_type === 'PERCENTAGE'
                            ? amountAfterDiscount / (1 + taxServiceValue / 100) * (taxServiceValue / 100)
                            : taxServiceValue;
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
                    className="flex-1 px-4 py-2 bg-purple-800/50 text-white rounded-lg hover:bg-purple-800/70 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-colors font-semibold"
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
