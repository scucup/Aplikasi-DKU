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
  submitter?: { name: string };
}

export default function Expenses() {
  const { user, profile } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  
  const canCreate = profile?.role === 'ADMIN' || profile?.role === 'MANAGER';
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
      const { data, error } = await supabase
        .from('expenses')
        .select('*, submitter:users!submitted_by(name)')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setExpenses(data || []);
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
            {expenses.map((expense) => (
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
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
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
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal */}
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
      </div>
    </Layout>
  );
}
