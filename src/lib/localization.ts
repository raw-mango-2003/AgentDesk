import { CountryCode, CurrencyCode, LocalizationConfig, Business } from '../types';
import { getCurrencyConfig, formatCurrencyAmount } from './currency';

export interface CountryMetadata {
  code: CountryCode;
  name: string;
  flag: string;
  defaultCurrency: CurrencyCode;
  defaultTimezone: string;
  defaultLocale: string;
  phonePrefix: string;
  primaryChannel: 'SMS' | 'WhatsApp';
  languages: string[];
  dateFormat: string;
}

/**
 * Supported Business Markets for this version:
 * 1. United States (Default Global Market)
 * 2. India
 * 3. United Kingdom
 */
export const GLOBAL_COUNTRIES: Record<string, CountryMetadata> = {
  US: {
    code: 'US',
    name: 'United States',
    flag: '🇺🇸',
    defaultCurrency: 'USD',
    defaultTimezone: 'America/New_York',
    defaultLocale: 'en-US',
    phonePrefix: '+1',
    primaryChannel: 'SMS',
    languages: ['English', 'Spanish'],
    dateFormat: 'MM/DD/YYYY'
  },
  IN: {
    code: 'IN',
    name: 'India',
    flag: '🇮🇳',
    defaultCurrency: 'INR',
    defaultTimezone: 'Asia/Kolkata',
    defaultLocale: 'en-IN',
    phonePrefix: '+91',
    primaryChannel: 'WhatsApp',
    languages: ['English', 'Hindi'],
    dateFormat: 'DD/MM/YYYY'
  },
  GB: {
    code: 'GB',
    name: 'United Kingdom',
    flag: '🇬🇧',
    defaultCurrency: 'GBP',
    defaultTimezone: 'Europe/London',
    defaultLocale: 'en-GB',
    phonePrefix: '+44',
    primaryChannel: 'SMS',
    languages: ['English'],
    dateFormat: 'DD/MM/YYYY'
  }
};

export const LOCALIZATION_PRESETS: Record<string, LocalizationConfig> = {
  US: {
    country: 'US',
    currency: 'USD',
    timezone: 'America/New_York',
    locale: 'en-US',
    phonePrefix: '+1',
    dateFormat: 'MM/DD/YYYY',
    primaryChannel: 'SMS',
    languages: ['English', 'Spanish']
  },
  IN: {
    country: 'IN',
    currency: 'INR',
    timezone: 'Asia/Kolkata',
    locale: 'en-IN',
    phonePrefix: '+91',
    dateFormat: 'DD/MM/YYYY',
    primaryChannel: 'WhatsApp',
    languages: ['English', 'Hindi']
  },
  GB: {
    country: 'GB',
    currency: 'GBP',
    timezone: 'Europe/London',
    locale: 'en-GB',
    phonePrefix: '+44',
    dateFormat: 'DD/MM/YYYY',
    primaryChannel: 'SMS',
    languages: ['English']
  }
};

export function getCountryMetadata(country?: CountryCode): CountryMetadata {
  if (!country) return GLOBAL_COUNTRIES.US;
  const upper = country.toUpperCase();
  return GLOBAL_COUNTRIES[upper] || GLOBAL_COUNTRIES.US;
}

export function getLocalization(country?: CountryCode, business?: Partial<Business>): LocalizationConfig {
  const meta = getCountryMetadata(country || business?.country || 'US');
  return {
    country: (business?.country || meta.code) as CountryCode,
    currency: (business?.currency || meta.defaultCurrency) as CurrencyCode,
    timezone: business?.timezone || meta.defaultTimezone,
    locale: business?.locale || meta.defaultLocale,
    phonePrefix: business?.phoneCountryCode || meta.phonePrefix,
    dateFormat: business?.dateFormat || meta.dateFormat,
    primaryChannel: business?.primaryChannel || meta.primaryChannel,
    languages: meta.languages
  };
}

/**
 * Formats a currency amount with respect to the business's currency or passed currency
 */
export function formatCurrency(
  amount: number, 
  currency?: CurrencyCode, 
  countryOrLocale?: CountryCode | string
): string {
  const currCode = currency || (countryOrLocale === 'IN' ? 'INR' : countryOrLocale === 'GB' ? 'GBP' : 'USD');
  let locale: string | undefined = undefined;

  if (countryOrLocale) {
    if (countryOrLocale.length === 2 && GLOBAL_COUNTRIES[countryOrLocale.toUpperCase()]) {
      locale = GLOBAL_COUNTRIES[countryOrLocale.toUpperCase()].defaultLocale;
    } else if (countryOrLocale.includes('-')) {
      locale = countryOrLocale;
    }
  }

  return formatCurrencyAmount(amount, currCode, locale);
}

export function formatPhoneNumber(phone: string, country: CountryCode = 'US'): string {
  if (!phone) return '';
  const cleaned = phone.replace(/\D/g, '');
  const meta = getCountryMetadata(country);

  if (country === 'IN') {
    if (cleaned.length === 10) {
      return `+91 ${cleaned.slice(0, 5)} ${cleaned.slice(5)}`;
    }
    if (cleaned.startsWith('91') && cleaned.length === 12) {
      return `+91 ${cleaned.slice(2, 7)} ${cleaned.slice(7)}`;
    }
  } else if (country === 'GB') {
    if (cleaned.length === 10) {
      return `+44 ${cleaned.slice(0, 4)} ${cleaned.slice(4)}`;
    }
    if (cleaned.startsWith('44') && cleaned.length === 12) {
      return `+44 ${cleaned.slice(2, 6)} ${cleaned.slice(6)}`;
    }
  } else {
    // Standard US / CA (+1) format
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    if (cleaned.startsWith('1') && cleaned.length === 11) {
      return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
    }
  }
  
  if (cleaned.length > 6 && !phone.startsWith('+')) {
    return `${meta.phonePrefix} ${phone}`;
  }
  return phone;
}

export function formatDateTime(
  isoString: string, 
  timezone?: string, 
  countryOrLocale: CountryCode | string = 'US'
): string {
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return isoString;
    
    let locale = 'en-US';
    let tz = timezone;

    if (countryOrLocale.length === 2 && GLOBAL_COUNTRIES[countryOrLocale.toUpperCase()]) {
      const meta = GLOBAL_COUNTRIES[countryOrLocale.toUpperCase()];
      locale = meta.defaultLocale;
      if (!tz) tz = meta.defaultTimezone;
    } else if (countryOrLocale.includes('-')) {
      locale = countryOrLocale;
    }

    return new Intl.DateTimeFormat(locale, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      timeZone: tz || 'America/New_York'
    }).format(date);
  } catch (e) {
    return isoString;
  }
}

export function formatDateOnly(
  isoString: string, 
  countryOrLocale: CountryCode | string = 'US'
): string {
  try {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return isoString;

    let locale = 'en-US';
    if (countryOrLocale.length === 2 && GLOBAL_COUNTRIES[countryOrLocale.toUpperCase()]) {
      locale = GLOBAL_COUNTRIES[countryOrLocale.toUpperCase()].defaultLocale;
    } else if (countryOrLocale.includes('-')) {
      locale = countryOrLocale;
    }

    return new Intl.DateTimeFormat(locale, {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(date);
  } catch (e) {
    return isoString;
  }
}
