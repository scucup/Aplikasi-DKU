import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import Layout from '../components/Layout';
import { generateInvoicePDF } from '../components/InvoicePDF';
import CustomInvoiceModal from '../components/CustomInvoiceModal';
import { generateInvoiceNumber, generateUUID } from '../lib/utils';

type InvoiceStatus = 'DRAFT' | 'SENT' | 'PAID';
type InvoiceType = 'RENTAL' | 'CUSTOM';
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
  invoice_type: InvoiceType;
  resort_id: string;
  start_date?: string | null;
  end_date?: string | null;
  invoice_date?: string | null;
  customer_name?: string | null;
  customer_address?: string | null;
  customer_phone?: string | null;
  customer_email?: string | null;
  total_revenue: number;
  dku_share: number;
  resort_share: number;
  status: InvoiceStatus;
  generated_by: string;
  created_at: string;
  bank_account_id?: string;
  notes?: string | null;
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
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showBankModal, setShowBankModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedResort, setSelectedResort] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
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

  const [selectedCategories, setSelectedCategories] = useState<AssetCategory[]>([]);
  const [availableCategories, setAvailableCategories] = useState<AssetCategory[]>([]);

  const [bankFormData, setBankFormData] = useState({
    bank_name: '',
    account_number: '',
    account_holder_name: '',
    swift_code: '',
    npwp: '',
    is_default: false,
  });

  useEffect(() => {
    // Fetch all initial data in parallel
    Promise.all([fetchInvoices(), fetchResorts(), fetchBankAccounts()]);
  }, []);

  const fetchResorts = async () => {
    try {
      const { data, error } = await supabase
        .from('resorts')
        .select('id, name, address, company_address, contact_name, contact_email, contact_phone')
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
        .select('id, bank_name, account_number, account_holder_name, swift_code, npwp, is_default')
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

  const fetchAvailableCategories = async (resortId: string, startDate: string, endDate: string) => {
    if (!resortId || !startDate || !endDate) {
      setAvailableCategories([]);
      setSelectedCategories([]);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('revenue_records')
        .select('asset_category')
        .eq('resort_id', resortId)
        .gte('date', startDate)
        .lte('date', endDate);

      if (error) throw error;

      // Get unique categories
      const categories = [...new Set(data?.map(r => r.asset_category as AssetCategory) || [])];
      setAvailableCategories(categories);
      setSelectedCategories(categories); // Select all by default
    } catch (error) {
      console.error('Error fetching available categories:', error);
    }
  };

  const fetchInvoices = async () => {
    try {
      // Fetch invoices, resorts, and users in PARALLEL for faster loading
      const [invoicesResult, resortsResult, usersResult] = await Promise.all([
        supabase
          .from('invoices')
          .select('id, invoice_number, invoice_type, resort_id, start_date, end_date, invoice_date, customer_name, customer_address, customer_phone, customer_email, total_revenue, dku_share, resort_share, status, generated_by, created_at, bank_account_id, notes')
          .order('created_at', { ascending: false }),
        supabase.from('resorts').select('id, name, legal_company_name, company_address, contact_name, contact_email, contact_phone'),
        supabase.from('users').select('id, name'),
      ]);

      if (invoicesResult.error) throw invoicesResult.error;

      const resortMap = new Map(resortsResult.data?.map(r => [r.id, r]) || []);
      const userMap = new Map(usersResult.data?.map(u => [u.id, u.name]) || []);

      const transformedData = invoicesResult.data?.map((invoice: any) => ({
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

  const calculateInvoiceData = async (resortId: string, startDate: string, endDate: string, categories?: AssetCategory[]) => {
    // Fetch revenue records for the period
    let query = supabase
      .from('revenue_records')
      .select('id, resort_id, asset_category, date, amount, discount, tax_service')
      .eq('resort_id', resortId)
      .gte('date', startDate)
      .lte('date', endDate);

    // Filter by selected categories if provided
    if (categories && categories.length > 0) {
      query = query.in('asset_category', categories);
    }

    const { data: revenueData, error: revenueError } = await query;

    if (revenueError) throw revenueError;

    // Fetch profit sharing configs
    const { data: profitConfigs, error: profitError } = await supabase
      .from('profit_sharing_configs')
      .select('id, resort_id, asset_category, dku_percentage, resort_percentage')
      .eq('resort_id', resortId);

    if (profitError) throw profitError;

    // Group revenue by asset category - track both gross revenue and net amount
    const revenueByCategory: { [key: string]: { grossRevenue: number; netAmount: number } } = {};
    revenueData?.forEach((record) => {
      const category = record.asset_category;
      const grossAmount = Number(record.amount) || 0;
      const discount = Number(record.discount) || 0;
      const taxService = Number(record.tax_service) || 0;
      // Net amount = gross revenue - discount - tax & service
      const netAmount = grossAmount - discount - taxService;
      
      if (!revenueByCategory[category]) {
        revenueByCategory[category] = { grossRevenue: 0, netAmount: 0 };
      }
      revenueByCategory[category].grossRevenue += grossAmount;
      revenueByCategory[category].netAmount += netAmount;
    });

    // Calculate line items - profit sharing based on NET AMOUNT (after discount & tax_service)
    const lineItems: any[] = [];
    let totalRevenue = 0;
    let totalDkuShare = 0;
    let totalResortShare = 0;

    Object.entries(revenueByCategory).forEach(([category, { netAmount }]) => {
      const config = profitConfigs?.find(c => c.asset_category === category);
      const dkuPercentage = config?.dku_percentage || 70;
      const resortPercentage = config?.resort_percentage || 30;
      // Profit sharing calculated from NET AMOUNT (not gross revenue)
      const dkuAmount = (netAmount * dkuPercentage) / 100;
      const resortAmount = (netAmount * resortPercentage) / 100;

      lineItems.push({
        asset_category: category,
        revenue: netAmount, // Store net amount as revenue for invoice line item
        dku_percentage: dkuPercentage,
        resort_percentage: resortPercentage,
        dku_amount: dkuAmount,
        resort_amount: resortAmount,
      });

      totalRevenue += netAmount; // Total is sum of net amounts
      totalDkuShare += dkuAmount;
      totalResortShare += resortAmount;
    });

    return { lineItems, totalRevenue, totalDkuShare, totalResortShare };
  };

  const handleGenerateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (selectedCategories.length === 0) {
      alert('Please select at least one asset category');
      return;
    }

    try {
      const { lineItems, totalRevenue, totalDkuShare, totalResortShare } = 
        await calculateInvoiceData(formData.resort_id, formData.start_date, formData.end_date, selectedCategories);

      if (lineItems.length === 0) {
        alert('No revenue data found for the selected period');
        return;
      }

      const invoiceId = generateUUID();
      const invoiceNumber = await generateInvoiceNumber();

      // Create invoice
      const { error: invoiceError } = await supabase.from('invoices').insert([{
        id: invoiceId,
        invoice_number: invoiceNumber,
        invoice_type: 'RENTAL',
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
        id: generateUUID(),
        invoice_id: invoiceId,
        ...item,
      }));

      const { error: lineItemsError } = await supabase
        .from('invoice_line_items')
        .insert(lineItemsInserts);

      if (lineItemsError) throw lineItemsError;

      setShowModal(false);
      setFormData({ resort_id: '', start_date: '', end_date: '', bank_account_id: formData.bank_account_id });
      setSelectedCategories([]);
      setAvailableCategories([]);
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
    
    // Fetch line items based on invoice type
    if (invoice.invoice_type === 'CUSTOM') {
      const { data, error } = await supabase
        .from('custom_invoice_items')
        .select('id, invoice_id, item_name, description, quantity, unit_price, total_price')
        .eq('invoice_id', invoice.id);

      if (error) {
        console.error('Error fetching custom items:', error);
        return;
      }

      setLineItems(data || []);
    } else {
      const { data, error } = await supabase
        .from('invoice_line_items')
        .select('id, invoice_id, asset_category, revenue, dku_percentage, resort_percentage, dku_amount, resort_amount')
        .eq('invoice_id', invoice.id);

      if (error) {
        console.error('Error fetching line items:', error);
        return;
      }

      setLineItems(data || []);
    }
  };

  const handleEditInvoice = async (invoice: Invoice) => {
    setSelectedInvoice(invoice);
    setFormData({
      resort_id: invoice.resort_id,
      start_date: invoice.start_date || '',
      end_date: invoice.end_date || '',
      bank_account_id: invoice.bank_account_id || '',
    });
    
    // Fetch line items
    const { data, error } = await supabase
      .from('invoice_line_items')
      .select('id, invoice_id, asset_category, revenue, dku_percentage, resort_percentage, dku_amount, resort_amount')
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
        id: generateUUID(),
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

  const handleDeleteInvoice = async (invoiceId: string, invoiceType: InvoiceType) => {
    if (!confirm('Are you sure you want to delete this invoice? This action cannot be undone.')) {
      return;
    }

    try {
      // Delete line items first (foreign key constraint)
      if (invoiceType === 'CUSTOM') {
        await supabase
          .from('custom_invoice_items')
          .delete()
          .eq('invoice_id', invoiceId);
      } else {
        await supabase
          .from('invoice_line_items')
          .delete()
          .eq('invoice_id', invoiceId);
      }

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

  const handleViewPDF = async (invoice: Invoice) => {
    try {
      // For CUSTOM invoices, fetch custom items; for RENTAL, fetch line items
      let items: any[] = [];
      
      if (invoice.invoice_type === 'CUSTOM') {
        const { data: customItems } = await supabase
          .from('custom_invoice_items')
          .select('id, invoice_id, item_name, description, quantity, unit_price, total_price')
          .eq('invoice_id', invoice.id);
        items = customItems || [];
      } else {
        const { data: lineItems } = await supabase
          .from('invoice_line_items')
          .select('id, invoice_id, asset_category, revenue, dku_percentage, resort_percentage, dku_amount, resort_amount')
          .eq('invoice_id', invoice.id);
        items = lineItems || [];
      }

      // Fetch company settings (bank account, NPWP, etc) - single source of truth
      const { data: companySettings } = await supabase
        .from('company_settings')
        .select('setting_key, setting_value')
        .in('setting_key', [
          'bank_name',
          'bank_account_name',
          'bank_account_number',
          'bank_swift_code',
          'npwp',
          'company_address',
          'signatory_name',
          'signatory_title',
          'company_logo_url'
        ]);

      if (!companySettings || companySettings.length === 0) {
        alert('Company settings not found. Please configure company settings first.');
        return;
      }

      // Convert array to object for easier access
      const settings: { [key: string]: string } = {};
      companySettings.forEach(setting => {
        settings[setting.setting_key] = setting.setting_value;
      });

      // Prepare bank account data from company settings
      const bankData = {
        bank_name: settings.bank_name || 'MANDIRI',
        account_number: settings.bank_account_number || '',
        account_holder_name: settings.bank_account_name || 'CV. DANISH KARYA UTAMA',
        swift_code: settings.bank_swift_code || '',
        npwp: settings.npwp || '',
      };

      const logoUrl = settings.company_logo_url || '';

      const doc = await generateInvoicePDF(invoice, items || [], bankData, logoUrl);
      
      // Open PDF in new tab instead of downloading
      const pdfBlob = doc.output('blob');
      const pdfUrl = URL.createObjectURL(pdfBlob);
      window.open(pdfUrl, '_blank');
      
      // Clean up the URL after a delay
      setTimeout(() => URL.revokeObjectURL(pdfUrl), 100);
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

  // Filtered invoices based on user filters - used by both summary cards and table
  const filteredInvoices = invoices.filter((invoice) => {
    const invoiceNumber = invoice.invoice_number || '';
    const resortName = invoice.resort?.name || '';
    const search = searchTerm.toLowerCase();
    const matchesSearch = invoiceNumber.toLowerCase().includes(search) ||
                        resortName.toLowerCase().includes(search);
    const matchesResort = selectedResort === 'all' || invoice.resort_id === selectedResort;
    const matchesStatus = selectedStatus === 'all' || invoice.status === selectedStatus;
    let matchesDate = true;
    if (startDate || endDate) {
      const invoiceDate = invoice.start_date 
        ? new Date(invoice.start_date) 
        : invoice.invoice_date 
        ? new Date(invoice.invoice_date)
        : null;
      if (invoiceDate) {
        if (startDate) matchesDate = matchesDate && invoiceDate >= new Date(startDate);
        if (endDate) matchesDate = matchesDate && invoiceDate <= new Date(endDate);
      }
    }
    return matchesSearch && matchesResort && matchesStatus && matchesDate;
  });

  const handleAddBankAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { error } = await supabase.from('bank_accounts').insert([{
        id: generateUUID(),
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
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold text-white">Invoices</h1>
            <p className="text-sm text-slate-400">Manage and track all invoices</p>
          </div>
          <div className="flex gap-2">
            {canCreate && (
              <>
                <button
                  onClick={() => setShowBankModal(true)}
                  className="px-3 py-2 bg-navy-700 border border-navy-600 text-white rounded-lg hover:bg-navy-600 transition-all text-sm font-medium"
                >
                  🏦 Bank
                </button>
                <button
                  onClick={() => setShowModal(true)}
                  className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all text-sm font-medium"
                >
                  + Rental Invoice
                </button>
                <button
                  onClick={() => setShowCustomModal(true)}
                  className="px-3 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-all text-sm font-medium"
                >
                  + Custom Invoice
                </button>
              </>
            )}
          </div>
        </div>

        {!canCreate && (
          <div className="p-3 bg-yellow-900/20 border border-yellow-600/30 rounded-lg">
            <p className="text-xs text-yellow-300">
              You don't have permission to generate invoices. Only ADMIN and MANAGER can create.
            </p>
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-navy-900 rounded-xl p-5 border border-navy-700/50">
            <div className="text-sm text-slate-400 font-medium mb-1 uppercase tracking-wider">Total Invoices</div>
            <div className="text-xl font-bold text-white whitespace-nowrap">
              Rp{'\u00A0'}{filteredInvoices.reduce((sum, inv) => sum + inv.dku_share, 0).toLocaleString('id-ID')}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              {filteredInvoices.length} records
            </div>
          </div>
          <div className="bg-navy-900 rounded-xl p-5 border border-navy-700/50">
            <div className="text-sm text-amber-400 font-medium mb-1 uppercase tracking-wider">Unpaid</div>
            <div className="text-xl font-bold text-white whitespace-nowrap">
              Rp{'\u00A0'}{filteredInvoices.filter(inv => inv.status !== 'PAID').reduce((sum, inv) => sum + inv.dku_share, 0).toLocaleString('id-ID')}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              {filteredInvoices.filter(inv => inv.status !== 'PAID').length} records
            </div>
          </div>
          <div className="bg-navy-900 rounded-xl p-5 border border-navy-700/50">
            <div className="text-sm text-green-400 font-medium mb-1 uppercase tracking-wider">Paid This Month</div>
            <div className="text-xl font-bold text-emerald-400 whitespace-nowrap">
              Rp{'\u00A0'}{filteredInvoices.filter(inv => {
                if (inv.status !== 'PAID') return false;
                const now = new Date();
                const createdAt = new Date(inv.created_at);
                return createdAt.getMonth() === now.getMonth() && createdAt.getFullYear() === now.getFullYear();
              }).reduce((sum, inv) => sum + inv.dku_share, 0).toLocaleString('id-ID')}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              {filteredInvoices.filter(inv => {
                if (inv.status !== 'PAID') return false;
                const now = new Date();
                const createdAt = new Date(inv.created_at);
                return createdAt.getMonth() === now.getMonth() && createdAt.getFullYear() === now.getFullYear();
              }).length} records
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-navy-600 border-t-blue-500"></div>
          </div>
        ) : (
          <div className="bg-navy-900 rounded-xl border border-navy-700/50 overflow-hidden">
            {/* Compact Filters */}
            <div className="p-4 border-b border-navy-700/50">
              <div className="flex flex-wrap gap-3 items-center">
                <div className="relative flex-1 min-w-[200px] max-w-[280px]">
                  <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-500 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Search..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-navy-800 border border-navy-600/50 rounded-lg text-white text-sm placeholder-slate-500 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <select
                  value={selectedResort}
                  onChange={(e) => setSelectedResort(e.target.value)}
                  className="px-3 py-2 bg-navy-800 border border-navy-600/50 rounded-lg text-white text-sm focus:ring-1 focus:ring-blue-500"
                >
                  <option value="all">All Resorts</option>
                  {resorts.map(resort => (
                    <option key={resort.id} value={resort.id}>{resort.name}</option>
                  ))}
                </select>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="px-3 py-2 bg-navy-800 border border-navy-600/50 rounded-lg text-white text-sm focus:ring-1 focus:ring-blue-500"
                >
                  <option value="all">All Status</option>
                  <option value="DRAFT">Draft</option>
                  <option value="SENT">Sent</option>
                  <option value="PAID">Paid</option>
                </select>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="px-3 py-2 bg-navy-800 border border-navy-600/50 rounded-lg text-white text-sm focus:ring-1 focus:ring-blue-500"
                />
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="px-3 py-2 bg-navy-800 border border-navy-600/50 rounded-lg text-white text-sm focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-navy-700/50 bg-navy-800/50">
                    <th className="text-left py-3.5 px-4 text-slate-400 font-medium text-sm uppercase tracking-wider">Invoice #</th>
                    <th className="text-left py-3.5 px-4 text-slate-400 font-medium text-sm uppercase tracking-wider">Customer/Resort</th>
                    <th className="text-left py-3.5 px-4 text-slate-400 font-medium text-sm uppercase tracking-wider">Period</th>
                    <th className="text-right py-3.5 px-4 text-slate-400 font-medium text-sm uppercase tracking-wider whitespace-nowrap">Total Amount</th>
                    <th className="text-right py-3.5 px-4 text-slate-400 font-medium text-sm uppercase tracking-wider whitespace-nowrap">DKU Share</th>
                    <th className="text-center py-3.5 px-4 text-slate-400 font-medium text-sm uppercase tracking-wider">Status</th>
                    <th className="text-center py-3.5 px-4 text-slate-400 font-medium text-sm uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-navy-700/30">
                  {filteredInvoices
                    .map((invoice) => (
                    <tr key={invoice.id} className="hover:bg-navy-800/50 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className="text-white font-medium text-sm">{invoice.invoice_number}</span>
                          {invoice.invoice_type === 'CUSTOM' && (
                            <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-xs rounded font-medium">
                              Custom
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-300 text-sm max-w-[200px] truncate">
                        {invoice.invoice_type === 'CUSTOM' && invoice.customer_name 
                          ? invoice.customer_name 
                          : invoice.resort?.name || '-'}
                      </td>
                      <td className="py-3.5 px-4 text-slate-400 text-sm whitespace-nowrap">
                        {invoice.invoice_type === 'CUSTOM' && invoice.invoice_date
                          ? new Date(invoice.invoice_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
                          : invoice.start_date && invoice.end_date
                          ? `${new Date(invoice.start_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })} - ${new Date(invoice.end_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}`
                          : '-'}
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <span className="text-white font-semibold text-sm">Rp{'\u00A0'}{invoice.total_revenue.toLocaleString('id-ID')}</span>
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <span className="text-white font-semibold text-sm">Rp{'\u00A0'}{invoice.dku_share.toLocaleString('id-ID')}</span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className={`inline-block px-2.5 py-1 rounded text-xs font-semibold uppercase tracking-wide ${getStatusColor(invoice.status)}`}>
                          {invoice.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex justify-center gap-1.5">
                          <button
                            onClick={() => handleViewInvoice(invoice)}
                            className="w-8 h-8 flex items-center justify-center bg-blue-600/20 text-blue-400 rounded-lg hover:bg-blue-600/40 transition-colors"
                            title="View Details"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                          </button>
                          <button
                            onClick={() => handleViewPDF(invoice)}
                            className="w-8 h-8 flex items-center justify-center bg-green-600/20 text-green-400 rounded-lg hover:bg-green-600/40 transition-colors"
                            title="View PDF"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                          </button>
                          {canCreate && invoice.status === 'DRAFT' && invoice.invoice_type === 'RENTAL' && (
                            <button
                              onClick={() => handleEditInvoice(invoice)}
                              className="w-8 h-8 flex items-center justify-center bg-amber-600/20 text-amber-400 rounded-lg hover:bg-amber-600/40 transition-colors"
                              title="Edit"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                            </button>
                          )}
                          {canCreate && invoice.status === 'DRAFT' && (
                            <button
                              onClick={() => handleUpdateStatus(invoice.id, 'SENT')}
                              className="w-8 h-8 flex items-center justify-center bg-indigo-600/20 text-indigo-400 rounded-lg hover:bg-indigo-600/40 transition-colors"
                              title="Mark as Sent"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                            </button>
                          )}
                          {canCreate && invoice.status === 'SENT' && (
                            <button
                              onClick={() => handleUpdateStatus(invoice.id, 'PAID')}
                              className="w-8 h-8 flex items-center justify-center bg-green-600/20 text-green-400 rounded-lg hover:bg-green-600/40 transition-colors"
                              title="Mark as Paid"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                            </button>
                          )}
                          {canDelete && (
                            <button
                              onClick={() => handleDeleteInvoice(invoice.id, invoice.invoice_type)}
                              className="w-8 h-8 flex items-center justify-center bg-red-600/20 text-red-400 rounded-lg hover:bg-red-600/40 transition-colors"
                              title="Delete"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredInvoices.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-500 text-sm">
                        {searchTerm || selectedResort !== 'all' || selectedStatus !== 'all' || startDate || endDate 
                          ? 'No invoices match your filters' 
                          : 'No invoices yet'}
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
            <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
              <h2 className="text-2xl font-bold text-gray-800 mb-6">Generate Invoice</h2>
              <form onSubmit={handleGenerateInvoice} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Resort *
                  </label>
                  <select
                    required
                    value={formData.resort_id}
                    onChange={(e) => {
                      setFormData({ ...formData, resort_id: e.target.value });
                      fetchAvailableCategories(e.target.value, formData.start_date, formData.end_date);
                    }}
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
                    onChange={(e) => {
                      setFormData({ ...formData, start_date: e.target.value });
                      fetchAvailableCategories(formData.resort_id, e.target.value, formData.end_date);
                    }}
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
                    onChange={(e) => {
                      setFormData({ ...formData, end_date: e.target.value });
                      fetchAvailableCategories(formData.resort_id, formData.start_date, e.target.value);
                    }}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
                
                {/* Asset Categories Selection */}
                {availableCategories.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Asset Categories *
                    </label>
                    <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg space-y-2">
                      <div className="flex items-center justify-between mb-2 pb-2 border-b border-gray-200">
                        <span className="text-xs text-gray-500">Select categories to include in this invoice</span>
                        <button
                          type="button"
                          onClick={() => {
                            if (selectedCategories.length === availableCategories.length) {
                              setSelectedCategories([]);
                            } else {
                              setSelectedCategories([...availableCategories]);
                            }
                          }}
                          className="text-xs text-indigo-600 hover:text-indigo-800"
                        >
                          {selectedCategories.length === availableCategories.length ? 'Deselect All' : 'Select All'}
                        </button>
                      </div>
                      {availableCategories.map((category) => (
                        <label key={category} className="flex items-center cursor-pointer hover:bg-gray-100 p-2 rounded">
                          <input
                            type="checkbox"
                            checked={selectedCategories.includes(category)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedCategories([...selectedCategories, category]);
                              } else {
                                setSelectedCategories(selectedCategories.filter(c => c !== category));
                              }
                            }}
                            className="mr-3 w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                          />
                          <span className="text-sm text-gray-700">{category.replace('_', ' ')}</span>
                        </label>
                      ))}
                    </div>
                    {selectedCategories.length === 0 && (
                      <p className="text-xs text-red-500 mt-1">Please select at least one category</p>
                    )}
                  </div>
                )}

                {formData.resort_id && formData.start_date && formData.end_date && availableCategories.length === 0 && (
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-800">No revenue data found for the selected resort and period.</p>
                  </div>
                )}

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

                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-xs text-blue-800">
                    💡 Tip: You can create multiple invoices for the same resort and period by selecting different asset categories for each invoice.
                  </p>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setSelectedCategories([]);
                      setAvailableCategories([]);
                    }}
                    className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={selectedCategories.length === 0}
                    className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed"
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
                  <p className="text-sm text-gray-600">Type</p>
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${
                    selectedInvoice.invoice_type === 'CUSTOM' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                  }`}>
                    {selectedInvoice.invoice_type === 'CUSTOM' ? 'Custom Invoice' : 'Rental Invoice'}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Status</p>
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedInvoice.status)}`}>
                    {selectedInvoice.status}
                  </span>
                </div>
                <div>
                  <p className="text-sm text-gray-600">
                    {selectedInvoice.invoice_type === 'CUSTOM' ? 'Customer' : 'Resort'}
                  </p>
                  <p className="font-semibold">
                    {selectedInvoice.invoice_type === 'CUSTOM' && selectedInvoice.customer_name 
                      ? selectedInvoice.customer_name 
                      : selectedInvoice.resort?.name || '-'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">
                    {selectedInvoice.invoice_type === 'CUSTOM' ? 'Invoice Date' : 'Period'}
                  </p>
                  <p className="font-semibold">
                    {selectedInvoice.invoice_type === 'CUSTOM' && selectedInvoice.invoice_date
                      ? new Date(selectedInvoice.invoice_date).toLocaleDateString('id-ID')
                      : selectedInvoice.start_date && selectedInvoice.end_date
                      ? `${new Date(selectedInvoice.start_date).toLocaleDateString()} - ${new Date(selectedInvoice.end_date).toLocaleDateString()}`
                      : '-'}
                  </p>
                </div>
                {selectedInvoice.invoice_type === 'CUSTOM' && selectedInvoice.customer_address && (
                  <div className="col-span-2">
                    <p className="text-sm text-gray-600">Address</p>
                    <p className="font-semibold">{selectedInvoice.customer_address}</p>
                  </div>
                )}
                {selectedInvoice.notes && (
                  <div className="col-span-2">
                    <p className="text-sm text-gray-600">Notes</p>
                    <p className="font-semibold">{selectedInvoice.notes}</p>
                  </div>
                )}
              </div>

              <div className="overflow-x-auto mb-6">
                {selectedInvoice.invoice_type === 'CUSTOM' ? (
                  // Custom Invoice Items Table - no item name column
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-4 py-2 text-center">No</th>
                        <th className="px-4 py-2 text-left">Description</th>
                        <th className="px-4 py-2 text-right">Qty</th>
                        <th className="px-4 py-2 text-right">Unit Price</th>
                        <th className="px-4 py-2 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lineItems.map((item: any, index: number) => (
                        <tr key={item.id} className="border-b">
                          <td className="px-4 py-2 text-center">{index + 1}</td>
                          <td className="px-4 py-2">{item.description || item.item_name || '-'}</td>
                          <td className="px-4 py-2 text-right">{item.quantity}</td>
                          <td className="px-4 py-2 text-right">Rp {Number(item.unit_price).toLocaleString('id-ID')}</td>
                          <td className="px-4 py-2 text-right">Rp {Number(item.total_price).toLocaleString('id-ID')}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-100 font-bold">
                      <tr>
                        <td colSpan={4} className="px-4 py-2 text-right">TOTAL</td>
                        <td className="px-4 py-2 text-right">Rp {Number(selectedInvoice.total_revenue).toLocaleString('id-ID')}</td>
                      </tr>
                    </tfoot>
                  </table>
                ) : (
                  // Rental Invoice Line Items Table
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
                      {lineItems.map((item: any) => (
                        <tr key={item.id} className="border-b">
                          <td className="px-4 py-2">{item.asset_category?.replace('_', ' ')}</td>
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
                )}
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

        {/* Custom Invoice Modal */}
        {showCustomModal && (
          <CustomInvoiceModal
            resorts={resorts}
            bankAccounts={bankAccounts}
            userId={user?.id || ''}
            onClose={() => setShowCustomModal(false)}
            onSuccess={fetchInvoices}
          />
        )}
      </div>
    </Layout>
  );
}
