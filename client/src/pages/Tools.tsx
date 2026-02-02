import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Tool, ToolCondition, Resort } from '../types';
import { Plus, Search, Wrench, AlertTriangle, CheckCircle, XCircle, Edit2, Trash2 } from 'lucide-react';
import AddToolModal from '../components/AddToolModal';
import Layout from '../components/Layout';

export default function Tools() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const isManager = profile?.role === 'MANAGER';
  const [tools, setTools] = useState<Tool[]>([]);
  const [resorts, setResorts] = useState<Resort[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedResort, setSelectedResort] = useState<string>('all');
  const [selectedCondition, setSelectedCondition] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    fetchResorts();
    fetchTools();
  }, []);

  const fetchResorts = async () => {
    const { data, error } = await supabase
      .from('resorts')
      .select('id, name')
      .order('name');
    
    if (error) {
      console.error('Error fetching resorts:', error);
    } else {
      setResorts(data || []);
    }
  };

  const fetchTools = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('tools')
      .select('id, name, category, brand, model, serial_number, resort_id, condition, purchase_date, purchase_price, supplier, warranty_until, last_maintenance_date, notes, image_url, expense_id, created_at, updated_at')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching tools:', error);
    } else {
      setTools(data || []);
    }
    setLoading(false);
  };

  const getConditionBadge = (condition: ToolCondition) => {
    const badges = {
      good: { icon: CheckCircle, color: 'bg-green-500/20 text-green-400 border border-green-500/30', label: 'Good' },
      fair: { icon: AlertTriangle, color: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30', label: 'Fair' },
      poor: { icon: AlertTriangle, color: 'bg-orange-500/20 text-orange-400 border border-orange-500/30', label: 'Poor' },
      damaged: { icon: XCircle, color: 'bg-red-500/20 text-red-400 border border-red-500/30', label: 'Damaged' },
      lost: { icon: XCircle, color: 'bg-gray-500/20 text-gray-400 border border-gray-500/30', label: 'Lost' },
    };
    
    const badge = badges[condition];
    const Icon = badge.icon;
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badge.color}`}>
        <Icon className="w-3 h-3 mr-1" />
        {badge.label}
      </span>
    );
  };

  const filteredTools = tools.filter(tool => {
    const matchesSearch = tool.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         tool.brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         tool.serial_number?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesResort = selectedResort === 'all' || tool.resort_id === selectedResort;
    const matchesCondition = selectedCondition === 'all' || tool.condition === selectedCondition;
    const matchesCategory = selectedCategory === 'all' || tool.category === selectedCategory;
    
    return matchesSearch && matchesResort && matchesCondition && matchesCategory;
  });

  const getResortName = (resortId: string) => {
    return resorts.find(r => r.id === resortId)?.name || resortId;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleDelete = async (toolId: string, toolName: string) => {
    if (!confirm(`Are you sure you want to delete tool "${toolName}"?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('tools')
        .delete()
        .eq('id', toolId);

      if (error) throw error;

      alert('Tool deleted successfully!');
      fetchTools();
    } catch (error: any) {
      console.error('Error deleting tool:', error);
      alert('Failed to delete tool: ' + error.message);
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">Tools Management</h1>
          <p className="text-white/70 mt-1">Manage technician equipment at each resort</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg hover:shadow-xl"
        >
          <Plus className="w-5 h-5 mr-2" />
          Add Tool
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-purple-900/50 to-purple-800/50 backdrop-blur-md rounded-xl shadow-lg p-6 border border-purple-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white/70">Total Tools</p>
              <p className="text-2xl font-bold text-white mt-1">{tools.length}</p>
            </div>
            <Wrench className="w-10 h-10 text-purple-400" />
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-green-900/50 to-green-800/50 backdrop-blur-md rounded-xl shadow-lg p-6 border border-green-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white/70">Good Condition</p>
              <p className="text-2xl font-bold text-white mt-1">
                {tools.filter(t => t.condition === 'good').length}
              </p>
            </div>
            <CheckCircle className="w-10 h-10 text-green-400" />
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-orange-900/50 to-orange-800/50 backdrop-blur-md rounded-xl shadow-lg p-6 border border-orange-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white/70">Need Repair</p>
              <p className="text-2xl font-bold text-white mt-1">
                {tools.filter(t => ['poor', 'damaged'].includes(t.condition)).length}
              </p>
            </div>
            <AlertTriangle className="w-10 h-10 text-orange-400" />
          </div>
        </div>
        
        <div className="bg-gradient-to-br from-red-900/50 to-red-800/50 backdrop-blur-md rounded-xl shadow-lg p-6 border border-red-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white/70">Lost</p>
              <p className="text-2xl font-bold text-white mt-1">
                {tools.filter(t => t.condition === 'lost').length}
              </p>
            </div>
            <XCircle className="w-10 h-10 text-red-400" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-dark-purple-900/50 backdrop-blur-md rounded-xl shadow-lg p-6 border border-purple-500/20">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/50 w-5 h-5" />
            <input
              type="text"
              placeholder="Search tools..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-dark-purple-800/50 border border-purple-500/30 rounded-lg text-white placeholder-white/50 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
          
          <select
            value={selectedResort}
            onChange={(e) => setSelectedResort(e.target.value)}
            className="px-4 py-2 bg-dark-purple-800/50 border border-purple-500/30 rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          >
            <option value="all">All Resorts</option>
            {resorts.map(resort => (
              <option key={resort.id} value={resort.id}>{resort.name}</option>
            ))}
          </select>
          
          <select
            value={selectedCondition}
            onChange={(e) => setSelectedCondition(e.target.value)}
            className="px-4 py-2 bg-dark-purple-800/50 border border-purple-500/30 rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          >
            <option value="all">All Conditions</option>
            <option value="good">Good</option>
            <option value="fair">Fair</option>
            <option value="poor">Poor</option>
            <option value="damaged">Damaged</option>
            <option value="lost">Lost</option>
          </select>
          
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-4 py-2 bg-dark-purple-800/50 border border-purple-500/30 rounded-lg text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          >
            <option value="all">All Categories</option>
            <option value="Hand Tools">Hand Tools</option>
            <option value="Power Tools">Power Tools</option>
            <option value="Diagnostic Equipment">Diagnostic Equipment</option>
            <option value="Safety Equipment">Safety Equipment</option>
            <option value="Measuring Tools">Measuring Tools</option>
            <option value="Other">Other</option>
          </select>
        </div>
      </div>

      {/* Tools Table */}
      <div className="bg-dark-purple-900/50 backdrop-blur-md rounded-xl shadow-lg overflow-hidden border border-purple-500/20">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-purple-500/20">
            <thead className="bg-dark-purple-800/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">
                  Tool
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">
                  Resort
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white/70 uppercase tracking-wider">
                  Condition
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
              {filteredTools.map((tool) => (
                <tr key={tool.id} className="hover:bg-purple-800/30 transition-colors">
                  <td 
                    className="px-6 py-4 whitespace-nowrap cursor-pointer"
                    onClick={() => navigate(`/tools/${tool.id}`)}
                  >
                    <div>
                      <div className="text-sm font-medium text-white hover:text-purple-400">{tool.name}</div>
                      <div className="text-sm text-white/60">
                        {tool.brand && `${tool.brand} `}
                        {tool.model && `- ${tool.model}`}
                      </div>
                      {tool.serial_number && (
                        <div className="text-xs text-white/40">SN: {tool.serial_number}</div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-white">{tool.category}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-white">{getResortName(tool.resort_id)}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getConditionBadge(tool.condition)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-white">{formatCurrency(tool.purchase_price)}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-sm text-white">{formatDate(tool.purchase_date)}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/tools/${tool.id}`);
                      }}
                      className="text-purple-400 hover:text-purple-300 mr-3"
                      title="View Details"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    {isManager && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(tool.id, tool.name);
                        }}
                        className="text-red-400 hover:text-red-300"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {filteredTools.length === 0 && (
        <div className="text-center py-12 bg-dark-purple-900/50 backdrop-blur-md rounded-xl border border-purple-500/20">
          <Wrench className="mx-auto h-12 w-12 text-white/40" />
          <h3 className="mt-2 text-sm font-medium text-white">No tools found</h3>
          <p className="mt-1 text-sm text-white/60">
            Start by adding your first tool.
          </p>
        </div>
      )}

      <AddToolModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={fetchTools}
      />
      </div>
    </Layout>
  );
}
