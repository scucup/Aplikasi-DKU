import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout';

type ReplacementPeriod = '1_MONTH' | '3_MONTHS' | '6_MONTHS' | '1_YEAR' | 'CUSTOM';
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
  supplier: string | null;
  replacement_period: ReplacementPeriod;
  custom_days: number | null;
  description: string | null;
  unit_price: number;
}

export default function Spareparts() {
  const { profile } = useAuth();
  const [spareparts, setSpareparts] = useState<Sparepart[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    type: 'FILTERS' as SparepartCategory,
    brand: '',
    supplier: '',
    replacement_period: '3_MONTHS' as ReplacementPeriod,
    custom_days: '',
    description: '',
    unit_price: '',
  });

  const sparepartCategories: { value: SparepartCategory; label: string }[] = [
    { value: 'LUBRICANTS', label: 'Lubricants (Oil, Grease)' },
    { value: 'FILTERS', label: 'Filters (Oil, Air, Fuel)' },
    { value: 'BRAKE_SYSTEM', label: 'Brake System' },
    { value: 'ENGINE_PARTS', label: 'Engine Parts' },
    { value: 'ELECTRICAL', label: 'Electrical (Battery, Alternator)' },
    { value: 'TIRES', label: 'Tires & Tubes' },
    { value: 'SUSPENSION', label: 'Suspension' },
    { value: 'COOLING_SYSTEM', label: 'Cooling System' },
    { value: 'FUEL_SYSTEM', label: 'Fuel System' },
    { value: 'TRANSMISSION', label: 'Transmission' },
    { value: 'BODY_PARTS', label: 'Body Parts' },
    { value: 'ACCESSORIES', label: 'Accessories' },
  ];

  const canCreate = profile?.role === 'ENGINEER' || profile?.role === 'MANAGER';

  useEffect(() => {
    fetchSpareparts();
  }, []);

  const fetchSpareparts = async () => {
    try {
      const { data, error } = await supabase
        .from('sparepart_master')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSpareparts(data || []);
    } catch (error) {
      console.error('Error fetching spareparts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (sparepart: Sparepart) => {
    setEditingId(sparepart.id);
    setFormData({
      name: sparepart.name,
      type: sparepart.type,
      brand: sparepart.brand || '',
      supplier: sparepart.supplier || '',
      replacement_period: sparepart.replacement_period,
      custom_days: sparepart.custom_days?.toString() || '',
      description: sparepart.description || '',
      unit_price: sparepart.unit_price.toString(),
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const sparepartData = {
        name: formData.name,
        type: formData.type,
        brand: formData.brand || null,
        supplier: formData.supplier || null,
        custom_days: formData.custom_days ? parseInt(formData.custom_days) : null,
        description: formData.description || null,
        unit_price: parseFloat(formData.unit_price) || 0,
        replacement_period: formData.replacement_period,
      };

      let error;
      if (editingId) {
        // Update existing sparepart
        const result = await supabase
          .from('sparepart_master')
          .update(sparepartData)
          .eq('id', editingId);
        error = result.error;
      } else {
        // Insert new sparepart
        const result = await supabase.from('sparepart_master').insert([sparepartData]);
        error = result.error;
      }

      if (error) throw error;

      setShowModal(false);
      setEditingId(null);
      setFormData({
        name: '',
        type: 'FILTERS',
        brand: '',
        supplier: '',
        replacement_period: '3_MONTHS',
        custom_days: '',
        description: '',
        unit_price: '',
      });
      fetchSpareparts();
    } catch (error: any) {
      alert(`Error ${editingId ? 'updating' : 'creating'} sparepart: ` + error.message);
    }
  };

  const getPeriodLabel = (period: ReplacementPeriod, customDays?: number | null) => {
    switch (period) {
      case '1_MONTH':
        return '1 Month';
      case '3_MONTHS':
        return '3 Months';
      case '6_MONTHS':
        return '6 Months';
      case '1_YEAR':
        return '1 Year';
      case 'CUSTOM':
        return `${customDays || 0} Days`;
      default:
        return period;
    }
  };

  const getCategoryLabel = (category: SparepartCategory) => {
    const cat = sparepartCategories.find((c) => c.value === category);
    return cat ? cat.label : category;
  };

  const getPeriodColor = (period: ReplacementPeriod) => {
    switch (period) {
      case '1_MONTH':
        return 'bg-red-100 text-red-800';
      case '3_MONTHS':
        return 'bg-orange-100 text-orange-800';
      case '6_MONTHS':
        return 'bg-yellow-100 text-yellow-800';
      case '1_YEAR':
        return 'bg-green-100 text-green-800';
      case 'CUSTOM':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto p-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Spareparts Management</h1>
          {canCreate && (
            <button
              onClick={() => {
                setEditingId(null);
                setFormData({
                  name: '',
                  type: 'FILTERS',
                  brand: '',
                  supplier: '',
                  replacement_period: '3_MONTHS',
                  custom_days: '',
                  description: '',
                  unit_price: '',
                });
                setShowModal(true);
              }}
              className="px-6 py-3 bg-gradient-to-br from-teal-500 to-teal-600 text-white rounded-xl shadow-neumorphic hover:shadow-neumorphic-hover transition-all"
            >
              + Add Sparepart
            </button>
          )}
        </div>

        {!canCreate && (
          <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              You don't have permission to create spareparts. Only ENGINEER and MANAGER can create.
            </p>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-teal-600"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {spareparts.map((sparepart) => (
              <div
                key={sparepart.id}
                className="bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl p-6 shadow-neumorphic hover:shadow-neumorphic-hover transition-all relative"
              >
                {canCreate && (
                  <button
                    onClick={() => handleEdit(sparepart)}
                    className="absolute top-4 right-4 p-2 bg-white rounded-lg shadow-md hover:shadow-lg transition-all text-teal-600 hover:text-teal-700"
                    title="Edit sparepart"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                    </svg>
                  </button>
                )}
                <div className="flex items-start justify-between mb-4 pr-10">
                  <div className="flex-1">
                    <h3 className="text-lg font-bold text-gray-800 mb-1">{sparepart.name}</h3>
                    <p className="text-sm text-gray-600">{getCategoryLabel(sparepart.type)}</p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${getPeriodColor(
                      sparepart.replacement_period
                    )}`}
                  >
                    {getPeriodLabel(sparepart.replacement_period, sparepart.custom_days)}
                  </span>
                </div>
                <div className="space-y-2 text-sm text-gray-600">
                  <p>
                    <span className="font-medium">Price:</span> Rp{' '}
                    {sparepart.unit_price.toLocaleString('id-ID')}
                  </p>
                  {sparepart.brand && (
                    <p>
                      <span className="font-medium">Brand:</span> {sparepart.brand}
                    </p>
                  )}
                  {sparepart.supplier && (
                    <p>
                      <span className="font-medium">Supplier:</span> {sparepart.supplier}
                    </p>
                  )}
                  {sparepart.description && (
                    <p className="text-xs text-gray-500 mt-2">{sparepart.description}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">
                {editingId ? 'Edit Sparepart' : 'Add New Sparepart'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Sparepart Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category *
                  </label>
                  <select
                    required
                    value={formData.type}
                    onChange={(e) =>
                      setFormData({ ...formData, type: e.target.value as SparepartCategory })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  >
                    {sparepartCategories.map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Brand</label>
                  <input
                    type="text"
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Supplier</label>
                  <input
                    type="text"
                    value={formData.supplier}
                    onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Unit Price (Rp) *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={formData.unit_price}
                    onChange={(e) => setFormData({ ...formData, unit_price: e.target.value })}
                    placeholder="0"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Replacement Period *
                  </label>
                  <select
                    required
                    value={formData.replacement_period}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        replacement_period: e.target.value as ReplacementPeriod,
                      })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  >
                    <option value="1_MONTH">1 Month</option>
                    <option value="3_MONTHS">3 Months</option>
                    <option value="6_MONTHS">6 Months</option>
                    <option value="1_YEAR">1 Year</option>
                    <option value="CUSTOM">Custom</option>
                  </select>
                </div>
                {formData.replacement_period === 'CUSTOM' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Custom Days *
                    </label>
                    <input
                      type="number"
                      required
                      value={formData.custom_days}
                      onChange={(e) => setFormData({ ...formData, custom_days: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  />
                </div>
                <div className="flex gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setEditingId(null);
                    }}
                    className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
                  >
                    {editingId ? 'Update' : 'Create'}
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
