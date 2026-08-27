import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Search, 
  X, 
  CheckCircle2, 
  AlertCircle, 
  ChevronRight, 
  Sparkles,
  ShieldCheck,
  Filter,
  ArrowRight,
  Globe
} from 'lucide-react';
import { Business } from '../types';
import { getAllBusinesses, subscribeToTenantRegistry, normalizeTenantId } from '../lib/dbService';
import { getCountryMetadata } from '../lib/localization';
import { getCurrencyConfig } from '../lib/currency';

interface TenantSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectBusiness: (business: Business) => void;
  currentBusinessId?: string;
  isPlatformAdmin?: boolean;
}

export const TenantSelectModal: React.FC<TenantSelectModalProps> = ({
  isOpen,
  onClose,
  onSelectBusiness,
  currentBusinessId,
  isPlatformAdmin = false
}) => {
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'active' | 'all'>('active');

  const loadTenants = async () => {
    setLoading(true);
    try {
      const list = await getAllBusinesses();
      setBusinesses(list);
    } catch (err) {
      console.error('Error loading tenants:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadTenants();
      setSearch('');
    }
  }, [isOpen]);

  useEffect(() => {
    const unsubscribe = subscribeToTenantRegistry(() => {
      loadTenants();
    });
    return () => unsubscribe();
  }, []);

  if (!isOpen) return null;

  // Filter businesses based on search and status
  const filteredBusinesses = businesses.filter(b => {
    const normSearch = search.trim().toLowerCase();
    const matchesSearch = !normSearch || 
      (b.name || '').toLowerCase().includes(normSearch) ||
      (b.industry || '').toLowerCase().includes(normSearch) ||
      (b.id || '').toLowerCase().includes(normSearch) ||
      (b.supportEmail || '').toLowerCase().includes(normSearch);

    const isSuspended = b.status === 'suspended' || b.status === 'inactive';
    const matchesStatus = statusFilter === 'all' ? true : !isSuspended;

    return matchesSearch && matchesStatus;
  });

  const activeCount = businesses.filter(b => b.status !== 'suspended' && b.status !== 'inactive').length;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
      <div 
        className="bg-white border border-slate-200/90 rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl relative overflow-hidden flex flex-col max-h-[88vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
                <span>Select Business</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100">
                  {activeCount} {activeCount === 1 ? 'Active Business' : 'Active Businesses'}
                </span>
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Choose a tenant to enter Business Admin mode
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar & Filter */}
        <div className="pt-4 pb-3 space-y-2">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              autoFocus
              placeholder="Search by business name or industry..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full text-xs pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white text-slate-900 font-medium placeholder-slate-400 transition-all"
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs p-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {isPlatformAdmin && (
            <div className="flex items-center justify-between text-[11px] text-slate-500 px-1">
              <span>Showing:</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setStatusFilter('active')}
                  className={`px-2 py-0.5 rounded-lg transition-colors font-medium ${
                    statusFilter === 'active' ? 'bg-blue-100 text-blue-700' : 'text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  Active Only ({activeCount})
                </button>
                <button
                  type="button"
                  onClick={() => setStatusFilter('all')}
                  className={`px-2 py-0.5 rounded-lg transition-colors font-medium ${
                    statusFilter === 'all' ? 'bg-blue-100 text-blue-700' : 'text-slate-500 hover:bg-slate-100'
                  }`}
                >
                  All Tenants ({businesses.length})
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Tenant List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-1 my-1">
          {loading ? (
            <div className="py-12 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-2">
              <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
              <span>Loading tenant registry...</span>
            </div>
          ) : filteredBusinesses.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs space-y-1">
              <Building2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="font-semibold text-slate-700">No businesses found</p>
              <p className="text-slate-400">
                {search ? `No businesses matching "${search}"` : 'No active businesses registered in system.'}
              </p>
            </div>
          ) : (
            filteredBusinesses.map(b => {
              const isCurrent = normalizeTenantId(b.id) === normalizeTenantId(currentBusinessId);
              const isSuspended = b.status === 'suspended' || b.status === 'inactive';
              const initials = (b.name || b.id).trim().charAt(0).toUpperCase();

              const countryMeta = getCountryMetadata(b.country);
              const currConfig = getCurrencyConfig(b.currency);

              return (
                <button
                  key={b.id}
                  onClick={() => {
                    onSelectBusiness(b);
                    onClose();
                  }}
                  className={`w-full text-left p-3 rounded-2xl border transition-all flex items-center justify-between group cursor-pointer ${
                    isCurrent 
                      ? 'bg-blue-50/70 border-blue-300 shadow-xs' 
                      : 'bg-white hover:bg-slate-50 border-slate-200/80 hover:border-blue-200 shadow-2xs'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div 
                      className="w-10 h-10 rounded-xl text-white font-extrabold text-sm flex items-center justify-center shrink-0 shadow-xs relative"
                      style={{ backgroundColor: b.primaryColor || '#2563eb' }}
                    >
                      {initials}
                      <span className="absolute -bottom-1 -right-1 text-xs">{countryMeta.flag}</span>
                    </div>
                    <div className="min-w-0 text-left">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-900 truncate group-hover:text-blue-600 transition-colors">
                          {b.name}
                        </span>
                        {isCurrent && (
                          <span className="px-1.5 py-0.2 text-[9px] font-bold bg-blue-100 text-blue-700 rounded-md">
                            Selected
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-slate-500 flex-wrap">
                        <span className="truncate">{b.industry || 'Business'}</span>
                        <span>•</span>
                        <span className="font-semibold text-slate-700">{countryMeta.name}</span>
                        <span>•</span>
                        <span className="font-mono text-[10px] text-blue-600 bg-blue-50 px-1 rounded font-bold">{currConfig.code} ({currConfig.symbol})</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <span className={`w-1.5 h-1.5 rounded-full ${isSuspended ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                          <span className={isSuspended ? 'text-amber-600 font-medium' : 'text-emerald-600 font-medium'}>
                            {isSuspended ? 'Suspended' : 'Active'}
                          </span>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    {b.plan && (
                      <span className="hidden sm:inline-block text-[10px] font-semibold uppercase px-2 py-0.5 rounded-lg bg-slate-100 text-slate-600 border border-slate-200">
                        {b.plan}
                      </span>
                    )}
                    <div className="w-7 h-7 rounded-xl bg-slate-100 group-hover:bg-blue-600 group-hover:text-white text-slate-400 flex items-center justify-center transition-colors">
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Modal Footer */}
        <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span className="text-[11px]">
            Showing <strong className="text-slate-800">{filteredBusinesses.length}</strong> of <strong className="text-slate-800">{businesses.length}</strong> tenants
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
