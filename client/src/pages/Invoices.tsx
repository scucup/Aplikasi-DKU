import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout';
import { generateInvoicePDF } from '../components/InvoicePDF';

type InvoiceStatus = 'DRAFT' | 'SENT' | 'PAID';
type AssetCategory = 'ATV' | 'UTV' | 'SEA_SPORT' | 'POOL_TOYS' | 'LINE_SPORT';

interface Resort {
  id: string;
  name: string;
  legal_company_name?: string;
  company_address?: string;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
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
  bank_account_id?: string;
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
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showBankModal, setShowBankModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  const canCreate = profile?.role === 'ADMIN' || profile?.role === 'MANAGER';
  const canDelete = profile?.role === 'MANAGER';
  
  const [formData, setFormData] = useState({
    resort_id: '',
    start_date: '',
    end_date: '',
    bank_account_id: '',
  });

  const [bankFormData, setBankFormData] = useState({
    bank_name: '',
    account_number: '',
    account_holder_name: '',
    swift_code: '',
    npwp: '',
    is_default: false,
  });

  useEffect(() => {
    fetchInvoices();
    fetchResorts();
    fetchBankAccounts();
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

  const fetchBankAccounts = async () => {
    try {
      const { data, error } = await supabase
        .from('bank_accounts')
        .select('*')
        .order('is_default', { ascending: false });

      if (error) throw error;
      setBankAccounts(data || []);
      
      // Set default bank account in form
      const defaultBank = data?.find(b => b.is_default);
      if (defaultBank) {
        setFormData(prev => ({ ...prev, bank_account_id: defaultBank.id }));
      }
    } catch (error) {
      console.error('Error fetching bank accounts:', error);
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
        bank_account_id: formData.bank_account_id,
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
      setFormData({ resort_id: '', start_date: '', end_date: '', bank_account_id: formData.bank_account_id });
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
      bank_account_id: invoice.bank_account_id || '',
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
          bank_account_id: formData.bank_account_id,
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
      setFormData({ resort_id: '', start_date: '', end_date: '', bank_account_id: '' });
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
    try {
      // Fetch line items
      const { data: items } = await supabase
        .from('invoice_line_items')
        .select('*')
        .eq('invoice_id', invoice.id);

      // Fetch bank account
      const { data: bankData } = await supabase
        .from('bank_accounts')
        .select('*')
        .eq('id', invoice.bank_account_id || '')
        .single();

      if (!bankData) {
        alert('Bank account not found for this invoice');
        return;
      }

      // Fetch company logo URL
      const { data: logoData } = await supabase
        .from('company_settings')
        .select('setting_value')
        .eq('setting_key', 'company_logo_url')
        .single();

      const logoUrl = logoData?.setting_value || '';

      const doc = await generateInvoicePDF(invoice, items || [], bankData, logoUrl);
      doc.save(`${invoice.invoice_number}.pdf`);
    } catch (error: any) {
      alert('Error generating PDF: ' + error.message);
    }
  };

  const getStatusColor = (status: InvoiceStatus) => {
    switch (status) {
      case 'DRAFT': return 'bg-gray-100 text-gray-800';
      case 'SENT': return 'bg-blue-100 text-blue-800';
      case 'PAID': return 'bg-green-100 text-green-800';
    }
  };

  const handleAddBankAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { error } = await supabase.from('bank_accounts').insert([{
        id: crypto.randomUUID(),
        ...bankFormData,
      }]);

      if (error) throw error;

      setBankFormData({
        bank_name: '',
        account_number: '',
        account_holder_name: '',
        swift_code: '',
        npwp: '',
        is_default: false,
      });
      fetchBankAccounts();
      alert('Bank account added successfully!');
    } catch (error: any) {
      alert('Error adding bank account: ' + error.message);
    }
  };

  const handleDeleteBankAccount = async (bankId: string) => {
    if (!confirm('Are you sure you want to delete this bank account?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('bank_accounts')
        .delete()
        .eq('id', bankId);

      if (error) throw error;

      fetchBankAccounts();
      alert('Bank account deleted successfully!');
    } catch (error: any) {
      alert('Error deleting bank account: ' + error.message);
    }
  };

  const handleSetDefaultBank = async (bankId: string) => {
    try {
      // Unset all defaults
      await supabase
        .from('bank_accounts')
        .update({ is_default: false })
        .neq('id', '00000000-0000-0000-0000-000000000000');

      // Set new default
      const { error } = await supabase
        .from('bank_accounts')
        .update({ is_default: true })
        .eq('id', bankId);

      if (error) throw error;

      fetchBankAccounts();
    } catch (error: any) {
      alert('Error setting default bank: ' + error.message);
    }
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto p-8">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-white">Invoice Management</h1>
          <div className="flex gap-3">
            {canCreate && (
              <>
                <button
                  onClick={() => setShowBankModal(true)}
                  className="px-6 py-3 bg-gradient-to-br from-blue-600 to-cyan-600 text-white rounded-xl shadow-lg hover:shadow-xl transition-all"
                >
                  🏦 Bank Accounts
                </button>
                <button
                  onClick={() => setShowModal(true)}
                  className="px-6 py-3 bg-gradient-to-br from-purple-600 to-pink-600 text-white rounded-xl shadow-lg hover:shadow-xl transition-all"
                >
                  + Generate Invoice
                </button>
              </>
            )}
          </div>
        </div>

        {!canCreate && (
          <div className="mb-4 p-4 bg-yellow-900/30 border border-yellow-500/30 rounded-lg backdrop-blur-sm">
            <p className="text-sm text-yellow-200">
              You don't have permission to generate invoices. Only ADMIN and MANAGER can create.
            </p>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-purple-500/30 border-t-neon-purple"></div>
          </div>
        ) : (
          <div className="bg-purple-900/20 backdrop-blur-sm rounded-2xl p-6 border border-purple-500/20">
            {/* Search and Date Filter */}
            <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative md:col-span-1">
                <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/50 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search by invoice number or resort..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-purple-800/50 border border-purple-500/30 rounded-lg text-white placeholder-white/50 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              <div>
                <input
                  type="date"
                  placeholder="Start Date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-4 py-2 bg-purple-800/50 border border-purple-500/30 rounded-lg text-white placeholder-white/50 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              <div>
                <input
                  type="date"
                  placeholder="End Date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-4 py-2 bg-purple-800/50 border border-purple-500/30 rounded-lg text-white placeholder-white/50 focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-purple-500/20">
                    <th className="text-left py-3 px-4 text-white/90 font-semibold">Invoice #</th>
                    <th className="text-left py-3 px-4 text-white/90 font-semibold">Resort</th>
                    <th className="text-left py-3 px-4 text-white/90 font-semibold">Period</th>
                    <th className="text-right py-3 px-4 text-white/90 font-semibold">Total Revenue</th>
                    <th className="text-right py-3 px-4 text-white/90 font-semibold">DKU Share</th>
                    <th className="text-center py-3 px-4 text-white/90 font-semibold">Status</th>
                    <th className="text-center py-3 px-4 text-white/90 font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices
                    .filter((invoice) => {
                      const invoiceNumber = invoice.invoice_number || '';
                      const resortName = invoice.resort?.name || '';
                      const status = invoice.status || '';
                      const search = searchTerm.toLowerCase();
                      const matchesSearch = invoiceNumber.toLowerCase().includes(search) ||
                                          resortName.toLowerCase().includes(search) ||
                                          status.toLowerCase().includes(search);
                      
                      // Date filtering
                      let matchesDate = true;
                      if (startDate || endDate) {
                        const invoiceDate = new Date(invoice.start_date);
                        if (startDate) {
                          matchesDate = matchesDate && invoiceDate >= new Date(startDate);
                        }
                        if (endDate) {
                          matchesDate = matchesDate && invoiceDate <= new Date(endDate);
                        }
                      }
                      
                      return matchesSearch && matchesDate;
                    })
                    .map((invoice) => (
                    <tr key={invoice.id} className="border-b border-purple-500/10 hover:bg-purple-500/10 transition-colors">
                      <td className="py-3 px-4 text-white font-medium">{invoice.invoice_number}</td>
                      <td className="py-3 px-4 text-white/70">{invoice.resort?.name || '-'}</td>
                      <td className="py-3 px-4 text-white/70 text-sm">
                        {new Date(invoice.start_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} - {new Date(invoice.end_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </td>
                      <td className="py-3 px-4 text-right text-white font-bold">
                        Rp {invoice.total_revenue.toLocaleString('id-ID')}
                      </td>
                      <td className="py-3 px-4 text-right text-white font-bold">
                        Rp {invoice.dku_share.toLocaleString('id-ID')}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(invoice.status)}`}>
                          {invoice.status}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex justify-center gap-1">
                          <button
                            onClick={() => handleViewInvoice(invoice)}
                            className="px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors text-xs"
                            title="View"
                          >
                            👁️
                          </button>
                          <button
                            onClick={() => handleDownloadPDF(invoice)}
                            className="px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition-colors text-xs"
                            title="Download PDF"
                          >
                            📄
                          </button>
                          {canCreate && invoice.status === 'DRAFT' && (
                            <>
                              <button
                                onClick={() => handleEditInvoice(invoice)}
                                className="px-2 py-1 bg-yellow-600 text-white rounded hover:bg-yellow-700 transition-colors text-xs"
                                title="Edit"
                              >
                                ✏️
                              </button>
                              <button
                                onClick={() => handleUpdateStatus(invoice.id, 'SENT')}
                                className="px-2 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700 transition-colors text-xs"
                                title="Send"
                              >
                                📧
                              </button>
                            </>
                          )}
                          {canCreate && invoice.status === 'SENT' && (
                            <button
                              onClick={() => handleUpdateStatus(invoice.id, 'PAID')}
                              className="px-2 py-1 bg-green-700 text-white rounded hover:bg-green-800 transition-colors text-xs"
                              title="Mark Paid"
                              >
                              ✓
                            </button>
                          )}
                          {canDelete && (
                            <button
                              onClick={() => handleDeleteInvoice(invoice.id)}
                              className="px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-xs"
                              title="Delete"
                            >
                              🗑️
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {invoices.filter((invoice) => {
                    const invoiceNumber = invoice.invoice_number || '';
                    const resortName = invoice.resort?.name || '';
                    const status = invoice.status || '';
                    const search = searchTerm.toLowerCase();
                    const matchesSearch = invoiceNumber.toLowerCase().includes(search) ||
                                        resortName.toLowerCase().includes(search) ||
                                        status.toLowerCase().includes(search);
                    
                    let matchesDate = true;
                    if (startDate || endDate) {
                      const invoiceDate = new Date(invoice.start_date);
                      if (startDate) {
                        matchesDate = matchesDate && invoiceDate >= new Date(startDate);
                      }
                      if (endDate) {
                        matchesDate = matchesDate && invoiceDate <= new Date(endDate);
                      }
                    }
                    
                    return matchesSearch && matchesDate;
                  }).length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-white/50">
                        {searchTerm || startDate || endDate ? 'No invoices match your filters' : 'No invoices available'}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
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
                      setFormData({ resort_id: '', start_date: '', end_date: '', bank_account_id: '' });
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

        {/* Bank Account Management Modal */}
        {showBankModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
            <div className="bg-white rounded-2xl p-8 max-w-4xl w-full mx-4 my-8">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Bank Account Management</h2>
              
              {/* Add Bank Account Form */}
              <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-700 mb-4">Add New Bank Account</h3>
                <form onSubmit={handleAddBankAccount} className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Bank Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={bankFormData.bank_name}
                      onChange={(e) => setBankFormData({ ...bankFormData, bank_name: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="e.g., MANDIRI"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Account Number *
                    </label>
                    <input
                      type="text"
                      required
                      value={bankFormData.account_number}
                      onChange={(e) => setBankFormData({ ...bankFormData, account_number: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="e.g., 109-00-1770364 (IDR)"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Account Holder Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={bankFormData.account_holder_name}
                      onChange={(e) => setBankFormData({ ...bankFormData, account_holder_name: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="e.g., CV. DANISH KARYA UTAMA"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Swift Code
                    </label>
                    <input
                      type="text"
                      value={bankFormData.swift_code}
                      onChange={(e) => setBankFormData({ ...bankFormData, swift_code: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="e.g., BMRIIDJA"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      NPWP
                    </label>
                    <input
                      type="text"
                      value={bankFormData.npwp}
                      onChange={(e) => setBankFormData({ ...bankFormData, npwp: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      placeholder="e.g., 91.719.463.1-213.000"
                    />
                  </div>
                  <div className="flex items-center">
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={bankFormData.is_default}
                        onChange={(e) => setBankFormData({ ...bankFormData, is_default: e.target.checked })}
                        className="mr-2 w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                      />
                      <span className="text-sm font-medium text-gray-700">Set as Default</span>
                    </label>
                  </div>
                  <div className="col-span-2">
                    <button
                      type="submit"
                      className="w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                      Add Bank Account
                    </button>
                  </div>
                </form>
              </div>

              {/* Bank Accounts List */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-700 mb-4">Existing Bank Accounts</h3>
                <div className="space-y-3">
                  {bankAccounts.map((bank) => (
                    <div key={bank.id} className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-semibold text-gray-800">{bank.bank_name}</h4>
                            {bank.is_default && (
                              <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                                Default
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600">Account: {bank.account_number}</p>
                          <p className="text-sm text-gray-600">Holder: {bank.account_holder_name}</p>
                          {bank.swift_code && (
                            <p className="text-sm text-gray-600">Swift: {bank.swift_code}</p>
                          )}
                          {bank.npwp && (
                            <p className="text-sm text-gray-600">NPWP: {bank.npwp}</p>
                          )}
                        </div>
                        <div className="flex gap-2">
                          {!bank.is_default && (
                            <button
                              onClick={() => handleSetDefaultBank(bank.id)}
                              className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                              title="Set as Default"
                            >
                              Set Default
                            </button>
                          )}
                          <button
                            onClick={() => handleDeleteBankAccount(bank.id)}
                            className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
                            title="Delete"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {bankAccounts.length === 0 && (
                    <p className="text-center text-gray-500 py-4">No bank accounts available</p>
                  )}
                </div>
              </div>

              <button
                onClick={() => setShowBankModal(false)}
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
