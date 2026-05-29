import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Tool, ToolCondition, Resort } from '../types';
import { Plus, Search, Edit2, Trash2 } from 'lucide-react';
import AddToolModal from '../components/AddToolModal';
import Layout from '../components/Layout';
import { formatDate } from '../lib/utils';

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
      good: { color: 'bg-green-500/20 text-green-400', label: 'Good' },
      fair: { color: 'bg-yellow-500/20 text-yellow-400', label: 'Fair' },
      poor: { color: 'bg-orange-500/20 text-orange-400', label: 'Poor' },
      damaged: { color: 'bg-red-500/20 text-red-400', label: 'Damaged' },
      lost: { color: 'bg-gray-500/20 text-gray-400', label: 'Lost' },
    };
    
    const badge = badges[condition];
    
    return (
      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${badge.color}`}>
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
          <div className="animate-spin rounded-full h-10 w-10 border-4 border-navy-600 border-t-blue-500"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h1 className="text-xl font-bold text-white">Tools</h1>
          <p className="text-xs text-slate-400">Manage technician equipment at each resort</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all text-sm font-medium flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          Add Tool
        </button>
      </div>

      {/* Stats Cards - Compact */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-navy-900 rounded-xl p-4 border border-navy-700/50">
          <div className="text-xs text-slate-400 font-medium uppercase tracking-wider">Total</div>
          <div className="text-2xl font-bold text-white mt-1">{tools.length}</div>
        </div>
        <div className="bg-navy-900 rounded-xl p-4 border border-navy-700/50">
          <div className="text-xs text-green-400 font-medium uppercase tracking-wider">Good</div>
          <div className="text-2xl font-bold text-white mt-1">{tools.filter(t => t.condition === 'good').length}</div>
        </div>
        <div className="bg-navy-900 rounded-xl p-4 border border-navy-700/50">
          <div className="text-xs text-orange-400 font-medium uppercase tracking-wider">Need Repair</div>
          <div className="text-2xl font-bold text-white mt-1">{tools.filter(t => ['poor', 'damaged'].includes(t.condition)).length}</div>
        </div>
        <div className="bg-navy-900 rounded-xl p-4 border border-navy-700/50">
          <div className="text-xs text-red-400 font-medium uppercase tracking-wider">Lost</div>
          <div className="text-2xl font-bold text-white mt-1">{tools.filter(t => t.condition === 'lost').length}</div>
        </div>
      </div>

      {/* Table with integrated filters */}
      <div className="bg-navy-900 rounded-xl border border-navy-700/50 overflow-hidden">
        {/* Compact Filters */}
        <div className="p-4 border-b border-navy-700/50">
          <div className="flex flex-wrap gap-2 items-center">
            <div className="relative flex-1 min-w-[180px] max-w-[240px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500 w-4 h-4" />
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
              <option value="all">All Resorts</option>
              {resorts.map(resort => (
                <option key={resort.id} value={resort.id}>{resort.name}</option>
              ))}
            </select>
            <select
              value={selectedCondition}
              onChange={(e) => setSelectedCondition(e.target.value)}
              className="px-3 py-1.5 bg-navy-800 border border-navy-600/50 rounded-lg text-white text-sm focus:ring-1 focus:ring-blue-500"
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
              className="px-3 py-1.5 bg-navy-800 border border-navy-600/50 rounded-lg text-white text-sm focus:ring-1 focus:ring-blue-500"
            >
              <option value="all">All Categories</option>
              <option value="Hand Tools">Hand Tools</option>
              <option value="Power Tools">Power Tools</option>
              <option value="Diagnostic Equipment">Diagnostic</option>
              <option value="Safety Equipment">Safety</option>
              <option value="Measuring Tools">Measuring</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-navy-700/50 bg-navy-800/50">
                <th className="text-left py-2.5 px-3 text-slate-400 font-medium text-xs uppercase tracking-wider">Tool</th>
                <th className="text-left py-2.5 px-3 text-slate-400 font-medium text-xs uppercase tracking-wider">Category</th>
                <th className="text-left py-2.5 px-3 text-slate-400 font-medium text-xs uppercase tracking-wider">Resort</th>
                <th className="text-center py-2.5 px-3 text-slate-400 font-medium text-xs uppercase tracking-wider">Condition</th>
                <th className="text-right py-2.5 px-3 text-slate-400 font-medium text-xs uppercase tracking-wider whitespace-nowrap">Price</th>
                <th className="text-left py-2.5 px-3 text-slate-400 font-medium text-xs uppercase tracking-wider whitespace-nowrap">Date</th>
                <th className="text-center py-2.5 px-3 text-slate-400 font-medium text-xs uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-700/30">
              {filteredTools.map((tool) => (
                <tr key={tool.id} className="hover:bg-navy-800/50 transition-colors cursor-pointer" onClick={() => navigate(`/tools/${tool.id}`)}>
                  <td className="py-2.5 px-3">
                    <div>
                      <div className="text-xs font-medium text-white">{tool.name}</div>
                      <div className="text-[10px] text-slate-500">
                        {tool.brand && `${tool.brand} `}{tool.model && `${tool.model}`}
                      </div>
                    </div>
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="px-1.5 py-0.5 bg-blue-500/10 text-blue-400 rounded text-[10px] font-medium">
                      {tool.category}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-slate-300 text-xs max-w-[100px] truncate">
                    {getResortName(tool.resort_id)}
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    {getConditionBadge(tool.condition)}
                  </td>
                  <td className="py-2.5 px-3 text-right whitespace-nowrap">
                    <span className="text-white font-semibold text-xs">Rp{'\u00A0'}{tool.purchase_price.toLocaleString('id-ID')}</span>
                  </td>
                  <td className="py-2.5 px-3 text-slate-400 text-xs whitespace-nowrap">
                    {formatDate(tool.purchase_date)}
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="flex items-center justify-center gap-1">
                      <button 
                        onClick={(e) => { e.stopPropagation(); navigate(`/tools/${tool.id}`); }}
                        className="w-7 h-7 flex items-center justify-center bg-blue-600/20 text-blue-400 rounded hover:bg-blue-600/40 transition-colors"
                        title="View"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      {isManager && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleDelete(tool.id, tool.name); }}
                          className="w-7 h-7 flex items-center justify-center bg-red-600/20 text-red-400 rounded hover:bg-red-600/40 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filteredTools.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500 text-sm">
                    No tools found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AddToolModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={fetchTools}
      />
      </div>
    </Layout>
  );
}
