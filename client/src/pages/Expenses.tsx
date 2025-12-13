import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout';

type ExpenseCategory = 'OPERATIONAL' | 'PERSONNEL' | 'MARKETING' | 'SPAREPART' | 'SALARY' | 'BUSINESS_TRAVEL' | 'SERVICE' | 'OTHER';
type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

interface Expense {
  id: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  date: string;
  status: ApprovalStatus;
  submitted_by: string;
  approved_by?: string;
  approval_date?: string;
  approval_comments?: string;
  purchase_order_id?: string | null;
  submitter?: { name: string };
  approver?: { name: string };
}

interface PurchaseOrder {
  id: string;
  po_number: string;
  supplier_name: string;
  total_amount: number;
  purchase_date: string;
  status: string;
}

export default function Expenses() {
  const { user, profile } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [approvalComments, setApprovalComments] = useState('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | ApprovalStatus>('ALL');
  
  const canCreate = profile?.role === 'ADMIN' || profile?.role === 'MANAGER';
  const canApprove = profile?.role === 'MANAGER';
  
  const [formData, setFormData] = useState({
    category: 'OPERATIONAL' as ExpenseCategory,
    description: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    purchase_order_id: '',
  });

  useEffect(() => {
    fetchExpenses();
    if (canCreate) {
      fetchPurchaseOrders();
    }
  }, [canCreate]);

  const fetchExpenses = async () => {
    try {
      // Fetch expenses with user data
      const { data: expensesData, error: expensesError } = await supabase
        .from('expenses')
        .select('*')
        .order('created_at', { ascending: false });

      if (expensesError) throw expensesError;

      // Fetch all users to map names
      const { data: usersData, error: usersError } = await supabase
        .from('users')
        .select('id, name');

      if (usersError) throw usersError;

      // Create a map of user IDs to names
      const userMap = new Map(usersData?.map(u => [u.id, u.name]) || []);

      // Transform expenses with user names
      const transformedData = expensesData?.map((expense: any) => ({
        ...expense,
        submitter: { name: userMap.get(expense.submitted_by) || 'Unknown' },
        approver: expense.approved_by ? { name: userMap.get(expense.approved_by) || 'Unknown' } : null,
      }));

      setExpenses(transformedData || []);
    } catch (error) {
      console.error('Error fetching expenses:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPurchaseOrders = async () => {
    try {
      // Fetch approved POs that don't have expenses yet
      const { data: allPOs } = await supabase
        .from('purchase_orders')
        .select('id, po_number, supplier_name, total_amount, purchase_date, status')
        .eq('status', 'APPROVED')
        .order('created_at', { ascending: false });

      // Fetch expenses that are linked to POs
      const { data: linkedExpenses } = await supabase
        .from('expenses')
        .select('purchase_order_id')
        .not('purchase_order_id', 'is', null);

      // Filter out POs that already have expenses
      const linkedPOIds = new Set(linkedExpenses?.map(e => e.purchase_order_id) || []);
      const availablePOs = allPOs?.filter(po => !linkedPOIds.has(po.id)) || [];

      setPurchaseOrders(availablePOs);
    } catch (error) {
      console.error('Error fetching purchase orders:', error);
    }
  };

  const handlePOSelection = async (poId: string) => {
    const selectedPO = purchaseOrders.find(po => po.id === poId);
    if (selectedPO) {
      // Fetch PO items to determine category
      const { data: poItems } = await supabase
        .from('purchase_order_items')
        .select('item_type')
        .eq('purchase_order_id', poId);

      // Determine category based on item types
      let category: ExpenseCategory = 'SPAREPART';
      let descriptionPrefix = 'Sparepart Purchase';
      
      if (poItems && poItems.length > 0) {
        const hasSparepart = poItems.some(item => item.item_type === 'SPAREPART');
        const hasService = poItems.some(item => item.item_type === 'SERVICE');
        
        if (hasSparepart && hasService) {
          // Mixed: both sparepart and service
          category = 'SPAREPART'; // Default to SPAREPART for mixed
          descriptionPrefix = 'Sparepart & Service Purchase';
        } else if (hasService) {
          // Only service
          category = 'SERVICE';
          descriptionPrefix = 'Service Purchase';
        } else {
          // Only sparepart
          category = 'SPAREPART';
          descriptionPrefix = 'Sparepart Purchase';
        }
      }

      setFormData({
        ...formData,
        purchase_order_id: poId,
        category: category,
        description: `${descriptionPrefix} - PO: ${selectedPO.po_number} - Supplier: ${selectedPO.supplier_name}`,
        amount: selectedPO.total_amount.toString(),
        date: selectedPO.purchase_date,
      });
    } else {
      setFormData({
        ...formData,
        purchase_order_id: '',
        category: 'OPERATIONAL',
        description: '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const expenseId = crypto.randomUUID();
      const { error } = await supabase.from('expenses').insert([
        {
          id: expenseId,
          category: formData.category,
          description: formData.description,
          amount: parseFloat(formData.amount),
          date: formData.date,
          submitted_by: user?.id,
          status: 'PENDING',
          purchase_order_id: formData.purchase_order_id || null,
        },
      ]);

      if (error) throw error;

      // Send notification to Manager for approval
      const { data: managers } = await supabase
        .from('users')
        .select('id, name')
        .eq('role', 'MANAGER');

      if (managers && managers.length > 0) {
        const notifications = managers.map(manager => ({
          user_id: manager.id,
          title: 'Expense Approval Required',
          message: `New expense has been created by ${profile?.name || 'Admin'}. Category: ${formData.category}. Amount: Rp ${parseFloat(formData.amount).toLocaleString('id-ID')}. Description: ${formData.description}. Please review and approve.`,
          notification_type: 'EXPENSE_APPROVAL_NEEDED',
          reference_id: expenseId,
          reference_type: 'EXPENSE',
          status: 'UNREAD',
        }));

        await supabase.from('notifications').insert(notifications);
      }

      setShowModal(false);
      setFormData({
        category: 'OPERATIONAL',
        description: '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        purchase_order_id: '',
      });
      fetchExpenses();
      fetchPurchaseOrders(); // Refresh PO list
      alert('Expense created successfully! Notification sent to Manager for approval.');
    } catch (error: any) {
      alert('Error creating expense: ' + error.message);
    }
  };

  const getStatusColor = (status: ApprovalStatus) => {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      case 'APPROVED':
        return 'bg-green-100 text-green-800';
      case 'REJECTED':
        return 'bg-red-100 text-red-800';
    }
  };

  const getCategoryColor = (category: ExpenseCategory) => {
    switch (category) {
      case 'OPERATIONAL':
        return 'bg-blue-500';
      case 'SPAREPART':
        return 'bg-teal-500';
      case 'SERVICE':
        return 'bg-indigo-500';
      case 'SALARY':
        return 'bg-green-500';
      case 'PERSONNEL':
        return 'bg-purple-500';
      case 'BUSINESS_TRAVEL':
        return 'bg-orange-500';
      case 'MARKETING':
        return 'bg-pink-500';
      case 'OTHER':
        return 'bg-gray-500';
      default:
        return 'bg-gray-500';
    }
  };

  const handleApprovalAction = (expense: Expense) => {
    setSelectedExpense(expense);
    setApprovalComments('');
    setShowApprovalModal(true);
  };

  const handleApprove = async () => {
    if (!selectedExpense) return;
    
    try {
      // Update expense status
      const { error } = await supabase
        .from('expenses')
        .update({
          status: 'APPROVED',
          approved_by: user?.id,
          approval_date: new Date().toISOString(),
          approval_comments: approvalComments || null,
        })
        .eq('id', selectedExpense.id);

      if (error) throw error;

      // If expense is linked to a PO, update inventory for SPAREPART items
      if (selectedExpense.purchase_order_id) {
        // Get PO details
        const { data: poData } = await supabase
          .from('purchase_orders')
          .select('resort_id, supplier_name, purchase_date')
          .eq('id', selectedExpense.purchase_order_id)
          .single();

        if (poData) {
          // Get PO items
          const { data: poItems } = await supabase
            .from('purchase_order_items')
            .select('*')
            .eq('purchase_order_id', selectedExpense.purchase_order_id);

          if (poItems) {
            // Update inventory for each SPAREPART item
            for (const item of poItems) {
              // Skip SERVICE items
              if (item.item_type === 'SERVICE') {
                continue;
              }

              // Check if inventory exists
              const { data: existingInventory } = await supabase
                .from('sparepart_inventory')
                .select('*')
                .eq('sparepart_name', item.sparepart_name)
                .eq('asset_category', item.asset_category)
                .eq('resort_id', poData.resort_id)
                .maybeSingle();

              if (existingInventory) {
                // Update existing inventory
                await supabase
                  .from('sparepart_inventory')
                  .update({
                    current_stock: existingInventory.current_stock + item.quantity,
                    last_unit_price: item.unit_price,
                    last_purchase_date: poData.purchase_date,
                    last_supplier: poData.supplier_name,
                    updated_at: new Date().toISOString(),
                  })
                  .eq('id', existingInventory.id);
              } else {
                // Create new inventory record
                await supabase
                  .from('sparepart_inventory')
                  .insert([{
                    sparepart_name: item.sparepart_name,
                    asset_category: item.asset_category,
                    resort_id: poData.resort_id,
                    current_stock: item.quantity,
                    unit: item.unit,
                    last_unit_price: item.unit_price,
                    last_purchase_date: poData.purchase_date,
                    last_supplier: poData.supplier_name,
                  }]);
              }

              // Create stock transaction
              await supabase
                .from('stock_transactions')
                .insert([{
                  inventory_id: existingInventory?.id,
                  transaction_type: 'PURCHASE',
                  quantity: item.quantity,
                  unit_price: item.unit_price,
                  reference_type: 'EXPENSE',
                  reference_id: selectedExpense.id,
                  created_by: user?.id,
                }]);
            }
          }
        }
      }

      alert('Expense approved successfully! Inventory has been updated.');
      setShowApprovalModal(false);
      setSelectedExpense(null);
      setApprovalComments('');
      fetchExpenses();
    } catch (error: any) {
      console.error('Error approving expense:', error);
      alert('Error approving expense: ' + error.message);
    }
  };

  const handleReject = async () => {
    if (!selectedExpense) return;
    
    if (!approvalComments.trim()) {
      alert('Please provide a reason for rejection');
      return;
    }
    
    try {
      // Update expense status
      const { error } = await supabase
        .from('expenses')
        .update({
          status: 'REJECTED',
          approved_by: user?.id,
          approval_date: new Date().toISOString(),
          approval_comments: approvalComments,
        })
        .eq('id', selectedExpense.id);

      if (error) throw error;

      // NOTE: No need to reverse inventory since it was never added
      // Inventory only updates when expense is approved

      alert('Expense rejected successfully.');
      setShowApprovalModal(false);
      setSelectedExpense(null);
      setApprovalComments('');
      fetchExpenses();
    } catch (error: any) {
      console.error('Error rejecting expense:', error);
      alert('Error rejecting expense: ' + error.message);
    }
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto p-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-white">Expenses Management</h1>
          {canCreate && (
            <button
              onClick={() => setShowModal(true)}
              className="px-6 py-3 bg-gradient-to-br from-purple-600 to-pink-600 text-white rounded-xl shadow-lg hover:shadow-xl transition-all"
            >
              + Add Expense
            </button>
          )}
        </div>

        {/* Statistics for Manager */}
        {canApprove && (
          <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-yellow-900/30 backdrop-blur-sm rounded-xl p-4 border border-yellow-500/30">
              <div className="text-sm text-yellow-200 font-medium mb-1">Pending</div>
              <div className="text-2xl font-bold text-white">
                {expenses.filter((e) => e.status === 'PENDING').length}
              </div>
              <div className="text-xs text-yellow-300 mt-1">
                Rp{' '}
                {expenses
                  .filter((e) => e.status === 'PENDING')
                  .reduce((sum, e) => sum + e.amount, 0)
                  .toLocaleString('id-ID')}
              </div>
            </div>
            <div className="bg-green-900/30 backdrop-blur-sm rounded-xl p-4 border border-green-500/30">
              <div className="text-sm text-green-200 font-medium mb-1">Approved</div>
              <div className="text-2xl font-bold text-white">
                {expenses.filter((e) => e.status === 'APPROVED').length}
              </div>
              <div className="text-xs text-green-300 mt-1">
                Rp{' '}
                {expenses
                  .filter((e) => e.status === 'APPROVED')
                  .reduce((sum, e) => sum + e.amount, 0)
                  .toLocaleString('id-ID')}
              </div>
            </div>
            <div className="bg-red-900/30 backdrop-blur-sm rounded-xl p-4 border border-red-500/30">
              <div className="text-sm text-red-200 font-medium mb-1">Rejected</div>
              <div className="text-2xl font-bold text-white">
                {expenses.filter((e) => e.status === 'REJECTED').length}
              </div>
              <div className="text-xs text-red-300 mt-1">
                Rp{' '}
                {expenses
                  .filter((e) => e.status === 'REJECTED')
                  .reduce((sum, e) => sum + e.amount, 0)
                  .toLocaleString('id-ID')}
              </div>
            </div>
            <div className="bg-blue-900/30 backdrop-blur-sm rounded-xl p-4 border border-blue-500/30">
              <div className="text-sm text-blue-200 font-medium mb-1">Total</div>
              <div className="text-2xl font-bold text-white">{expenses.length}</div>
              <div className="text-xs text-blue-300 mt-1">
                Rp{' '}
                {expenses
                  .reduce((sum, e) => sum + e.amount, 0)
                  .toLocaleString('id-ID')}
              </div>
            </div>
          </div>
        )}

        {/* Filter Section */}
        {canApprove && (
          <div className="mb-6 bg-purple-900/20 backdrop-blur-sm rounded-xl p-4 border border-purple-500/20">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-white/90">Filter by Status:</span>
              <div className="flex gap-2">
                {(['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const).map((status) => (
                  <button
                    key={status}
                    onClick={() => setFilterStatus(status)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      filterStatus === status
                        ? 'bg-purple-600 text-white shadow-md'
                        : 'bg-purple-800/30 text-white/70 hover:bg-purple-800/50'
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {!canCreate && (
          <div className="mb-4 p-4 bg-yellow-900/30 border border-yellow-500/30 rounded-lg backdrop-blur-sm">
            <p className="text-sm text-yellow-200">
              You don't have permission to create expenses. Only ADMIN and MANAGER can create.
            </p>
          </div>
        )}

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
                    <th className="text-left py-3 px-4 text-white/90 font-semibold">Date</th>
                    <th className="text-left py-3 px-4 text-white/90 font-semibold">Description</th>
                    <th className="text-left py-3 px-4 text-white/90 font-semibold">Category</th>
                    <th className="text-right py-3 px-4 text-white/90 font-semibold">Amount</th>
                    <th className="text-left py-3 px-4 text-white/90 font-semibold">Submitted By</th>
                    <th className="text-center py-3 px-4 text-white/90 font-semibold">Status</th>
                    {canApprove && <th className="text-center py-3 px-4 text-white/90 font-semibold">Action</th>}
                  </tr>
                </thead>
                <tbody>
                  {expenses
                    .filter((expense) => filterStatus === 'ALL' || expense.status === filterStatus)
                    .map((expense) => (
                    <tr key={expense.id} className="border-b border-purple-500/10 hover:bg-purple-500/10 transition-colors">
                      <td className="py-3 px-4 text-white">
                        {new Date(expense.date).toLocaleDateString('id-ID', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-white font-medium">{expense.description}</div>
                        {expense.purchase_order_id && (
                          <span className="text-xs text-green-400">🛒 Linked to PO</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(expense.category)}`}>
                          {expense.category}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="text-white font-bold">
                          Rp {expense.amount.toLocaleString('id-ID')}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-white/70">
                        {(expense as any).submitter?.name || '-'}
                        {expense.submitted_by === user?.id && (
                          <span className="ml-2 text-xs text-blue-400">(You)</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(expense.status)}`}>
                          {expense.status}
                        </span>
                      </td>
                      {canApprove && (
                        <td className="py-3 px-4 text-center">
                          {expense.status === 'PENDING' && (
                            <button
                              onClick={() => handleApprovalAction(expense)}
                              className="px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-xs font-medium"
                            >
                              Review
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                  {expenses.filter((expense) => filterStatus === 'ALL' || expense.status === filterStatus).length === 0 && (
                    <tr>
                      <td colSpan={canApprove ? 7 : 6} className="py-8 text-center text-white/50">
                        No expenses available
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Add Expense Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Add New Expense</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Purchase Order Selection */}
                {purchaseOrders.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Link to Purchase Order (Optional)
                    </label>
                    <select
                      value={formData.purchase_order_id}
                      onChange={(e) => handlePOSelection(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    >
                      <option value="">-- Select Purchase Order or Create Manual --</option>
                      {purchaseOrders.map((po) => (
                        <option key={po.id} value={po.id}>
                          {po.po_number} - {po.supplier_name} - Rp {po.total_amount.toLocaleString('id-ID')}
                        </option>
                      ))}
                    </select>
                    {formData.purchase_order_id && (
                      <p className="text-xs text-green-600 mt-1">
                        ✓ Expense will be linked to this Purchase Order
                      </p>
                    )}
                  </div>
                )}
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category *
                  </label>
                  <select
                    required
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({ ...formData, category: e.target.value as ExpenseCategory })
                    }
                    disabled={!!formData.purchase_order_id}
                    className={`w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent ${
                      formData.purchase_order_id ? 'bg-gray-100 cursor-not-allowed' : ''
                    }`}
                  >
                    <option value="OPERATIONAL">Operational</option>
                    <option value="SPAREPART">Spare Part</option>
                    <option value="SERVICE">Service</option>
                    <option value="SALARY">Salary</option>
                    <option value="PERSONNEL">Personnel</option>
                    <option value="BUSINESS_TRAVEL">Business Travel</option>
                    <option value="MARKETING">Marketing</option>
                    <option value="OTHER">Other</option>
                  </select>
                  {formData.purchase_order_id && (
                    <p className="text-xs text-gray-500 mt-1">
                      Category is auto-selected based on Purchase Order items
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
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount *</label>
                  <input
                    type="number"
                    required
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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
                    className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                  >
                    Submit
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Approval Modal */}
        {showApprovalModal && selectedExpense && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-8 max-w-lg w-full mx-4">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Review Expense</h2>
              
              {/* Self-approval warning */}
              {selectedExpense.submitted_by === user?.id && (
                <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    ⚠️ You are reviewing your own expense. Please ensure this follows company policy.
                  </p>
                </div>
              )}
              
              <div className="bg-gray-50 rounded-lg p-4 mb-6 space-y-2">
                <div className="flex justify-between">
                  <span className="font-medium text-gray-700">Description:</span>
                  <span className="text-gray-900">{selectedExpense.description}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-gray-700">Category:</span>
                  <span className="text-gray-900">{selectedExpense.category}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-gray-700">Amount:</span>
                  <span className="text-gray-900 font-bold">
                    Rp {selectedExpense.amount.toLocaleString('id-ID')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-gray-700">Date:</span>
                  <span className="text-gray-900">
                    {new Date(selectedExpense.date).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium text-gray-700">Submitted by:</span>
                  <span className="text-gray-900">
                    {(selectedExpense as any).submitter?.name || '-'}
                  </span>
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Comments (optional for approval, required for rejection)
                </label>
                <textarea
                  value={approvalComments}
                  onChange={(e) => setApprovalComments(e.target.value)}
                  rows={3}
                  placeholder="Add your comments here..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowApprovalModal(false);
                    setSelectedExpense(null);
                    setApprovalComments('');
                  }}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleReject}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Reject
                </button>
                <button
                  type="button"
                  onClick={handleApprove}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Approve
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
