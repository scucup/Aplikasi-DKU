import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { generateInvoiceNumber, generateUUID } from '../lib/utils';

interface Resort {
  id: string;
  name: string;
  address?: string | null;
  company_address?: string | null;
  contact_name?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
}

interface BankAccount {
  id: string;
  bank_name: string;
  account_number: string;
  account_holder_name: string;
  swift_code?: string;
  npwp?: string;
  is_default: boolean;
}

interface CustomInvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface Props {
  resorts: Resort[];
  bankAccounts: BankAccount[];
  userId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function CustomInvoiceModal({ resorts, bankAccounts, userId, onClose, onSuccess }: Props) {
  const [formData, setFormData] = useState({
    resort_id: '',
    invoice_date: new Date().toISOString().split('T')[0],
    customer_name: '',
    customer_address: '',
    customer_phone: '',
    customer_email: '',
    bank_account_id: bankAccounts.find(b => b.is_default)?.id || '',
    notes: '',
  });

  const [items, setItems] = useState<CustomInvoiceItem[]>([
    { id: crypto.randomUUID(), description: '', quantity: 1, unit_price: 0, total_price: 0 }
  ]);

  // Auto-fill customer data when resort is selected
  const handleResortChange = (resortId: string) => {
    const selectedResort = resorts.find(r => r.id === resortId);
    
    if (selectedResort) {
      // Auto-fill with resort data
      setFormData({
        ...formData,
        resort_id: resortId,
        customer_name: selectedResort.name,
        customer_address: selectedResort.company_address || selectedResort.address || '',
        customer_phone: selectedResort.contact_phone || '',
        customer_email: selectedResort.contact_email || '',
      });
    } else {
      // Clear customer data if no resort selected
      setFormData({
        ...formData,
        resort_id: '',
        customer_name: '',
        customer_address: '',
        customer_phone: '',
        customer_email: '',
      });
    }
  };

  const addItem = () => {
    setItems([...items, { 
      id: generateUUID(), 
      description: '', 
      quantity: 1, 
      unit_price: 0, 
      total_price: 0 
    }]);
  };

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter(item => item.id !== id));
    }
  };

  const updateItem = (id: string, field: keyof CustomInvoiceItem, value: string | number) => {
    setItems(items.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        if (field === 'quantity' || field === 'unit_price') {
          updated.total_price = updated.quantity * updated.unit_price;
        }
        return updated;
      }
      return item;
    }));
  };

  const calculateTotal = () => {
    return items.reduce((sum, item) => sum + item.total_price, 0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    const invalidItems = items.filter(item => 
      !item.description.trim() || 
      item.quantity <= 0 || 
      item.unit_price <= 0
    );
    
    if (invalidItems.length > 0) {
      alert('Please fill in all item details (description, quantity, and price)');
      return;
    }

    if (!formData.customer_name.trim()) {
      alert('Please enter customer name');
      return;
    }

    try {
      const invoiceId = generateUUID();
      const invoiceNumber = await generateInvoiceNumber();
      const totalAmount = calculateTotal();

      // Create custom invoice
      const { error: invoiceError } = await supabase.from('invoices').insert([{
        id: invoiceId,
        invoice_number: invoiceNumber,
        invoice_type: 'CUSTOM',
        resort_id: formData.resort_id || null,
        invoice_date: formData.invoice_date,
        customer_name: formData.customer_name,
        customer_address: formData.customer_address || null,
        customer_phone: formData.customer_phone || null,
        customer_email: formData.customer_email || null,
        total_revenue: totalAmount,
        dku_share: totalAmount, // For custom invoices, full amount goes to DKU
        resort_share: 0,
        status: 'DRAFT',
        generated_by: userId,
        bank_account_id: formData.bank_account_id,
        notes: formData.notes || null,
      }]);

      if (invoiceError) throw invoiceError;

      // Create custom invoice items
      const itemsInserts = items.map(item => ({
        id: generateUUID(),
        invoice_id: invoiceId,
        item_name: item.description.substring(0, 100), // Use first part of description as item name
        description: item.description || null,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
      }));

      const { error: itemsError } = await supabase
        .from('custom_invoice_items')
        .insert(itemsInserts);

      if (itemsError) throw itemsError;

      alert('Custom invoice created successfully!');
      onSuccess();
      onClose();
    } catch (error: any) {
      alert('Error creating custom invoice: ' + error.message);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
      <div className="bg-white rounded-2xl p-8 max-w-4xl w-full mx-4 my-8 max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Create Custom Invoice</h2>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Customer Information */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-gray-700 mb-4">Customer Information</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Customer Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.customer_name}
                  onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                  disabled={!!formData.resort_id}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                  placeholder="e.g., PT. Example Company"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Resort (Optional)
                </label>
                <select
                  value={formData.resort_id}
                  onChange={(e) => handleResortChange(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="">No Resort</option>
                  {resorts.map((resort) => (
                    <option key={resort.id} value={resort.id}>
                      {resort.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address
                </label>
                <textarea
                  value={formData.customer_address}
                  onChange={(e) => setFormData({ ...formData, customer_address: e.target.value })}
                  disabled={!!formData.resort_id}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                  rows={2}
                  placeholder="Customer address"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone
                </label>
                <input
                  type="text"
                  value={formData.customer_phone}
                  onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })}
                  disabled={!!formData.resort_id}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                  placeholder="e.g., +62 812 3456 7890"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.customer_email}
                  onChange={(e) => setFormData({ ...formData, customer_email: e.target.value })}
                  disabled={!!formData.resort_id}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                  placeholder="customer@example.com"
                />
              </div>
            </div>
          </div>

          {/* Invoice Details */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Invoice Date *
              </label>
              <input
                type="date"
                required
                value={formData.invoice_date}
                onChange={(e) => setFormData({ ...formData, invoice_date: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bank Account *
              </label>
              <select
                required
                value={formData.bank_account_id}
                onChange={(e) => setFormData({ ...formData, bank_account_id: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="">Select Bank Account</option>
                {bankAccounts.map((bank) => (
                  <option key={bank.id} value={bank.id}>
                    {bank.bank_name} - {bank.account_holder_name} {bank.is_default ? '(Default)' : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Invoice Items */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-semibold text-gray-700">Invoice Items</h3>
              <button
                type="button"
                onClick={addItem}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
              >
                + Add Item
              </button>
            </div>
            
            <div className="space-y-3">
              {items.map((item, index) => (
                <div key={item.id} className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-sm font-medium text-gray-600">Item #{index + 1}</span>
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-1 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Description *
                      </label>
                      <input
                        type="text"
                        required
                        value={item.description}
                        onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                        placeholder="e.g., ATV Unit, Service Fee, Sparepart, etc."
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Quantity *
                        </label>
                        <input
                          type="number"
                          required
                          min="1"
                          step="1"
                          value={item.quantity}
                          onChange={(e) => updateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Unit Price (Rp) *
                        </label>
                        <input
                          type="number"
                          required
                          min="0"
                          step="1000"
                          value={item.unit_price}
                          onChange={(e) => updateItem(item.id, 'unit_price', parseFloat(e.target.value) || 0)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Total Price
                      </label>
                      <div className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-sm font-semibold">
                        Rp {item.total_price.toLocaleString('id-ID')}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              rows={3}
              placeholder="Additional notes or terms..."
            />
          </div>

          {/* Total */}
          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold text-gray-700">Total Amount:</span>
              <span className="text-2xl font-bold text-indigo-600">
                Rp {calculateTotal().toLocaleString('id-ID')}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Create Invoice
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
