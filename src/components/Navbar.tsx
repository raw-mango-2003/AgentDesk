import React, { useState, useEffect, lazy, Suspense } from 'react';
import { 
  Bot, 
  LogIn, 
  LogOut, 
  User, 
  Sparkles, 
  LayoutDashboard, 
  ChevronDown, 
  Building2, 
  Briefcase, 
  Tag, 
  CreditCard,
  ShieldAlert,
  Bell,
  Check,
  ArrowRight,
  Menu,
  X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Business, AppNotification } from '../types';
const loadDbService = () => import('../lib/dbService');
const TenantSelectModal = lazy(() => import('./TenantSelectModal').then(module => ({ default: module.TenantSelectModal })));

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
  const { currentUser, currentTenant, activeBusinessId, setActiveBusinessId, logout, isPlatformAdmin } = useAuth();
  const [showTenantModal, setShowTenantModal] = useState(false);
  const [activeBusiness, setActiveBusiness] = useState<Business | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;
    let unsubscribe: (() => void) | null = null;

    const loadActiveBiz = async () => {
      if (!activeBusinessId || activeBusinessId === 'platform') {
        if (isMounted) setActiveBusiness(null);
        return;
      }
      const { getBusinessById } = await loadDbService();
      const biz = await getBusinessById(activeBusinessId);
      if (isMounted) setActiveBusiness(biz);
    };

    loadActiveBiz();

    if (!activeBusinessId) {
      return () => {
        isMounted = false;
      };
    }

    loadDbService().then(({ subscribeToTenantRegistry }) => {
      if (!isMounted) return;
      unsubscribe = subscribeToTenantRegistry(() => {
        loadActiveBiz();
      });
    });

    return () => {
      isMounted = false;
      if (unsubscribe) unsubscribe();
    };
  }, [activeBusinessId]);

  const handleSelectBusinessFromModal = (selectedBiz: Business) => {
    setActiveBusinessId(selectedBiz.id);
    setShowTenantModal(false);
    onNavigate('dashboard');
  };

  const handleLogout = () => {
    // Navigate immediately. The AuthContext clears the local session first
    // and revokes the server-side session in the background.
    void logout();
    onNavigate('login');
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 transition-all font-sans">
        <div className="w-full px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo & Platform Name */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0 shrink">
            <button
              onClick={() => onNavigate('landing')}
              className="flex items-center gap-2 sm:gap-2.5 text-left group cursor-pointer min-w-0"
            >
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform shrink-0">
                <Bot className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="min-w-0">
                <span className="font-extrabold text-sm sm:text-base tracking-tight text-white flex items-center gap-1.5 truncate">
                  AgentDesk
                  <span className="hidden xs:inline text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-blue-500/20 text-blue-300 border border-blue-500/30 uppercase tracking-wide">
                    RevenueOS
                  </span>
                </span>
                <span className="text-[10px] text-slate-400 hidden sm:block -mt-0.5 truncate">Autonomous Receptionist & CRM</span>
              </div>
            </button>
          </div>

          {/* Navigation Links (Desktop) */}
          <nav className="hidden lg:flex items-center gap-1">
            <button
              onClick={() => onNavigate('landing')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
                currentView === 'landing'
                  ? 'text-white bg-slate-800'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              Home
            </button>
            <button
              onClick={() => onNavigate('pricing')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-all cursor-pointer ${
                currentView === 'pricing'
                  ? 'text-white bg-slate-800'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              Pricing
            </button>

            {/* If logged in, show Dashboard link */}
            {currentUser && (
              <button
                onClick={() => onNavigate('dashboard')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer ${
                  currentView === 'dashboard'
                    ? 'text-white bg-slate-800'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span>{isPlatformAdmin ? 'Platform Control Plane' : 'Business Console'}</span>
              </button>
            )}

            <button
              onClick={onOpenDemoWidget}
              className="px-3 py-1.5 text-xs font-semibold text-emerald-400 hover:text-emerald-300 hover:bg-slate-800/60 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
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
                className="hidden sm:flex px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-600/20 to-purple-600/20 hover:from-blue-600/30 hover:to-purple-600/30 text-blue-300 border border-blue-500/30 text-xs font-bold items-center gap-1.5 transition-all cursor-pointer shadow-xs min-h-[38px]"
              >
                <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                <span>AI Copilot</span>
              </button>
            )}

            {/* Notification Bell */}
            {onOpenNotifications && (
              <button
                onClick={onOpenNotifications}
                className="relative p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-all cursor-pointer min-h-[40px] min-w-[40px] flex items-center justify-center"
                title="Notifications"
                aria-label="View notifications"
              >
                <Bell className="w-4 h-4" />
                {unreadNotificationsCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-black flex items-center justify-center animate-pulse">
                    {unreadNotificationsCount}
                  </span>
                )}
              </button>
            )}

            {/* Authenticated User Status vs Public Auth CTAs */}
            {currentUser ? (
              <div className="flex items-center gap-1.5 sm:gap-2">
                {/* Role & Workspace Badge */}
                <div className={`px-2 py-1 sm:px-2.5 sm:py-1.5 text-xs font-medium rounded-xl border flex items-center gap-1.5 sm:gap-2 max-w-[120px] sm:max-w-xs ${
                  isPlatformAdmin
                    ? 'bg-purple-950/60 text-purple-200 border-purple-800/80 shadow-xs'
                    : 'bg-slate-800 text-blue-300 border-slate-700 shadow-xs'
                }`}>
                  {isPlatformAdmin ? (
                    <Briefcase className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                  ) : (
                    <Building2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  )}
                  <span className="font-bold text-white text-[11px] truncate">
                    {isPlatformAdmin ? 'Platform Admin' : (activeBusiness?.name || currentUser.displayName || 'Business User')}
                  </span>

                  {/* If Platform Admin, allow opening Tenant Workspace inspector */}
                  {isPlatformAdmin && onOpenTenantSelect && (
                    <button
                      onClick={onOpenTenantSelect}
                      title="Inspect Specific Tenant Workspace"
                      className="hidden sm:inline ml-1 text-[10px] bg-purple-900 hover:bg-purple-800 text-purple-200 px-1.5 py-0.5 rounded cursor-pointer transition-colors shrink-0"
                    >
                      Inspect
                    </button>
                  )}
                </div>

                {/* Sign Out Button (Desktop only; on mobile it is in mobile menu drawer) */}
                <button
                  onClick={handleLogout}
                  title="Sign out of AgentDesk"
                  className="hidden lg:flex px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl border border-slate-700 items-center gap-1.5 transition-all cursor-pointer min-h-[38px]"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                {/* Desktop-only Auth Buttons: Completely hidden on mobile & tablet */}
                <button
                  onClick={() => onNavigate('login')}
                  className="hidden lg:flex px-3.5 py-2 text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-800/70 rounded-xl transition-all items-center gap-1.5 cursor-pointer min-h-[38px]"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  <span>Sign In</span>
                </button>

              </div>
            )}

            {/* Mobile/Tablet Hamburger Button */}
            <button
              id="mobile-nav-toggle"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer min-h-[44px] min-w-[44px] flex items-center justify-center"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile/Tablet Dropdown Menu Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-slate-800 bg-slate-900/98 backdrop-blur-xl px-4 py-3 space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
            <button
              onClick={() => { onNavigate('landing'); setMobileMenuOpen(false); }}
              className={`w-full min-h-[44px] text-left px-3 py-2.5 text-xs font-semibold rounded-xl transition-all cursor-pointer flex items-center ${
                currentView === 'landing' ? 'text-white bg-slate-800' : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              Home
            </button>
            <button
              onClick={() => { onNavigate('pricing'); setMobileMenuOpen(false); }}
              className={`w-full min-h-[44px] text-left px-3 py-2.5 text-xs font-semibold rounded-xl transition-all cursor-pointer flex items-center ${
                currentView === 'pricing' ? 'text-white bg-slate-800' : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              Pricing
            </button>
            <button
              onClick={() => { onNavigate('get-started'); setMobileMenuOpen(false); }}
              className="w-full min-h-[44px] text-left px-3 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-between bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/20"
            >
              <span>Get Started</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            {currentUser && (
              <button
                onClick={() => { onNavigate('dashboard'); setMobileMenuOpen(false); }}
                className={`w-full min-h-[44px] text-left px-3 py-2.5 text-xs font-semibold rounded-xl transition-all flex items-center gap-2 cursor-pointer ${
                  currentView === 'dashboard' ? 'text-white bg-slate-800' : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>{isPlatformAdmin ? 'Platform Control Plane' : 'Business Console'}</span>
              </button>
            )}
            <button
              onClick={() => { onOpenDemoWidget(); setMobileMenuOpen(false); }}
              className="w-full min-h-[44px] text-left px-3 py-2.5 text-xs font-semibold text-emerald-400 hover:text-emerald-300 hover:bg-slate-800/60 rounded-xl transition-all flex items-center gap-2 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span>Test AI Receptionist</span>
            </button>
            {onOpenCopilot && (
              <button
                onClick={() => { onOpenCopilot(); setMobileMenuOpen(false); }}
                className="w-full min-h-[44px] text-left px-3 py-2.5 text-xs font-semibold text-blue-400 hover:text-blue-300 hover:bg-slate-800/60 rounded-xl transition-all flex items-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-blue-400" />
                <span>AI Copilot</span>
              </button>
            )}
            {currentUser ? (
              <div className="pt-2 border-t border-slate-800/80 space-y-2">
                {isPlatformAdmin && onOpenTenantSelect && (
                  <button
                    onClick={() => { onOpenTenantSelect(); setMobileMenuOpen(false); }}
                    className="w-full min-h-[44px] text-left px-3 py-2.5 text-xs font-semibold text-purple-300 bg-purple-950/40 hover:bg-purple-900/40 rounded-xl transition-all flex items-center gap-2 cursor-pointer border border-purple-800/40"
                  >
                    <Briefcase className="w-4 h-4 text-purple-400" />
                    <span>Inspect Tenant Workspace</span>
                  </button>
                )}
                <button
                  onClick={() => { handleLogout(); setMobileMenuOpen(false); }}
                  className="w-full min-h-[44px] text-left px-3 py-2.5 text-xs font-semibold text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all flex items-center gap-2 cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out ({isPlatformAdmin ? 'Platform Admin' : currentUser.email})</span>
                </button>
              </div>
            ) : (
              <div className="pt-3 border-t border-slate-800/80 space-y-2.5">
                {/* Prominent Get Started CTA inside Hamburger Menu */}
                <button
                  id="mobile-nav-get-started"
                  onClick={() => { onNavigate('get-started'); setMobileMenuOpen(false); }}
                  className="w-full min-h-[48px] px-4 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-600/25 transition-all cursor-pointer"
                >
                  <span>Get Started</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                {/* Sign In button inside Hamburger Menu */}
                <button
                  id="mobile-nav-sign-in"
                  onClick={() => { onNavigate('login'); setMobileMenuOpen(false); }}
                  className="w-full min-h-[44px] px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs flex items-center justify-center gap-2 border border-slate-700/80 transition-all cursor-pointer"
                >
                  <LogIn className="w-4 h-4 text-slate-400" />
                  <span>Sign In</span>
                </button>
              </div>
            )}
          </div>
        )}
      </header>

      {/* Tenant Selection Modal (Only when explicitly opened by Platform Admin or explicit action) */}
      <Suspense fallback={null}>
        <TenantSelectModal
          isOpen={showTenantModal}
          onClose={() => setShowTenantModal(false)}
          onSelectBusiness={handleSelectBusinessFromModal}
          currentBusinessId={activeBusinessId}
        />
      </Suspense>
    </>
  );
};
