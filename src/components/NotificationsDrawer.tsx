import React from 'react';
import { 
  Bell, 
  X, 
  CheckCircle, 
  PhoneMissed, 
  MessageSquare, 
  Calendar, 
  FileText, 
  Sparkles,
  Check
} from 'lucide-react';
import { AppNotification, Business } from '../types';
import { formatDateTime } from '../lib/localization';

interface NotificationsDrawerProps {
  business: Business;
  notifications: AppNotification[];
  isOpen: boolean;
  onClose: () => void;
  onMarkAllRead: () => void;
  onNavigateTab: (tabId: string) => void;
}

export function NotificationsDrawer({
  business,
  notifications,
  isOpen,
  onClose,
  onMarkAllRead,
  onNavigateTab
}: NotificationsDrawerProps) {
  if (!isOpen) return null;

  const getIconForType = (type: AppNotification['type']) => {
    switch (type) {
      case 'new_lead':
        return <Sparkles className="w-4 h-4 text-emerald-400" />;
      case 'missed_call':
        return <PhoneMissed className="w-4 h-4 text-amber-400" />;
      case 'appointment_booked':
        return <Calendar className="w-4 h-4 text-blue-400" />;
      case 'estimate_followup':
        return <FileText className="w-4 h-4 text-purple-400" />;
      default:
        return <MessageSquare className="w-4 h-4 text-slate-400" />;
    }
  };

  const getTargetTab = (type: AppNotification['type']) => {
    switch (type) {
      case 'new_lead':
        return 'leads';
      case 'missed_call':
        return 'missed_calls';
      case 'appointment_booked':
        return 'appointments';
      case 'estimate_followup':
        return 'estimates';
      default:
        return 'overview';
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-[380px] bg-slate-900 border-l border-slate-800 z-50 shadow-2xl flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/80">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4 text-blue-400" />
          <h3 className="text-xs font-bold text-white">
            Notifications ({notifications.filter(n => !n.read).length} Unread)
          </h3>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={onMarkAllRead}
            className="text-[11px] font-bold text-blue-400 hover:text-blue-300 px-2 py-1 rounded hover:bg-slate-800 transition-all cursor-pointer"
          >
            Mark all read
          </button>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Notifications List */}
      <div className="flex-1 p-3 overflow-y-auto space-y-2">
        {(notifications || []).map(notif => (
          <div
            key={notif.id}
            onClick={() => {
              onNavigateTab(getTargetTab(notif.type));
              onClose();
            }}
            className={`p-3 rounded-2xl border transition-all cursor-pointer ${
              notif.read
                ? 'bg-slate-950/40 border-slate-800/60 opacity-70 hover:opacity-100'
                : 'bg-slate-950 border-slate-800 hover:border-blue-500/40 shadow-sm'
            }`}
          >
            <div className="flex items-start gap-2.5">
              <div className="mt-0.5 shrink-0">
                {getIconForType(notif.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between text-xs font-bold text-white mb-0.5">
                  <span className="truncate">{notif.title}</span>
                  {!notif.read && (
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0 ml-2" />
                  )}
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  {notif.message}
                </p>
                <span className="text-[9px] text-slate-500 mt-1 block">
                  {formatDateTime(notif.timestamp, business.timezone, business.country)}
                </span>
              </div>
            </div>
          </div>
        ))}

        {notifications.length === 0 && (
          <div className="text-center py-16 text-xs text-slate-500">
            No notifications right now. System is running cleanly.
          </div>
        )}
      </div>
    </div>
  );
}
