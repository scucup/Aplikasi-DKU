import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { ToolMaintenanceType } from '../types';
import { X } from 'lucide-react';

interface AddMaintenanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  toolId: string;
  toolName: string;
}

export default function AddMaintenanceModal({ isOpen, onClose, onSuccess, toolId, toolName }: AddMaintenanceModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    maintenance_date: new Date().toISOString().split('T')[0],
    maintenance_type: 'inspection' as ToolMaintenanceType,
    description: '',
    cost: '',
    performed_by: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.from('tool_maintenance_history').insert([{
        tool_id: toolId,
        maintenance_date: formData.maintenance_date,
        maintenance_type: formData.maintenance_type,
        description: formData.description || null,
        cost: formData.cost ? parseFloat(formData.cost) : null,
        performed_by: formData.performed_by || null,
      }]);

      if (error) throw error;

      // Update last_maintenance_date on tool
      await supabase
        .from('tools')
        .update({ last_maintenance_date: formData.maintenance_date })
        .eq('id', toolId);

      alert('Maintenance record added successfully!');
      onSuccess();
      onClose();
      resetForm();
    } catch (error: any) {
      console.error('Error adding maintenance:', error);
      alert('Failed to add maintenance: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      maintenance_date: new Date().toISOString().split('T')[0],
      maintenance_type: 'inspection',
      description: '',
      cost: '',
      performed_by: '',
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-navy-900 border border-navy-600/50 rounded-xl max-w-lg w-full shadow-2xl">
        <div className="bg-navy-800 border-b border-navy-600/50 px-6 py-4 flex justify-between items-center rounded-t-xl">
          <h2 className="text-xl font-bold text-white">Add Maintenance Record</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <p className="text-sm text-slate-400 mb-4">Tool: <span className="font-medium text-white">{toolName}</span></p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-200 mb-1">
              Maintenance Date <span className="text-red-400">*</span>
            </label>
            <input
              type="date"
              required
              value={formData.maintenance_date}
              onChange={(e) => setFormData({ ...formData, maintenance_date: e.target.value })}
              className="w-full px-3 py-2 bg-navy-800 border border-navy-600/50 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-200 mb-1">
              Maintenance Type <span className="text-red-400">*</span>
            </label>
            <select
              required
              value={formData.maintenance_type}
              onChange={(e) => setFormData({ ...formData, maintenance_type: e.target.value as ToolMaintenanceType })}
              className="w-full px-3 py-2 bg-navy-800 border border-navy-600/50 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="inspection">Inspection</option>
              <option value="cleaning">Cleaning</option>
              <option value="calibration">Calibration</option>
              <option value="repair">Repair</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-200 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 bg-navy-800 border border-navy-600/50 rounded-lg text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Maintenance work details..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-200 mb-1">Cost (Rp)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={formData.cost}
              onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
              className="w-full px-3 py-2 bg-navy-800 border border-navy-600/50 rounded-lg text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="0"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-200 mb-1">Performed By</label>
            <input
              type="text"
              value={formData.performed_by}
              onChange={(e) => setFormData({ ...formData, performed_by: e.target.value })}
              className="w-full px-3 py-2 bg-navy-800 border border-navy-600/50 rounded-lg text-white placeholder-slate-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Technician name"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-navy-600/50">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-200 bg-navy-800 border border-navy-600/50 rounded-lg hover:bg-navy-700 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all shadow-lg disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
