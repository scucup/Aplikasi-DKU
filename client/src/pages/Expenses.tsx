import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout';

type ExpenseCategory = 'OPERATIONAL' | 'PERSONNEL' | 'MARKETING';
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
  submitter?: { name: string };
  approver?: { name: string };
}

export default function Expenses() {
  const { user, profile } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
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
  });

  useEffect(() => {
    fetchExpenses();
  }, []);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase.from('expenses').insert([
        {
          id: crypto.randomUUID(),
          ...formData,
          amount: parseFloat(formData.amount),
          submitted_by: user?.id,
          status: 'PENDING',
        },
      ]);

      if (error) throw error;

      setShowModal(false);
      setFormData({
        category: 'OPERATIONAL',
        description: '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
      });
      fetchExpenses();
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
      case 'PERSONNEL':
        return 'bg-purple-500';
      case 'MARKETING':
        return 'bg-pink-500';
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

      setShowApprovalModal(false);
      setSelectedExpense(null);
      setApprovalComments('');
      fetchExpenses();
    } catch (error: any) {
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

      setShowApprovalModal(false);
      setSelectedExpense(null);
      setApprovalComments('');
      fetchExpenses();
    } catch (error: any) {
      alert('Error rejecting expense: ' + error.message);
    }
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto p-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Expenses Management</h1>
          {canCreate && (
            <button
              onClick={() => setShowModal(true)}
              className="px-6 py-3 bg-gradient-to-br from-purple-500 to-purple-600 text-white rounded-xl shadow-neumorphic hover:shadow-neumorphic-hover transition-all"
            >
              + Add Expense
            </button>
          )}
        </div>

        {/* Statistics for Manager */}
        {canApprove && (
          <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-gradient-to-br from-yellow-100 to-yellow-200 rounded-xl p-4 shadow-md">
              <div className="text-sm text-yellow-800 font-medium mb-1">Pending</div>
              <div className="text-2xl font-bold text-yellow-900">
                {expenses.filter((e) => e.status === 'PENDING').length}
              </div>
              <div className="text-xs text-yellow-700 mt-1">
                Rp{' '}
                {expenses
                  .filter((e) => e.status === 'PENDING')
                  .reduce((sum, e) => sum + e.amount, 0)
                  .toLocaleString('id-ID')}
              </div>
            </div>
            <div className="bg-gradient-to-br from-green-100 to-green-200 rounded-xl p-4 shadow-md">
              <div className="text-sm text-green-800 font-medium mb-1">Approved</div>
              <div className="text-2xl font-bold text-green-900">
                {expenses.filter((e) => e.status === 'APPROVED').length}
              </div>
              <div className="text-xs text-green-700 mt-1">
                Rp{' '}
                {expenses
                  .filter((e) => e.status === 'APPROVED')
                  .reduce((sum, e) => sum + e.amount, 0)
                  .toLocaleString('id-ID')}
              </div>
            </div>
            <div className="bg-gradient-to-br from-red-100 to-red-200 rounded-xl p-4 shadow-md">
              <div className="text-sm text-red-800 font-medium mb-1">Rejected</div>
              <div className="text-2xl font-bold text-red-900">
                {expenses.filter((e) => e.status === 'REJECTED').length}
              </div>
              <div className="text-xs text-red-700 mt-1">
                Rp{' '}
                {expenses
                  .filter((e) => e.status === 'REJECTED')
                  .reduce((sum, e) => sum + e.amount, 0)
                  .toLocaleString('id-ID')}
              </div>
            </div>
            <div className="bg-gradient-to-br from-blue-100 to-blue-200 rounded-xl p-4 shadow-md">
              <div className="text-sm text-blue-800 font-medium mb-1">Total</div>
              <div className="text-2xl font-bold text-blue-900">{expenses.length}</div>
              <div className="text-xs text-blue-700 mt-1">
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
          <div className="mb-6 bg-white rounded-xl p-4 shadow-md">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-gray-700">Filter by Status:</span>
              <div className="flex gap-2">
                {(['ALL', 'PENDING', 'APPROVED', 'REJECTED'] as const).map((status) => (
                  <button
                    key={status}
                    onClick={() => setFilterStatus(status)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      filterStatus === status
                        ? 'bg-purple-600 text-white shadow-md'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
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
          <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              You don't have permission to create expenses. Only ADMIN and MANAGER can create.
            </p>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-purple-600"></div>
          </div>
        ) : (
          <div className="space-y-4">
            {expenses
              .filter((expense) => filterStatus === 'ALL' || expense.status === filterStatus)
              .map((expense) => (
              <div
                key={expense.id}
                className="bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl p-6 shadow-neumorphic hover:shadow-neumorphic-hover transition-all"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <div
                        className={`w-3 h-3 rounded-full ${getCategoryColor(expense.category)}`}
                      ></div>
                      <h3 className="text-lg font-bold text-gray-800">{expense.description}</h3>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(
                          expense.status
                        )}`}
                      >
                        {expense.status}
                      </span>
                      {expense.submitted_by === user?.id && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                          Your Expense
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600 mb-3">
                      <div>
                        <span className="font-medium">Category:</span> {expense.category}
                      </div>
                      <div>
                        <span className="font-medium">Amount:</span> Rp{' '}
                        {expense.amount.toLocaleString('id-ID')}
                      </div>
                      <div>
                        <span className="font-medium">Date:</span>{' '}
                        {new Date(expense.date).toLocaleDateString()}
                      </div>
                      <div>
                        <span className="font-medium">Submitted by:</span>{' '}
                        {(expense as any).submitter?.name || '-'}
                      </div>
                    </div>
                    
                    {/* Approval Information */}
                    {expense.status !== 'PENDING' && (
                      <div className="mt-3 pt-3 border-t border-gray-300">
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm text-gray-600">
                          <div>
                            <span className="font-medium">Approved by:</span>{' '}
                            {(expense as any).approver?.name || '-'}
                          </div>
                          <div>
                            <span className="font-medium">Approval Date:</span>{' '}
                            {expense.approval_date
                              ? new Date(expense.approval_date).toLocaleDateString()
                              : '-'}
                          </div>
                          {expense.approval_comments && (
                            <div className="col-span-2 md:col-span-1">
                              <span className="font-medium">Comments:</span> {expense.approval_comments}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Approval Actions for Manager */}
                  {canApprove && expense.status === 'PENDING' && (
                    <div className="ml-4">
                      <button
                        onClick={() => handleApprovalAction(expense)}
                        className="px-4 py-2 bg-gradient-to-br from-green-500 to-green-600 text-white rounded-lg shadow-md hover:shadow-lg transition-all text-sm font-medium"
                      >
                        Review
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add Expense Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Add New Expense</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
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
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  >
                    <option value="OPERATIONAL">Operational</option>
                    <option value="PERSONNEL">Personnel</option>
                    <option value="MARKETING">Marketing</option>
                  </select>
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
