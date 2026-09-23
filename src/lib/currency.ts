export interface CountryOption {
  code: string;
  name: string;
  defaultCurrency: string;
  currency: string;
  timezone?: string;
}

export interface CurrencyOption {
  code: string;
  name: string;
  symbol: string;
}

export const COUNTRIES: CountryOption[] = [
  { code: 'GH', name: 'Ghana', defaultCurrency: 'GHS', currency: 'GHS', timezone: 'Africa/Accra' },
  { code: 'NG', name: 'Nigeria', defaultCurrency: 'NGN', currency: 'NGN', timezone: 'Africa/Lagos' },
  { code: 'KE', name: 'Kenya', defaultCurrency: 'KES', currency: 'KES', timezone: 'Africa/Nairobi' },
  { code: 'ZA', name: 'South Africa', defaultCurrency: 'ZAR', currency: 'ZAR', timezone: 'Africa/Johannesburg' },
  { code: 'US', name: 'United States', defaultCurrency: 'USD', currency: 'USD', timezone: 'America/New_York' },
  { code: 'GB', name: 'United Kingdom', defaultCurrency: 'GBP', currency: 'GBP', timezone: 'Europe/London' },
  { code: 'CA', name: 'Canada', defaultCurrency: 'CAD', currency: 'CAD', timezone: 'America/Toronto' },
  { code: 'AU', name: 'Australia', defaultCurrency: 'AUD', currency: 'AUD', timezone: 'Australia/Sydney' },
  { code: 'DE', name: 'Germany', defaultCurrency: 'EUR', currency: 'EUR', timezone: 'Europe/Berlin' },
  { code: 'FR', name: 'France', defaultCurrency: 'EUR', currency: 'EUR', timezone: 'Europe/Paris' },
  { code: 'IN', name: 'India', defaultCurrency: 'INR', currency: 'INR', timezone: 'Asia/Kolkata' },
  { code: 'AE', name: 'United Arab Emirates', defaultCurrency: 'AED', currency: 'AED', timezone: 'Asia/Dubai' },
  { code: 'EG', name: 'Egypt', defaultCurrency: 'EGP', currency: 'EGP', timezone: 'Africa/Cairo' },
  { code: 'TZ', name: 'Tanzania', defaultCurrency: 'TZS', currency: 'TZS', timezone: 'Africa/Dar_es_Salaam' },
  { code: 'UG', name: 'Uganda', defaultCurrency: 'UGX', currency: 'UGX', timezone: 'Africa/Kampala' },
  { code: 'RW', name: 'Rwanda', defaultCurrency: 'RWF', currency: 'RWF', timezone: 'Africa/Kigali' },
  { code: 'CI', name: "Côte d'Ivoire", defaultCurrency: 'XOF', currency: 'XOF', timezone: 'Africa/Abidjan' },
  { code: 'SN', name: 'Senegal', defaultCurrency: 'XOF', currency: 'XOF', timezone: 'Africa/Dakar' },
];

export const SUPPORTED_COUNTRIES = COUNTRIES;

export const CURRENCIES: CurrencyOption[] = [
  { code: 'GHS', name: 'Ghana Cedi', symbol: 'GH₵ ' },
  { code: 'USD', name: 'US Dollar', symbol: '$' },
  { code: 'NGN', name: 'Nigerian Naira', symbol: '₦' },
  { code: 'KES', name: 'Kenyan Shilling', symbol: 'KSh ' },
  { code: 'ZAR', name: 'South African Rand', symbol: 'R ' },
  { code: 'GBP', name: 'British Pound', symbol: '£' },
  { code: 'EUR', name: 'Euro', symbol: '€' },
  { code: 'CAD', name: 'Canadian Dollar', symbol: 'CA$ ' },
  { code: 'AUD', name: 'Australian Dollar', symbol: 'A$ ' },
  { code: 'INR', name: 'Indian Rupee', symbol: '₹' },
  { code: 'TZS', name: 'Tanzanian Shilling', symbol: 'TSh ' },
  { code: 'UGX', name: 'Ugandan Shilling', symbol: 'USh ' },
  { code: 'RWF', name: 'Rwandan Franc', symbol: 'RF ' },
  { code: 'XOF', name: 'West African CFA Franc', symbol: 'CFA ' },
  { code: 'AED', name: 'UAE Dirham', symbol: 'AED ' },
];

export function getCurrencySymbol(currencyCode?: string): string {
  if (!currencyCode) return '$';
  const found = CURRENCIES.find((c) => c.code.toUpperCase() === currencyCode.toUpperCase());
  return found ? found.symbol : `${currencyCode} `;
}

export function getCountryByCode(code: string): CountryOption | undefined {
  return COUNTRIES.find((c) => c.code.toUpperCase() === code.toUpperCase());
}

export function getCurrencyByCode(code: string): CurrencyOption | undefined {
  return CURRENCIES.find((c) => c.code.toUpperCase() === code.toUpperCase());
}
