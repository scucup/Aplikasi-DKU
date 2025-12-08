import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout';

type AssetCategory = 'ATV' | 'UTV' | 'SEA_SPORT' | 'POOL_TOYS' | 'LINE_SPORT';
type AssetStatus = 'ACTIVE' | 'MAINTENANCE' | 'RETIRED';

interface Asset {
  id: string;
  name: string;
  category: AssetCategory;
  resort_id: string;
  purchase_date: string;
  purchase_cost: number;
  status: AssetStatus;
  serial_number: string | null;
  photo_url: string | null;
  resort?: { name: string };
}

export default function Assets() {
  const { profile } = useAuth();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [resorts, setResorts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const canCreate = profile?.role === 'MANAGER' || profile?.role === 'ENGINEER';
  const [formData, setFormData] = useState({
    name: '',
    category: 'ATV' as AssetCategory,
    resort_id: '',
    purchase_date: '',
    purchase_cost: '',
    status: 'ACTIVE' as AssetStatus,
    serial_number: '',
  });
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchAssets();
    fetchResorts();
  }, []);

  const fetchResorts = async () => {
    const { data } = await supabase.from('resorts').select('id, name');
    setResorts(data || []);
  };

  const fetchAssets = async () => {
    try {
      const { data, error } = await supabase
        .from('assets')
        .select('*, resorts(name)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAssets(data || []);
    } catch (error) {
      console.error('Error fetching assets:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadPhoto = async (assetId: string): Promise<string | null> => {
    if (!photoFile) return null;

    try {
      const fileExt = photoFile.name.split('.').pop();
      const fileName = `${assetId}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('asset-photos')
        .upload(filePath, photoFile);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('asset-photos').getPublicUrl(filePath);
      return data.publicUrl;
    } catch (error) {
      console.error('Error uploading photo:', error);
      return null;
    }
  };

  const handleEdit = (asset: Asset) => {
    setEditingId(asset.id);
    setFormData({
      name: asset.name,
      category: asset.category,
      resort_id: asset.resort_id,
      purchase_date: asset.purchase_date,
      purchase_cost: asset.purchase_cost.toString(),
      status: asset.status,
      serial_number: asset.serial_number || '',
    });
    setPhotoPreview(asset.photo_url);
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);

    try {
      const assetId = editingId || crypto.randomUUID();
      
      // Upload photo first if new photo selected
      let photoUrl = photoPreview; // Keep existing photo URL
      if (photoFile) {
        photoUrl = await uploadPhoto(assetId);
      }

      const assetData = {
        name: formData.name,
        category: formData.category,
        resort_id: formData.resort_id,
        purchase_date: formData.purchase_date,
        purchase_cost: parseFloat(formData.purchase_cost),
        status: formData.status,
        serial_number: formData.serial_number || null,
        photo_url: photoUrl,
      };

      let error;
      if (editingId) {
        // Update existing asset
        const result = await supabase
          .from('assets')
          .update(assetData)
          .eq('id', editingId);
        error = result.error;
      } else {
        // Insert new asset
        const result = await supabase.from('assets').insert([
          {
            id: assetId,
            ...assetData,
          },
        ]);
        error = result.error;
      }

      if (error) throw error;

      setShowModal(false);
      setEditingId(null);
      setFormData({
        name: '',
        category: 'ATV',
        resort_id: '',
        purchase_date: '',
        purchase_cost: '',
        status: 'ACTIVE',
        serial_number: '',
      });
      setPhotoFile(null);
      setPhotoPreview(null);
      fetchAssets();
    } catch (error: any) {
      alert(`Error ${editingId ? 'updating' : 'creating'} asset: ` + error.message);
    } finally {
      setUploading(false);
    }
  };

  const getStatusColor = (status: AssetStatus) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-800';
      case 'MAINTENANCE':
        return 'bg-yellow-100 text-yellow-800';
      case 'RETIRED':
        return 'bg-red-100 text-red-800';
    }
  };

  const getCategoryIcon = (category: AssetCategory) => {
    switch (category) {
      case 'ATV':
      case 'UTV':
        return '🏍️';
      case 'SEA_SPORT':
        return '🚤';
      case 'POOL_TOYS':
        return '🏊';
      case 'LINE_SPORT':
        return '🎣';
    }
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto p-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Assets Management</h1>
          {canCreate && (
            <button
              onClick={() => {
                setEditingId(null);
                setFormData({
                  name: '',
                  category: 'ATV',
                  resort_id: '',
                  purchase_date: '',
                  purchase_cost: '',
                  status: 'ACTIVE',
                  serial_number: '',
                });
                setPhotoFile(null);
                setPhotoPreview(null);
                setShowModal(true);
              }}
              className="px-6 py-3 bg-gradient-to-br from-green-500 to-green-600 text-white rounded-xl shadow-neumorphic hover:shadow-neumorphic-hover transition-all"
            >
              + Add Asset
            </button>
          )}
        </div>

        {!canCreate && (
          <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              You don't have permission to create assets. Only MANAGER and ENGINEER can create.
            </p>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-green-600"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {assets.map((asset) => (
              <div
                key={asset.id}
                className="bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl p-6 shadow-neumorphic hover:shadow-neumorphic-hover transition-all relative"
              >
                {canCreate && (
                  <button
                    onClick={() => handleEdit(asset)}
                    className="absolute top-4 right-4 p-2 bg-white rounded-lg shadow-md hover:shadow-lg transition-all text-green-600 hover:text-green-700 z-10"
                    title="Edit asset"
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
                {/* Photo */}
                {asset.photo_url && (
                  <div className="mb-4 rounded-xl overflow-hidden">
                    <img
                      src={asset.photo_url}
                      alt={asset.name}
                      className="w-full h-48 object-cover"
                    />
                  </div>
                )}

                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{getCategoryIcon(asset.category)}</span>
                    <div>
                      <h3 className="text-lg font-bold text-gray-800">{asset.name}</h3>
                      <p className="text-sm text-gray-600">{asset.category}</p>
                      {asset.serial_number && (
                        <p className="text-xs text-gray-500 font-mono mt-1">
                          SN: {asset.serial_number}
                        </p>
                      )}
                    </div>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                      asset.status
                    )}`}
                  >
                    {asset.status}
                  </span>
                </div>
                <div className="space-y-2 text-sm text-gray-600">
                  <p>
                    <span className="font-medium">Resort:</span>{' '}
                    {(asset as any).resorts?.name || '-'}
                  </p>
                  <p>
                    <span className="font-medium">Purchase Date:</span>{' '}
                    {new Date(asset.purchase_date).toLocaleDateString()}
                  </p>
                  <p>
                    <span className="font-medium">Purchase Cost:</span> Rp{' '}
                    {asset.purchase_cost.toLocaleString('id-ID')}
                  </p>
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
                {editingId ? 'Edit Asset' : 'Add New Asset'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Asset Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Serial Number
                  </label>
                  <input
                    type="text"
                    value={formData.serial_number}
                    onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
                    placeholder="e.g., montigo-1, atv-001"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Unique identifier for this asset
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category *
                  </label>
                  <select
                    required
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({ ...formData, category: e.target.value as AssetCategory })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="ATV">ATV</option>
                    <option value="UTV">UTV</option>
                    <option value="SEA_SPORT">Sea Sport</option>
                    <option value="POOL_TOYS">Pool Toys</option>
                    <option value="LINE_SPORT">Line Sport</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Resort *</label>
                  <select
                    required
                    value={formData.resort_id}
                    onChange={(e) => setFormData({ ...formData, resort_id: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
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
                    Purchase Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.purchase_date}
                    onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Purchase Cost *
                  </label>
                  <input
                    type="number"
                    required
                    value={formData.purchase_cost}
                    onChange={(e) => setFormData({ ...formData, purchase_cost: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status *</label>
                  <select
                    required
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({ ...formData, status: e.target.value as AssetStatus })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  >
                    <option value="ACTIVE">Active</option>
                    <option value="MAINTENANCE">Maintenance</option>
                    <option value="RETIRED">Retired</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Asset Photo
                  </label>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/jpg"
                    onChange={handlePhotoChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                  {photoPreview && (
                    <div className="mt-2">
                      <img
                        src={photoPreview}
                        alt="Preview"
                        className="w-full h-48 object-cover rounded-lg"
                      />
                    </div>
                  )}
                  <p className="text-xs text-gray-500 mt-1">
                    Max 5MB. Supported: JPG, PNG, WebP
                  </p>
                </div>
                <div className="flex gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setEditingId(null);
                      setPhotoFile(null);
                      setPhotoPreview(null);
                    }}
                    className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                    disabled={uploading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={uploading}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                  >
                    {uploading ? 'Uploading...' : editingId ? 'Update' : 'Create'}
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
