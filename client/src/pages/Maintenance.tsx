import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout';

type MaintenanceType = 'PREVENTIVE' | 'CORRECTIVE';

interface MaintenanceRecord {
  id: string;
  asset_id: string;
  type: MaintenanceType;
  description: string;
  start_date: string;
  end_date: string | null;
  labor_cost: number;
  sparepart_cost: number;
  performed_by: string;
  asset_serial_number: string | null;
  asset?: { name: string; serial_number: string | null; photo_url: string | null };
  maintenance_spareparts?: Array<{
    sparepart: { sparepart_name: string; asset_category: string };
  }>;
}

interface AssetDetail {
  id: string;
  name: string;
  serial_number: string | null;
  photo_url: string | null;
}

interface Sparepart {
  id: string;
  sparepart_name: string;
  asset_category: string;
  current_stock: number;
  unit: string;
  last_unit_price: number;
  resort_id: string;
  resort_name?: string;
}

interface SparepartUsage {
  inventory_id: string;
  quantity: number;
}

export default function Maintenance() {
  const { user, profile } = useAuth();
  const [records, setRecords] = useState<MaintenanceRecord[]>([]);
  const [assets, setAssets] = useState<AssetDetail[]>([]);
  const [spareparts, setSpareparts] = useState<Sparepart[]>([]);
  const [sparepartUsage, setSparepartUsage] = useState<SparepartUsage[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<AssetDetail | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [formData, setFormData] = useState({
    asset_id: '',
    type: 'PREVENTIVE' as MaintenanceType,
    description: '',
    start_date: new Date().toISOString().split('T')[0],
    start_time: new Date().toTimeString().slice(0, 5),
    end_date: '',
    end_time: '',
  });

  const canCreate = profile?.role === 'ENGINEER' || profile?.role === 'MANAGER';

  useEffect(() => {
    fetchRecords();
    fetchAssets();
  }, []);

  const fetchAssets = async () => {
    const { data } = await supabase
      .from('assets')
      .select('id, name, serial_number, photo_url')
      .eq('status', 'ACTIVE');
    setAssets(data || []);
  };

  const fetchSpareparts = async (assetId?: string) => {
    // If no asset selected, don't fetch spareparts
    if (!assetId) {
      setSpareparts([]);
      return;
    }

    // Get asset details to filter spareparts
    const asset = assets.find(a => a.id === assetId);
    if (!asset) {
      setSpareparts([]);
      return;
    }

    // Fetch asset with resort and category info
    const { data: assetData } = await supabase
      .from('assets')
      .select('resort_id, category')
      .eq('id', assetId)
      .single();

    if (!assetData) {
      setSpareparts([]);
      return;
    }

    // Fetch spareparts matching asset category and resort with stock > 0
    const { data } = await supabase
      .from('sparepart_inventory')
      .select(`
        *,
        resorts (name)
      `)
      .eq('resort_id', assetData.resort_id)
      .eq('asset_category', assetData.category)
      .gt('current_stock', 0)
      .order('sparepart_name');
    
    const formattedData = data?.map(item => ({
      ...item,
      resort_name: item.resorts?.name || 'Unknown'
    })) || [];
    
    setSpareparts(formattedData);
  };

  const handleAssetChange = (assetId: string) => {
    const asset = assets.find((a) => a.id === assetId);
    setSelectedAsset(asset || null);
    setFormData({ ...formData, asset_id: assetId });
    setSparepartUsage([]); // Reset sparepart selection
    fetchSpareparts(assetId); // Fetch spareparts for selected asset
  };

  const fetchRecords = async () => {
    try {
      const { data, error } = await supabase
        .from('maintenance_records')
        .select(`
          *,
          asset:assets(name, serial_number, photo_url),
          maintenance_spareparts(
            sparepart:sparepart_inventory(sparepart_name, asset_category)
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRecords(data || []);
    } catch (error) {
      console.error('Error fetching maintenance records:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate sparepart quantities
    for (const usage of sparepartUsage) {
      const sparepart = spareparts.find(s => s.id === usage.inventory_id);
      if (sparepart && usage.quantity > sparepart.current_stock) {
        alert(`Insufficient stock for ${sparepart.sparepart_name}. Available: ${sparepart.current_stock}, Requested: ${usage.quantity}`);
        return;
      }
    }
    
    try {
      const maintenanceId = crypto.randomUUID();
      
      // Combine date and time for start_date
      const startDateTime = `${formData.start_date}T${formData.start_time}:00`;
      
      // Combine date and time for end_date (if provided)
      let endDateTime = null;
      if (formData.end_date && formData.end_time) {
        endDateTime = `${formData.end_date}T${formData.end_time}:00`;
      }

      // Calculate total sparepart cost
      let totalSparepartCost = 0;
      for (const usage of sparepartUsage) {
        const sparepart = spareparts.find(s => s.id === usage.inventory_id);
        if (sparepart) {
          totalSparepartCost += sparepart.last_unit_price * usage.quantity;
        }
      }

      // Insert maintenance record (labor_cost = 0 since done by own staff)
      const { error: maintenanceError } = await supabase.from('maintenance_records').insert([
        {
          id: maintenanceId,
          asset_id: formData.asset_id,
          type: formData.type,
          maintenance_type: formData.type,
          description: formData.description,
          start_date: startDateTime,
          end_date: endDateTime,
          status: 'IN_PROGRESS',
          labor_cost: 0,
          sparepart_cost: totalSparepartCost,
          performed_by: user?.id,
          asset_serial_number: selectedAsset?.serial_number || null,
        },
      ]);

      if (maintenanceError) throw maintenanceError;

      // Process sparepart usage and update inventory
      for (const usage of sparepartUsage) {
        const sparepart = spareparts.find(s => s.id === usage.inventory_id);
        if (!sparepart) continue;

        // Deduct from inventory
        const { error: updateError } = await supabase
          .from('sparepart_inventory')
          .update({
            current_stock: sparepart.current_stock - usage.quantity,
            updated_at: new Date().toISOString(),
          })
          .eq('id', usage.inventory_id);

        if (updateError) throw updateError;

        // Create stock transaction record
        await supabase
          .from('stock_transactions')
          .insert([{
            inventory_id: usage.inventory_id,
            transaction_type: 'USAGE',
            quantity: -usage.quantity,
            unit_price: sparepart.last_unit_price,
            reference_type: 'MAINTENANCE',
            reference_id: maintenanceId,
            created_by: user?.id,
          }]);
      }

      alert('Maintenance record created successfully! Inventory updated.');
      setShowModal(false);
      setFormData({
        asset_id: '',
        type: 'PREVENTIVE',
        description: '',
        start_date: new Date().toISOString().split('T')[0],
        start_time: new Date().toTimeString().slice(0, 5),
        end_date: '',
        end_time: '',
      });
      setSelectedAsset(null);
      setSparepartUsage([]);
      setSpareparts([]); // Clear spareparts list
      fetchRecords();
    } catch (error: any) {
      alert('Error creating maintenance record: ' + error.message);
    }
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto p-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-white">Maintenance Records</h1>
          {canCreate && (
            <button
              onClick={() => setShowModal(true)}
              className="px-6 py-3 bg-gradient-to-br from-purple-600 to-pink-600 text-white rounded-xl shadow-lg hover:shadow-xl transition-all"
            >
              + Add Maintenance
            </button>
          )}
        </div>

        {!canCreate && (
          <div className="mb-4 p-4 bg-yellow-900/30 border border-yellow-500/30 rounded-lg backdrop-blur-sm">
            <p className="text-sm text-yellow-200">
              You don't have permission to create maintenance records. Only ENGINEER and MANAGER can create.
            </p>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-500/30 border-t-neon-purple"></div>
          </div>
        ) : (
          <div className="bg-purple-900/20 backdrop-blur-sm rounded-2xl p-6 border border-purple-500/20">
            {/* Search and Date Filter */}
            <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative md:col-span-1">
                <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/50 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search by asset name or description..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-purple-800/50 border border-purple-500/30 rounded-lg text-white placeholder-white/50 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              <div>
                <input
                  type="date"
                  placeholder="Start Date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-4 py-2 bg-purple-800/50 border border-purple-500/30 rounded-lg text-white placeholder-white/50 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              <div>
                <input
                  type="date"
                  placeholder="End Date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-4 py-2 bg-purple-800/50 border border-purple-500/30 rounded-lg text-white placeholder-white/50 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-purple-500/20">
                    <th className="text-left py-3 px-4 text-white/90 font-semibold">Type</th>
                    <th className="text-left py-3 px-4 text-white/90 font-semibold">Asset</th>
                    <th className="text-left py-3 px-4 text-white/90 font-semibold">Description</th>
                    <th className="text-left py-3 px-4 text-white/90 font-semibold">Start Date</th>
                    <th className="text-left py-3 px-4 text-white/90 font-semibold">End Date</th>
                    <th className="text-right py-3 px-4 text-white/90 font-semibold">Sparepart Cost</th>
                    <th className="text-right py-3 px-4 text-white/90 font-semibold">Total Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {records
                    .filter((record) => {
                      const assetName = (record as any).asset?.name || '';
                      const description = record.description || '';
                      const search = searchTerm.toLowerCase();
                      const matchesSearch = assetName.toLowerCase().includes(search) || 
                                          description.toLowerCase().includes(search);
                      
                      // Date filtering
                      let matchesDate = true;
                      if (startDate || endDate) {
                        const recordDate = new Date(record.start_date);
                        if (startDate) {
                          matchesDate = matchesDate && recordDate >= new Date(startDate);
                        }
                        if (endDate) {
                          matchesDate = matchesDate && recordDate <= new Date(endDate);
                        }
                      }
                      
                      return matchesSearch && matchesDate;
                    })
                    .map((record) => (
                    <tr key={record.id} className="border-b border-purple-500/10 hover:bg-purple-500/10 transition-colors">
                      <td className="py-3 px-4">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
                            record.type === 'PREVENTIVE'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {record.type}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          {(record as any).asset?.photo_url && (
                            <img
                              src={(record as any).asset.photo_url}
                              alt={(record as any).asset?.name}
                              className="w-10 h-10 object-cover rounded-lg"
                            />
                          )}
                          <div>
                            <p className="text-white font-medium">{(record as any).asset?.name || '-'}</p>
                            {record.asset_serial_number && (
                              <p className="text-white/50 text-xs font-mono">
                                {record.asset_serial_number}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-white/70 max-w-xs truncate" title={record.description}>
                        {record.description}
                      </td>
                      <td className="py-3 px-4 text-white/70 text-sm">
                        {new Date(record.start_date).toLocaleString('id-ID', {
                          dateStyle: 'short',
                          timeStyle: 'short',
                        })}
                      </td>
                      <td className="py-3 px-4 text-white/70 text-sm">
                        {record.end_date
                          ? new Date(record.end_date).toLocaleString('id-ID', {
                              dateStyle: 'short',
                              timeStyle: 'short',
                            })
                          : <span className="text-yellow-400">Ongoing</span>}
                      </td>
                      <td className="py-3 px-4 text-right text-white/70">
                        Rp {record.sparepart_cost.toLocaleString('id-ID')}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="text-white font-bold">
                          Rp {(record.labor_cost + record.sparepart_cost).toLocaleString('id-ID')}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {records.filter((record) => {
                    const assetName = (record as any).asset?.name || '';
                    const description = record.description || '';
                    const search = searchTerm.toLowerCase();
                    const matchesSearch = assetName.toLowerCase().includes(search) || 
                                        description.toLowerCase().includes(search);
                    
                    let matchesDate = true;
                    if (startDate || endDate) {
                      const recordDate = new Date(record.start_date);
                      if (startDate) {
                        matchesDate = matchesDate && recordDate >= new Date(startDate);
                      }
                      if (endDate) {
                        matchesDate = matchesDate && recordDate <= new Date(endDate);
                      }
                    }
                    
                    return matchesSearch && matchesDate;
                  }).length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-white/50">
                        {searchTerm || startDate || endDate ? 'No maintenance records match your filters' : 'No maintenance records available'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Old card view - keeping for reference but hidden */}
        {false && (
          <div className="space-y-4">
            {records.map((record) => (
              <div
                key={record.id}
                className="bg-purple-900/20 backdrop-blur-sm rounded-2xl p-6 border border-purple-500/20 hover:border-purple-500/50 transition-all"
              >
                <div className="flex gap-4">
                  {/* Asset Photo */}
                  {(record as any).asset?.photo_url && (
                    <div className="flex-shrink-0">
                      <img
                        src={(record as any).asset.photo_url}
                        alt={(record as any).asset?.name}
                        className="w-24 h-24 object-cover rounded-xl"
                      />
                    </div>
                  )}

                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          record.type === 'PREVENTIVE'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {record.type}
                      </span>
                      <h3 className="text-lg font-bold text-white">{record.description}</h3>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-white/70">
                      <div>
                        <span className="font-medium text-white/90">Asset:</span>{' '}
                        {(record as any).asset?.name || '-'}
                      </div>
                      <div>
                        <span className="font-medium text-white/90">Serial Number:</span>{' '}
                        <span className="font-mono text-xs">
                          {record.asset_serial_number || '-'}
                        </span>
                      </div>
                      <div>
                        <span className="font-medium text-white/90">Start:</span>{' '}
                        {new Date(record.start_date).toLocaleString('id-ID', {
                          dateStyle: 'short',
                          timeStyle: 'short',
                        })}
                      </div>
                      <div>
                        <span className="font-medium text-white/90">End:</span>{' '}
                        {record.end_date
                          ? new Date(record.end_date).toLocaleString('id-ID', {
                              dateStyle: 'short',
                              timeStyle: 'short',
                            })
                          : 'Ongoing'}
                      </div>
                    </div>
                    
                    {/* Cost Breakdown */}
                    <div className="mt-4 pt-4 border-t border-purple-500/20">
                      <p className="text-sm font-medium text-white/90 mb-2">Cost Breakdown:</p>
                      <div className="grid grid-cols-3 gap-4 text-sm">
                        <div className="bg-blue-50 p-3 rounded-lg">
                          <p className="text-xs text-blue-600 mb-1">Labor Cost</p>
                          <p className="font-bold text-blue-800">
                            Rp {record.labor_cost.toLocaleString('id-ID')}
                          </p>
                        </div>
                        <div className="bg-teal-50 p-3 rounded-lg">
                          <p className="text-xs text-teal-600 mb-1">Sparepart Cost</p>
                          <p className="font-bold text-teal-800">
                            Rp {record.sparepart_cost.toLocaleString('id-ID')}
                          </p>
                        </div>
                        <div className="bg-orange-50 p-3 rounded-lg">
                          <p className="text-xs text-orange-600 mb-1">Total Cost</p>
                          <p className="font-bold text-orange-800">
                            Rp {(record.labor_cost + record.sparepart_cost).toLocaleString('id-ID')}
                          </p>
                        </div>
                      </div>
                    </div>
                    {/* Display used spareparts */}
                    {record.maintenance_spareparts && record.maintenance_spareparts.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-gray-300">
                        <p className="text-sm font-medium text-gray-700 mb-2">Used Spareparts:</p>
                        <div className="flex flex-wrap gap-2">
                          {record.maintenance_spareparts.map((ms: any, idx: number) => (
                            <span
                              key={idx}
                              className="px-3 py-1 bg-teal-100 text-teal-800 rounded-full text-xs"
                            >
                              {ms.sparepart?.sparepart_name} ({ms.sparepart?.asset_category})
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-gradient-to-br from-purple-900 to-slate-900 rounded-2xl p-8 max-w-md w-full max-h-[90vh] overflow-y-auto border border-purple-500/30">
              <h2 className="text-2xl font-bold text-white mb-6">Add Maintenance Record</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-white mb-1">Asset *</label>
                  <select
                    required
                    value={formData.asset_id}
                    onChange={(e) => handleAssetChange(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  >
                    <option value="">Select Asset</option>
                    {assets.map((asset) => (
                      <option key={asset.id} value={asset.id}>
                        {asset.name} {asset.serial_number ? `(${asset.serial_number})` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Asset Details Preview */}
                {selectedAsset && (
                  <div className="p-4 bg-purple-800/30 rounded-lg border border-purple-500/30">
                    <h4 className="text-sm font-medium text-white mb-2">Asset Details</h4>
                    <div className="flex gap-4">
                      {selectedAsset.photo_url && (
                        <img
                          src={selectedAsset.photo_url}
                          alt={selectedAsset.name}
                          className="w-20 h-20 object-cover rounded-lg"
                        />
                      )}
                      <div className="text-sm text-white/80">
                        <p>
                          <span className="font-medium text-white">Name:</span> {selectedAsset.name}
                        </p>
                        {selectedAsset.serial_number && (
                          <p>
                            <span className="font-medium text-white">Serial Number:</span>{' '}
                            <span className="font-mono text-xs">{selectedAsset.serial_number}</span>
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-white mb-1">Type *</label>
                  <select
                    required
                    value={formData.type}
                    onChange={(e) =>
                      setFormData({ ...formData, type: e.target.value as MaintenanceType })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  >
                    <option value="PREVENTIVE">Preventive</option>
                    <option value="CORRECTIVE">Corrective</option>
                  </select>
                </div>

                {/* Spareparts Selection with Quantity */}
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Spareparts Used
                  </label>
                  <div className="border border-purple-500/30 rounded-lg p-3 max-h-64 overflow-y-auto space-y-2 bg-purple-900/20">
                    {spareparts.length === 0 ? (
                      <p className="text-sm text-white/60">No spareparts available in inventory</p>
                    ) : (
                      spareparts.map((sparepart) => {
                        const usage = sparepartUsage.find(u => u.inventory_id === sparepart.id);
                        const isSelected = !!usage;
                        
                        return (
                          <div
                            key={sparepart.id}
                            className={`p-3 rounded-lg border transition-all ${
                              isSelected ? 'bg-orange-500/20 border-orange-400/50' : 'bg-purple-800/30 border-purple-500/30 hover:bg-purple-700/30'
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSparepartUsage([...sparepartUsage, { inventory_id: sparepart.id, quantity: 1 }]);
                                  } else {
                                    setSparepartUsage(sparepartUsage.filter(u => u.inventory_id !== sparepart.id));
                                  }
                                }}
                                className="mt-1 w-4 h-4 text-orange-600 rounded focus:ring-orange-500"
                              />
                              <div className="flex-1">
                                <p className="text-sm font-medium text-white">{sparepart.sparepart_name}</p>
                                <p className="text-xs text-white/60">
                                  {sparepart.asset_category} - {sparepart.resort_name}
                                </p>
                                <div className="flex items-center gap-3 mt-1">
                                  <p className="text-xs text-teal-300 font-medium">
                                    Rp {sparepart.last_unit_price.toLocaleString('id-ID')} / {sparepart.unit}
                                  </p>
                                  <p className={`text-xs font-medium ${
                                    sparepart.current_stock < 5 ? 'text-red-400' : 'text-green-400'
                                  }`}>
                                    Stock: {sparepart.current_stock} {sparepart.unit}
                                  </p>
                                </div>
                                
                                {isSelected && (
                                  <div className="mt-2 flex items-center gap-2">
                                    <label className="text-xs text-white/80">Qty:</label>
                                    <input
                                      type="number"
                                      min="1"
                                      max={sparepart.current_stock}
                                      value={usage?.quantity || 1}
                                      onChange={(e) => {
                                        const newQty = parseInt(e.target.value) || 1;
                                        setSparepartUsage(
                                          sparepartUsage.map(u => 
                                            u.inventory_id === sparepart.id 
                                              ? { ...u, quantity: Math.min(newQty, sparepart.current_stock) }
                                              : u
                                          )
                                        );
                                      }}
                                      className="w-20 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-orange-500"
                                    />
                                    <span className="text-xs text-white/70">
                                      Total: Rp {((usage?.quantity || 1) * sparepart.last_unit_price).toLocaleString('id-ID')}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                  {sparepartUsage.length > 0 && (
                    <div className="mt-2 p-2 bg-orange-500/20 rounded-lg border border-orange-400/30">
                      <p className="text-xs text-white/90">
                        {sparepartUsage.length} sparepart(s) selected - Total Cost: Rp{' '}
                        {sparepartUsage.reduce((sum, usage) => {
                          const sp = spareparts.find(s => s.id === usage.inventory_id);
                          return sum + (sp ? sp.last_unit_price * usage.quantity : 0);
                        }, 0).toLocaleString('id-ID')}
                      </p>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-white mb-1">
                    Description *
                  </label>
                  <textarea
                    required
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-white mb-1">
                      Start Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white mb-1">
                      Start Time *
                    </label>
                    <input
                      type="time"
                      required
                      value={formData.start_time}
                      onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-white mb-1">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={formData.end_date}
                      onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white mb-1">
                      End Time
                    </label>
                    <input
                      type="time"
                      value={formData.end_time}
                      onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>
                </div>
                <div className="flex gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setSelectedAsset(null);
                      setSparepartUsage([]);
                    }}
                    className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                  >
                    Create
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
