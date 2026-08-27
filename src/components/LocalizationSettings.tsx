import React, { useState, useEffect } from 'react';
import { 
  Globe, 
  DollarSign, 
  Clock, 
  Phone, 
  MessageSquare, 
  Calendar, 
  Check, 
  Save, 
  Sparkles, 
  AlertCircle,
  Layers,
  ChevronRight,
  Sliders
} from 'lucide-react';
import { Business, CountryCode, CurrencyCode } from '../types';
import { 
  GLOBAL_COUNTRIES, 
  CountryMetadata, 
  getCountryMetadata, 
  formatCurrency, 
  formatPhoneNumber, 
  formatDateTime 
} from '../lib/localization';
import { 
  SUPPORTED_CURRENCIES, 
  CurrencyConfig, 
  getCurrencyConfig 
} from '../lib/currency';
import { updateBusinessSettings } from '../lib/dbService';

interface LocalizationSettingsProps {
  business: Business;
  onUpdateBusiness: (updated: Business) => void;
}

export const LocalizationSettings: React.FC<LocalizationSettingsProps> = ({
  business,
  onUpdateBusiness
}) => {
  const [country, setCountry] = useState<CountryCode>(business.country || 'US');
  const [currency, setCurrency] = useState<CurrencyCode>(business.currency || 'USD');
  const [timezone, setTimezone] = useState<string>(business.timezone || 'America/New_York');
  const [locale, setLocale] = useState<string>(business.locale || 'en-US');
  const [phoneCountryCode, setPhoneCountryCode] = useState<string>(business.phoneCountryCode || '+1');
  const [dateFormat, setDateFormat] = useState<string>(business.dateFormat || 'MM/DD/YYYY');
  const [primaryChannel, setPrimaryChannel] = useState<'SMS' | 'WhatsApp'>(business.primaryChannel || 'SMS');
  const [language, setLanguage] = useState<string>(business.language || 'English');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setCountry(business.country || 'US');
    setCurrency(business.currency || 'USD');
    setTimezone(business.timezone || 'America/New_York');
    setLocale(business.locale || 'en-US');
    setPhoneCountryCode(business.phoneCountryCode || '+1');
    setDateFormat(business.dateFormat || 'MM/DD/YYYY');
    setPrimaryChannel(business.primaryChannel || (business.country === 'IN' || business.country === 'AE' || business.country === 'SA' ? 'WhatsApp' : 'SMS'));
    setLanguage(business.language || 'English');
    setSaved(false);
  }, [business.id, business.country, business.currency, business.timezone]);

  const handleCountryPresetChange = (newCountryCode: CountryCode) => {
    const meta = getCountryMetadata(newCountryCode);
    setCountry(newCountryCode);
    setCurrency(meta.defaultCurrency);
    setTimezone(meta.defaultTimezone);
    setLocale(meta.defaultLocale);
    setPhoneCountryCode(meta.phonePrefix);
    setDateFormat(meta.dateFormat);
    setPrimaryChannel(meta.primaryChannel);
    if (meta.languages && meta.languages.length > 0) {
      setLanguage(meta.languages[0]);
    }
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const updated: Business = {
      ...business,
      country,
      currency,
      timezone,
      locale,
      phoneCountryCode,
      dateFormat,
      primaryChannel,
      language
    };

    await updateBusinessSettings(business.id, updated);
    onUpdateBusiness(updated);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  const countryMeta = getCountryMetadata(country);
  const currConfig = getCurrencyConfig(currency);

  const sampleDate = new Date().toISOString();
  const samplePhone = country === 'IN' 
    ? '9876543210' 
    : country === 'GB' 
    ? '2079460912' 
    : country === 'AE' 
    ? '43218899' 
    : country === 'AU' 
    ? '298765432' 
    : '5128904411';

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-7 text-slate-100 shadow-sm relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 text-xl shadow-inner">
              <Globe className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span>Organization Localization & Currency</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 font-semibold">
                  {countryMeta.flag} {countryMeta.name}
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Configure currency, timezones, telephony formats, and messaging channels for <strong className="text-slate-200">{business.name}</strong>.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => handleSave()}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2 w-fit cursor-pointer"
          >
            {saved ? <Check className="w-4 h-4 text-emerald-300" /> : <Save className="w-4 h-4" />}
            <span>{saved ? 'Settings Saved!' : 'Save Localization'}</span>
          </button>
        </div>
      </div>

      {/* Main Settings Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Form Controls */}
        <div className="lg:col-span-2 space-y-6">
          {/* Quick Preset Selector */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Primary Operating Market / Country
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {Object.values(GLOBAL_COUNTRIES).map(c => {
                const isSelected = country === c.code;
                return (
                  <button
                    key={c.code}
                    type="button"
                    onClick={() => handleCountryPresetChange(c.code)}
                    className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-center gap-2.5 ${
                      isSelected
                        ? 'bg-blue-50 border-blue-500 ring-2 ring-blue-500/20 text-blue-900 font-bold shadow-xs'
                        : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700 font-medium'
                    }`}
                  >
                    <span className="text-2xl">{c.flag}</span>
                    <div className="min-w-0 truncate text-xs">
                      <div className="font-bold text-slate-900">{c.name}</div>
                      <div className="text-[11px] text-slate-500 font-mono mt-0.5">{c.defaultCurrency} ({getCurrencyConfig(c.defaultCurrency).symbol}) • {c.phonePrefix}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Granular Localization Config */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-xs space-y-5">
            <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-blue-600" />
              <span>Financial & Regional Parameters</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Currency Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                  <span>Operating Currency</span>
                  <span className="text-[10px] text-slate-400 font-mono">USD • INR • GBP</span>
                </label>
                <select
                  value={currency}
                  onChange={e => setCurrency(e.target.value as CurrencyCode)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {Object.values(SUPPORTED_CURRENCIES).map(curr => (
                    <option key={curr.code} value={curr.code}>
                      {curr.flag} {curr.code} ({curr.symbol}) — {curr.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Timezone */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>Business Timezone</span>
                </label>
                <input
                  type="text"
                  value={timezone}
                  onChange={e => setTimezone(e.target.value)}
                  placeholder="e.g. America/New_York, Asia/Kolkata, Europe/London"
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Primary Channel */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
                  <span>Primary Inbound/Outbound Channel</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPrimaryChannel('SMS')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      primaryChannel === 'SMS'
                        ? 'bg-blue-50 border-blue-500 text-blue-700'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <span>📱 SMS Text-Back</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPrimaryChannel('WhatsApp')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      primaryChannel === 'WhatsApp'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-700'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <span>💬 WhatsApp</span>
                  </button>
                </div>
              </div>

              {/* Phone Prefix */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span>Phone Country Prefix</span>
                </label>
                <input
                  type="text"
                  value={phoneCountryCode}
                  onChange={e => setPhoneCountryCode(e.target.value)}
                  placeholder="e.g. +1, +44, +91, +971"
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 font-mono font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Date Format */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>Date Display Format</span>
                </label>
                <select
                  value={dateFormat}
                  onChange={e => setDateFormat(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="MM/DD/YYYY">MM/DD/YYYY (United States)</option>
                  <option value="DD/MM/YYYY">DD/MM/YYYY (UK, India, UAE, Australia, Europe)</option>
                  <option value="YYYY-MM-DD">YYYY-MM-DD (ISO 8601 / Canada / Asia)</option>
                  <option value="DD.MM.YYYY">DD.MM.YYYY (Germany / Switzerland)</option>
                </select>
              </div>

              {/* Primary Agent Language */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Primary Conversational Language
                </label>
                <input
                  type="text"
                  value={language}
                  onChange={e => setLanguage(e.target.value)}
                  placeholder="e.g. English, Hindi, Arabic, Spanish"
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Real-Time Verification Preview Card */}
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 text-slate-200 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <Sparkles className="w-4 h-4 text-blue-400" />
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-white">
                Live Regional Preview
              </h4>
            </div>

            {/* Currency Preview */}
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                Financial Display Format
              </span>
              <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 space-y-1 font-mono">
                <div className="text-emerald-400 font-black text-sm">
                  {formatCurrency(14997, currency, country)}
                </div>
                <div className="text-[10px] text-slate-400">
                  Estimate / Deal value: {formatCurrency(2497, currency, country)}
                </div>
              </div>
            </div>

            {/* Telephony Preview */}
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                Phone Number Formatting
              </span>
              <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 font-mono text-xs text-blue-300">
                {formatPhoneNumber(samplePhone, country)}
              </div>
            </div>

            {/* Date & Time Preview */}
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                Calendar & Audit Timestamp
              </span>
              <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 text-xs text-slate-300">
                {formatDateTime(sampleDate, timezone, country)}
              </div>
            </div>

            {/* Multi-Tenant Scope Assurance */}
            <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-400 leading-relaxed">
              <span className="text-blue-400 font-bold">Tenant Isolation:</span> These settings apply exclusively to <strong className="text-white">{business.name}</strong>. Other organizations in AI RevenueOS maintain their independent regional parameters.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
