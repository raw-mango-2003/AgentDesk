import { CurrencyCode, CountryCode } from '../types';

export interface CurrencyConfig {
  code: CurrencyCode;
  name: string;
  symbol: string;
  flag: string;
  label: string;
  locale: string;
  decimalDigits: number;
  position: 'prefix' | 'suffix';
  exchangeRateToUSD: number; // 1 USD = X in this currency
  countryCode: CountryCode;
  countryName: string;
}

export const BASE_CURRENCY: CurrencyCode = 'USD';

/**
 * EXACTLY THREE SUPPORTED CURRENCIES: USD ($), INR (₹), GBP (£)
 */
export const SUPPORTED_CURRENCIES: Record<CurrencyCode, CurrencyConfig> = {
  USD: {
    code: 'USD',
    name: 'US Dollar',
    symbol: '$',
    flag: '🇺🇸',
    label: 'USD — US Dollar ($)',
    locale: 'en-US',
    decimalDigits: 2,
    position: 'prefix',
    exchangeRateToUSD: 1.0,
    countryCode: 'US',
    countryName: 'United States'
  },
  INR: {
    code: 'INR',
    name: 'Indian Rupee',
    symbol: '₹',
    flag: '🇮🇳',
    label: 'INR — Indian Rupee (₹)',
    locale: 'en-IN',
    decimalDigits: 2,
    position: 'prefix',
    exchangeRateToUSD: 86.5,
    countryCode: 'IN',
    countryName: 'India'
  },
  GBP: {
    code: 'GBP',
    name: 'British Pound',
    symbol: '£',
    flag: '🇬🇧',
    label: 'GBP — British Pound (£)',
    locale: 'en-GB',
    decimalDigits: 2,
    position: 'prefix',
    exchangeRateToUSD: 0.79,
    countryCode: 'GB',
    countryName: 'United Kingdom'
  }
};

/**
 * ExchangeRateProvider Architecture
 */
export interface ExchangeRateProvider {
  getExchangeRate(from: CurrencyCode, to: CurrencyCode): number;
  convert(amount: number, from: CurrencyCode, to: CurrencyCode): number;
  isLive(): boolean;
  getRatesFromUSD(): Record<CurrencyCode, number>;
}

/**
 * DemoExchangeRateProvider
 * Default provider for Demo/Production using configurable baseline exchange rates
 */
export class DemoExchangeRateProvider implements ExchangeRateProvider {
  private ratesFromUSD: Record<CurrencyCode, number>;

  constructor(customRates?: Partial<Record<CurrencyCode, number>>) {
    const saved = typeof window !== 'undefined' ? localStorage.getItem('ai_rev_exchange_rates') : null;
    let initialRates: Record<CurrencyCode, number> = {
      USD: 1.0,
      INR: 86.5,
      GBP: 0.79
    };
    if (saved) {
      try {
        initialRates = { ...initialRates, ...JSON.parse(saved) };
      } catch (e) {
        // ignore parse error
      }
    }
    if (customRates) {
      initialRates = { ...initialRates, ...customRates };
    }
    this.ratesFromUSD = initialRates;
  }

  isLive(): boolean {
    return false; // Explicitly indicates configurable demo/static rates
  }

  getRatesFromUSD(): Record<CurrencyCode, number> {
    return { ...this.ratesFromUSD };
  }

  setRate(currency: CurrencyCode, rateToUSD: number): void {
    this.ratesFromUSD[currency] = rateToUSD;
    if (typeof window !== 'undefined') {
      localStorage.setItem('ai_rev_exchange_rates', JSON.stringify(this.ratesFromUSD));
    }
  }

  getExchangeRate(from: CurrencyCode, to: CurrencyCode): number {
    if (from === to) return 1.0;
    const rateFromUSD = this.ratesFromUSD[from] || 1.0;
    const rateToUSD = this.ratesFromUSD[to] || 1.0;
    // (1 / rateFromUSD) * rateToUSD
    return (1 / rateFromUSD) * rateToUSD;
  }

  convert(amount: number, from: CurrencyCode, to: CurrencyCode): number {
    if (from === to) return amount;
    const rate = this.getExchangeRate(from, to);
    const converted = amount * rate;
    const targetConfig = getCurrencyConfig(to);
    if (targetConfig.decimalDigits === 0) {
      return Math.round(converted);
    }
    return Math.round(converted * 100) / 100;
  }
}

// Singleton provider instance
let activeExchangeRateProvider: ExchangeRateProvider = new DemoExchangeRateProvider();

export function getExchangeRateProvider(): ExchangeRateProvider {
  return activeExchangeRateProvider;
}

export function setExchangeRateProvider(provider: ExchangeRateProvider): void {
  activeExchangeRateProvider = provider;
}

/**
 * Direct lookup for currency config with safe fallback to USD
 */
export function getCurrencyConfig(code?: string): CurrencyConfig {
  if (!code) return SUPPORTED_CURRENCIES.USD;
  const upper = code.toUpperCase() as CurrencyCode;
  return SUPPORTED_CURRENCIES[upper] || SUPPORTED_CURRENCIES.USD;
}

/**
 * Formats a monetary amount using standard Intl.NumberFormat
 * Examples:
 * USD: $14,997.00
 * INR: ₹14,997.00
 * GBP: £14,997.00
 */
export function formatCurrencyAmount(
  amount: number,
  currencyCode: CurrencyCode = 'USD',
  localeOverride?: string,
  options?: { maximumFractionDigits?: number; minimumFractionDigits?: number; compact?: boolean }
): string {
  const config = getCurrencyConfig(currencyCode);
  const locale = localeOverride || config.locale || 'en-US';

  try {
    const maxFractionDigits = options?.maximumFractionDigits !== undefined 
      ? options.maximumFractionDigits 
      : config.decimalDigits;
      
    const minFractionDigits = options?.minimumFractionDigits !== undefined
      ? options.minimumFractionDigits
      : (amount % 1 !== 0 ? Math.min(2, maxFractionDigits) : 0);

    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: config.code,
      maximumFractionDigits: maxFractionDigits,
      minimumFractionDigits: minFractionDigits,
      notation: options?.compact ? 'compact' : 'standard'
    }).format(amount);
  } catch (err) {
    const formattedNum = (Math.round(amount * 100) / 100).toLocaleString(locale);
    return `${config.symbol}${formattedNum}`;
  }
}

/**
 * Converts a base USD amount to target currency amount using the active ExchangeRateProvider
 */
export function convertFromUSD(amountUSD: number, targetCurrency: CurrencyCode): number {
  return getExchangeRateProvider().convert(amountUSD, 'USD', targetCurrency);
}

/**
 * Convenience helper to format converted USD base amount into target currency
 */
export function formatConvertedUSD(
  amountUSD: number,
  targetCurrency: CurrencyCode,
  options?: { maximumFractionDigits?: number; minimumFractionDigits?: number; compact?: boolean }
): string {
  const converted = convertFromUSD(amountUSD, targetCurrency);
  return formatCurrencyAmount(converted, targetCurrency, undefined, options);
}

/**
 * Search currencies by query among the 3 supported currencies
 */
export function searchCurrencies(query: string): CurrencyConfig[] {
  const trimmed = query.trim().toLowerCase();
  const all: CurrencyConfig[] = [
    SUPPORTED_CURRENCIES.USD,
    SUPPORTED_CURRENCIES.INR,
    SUPPORTED_CURRENCIES.GBP
  ];
  if (!trimmed) return all;

  return all.filter(c => 
    c.code.toLowerCase().includes(trimmed) ||
    c.name.toLowerCase().includes(trimmed) ||
    c.countryName.toLowerCase().includes(trimmed) ||
    c.symbol.toLowerCase().includes(trimmed) ||
    c.countryCode.toLowerCase().includes(trimmed)
  );
}
