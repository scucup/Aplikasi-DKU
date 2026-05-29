import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout';

type AssetCategory = 'ATV' | 'UTV' | 'SEA_SPORT' | 'POOL_TOYS' | 'LINE_SPORT';

interface InventoryItem {
  id: string;
  sparepart_name: string;
  asset_category: AssetCategory;
  resort_id: string;
  resort_name: string;
  current_stock: number;
  unit: string;
  last_unit_price: number;
  last_purchase_date: string | null;
  last_supplier: string | null;
}

export default function Spareparts() {
  const { profile } = useAuth();
  const isManager = profile?.role === 'MANAGER';
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [selectedResort, setSelectedResort] = useState<string>('ALL');
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [editFormData, setEditFormData] = useState({
    sparepart_name: '',
    current_stock: 0,
    unit: 'pcs',
    last_unit_price: 0,
    last_supplier: '',
  });

  const assetCategories: { value: string; label: string }[] = [
    { value: 'ALL', label: 'All Categories' },
    { value: 'ATV', label: 'ATV' },
    { value: 'UTV', label: 'UTV' },
    { value: 'SEA_SPORT', label: 'Sea Sport' },
    { value: 'POOL_TOYS', label: 'Pool Toys' },
    { value: 'LINE_SPORT', label: 'Line Sport' },
  ];

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('sparepart_inventory')
        .select(`
          *,
          resorts (name)
        `)
        .order('current_stock', { ascending: true });

      if (error) throw error;

      const formattedData =
        data?.map((item) => ({
          ...item,
          resort_name: item.resorts?.name || 'Unknown',
        })) || [];

      setInventory(formattedData);
    } catch (error) {
      console.error('Error fetching inventory:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStockStatusColor = (stock: number) => {
    if (stock === 0) return 'bg-red-500/20 text-red-300 border border-red-500/30';
    if (stock <= 5) return 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/30';
    return 'bg-green-500/20 text-green-300 border border-green-500/30';
  };

  const getStockStatusLabel = (stock: number) => {
    if (stock === 0) return 'Out of Stock';
    if (stock <= 5) return 'Low Stock';
    return 'In Stock';
  };

  const filteredInventory = inventory.filter((item) => {
    const matchesSearch =
      item.sparepart_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.last_supplier && item.last_supplier.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesCategory = filterCategory === 'ALL' || item.asset_category === filterCategory;
    const matchesResort = selectedResort === 'ALL' || item.resort_id === selectedResort;

    return matchesSearch && matchesCategory && matchesResort;
  });

  // Calculate statistics
  const totalItems = inventory.length;
  const outOfStock = inventory.filter((i) => i.current_stock === 0).length;
  const lowStock = inventory.filter((i) => i.current_stock > 0 && i.current_stock <= 5).length;
  const totalValue = inventory.reduce((sum, i) => sum + i.current_stock * i.last_unit_price, 0);

  // Handle Edit
  const handleEdit = (item: InventoryItem) => {
    setEditingItem(item);
    setEditFormData({
      sparepart_name: item.sparepart_name,
      current_stock: item.current_stock,
      unit: item.unit,
      last_unit_price: item.last_unit_price,
      last_supplier: item.last_supplier || '',
    });
    setShowEditModal(true);
  };

  // Handle Update
  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    try {
      const { error } = await supabase
        .from('sparepart_inventory')
        .update({
          sparepart_name: editFormData.sparepart_name,
          current_stock: editFormData.current_stock,
          unit: editFormData.unit,
          last_unit_price: editFormData.last_unit_price,
          last_supplier: editFormData.last_supplier || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingItem.id);

      if (error) throw error;

      setShowEditModal(false);
      setEditingItem(null);
      fetchInventory();
      alert('Sparepart updated successfully!');
    } catch (error: any) {
      alert('Error updating sparepart: ' + error.message);
    }
  };

  // Handle Delete
  const handleDelete = async (item: InventoryItem) => {
    if (
      !confirm(
        `Are you sure you want to delete "${item.sparepart_name}"?\n\n⚠️ This will also delete related expense records.\n\nThis action cannot be undone.`
      )
    ) {
      return;
    }

    try {
      // Find related expense IDs from stock transactions
      const { data: transactions } = await supabase
        .from('stock_transactions')
        .select('reference_id, reference_type')
        .eq('inventory_id', item.id)
        .eq('reference_type', 'EXPENSE');

      const expenseIds = transactions?.map((t) => t.reference_id) || [];

      // Delete related stock transactions
      await supabase.from('stock_transactions').delete().eq('inventory_id', item.id);

      // Delete expense_spareparts related to this inventory
      const { data: expenseSpareparts } = await supabase
        .from('expense_spareparts')
        .select('expense_id')
        .eq('sparepart_name', item.sparepart_name)
        .eq('asset_category', item.asset_category);

      // Delete expense_spareparts
      await supabase
        .from('expense_spareparts')
        .delete()
        .eq('sparepart_name', item.sparepart_name)
        .eq('asset_category', item.asset_category);

      // Delete related expenses if they have no more sparepart items
      if (expenseSpareparts && expenseSpareparts.length > 0) {
        for (const es of expenseSpareparts) {
          // Check if expense has other sparepart items
          const { data: remainingItems } = await supabase
            .from('expense_spareparts')
            .select('id')
            .eq('expense_id', es.expense_id);

          // If no remaining items, delete the expense
          if (!remainingItems || remainingItems.length === 0) {
            await supabase.from('expenses').delete().eq('id', es.expense_id);
          }
        }
      }

      // Delete the inventory item
      const { error } = await supabase.from('sparepart_inventory').delete().eq('id', item.id);

      if (error) throw error;

      fetchInventory();
      alert(
        `Sparepart "${item.sparepart_name}" deleted successfully!\n\n✅ Related expense records have been cleaned up.`
      );
    } catch (error: any) {
      alert('Error deleting sparepart: ' + error.message);
    }
  };

  return (
    <Layout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h1 className="text-xl font-bold text-white">Spareparts</h1>
            <p className="text-xs text-slate-400">Stock updated automatically when expenses are approved</p>
          </div>
        </div>

        {/* Stats Cards - Compact */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-navy-900 rounded-xl p-4 border border-navy-700/50">
            <div className="text-xs text-slate-400 font-medium uppercase tracking-wider">Total Items</div>
            <div className="text-2xl font-bold text-white mt-1">{totalItems}</div>
          </div>
          <div className="bg-navy-900 rounded-xl p-4 border border-navy-700/50">
            <div className="text-xs text-red-400 font-medium uppercase tracking-wider">Out of Stock</div>
            <div className="text-2xl font-bold text-white mt-1">{outOfStock}</div>
          </div>
          <div className="bg-navy-900 rounded-xl p-4 border border-navy-700/50">
            <div className="text-xs text-amber-400 font-medium uppercase tracking-wider">Low Stock</div>
            <div className="text-2xl font-bold text-white mt-1">{lowStock}</div>
          </div>
          <div className="bg-navy-900 rounded-xl p-4 border border-navy-700/50">
            <div className="text-xs text-green-400 font-medium uppercase tracking-wider">Total Value</div>
            <div className="text-lg font-bold text-white mt-1 whitespace-nowrap">Rp{'\u00A0'}{totalValue.toLocaleString('id-ID')}</div>
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
                    placeholder="Search..."
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
                  <option value="ALL">All Resorts</option>
                  {[...new Set(inventory.map(item => item.resort_id))].map(resortId => {
                    const resort = inventory.find(item => item.resort_id === resortId);
                    return (
                      <option key={resortId} value={resortId}>{resort?.resort_name || 'Unknown'}</option>
                    );
                  })}
                </select>
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="px-3 py-1.5 bg-navy-800 border border-navy-600/50 rounded-lg text-white text-sm focus:ring-1 focus:ring-blue-500"
                >
                  {assetCategories.map((cat) => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-navy-700/50 bg-navy-800/50">
                    <th className="text-left py-2.5 px-3 text-slate-400 font-medium text-xs uppercase tracking-wider">Name</th>
                    <th className="text-left py-2.5 px-3 text-slate-400 font-medium text-xs uppercase tracking-wider">Category</th>
                    <th className="text-left py-2.5 px-3 text-slate-400 font-medium text-xs uppercase tracking-wider">Resort</th>
                    <th className="text-center py-2.5 px-3 text-slate-400 font-medium text-xs uppercase tracking-wider">Stock</th>
                    <th className="text-right py-2.5 px-3 text-slate-400 font-medium text-xs uppercase tracking-wider whitespace-nowrap">Unit Price</th>
                    <th className="text-left py-2.5 px-3 text-slate-400 font-medium text-xs uppercase tracking-wider">Supplier</th>
                    <th className="text-center py-2.5 px-3 text-slate-400 font-medium text-xs uppercase tracking-wider">Status</th>
                    {isManager && <th className="text-center py-2.5 px-3 text-slate-400 font-medium text-xs uppercase tracking-wider">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-navy-700/30">
                  {filteredInventory.map((item) => (
                    <tr key={item.id} className="hover:bg-navy-800/50 transition-colors">
                      <td className="py-2.5 px-3 text-white text-xs font-medium">{item.sparepart_name}</td>
                      <td className="py-2.5 px-3">
                        <span className="px-1.5 py-0.5 bg-blue-500/10 text-blue-400 rounded text-[10px] font-medium">
                          {item.asset_category.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-400 text-xs max-w-[100px] truncate">{item.resort_name}</td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="text-white font-bold text-sm">{item.current_stock}</span>
                        <span className="text-slate-500 text-[10px] ml-1">{item.unit}</span>
                      </td>
                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                        <span className="text-slate-300 text-xs">Rp{'\u00A0'}{item.last_unit_price.toLocaleString('id-ID')}</span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-400 text-xs max-w-[100px] truncate">{item.last_supplier || '-'}</td>
                      <td className="py-2.5 px-3 text-center">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${getStockStatusColor(item.current_stock)}`}>
                          {getStockStatusLabel(item.current_stock)}
                        </span>
                      </td>
                      {isManager && (
                        <td className="py-2.5 px-3">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => handleEdit(item)}
                              className="w-7 h-7 flex items-center justify-center bg-blue-600/20 text-blue-400 rounded hover:bg-blue-600/40 transition-colors"
                              title="Edit"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                            </button>
                            <button
                              onClick={() => handleDelete(item)}
                              className="w-7 h-7 flex items-center justify-center bg-red-600/20 text-red-400 rounded hover:bg-red-600/40 transition-colors"
                              title="Delete"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                  {filteredInventory.length === 0 && (
                    <tr>
                      <td colSpan={isManager ? 8 : 7} className="py-12 text-center text-slate-500 text-sm">
                        No inventory data available
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Edit Modal */}
        {showEditModal && editingItem && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-navy-900 rounded-2xl p-8 max-w-md w-full border border-navy-600/50">
              <h2 className="text-2xl font-bold text-white mb-6">Edit Sparepart</h2>
              <form onSubmit={handleUpdate} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-white mb-2">Sparepart Name *</label>
                  <input
                    type="text"
                    required
                    value={editFormData.sparepart_name}
                    onChange={(e) => setEditFormData({ ...editFormData, sparepart_name: e.target.value })}
                    className="w-full px-4 py-2 bg-navy-800 border border-navy-600/50 text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">Stock *</label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={editFormData.current_stock}
                      onChange={(e) => setEditFormData({ ...editFormData, current_stock: parseInt(e.target.value) || 0 })}
                      className="w-full px-4 py-2 bg-navy-800 border border-navy-600/50 text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">Unit *</label>
                    <select
                      value={editFormData.unit}
                      onChange={(e) => setEditFormData({ ...editFormData, unit: e.target.value })}
                      className="w-full px-4 py-2 bg-navy-800 border border-navy-600/50 text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="pcs" className="bg-slate-800">pcs</option>
                      <option value="liter" className="bg-slate-800">liter</option>
                      <option value="kg" className="bg-slate-800">kg</option>
                      <option value="set" className="bg-slate-800">set</option>
                      <option value="box" className="bg-slate-800">box</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-white mb-2">Unit Price *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    value={editFormData.last_unit_price}
                    onChange={(e) => setEditFormData({ ...editFormData, last_unit_price: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-2 bg-navy-800 border border-navy-600/50 text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-white mb-2">Supplier</label>
                  <input
                    type="text"
                    value={editFormData.last_supplier}
                    onChange={(e) => setEditFormData({ ...editFormData, last_supplier: e.target.value })}
                    className="w-full px-4 py-2 bg-navy-800 border border-navy-600/50 text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditModal(false);
                      setEditingItem(null);
                    }}
                    className="flex-1 px-4 py-2 bg-navy-800 text-white rounded-lg hover:bg-navy-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
                  >
                    Update
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
