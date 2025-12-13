import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Tool, ToolMaintenanceHistory, Resort } from '../types';
import { ArrowLeft, Wrench, Calendar, DollarSign, User, AlertCircle, Edit2 } from 'lucide-react';
import Layout from '../components/Layout';
import AddMaintenanceModal from '../components/AddMaintenanceModal';
import EditToolModal from '../components/EditToolModal';

export default function ToolDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [tool, setTool] = useState<Tool | null>(null);
  const [resort, setResort] = useState<Resort | null>(null);
  const [maintenanceHistory, setMaintenanceHistory] = useState<ToolMaintenanceHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    if (id) {
      fetchToolDetails();
    }
  }, [id]);

  const fetchToolDetails = async () => {
    setLoading(true);
    
    // Fetch tool
    const { data: toolData, error: toolError } = await supabase
      .from('tools')
      .select('*')
      .eq('id', id)
      .single();

    if (toolError) {
      console.error('Error fetching tool:', toolError);
      setLoading(false);
      return;
    }

    setTool(toolData);

    // Fetch resort
    if (toolData?.resort_id) {
      const { data: resortData } = await supabase
        .from('resorts')
        .select('*')
        .eq('id', toolData.resort_id)
        .single();
      
      if (resortData) setResort(resortData);
    }

    // Fetch maintenance history
    const { data: maintenanceData } = await supabase
      .from('tool_maintenance_history')
      .select('*')
      .eq('tool_id', id)
      .order('maintenance_date', { ascending: false });

    if (maintenanceData) setMaintenanceHistory(maintenanceData);

    setLoading(false);
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
      month: 'long',
      day: 'numeric'
    });
  };

  const getConditionColor = (condition: string) => {
    const colors = {
      good: 'bg-green-500/20 text-green-400 border border-green-500/30',
      fair: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30',
      poor: 'bg-orange-500/20 text-orange-400 border border-orange-500/30',
      damaged: 'bg-red-500/20 text-red-400 border border-red-500/30',
      lost: 'bg-gray-500/20 text-gray-400 border border-gray-500/30',
    };
    return colors[condition as keyof typeof colors] || 'bg-gray-500/20 text-gray-400 border border-gray-500/30';
  };

  const getConditionLabel = (condition: string) => {
    const labels = {
      good: 'Good',
      fair: 'Fair',
      poor: 'Poor',
      damaged: 'Damaged',
      lost: 'Lost',
    };
    return labels[condition as keyof typeof labels] || condition;
  };

  const getMaintenanceTypeLabel = (type: string) => {
    const labels = {
      repair: 'Repair',
      calibration: 'Calibration',
      cleaning: 'Cleaning',
      inspection: 'Inspection',
    };
    return labels[type as keyof typeof labels] || type;
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

  if (!tool) {
    return (
      <Layout>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center bg-dark-purple-900/50 backdrop-blur-md rounded-xl p-12 border border-purple-500/20">
            <AlertCircle className="mx-auto h-12 w-12 text-white/40" />
            <h3 className="mt-2 text-sm font-medium text-white">Tool not found</h3>
            <button
              onClick={() => navigate('/tools')}
              className="mt-4 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all"
            >
              Back to Tools
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/tools')}
            className="flex items-center text-purple-400 hover:text-purple-300 mb-4"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Tools
          </button>
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-white">{tool.name}</h1>
              <p className="text-white/70 mt-1">
                {tool.brand && `${tool.brand} `}
                {tool.model && `- ${tool.model}`}
              </p>
            </div>
            <button 
              onClick={() => setShowEditModal(true)}
              className="flex items-center px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all shadow-lg"
            >
              <Edit2 className="w-4 h-4 mr-2" />
              Edit Tool
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information */}
            <div className="bg-dark-purple-900/50 backdrop-blur-md rounded-xl shadow-lg p-6 border border-purple-500/20">
              <h2 className="text-xl font-bold text-white mb-4">Basic Information</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-white/70">Category</p>
                  <p className="text-base font-medium text-white">{tool.category}</p>
                </div>
                <div>
                  <p className="text-sm text-white/70">Condition</p>
                  <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${getConditionColor(tool.condition)}`}>
                    {getConditionLabel(tool.condition)}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-white/70">Serial Number</p>
                  <p className="text-base font-medium text-white">{tool.serial_number || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-white/70">Resort</p>
                  <p className="text-base font-medium text-white">{resort?.name || tool.resort_id}</p>
                </div>
              </div>
            </div>

            {/* Purchase Information */}
            <div className="bg-dark-purple-900/50 backdrop-blur-md rounded-xl shadow-lg p-6 border border-purple-500/20">
              <h2 className="text-xl font-bold text-white mb-4">Purchase Information</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-white/70">Purchase Date</p>
                  <p className="text-base font-medium text-white">{formatDate(tool.purchase_date)}</p>
                </div>
                <div>
                  <p className="text-sm text-white/70">Purchase Price</p>
                  <p className="text-base font-medium text-white">{formatCurrency(tool.purchase_price)}</p>
                </div>
                <div>
                  <p className="text-sm text-white/70">Supplier</p>
                  <p className="text-base font-medium text-white">{tool.supplier || '-'}</p>
                </div>
                <div>
                  <p className="text-sm text-white/70">Warranty Until</p>
                  <p className="text-base font-medium text-white">
                    {tool.warranty_until ? formatDate(tool.warranty_until) : '-'}
                  </p>
                </div>
              </div>
            </div>

            {/* Maintenance History */}
            <div className="bg-dark-purple-900/50 backdrop-blur-md rounded-xl shadow-lg p-6 border border-purple-500/20">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-white">Maintenance History</h2>
                <button 
                  onClick={() => setShowMaintenanceModal(true)}
                  className="px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-700 hover:to-pink-700 transition-all text-sm shadow-lg"
                >
                  + Add Maintenance
                </button>
              </div>
              
              {maintenanceHistory.length === 0 ? (
                <div className="text-center py-8">
                  <Wrench className="mx-auto h-12 w-12 text-white/40" />
                  <p className="mt-2 text-sm text-white/60">No maintenance history yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {maintenanceHistory.map((maintenance) => (
                    <div key={maintenance.id} className="border border-purple-500/30 rounded-lg p-4 bg-dark-purple-800/30">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <span className="inline-block px-2 py-1 bg-blue-500/20 text-blue-400 text-xs font-medium rounded border border-blue-500/30">
                            {getMaintenanceTypeLabel(maintenance.maintenance_type)}
                          </span>
                          <p className="text-sm text-white/70 mt-1">
                            <Calendar className="inline w-4 h-4 mr-1" />
                            {formatDate(maintenance.maintenance_date)}
                          </p>
                        </div>
                        {maintenance.cost && (
                          <p className="text-sm font-medium text-white">
                            <DollarSign className="inline w-4 h-4" />
                            {formatCurrency(maintenance.cost)}
                          </p>
                        )}
                      </div>
                      {maintenance.description && (
                        <p className="text-sm text-white/80 mt-2">{maintenance.description}</p>
                      )}
                      {maintenance.performed_by && (
                        <p className="text-xs text-white/50 mt-2">
                          <User className="inline w-3 h-3 mr-1" />
                          Performed by: {maintenance.performed_by}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Notes */}
            {tool.notes && (
              <div className="bg-dark-purple-900/50 backdrop-blur-md rounded-xl shadow-lg p-6 border border-purple-500/20">
                <h3 className="text-lg font-bold text-white mb-2">Notes</h3>
                <p className="text-sm text-white/80">{tool.notes}</p>
              </div>
            )}

            {/* Last Maintenance */}
            {tool.last_maintenance_date && (
              <div className="bg-dark-purple-900/50 backdrop-blur-md rounded-xl shadow-lg p-6 border border-purple-500/20">
                <h3 className="text-lg font-bold text-white mb-2">Last Maintenance</h3>
                <p className="text-sm text-white/80">{formatDate(tool.last_maintenance_date)}</p>
              </div>
            )}

            {/* Stats */}
            <div className="bg-dark-purple-900/50 backdrop-blur-md rounded-xl shadow-lg p-6 border border-purple-500/20">
              <h3 className="text-lg font-bold text-white mb-4">Statistics</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-white/70">Total Maintenance</p>
                  <p className="text-2xl font-bold text-white">{maintenanceHistory.length}</p>
                </div>
                <div>
                  <p className="text-sm text-white/70">Total Maintenance Cost</p>
                  <p className="text-2xl font-bold text-white">
                    {formatCurrency(maintenanceHistory.reduce((sum, m) => sum + (m.cost || 0), 0))}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <AddMaintenanceModal
          isOpen={showMaintenanceModal}
          onClose={() => setShowMaintenanceModal(false)}
          onSuccess={fetchToolDetails}
          toolId={tool.id}
          toolName={tool.name}
        />

        <EditToolModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          onSuccess={fetchToolDetails}
          tool={tool}
        />
      </div>
    </Layout>
  );
}
