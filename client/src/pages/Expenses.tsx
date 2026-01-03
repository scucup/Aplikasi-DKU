import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout';

type ExpenseCategory = 'OPERATIONAL' | 'FUEL' | 'MARKETING' | 'SPAREPART' | 'SALARY' | 'BUSINESS_TRAVEL' | 'SERVICE' | 'OTHER' | 'TOOLS';
type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

interface Expense {
  id: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  date: string;
  resort_id?: string | null;
  status: ApprovalStatus;
  submitted_by: string;
  approved_by?: string;
  approval_date?: string;
  approval_comments?: string;
  asset_category?: string | null;
  supplier?: string | null;
  submitter?: { name: string };
  approver?: { name: string };
  resort?: { name: string };
}

interface Resort {
  id: string;
  name: string;
}

type AssetCategory = 'ATV' | 'UTV' | 'SEA_SPORT' | 'POOL_TOYS' | 'LINE_SPORT';

interface SparepartItem {
  id: string;
  sparepart_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  asset_category: AssetCategory | '';
  unit: string;
}

// Asset categories constant
const ASSET_CATEGORIES: AssetCategory[] = ['ATV', 'UTV', 'SEA_SPORT', 'POOL_TOYS', 'LINE_SPORT'];

export default function Expenses() {
  const { user, profile } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [resorts, setResorts] = useState<Resort[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [approvalComments, setApprovalComments] = useState('');
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | ApprovalStatus>('all');
  const [selectedResort, setSelectedResort] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  const canCreate = profile?.role === 'ADMIN' || profile?.role === 'MANAGER' || profile?.role === 'ENGINEER';
  const canApprove = profile?.role === 'MANAGER';
  const canDelete = profile?.role === 'MANAGER';
  
  const [formData, setFormData] = useState({
    category: 'OPERATIONAL' as ExpenseCategory,
    description: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    resort_id: '',
    supplier: '',
  });

  // Sparepart items for SPAREPART category
  const [sparepartItems, setSparepartItems] = useState<SparepartItem[]>([
    { id: crypto.randomUUID(), sparepart_name: '', quantity: 1, unit_price: 0, total_price: 0, asset_category: '', unit: 'pcs' }
  ]);
  
  // Check if category is SPAREPART (needs sparepart items)
  const isSparepart = formData.category === 'SPAREPART';

  // Calculate total from sparepart items
  const sparepartTotal = sparepartItems.reduce((sum, item) => sum + item.total_price, 0);

  useEffect(() => {
    fetchExpenses();
    fetchResorts();
  }, []);

  const fetchResorts = async () => {
    try {
      const { data, error } = await supabase
        .from('resorts')
        .select('id, name')
        .order('name');
      
      if (error) throw error;
      setResorts(data || []);
    } catch (error) {
      console.error('Error fetching resorts:', error);
    }
  };

  // Sparepart item management functions
  const addSparepartItem = () => {
    setSparepartItems([
      ...sparepartItems,
      { id: crypto.randomUUID(), sparepart_name: '', quantity: 1, unit_price: 0, total_price: 0, asset_category: '', unit: 'pcs' }
    ]);
  };

  const removeSparepartItem = (id: string) => {
    if (sparepartItems.length > 1) {
      setSparepartItems(sparepartItems.filter(item => item.id !== id));
    }
  };

  const updateSparepartItem = (id: string, field: keyof SparepartItem, value: string | number) => {
    setSparepartItems(sparepartItems.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        // Recalculate total_price when quantity or unit_price changes
        if (field === 'quantity' || field === 'unit_price') {
          updated.total_price = updated.quantity * updated.unit_price;
        }
        return updated;
      }
      return item;
    }));
  };

  const resetSparepartItems = () => {
    setSparepartItems([
      { id: crypto.randomUUID(), sparepart_name: '', quantity: 1, unit_price: 0, total_price: 0, asset_category: '', unit: 'pcs' }
    ]);
  };

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

      // Fetch all resorts to map names
      const { data: resortsData, error: resortsError } = await supabase
        .from('resorts')
        .select('id, name');

      if (resortsError) throw resortsError;

      // Create maps
      const userMap = new Map(usersData?.map(u => [u.id, u.name]) || []);
      const resortMap = new Map(resortsData?.map(r => [r.id, r.name]) || []);

      // Transform expenses with user and resort names
      const transformedData = expensesData?.map((expense: any) => ({
        ...expense,
        submitter: { name: userMap.get(expense.submitted_by) || 'Unknown' },
        approver: expense.approved_by ? { name: userMap.get(expense.approved_by) || 'Unknown' } : null,
        resort: expense.resort_id ? { name: resortMap.get(expense.resort_id) || 'Unknown' } : null,
      }));

      setExpenses(transformedData || []);
    } catch (error) {
      console.error('Error fetching expenses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate sparepart items for SPAREPART category
    if (formData.category === 'SPAREPART') {
      if (!formData.resort_id) {
        alert('Please select a resort for Sparepart expenses');
        return;
      }
      if (!formData.supplier.trim()) {
        alert('Please enter supplier name for Sparepart expenses');
        return;
      }
      const invalidItems = sparepartItems.filter(item => 
        !item.sparepart_name.trim() || 
        item.quantity <= 0 || 
        item.unit_price <= 0 ||
        !item.asset_category
      );
      if (invalidItems.length > 0) {
        alert('Please fill in all sparepart details (name, asset category, quantity, and price)');
        return;
      }
    }
    
    try {
      const expenseId = crypto.randomUUID();
      
      // For SPAREPART, use calculated total from items
      const finalAmount = formData.category === 'SPAREPART' ? sparepartTotal : parseFloat(formData.amount);
      
      const { error } = await supabase.from('expenses').insert([
        {
          id: expenseId,
          category: formData.category,
          description: formData.description,
          amount: finalAmount,
          date: formData.date,
          resort_id: formData.resort_id || null,
          submitted_by: user?.id,
          status: 'PENDING',
          supplier: formData.category === 'SPAREPART' ? formData.supplier : null,
        },
      ]);

      if (error) throw error;

      // Insert sparepart items if category is SPAREPART
      if (formData.category === 'SPAREPART' && sparepartItems.length > 0) {
        const sparepartData = sparepartItems.map(item => ({
          expense_id: expenseId,
          sparepart_name: item.sparepart_name,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price,
          asset_category: item.asset_category,
          unit: item.unit,
        }));

        const { error: sparepartError } = await supabase
          .from('expense_spareparts')
          .insert(sparepartData);

        if (sparepartError) {
          console.error('Error inserting sparepart items:', sparepartError);
        }
      }

      // Send notification to Manager for approval
      const { data: managers } = await supabase
        .from('users')
        .select('id, name')
        .eq('role', 'MANAGER');

      if (managers && managers.length > 0) {
        const notifications = managers.map(manager => ({
          user_id: manager.id,
          title: 'Expense Approval Required',
          message: `New expense has been created by ${profile?.name || 'Admin'}. Category: ${formData.category}. Amount: Rp ${finalAmount.toLocaleString('id-ID')}. Description: ${formData.description}. Please review and approve.`,
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
        resort_id: '',
        supplier: '',
      });
      resetSparepartItems();
      fetchExpenses();
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
      case 'TOOLS':
        return 'bg-amber-500';
      case 'SERVICE':
        return 'bg-indigo-500';
      case 'SALARY':
        return 'bg-green-500';
      case 'FUEL':
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

  // Check if user can edit this expense
  const canEditExpense = (expense: Expense) => {
    // Only PENDING expenses can be edited
    if (expense.status !== 'PENDING') return false;
    // Owner can edit their own expense, or Manager can edit any
    return expense.submitted_by === user?.id || profile?.role === 'MANAGER';
  };

  // Handle edit expense
  const handleEditExpense = (expense: Expense) => {
    setEditingExpense(expense);
    setFormData({
      category: expense.category,
      description: expense.description,
      amount: expense.amount.toString(),
      date: expense.date,
      resort_id: expense.resort_id || '',
      supplier: expense.supplier || '',
    });
    setShowEditModal(true);
  };

  // Handle update expense
  const handleUpdateExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingExpense) return;

    try {
      const finalAmount = formData.category === 'SPAREPART' ? sparepartTotal : parseFloat(formData.amount);

      const { error } = await supabase
        .from('expenses')
        .update({
          category: formData.category,
          description: formData.description,
          amount: finalAmount,
          date: formData.date,
          resort_id: formData.resort_id || null,
          supplier: formData.category === 'SPAREPART' ? formData.supplier : null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingExpense.id);

      if (error) throw error;

      setShowEditModal(false);
      setEditingExpense(null);
      setFormData({
        category: 'OPERATIONAL',
        description: '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        resort_id: '',
        supplier: '',
      });
      fetchExpenses();
      alert('Expense updated successfully!');
    } catch (error: any) {
      alert('Error updating expense: ' + error.message);
    }
  };

  // Handle delete expense (Manager only)
  const handleDeleteExpense = async (expense: Expense) => {
    if (!canDelete) {
      alert('Only Manager can delete expenses');
      return;
    }

    const isSparepart = expense.category === 'SPAREPART';
    const confirmMsg = isSparepart
      ? `Are you sure you want to delete this SPAREPART expense?\n\nDescription: ${expense.description}\nAmount: Rp ${expense.amount.toLocaleString('id-ID')}\n\n⚠️ This will also delete related inventory items and stock transactions.`
      : `Are you sure you want to delete this expense?\n\nDescription: ${expense.description}\nAmount: Rp ${expense.amount.toLocaleString('id-ID')}`;

    if (!confirm(confirmMsg)) {
      return;
    }

    try {
      // For SPAREPART expenses, delete related inventory and transactions
      if (isSparepart && expense.status === 'APPROVED') {
        // Get expense sparepart items
        const { data: sparepartItems } = await supabase
          .from('expense_spareparts')
          .select('sparepart_name, asset_category, quantity')
          .eq('expense_id', expense.id);

        if (sparepartItems && sparepartItems.length > 0) {
          for (const item of sparepartItems) {
            // Find inventory record
            const { data: inventory } = await supabase
              .from('sparepart_inventory')
              .select('id, current_stock')
              .eq('sparepart_name', item.sparepart_name)
              .eq('asset_category', item.asset_category)
              .eq('resort_id', expense.resort_id)
              .maybeSingle();

            if (inventory) {
              // Reduce stock (reverse the purchase)
              const newStock = inventory.current_stock - item.quantity;

              if (newStock <= 0) {
                // Delete stock transactions first
                await supabase
                  .from('stock_transactions')
                  .delete()
                  .eq('inventory_id', inventory.id);

                // Delete inventory if stock becomes 0 or negative
                await supabase.from('sparepart_inventory').delete().eq('id', inventory.id);
              } else {
                // Update stock
                await supabase
                  .from('sparepart_inventory')
                  .update({
                    current_stock: newStock,
                    updated_at: new Date().toISOString(),
                  })
                  .eq('id', inventory.id);

                // Delete stock transaction for this expense
                await supabase
                  .from('stock_transactions')
                  .delete()
                  .eq('reference_type', 'EXPENSE')
                  .eq('reference_id', expense.id);
              }
            }
          }
        }
      }

      // Delete expense_spareparts first if exists
      await supabase.from('expense_spareparts').delete().eq('expense_id', expense.id);

      // Delete the expense
      const { error } = await supabase.from('expenses').delete().eq('id', expense.id);

      if (error) throw error;

      fetchExpenses();
      alert(
        isSparepart && expense.status === 'APPROVED'
          ? 'Expense deleted successfully!\n\n✅ Related inventory has been updated.'
          : 'Expense deleted successfully!'
      );
    } catch (error: any) {
      alert('Error deleting expense: ' + error.message);
    }
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

      // If expense is SPAREPART category, update inventory
      if (selectedExpense.category === 'SPAREPART' && selectedExpense.resort_id) {
        // Get expense sparepart items
        const { data: sparepartItemsData } = await supabase
          .from('expense_spareparts')
          .select('*')
          .eq('expense_id', selectedExpense.id);

        if (sparepartItemsData && sparepartItemsData.length > 0) {
          for (const item of sparepartItemsData) {
            // Check if inventory exists
            const { data: existingInventory } = await supabase
              .from('sparepart_inventory')
              .select('*')
              .eq('sparepart_name', item.sparepart_name)
              .eq('asset_category', item.asset_category)
              .eq('resort_id', selectedExpense.resort_id)
              .maybeSingle();

            if (existingInventory) {
              // Update existing inventory
              await supabase
                .from('sparepart_inventory')
                .update({
                  current_stock: existingInventory.current_stock + item.quantity,
                  last_unit_price: item.unit_price,
                  last_purchase_date: selectedExpense.date,
                  last_supplier: selectedExpense.supplier || null,
                  updated_at: new Date().toISOString(),
                })
                .eq('id', existingInventory.id);

              // Create stock transaction
              await supabase
                .from('stock_transactions')
                .insert([{
                  inventory_id: existingInventory.id,
                  transaction_type: 'PURCHASE',
                  quantity: item.quantity,
                  unit_price: item.unit_price,
                  reference_type: 'EXPENSE',
                  reference_id: selectedExpense.id,
                  created_by: user?.id,
                }]);
            } else {
              // Create new inventory record
              const { data: newInventory } = await supabase
                .from('sparepart_inventory')
                .insert([{
                  sparepart_name: item.sparepart_name,
                  asset_category: item.asset_category,
                  resort_id: selectedExpense.resort_id,
                  current_stock: item.quantity,
                  unit: item.unit || 'pcs',
                  last_unit_price: item.unit_price,
                  last_purchase_date: selectedExpense.date,
                  last_supplier: selectedExpense.supplier || null,
                }])
                .select()
                .single();

              // Create stock transaction
              if (newInventory) {
                await supabase
                  .from('stock_transactions')
                  .insert([{
                    inventory_id: newInventory.id,
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
      }

      alert('Expense approved successfully!' + (selectedExpense.category === 'SPAREPART' ? ' Inventory has been updated.' : ''));
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

  // Filter function to be used for both table and summary
  const filterExpenses = (expense: Expense) => {
    const description = expense.description || '';
    const submitterName = expense.submitter?.name || '';
    const search = searchTerm.toLowerCase();
    const matchesSearch = description.toLowerCase().includes(search) ||
                        submitterName.toLowerCase().includes(search);
    
    // Resort filtering
    const matchesResort = selectedResort === 'all' || expense.resort_id === selectedResort;
    
    // Category filtering
    const matchesCategory = selectedCategory === 'all' || expense.category === selectedCategory;
    
    // Status filtering
    const matchesStatus = filterStatus === 'all' || expense.status === filterStatus;
    
    // Date filtering
    let matchesDate = true;
    if (startDate || endDate) {
      const expenseDate = new Date(expense.date);
      if (startDate) {
        matchesDate = matchesDate && expenseDate >= new Date(startDate);
      }
      if (endDate) {
        matchesDate = matchesDate && expenseDate <= new Date(endDate);
      }
    }
    
    return matchesSearch && matchesResort && matchesCategory && matchesStatus && matchesDate;
  };

  // Get filtered expenses
  const filteredExpenses = expenses.filter(filterExpenses);

  // Check if any filter is active
  const isFilterActive = searchTerm || selectedResort !== 'all' || selectedCategory !== 'all' || filterStatus !== 'all' || startDate || endDate;

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
              <div className="text-sm text-yellow-200 font-medium mb-1">
                Pending {isFilterActive && <span className="text-yellow-100">(Filtered)</span>}
              </div>
              <div className="text-2xl font-bold text-white">
                {filteredExpenses.filter((e) => e.status === 'PENDING').length}
              </div>
              <div className="text-xs text-yellow-300 mt-1">
                Rp{' '}
                {filteredExpenses
                  .filter((e) => e.status === 'PENDING')
                  .reduce((sum, e) => sum + e.amount, 0)
                  .toLocaleString('id-ID')}
              </div>
            </div>
            <div className="bg-green-900/30 backdrop-blur-sm rounded-xl p-4 border border-green-500/30">
              <div className="text-sm text-green-200 font-medium mb-1">
                Approved {isFilterActive && <span className="text-green-100">(Filtered)</span>}
              </div>
              <div className="text-2xl font-bold text-white">
                {filteredExpenses.filter((e) => e.status === 'APPROVED').length}
              </div>
              <div className="text-xs text-green-300 mt-1">
                Rp{' '}
                {filteredExpenses
                  .filter((e) => e.status === 'APPROVED')
                  .reduce((sum, e) => sum + e.amount, 0)
                  .toLocaleString('id-ID')}
              </div>
            </div>
            <div className="bg-red-900/30 backdrop-blur-sm rounded-xl p-4 border border-red-500/30">
              <div className="text-sm text-red-200 font-medium mb-1">
                Rejected {isFilterActive && <span className="text-red-100">(Filtered)</span>}
              </div>
              <div className="text-2xl font-bold text-white">
                {filteredExpenses.filter((e) => e.status === 'REJECTED').length}
              </div>
              <div className="text-xs text-red-300 mt-1">
                Rp{' '}
                {filteredExpenses
                  .filter((e) => e.status === 'REJECTED')
                  .reduce((sum, e) => sum + e.amount, 0)
                  .toLocaleString('id-ID')}
              </div>
            </div>
            <div className="bg-blue-900/30 backdrop-blur-sm rounded-xl p-4 border border-blue-500/30">
              <div className="text-sm text-blue-200 font-medium mb-1">
                Total {isFilterActive && <span className="text-blue-100">(Filtered)</span>}
              </div>
              <div className="text-2xl font-bold text-white">
                {filteredExpenses.length} {isFilterActive && <span className="text-sm font-normal">of {expenses.length}</span>}
              </div>
              <div className="text-xs text-blue-300 mt-1">
                Rp{' '}
                {filteredExpenses
                  .reduce((sum, e) => sum + e.amount, 0)
                  .toLocaleString('id-ID')}
              </div>
            </div>
          </div>
        )}

        {/* Filters - same style as Assets page */}
        <div className="bg-purple-900/20 backdrop-blur-sm rounded-xl shadow-lg p-6 border border-purple-500/20 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/50 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search expenses..."
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
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-4 py-2 bg-purple-800/50 border border-purple-500/30 rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="all">All Categories</option>
              <option value="OPERATIONAL">Operational</option>
              <option value="FUEL">Fuel</option>
              <option value="MARKETING">Marketing</option>
              <option value="SPAREPART">Sparepart</option>
              <option value="SALARY">Salary</option>
              <option value="BUSINESS_TRAVEL">Business Travel</option>
              <option value="SERVICE">Service</option>
              <option value="TOOLS">Tools</option>
              <option value="OTHER">Other</option>
            </select>
            
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as 'all' | ApprovalStatus)}
              className="px-4 py-2 bg-purple-800/50 border border-purple-500/30 rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
            </select>
            
            <input
              type="date"
              placeholder="Start Date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-4 py-2 bg-purple-800/50 border border-purple-500/30 rounded-lg text-white placeholder-white/50 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
            
            <input
              type="date"
              placeholder="End Date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-4 py-2 bg-purple-800/50 border border-purple-500/30 rounded-lg text-white placeholder-white/50 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
        </div>

        {!canCreate && (
          <div className="mb-4 p-4 bg-yellow-900/30 border border-yellow-500/30 rounded-lg backdrop-blur-sm">
            <p className="text-sm text-yellow-200">
              You don't have permission to create expenses. Only ADMIN, MANAGER, and ENGINEER can create.
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
                    <th className="text-left py-3 px-4 text-white/90 font-semibold">Resort</th>
                    <th className="text-right py-3 px-4 text-white/90 font-semibold">Amount</th>
                    <th className="text-left py-3 px-4 text-white/90 font-semibold">Submitted By</th>
                    <th className="text-center py-3 px-4 text-white/90 font-semibold">Status</th>
                    <th className="text-center py-3 px-4 text-white/90 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredExpenses.map((expense) => (
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
                        {expense.supplier && (
                          <span className="text-xs text-green-400">📦 Supplier: {expense.supplier}</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getCategoryColor(expense.category)}`}>
                          {expense.category}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-white/70">
                        {expense.resort?.name || '-'}
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
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {/* Edit button - owner can edit PENDING, Manager can edit any PENDING */}
                          {canEditExpense(expense) && (
                            <button
                              onClick={() => handleEditExpense(expense)}
                              className="px-3 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs font-medium"
                              title="Edit Expense"
                            >
                              Edit
                            </button>
                          )}
                          {/* Review button - Manager only for PENDING */}
                          {canApprove && expense.status === 'PENDING' && (
                            <button
                              onClick={() => handleApprovalAction(expense)}
                              className="px-3 py-1 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-xs font-medium"
                            >
                              Review
                            </button>
                          )}
                          {/* Delete button - Manager only */}
                          {canDelete && (
                            <button
                              onClick={() => handleDeleteExpense(expense)}
                              className="px-3 py-1 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-xs font-medium"
                              title="Delete Expense"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredExpenses.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-white/50">
                        {isFilterActive 
                          ? 'No expenses match your filters' 
                          : 'No expenses available'}
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
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-gradient-to-br from-purple-900 to-slate-900 rounded-2xl p-8 max-w-md w-full border border-purple-500/30 max-h-[90vh] overflow-y-auto">
              <h2 className="text-2xl font-bold text-white mb-6">Add New Expense</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Category *
                  </label>
                  <select
                    required
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({ ...formData, category: e.target.value as ExpenseCategory })
                    }
                    className="w-full px-4 py-2 bg-white/10 border border-white/20 text-white rounded-lg focus:ring-2 focus:ring-purple-400 focus:border-purple-400"
                  >
                    <option value="OPERATIONAL" className="bg-slate-800 text-white">Operational</option>
                    <option value="SPAREPART" className="bg-slate-800 text-white">Spare Part</option>
                    <option value="TOOLS" className="bg-slate-800 text-white">Tools</option>
                    <option value="SERVICE" className="bg-slate-800 text-white">Service</option>
                    <option value="SALARY" className="bg-slate-800 text-white">Salary</option>
                    <option value="FUEL" className="bg-slate-800 text-white">Fuel</option>
                    <option value="BUSINESS_TRAVEL" className="bg-slate-800 text-white">Business Travel</option>
                    <option value="MARKETING" className="bg-slate-800 text-white">Marketing</option>
                    <option value="OTHER" className="bg-slate-800 text-white">Other</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Resort {isSparepart && '*'}
                  </label>
                  <select
                    value={formData.resort_id}
                    onChange={(e) => setFormData({ ...formData, resort_id: e.target.value })}
                    required={isSparepart}
                    className="w-full px-4 py-2 bg-white/10 border border-white/20 text-white rounded-lg focus:ring-2 focus:ring-purple-400 focus:border-purple-400"
                  >
                    <option value="" className="bg-slate-800 text-white">-- General / Not Resort Specific --</option>
                    {resorts.map((resort) => (
                      <option key={resort.id} value={resort.id} className="bg-slate-800 text-white">
                        {resort.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-white/70 mt-1">
                    {isSparepart ? 'Required: Select resort for sparepart inventory' : 'Select resort if this expense is specific to a location'}
                  </p>
                </div>

                {/* Supplier - Only for SPAREPART */}
                {isSparepart && (
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">
                      Supplier *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.supplier}
                      onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                      className="w-full px-4 py-2 bg-white/10 border border-white/20 text-white rounded-lg focus:ring-2 focus:ring-purple-400 focus:border-purple-400 placeholder-white/50"
                      placeholder="Enter supplier name"
                    />
                  </div>
                )}
                
                {/* Sparepart Items - Only for SPAREPART category */}
                {isSparepart && (
                  <div className="border border-purple-500/30 rounded-lg p-4 bg-purple-900/20">
                    <div className="flex justify-between items-center mb-3">
                      <label className="block text-sm font-medium text-white">
                        Sparepart Items *
                      </label>
                      <button
                        type="button"
                        onClick={addSparepartItem}
                        className="px-3 py-1 bg-green-600 text-white text-xs rounded-lg hover:bg-green-700 transition-colors"
                      >
                        + Add Item
                      </button>
                    </div>
                    
                    <div className="space-y-3">
                      {sparepartItems.map((item, index) => (
                        <div key={item.id} className="bg-purple-800/30 rounded-lg p-3">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-xs text-white/70">Item #{index + 1}</span>
                            {sparepartItems.length > 1 && (
                              <button
                                type="button"
                                onClick={() => removeSparepartItem(item.id)}
                                className="text-red-400 hover:text-red-300 text-xs"
                              >
                                ✕ Remove
                              </button>
                            )}
                          </div>
                          <div className="grid grid-cols-1 gap-2">
                            <div className="grid grid-cols-2 gap-2">
                              <input
                                type="text"
                                placeholder="Sparepart Name"
                                value={item.sparepart_name}
                                onChange={(e) => updateSparepartItem(item.id, 'sparepart_name', e.target.value)}
                                className="w-full px-3 py-2 bg-white/10 border border-white/20 text-white rounded-lg text-sm placeholder-white/50"
                              />
                              <select
                                value={item.asset_category}
                                onChange={(e) => updateSparepartItem(item.id, 'asset_category', e.target.value)}
                                className="w-full px-3 py-2 bg-white/10 border border-white/20 text-white rounded-lg text-sm"
                              >
                                <option value="" className="bg-slate-800">-- Asset Category --</option>
                                {ASSET_CATEGORIES.map((cat) => (
                                  <option key={cat} value={cat} className="bg-slate-800">{cat.replace('_', ' ')}</option>
                                ))}
                              </select>
                            </div>
                            <div className="grid grid-cols-4 gap-2">
                              <div>
                                <label className="text-xs text-white/70">Qty</label>
                                <input
                                  type="number"
                                  min="1"
                                  placeholder="Qty"
                                  value={item.quantity}
                                  onChange={(e) => updateSparepartItem(item.id, 'quantity', parseInt(e.target.value) || 0)}
                                  className="w-full px-3 py-2 bg-white/10 border border-white/20 text-white rounded-lg text-sm"
                                />
                              </div>
                              <div>
                                <label className="text-xs text-white/70">Unit</label>
                                <select
                                  value={item.unit}
                                  onChange={(e) => updateSparepartItem(item.id, 'unit', e.target.value)}
                                  className="w-full px-3 py-2 bg-white/10 border border-white/20 text-white rounded-lg text-sm"
                                >
                                  <option value="pcs" className="bg-slate-800">pcs</option>
                                  <option value="liter" className="bg-slate-800">liter</option>
                                  <option value="kg" className="bg-slate-800">kg</option>
                                  <option value="set" className="bg-slate-800">set</option>
                                  <option value="box" className="bg-slate-800">box</option>
                                </select>
                              </div>
                              <div>
                                <label className="text-xs text-white/70">Unit Price</label>
                                <input
                                  type="number"
                                  min="0"
                                  placeholder="Price"
                                  value={item.unit_price}
                                  onChange={(e) => updateSparepartItem(item.id, 'unit_price', parseFloat(e.target.value) || 0)}
                                  className="w-full px-3 py-2 bg-white/10 border border-white/20 text-white rounded-lg text-sm"
                                />
                              </div>
                              <div>
                                <label className="text-xs text-white/70">Total</label>
                                <div className="px-3 py-2 bg-white/5 border border-white/10 text-white rounded-lg text-sm">
                                  Rp {item.total_price.toLocaleString('id-ID')}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    {/* Total Amount Display */}
                    <div className="mt-4 pt-3 border-t border-purple-500/30">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium text-white">Total Amount:</span>
                        <span className="text-lg font-bold text-green-400">
                          Rp {sparepartTotal.toLocaleString('id-ID')}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Description *
                  </label>
                  <textarea
                    required
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 bg-white/10 border border-white/20 text-white rounded-lg focus:ring-2 focus:ring-purple-400 focus:border-purple-400 placeholder-white/50"
                    placeholder="Enter expense description"
                  />
                </div>

                {/* Amount field - hidden for SPAREPART since it's calculated */}
                {!isSparepart && (
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">Amount *</label>
                    <input
                      type="number"
                      required
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      className="w-full px-4 py-2 bg-white/10 border border-white/20 text-white rounded-lg focus:ring-2 focus:ring-purple-400 focus:border-purple-400 placeholder-white/50"
                      placeholder="Enter amount"
                    />
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-white mb-2">Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-4 py-2 bg-white/10 border border-white/20 text-white rounded-lg focus:ring-2 focus:ring-purple-400 focus:border-purple-400"
                  />
                </div>
                <div className="flex gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 px-4 py-2 bg-purple-800/50 text-white rounded-lg hover:bg-purple-800/70 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:from-purple-700 hover:to-pink-700 transition-colors font-semibold"
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

        {/* Edit Expense Modal */}
        {showEditModal && editingExpense && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-gradient-to-br from-purple-900 to-slate-900 rounded-2xl p-8 max-w-md w-full border border-purple-500/30 max-h-[90vh] overflow-y-auto">
              <h2 className="text-2xl font-bold text-white mb-6">Edit Expense</h2>
              <form onSubmit={handleUpdateExpense} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Category *
                  </label>
                  <select
                    required
                    value={formData.category}
                    onChange={(e) =>
                      setFormData({ ...formData, category: e.target.value as ExpenseCategory })
                    }
                    className="w-full px-4 py-2 bg-white/10 border border-white/20 text-white rounded-lg focus:ring-2 focus:ring-purple-400 focus:border-purple-400"
                  >
                    <option value="OPERATIONAL" className="bg-slate-800 text-white">Operational</option>
                    <option value="SPAREPART" className="bg-slate-800 text-white">Spare Part</option>
                    <option value="TOOLS" className="bg-slate-800 text-white">Tools</option>
                    <option value="SERVICE" className="bg-slate-800 text-white">Service</option>
                    <option value="SALARY" className="bg-slate-800 text-white">Salary</option>
                    <option value="FUEL" className="bg-slate-800 text-white">Fuel</option>
                    <option value="BUSINESS_TRAVEL" className="bg-slate-800 text-white">Business Travel</option>
                    <option value="MARKETING" className="bg-slate-800 text-white">Marketing</option>
                    <option value="OTHER" className="bg-slate-800 text-white">Other</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Resort
                  </label>
                  <select
                    value={formData.resort_id}
                    onChange={(e) => setFormData({ ...formData, resort_id: e.target.value })}
                    className="w-full px-4 py-2 bg-white/10 border border-white/20 text-white rounded-lg focus:ring-2 focus:ring-purple-400 focus:border-purple-400"
                  >
                    <option value="" className="bg-slate-800 text-white">-- General / Not Resort Specific --</option>
                    {resorts.map((resort) => (
                      <option key={resort.id} value={resort.id} className="bg-slate-800 text-white">
                        {resort.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Description *
                  </label>
                  <textarea
                    required
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    className="w-full px-4 py-2 bg-white/10 border border-white/20 text-white rounded-lg focus:ring-2 focus:ring-purple-400 focus:border-purple-400 placeholder-white/50"
                    placeholder="Enter expense description"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-2">Amount *</label>
                  <input
                    type="number"
                    required
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full px-4 py-2 bg-white/10 border border-white/20 text-white rounded-lg focus:ring-2 focus:ring-purple-400 focus:border-purple-400 placeholder-white/50"
                    placeholder="Enter amount"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-white mb-2">Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-4 py-2 bg-white/10 border border-white/20 text-white rounded-lg focus:ring-2 focus:ring-purple-400 focus:border-purple-400"
                  />
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditModal(false);
                      setEditingExpense(null);
                      setFormData({
                        category: 'OPERATIONAL',
                        description: '',
                        amount: '',
                        date: new Date().toISOString().split('T')[0],
                        resort_id: '',
                        supplier: '',
                      });
                    }}
                    className="flex-1 px-4 py-2 bg-purple-800/50 text-white rounded-lg hover:bg-purple-800/70 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition-colors font-semibold"
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
