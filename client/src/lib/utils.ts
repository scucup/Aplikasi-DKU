/**
 * Utility functions for the application
 * Centralized common functions to avoid duplication
 */

import { supabase } from './supabase';

/**
 * Format currency to Indonesian Rupiah
 */
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount);
};

/**
 * Format date to Indonesian locale
 */
export const formatDate = (dateString: string, options?: Intl.DateTimeFormatOptions): string => {
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    ...options
  };
  
  return new Date(dateString).toLocaleDateString('id-ID', defaultOptions);
};

/**
 * Format date to long format (e.g., "1 Januari 2025")
 */
export const formatDateLong = (dateString: string): string => {
  return formatDate(dateString, {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

/**
 * Parse date manually to avoid timezone issues
 * Use this for dates from database
 */
export const parseDate = (dateString: string): Date => {
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(year, month - 1, day);
};

/**
 * Get month-year label (e.g., "Jan 2025")
 */
export const getMonthYearLabel = (date: Date): string => {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[date.getMonth()]} ${date.getFullYear()}`;
};

/**
 * Generate unique invoice number with format: INV-YYYYMM-XXXX
 * Centralized to avoid duplication between Invoices and CustomInvoiceModal
 */
export const generateInvoiceNumber = async (): Promise<string> => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const prefix = `INV-${year}${month}-`;
  
  const { data, error } = await supabase
    .from('invoices')
    .select('invoice_number')
    .like('invoice_number', `${prefix}%`)
    .order('invoice_number', { ascending: false })
    .limit(1);
  
  let nextNumber = 1;
  if (!error && data && data.length > 0) {
    const lastNumber = data[0].invoice_number;
    const lastSeq = parseInt(lastNumber.split('-')[2], 10);
    if (!isNaN(lastSeq)) {
      nextNumber = lastSeq + 1;
    }
  }
  
  return `${prefix}${String(nextNumber).padStart(4, '0')}`;
};

/**
 * Format date to YYYY-MM-DD string
 */
export const formatDateToString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Handle Supabase errors consistently
 */
export const handleSupabaseError = (error: any, context: string): void => {
  console.error(`Error in ${context}:`, error);
  throw new Error(`${context}: ${error.message || 'Unknown error'}`);
};

/**
 * Generate UUID (for client-side ID generation)
 */
export const generateUUID = (): string => {
  return crypto.randomUUID();
};

/**
 * Truncate text with ellipsis
 */
export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
};

/**
 * Calculate percentage
 */
export const calculatePercentage = (value: number, total: number): number => {
  if (total === 0) return 0;
  return (value / total) * 100;
};

/**
 * Format percentage
 */
export const formatPercentage = (value: number, decimals: number = 2): string => {
  return `${value.toFixed(decimals)}%`;
};

/**
 * Fetch all records from a Supabase table with pagination
 * Bypasses the 1000 record limit by fetching in pages
 * 
 * @param query - A Supabase query builder (already has .from().select() applied)
 * @param pageSize - Number of records per page (default 1000)
 * @returns All records from the query
 */
export const fetchAllPaginated = async <T = any>(
  query: any,
  pageSize: number = 1000
): Promise<T[]> => {
  let allRecords: T[] = [];
  let from = 0;
  let hasMore = true;

  while (hasMore) {
    const { data, error } = await query.range(from, from + pageSize - 1);

    if (error) {
      console.error('Error in paginated fetch:', error);
      throw error;
    }

    if (data && data.length > 0) {
      allRecords = [...allRecords, ...data];
      from += pageSize;
      hasMore = data.length === pageSize;
    } else {
      hasMore = false;
    }
  }

  return allRecords;
};
