import React, { useState } from 'react';
import { 
  X, 
  Send, 
  Sparkles, 
  CheckCircle2, 
  Building2, 
  Mail, 
  Phone, 
  User, 
  Globe, 
  ShieldCheck,
  Calendar,
  MessageSquare
} from 'lucide-react';
import { CurrencyCode, formatPrice, PlanConfig, getPlanConfig } from '../data/pricing';
import { addAuditLog, addNotification } from '../lib/dbService';

interface ContactSalesModalProps {
  isOpen: boolean;
  onClose: () => void;
  planId?: string;
  currency?: CurrencyCode;
  ctaType?: 'demo' | 'book_demo' | 'sales' | 'enterprise_sales';
}

export const ContactSalesModal: React.FC<ContactSalesModalProps> = ({
  isOpen,
  onClose,
  planId = 'enterprise',
  currency = 'USD',
  ctaType = 'sales'
}) => {
  const plan = getPlanConfig(planId);
  const pricing = plan.pricing[currency] || plan.pricing.USD;

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [locationsCount, setLocationsCount] = useState('1');
  const [callVolume, setCallVolume] = useState('500 - 2,500 mins/mo');
  const [primaryChannel, setPrimaryChannel] = useState<'both' | 'voice' | 'chat'>('both');
  const [requirements, setRequirements] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;

    setIsSubmitting(true);
    try {
      // Create notification & audit log for enterprise sales team
      await Promise.all([
        addAuditLog({
          businessId: 'platform',
          actorEmail: email,
          action: 'SALES_INQUIRY',
          entity: plan.name,
          details: `Inquiry from ${name} (${company}) for ${plan.name}. Call Vol: ${callVolume}, Locations: ${locationsCount}. Details: ${requirements || 'None provided'}`
        }),
        addNotification({
          businessId: 'summit-home-services',
          type: 'system',
          title: `New Sales Inquiry: ${plan.name}`,
          message: `${name} from ${company || 'Enterprise Client'} requested deployment info for ${plan.name}. Email: ${email}, Phone: ${phone || 'N/A'}`
        })
      ]);

      setIsSuccess(true);
    } catch (err) {
      console.error('Error submitting sales inquiry:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const modalTitle = ctaType === 'demo' || ctaType === 'book_demo' 
    ? `Book Architecture Demo — ${plan.name}` 
    : ctaType === 'enterprise_sales'
    ? `Contact Enterprise Solutions — ${plan.name}`
    : `Talk to Sales — ${plan.name}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-2xl rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-600/10 blur-3xl pointer-events-none rounded-full" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {isSuccess ? (
          <div className="text-center py-10 space-y-4">
            <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center mx-auto mb-2 animate-bounce">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <h3 className="text-2xl font-bold text-white tracking-tight">
              Deployment Request Received
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 max-w-md mx-auto leading-relaxed">
              Thank you, <span className="font-semibold text-white">{name}</span>. An AgentDesk enterprise solutions architect will reach out to <span className="font-semibold text-blue-400">{email}</span> within 2 business hours with a tailored implementation scope.
            </p>

            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 text-left text-xs text-slate-400 max-w-md mx-auto space-y-2 mt-4">
              <div className="flex justify-between">
                <span>Selected System:</span>
                <span className="font-bold text-white">{plan.name}</span>
              </div>
              <div className="flex justify-between">
                <span>Estimated Platform Fee:</span>
                <span className="font-bold text-emerald-400">
                  {plan.isCustomPrice ? 'Custom SLA' : `${formatPrice(pricing.monthlyPrice, currency as CurrencyCode)} / mo`}
                </span>
              </div>
              <div className="flex justify-between">
                <span>One-time Implementation:</span>
                <span className="font-bold text-slate-200">
                  {plan.isCustomPrice ? 'Custom Scope' : formatPrice(pricing.setupPrice, currency as CurrencyCode)}
                </span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="mt-6 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all cursor-pointer"
            >
              Back to Experience
            </button>
          </div>
        ) : (
          <div>
            <div className="mb-6">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold mb-2">
                <Sparkles className="w-3.5 h-3.5" />
                <span>AgentDesk Technologies</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                {modalTitle}
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                {plan.positioning} • Direct consultation with an AI revenue engineer.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    <span>Your Full Name *</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="e.g. David Vance"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span>Work Email *</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-slate-400" />
                    <span>Company Name</span>
                  </label>
                  <input
                    type="text"
                    value={company}
                    onChange={e => setCompany(e.target.value)}
                    placeholder="e.g. Apex Health Clinics"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>Phone Number</span>
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="+1 (555) 000-0000"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Locations / Clinics / Workspaces
                  </label>
                  <select
                    value={locationsCount}
                    onChange={e => setLocationsCount(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="1">1 Location (Single Workspace)</option>
                    <option value="2-5">2 - 5 Locations</option>
                    <option value="6-20">6 - 20 Multi-Branch</option>
                    <option value="20+">20+ Enterprise / Franchise</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Estimated Inbound Call Volume
                  </label>
                  <select
                    value={callVolume}
                    onChange={e => setCallVolume(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-blue-500 cursor-pointer"
                  >
                    <option value="Under 500 mins">Under 500 minutes / mo</option>
                    <option value="500 - 2,500 mins/mo">500 - 2,500 minutes / mo (Enterprise standard)</option>
                    <option value="2,500 - 10,000 mins/mo">2,500 - 10,000 minutes / mo</option>
                    <option value="10,000+ mins/mo">10,000+ minutes / mo (High Volume)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
                  <span>Specific Integrations or Custom Business Logic</span>
                </label>
                <textarea
                  rows={2}
                  value={requirements}
                  onChange={e => setRequirements(e.target.value)}
                  placeholder="e.g. Need HubSpot sync, Spanish voice agent support, and custom quote follow-ups..."
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-800/80">
                <div className="flex items-center gap-2 text-[11px] text-slate-400">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Includes 12-step full implementation & managed operations.</span>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-blue-600/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Submit Request</span>
                      <Send className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
