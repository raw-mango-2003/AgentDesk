import React from 'react';
import {
  LayoutDashboard,
  Building2,
  Bot,
  ShieldCheck,
  Zap,
  KeyRound,
  Tag,
  CreditCard,
  DollarSign,
  Ticket,
  FileText,
  Shield,
  Sliders,
  Mail,
  ChevronLeft,
  ChevronRight,
  LogOut,
  ExternalLink,
  Sparkles,
  X
} from 'lucide-react';

export type AdminSectionKey =
  | 'dashboard'
  | 'workspaces'
  | 'agents'
  | 'my_agent'
  | 'isolation_tests'
  | 'webhooks'
  | 'credentials'
  | 'pricing_plans'
  | 'subscriptions'
  | 'payments'
  | 'coupons'
  | 'invoices'
  | 'audit_logs'
  | 'automations'
  | 'integrations'
  | 'system_health'
  | 'monitoring'
  | 'settings';

export type PlatformAdminSection = AdminSectionKey;

interface SidebarItem {
  key: AdminSectionKey;
  label: string;
  icon: React.ElementType;
  badge?: string | number;
  badgeColor?: string;
  category?: string;
}

export interface PlatformAdminSidebarProps {
  activeSection: AdminSectionKey;
  onSelectSection: (key: AdminSectionKey) => void;
  isOpenMobile?: boolean;
  isMobileOpen?: boolean;
  onCloseMobile: () => void;
  isCollapsedDesktop?: boolean;
  isCollapsed?: boolean;
  onToggleCollapseDesktop?: () => void;
  onToggleCollapse?: () => void;
  counts?: {
    businesses?: number;
    agents?: number;
    subscriptions?: number;
    payments?: number;
    coupons?: number;
    invoices?: number;
    credentials?: number;
  };
  businessesCount?: number;
  agentsCount?: number;
  onSwitchToBusinessConsole?: () => void;
}

export const PlatformAdminSidebar: React.FC<PlatformAdminSidebarProps> = ({
  activeSection,
  onSelectSection,
  isOpenMobile,
  isMobileOpen,
  onCloseMobile,
  isCollapsedDesktop,
  isCollapsed,
  onToggleCollapseDesktop,
  onToggleCollapse,
  counts = {},
  businessesCount,
  agentsCount,
  onSwitchToBusinessConsole
}) => {
  const collapsed = isCollapsedDesktop ?? isCollapsed ?? false;
  const toggleCollapse = onToggleCollapseDesktop || onToggleCollapse || (() => {});
  const mobileOpen = isOpenMobile ?? isMobileOpen ?? false;
  const navItems: SidebarItem[] = [
    { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { key: 'workspaces', label: 'Businesses', icon: Building2, badge: counts.businesses },
    { key: 'agents', label: 'AI Agents', icon: Bot, badge: counts.agents },
    { key: 'my_agent', label: 'My AI Agent', icon: Sparkles },
    { key: 'isolation_tests', label: 'Isolation Tests', icon: ShieldCheck },
    { key: 'webhooks', label: 'Webhooks', icon: Zap },
    { key: 'credentials', label: 'Login Credentials', icon: KeyRound, badge: counts.credentials },
    { key: 'pricing_plans', label: 'Pricing', icon: Tag },
    { key: 'subscriptions', label: 'Subscriptions', icon: CreditCard, badge: counts.subscriptions },
    { key: 'payments', label: 'Payments', icon: DollarSign, badge: counts.payments },
    { key: 'coupons', label: 'Coupons', icon: Ticket, badge: counts.coupons },
    { key: 'invoices', label: 'Invoices', icon: FileText, badge: counts.invoices },
    { key: 'audit_logs', label: 'Audit Logs', icon: Shield },
    { key: 'automations', label: 'Automations', icon: Zap },
    { key: 'integrations', label: 'Integrations', icon: Sliders },
    { key: 'system_health', label: 'Health & Diagnostics', icon: ShieldCheck },
    { key: 'monitoring', label: 'Delivery & Queue Logs', icon: Mail },
    { key: 'settings', label: 'Settings', icon: Sliders },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/80 backdrop-blur-xs md:hidden transition-opacity"
          onClick={onCloseMobile}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`
          fixed top-16 bottom-0 left-0 z-40
          md:static md:top-0 md:h-[calc(100vh-4rem)]
          bg-slate-900 border-r border-slate-800
          flex flex-col transition-all duration-300 ease-in-out shrink-0
          ${isOpenMobile ? 'translate-x-0 w-64 shadow-2xl' : '-translate-x-full md:translate-x-0'}
          ${isCollapsedDesktop ? 'md:w-16' : 'md:w-64'}
        `}
      >
        {/* Sidebar Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5 overflow-hidden">
            <div className="w-8 h-8 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            {(!isCollapsedDesktop || isOpenMobile) && (
              <div className="min-w-0">
                <div className="text-xs font-black text-white uppercase tracking-wider truncate">
                  Platform Admin
                </div>
                <div className="text-[10px] text-purple-300/70 font-mono truncate">
                  Global Control Plane
                </div>
              </div>
            )}
          </div>

          {/* Mobile close button */}
          <button
            onClick={onCloseMobile}
            className="md:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
            title="Close sidebar"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Desktop collapse toggle */}
          <button
            onClick={onToggleCollapseDesktop}
            className="hidden md:flex p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title={isCollapsedDesktop ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {isCollapsedDesktop ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Navigation Items (Scrollable) */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden p-2.5 space-y-1 custom-scrollbar">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.key;
            return (
              <button
                key={item.key}
                onClick={() => {
                  onSelectSection(item.key);
                  onCloseMobile();
                }}
                className={`
                  w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold
                  transition-all cursor-pointer group relative
                  ${
                    isActive
                      ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20 font-bold'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/70'
                  }
                  ${isCollapsedDesktop && !isOpenMobile ? 'justify-center px-2' : ''}
                `}
                title={isCollapsedDesktop && !isOpenMobile ? item.label : undefined}
              >
                <Icon
                  className={`w-4 h-4 shrink-0 transition-colors ${
                    isActive ? 'text-white' : 'text-slate-400 group-hover:text-purple-300'
                  }`}
                />

                {(!isCollapsedDesktop || isOpenMobile) && (
                  <span className="truncate flex-1 text-left">{item.label}</span>
                )}

                {(!isCollapsedDesktop || isOpenMobile) && item.badge !== undefined && item.badge !== null && (
                  <span
                    className={`
                      ml-auto px-1.5 py-0.2 rounded-full text-[10px] font-bold shrink-0
                      ${
                        isActive
                          ? 'bg-purple-800/80 text-white'
                          : 'bg-slate-800 text-slate-400 group-hover:bg-slate-700 group-hover:text-slate-200'
                      }
                    `}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Bottom Switch to Business Console Footer */}
        {onSwitchToBusinessConsole && (
          <div className="p-3 border-t border-slate-800/80 bg-slate-950/40">
            <button
              onClick={onSwitchToBusinessConsole}
              className={`
                w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold
                bg-blue-600/10 hover:bg-blue-600/20 text-blue-300 border border-blue-500/20
                transition-all cursor-pointer group
                ${isCollapsedDesktop && !isOpenMobile ? 'justify-center px-2' : ''}
              `}
              title="Open Tenant Business Console"
            >
              <ExternalLink className="w-3.5 h-3.5 shrink-0 text-blue-400 group-hover:scale-110 transition-transform" />
              {(!isCollapsedDesktop || isOpenMobile) && (
                <span className="truncate">Business Console</span>
              )}
            </button>
          </div>
        )}
      </aside>
    </>
  );
};
