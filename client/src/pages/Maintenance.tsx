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
    sparepart: { name: string; type: string };
  }>;
}

interface AssetDetail {
  id: string;
  name: string;
  serial_number: string | null;
  photo_url: string | null;
}

type SparepartCategory =
  | 'LUBRICANTS'
  | 'FILTERS'
  | 'BRAKE_SYSTEM'
  | 'ENGINE_PARTS'
  | 'ELECTRICAL'
  | 'TIRES'
  | 'SUSPENSION'
  | 'COOLING_SYSTEM'
  | 'FUEL_SYSTEM'
  | 'TRANSMISSION'
  | 'BODY_PARTS'
  | 'ACCESSORIES';

interface Sparepart {
  id: string;
  name: string;
  type: SparepartCategory;
  brand: string | null;
  unit_price: number;
}

export default function Maintenance() {
  const { user, profile } = useAuth();
  const [records, setRecords] = useState<MaintenanceRecord[]>([]);
  const [assets, setAssets] = useState<AssetDetail[]>([]);
  const [spareparts, setSpareparts] = useState<Sparepart[]>([]);
  const [selectedSpareparts, setSelectedSpareparts] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<AssetDetail | null>(null);
  const [formData, setFormData] = useState({
    asset_id: '',
    type: 'PREVENTIVE' as MaintenanceType,
    description: '',
    start_date: new Date().toISOString().split('T')[0],
    start_time: new Date().toTimeString().slice(0, 5),
    end_date: '',
    end_time: '',
    labor_cost: '',
  });

  const canCreate = profile?.role === 'ENGINEER' || profile?.role === 'MANAGER';

  const getCategoryLabel = (category: SparepartCategory) => {
    const labels: Record<SparepartCategory, string> = {
      LUBRICANTS: 'Lubricants',
      FILTERS: 'Filters',
      BRAKE_SYSTEM: 'Brake System',
      ENGINE_PARTS: 'Engine Parts',
      ELECTRICAL: 'Electrical',
      TIRES: 'Tires',
      SUSPENSION: 'Suspension',
      COOLING_SYSTEM: 'Cooling System',
      FUEL_SYSTEM: 'Fuel System',
      TRANSMISSION: 'Transmission',
      BODY_PARTS: 'Body Parts',
      ACCESSORIES: 'Accessories',
    };
    return labels[category] || category;
  };

  useEffect(() => {
    fetchRecords();
    fetchAssets();
    fetchSpareparts();
  }, []);

  const fetchAssets = async () => {
    const { data } = await supabase
      .from('assets')
      .select('id, name, serial_number, photo_url')
      .eq('status', 'ACTIVE');
    setAssets(data || []);
  };

  const fetchSpareparts = async () => {
    const { data } = await supabase
      .from('sparepart_master')
      .select('id, name, type, brand, unit_price')
      .order('name');
    setSpareparts(data || []);
  };

  const handleAssetChange = (assetId: string) => {
    const asset = assets.find((a) => a.id === assetId);
    setSelectedAsset(asset || null);
    setFormData({ ...formData, asset_id: assetId });
  };

  const fetchRecords = async () => {
    try {
      const { data, error } = await supabase
        .from('maintenance_records')
        .select(`
          *,
          asset:assets(name, serial_number, photo_url),
          maintenance_spareparts(
            sparepart:sparepart_master(name, type)
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
    try {
      const maintenanceId = crypto.randomUUID();
      
      // Combine date and time for start_date
      const startDateTime = `${formData.start_date}T${formData.start_time}:00`;
      
      // Combine date and time for end_date (if provided)
      let endDateTime = null;
      if (formData.end_date && formData.end_time) {
        endDateTime = `${formData.end_date}T${formData.end_time}:00`;
      }

      // Insert maintenance record
      const { error: maintenanceError } = await supabase.from('maintenance_records').insert([
        {
          id: maintenanceId,
          asset_id: formData.asset_id,
          type: formData.type,
          description: formData.description,
          start_date: startDateTime,
          end_date: endDateTime,
          labor_cost: parseFloat(formData.labor_cost),
          performed_by: user?.id,
          asset_serial_number: selectedAsset?.serial_number || null,
        },
      ]);

      if (maintenanceError) throw maintenanceError;

      // Insert selected spareparts
      if (selectedSpareparts.length > 0) {
        const sparepartRecords = selectedSpareparts.map(sparepartId => ({
          maintenance_record_id: maintenanceId,
          sparepart_id: sparepartId,
        }));

        const { error: sparepartsError } = await supabase
          .from('maintenance_spareparts')
          .insert(sparepartRecords);

        if (sparepartsError) throw sparepartsError;
      }

      setShowModal(false);
      setFormData({
        asset_id: '',
        type: 'PREVENTIVE',
        description: '',
        start_date: new Date().toISOString().split('T')[0],
        start_time: new Date().toTimeString().slice(0, 5),
        end_date: '',
        end_time: '',
        labor_cost: '',
      });
      setSelectedAsset(null);
      setSelectedSpareparts([]);
      fetchRecords();
    } catch (error: any) {
      alert('Error creating maintenance record: ' + error.message);
    }
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto p-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Maintenance Records</h1>
          {canCreate && (
            <button
              onClick={() => setShowModal(true)}
              className="px-6 py-3 bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-xl shadow-neumorphic hover:shadow-neumorphic-hover transition-all"
            >
              + Add Maintenance
            </button>
          )}
        </div>

        {!canCreate && (
          <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              You don't have permission to create maintenance records. Only ENGINEER and MANAGER can create.
            </p>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-orange-600"></div>
          </div>
        ) : (
          <div className="space-y-4">
            {records.map((record) => (
              <div
                key={record.id}
                className="bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl p-6 shadow-neumorphic hover:shadow-neumorphic-hover transition-all"
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
                      <h3 className="text-lg font-bold text-gray-800">{record.description}</h3>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                      <div>
                        <span className="font-medium">Asset:</span>{' '}
                        {(record as any).asset?.name || '-'}
                      </div>
                      <div>
                        <span className="font-medium">Serial Number:</span>{' '}
                        <span className="font-mono text-xs">
                          {record.asset_serial_number || '-'}
                        </span>
                      </div>
                      <div>
                        <span className="font-medium">Start:</span>{' '}
                        {new Date(record.start_date).toLocaleString('id-ID', {
                          dateStyle: 'short',
                          timeStyle: 'short',
                        })}
                      </div>
                      <div>
                        <span className="font-medium">End:</span>{' '}
                        {record.end_date
                          ? new Date(record.end_date).toLocaleString('id-ID', {
                              dateStyle: 'short',
                              timeStyle: 'short',
                            })
                          : 'Ongoing'}
                      </div>
                    </div>
                    
                    {/* Cost Breakdown */}
                    <div className="mt-4 pt-4 border-t border-gray-300">
                      <p className="text-sm font-medium text-gray-700 mb-2">Cost Breakdown:</p>
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
                              {ms.sparepart?.name} ({ms.sparepart?.type})
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
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Add Maintenance Record</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Asset *</label>
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
                  <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Asset Details</h4>
                    <div className="flex gap-4">
                      {selectedAsset.photo_url && (
                        <img
                          src={selectedAsset.photo_url}
                          alt={selectedAsset.name}
                          className="w-20 h-20 object-cover rounded-lg"
                        />
                      )}
                      <div className="text-sm text-gray-600">
                        <p>
                          <span className="font-medium">Name:</span> {selectedAsset.name}
                        </p>
                        {selectedAsset.serial_number && (
                          <p>
                            <span className="font-medium">Serial Number:</span>{' '}
                            <span className="font-mono text-xs">{selectedAsset.serial_number}</span>
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
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

                {/* Spareparts Multi-Select */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Spareparts Used
                  </label>
                  <div className="border border-gray-300 rounded-lg p-3 max-h-48 overflow-y-auto space-y-2">
                    {spareparts.length === 0 ? (
                      <p className="text-sm text-gray-500">No spareparts available</p>
                    ) : (
                      spareparts.map((sparepart) => (
                        <label
                          key={sparepart.id}
                          className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={selectedSpareparts.includes(sparepart.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedSpareparts([...selectedSpareparts, sparepart.id]);
                              } else {
                                setSelectedSpareparts(
                                  selectedSpareparts.filter((id) => id !== sparepart.id)
                                );
                              }
                            }}
                            className="w-4 h-4 text-orange-600 rounded focus:ring-orange-500"
                          />
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-800">{sparepart.name}</p>
                            <p className="text-xs text-gray-500">
                              {getCategoryLabel(sparepart.type)}
                              {sparepart.brand && ` - ${sparepart.brand}`}
                            </p>
                            <p className="text-xs text-teal-600 font-medium">
                              Rp {sparepart.unit_price.toLocaleString('id-ID')}
                            </p>
                          </div>
                        </label>
                      ))
                    )}
                  </div>
                  {selectedSpareparts.length > 0 && (
                    <p className="text-xs text-gray-500 mt-1">
                      {selectedSpareparts.length} sparepart(s) selected
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">
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
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Labor Cost *
                  </label>
                  <input
                    type="number"
                    required
                    value={formData.labor_cost}
                    onChange={(e) => setFormData({ ...formData, labor_cost: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>
                <div className="flex gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setSelectedAsset(null);
                      setSelectedSpareparts([]);
                    }}
                    className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
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
