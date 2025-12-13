import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout';

type AssetCategory = 'ATV' | 'UTV' | 'SEA_SPORT' | 'POOL_TOYS' | 'LINE_SPORT';

interface Resort {
  id: string;
  name: string;
}

interface PurchaseOrderItem {
  id: string;
  sparepart_name: string;
  asset_category: AssetCategory;
  quantity: number;
  unit: string;
  unit_price: number;
  total_price: number;
  item_type: 'SPAREPART' | 'SERVICE';
}

interface PurchaseOrder {
  id: string;
  po_number: string;
  resort_id: string;
  resort_name: string;
  supplier_name: string;
  purchase_date: string;
  total_amount: number;
  status: string;
  created_at: string;
}

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
  const [activeTab, setActiveTab] = useState<'inventory' | 'purchases'>('inventory');
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [purchases, setPurchases] = useState<PurchaseOrder[]>([]);
  const [resorts, setResorts] = useState<Resort[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  // Purchase Order Form State
  const [poFormData, setPoFormData] = useState({
    resort_id: '',
    supplier_name: '',
    purchase_date: new Date().toISOString().split('T')[0],
  });
  
  const [lineItems, setLineItems] = useState<Omit<PurchaseOrderItem, 'id' | 'total_price'>[]>([
    {
      sparepart_name: '',
      asset_category: 'ATV' as AssetCategory,
      quantity: 1,
      unit: 'pcs',
      unit_price: 0,
      item_type: 'SPAREPART' as 'SPAREPART' | 'SERVICE',
    },
  ]);
  
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [poItems, setPoItems] = useState<PurchaseOrderItem[]>([]);

  const assetCategories: { value: AssetCategory; label: string }[] = [
    { value: 'ATV', label: 'ATV' },
    { value: 'UTV', label: 'UTV' },
    { value: 'SEA_SPORT', label: 'Sea Sport' },
    { value: 'POOL_TOYS', label: 'Pool Toys' },
    { value: 'LINE_SPORT', label: 'Line Sport' },
  ];

  const units = ['pcs', 'liter', 'kg', 'box', 'set', 'meter', 'roll'];

  const canCreate = profile?.role === 'ENGINEER' || profile?.role === 'MANAGER';

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch resorts
      const { data: resortsData } = await supabase
        .from('resorts')
        .select('id, name')
        .order('name');
      setResorts(resortsData || []);

      if (activeTab === 'inventory') {
        await fetchInventory();
      } else {
        await fetchPurchases();
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchInventory = async () => {
    try {
      const { data, error } = await supabase
        .from('sparepart_inventory')
        .select(`
          *,
          resorts (name)
        `)
        .order('current_stock', { ascending: true });

      if (error) throw error;
      
      const formattedData = data?.map(item => ({
        ...item,
        resort_name: item.resorts?.name || 'Unknown'
      })) || [];
      
      setInventory(formattedData);
    } catch (error) {
      console.error('Error fetching inventory:', error);
    }
  };

  const fetchPurchases = async () => {
    try {
      const { data, error } = await supabase
        .from('purchase_orders')
        .select(`
          *,
          resorts (name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const formattedData = data?.map(item => ({
        ...item,
        resort_name: item.resorts?.name || 'Unknown'
      })) || [];
      
      setPurchases(formattedData);
    } catch (error) {
      console.error('Error fetching purchases:', error);
    }
  };

  const addLineItem = () => {
    setLineItems([
      ...lineItems,
      {
        sparepart_name: '',
        asset_category: 'ATV' as AssetCategory,
        quantity: 1,
        unit: 'pcs',
        unit_price: 0,
        item_type: 'SPAREPART' as 'SPAREPART' | 'SERVICE',
      },
    ]);
  };

  const removeLineItem = (index: number) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter((_, i) => i !== index));
    }
  };

  const updateLineItem = (index: number, field: string, value: any) => {
    const updated = [...lineItems];
    if (field === 'quantity' || field === 'unit_price') {
      updated[index] = { ...updated[index], [field]: isNaN(value) ? 0 : value };
    } else {
      updated[index] = { ...updated[index], [field]: value };
    }
    setLineItems(updated);
  };

  const calculateTotal = () => {
    return lineItems.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0);
  };

  const handleSubmitPurchaseOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!poFormData.resort_id || !poFormData.supplier_name) {
      alert('Please fill in all required fields');
      return;
    }

    if (lineItems.some(item => !item.sparepart_name || item.quantity <= 0 || item.unit_price < 0)) {
      alert('Please fill in all line items correctly');
      return;
    }

    try {
      // Create purchase order
      const { data: poData, error: poError } = await supabase
        .from('purchase_orders')
        .insert([{
          resort_id: poFormData.resort_id,
          supplier_name: poFormData.supplier_name,
          purchase_date: poFormData.purchase_date,
          total_amount: calculateTotal(),
          status: 'PENDING',
          created_by: profile?.id,
        }])
        .select()
        .single();

      if (poError) throw poError;

      // Create line items
      const itemsToInsert = lineItems.map(item => ({
        purchase_order_id: poData.id,
        sparepart_name: item.sparepart_name,
        asset_category: item.asset_category,
        quantity: item.quantity,
        unit: item.unit,
        unit_price: item.unit_price,
        total_price: item.quantity * item.unit_price,
        item_type: item.item_type,
      }));

      const { error: itemsError } = await supabase
        .from('purchase_order_items')
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;

      // NOTE: Inventory will be updated when Manager approves the expense, not here
      // This ensures inventory only updates after final approval

      // Get all Manager users for notification to approve PO
      const { data: managers } = await supabase
        .from('users')
        .select('id, name, role')
        .eq('role', 'MANAGER');

      // Create notifications for Manager to approve PO
      if (managers && managers.length > 0) {
        const notifications = managers.map(manager => ({
          user_id: manager.id,
          title: 'Action Required: Approve Purchase Order',
          message: `Purchase Order ${poData.po_number} has been created by ${profile?.name || 'Engineer'}. Supplier: ${poFormData.supplier_name}. Total amount: Rp ${calculateTotal().toLocaleString('id-ID')}. Please review and approve this purchase order.`,
          notification_type: 'PURCHASE_ORDER_CREATED',
          reference_id: poData.id,
          reference_type: 'PURCHASE_ORDER',
          status: 'UNREAD',
        }));

        await supabase.from('notifications').insert(notifications);
      }

      alert('Purchase order created successfully! Notification sent to Manager for approval.');
      setShowModal(false);
      resetForm();
      fetchData();
    } catch (error: any) {
      console.error('Error creating purchase order:', error);
      alert('Error creating purchase order: ' + error.message);
    }
  };

  const resetForm = () => {
    setPoFormData({
      resort_id: '',
      supplier_name: '',
      purchase_date: new Date().toISOString().split('T')[0],
    });
    setLineItems([{
      sparepart_name: '',
      asset_category: 'ATV' as AssetCategory,
      quantity: 1,
      unit: 'pcs',
      unit_price: 0,
      item_type: 'SPAREPART' as 'SPAREPART' | 'SERVICE',
    }]);
  };

  const viewPODetails = async (po: PurchaseOrder) => {
    setSelectedPO(po);
    try {
      const { data, error } = await supabase
        .from('purchase_order_items')
        .select('*')
        .eq('purchase_order_id', po.id);
      
      if (error) throw error;
      setPoItems(data || []);
      setShowDetailModal(true);
    } catch (error) {
      console.error('Error fetching PO items:', error);
    }
  };

  const handleApprovePO = async (poId: string) => {
    if (!confirm('Are you sure you want to approve this purchase order?')) return;
    
    try {
      // Get PO details
      const { data: poData } = await supabase
        .from('purchase_orders')
        .select('po_number, supplier_name, total_amount')
        .eq('id', poId)
        .single();

      const { error } = await supabase
        .from('purchase_orders')
        .update({ status: 'APPROVED' })
        .eq('id', poId);
      
      if (error) throw error;

      // Get all Admin users for notification to create expense
      const { data: admins } = await supabase
        .from('users')
        .select('id, name, role')
        .eq('role', 'ADMIN');

      // Create notifications for Admin to create expense
      if (admins && admins.length > 0 && poData) {
        const notifications = admins.map(admin => ({
          user_id: admin.id,
          title: 'Action Required: Create Expense for Approved Purchase Order',
          message: `Purchase Order ${poData.po_number} has been approved by ${profile?.name || 'Manager'}. Supplier: ${poData.supplier_name}. Total amount: Rp ${poData.total_amount.toLocaleString('id-ID')}. Please create an expense record for this purchase.`,
          notification_type: 'PURCHASE_ORDER_APPROVED',
          reference_id: poId,
          reference_type: 'PURCHASE_ORDER',
          status: 'UNREAD',
        }));

        await supabase.from('notifications').insert(notifications);
      }
      
      alert('Purchase order approved successfully! Notification sent to Admin to create expense.');
      setShowDetailModal(false);
      fetchData();
    } catch (error: any) {
      alert('Error approving purchase order: ' + error.message);
    }
  };

  const handleRejectPO = async (poId: string) => {
    const reason = prompt('Please enter rejection reason:');
    if (!reason) return;
    
    try {
      // Update PO status
      const { error: poError } = await supabase
        .from('purchase_orders')
        .update({ status: 'REJECTED' })
        .eq('id', poId);
      
      if (poError) throw poError;
      
      // NOTE: No need to reverse inventory since it's not added yet
      // Inventory only updates when expense is approved
      
      alert('Purchase order rejected!');
      setShowDetailModal(false);
      fetchData();
    } catch (error: any) {
      alert('Error rejecting purchase order: ' + error.message);
    }
  };

  const getStockStatusColor = (stock: number) => {
    if (stock === 0) return 'bg-red-100 text-red-800';
    if (stock < 5) return 'bg-yellow-100 text-yellow-800';
    return 'bg-green-100 text-green-800';
  };

  const getStockStatusLabel = (stock: number) => {
    if (stock === 0) return 'Out of Stock';
    if (stock < 5) return 'Low Stock';
    return 'In Stock';
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 md:py-6 lg:py-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-white">Sparepart Management</h1>
          {canCreate && (
            <button
              onClick={() => {
                resetForm();
                setShowModal(true);
              }}
              className="px-6 py-3 bg-gradient-to-br from-purple-600 to-pink-600 text-white rounded-xl shadow-lg hover:shadow-xl transition-all"
            >
              + New Purchase Order
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setActiveTab('inventory')}
            className={`px-6 py-3 rounded-xl transition-all ${
              activeTab === 'inventory'
                ? 'bg-purple-600/30 backdrop-blur-sm text-white border border-purple-500/50'
                : 'bg-purple-900/20 text-white/70 hover:bg-purple-900/30'
            }`}
          >
            📦 Inventory Stock
          </button>
          <button
            onClick={() => setActiveTab('purchases')}
            className={`px-6 py-3 rounded-xl transition-all ${
              activeTab === 'purchases'
                ? 'bg-purple-600/30 backdrop-blur-sm text-white border border-purple-500/50'
                : 'bg-purple-900/20 text-white/70 hover:bg-purple-900/30'
            }`}
          >
            🛒 Purchase Orders
          </button>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <input
              type="text"
              placeholder={activeTab === 'inventory' ? 'Search spareparts...' : 'Search purchase orders...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-3 pl-12 bg-dark-purple-800/50 border border-purple-500/30 rounded-lg text-white placeholder-white/40 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
            <svg className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-500/30 border-t-neon-purple"></div>
          </div>
        ) : activeTab === 'inventory' ? (
          /* Inventory View */
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
                    <th className="text-center py-3 px-4 text-white/90 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {inventory
                    .filter(item => 
                      item.sparepart_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      item.resort_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      item.asset_category.toLowerCase().includes(searchTerm.toLowerCase())
                    )
                    .map((item) => (
                    <tr key={item.id} className="border-b border-purple-500/10 hover:bg-purple-500/10 transition-colors">
                      <td className="py-3 px-4 text-white">{item.sparepart_name}</td>
                      <td className="py-3 px-4 text-white/70">{item.asset_category}</td>
                      <td className="py-3 px-4 text-white/70">{item.resort_name}</td>
                      <td className="py-3 px-4 text-center">
                        <span className="text-white font-bold">{item.current_stock}</span>
                      </td>
                      <td className="py-3 px-4 text-white/70">{item.unit}</td>
                      <td className="py-3 px-4 text-right text-white/70">
                        Rp {item.last_unit_price.toLocaleString('id-ID')}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStockStatusColor(item.current_stock)}`}>
                          {getStockStatusLabel(item.current_stock)}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {inventory.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-white/50">
                        No inventory data available
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* Purchase Orders View */
          <div className="space-y-4">
            {/* Search and Date Filter for Purchases */}
            <div className="bg-purple-900/20 backdrop-blur-sm rounded-xl p-4 border border-purple-500/20 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="relative md:col-span-1">
                  <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/50 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Search by PO number, supplier, or resort..."
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
            </div>

            {purchases
              .filter(po => {
                const matchesSearch = po.po_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                    po.supplier_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                    po.resort_name.toLowerCase().includes(searchTerm.toLowerCase());
                
                // Date filtering
                let matchesDate = true;
                if (startDate || endDate) {
                  const poDate = new Date(po.purchase_date);
                  if (startDate) {
                    matchesDate = matchesDate && poDate >= new Date(startDate);
                  }
                  if (endDate) {
                    matchesDate = matchesDate && poDate <= new Date(endDate);
                  }
                }
                
                return matchesSearch && matchesDate;
              })
              .map((po) => (
              <div key={po.id} className="bg-purple-900/20 backdrop-blur-sm rounded-2xl p-6 border border-purple-500/20">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-white">{po.po_number}</h3>
                    <p className="text-white/70 text-sm">Supplier: {po.supplier_name}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      po.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                      po.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {po.status}
                    </span>
                    <button
                      onClick={() => viewPODetails(po)}
                      className="px-3 py-1 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-xs"
                    >
                      View Details
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-white/50">Resort</p>
                    <p className="text-white">{po.resort_name}</p>
                  </div>
                  <div>
                    <p className="text-white/50">Purchase Date</p>
                    <p className="text-white">{new Date(po.purchase_date).toLocaleDateString('id-ID')}</p>
                  </div>
                  <div>
                    <p className="text-white/50">Total Amount</p>
                    <p className="text-white font-bold">Rp {po.total_amount.toLocaleString('id-ID')}</p>
                  </div>
                </div>
              </div>
            ))}
            {purchases.filter(po => {
              const matchesSearch = po.po_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                  po.supplier_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                  po.resort_name.toLowerCase().includes(searchTerm.toLowerCase());
              
              let matchesDate = true;
              if (startDate || endDate) {
                const poDate = new Date(po.purchase_date);
                if (startDate) {
                  matchesDate = matchesDate && poDate >= new Date(startDate);
                }
                if (endDate) {
                  matchesDate = matchesDate && poDate <= new Date(endDate);
                }
              }
              
              return matchesSearch && matchesDate;
            }).length === 0 && (
              <div className="bg-purple-900/20 backdrop-blur-sm rounded-2xl p-12 border border-purple-500/20 text-center">
                <p className="text-white/50">
                  {searchTerm || startDate || endDate ? 'No purchase orders match your filters' : 'No purchase orders yet'}
                </p>
              </div>
            )}
          </div>
        )}

        {/* PO Detail Modal */}
        {showDetailModal && selectedPO && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-gradient-to-br from-purple-900 to-slate-900 rounded-2xl p-8 max-w-3xl w-full max-h-[90vh] overflow-y-auto border border-purple-500/30">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-white">{selectedPO.po_number}</h2>
                  <p className="text-white/70">Supplier: {selectedPO.supplier_name}</p>
                </div>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="text-white/70 hover:text-white"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* PO Info */}
              <div className="grid grid-cols-3 gap-4 mb-6 p-4 bg-purple-800/30 rounded-lg">
                <div>
                  <p className="text-xs text-white/50">Resort</p>
                  <p className="text-white">{selectedPO.resort_name}</p>
                </div>
                <div>
                  <p className="text-xs text-white/50">Purchase Date</p>
                  <p className="text-white">{new Date(selectedPO.purchase_date).toLocaleDateString('id-ID')}</p>
                </div>
                <div>
                  <p className="text-xs text-white/50">Status</p>
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                    selectedPO.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                    selectedPO.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                    'bg-yellow-100 text-yellow-800'
                  }`}>
                    {selectedPO.status}
                  </span>
                </div>
              </div>

              {/* Line Items */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-white mb-3">Items</h3>
                <div className="space-y-2">
                  {poItems.map((item) => (
                    <div key={item.id} className="bg-purple-800/20 rounded-lg p-4 border border-purple-500/20">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                              item.item_type === 'SERVICE' 
                                ? 'bg-blue-100 text-blue-800' 
                                : 'bg-green-100 text-green-800'
                            }`}>
                              {item.item_type === 'SERVICE' ? '🔧 Service' : '📦 Sparepart'}
                            </span>
                          </div>
                          <p className="text-white font-medium">{item.sparepart_name}</p>
                          <p className="text-white/70 text-sm">{item.asset_category}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-white font-bold">Rp {item.total_price.toLocaleString('id-ID')}</p>
                          <p className="text-white/70 text-sm">{item.quantity} {item.unit} × Rp {item.unit_price.toLocaleString('id-ID')}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total */}
              <div className="bg-purple-600/30 rounded-lg p-4 border border-purple-500/30 mb-6">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold text-white">Total Amount:</span>
                  <span className="text-2xl font-bold text-white">
                    Rp {selectedPO.total_amount.toLocaleString('id-ID')}
                  </span>
                </div>
              </div>

              {/* Actions for Manager */}
              {profile?.role === 'MANAGER' && selectedPO.status === 'PENDING' && (
                <div className="flex gap-3">
                  <button
                    onClick={() => handleRejectPO(selectedPO.id)}
                    className="flex-1 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => handleApprovePO(selectedPO.id)}
                    className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold"
                  >
                    Approve
                  </button>
                </div>
              )}

              {selectedPO.status !== 'PENDING' && (
                <div className="text-center text-white/70 text-sm">
                  This purchase order has been {selectedPO.status.toLowerCase()}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Purchase Order Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-gradient-to-br from-purple-900 to-slate-900 rounded-2xl p-8 max-w-4xl w-full max-h-[90vh] overflow-y-auto border border-purple-500/30">
              <h2 className="text-2xl font-bold text-white mb-6">New Purchase Order</h2>
              
              <form onSubmit={handleSubmitPurchaseOrder} className="space-y-6">
                {/* Basic Info */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-white/90 mb-2">
                      Resort *
                    </label>
                    <select
                      required
                      value={poFormData.resort_id}
                      onChange={(e) => setPoFormData({ ...poFormData, resort_id: e.target.value })}
                      className="w-full px-4 py-2 bg-purple-800/50 border border-purple-500/30 text-white rounded-lg focus:ring-2 focus:ring-purple-500"
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
                    <label className="block text-sm font-medium text-white/90 mb-2">
                      Supplier *
                    </label>
                    <input
                      type="text"
                      required
                      value={poFormData.supplier_name}
                      onChange={(e) => setPoFormData({ ...poFormData, supplier_name: e.target.value })}
                      className="w-full px-4 py-2 bg-purple-800/50 border border-purple-500/30 text-white rounded-lg focus:ring-2 focus:ring-purple-500"
                      placeholder="Supplier name"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-white/90 mb-2">
                      Purchase Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={poFormData.purchase_date}
                      onChange={(e) => setPoFormData({ ...poFormData, purchase_date: e.target.value })}
                      className="w-full px-4 py-2 bg-purple-800/50 border border-purple-500/30 text-white rounded-lg focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                </div>

                {/* Line Items */}
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-semibold text-white">Line Items</h3>
                    <button
                      type="button"
                      onClick={addLineItem}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm"
                    >
                      + Add Item
                    </button>
                  </div>
                  
                  <div className="space-y-4">
                    {lineItems.map((item, index) => (
                      <div key={index} className="bg-purple-800/30 rounded-lg p-4 border border-purple-500/20">
                        <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
                          <div>
                            <label className="block text-xs text-white/70 mb-1">Type *</label>
                            <select
                              required
                              value={item.item_type}
                              onChange={(e) => updateLineItem(index, 'item_type', e.target.value)}
                              className="w-full px-3 py-2 bg-purple-900/50 border border-purple-500/30 text-white rounded-lg text-sm"
                            >
                              <option value="SPAREPART">Sparepart</option>
                              <option value="SERVICE">Service</option>
                            </select>
                          </div>

                          <div className="md:col-span-2">
                            <label className="block text-xs text-white/70 mb-1">
                              {item.item_type === 'SERVICE' ? 'Service Name' : 'Sparepart Name'} *
                            </label>
                            <input
                              type="text"
                              required
                              value={item.sparepart_name}
                              onChange={(e) => updateLineItem(index, 'sparepart_name', e.target.value)}
                              className="w-full px-3 py-2 bg-purple-900/50 border border-purple-500/30 text-white rounded-lg text-sm"
                              placeholder={item.item_type === 'SERVICE' ? 'e.g., Engine Repair' : 'e.g., Engine Oil'}
                            />
                          </div>
                          
                          <div>
                            <label className="block text-xs text-white/70 mb-1">Category *</label>
                            <select
                              required
                              value={item.asset_category}
                              onChange={(e) => updateLineItem(index, 'asset_category', e.target.value)}
                              className="w-full px-3 py-2 bg-purple-900/50 border border-purple-500/30 text-white rounded-lg text-sm"
                            >
                              {assetCategories.map((cat) => (
                                <option key={cat.value} value={cat.value}>
                                  {cat.label}
                                </option>
                              ))}
                            </select>
                          </div>
                          
                          <div>
                            <label className="block text-xs text-white/70 mb-1">Qty *</label>
                            <input
                              type="number"
                              required
                              min="1"
                              value={item.quantity || ''}
                              onChange={(e) => updateLineItem(index, 'quantity', parseInt(e.target.value) || 0)}
                              className="w-full px-3 py-2 bg-purple-900/50 border border-purple-500/30 text-white rounded-lg text-sm"
                            />
                          </div>
                          
                          <div>
                            <label className="block text-xs text-white/70 mb-1">Unit *</label>
                            <select
                              required
                              value={item.unit}
                              onChange={(e) => updateLineItem(index, 'unit', e.target.value)}
                              className="w-full px-3 py-2 bg-purple-900/50 border border-purple-500/30 text-white rounded-lg text-sm"
                            >
                              {units.map((unit) => (
                                <option key={unit} value={unit}>
                                  {unit}
                                </option>
                              ))}
                            </select>
                          </div>
                          
                          <div>
                            <label className="block text-xs text-white/70 mb-1">Price (Rp) *</label>
                            <input
                              type="number"
                              required
                              min="0"
                              step="0.01"
                              value={item.unit_price || ''}
                              onChange={(e) => updateLineItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                              className="w-full px-3 py-2 bg-purple-900/50 border border-purple-500/30 text-white rounded-lg text-sm"
                            />
                          </div>
                        </div>
                        
                        <div className="flex justify-between items-center mt-3 pt-3 border-t border-purple-500/20">
                          <div className="text-sm text-white/70">
                            Total: <span className="text-white font-bold">Rp {(item.quantity * item.unit_price).toLocaleString('id-ID')}</span>
                          </div>
                          {lineItems.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeLineItem(index)}
                              className="text-red-400 hover:text-red-300 text-sm"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Total */}
                <div className="bg-purple-600/30 rounded-lg p-4 border border-purple-500/30">
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-semibold text-white">Grand Total:</span>
                    <span className="text-2xl font-bold text-white">
                      Rp {calculateTotal().toLocaleString('id-ID')}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 px-6 py-3 bg-purple-800/50 text-white rounded-lg hover:bg-purple-800/70 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-colors font-semibold"
                  >
                    Create Purchase Order
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
