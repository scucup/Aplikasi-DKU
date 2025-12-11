import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

type InvoiceStatus = 'DRAFT' | 'SENT' | 'PAID';
type AssetCategory = 'ATV' | 'UTV' | 'SEA_SPORT' | 'POOL_TOYS' | 'LINE_SPORT';

interface Resort {
  id: string;
  name: string;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
}

interface Invoice {
  id: string;
  invoice_number: string;
  resort_id: string;
  start_date: string;
  end_date: string;
  total_revenue: number;
  dku_share: number;
  resort_share: number;
  status: InvoiceStatus;
  generated_by: string;
  created_at: string;
  resort?: Resort;
  generator?: { name: string };
}

interface InvoiceLineItem {
  id: string;
  invoice_id: string;
  asset_category: AssetCategory;
  revenue: number;
  dku_percentage: number;
  resort_percentage: number;
  dku_amount: number;
  resort_amount: number;
}

export default function Invoices() {
  const { user, profile } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [resorts, setResorts] = useState<Resort[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>([]);
  
  const canCreate = profile?.role === 'ADMIN' || profile?.role === 'MANAGER';
  const canDelete = profile?.role === 'MANAGER';
  
  const [formData, setFormData] = useState({
    resort_id: '',
    start_date: '',
    end_date: '',
  });

  useEffect(() => {
    fetchInvoices();
    fetchResorts();
  }, []);

  const fetchResorts = async () => {
    try {
      const { data, error } = await supabase
        .from('resorts')
        .select('*')
        .order('name');

      if (error) throw error;
      setResorts(data || []);
    } catch (error) {
      console.error('Error fetching resorts:', error);
    }
  };

  const fetchInvoices = async () => {
    try {
      const { data: invoicesData, error: invoicesError } = await supabase
        .from('invoices')
        .select('*')
        .order('created_at', { ascending: false });

      if (invoicesError) throw invoicesError;

      // Fetch resorts and users
      const { data: resortsData } = await supabase.from('resorts').select('*');
      const { data: usersData } = await supabase.from('users').select('id, name');

      const resortMap = new Map(resortsData?.map(r => [r.id, r]) || []);
      const userMap = new Map(usersData?.map(u => [u.id, u.name]) || []);

      const transformedData = invoicesData?.map((invoice: any) => ({
        ...invoice,
        resort: resortMap.get(invoice.resort_id),
        generator: { name: userMap.get(invoice.generated_by) || 'Unknown' },
      }));

      setInvoices(transformedData || []);
    } catch (error) {
      console.error('Error fetching invoices:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateInvoiceNumber = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `INV-${year}${month}-${random}`;
  };

  const calculateInvoiceData = async (resortId: string, startDate: string, endDate: string) => {
    // Fetch revenue records for the period
    const { data: revenueData, error: revenueError } = await supabase
      .from('revenue_records')
      .select('*')
      .eq('resort_id', resortId)
      .gte('date', startDate)
      .lte('date', endDate);

    if (revenueError) throw revenueError;

    // Fetch profit sharing configs
    const { data: profitConfigs, error: profitError } = await supabase
      .from('profit_sharing_configs')
      .select('*')
      .eq('resort_id', resortId);

    if (profitError) throw profitError;

    // Group revenue by asset category
    const revenueByCategory: { [key: string]: number } = {};
    revenueData?.forEach((record) => {
      const category = record.asset_category;
      revenueByCategory[category] = (revenueByCategory[category] || 0) + Number(record.amount);
    });

    // Calculate line items
    const lineItems: any[] = [];
    let totalRevenue = 0;
    let totalDkuShare = 0;
    let totalResortShare = 0;

    Object.entries(revenueByCategory).forEach(([category, revenue]) => {
      const config = profitConfigs?.find(c => c.asset_category === category);
      const dkuPercentage = config?.dku_percentage || 70;
      const resortPercentage = config?.resort_percentage || 30;
      const dkuAmount = (revenue * dkuPercentage) / 100;
      const resortAmount = (revenue * resortPercentage) / 100;

      lineItems.push({
        asset_category: category,
        revenue,
        dku_percentage: dkuPercentage,
        resort_percentage: resortPercentage,
        dku_amount: dkuAmount,
        resort_amount: resortAmount,
      });

      totalRevenue += revenue;
      totalDkuShare += dkuAmount;
      totalResortShare += resortAmount;
    });

    return { lineItems, totalRevenue, totalDkuShare, totalResortShare };
  };

  const handleGenerateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { lineItems, totalRevenue, totalDkuShare, totalResortShare } = 
        await calculateInvoiceData(formData.resort_id, formData.start_date, formData.end_date);

      if (lineItems.length === 0) {
        alert('No revenue data found for the selected period');
        return;
      }

      const invoiceId = crypto.randomUUID();
      const invoiceNumber = generateInvoiceNumber();

      // Create invoice
      const { error: invoiceError } = await supabase.from('invoices').insert([{
        id: invoiceId,
        invoice_number: invoiceNumber,
        resort_id: formData.resort_id,
        start_date: formData.start_date,
        end_date: formData.end_date,
        total_revenue: totalRevenue,
        dku_share: totalDkuShare,
        resort_share: totalResortShare,
        status: 'DRAFT',
        generated_by: user?.id,
      }]);

      if (invoiceError) throw invoiceError;

      // Create line items
      const lineItemsInserts = lineItems.map(item => ({
        id: crypto.randomUUID(),
        invoice_id: invoiceId,
        ...item,
      }));

      const { error: lineItemsError } = await supabase
        .from('invoice_line_items')
        .insert(lineItemsInserts);

      if (lineItemsError) throw lineItemsError;

      setShowModal(false);
      setFormData({ resort_id: '', start_date: '', end_date: '' });
      fetchInvoices();
      alert('Invoice generated successfully!');
    } catch (error: any) {
      alert('Error generating invoice: ' + error.message);
    }
  };

  const handleUpdateStatus = async (invoiceId: string, newStatus: InvoiceStatus) => {
    try {
      const { error } = await supabase
        .from('invoices')
        .update({ status: newStatus })
        .eq('id', invoiceId);

      if (error) throw error;
      fetchInvoices();
    } catch (error: any) {
      alert('Error updating status: ' + error.message);
    }
  };

  const handleViewInvoice = async (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    
    // Fetch line items
    const { data, error } = await supabase
      .from('invoice_line_items')
      .select('*')
      .eq('invoice_id', invoice.id);

    if (error) {
      console.error('Error fetching line items:', error);
      return;
    }

    setLineItems(data || []);
  };

  const handleEditInvoice = async (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setFormData({
      resort_id: invoice.resort_id,
      start_date: invoice.start_date,
      end_date: invoice.end_date,
    });
    
    // Fetch line items
    const { data, error } = await supabase
      .from('invoice_line_items')
      .select('*')
      .eq('invoice_id', invoice.id);

    if (error) {
      console.error('Error fetching line items:', error);
      return;
    }

    setLineItems(data || []);
    setShowEditModal(true);
  };

  const handleUpdateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice) return;

    try {
      // Recalculate invoice data
      const { lineItems: newLineItems, totalRevenue, totalDkuShare, totalResortShare } = 
        await calculateInvoiceData(formData.resort_id, formData.start_date, formData.end_date);

      if (newLineItems.length === 0) {
        alert('No revenue data found for the selected period');
        return;
      }

      // Update invoice
      const { error: invoiceError } = await supabase
        .from('invoices')
        .update({
          resort_id: formData.resort_id,
          start_date: formData.start_date,
          end_date: formData.end_date,
          total_revenue: totalRevenue,
          dku_share: totalDkuShare,
          resort_share: totalResortShare,
        })
        .eq('id', selectedInvoice.id);

      if (invoiceError) throw invoiceError;

      // Delete old line items
      await supabase
        .from('invoice_line_items')
        .delete()
        .eq('invoice_id', selectedInvoice.id);

      // Create new line items
      const lineItemsInserts = newLineItems.map(item => ({
        id: crypto.randomUUID(),
        invoice_id: selectedInvoice.id,
        ...item,
      }));

      const { error: lineItemsError } = await supabase
        .from('invoice_line_items')
        .insert(lineItemsInserts);

      if (lineItemsError) throw lineItemsError;

      setShowEditModal(false);
      setSelectedInvoice(null);
      setFormData({ resort_id: '', start_date: '', end_date: '' });
      fetchInvoices();
      alert('Invoice updated successfully!');
    } catch (error: any) {
      alert('Error updating invoice: ' + error.message);
    }
  };

  const handleDeleteInvoice = async (invoiceId: string) => {
    if (!confirm('Are you sure you want to delete this invoice? This action cannot be undone.')) {
      return;
    }

    try {
      // Delete line items first (foreign key constraint)
      await supabase
        .from('invoice_line_items')
        .delete()
        .eq('invoice_id', invoiceId);

      // Delete invoice
      const { error } = await supabase
        .from('invoices')
        .delete()
        .eq('id', invoiceId);

      if (error) throw error;

      fetchInvoices();
      alert('Invoice deleted successfully!');
    } catch (error: any) {
      alert('Error deleting invoice: ' + error.message);
    }
  };

  const handleDownloadPDF = async (invoice: Invoice) => {
    // Fetch line items
    const { data: items } = await supabase
      .from('invoice_line_items')
      .select('*')
      .eq('invoice_id', invoice.id);

    const doc = new jsPDF();
    
    // Header
    doc.setFontSize(20);
    doc.text('DKU ADVENTURE', 105, 20, { align: 'center' });
    doc.setFontSize(12);
    doc.text('INVOICE', 105, 30, { align: 'center' });
    
    // Invoice Info
    doc.setFontSize(10);
    doc.text(`Invoice Number: ${invoice.invoice_number}`, 20, 45);
    doc.text(`Date: ${new Date(invoice.created_at).toLocaleDateString()}`, 20, 52);
    doc.text(`Period: ${new Date(invoice.start_date).toLocaleDateString()} - ${new Date(invoice.end_date).toLocaleDateString()}`, 20, 59);
    doc.text(`Status: ${invoice.status}`, 20, 66);
    
    // Resort Info
    doc.text(`Bill To:`, 20, 80);
    doc.text(`${invoice.resort?.name || '-'}`, 20, 87);
    if (invoice.resort?.contact_name) doc.text(`Contact: ${invoice.resort.contact_name}`, 20, 94);
    if (invoice.resort?.contact_email) doc.text(`Email: ${invoice.resort.contact_email}`, 20, 101);
    
    // Line Items Table
    const tableData = items?.map(item => [
      item.asset_category.replace('_', ' '),
      `Rp ${Number(item.revenue).toLocaleString('id-ID')}`,
      `${item.dku_percentage}%`,
      `Rp ${Number(item.dku_amount).toLocaleString('id-ID')}`,
      `${item.resort_percentage}%`,
      `Rp ${Number(item.resort_amount).toLocaleString('id-ID')}`,
    ]) || [];

    autoTable(doc, {
      startY: 115,
      head: [['Asset Category', 'Revenue', 'DKU %', 'DKU Amount', 'Resort %', 'Resort Amount']],
      body: tableData,
      foot: [[
        'TOTAL',
        `Rp ${Number(invoice.total_revenue).toLocaleString('id-ID')}`,
        '',
        `Rp ${Number(invoice.dku_share).toLocaleString('id-ID')}`,
        '',
        `Rp ${Number(invoice.resort_share).toLocaleString('id-ID')}`,
      ]],
      theme: 'grid',
    });

    doc.save(`${invoice.invoice_number}.pdf`);
  };

  const getStatusColor = (status: InvoiceStatus) => {
    switch (status) {
      case 'DRAFT': return 'bg-gray-100 text-gray-800';
      case 'SENT': return 'bg-blue-100 text-blue-800';
      case 'PAID': return 'bg-green-100 text-green-800';
    }
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto p-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Invoice Management</h1>
          {canCreate && (
            <button
              onClick={() => setShowModal(true)}
              className="px-6 py-3 bg-gradient-to-br from-indigo-500 to-indigo-600 text-white rounded-xl shadow-neumorphic hover:shadow-neumorphic-hover transition-all"
            >
              + Generate Invoice
            </button>
          )}
        </div>

        {!canCreate && (
          <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              You don't have permission to generate invoices. Only ADMIN and MANAGER can create.
            </p>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-indigo-600"></div>
          </div>
        ) : (
          <div className="space-y-4">
            {invoices.map((invoice) => (
              <div
                key={invoice.id}
                className="bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl p-6 shadow-neumorphic hover:shadow-neumorphic-hover transition-all"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-bold text-gray-800">{invoice.invoice_number}</h3>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(invoice.status)}`}>
                        {invoice.status}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600">
                      <div>
                        <span className="font-medium">Resort:</span> {invoice.resort?.name || '-'}
                      </div>
                      <div>
                        <span className="font-medium">Period:</span>{' '}
                        {new Date(invoice.start_date).toLocaleDateString()} - {new Date(invoice.end_date).toLocaleDateString()}
                      </div>
                      <div>
                        <span className="font-medium">Total Revenue:</span> Rp {invoice.total_revenue.toLocaleString('id-ID')}
                      </div>
                      <div>
                        <span className="font-medium">Resort Share:</span> Rp {invoice.resort_share.toLocaleString('id-ID')}
                      </div>
                    </div>
                  </div>
                  
                  <div className="ml-4 flex flex-wrap gap-2">
                    <button
                      onClick={() => handleViewInvoice(invoice)}
                      className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
                    >
                      View
                    </button>
                    <button
                      onClick={() => handleDownloadPDF(invoice)}
                      className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm"
                    >
                      PDF
                    </button>
                    {canCreate && invoice.status === 'DRAFT' && (
                      <>
                        <button
                          onClick={() => handleEditInvoice(invoice)}
                          className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition-colors text-sm"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleUpdateStatus(invoice.id, 'SENT')}
                          className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors text-sm"
                        >
                          Send
                        </button>
                      </>
                    )}
                    {canCreate && invoice.status === 'SENT' && (
                      <button
                        onClick={() => handleUpdateStatus(invoice.id, 'PAID')}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                      >
                        Mark Paid
                      </button>
                    )}
                    {canDelete && (
                      <button
                        onClick={() => handleDeleteInvoice(invoice.id)}
                        className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Generate Invoice Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Generate Invoice</h2>
              <form onSubmit={handleGenerateInvoice} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Resort *
                  </label>
                  <select
                    required
                    value={formData.resort_id}
                    onChange={(e) => setFormData({ ...formData, resort_id: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="">Select Resort</option>
                    {resorts.map((resort) => (
                      <option key={resort.id} value={resort.id}>
                        {resort.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
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
                    className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    Generate
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Invoice Modal */}
        {showEditModal && selectedInvoice && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Edit Invoice</h2>
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-800">
                  Invoice Number: <span className="font-semibold">{selectedInvoice.invoice_number}</span>
                </p>
              </div>
              <form onSubmit={handleUpdateInvoice} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Resort *
                  </label>
                  <select
                    required
                    value={formData.resort_id}
                    onChange={(e) => setFormData({ ...formData, resort_id: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  >
                    <option value="">Select Resort</option>
                    {resorts.map((resort) => (
                      <option key={resort.id} value={resort.id}>
                        {resort.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <p className="text-xs text-yellow-800">
                    Note: Updating the invoice will recalculate all line items based on the new period and current profit sharing configuration.
                  </p>
                </div>
                <div className="flex gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditModal(false);
                      setSelectedInvoice(null);
                      setFormData({ resort_id: '', start_date: '', end_date: '' });
                    }}
                    className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    Update
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* View Invoice Modal */}
        {selectedInvoice && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
            <div className="bg-white rounded-2xl p-8 max-w-4xl w-full mx-4 my-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Invoice Details</h2>
              
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <p className="text-sm text-gray-600">Invoice Number</p>
                  <p className="font-semibold">{selectedInvoice.invoice_number}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Status</p>
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedInvoice.status)}`}>
                    {selectedInvoice.status}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Resort</p>
                  <p className="font-semibold">{selectedInvoice.resort?.name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Period</p>
                  <p className="font-semibold">
                    {new Date(selectedInvoice.start_date).toLocaleDateString()} - {new Date(selectedInvoice.end_date).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto mb-6">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-4 py-2 text-left">Asset Category</th>
                      <th className="px-4 py-2 text-right">Revenue</th>
                      <th className="px-4 py-2 text-right">DKU %</th>
                      <th className="px-4 py-2 text-right">DKU Amount</th>
                      <th className="px-4 py-2 text-right">Resort %</th>
                      <th className="px-4 py-2 text-right">Resort Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lineItems.map((item) => (
                      <tr key={item.id} className="border-b">
                        <td className="px-4 py-2">{item.asset_category.replace('_', ' ')}</td>
                        <td className="px-4 py-2 text-right">Rp {Number(item.revenue).toLocaleString('id-ID')}</td>
                        <td className="px-4 py-2 text-right">{item.dku_percentage}%</td>
                        <td className="px-4 py-2 text-right">Rp {Number(item.dku_amount).toLocaleString('id-ID')}</td>
                        <td className="px-4 py-2 text-right">{item.resort_percentage}%</td>
                        <td className="px-4 py-2 text-right">Rp {Number(item.resort_amount).toLocaleString('id-ID')}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-100 font-bold">
                    <tr>
                      <td className="px-4 py-2">TOTAL</td>
                      <td className="px-4 py-2 text-right">Rp {Number(selectedInvoice.total_revenue).toLocaleString('id-ID')}</td>
                      <td className="px-4 py-2"></td>
                      <td className="px-4 py-2 text-right">Rp {Number(selectedInvoice.dku_share).toLocaleString('id-ID')}</td>
                      <td className="px-4 py-2"></td>
                      <td className="px-4 py-2 text-right">Rp {Number(selectedInvoice.resort_share).toLocaleString('id-ID')}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <button
                onClick={() => setSelectedInvoice(null)}
                className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
