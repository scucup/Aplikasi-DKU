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
  amount: number;
  recorded_by: string;
  resort?: { name: string };
}

export default function Revenue() {
  const { user, profile } = useAuth();
  const [records, setRecords] = useState<RevenueRecord[]>([]);
  const [resorts, setResorts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    resort_id: '',
    asset_category: 'ATV' as AssetCategory,
    date: new Date().toISOString().split('T')[0],
    amount: '',
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

  const fetchRecords = async () => {
    try {
      const { data, error } = await supabase
        .from('revenue_records')
        .select('*, resort:resorts(name)')
        .order('date', { ascending: false });

      if (error) throw error;
      setRecords(data || []);
    } catch (error) {
      console.error('Error fetching revenue records:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase.from('revenue_records').insert([
        {
          id: crypto.randomUUID(),
          ...formData,
          amount: parseFloat(formData.amount),
          recorded_by: user?.id,
        },
      ]);

      if (error) throw error;

      setShowModal(false);
      setFormData({
        resort_id: '',
        asset_category: 'ATV',
        date: new Date().toISOString().split('T')[0],
        amount: '',
      });
      fetchRecords();
    } catch (error: any) {
      alert('Error creating revenue record: ' + error.message);
    }
  };

  const totalRevenue = records.reduce((sum, record) => sum + Number(record.amount), 0);

  return (
    <Layout>
      <div className="max-w-7xl mx-auto p-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">Revenue Records</h1>
            <p className="text-lg text-gray-600 mt-2">
              Total: Rp {totalRevenue.toLocaleString('id-ID')}
            </p>
          </div>
          {canCreate && (
            <button
              onClick={() => setShowModal(true)}
              className="px-6 py-3 bg-gradient-to-br from-yellow-500 to-yellow-600 text-white rounded-xl shadow-neumorphic hover:shadow-neumorphic-hover transition-all"
            >
              + Add Revenue
            </button>
          )}
        </div>

        {!canCreate && (
          <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              You don't have permission to create revenue records. Only ADMIN and MANAGER can create.
            </p>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-yellow-600"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {records.map((record) => (
              <div
                key={record.id}
                className="bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl p-6 shadow-neumorphic hover:shadow-neumorphic-hover transition-all"
              >
                <div className="flex items-center justify-between mb-4">
                  <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">
                    {record.asset_category}
                  </span>
                  <span className="text-2xl font-bold text-green-600">
                    Rp {Number(record.amount).toLocaleString('id-ID')}
                  </span>
                </div>
                <div className="space-y-2 text-sm text-gray-600">
                  <p>
                    <span className="font-medium">Resort:</span>{' '}
                    {(record as any).resort?.name || '-'}
                  </p>
                  <p>
                    <span className="font-medium">Date:</span>{' '}
                    {new Date(record.date).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Add Revenue Record</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Resort *</label>
                  <select
                    required
                    value={formData.resort_id}
                    onChange={(e) => setFormData({ ...formData, resort_id: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Asset Category *
                  </label>
                  <select
                    required
                    value={formData.asset_category}
                    onChange={(e) =>
                      setFormData({ ...formData, asset_category: e.target.value as AssetCategory })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  >
                    <option value="ATV">ATV</option>
                    <option value="UTV">UTV</option>
                    <option value="SEA_SPORT">Sea Sport</option>
                    <option value="POOL_TOYS">Pool Toys</option>
                    <option value="LINE_SPORT">Line Sport</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount *</label>
                  <input
                    type="number"
                    required
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  />
                </div>
                <div className="flex gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors"
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
