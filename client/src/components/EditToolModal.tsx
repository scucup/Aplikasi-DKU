import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Tool, ToolCondition, ToolCategory } from '../types';
import { X } from 'lucide-react';

interface EditToolModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  tool: Tool;
}

export default function EditToolModal({ isOpen, onClose, onSuccess, tool }: EditToolModalProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: tool.name,
    category: tool.category,
    brand: tool.brand || '',
    model: tool.model || '',
    serial_number: tool.serial_number || '',
    condition: tool.condition,
    supplier: tool.supplier || '',
    warranty_until: tool.warranty_until || '',
    notes: tool.notes || '',
  });

  useEffect(() => {
    if (isOpen) {
      setFormData({
        name: tool.name,
        category: tool.category,
        brand: tool.brand || '',
        model: tool.model || '',
        serial_number: tool.serial_number || '',
        condition: tool.condition,
        supplier: tool.supplier || '',
        warranty_until: tool.warranty_until || '',
        notes: tool.notes || '',
      });
    }
  }, [isOpen, tool]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from('tools')
        .update({
          name: formData.name,
          category: formData.category,
          brand: formData.brand || null,
          model: formData.model || null,
          serial_number: formData.serial_number || null,
          condition: formData.condition,
          supplier: formData.supplier || null,
          warranty_until: formData.warranty_until || null,
          notes: formData.notes || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', tool.id);

      if (error) throw error;

      alert('Tool updated successfully!');
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error('Error updating tool:', error);
      alert('Failed to update tool: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-navy-900 border border-navy-600/50 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="sticky top-0 bg-navy-800 border-b border-navy-600/50 px-6 py-4 flex justify-between items-center rounded-t-xl">
          <h2 className="text-xl font-bold text-white">Edit Tool</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-200 mb-1">
                Tool Name <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 bg-navy-800 border border-navy-600/50 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-200 mb-1">
                Category <span className="text-red-400">*</span>
              </label>
              <select
                required
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as ToolCategory })}
                className="w-full px-3 py-2 bg-navy-800 border border-navy-600/50 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="Hand Tools">Hand Tools</option>
                <option value="Power Tools">Power Tools</option>
                <option value="Diagnostic Equipment">Diagnostic Equipment</option>
                <option value="Safety Equipment">Safety Equipment</option>
                <option value="Measuring Tools">Measuring Tools</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-200 mb-1">Brand</label>
              <input
                type="text"
                value={formData.brand}
                onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                className="w-full px-3 py-2 bg-navy-800 border border-navy-600/50 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-200 mb-1">Model</label>
              <input
                type="text"
                value={formData.model}
                onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                className="w-full px-3 py-2 bg-navy-800 border border-navy-600/50 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-200 mb-1">Serial Number</label>
              <input
                type="text"
                value={formData.serial_number}
                onChange={(e) => setFormData({ ...formData, serial_number: e.target.value })}
                className="w-full px-3 py-2 bg-navy-800 border border-navy-600/50 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-200 mb-1">
                Condition <span className="text-red-400">*</span>
              </label>
              <select
                required
                value={formData.condition}
                onChange={(e) => setFormData({ ...formData, condition: e.target.value as ToolCondition })}
                className="w-full px-3 py-2 bg-navy-800 border border-navy-600/50 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="good">Good</option>
                <option value="fair">Fair</option>
                <option value="poor">Poor</option>
                <option value="damaged">Damaged</option>
                <option value="lost">Lost</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-200 mb-1">Supplier</label>
              <input
                type="text"
                value={formData.supplier}
                onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                className="w-full px-3 py-2 bg-navy-800 border border-navy-600/50 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-200 mb-1">Warranty Until</label>
              <input
                type="date"
                value={formData.warranty_until}
                onChange={(e) => setFormData({ ...formData, warranty_until: e.target.value })}
                className="w-full px-3 py-2 bg-navy-800 border border-navy-600/50 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-200 mb-1">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 bg-navy-800 border border-navy-600/50 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
              {loading ? 'Updating...' : 'Update Tool'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
