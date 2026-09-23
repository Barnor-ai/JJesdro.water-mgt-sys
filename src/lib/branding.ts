import { useERPStore } from '../store/useStore';
import { getCurrencyByCode } from './currency';

export interface CompanyDocumentBranding {
  companyName: string;
  tradingName?: string;
  logoUrl?: string;
  address: string;
  city?: string;
  phone: string;
  email: string;
  taxId: string;
  country: string;
  currency: string;
  currencySymbol: string;
  plantName: string;
  fiscalYearEnd?: string;
}

/**
 * Safely sanitizes plant or branch names to prevent displaying "undefined",
 * "undefined Main Plant", or empty strings.
 */
export function sanitizePlantName(rawName?: any): string {
  if (!rawName || typeof rawName !== 'string') {
    return 'Main Plant';
  }
  const trimmed = rawName.trim();
  if (
    trimmed === '' ||
    trimmed.toLowerCase() === 'undefined' ||
    trimmed.toLowerCase() === 'null' ||
    trimmed.toLowerCase().includes('undefined') ||
    trimmed === '[object Object]'
  ) {
    return 'Main Plant';
  }
  return trimmed;
}

/**
 * Retrieves the organization's verified branding information to serve as the
 * SINGLE SOURCE OF TRUTH for all generated invoices, receipts, POs, and reports.
 * Falls back gracefully to professional placeholders rather than "undefined" or "null".
 */
export function getCompanyDocumentBranding(): CompanyDocumentBranding {
  try {
    const storeObj = useERPStore as any;
    const state = typeof storeObj.getState === 'function' ? storeObj.getState() : null;
    let org = state?.currentOrganization;

    // Fallback to localStorage if state is not directly available
    if (!org) {
      try {
        const rawOrg =
          localStorage.getItem('h2o_erp_v2_current_org') ||
          localStorage.getItem('h2o_erp_v2_current_organization') ||
          localStorage.getItem('h2o_erp_v2_organizations');
        if (rawOrg) {
          const parsed = JSON.parse(rawOrg);
          org = Array.isArray(parsed) ? parsed[0] : parsed;
        }
      } catch {}
    }

    // Check active branch/plant
    let plantName = 'Main Plant';
    const branches = state?.branches || [];
    if (branches && branches.length > 0) {
      const activeBranch = branches.find((b: any) => b.is_main) || branches[0];
      if (activeBranch && activeBranch.name) {
        plantName = sanitizePlantName(activeBranch.name);
      }
    }

    const companyName = org?.name?.trim() || 'Company Name';
    const currency = org?.currency || 'GHS';
    const currencyObj = getCurrencyByCode(currency);

    return {
      companyName,
      tradingName: org?.trading_name?.trim() || undefined,
      logoUrl: org?.logo_url || undefined,
      address: org?.address?.trim() || 'Factory Physical Address Not Set',
      city: org?.city?.trim() || undefined,
      phone: org?.phone?.trim() || '+233 (0) 000 000 000',
      email: org?.email?.trim() || 'operations@company.com',
      taxId: org?.tax_id?.trim() || 'TIN-NOT-CONFIGURED',
      country: org?.country?.trim() || 'Ghana',
      currency,
      currencySymbol: currencyObj?.symbol || currency,
      plantName,
      fiscalYearEnd: org?.fiscal_year_end || '12-31',
    };
  } catch (error) {
    console.warn('Error retrieving company document branding:', error);
    return {
      companyName: 'Company Name',
      address: 'Industrial Springs Park',
      phone: '+233 (0) 000 000 000',
      email: 'operations@company.com',
      taxId: 'TIN-PENDING',
      country: 'Ghana',
      currency: 'GHS',
      currencySymbol: 'GH₵',
      plantName: 'Main Plant',
    };
  }
}

/**
 * Formats a clean safe filename using the client's company name.
 * Example: "Beljack_Ltd_Sales_Invoice_INV-0012"
 */
export function getCompanyExportFileName(prefix: string, identifier?: string): string {
  const branding = getCompanyDocumentBranding();
  const safeCompany = (branding.companyName || 'Company')
    .replace(/[^a-zA-Z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
  const safePrefix = prefix.replace(/[^a-zA-Z0-9]/g, '_');
  const dateStr = new Date().toISOString().slice(0, 10);

  if (identifier) {
    const safeId = identifier.replace(/[^a-zA-Z0-9_-]/g, '');
    return `${safeCompany}_${safePrefix}_${safeId}_${dateStr}`;
  }
  return `${safeCompany}_${safePrefix}_${dateStr}`;
}
