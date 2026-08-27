import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { CurrencyCode } from '../types';
import { 
  SUPPORTED_CURRENCIES, 
  getCurrencyConfig, 
  CurrencyConfig 
} from '../lib/currency';

interface CurrencySelectorProps {
  selectedCurrency: CurrencyCode;
  onSelectCurrency: (currency: CurrencyCode) => void;
  className?: string;
  buttonClassName?: string;
  showLabel?: boolean;
  align?: 'left' | 'right' | 'center';
  compact?: boolean;
}

const ORDERED_CURRENCIES: CurrencyCode[] = ['USD', 'INR', 'GBP'];

export const CurrencySelector: React.FC<CurrencySelectorProps> = ({
  selectedCurrency,
  onSelectCurrency,
  className = '',
  buttonClassName = '',
  showLabel = false,
  align = 'right',
  compact = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const activeConfig = getCurrencyConfig(selectedCurrency);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleSelect = (currCode: CurrencyCode) => {
    onSelectCurrency(currCode);
    if (typeof window !== 'undefined') {
      localStorage.setItem('ai_revenue_os_selected_currency', currCode);
    }
    setIsOpen(false);
  };

  const getDropdownAlignmentClass = () => {
    if (align === 'center') {
      return 'left-1/2 -translate-x-1/2';
    }
    if (align === 'left') {
      return 'left-0';
    }
    return 'right-0';
  };

  return (
    <div className={`relative inline-block text-left max-w-full ${className}`} ref={dropdownRef}>
      {showLabel && (
        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">
          Currency
        </label>
      )}
      
      <button
        type="button"
        id="currency-selector-dropdown-btn"
        onClick={() => setIsOpen(!isOpen)}
        className={`inline-flex items-center justify-between gap-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border shadow-xs cursor-pointer max-w-full ${
          buttonClassName || 'bg-slate-900 text-slate-200 border-slate-700 hover:border-blue-500 hover:bg-slate-800'
        }`}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
      >
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-sm shrink-0">{activeConfig.flag}</span>
          <span className="font-extrabold text-white shrink-0">{activeConfig.code}</span>
          {!compact ? (
            <span className="text-slate-300 font-normal truncate">
              — {activeConfig.name} <span className="text-blue-400 font-mono font-bold">({activeConfig.symbol})</span>
            </span>
          ) : (
            <span className="text-slate-400 font-mono font-medium">({activeConfig.symbol})</span>
          )}
        </div>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform duration-150 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div
          className={`absolute z-50 mt-1.5 w-64 max-w-[calc(100vw-2rem)] rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl backdrop-blur-xl p-1.5 text-slate-200 animate-in fade-in zoom-in-95 duration-100 ${getDropdownAlignmentClass()}`}
          role="listbox"
        >
          <div className="px-2.5 py-1.5 text-[10px] uppercase font-bold text-slate-400 border-b border-slate-800 tracking-wider">
            Select Currency (USD • INR • GBP)
          </div>

          <div className="py-1 space-y-0.5">
            {ORDERED_CURRENCIES.map((code) => {
              const curr = SUPPORTED_CURRENCIES[code];
              const isSelected = selectedCurrency === curr.code;
              return (
                <button
                  key={curr.code}
                  type="button"
                  onClick={() => handleSelect(curr.code)}
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-colors text-left cursor-pointer ${
                    isSelected
                      ? 'bg-blue-600/20 text-blue-300 font-bold border border-blue-500/30'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                  role="option"
                  aria-selected={isSelected}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-base shrink-0">{curr.flag}</span>
                    <div className="min-w-0 truncate">
                      <div className="flex items-center gap-1.5 font-bold">
                        <span className="text-white">{curr.code}</span>
                        <span className="text-slate-400 font-normal">— {curr.name}</span>
                        <span className="text-blue-400 font-mono">({curr.symbol})</span>
                      </div>
                    </div>
                  </div>
                  {isSelected && (
                    <Check className="w-3.5 h-3.5 text-blue-400 shrink-0 ml-2" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
