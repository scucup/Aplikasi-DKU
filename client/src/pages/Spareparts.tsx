import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
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
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('ALL');

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
      item.resort_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.asset_category.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.last_supplier && item.last_supplier.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesCategory = filterCategory === 'ALL' || item.asset_category === filterCategory;

    return matchesSearch && matchesCategory;
  });

  // Calculate statistics
  const totalItems = inventory.length;
  const outOfStock = inventory.filter((i) => i.current_stock === 0).length;
  const lowStock = inventory.filter((i) => i.current_stock > 0 && i.current_stock <= 5).length;
  const totalValue = inventory.reduce((sum, i) => sum + i.current_stock * i.last_unit_price, 0);

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 md:py-6 lg:py-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-white">Sparepart Inventory</h1>
          <p className="text-white/60 text-sm">
            Stock is updated automatically when expenses are approved
          </p>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-purple-900/30 backdrop-blur-sm rounded-xl p-4 border border-purple-500/30">
            <div className="text-sm text-purple-200 font-medium mb-1">Total Items</div>
            <div className="text-2xl font-bold text-white">{totalItems}</div>
          </div>
          <div className="bg-red-900/30 backdrop-blur-sm rounded-xl p-4 border border-red-500/30">
            <div className="text-sm text-red-200 font-medium mb-1">Out of Stock</div>
            <div className="text-2xl font-bold text-white">{outOfStock}</div>
          </div>
          <div className="bg-yellow-900/30 backdrop-blur-sm rounded-xl p-4 border border-yellow-500/30">
            <div className="text-sm text-yellow-200 font-medium mb-1">Low Stock</div>
            <div className="text-2xl font-bold text-white">{lowStock}</div>
          </div>
          <div className="bg-green-900/30 backdrop-blur-sm rounded-xl p-4 border border-green-500/30">
            <div className="text-sm text-green-200 font-medium mb-1">Total Value</div>
            <div className="text-xl font-bold text-white">Rp {totalValue.toLocaleString('id-ID')}</div>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="bg-purple-900/20 backdrop-blur-sm rounded-xl p-4 border border-purple-500/20 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <svg
                className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/50"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                type="text"
                placeholder="Search by name, resort, category, or supplier..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-3 pl-12 bg-purple-800/50 border border-purple-500/30 rounded-lg text-white placeholder-white/40 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-4 py-3 bg-purple-800/50 border border-purple-500/30 rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              {assetCategories.map((cat) => (
                <option key={cat.value} value={cat.value} className="bg-slate-800">
                  {cat.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-500/30 border-t-neon-purple"></div>
          </div>
        ) : (
          <div className="bg-purple-900/20 backdrop-blur-sm rounded-2xl p-6 border border-purple-500/20">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-purple-500/20">
                    <th className="text-left py-3 px-4 text-white/90 font-semibold">Sparepart Name</th>
                    <th className="text-left py-3 px-4 text-white/90 font-semibold">Category</th>
                    <th className="text-left py-3 px-4 text-white/90 font-semibold">Resort</th>
                    <th className="text-center py-3 px-4 text-white/90 font-semibold">Stock</th>
                    <th className="text-left py-3 px-4 text-white/90 font-semibold">Unit</th>
                    <th className="text-right py-3 px-4 text-white/90 font-semibold">Last Price</th>
                    <th className="text-left py-3 px-4 text-white/90 font-semibold">Last Supplier</th>
                    <th className="text-center py-3 px-4 text-white/90 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInventory.map((item) => (
                    <tr
                      key={item.id}
                      className="border-b border-purple-500/10 hover:bg-purple-500/10 transition-colors"
                    >
                      <td className="py-3 px-4 text-white font-medium">{item.sparepart_name}</td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-1 bg-purple-500/20 text-purple-200 rounded text-xs">
                          {item.asset_category.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-white/70">{item.resort_name}</td>
                      <td className="py-3 px-4 text-center">
                        <span className="text-white font-bold text-lg">{item.current_stock}</span>
                      </td>
                      <td className="py-3 px-4 text-white/70">{item.unit}</td>
                      <td className="py-3 px-4 text-right text-white/70">
                        Rp {item.last_unit_price.toLocaleString('id-ID')}
                      </td>
                      <td className="py-3 px-4 text-white/70">{item.last_supplier || '-'}</td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStockStatusColor(item.current_stock)}`}>
                          {getStockStatusLabel(item.current_stock)}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {filteredInventory.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-white/50">
                        <div className="flex flex-col items-center gap-2">
                          <span className="text-4xl">📦</span>
                          <p>No inventory data available</p>
                          <p className="text-sm">
                            Stock will appear here after sparepart expenses are approved
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
