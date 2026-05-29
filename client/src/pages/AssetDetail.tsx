import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { formatDateLong, formatDate } from '../lib/utils';
import Layout from '../components/Layout';

interface Asset {
  id: string;
  name: string;
  category: string;
  resort_id: string;
  purchase_date: string;
  purchase_cost: number;
  status: string;
  serial_number: string | null;
  photo_url: string | null;
  photo_front_url: string | null;
  photo_side_url: string | null;
  photo_top_url: string | null;
  resort?: { name: string };
}

interface MaintenanceRecord {
  id: string;
  type: string;
  description: string;
  start_date: string;
  end_date: string | null;
  labor_cost: number;
  sparepart_cost: number;
  created_at: string;
}

export default function AssetDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [asset, setAsset] = useState<Asset | null>(null);
  const [maintenanceRecords, setMaintenanceRecords] = useState<MaintenanceRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      fetchAsset();
      fetchMaintenanceRecords();
    }
  }, [id]);

  const fetchAsset = async () => {
    try {
      const { data, error } = await supabase
        .from('assets')
        .select('id, name, category, resort_id, purchase_date, purchase_cost, status, serial_number, photo_url, photo_front_url, photo_side_url, photo_top_url, resorts(name)')
        .eq('id', id)
        .single();

      if (error) throw error;
      setAsset(data);
    } catch (error) {
      console.error('Error fetching asset:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMaintenanceRecords = async () => {
    try {
      const { data, error } = await supabase
        .from('maintenance_records')
        .select('id, type, description, start_date, end_date, labor_cost, sparepart_cost, created_at')
        .eq('asset_id', id)
        .order('start_date', { ascending: false });

      if (error) throw error;
      setMaintenanceRecords(data || []);
    } catch (error) {
      console.error('Error fetching maintenance records:', error);
    }
  };

  const calculateTotalMaintenanceCost = () => {
    return maintenanceRecords.reduce(
      (sum, record) => sum + record.labor_cost + record.sparepart_cost,
      0
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-800';
      case 'MAINTENANCE':
        return 'bg-yellow-100 text-yellow-800';
      case 'RETIRED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-navy-600/50 border-t-blue-500"></div>
        </div>
      </Layout>
    );
  }

  if (!asset) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto p-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white mb-4">Asset Not Found</h1>
            <button
              onClick={() => navigate('/assets')}
              className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
            >
              Back to Assets
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto p-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => navigate('/assets')}
            className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="text-3xl font-bold text-white">{asset.name}</h1>
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(asset.status)}`}>
            {asset.status}
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Photos Section */}
          <div className="space-y-6">
            <div className="bg-navy-900 rounded-2xl p-6 border border-navy-700/50">
              <h2 className="text-xl font-bold text-white mb-4">Asset Photos</h2>
              
              {/* Front Photo */}
              <div className="mb-6">
                <h3 className="text-sm font-medium text-slate-400 mb-2">Front View</h3>
                {asset.photo_front_url || asset.photo_url ? (
                  <img
                    src={asset.photo_front_url || asset.photo_url || ''}
                    alt="Front view"
                    className="w-full h-64 object-cover rounded-xl"
                  />
                ) : (
                  <div className="w-full h-64 bg-navy-800 rounded-xl flex items-center justify-center">
                    <p className="text-slate-500">No photo available</p>
                  </div>
                )}
              </div>

              {/* Side Photo */}
              <div className="mb-6">
                <h3 className="text-sm font-medium text-slate-400 mb-2">Side View</h3>
                {asset.photo_side_url ? (
                  <img
                    src={asset.photo_side_url}
                    alt="Side view"
                    className="w-full h-64 object-cover rounded-xl"
                  />
                ) : (
                  <div className="w-full h-64 bg-navy-800 rounded-xl flex items-center justify-center">
                    <p className="text-slate-500">No photo available</p>
                  </div>
                )}
              </div>

              {/* Top Photo */}
              <div>
                <h3 className="text-sm font-medium text-slate-400 mb-2">Top View</h3>
                {asset.photo_top_url ? (
                  <img
                    src={asset.photo_top_url}
                    alt="Top view"
                    className="w-full h-64 object-cover rounded-xl"
                  />
                ) : (
                  <div className="w-full h-64 bg-navy-800 rounded-xl flex items-center justify-center">
                    <p className="text-slate-500">No photo available</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Details Section */}
          <div className="space-y-6">
            <div className="bg-navy-900 rounded-2xl p-6 border border-navy-700/50">
              <h2 className="text-xl font-bold text-white mb-4">Asset Information</h2>
              
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-slate-500">Category</p>
                  <p className="text-lg text-white font-medium">{asset.category}</p>
                </div>

                <div>
                  <p className="text-sm text-slate-500">Serial Number</p>
                  <p className="text-lg text-white font-mono">{asset.serial_number || '-'}</p>
                </div>

                <div>
                  <p className="text-sm text-slate-500">Resort</p>
                  <p className="text-lg text-white">{(asset as any).resorts?.name || '-'}</p>
                </div>

                <div>
                  <p className="text-sm text-slate-500">Purchase Date</p>
                  <p className="text-lg text-white">
                    {formatDateLong(asset.purchase_date)}
                  </p>
                </div>

                <div>
                  <p className="text-sm text-slate-500">Purchase Cost</p>
                  <p className="text-2xl text-green-400 font-bold">
                    Rp {asset.purchase_cost.toLocaleString('id-ID')}
                  </p>
                </div>
              </div>
            </div>

            {/* Maintenance History */}
            <div className="bg-navy-900 rounded-2xl p-6 border border-navy-700/50">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-white">Maintenance History</h2>
                <div className="text-right">
                  <p className="text-xs text-slate-500">Total Maintenance Cost</p>
                  <p className="text-xl font-bold text-green-400">
                    Rp {calculateTotalMaintenanceCost().toLocaleString('id-ID')}
                  </p>
                </div>
              </div>

              {maintenanceRecords.length === 0 ? (
                <p className="text-slate-500 text-sm text-center py-8">No maintenance records yet</p>
              ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {maintenanceRecords.map((record) => (
                    <div
                      key={record.id}
                      className="bg-navy-800 rounded-lg p-4 border border-navy-700/50"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-medium ${
                                record.type === 'PREVENTIVE'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {record.type}
                            </span>
                            <span className="text-slate-500 text-xs">
                              {formatDate(record.start_date)}
                            </span>
                          </div>
                          <p className="text-white text-sm font-medium">{record.description}</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-navy-700/50">
                        <div>
                          <p className="text-xs text-slate-500">Sparepart Cost</p>
                          <p className="text-sm text-white font-medium">
                            Rp {record.sparepart_cost.toLocaleString('id-ID')}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-slate-500">Total Cost</p>
                          <p className="text-sm text-white font-bold">
                            Rp {(record.labor_cost + record.sparepart_cost).toLocaleString('id-ID')}
                          </p>
                        </div>
                      </div>

                      {record.end_date && (
                        <div className="mt-2 text-xs text-slate-500">
                          Completed: {formatDate(record.end_date)}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
