/**
 * Profit Sharing Utility
 * 
 * Centralized logic for calculating profit sharing across revenue records.
 * Handles special cases like Montigo Resort ATV with date-based configurations.
 */

export interface ProfitConfig {
  id: string;
  resort_id: string;
  asset_category: string;
  dku_percentage: number;
  resort_percentage: number;
  effective_from: string;
}

export interface RevenueRecord {
  id?: string;
  resort_id: string;
  asset_category: string;
  date: string;
  amount: number;
  discount: number;
  tax_service: number;
  [key: string]: any;
}

export interface ProcessedRecord extends RevenueRecord {
  netAmount: number;
  dku_share: number;
  dku_percentage: number;
  hasConfig: boolean;
}

/**
 * Parse date string as UTC to avoid timezone issues
 */
function parseDateUTC(dateString: string): Date {
  const dateParts = dateString.split('-');
  return new Date(Date.UTC(
    parseInt(dateParts[0]),
    parseInt(dateParts[1]) - 1,
    parseInt(dateParts[2])
  ));
}

/**
 * Find the appropriate profit sharing config for a record
 * Handles special case for Montigo Resort ATV with multiple date-based configs
 */
function findProfitConfig(
  record: RevenueRecord,
  profitConfigs: ProfitConfig[]
): ProfitConfig | undefined {
  // Find all matching configs for this resort and category
  const matchingConfigs = profitConfigs.filter(
    c => c.resort_id === record.resort_id && c.asset_category === record.asset_category
  );

  if (matchingConfigs.length === 0) {
    return undefined;
  }

  // Special handling for Montigo Resort ATV (multiple configs based on date)
  const MONTIGO_RESORT_ID = '39767466-e78c-4205-af74-9dba9660336c';
  if (record.resort_id === MONTIGO_RESORT_ID && record.asset_category === 'ATV') {
    const recordDate = parseDateUTC(record.date);

    // Find the most recent config that is effective for this record's date
    const validConfigs = matchingConfigs.filter(c => {
      const effectiveDate = parseDateUTC(c.effective_from);
      return effectiveDate <= recordDate;
    });

    // Sort by effective_from descending and return the most recent
    return validConfigs.sort((a, b) => {
      const dateA = parseDateUTC(a.effective_from);
      const dateB = parseDateUTC(b.effective_from);
      return dateB.getTime() - dateA.getTime();
    })[0];
  }

  // For all other resorts/categories, use simple find (single config)
  return matchingConfigs[0];
}

/**
 * Process revenue records with profit sharing calculations
 * 
 * @param records - Array of revenue records to process
 * @param profitConfigs - Array of profit sharing configurations
 * @returns Array of processed records with profit sharing data
 */
export function processRevenueWithProfitSharing(
  records: RevenueRecord[],
  profitConfigs: ProfitConfig[]
): ProcessedRecord[] {
  return records.map(record => {
    try {
      const config = findProfitConfig(record, profitConfigs);

      // Safe number conversion with fallback to 0
      const amount = Number(record.amount) || 0;
      const discount = Number(record.discount) || 0;
      const taxService = Number(record.tax_service) || 0;

      // Calculate net amount
      const netAmount = amount - discount - taxService;

      // Calculate DKU share
      const dkuPercentage = Number(config?.dku_percentage) || 0;
      const dkuShare = (netAmount * dkuPercentage) / 100;

      return {
        ...record,
        netAmount: isNaN(netAmount) ? 0 : netAmount,
        dku_share: isNaN(dkuShare) ? 0 : dkuShare,
        dku_percentage: dkuPercentage,
        hasConfig: !!config
      };
    } catch (error) {
      console.error('Error processing record:', record.id, error);
      // Return record with default values if processing fails
      return {
        ...record,
        netAmount: Number(record.amount) || 0,
        dku_share: 0,
        dku_percentage: 0,
        hasConfig: false
      };
    }
  });
}

/**
 * Fetch all revenue records with pagination
 * Bypasses Supabase 1000 record limit
 */
export async function fetchAllRevenueRecords(supabase: any): Promise<any[]> {
  let allRecords: any[] = [];
  let from = 0;
  const pageSize = 1000;
  let hasMore = true;

  while (hasMore) {
    const { data: pageData, error: pageError } = await supabase
      .from('revenue_records')
      .select('*, resort:resorts(name)')
      .order('date', { ascending: false })
      .order('id', { ascending: true })
      .range(from, from + pageSize - 1);

    if (pageError) {
      console.error('Error fetching revenue data:', pageError);
      throw pageError;
    }

    if (pageData && pageData.length > 0) {
      allRecords = [...allRecords, ...pageData];
      from += pageSize;
      hasMore = pageData.length === pageSize;
    } else {
      hasMore = false;
    }
  }

  return allRecords;
}

/**
 * Fetch profit sharing configs
 * Only fetches required columns for efficiency
 */
export async function fetchProfitConfigs(supabase: any): Promise<ProfitConfig[]> {
  const { data, error } = await supabase
    .from('profit_sharing_configs')
    .select('id, resort_id, asset_category, dku_percentage, resort_percentage, effective_from');

  if (error) {
    console.error('Error fetching profit configs:', error);
    throw error;
  }

  return data || [];
}

/**
 * Calculate total DKU share from processed records
 */
export function calculateTotalDkuShare(records: ProcessedRecord[]): number {
  return records.reduce((sum, record) => sum + (record.dku_share || 0), 0);
}

/**
 * Calculate total resort share from processed records
 */
export function calculateTotalResortShare(records: ProcessedRecord[]): number {
  return records.reduce((sum, record) => {
    const netAmount = record.netAmount || 0;
    const dkuShare = record.dku_share || 0;
    return sum + (netAmount - dkuShare);
  }, 0);
}

/**
 * Group records by resort
 */
export function groupRecordsByResort(records: ProcessedRecord[]): Map<string, ProcessedRecord[]> {
  const grouped = new Map<string, ProcessedRecord[]>();
  
  records.forEach(record => {
    const resortId = record.resort_id;
    if (!grouped.has(resortId)) {
      grouped.set(resortId, []);
    }
    grouped.get(resortId)!.push(record);
  });
  
  return grouped;
}

/**
 * Group records by asset category
 */
export function groupRecordsByCategory(records: ProcessedRecord[]): Map<string, ProcessedRecord[]> {
  const grouped = new Map<string, ProcessedRecord[]>();
  
  records.forEach(record => {
    const category = record.asset_category;
    if (!grouped.has(category)) {
      grouped.set(category, []);
    }
    grouped.get(category)!.push(record);
  });
  
  return grouped;
}

/**
 * Filter records by date range
 */
export function filterRecordsByDateRange(
  records: ProcessedRecord[],
  startDate: string,
  endDate: string
): ProcessedRecord[] {
  const start = parseDateUTC(startDate);
  const end = parseDateUTC(endDate);
  
  return records.filter(record => {
    const recordDate = parseDateUTC(record.date);
    return recordDate >= start && recordDate <= end;
  });
}

/**
 * Get records without profit sharing config
 */
export function getRecordsWithoutConfig(records: ProcessedRecord[]): ProcessedRecord[] {
  return records.filter(record => !record.hasConfig);
}

/**
 * Calculate summary statistics for records
 */
export function calculateSummaryStats(records: ProcessedRecord[]) {
  const totalRevenue = records.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
  const totalDiscount = records.reduce((sum, r) => sum + (Number(r.discount) || 0), 0);
  const totalTaxService = records.reduce((sum, r) => sum + (Number(r.tax_service) || 0), 0);
  const totalNetAmount = records.reduce((sum, r) => sum + (r.netAmount || 0), 0);
  const totalDkuShare = calculateTotalDkuShare(records);
  const totalResortShare = calculateTotalResortShare(records);
  const recordsWithoutConfig = getRecordsWithoutConfig(records).length;
  
  return {
    totalRevenue,
    totalDiscount,
    totalTaxService,
    totalNetAmount,
    totalDkuShare,
    totalResortShare,
    recordCount: records.length,
    recordsWithoutConfig,
    averageDkuPercentage: records.length > 0 
      ? records.reduce((sum, r) => sum + (r.dku_percentage || 0), 0) / records.length 
      : 0,
  };
}
