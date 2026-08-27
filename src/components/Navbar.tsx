import React, { useState, useEffect } from 'react';
import { 
  Bot, 
  LayoutDashboard, 
  Sparkles, 
  User, 
  ShieldCheck, 
  LogOut, 
  LogIn, 
  Briefcase,
  Building2,
  ChevronDown,
  Bell,
  Globe
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Business, AppNotification } from '../types';
import { getBusinessById, getNotifications, subscribeToTenantRegistry } from '../lib/dbService';
import { TenantSelectModal } from './TenantSelectModal';

interface NavbarProps {
  currentView: string;
  onNavigate: (view: string) => void;
  onOpenAuth: () => void;
  onOpenDemoWidget: () => void;
  onOpenTenantSelect?: () => void;
  onOpenCopilot?: () => void;
  onOpenNotifications?: () => void;
  unreadNotificationsCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onNavigate,
  onOpenAuth,
  onOpenDemoWidget,
  onOpenTenantSelect,
  onOpenCopilot,
  onOpenNotifications,
  unreadNotificationsCount = 0
}) => {
  const { currentUser, activeBusinessId, logout, switchRoleForDemo } = useAuth();
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [showTenantModal, setShowTenantModal] = useState(false);
  const [activeBusiness, setActiveBusiness] = useState<Business | null>(null);

  useEffect(() => {
    let isMounted = true;
    const loadActiveBiz = async () => {
      if (activeBusinessId) {
        const biz = await getBusinessById(activeBusinessId);
        if (isMounted) setActiveBusiness(biz);
      }
    };
    loadActiveBiz();
    const unsubscribe = subscribeToTenantRegistry(() => {
      loadActiveBiz();
    });
    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [activeBusinessId]);

  const handleSelectBusinessFromModal = (selectedBiz: Business) => {
    switchRoleForDemo(
      'BUSINESS_ADMIN', 
      selectedBiz.id, 
      `${selectedBiz.name} Admin`, 
      selectedBiz.supportEmail || `admin@${selectedBiz.id}.com`
    );
    setShowTenantModal(false);
    onNavigate('dashboard');
  };

  const isPlatformAdmin = currentUser?.role === 'PLATFORM_ADMIN';

  return (
    <>
      <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80 text-white px-4 sm:px-8 py-3 transition-all">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          {/* Brand Logo */}
          <div 
            onClick={() => onNavigate('landing')}
            className="flex items-center gap-3 cursor-pointer group"
          >
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20 group-hover:scale-105 transition-transform">
              <Bot className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-white via-slate-100 to-blue-200 bg-clip-text text-transparent">
                  AI RevenueOS
                </span>
              </div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block -mt-0.5">
                ONE AI SYSTEM FOR EVERY CUSTOMER INTERACTION
              </span>
            </div>
          </div>

          {/* Center Nav Links - Bento Pill Bar */}
          <nav className="hidden lg:flex items-center gap-1.5 bg-slate-900/90 p-1.5 rounded-2xl border border-slate-800/90 shadow-inner">
            <button
              onClick={() => onNavigate('landing')}
              className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
                currentView === 'landing' 
                  ? 'bg-blue-600 text-white shadow-md' 
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => onNavigate('pricing')}
              className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                currentView === 'pricing' 
                  ? 'bg-blue-600 text-white shadow-md' 
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              <span>Plans & Pricing</span>
            </button>
            <button
              onClick={() => onNavigate('dashboard')}
              className={`px-4 py-2 text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
                currentView === 'dashboard' 
                  ? 'bg-blue-600 text-white shadow-md' 
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>SaaS Console</span>
            </button>
            <button
              onClick={onOpenDemoWidget}
              className="px-4 py-2 text-xs font-semibold text-emerald-400 hover:text-emerald-300 hover:bg-slate-800/60 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
              <span>Test AI Receptionist</span>
            </button>
          </nav>

          {/* Right Action Bar */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* AI Copilot Quick Launcher Button */}
            {onOpenCopilot && (
              <button
                onClick={onOpenCopilot}
                className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-600/20 to-purple-600/20 hover:from-blue-600/30 hover:to-purple-600/30 text-blue-300 border border-blue-500/30 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
              >
                <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                <span className="hidden sm:inline">AI Copilot</span>
              </button>
            )}

            {/* Notification Bell */}
            {onOpenNotifications && (
              <button
                onClick={onOpenNotifications}
                className="relative p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-all cursor-pointer"
                title="Notifications"
              >
                <Bell className="w-4 h-4" />
                {unreadNotificationsCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center animate-pulse">
                    {unreadNotificationsCount}
                  </span>
                )}
              </button>
            )}

            {/* Scope / Role Switcher Menu */}
            <div className="relative">
              <button
                onClick={() => setShowRoleMenu(!showRoleMenu)}
                className={`px-3 py-1.5 text-xs font-medium rounded-xl border flex items-center gap-2 transition-all cursor-pointer ${
                  isPlatformAdmin
                    ? 'bg-purple-950/60 hover:bg-purple-900/60 text-purple-200 border-purple-800/80 shadow-xs'
                    : 'bg-slate-800 hover:bg-slate-700 text-blue-300 border-slate-700 shadow-xs'
                }`}
                title="Change Admin Scope"
              >
                {isPlatformAdmin ? (
                  <Briefcase className="w-3.5 h-3.5 text-purple-400" />
                ) : (
                  <Building2 className="w-3.5 h-3.5 text-blue-400" />
                )}
                
                <div className="flex items-center gap-1 text-left">
                  <span className="font-bold text-white">
                    {isPlatformAdmin ? 'Platform Admin' : 'Business Admin'}
                  </span>
                  {!isPlatformAdmin && activeBusiness?.name && (
                    <span className="hidden sm:inline text-slate-300 text-[11px] font-normal truncate max-w-[110px]">
                      • {activeBusiness.name}
                    </span>
                  )}
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-0.5" />
              </button>

              {showRoleMenu && (
                <div 
                  className="absolute right-0 mt-2 w-72 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-2 z-50 text-xs animate-fadeIn"
                  onClick={e => e.stopPropagation()}
                >
                  <div className="px-2.5 py-1.5 text-[10px] font-bold text-slate-400 uppercase border-b border-slate-800 mb-1.5">
                    Select Admin Scope
                  </div>
                  
                  {/* Option 1: Platform Admin */}
                  <button
                    onClick={() => {
                      switchRoleForDemo('PLATFORM_ADMIN');
                      setShowRoleMenu(false);
                      onNavigate('dashboard');
                    }}
                    className={`w-full text-left px-3 py-2.5 rounded-xl flex items-center gap-3 transition-all cursor-pointer ${
                      isPlatformAdmin 
                        ? 'bg-purple-600/20 text-purple-200 border border-purple-500/30' 
                        : 'hover:bg-slate-800 text-slate-200'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0">
                      <Briefcase className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-slate-100 flex items-center gap-1.5">
                        <span>Platform Admin</span>
                        {isPlatformAdmin && (
                          <span className="text-[9px] bg-purple-500/30 text-purple-300 px-1.5 py-0.2 rounded-full font-medium">Active</span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400">SaaS Owner • All Workspaces</div>
                    </div>
                  </button>

                  <div className="my-1 border-t border-slate-800/80" />

                  {/* Option 2: Business Admin */}
                  <button
                    onClick={() => {
                      setShowRoleMenu(false);
                      if (onOpenTenantSelect) {
                        onOpenTenantSelect();
                      } else {
                        setShowTenantModal(true);
                      }
                    }}
                    className={`w-full text-left px-3 py-2.5 rounded-xl flex items-center gap-3 transition-all cursor-pointer ${
                      !isPlatformAdmin 
                        ? 'bg-blue-600/20 text-blue-200 border border-blue-500/30' 
                        : 'hover:bg-slate-800 text-slate-200'
                    }`}
                  >
                    <div className="w-8 h-8 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
                      <Building2 className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-slate-100 flex items-center gap-1.5">
                        <span>Business Admin</span>
                        {!isPlatformAdmin && (
                          <span className="text-[9px] bg-blue-500/30 text-blue-300 px-1.5 py-0.2 rounded-full font-medium">Active</span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {!isPlatformAdmin && activeBusiness?.name ? `Tenant: ${activeBusiness.name}` : 'Select Business...'}
                      </div>
                    </div>
                  </button>
                </div>
              )}
            </div>

            {currentUser ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onNavigate('dashboard')}
                  className="hidden sm:flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-xs px-3 py-1.5 rounded-lg border border-slate-700 text-slate-200 cursor-pointer"
                >
                  <User className="w-3.5 h-3.5 text-blue-400" />
                  <span className="max-w-[120px] truncate">{currentUser.displayName}</span>
                </button>
                <button
                  onClick={() => logout()}
                  title="Log out"
                  className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={onOpenAuth}
                className="bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs px-4 py-2 rounded-lg shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign In / Register</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Tenant Selection Modal */}
      <TenantSelectModal
        isOpen={showTenantModal}
        onClose={() => setShowTenantModal(false)}
        onSelectBusiness={handleSelectBusinessFromModal}
        currentBusinessId={activeBusinessId}
        isPlatformAdmin={isPlatformAdmin}
      />
    </>
  );
};


