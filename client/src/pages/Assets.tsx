import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  const navigate = useNavigate();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [resorts, setResorts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedResort, setSelectedResort] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  
  const canCreate = profile?.role === 'MANAGER' || profile?.role === 'ADMIN' || profile?.role === 'ENGINEER';
  const [formData, setFormData] = useState({
    name: '',
    category: 'ATV' as AssetCategory,
    resort_id: '',
    purchase_date: '',
    purchase_cost: '',
    status: 'ACTIVE' as AssetStatus,
    serial_number: '',
  });
  const [photoFiles, setPhotoFiles] = useState<{
    front: File | null;
    side: File | null;
    top: File | null;
  }>({ front: null, side: null, top: null });
  const [photoPreviews, setPhotoPreviews] = useState<{
    front: string | null;
    side: string | null;
    top: string | null;
  }>({ front: null, side: null, top: null });
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

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>, photoType: 'front' | 'side' | 'top') => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFiles(prev => ({ ...prev, [photoType]: file }));
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreviews(prev => ({ ...prev, [photoType]: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemovePhoto = (photoType: 'front' | 'side' | 'top') => {
    setPhotoFiles(prev => ({ ...prev, [photoType]: null }));
    setPhotoPreviews(prev => ({ ...prev, [photoType]: null }));
  };

  const uploadPhoto = async (assetId: string, file: File, photoType: string): Promise<string | null> => {
    if (!file) return null;

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${assetId}-${photoType}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('asset-photos')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('asset-photos').getPublicUrl(filePath);
      return data.publicUrl;
    } catch (error) {
      console.error('Error uploading photo:', error);
      return null;
    }
  };

  const handleEdit = async (asset: Asset) => {
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
    
    // Fetch full asset data to get all photo URLs
    const { data } = await supabase
      .from('assets')
      .select('photo_url, photo_front_url, photo_side_url, photo_top_url')
      .eq('id', asset.id)
      .single();
    
    if (data) {
      setPhotoPreviews({
        front: data.photo_front_url || data.photo_url || null,
        side: data.photo_side_url || null,
        top: data.photo_top_url || null,
      });
    }
    
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);

    try {
      const assetId = editingId || crypto.randomUUID();
      
      // Upload photos if new photos selected
      let photoFrontUrl = photoPreviews.front;
      let photoSideUrl = photoPreviews.side;
      let photoTopUrl = photoPreviews.top;
      
      if (photoFiles.front) {
        photoFrontUrl = await uploadPhoto(assetId, photoFiles.front, 'front');
      }
      if (photoFiles.side) {
        photoSideUrl = await uploadPhoto(assetId, photoFiles.side, 'side');
      }
      if (photoFiles.top) {
        photoTopUrl = await uploadPhoto(assetId, photoFiles.top, 'top');
      }

      const assetData = {
        name: formData.name,
        category: formData.category,
        resort_id: formData.resort_id,
        purchase_date: formData.purchase_date,
        purchase_cost: parseFloat(formData.purchase_cost),
        status: formData.status,
        serial_number: formData.serial_number || null,
        photo_url: photoFrontUrl, // Keep for backward compatibility
        photo_front_url: photoFrontUrl,
        photo_side_url: photoSideUrl,
        photo_top_url: photoTopUrl,
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
      setPhotoFiles({ front: null, side: null, top: null });
      setPhotoPreviews({ front: null, side: null, top: null });
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

  // Filtered assets based on user filters - used by both summary cards and table
  const filteredAssets = assets.filter((asset) => {
    const name = asset.name || '';
    const serialNumber = asset.serial_number || '';
    const category = asset.category || '';
    const resortName = (asset as any).resorts?.name || '';
    const search = searchTerm.toLowerCase();
    const matchesSearch = name.toLowerCase().includes(search) ||
                        serialNumber.toLowerCase().includes(search) ||
                        category.toLowerCase().includes(search) ||
                        resortName.toLowerCase().includes(search);
    const matchesResort = selectedResort === 'all' || asset.resort_id === selectedResort;
    const matchesStatus = selectedStatus === 'all' || asset.status === selectedStatus;
    const matchesCategory = selectedCategory === 'all' || asset.category === selectedCategory;
    return matchesSearch && matchesResort && matchesStatus && matchesCategory;
  });

  return (
    <Layout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h1 className="text-xl font-bold text-white">Assets</h1>
            <p className="text-xs text-slate-400">Manage all company assets</p>
          </div>
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
                setPhotoFiles({ front: null, side: null, top: null });
                setPhotoPreviews({ front: null, side: null, top: null });
                setShowModal(true);
              }}
              className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all text-sm font-medium"
            >
              + Add Asset
            </button>
          )}
        </div>

        {!canCreate && (
          <div className="p-3 bg-yellow-900/20 border border-yellow-600/30 rounded-lg">
            <p className="text-xs text-yellow-300">
              You don't have permission to create assets. Only MANAGER and ENGINEER can create.
            </p>
          </div>
        )}

        {/* Stats Cards - Compact */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-navy-900 rounded-xl p-4 border border-navy-700/50">
            <div className="text-xs text-slate-400 font-medium uppercase tracking-wider">Total</div>
            <div className="text-2xl font-bold text-white mt-1">{filteredAssets.length}</div>
          </div>
          <div className="bg-navy-900 rounded-xl p-4 border border-navy-700/50">
            <div className="text-xs text-green-400 font-medium uppercase tracking-wider">Active</div>
            <div className="text-2xl font-bold text-white mt-1">{filteredAssets.filter(a => a.status === 'ACTIVE').length}</div>
          </div>
          <div className="bg-navy-900 rounded-xl p-4 border border-navy-700/50">
            <div className="text-xs text-amber-400 font-medium uppercase tracking-wider">Maintenance</div>
            <div className="text-2xl font-bold text-white mt-1">{filteredAssets.filter(a => a.status === 'MAINTENANCE').length}</div>
          </div>
          <div className="bg-navy-900 rounded-xl p-4 border border-navy-700/50">
            <div className="text-xs text-emerald-400 font-medium uppercase tracking-wider">Total Value</div>
            <div className="text-lg font-bold text-white mt-1 whitespace-nowrap">Rp{'\u00A0'}{filteredAssets.reduce((sum, a) => sum + (a.purchase_cost || 0), 0).toLocaleString('id-ID')}</div>
          </div>
        </div>

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
                    placeholder="Search assets..."
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
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="px-3 py-1.5 bg-navy-800 border border-navy-600/50 rounded-lg text-white text-sm focus:ring-1 focus:ring-blue-500"
                >
                  <option value="all">All Status</option>
                  <option value="ACTIVE">Active</option>
                  <option value="MAINTENANCE">Maintenance</option>
                  <option value="RETIRED">Retired</option>
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
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-navy-700/50 bg-navy-800/50">
                    <th className="text-left py-2.5 px-3 text-slate-400 font-medium text-xs uppercase tracking-wider">Asset</th>
                    <th className="text-left py-2.5 px-3 text-slate-400 font-medium text-xs uppercase tracking-wider">Category</th>
                    <th className="text-left py-2.5 px-3 text-slate-400 font-medium text-xs uppercase tracking-wider">Resort</th>
                    <th className="text-left py-2.5 px-3 text-slate-400 font-medium text-xs uppercase tracking-wider">Status</th>
                    <th className="text-right py-2.5 px-3 text-slate-400 font-medium text-xs uppercase tracking-wider whitespace-nowrap">Purchase Price</th>
                    <th className="text-left py-2.5 px-3 text-slate-400 font-medium text-xs uppercase tracking-wider whitespace-nowrap">Purchase Date</th>
                    {canCreate && <th className="text-center py-2.5 px-3 text-slate-400 font-medium text-xs uppercase tracking-wider">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-navy-700/30">
                  {filteredAssets
                    .map((asset) => (
                      <tr 
                        key={asset.id} 
                        className="hover:bg-navy-800/50 transition-colors cursor-pointer"
                        onClick={() => navigate(`/assets/${asset.id}`)}
                      >
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2">
                            {asset.photo_url && (
                              <img src={asset.photo_url} alt={asset.name} className="w-8 h-8 object-cover rounded" />
                            )}
                            <div>
                              <div className="text-xs font-medium text-white">{asset.name}</div>
                              {asset.serial_number && (
                                <div className="text-[10px] text-slate-500 font-mono">SN: {asset.serial_number}</div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="px-1.5 py-0.5 bg-amber-500/10 text-amber-400 rounded text-[10px] font-medium">
                            {asset.category.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-300 text-xs max-w-[120px] truncate">
                          {(asset as any).resorts?.name || '-'}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide ${getStatusColor(asset.status)}`}>
                            {asset.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right whitespace-nowrap">
                          <span className="text-white font-semibold text-xs">Rp{'\u00A0'}{asset.purchase_cost.toLocaleString('id-ID')}</span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-400 text-xs whitespace-nowrap">
                          {new Date(asset.purchase_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </td>
                        {canCreate && (
                          <td className="py-2.5 px-3 text-center">
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEdit(asset);
                              }}
                              className="w-7 h-7 inline-flex items-center justify-center bg-blue-600/20 text-blue-400 rounded hover:bg-blue-600/40 transition-colors"
                              title="Edit"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  {filteredAssets.length === 0 && (
                    <tr>
                      <td colSpan={canCreate ? 7 : 6} className="py-12 text-center text-slate-500 text-sm">
                        {searchTerm || selectedResort !== 'all' || selectedStatus !== 'all' || selectedCategory !== 'all'
                          ? 'No assets match your filters'
                          : 'No assets yet'}
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
            <div className="bg-navy-900 rounded-2xl p-8 max-w-md w-full max-h-[90vh] overflow-y-auto border border-navy-600/50">
              <h2 className="text-2xl font-bold text-white mb-6">
                {editingId ? 'Edit Asset' : 'Add New Asset'}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Asset Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 bg-navy-800 border border-navy-600/50 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-400 placeholder-slate-500"
                    placeholder="Enter asset name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Serial Number
                  </label>
                  <input
                    type="text"
                    value={formData.serial_number}
                    onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
                    placeholder="e.g., montigo-1, atv-001"
                    className="w-full px-4 py-2 bg-navy-800 border border-navy-600/50 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-400 placeholder-slate-500"
                  />
                  <p className="text-xs text-slate-400 mt-1">
                    Unique identifier for this asset
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Category *
                  </label>
                  <select
                    required
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({ ...formData, category: e.target.value as AssetCategory })
                    }
                    className="w-full px-4 py-2 bg-navy-800 border border-navy-600/50 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-400"
                  >
                    <option value="ATV" className="bg-slate-800 text-white">ATV</option>
                    <option value="UTV" className="bg-slate-800 text-white">UTV</option>
                    <option value="SEA_SPORT" className="bg-slate-800 text-white">Sea Sport</option>
                    <option value="POOL_TOYS" className="bg-slate-800 text-white">Pool Toys</option>
                    <option value="LINE_SPORT" className="bg-slate-800 text-white">Line Sport</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-white mb-2">Resort *</label>
                  <select
                    required
                    value={formData.resort_id}
                    onChange={(e) => setFormData({ ...formData, resort_id: e.target.value })}
                    className="w-full px-4 py-2 bg-navy-800 border border-navy-600/50 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-400"
                  >
                    <option value="" className="bg-slate-800 text-white">Select Resort</option>
                    {resorts.map((resort) => (
                      <option key={resort.id} value={resort.id} className="bg-slate-800 text-white">
                        {resort.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Purchase Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.purchase_date}
                    onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
                    className="w-full px-4 py-2 bg-navy-800 border border-navy-600/50 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Purchase Cost *
                  </label>
                  <input
                    type="number"
                    required
                    value={formData.purchase_cost}
                    onChange={(e) => setFormData({ ...formData, purchase_cost: e.target.value })}
                    className="w-full px-4 py-2 bg-navy-800 border border-navy-600/50 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-400 placeholder-slate-500"
                    placeholder="Enter purchase cost"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white mb-2">Status *</label>
                  <select
                    required
                    value={formData.status}
                    onChange={(e) =>
                      setFormData({ ...formData, status: e.target.value as AssetStatus })
                    }
                    className="w-full px-4 py-2 bg-navy-800 border border-navy-600/50 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-400"
                  >
                    <option value="ACTIVE" className="bg-slate-800 text-white">Active</option>
                    <option value="MAINTENANCE" className="bg-slate-800 text-white">Maintenance</option>
                    <option value="RETIRED" className="bg-slate-800 text-white">Retired</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Front View Photo
                  </label>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/jpg"
                    onChange={(e) => handlePhotoChange(e, 'front')}
                    className="w-full px-4 py-2 bg-navy-800 border border-navy-600/50 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700 file:cursor-pointer"
                  />
                  {photoPreviews.front && (
                    <div className="mt-2 relative">
                      <img
                        src={photoPreviews.front}
                        alt="Front view preview"
                        className="w-full h-32 object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemovePhoto('front')}
                        className="absolute top-2 right-2 p-1 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors shadow-lg"
                        title="Hapus foto"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Side View Photo
                  </label>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/jpg"
                    onChange={(e) => handlePhotoChange(e, 'side')}
                    className="w-full px-4 py-2 bg-navy-800 border border-navy-600/50 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700 file:cursor-pointer"
                  />
                  {photoPreviews.side && (
                    <div className="mt-2 relative">
                      <img
                        src={photoPreviews.side}
                        alt="Side view preview"
                        className="w-full h-32 object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemovePhoto('side')}
                        className="absolute top-2 right-2 p-1 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors shadow-lg"
                        title="Hapus foto"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Top View Photo
                  </label>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/jpg"
                    onChange={(e) => handlePhotoChange(e, 'top')}
                    className="w-full px-4 py-2 bg-navy-800 border border-navy-600/50 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700 file:cursor-pointer"
                  />
                  {photoPreviews.top && (
                    <div className="mt-2 relative">
                      <img
                        src={photoPreviews.top}
                        alt="Top view preview"
                        className="w-full h-32 object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => handleRemovePhoto('top')}
                        className="absolute top-2 right-2 p-1 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors shadow-lg"
                        title="Hapus foto"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  )}
                  <p className="text-xs text-slate-400 mt-1">
                    Max 5MB per photo. Supported: JPG, PNG, WebP
                  </p>
                </div>
                <div className="flex gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setEditingId(null);
                      setPhotoFiles({ front: null, side: null, top: null });
                      setPhotoPreviews({ front: null, side: null, top: null });
                    }}
                    className="flex-1 px-4 py-2 bg-navy-800 text-white rounded-lg hover:bg-navy-700 transition-colors"
                    disabled={uploading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={uploading}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold disabled:opacity-50"
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
