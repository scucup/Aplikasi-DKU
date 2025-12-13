import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout';

type AssetCategory = 'ATV' | 'UTV' | 'SEA_SPORT' | 'POOL_TOYS' | 'LINE_SPORT';

interface Resort {
  id: string;
  name: string;
  legal_company_name?: string | null;
  company_address?: string | null;
  company_name: string | null;
  address: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  created_at: string;
}

interface ProfitSharingConfig {
  id: string;
  resort_id: string;
  asset_category: AssetCategory;
  dku_percentage: number;
  resort_percentage: number;
  effective_from: string;
}

export default function Resorts() {
  const { profile } = useAuth();
  const [resorts, setResorts] = useState<Resort[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showProfitSharingModal, setShowProfitSharingModal] = useState(false);
  const [selectedResort, setSelectedResort] = useState<Resort | null>(null);
  const [profitSharingConfigs, setProfitSharingConfigs] = useState<ProfitSharingConfig[]>([]);
  
  const canCreate = profile?.role === 'MANAGER';
  
  const [formData, setFormData] = useState({
    name: '',
    legal_company_name: '',
    company_address: '',
    contact_name: '',
    contact_email: '',
    contact_phone: '',
  });

  const [profitSharingData, setProfitSharingData] = useState<{
    [key in AssetCategory]: { dku: string; resort: string; enabled: boolean };
  }>({
    ATV: { dku: '70', resort: '30', enabled: true },
    UTV: { dku: '70', resort: '30', enabled: true },
    SEA_SPORT: { dku: '70', resort: '30', enabled: true },
    POOL_TOYS: { dku: '70', resort: '30', enabled: true },
    LINE_SPORT: { dku: '70', resort: '30', enabled: true },
  });

  useEffect(() => {
    fetchResorts();
  }, []);

  const fetchResorts = async () => {
    try {
      const { data, error } = await supabase
        .from('resorts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setResorts(data || []);
    } catch (error) {
      console.error('Error fetching resorts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const newResortId = crypto.randomUUID();
      
      // Create resort
      const { error: resortError } = await supabase.from('resorts').insert([
        {
          id: newResortId,
          ...formData,
        },
      ]);

      if (resortError) throw resortError;

      // Create profit sharing configs for enabled asset categories only
      const profitSharingInserts = Object.entries(profitSharingData)
        .filter(([_, data]) => data.enabled)
        .map(([category, percentages]) => ({
          id: crypto.randomUUID(),
          resort_id: newResortId,
          asset_category: category as AssetCategory,
          dku_percentage: parseFloat(percentages.dku),
          resort_percentage: parseFloat(percentages.resort),
          effective_from: new Date().toISOString().split('T')[0],
        }));

      const { error: profitError } = await supabase
        .from('profit_sharing_configs')
        .insert(profitSharingInserts);

      if (profitError) throw profitError;

      setShowModal(false);
      setFormData({ name: '', legal_company_name: '', company_address: '', contact_name: '', contact_email: '', contact_phone: '' });
      setProfitSharingData({
        ATV: { dku: '70', resort: '30', enabled: true },
        UTV: { dku: '70', resort: '30', enabled: true },
        SEA_SPORT: { dku: '70', resort: '30', enabled: true },
        POOL_TOYS: { dku: '70', resort: '30', enabled: true },
        LINE_SPORT: { dku: '70', resort: '30', enabled: true },
      });
      fetchResorts();
    } catch (error: any) {
      alert('Error creating resort: ' + error.message);
    }
  };

  const handleEdit = async (resort: Resort) => {
    setSelectedResort(resort);
    setFormData({
      name: resort.name,
      legal_company_name: resort.legal_company_name || '',
      company_address: resort.company_address || '',
      contact_name: resort.contact_name || '',
      contact_email: resort.contact_email || '',
      contact_phone: resort.contact_phone || '',
    });
    setShowEditModal(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedResort) return;

    try {
      const { error } = await supabase
        .from('resorts')
        .update(formData)
        .eq('id', selectedResort.id);

      if (error) throw error;

      setShowEditModal(false);
      setSelectedResort(null);
      setFormData({ name: '', legal_company_name: '', company_address: '', contact_name: '', contact_email: '', contact_phone: '' });
      fetchResorts();
    } catch (error: any) {
      alert('Error updating resort: ' + error.message);
    }
  };

  const handleManageProfitSharing = async (resort: Resort) => {
    setSelectedResort(resort);
    
    // Fetch existing profit sharing configs
    const { data, error } = await supabase
      .from('profit_sharing_configs')
      .select('*')
      .eq('resort_id', resort.id)
      .order('effective_from', { ascending: false });

    if (error) {
      console.error('Error fetching profit sharing:', error);
      return;
    }

    setProfitSharingConfigs(data || []);
    
    // Populate form with existing data or defaults
    const newData: any = {
      ATV: { dku: '70', resort: '30', enabled: false },
      UTV: { dku: '70', resort: '30', enabled: false },
      SEA_SPORT: { dku: '70', resort: '30', enabled: false },
      POOL_TOYS: { dku: '70', resort: '30', enabled: false },
      LINE_SPORT: { dku: '70', resort: '30', enabled: false },
    };

    data?.forEach((config) => {
      newData[config.asset_category] = {
        dku: config.dku_percentage.toString(),
        resort: config.resort_percentage.toString(),
        enabled: true,
      };
    });

    setProfitSharingData(newData);
    setShowProfitSharingModal(true);
  };

  const handleSaveProfitSharing = async () => {
    if (!selectedResort) return;

    try {
      // Delete existing configs for this resort
      await supabase
        .from('profit_sharing_configs')
        .delete()
        .eq('resort_id', selectedResort.id);

      // Insert new configs for enabled categories only
      const profitSharingInserts = Object.entries(profitSharingData)
        .filter(([_, data]) => data.enabled)
        .map(([category, percentages]) => ({
          id: crypto.randomUUID(),
          resort_id: selectedResort.id,
          asset_category: category as AssetCategory,
          dku_percentage: parseFloat(percentages.dku),
          resort_percentage: parseFloat(percentages.resort),
          effective_from: new Date().toISOString().split('T')[0],
        }));

      const { error } = await supabase
        .from('profit_sharing_configs')
        .insert(profitSharingInserts);

      if (error) throw error;

      setShowProfitSharingModal(false);
      setSelectedResort(null);
      alert('Profit sharing configuration saved successfully!');
    } catch (error: any) {
      alert('Error saving profit sharing: ' + error.message);
    }
  };

  const handleProfitSharingChange = (category: AssetCategory, type: 'dku' | 'resort', value: string) => {
    const numValue = parseFloat(value) || 0;
    const otherType = type === 'dku' ? 'resort' : 'dku';
    const otherValue = 100 - numValue;

    setProfitSharingData({
      ...profitSharingData,
      [category]: {
        [type]: value,
        [otherType]: otherValue.toString(),
      },
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this resort?')) return;

    try {
      const { error } = await supabase.from('resorts').delete().eq('id', id);
      if (error) throw error;
      fetchResorts();
    } catch (error: any) {
      alert('Error deleting resort: ' + error.message);
    }
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto p-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-white">Resorts Management</h1>
          {canCreate && (
            <button
              onClick={() => setShowModal(true)}
              className="px-6 py-3 bg-gradient-to-br from-purple-600 to-pink-600 text-white rounded-xl shadow-lg hover:shadow-xl transition-all"
            >
              + Add Resort
            </button>
          )}
        </div>

        {!canCreate && (
          <div className="mb-4 p-4 bg-yellow-900/30 border border-yellow-500/30 rounded-lg backdrop-blur-sm">
            <p className="text-sm text-yellow-200">
              You don't have permission to create resorts. Only MANAGER can create.
            </p>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-500/30 border-t-neon-purple"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {resorts.map((resort) => (
              <div
                key={resort.id}
                className="bg-purple-900/20 backdrop-blur-sm rounded-2xl p-6 border border-purple-500/20 hover:border-purple-500/50 transition-all relative group"
              >
                {canCreate && (
                  <button
                    onClick={() => handleEdit(resort)}
                    className="absolute top-4 right-4 p-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                  </button>
                )}
                
                <h3 className="text-xl font-bold text-white mb-4 pr-12">{resort.name}</h3>
                
                <div className="space-y-2 text-sm text-white/70 mb-4">
                  <p>
                    <span className="font-medium text-white/90">Contact:</span> {resort.contact_name || '-'}
                  </p>
                  <p>
                    <span className="font-medium text-white/90">Email:</span> {resort.contact_email || '-'}
                  </p>
                  <p>
                    <span className="font-medium text-white/90">Phone:</span> {resort.contact_phone || '-'}
                  </p>
                  {resort.legal_company_name && (
                    <p>
                      <span className="font-medium text-white/90">Legal Company:</span> {resort.legal_company_name}
                    </p>
                  )}
                  {resort.company_address && (
                    <p>
                      <span className="font-medium text-white/90">Company Address:</span> {resort.company_address}
                    </p>
                  )}
                </div>
                
                {canCreate && (
                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={() => handleManageProfitSharing(resort)}
                      className="flex-1 px-4 py-2 bg-gradient-to-br from-green-600 to-teal-600 text-white rounded-lg hover:shadow-lg transition-all text-sm"
                    >
                      Profit Sharing
                    </button>
                    <button
                      onClick={() => handleDelete(resort.id)}
                      className="px-4 py-2 bg-gradient-to-br from-red-600 to-pink-600 text-white rounded-lg hover:shadow-lg transition-all text-sm"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Add Resort Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 overflow-y-auto p-4">
            <div className="bg-gradient-to-br from-purple-900 to-slate-900 rounded-2xl p-8 max-w-2xl w-full border border-purple-500/30 max-h-[90vh] overflow-y-auto">
              <h2 className="text-2xl font-bold text-white mb-6">Add New Resort</h2>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Resort Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-white">Resort Information</h3>
                  <div>
                    <label className="block text-sm font-medium text-white mb-1">
                      Resort Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white mb-1">
                      Legal Company Name (for Invoice)
                    </label>
                    <input
                      type="text"
                      value={formData.legal_company_name}
                      onChange={(e) => setFormData({ ...formData, legal_company_name: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="e.g., PT. Anugerah Nusantara"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white mb-1">
                      Company Address (for Invoice)
                    </label>
                    <textarea
                      value={formData.company_address}
                      onChange={(e) => setFormData({ ...formData, company_address: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      placeholder="e.g., Waterfront Batam, Batam, Indonesia"
                      rows={2}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-white mb-1">
                        Contact Name
                      </label>
                      <input
                        type="text"
                        value={formData.contact_name}
                        onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-white mb-1">
                        Contact Email
                      </label>
                      <input
                        type="email"
                        value={formData.contact_email}
                        onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-white mb-1">
                        Contact Phone
                      </label>
                      <input
                        type="tel"
                        value={formData.contact_phone}
                        onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>

                {/* Profit Sharing Configuration */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-white">Profit Sharing per Asset Category</h3>
                  <div className="bg-purple-900/30 rounded-lg p-4 space-y-3 border border-purple-500/20">
                    {(['ATV', 'UTV', 'SEA_SPORT', 'POOL_TOYS', 'LINE_SPORT'] as AssetCategory[]).map((category) => (
                      <div key={category} className={`grid grid-cols-4 gap-4 items-center p-3 rounded-lg transition-all ${profitSharingData[category].enabled ? 'bg-purple-800/30' : 'bg-gray-800/20 opacity-60'}`}>
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={profitSharingData[category].enabled}
                            onChange={(e) => setProfitSharingData({
                              ...profitSharingData,
                              [category]: { ...profitSharingData[category], enabled: e.target.checked }
                            })}
                            className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
                          />
                          <span className="font-medium text-white">
                            {category.replace('_', ' ')}
                          </span>
                        </div>
                        <div>
                          <label className="block text-xs text-white/70 mb-1">DKU %</label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            disabled={!profitSharingData[category].enabled}
                            value={profitSharingData[category].dku}
                            onChange={(e) => handleProfitSharingChange(category, 'dku', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-white/70 mb-1">Resort %</label>
                          <input
                            type="number"
                            min="0"
                            max="100"
                            step="0.01"
                            disabled={!profitSharingData[category].enabled}
                            value={profitSharingData[category].resort}
                            onChange={(e) => handleProfitSharingChange(category, 'resort', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                          />
                        </div>
                        <div className="text-xs text-white/60">
                          {profitSharingData[category].enabled ? '✓ Active' : '✗ Disabled'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setFormData({ name: '', legal_company_name: '', company_address: '', contact_name: '', contact_email: '', contact_phone: '' });
                    }}
                    className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-gradient-to-br from-purple-600 to-pink-600 text-white rounded-lg hover:shadow-lg transition-all"
                  >
                    Create Resort
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Resort Modal */}
        {showEditModal && selectedResort && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-gradient-to-br from-purple-900 to-slate-900 rounded-2xl p-8 max-w-md w-full border border-purple-500/30">
              <h2 className="text-2xl font-bold text-white mb-6">Edit Resort</h2>
              <form onSubmit={handleUpdate} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-white mb-1">
                    Resort Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white mb-1">
                    Legal Company Name (for Invoice)
                  </label>
                  <input
                    type="text"
                    value={formData.legal_company_name}
                    onChange={(e) => setFormData({ ...formData, legal_company_name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="e.g., PT. Anugerah Nusantara"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white mb-1">
                    Company Address (for Invoice)
                  </label>
                  <textarea
                    value={formData.company_address}
                    onChange={(e) => setFormData({ ...formData, company_address: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="e.g., Waterfront Batam, Batam, Indonesia"
                    rows={2}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white mb-1">
                    Contact Name
                  </label>
                  <input
                    type="text"
                    value={formData.contact_name}
                    onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white mb-1">
                    Contact Email
                  </label>
                  <input
                    type="email"
                    value={formData.contact_email}
                    onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white mb-1">
                    Contact Phone
                  </label>
                  <input
                    type="tel"
                    value={formData.contact_phone}
                    onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                <div className="flex gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditModal(false);
                      setSelectedResort(null);
                      setFormData({ name: '', legal_company_name: '', company_address: '', contact_name: '', contact_email: '', contact_phone: '' });
                    }}
                    className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-gradient-to-br from-purple-600 to-pink-600 text-white rounded-lg hover:shadow-lg transition-all"
                  >
                    Update
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Profit Sharing Modal */}
        {showProfitSharingModal && selectedResort && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 overflow-y-auto p-4">
            <div className="bg-gradient-to-br from-purple-900 to-slate-900 rounded-2xl p-8 max-w-2xl w-full border border-purple-500/30 max-h-[90vh] overflow-y-auto">
              <h2 className="text-2xl font-bold text-white mb-6">
                Profit Sharing - {selectedResort.name}
              </h2>
              
              <div className="space-y-4 mb-6">
                <h3 className="text-lg font-semibold text-white">Configure Profit Sharing per Asset Category</h3>
                <div className="bg-purple-900/30 rounded-lg p-4 space-y-3 border border-purple-500/20">
                  {(['ATV', 'UTV', 'SEA_SPORT', 'POOL_TOYS', 'LINE_SPORT'] as AssetCategory[]).map((category) => (
                    <div key={category} className={`grid grid-cols-4 gap-4 items-center p-3 rounded-lg transition-all ${profitSharingData[category].enabled ? 'bg-purple-800/30' : 'bg-gray-800/20 opacity-60'}`}>
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={profitSharingData[category].enabled}
                          onChange={(e) => setProfitSharingData({
                            ...profitSharingData,
                            [category]: { ...profitSharingData[category], enabled: e.target.checked }
                          })}
                          className="w-5 h-5 text-purple-600 rounded focus:ring-purple-500"
                        />
                        <span className="font-medium text-white">
                          {category.replace('_', ' ')}
                        </span>
                      </div>
                      <div>
                        <label className="block text-xs text-white/70 mb-1">DKU %</label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          disabled={!profitSharingData[category].enabled}
                          value={profitSharingData[category].dku}
                          onChange={(e) => handleProfitSharingChange(category, 'dku', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-white/70 mb-1">Resort %</label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.01"
                          disabled={!profitSharingData[category].enabled}
                          value={profitSharingData[category].resort}
                          onChange={(e) => handleProfitSharingChange(category, 'resort', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                        />
                      </div>
                      <div className="text-xs text-white/60">
                        {profitSharingData[category].enabled ? '✓ Active' : '✗ Disabled'}
                      </div>
                    </div>
                  ))}
                </div>
                
                {/* Current Configurations */}
                {profitSharingConfigs.length > 0 && (
                  <div className="mt-6">
                    <h4 className="text-sm font-semibold text-white mb-2">Current Active Categories:</h4>
                    <div className="bg-purple-800/30 rounded-lg p-3 text-xs space-y-1 border border-purple-500/20">
                      {profitSharingConfigs.map((config) => (
                        <div key={config.id} className="flex justify-between text-white/80">
                          <span className="font-medium text-white">{config.asset_category.replace('_', ' ')}:</span>
                          <span>DKU {config.dku_percentage}% / Resort {config.resort_percentage}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowProfitSharingModal(false);
                    setSelectedResort(null);
                  }}
                  className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveProfitSharing}
                  className="flex-1 px-4 py-2 bg-gradient-to-br from-green-600 to-teal-600 text-white rounded-lg hover:shadow-lg transition-all"
                >
                  Save Configuration
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
