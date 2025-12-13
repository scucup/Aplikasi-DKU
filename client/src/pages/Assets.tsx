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

  return (
    <Layout>
      <div className="max-w-7xl mx-auto p-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-white">Assets Management</h1>
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
              className="px-6 py-3 bg-gradient-to-br from-purple-600 to-pink-600 text-white rounded-xl shadow-lg hover:shadow-xl transition-all"
            >
              + Add Asset
            </button>
          )}
        </div>

        {!canCreate && (
          <div className="mb-4 p-4 bg-yellow-900/30 border border-yellow-500/30 rounded-lg backdrop-blur-sm">
            <p className="text-sm text-yellow-200">
              You don't have permission to create assets. Only MANAGER and ENGINEER can create.
            </p>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-gradient-to-br from-purple-900/50 to-purple-800/50 backdrop-blur-md rounded-xl shadow-lg p-6 border border-purple-500/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white/70">Total Assets</p>
                <p className="text-2xl font-bold text-white mt-1">{assets.length}</p>
              </div>
              <svg className="w-10 h-10 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-green-900/50 to-green-800/50 backdrop-blur-md rounded-xl shadow-lg p-6 border border-green-500/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white/70">Active</p>
                <p className="text-2xl font-bold text-white mt-1">
                  {assets.filter(a => a.status === 'ACTIVE').length}
                </p>
              </div>
              <svg className="w-10 h-10 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-yellow-900/50 to-yellow-800/50 backdrop-blur-md rounded-xl shadow-lg p-6 border border-yellow-500/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white/70">Maintenance</p>
                <p className="text-2xl font-bold text-white mt-1">
                  {assets.filter(a => a.status === 'MAINTENANCE').length}
                </p>
              </div>
              <svg className="w-10 h-10 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
          </div>
          
          <div className="bg-gradient-to-br from-red-900/50 to-red-800/50 backdrop-blur-md rounded-xl shadow-lg p-6 border border-red-500/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white/70">Retired</p>
                <p className="text-2xl font-bold text-white mt-1">
                  {assets.filter(a => a.status === 'RETIRED').length}
                </p>
              </div>
              <svg className="w-10 h-10 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-purple-900/20 backdrop-blur-sm rounded-xl shadow-lg p-6 border border-purple-500/20 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/50 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search assets..."
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
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-4 py-2 bg-purple-800/50 border border-purple-500/30 rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="MAINTENANCE">Maintenance</option>
              <option value="RETIRED">Retired</option>
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
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-500/30 border-t-neon-purple"></div>
          </div>
        ) : (
          <div className="bg-purple-900/20 backdrop-blur-sm rounded-xl shadow-lg overflow-hidden border border-purple-500/20">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-purple-500/20">
                <thead className="bg-purple-800/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">
                      Asset
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">
                      Category
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">
                      Resort
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">
                      Purchase Price
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">
                      Purchase Date
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-white/70 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-purple-500/20">
                  {assets
                    .filter((asset) => {
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
                    })
                    .map((asset) => (
                      <tr 
                        key={asset.id} 
                        className="hover:bg-purple-800/30 transition-colors cursor-pointer"
                        onClick={() => navigate(`/assets/${asset.id}`)}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            {asset.photo_url && (
                              <img
                                src={asset.photo_url}
                                alt={asset.name}
                                className="w-12 h-12 object-cover rounded-lg"
                              />
                            )}
                            <div>
                              <div className="text-sm font-medium text-white hover:text-purple-400">{asset.name}</div>
                              {asset.serial_number && (
                                <div className="text-xs text-white/40 font-mono">SN: {asset.serial_number}</div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span className="text-xl">{getCategoryIcon(asset.category)}</span>
                            <span className="text-sm text-white">{asset.category.replace('_', ' ')}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-white">{(asset as any).resorts?.name || '-'}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(asset.status)}`}>
                            {asset.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-white font-semibold">Rp {asset.purchase_cost.toLocaleString('id-ID')}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-white">{new Date(asset.purchase_date).toLocaleDateString('id-ID')}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          {canCreate && (
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEdit(asset);
                              }}
                              className="text-purple-400 hover:text-purple-300 mr-3"
                              title="Edit"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
            
            {assets.filter((asset) => {
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
            }).length === 0 && (
              <div className="text-center py-12">
                <svg className="mx-auto h-12 w-12 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-white">No assets found</h3>
                <p className="mt-1 text-sm text-white/60">
                  {searchTerm || selectedResort !== 'all' || selectedStatus !== 'all' || selectedCategory !== 'all'
                    ? 'Try adjusting your filters'
                    : 'Start by adding your first asset'}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-gradient-to-br from-purple-900 to-slate-900 rounded-2xl p-8 max-w-md w-full max-h-[90vh] overflow-y-auto border border-purple-500/30">
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
                    className="w-full px-4 py-2 bg-white/10 border border-white/20 text-white rounded-lg focus:ring-2 focus:ring-purple-400 focus:border-purple-400 placeholder-white/50"
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
                    className="w-full px-4 py-2 bg-white/10 border border-white/20 text-white rounded-lg focus:ring-2 focus:ring-purple-400 focus:border-purple-400 placeholder-white/50"
                  />
                  <p className="text-xs text-white/70 mt-1">
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
                    className="w-full px-4 py-2 bg-white/10 border border-white/20 text-white rounded-lg focus:ring-2 focus:ring-purple-400 focus:border-purple-400"
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
                    className="w-full px-4 py-2 bg-white/10 border border-white/20 text-white rounded-lg focus:ring-2 focus:ring-purple-400 focus:border-purple-400"
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
                    className="w-full px-4 py-2 bg-white/10 border border-white/20 text-white rounded-lg focus:ring-2 focus:ring-purple-400 focus:border-purple-400"
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
                    className="w-full px-4 py-2 bg-white/10 border border-white/20 text-white rounded-lg focus:ring-2 focus:ring-purple-400 focus:border-purple-400 placeholder-white/50"
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
                    className="w-full px-4 py-2 bg-white/10 border border-white/20 text-white rounded-lg focus:ring-2 focus:ring-purple-400 focus:border-purple-400"
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
                    className="w-full px-4 py-2 bg-white/10 border border-white/20 text-white rounded-lg focus:ring-2 focus:ring-purple-400 focus:border-purple-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-purple-600 file:text-white hover:file:bg-purple-700 file:cursor-pointer"
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
                    className="w-full px-4 py-2 bg-white/10 border border-white/20 text-white rounded-lg focus:ring-2 focus:ring-purple-400 focus:border-purple-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-purple-600 file:text-white hover:file:bg-purple-700 file:cursor-pointer"
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
                    className="w-full px-4 py-2 bg-white/10 border border-white/20 text-white rounded-lg focus:ring-2 focus:ring-purple-400 focus:border-purple-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-purple-600 file:text-white hover:file:bg-purple-700 file:cursor-pointer"
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
                  <p className="text-xs text-white/70 mt-1">
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
                    className="flex-1 px-4 py-2 bg-purple-800/50 text-white rounded-lg hover:bg-purple-800/70 transition-colors"
                    disabled={uploading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={uploading}
                    className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-colors font-semibold disabled:opacity-50"
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
