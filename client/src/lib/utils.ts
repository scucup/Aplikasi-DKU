/**
 * Utility functions for the application
 * Centralized common functions to avoid duplication
 */

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
