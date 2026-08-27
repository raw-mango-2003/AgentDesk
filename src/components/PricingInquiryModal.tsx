import React, { useState } from 'react';
import { X, CheckCircle2, Sparkles, Send, Globe, Phone, Mail, Building } from 'lucide-react';
import { CurrencyCode, CURRENCIES, formatPrice } from '../data/pricing';

interface PricingInquiryModalProps {
  isOpen: boolean;
  onClose: () => void;
  planName: string;
  monthlyPriceText: string;
  setupPriceText: string;
  selectedCurrency: CurrencyCode;
}

export const PricingInquiryModal: React.FC<PricingInquiryModalProps> = ({
  isOpen,
  onClose,
  planName,
  monthlyPriceText,
  setupPriceText,
  selectedCurrency
}) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [notes, setNotes] = useState('');
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  const handleReset = () => {
    setSubmitted(false);
    setName('');
    setEmail('');
    setPhone('');
    setCompany('');
    setNotes('');
    onClose();
  };

  const curr = CURRENCIES[selectedCurrency];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden relative text-white font-sans">
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 border-b border-slate-700 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-blue-400 text-xs font-semibold uppercase tracking-wider mb-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Inquiry / Demo Request</span>
            </div>
            <h3 className="text-xl font-bold text-white">{planName} Plan</h3>
            <p className="text-xs text-slate-300 mt-0.5">
              {monthlyPriceText} {setupPriceText ? `• ${setupPriceText}` : ''} ({curr.code})
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {submitted ? (
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h4 className="text-xl font-bold text-white">Inquiry Received!</h4>
              <p className="text-xs text-slate-300 leading-relaxed max-w-sm mx-auto">
                Thank you for your interest in AgentDesk. Our onboarding team will contact you at <span className="font-semibold text-white">{email}</span> within 24 hours to schedule your dedicated AI Receptionist demo and setup.
              </p>
              <button
                onClick={handleReset}
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all"
              >
                Close Window
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Sarah Jenkins"
                  className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Business Email *</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="sarah@company.com"
                    className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Phone Number *</label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="+1 (555) 019-2834"
                    className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Company / Organization Name</label>
                <input
                  type="text"
                  value={company}
                  onChange={e => setCompany(e.target.value)}
                  placeholder="e.g. Apex Legal Practice"
                  className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-semibold mb-1">Questions or Custom Requirements (Optional)</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Tell us about your estimated chat volume or voice receptionist requirements..."
                  className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="p-3 bg-slate-800/80 border border-slate-700 rounded-xl flex items-center justify-between text-[11px] text-slate-400">
                <span className="flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-blue-400" />
                  Selected Region: {curr.flag} {curr.name} ({curr.code})
                </span>
                <span className="font-semibold text-emerald-400">No Payment Due Today</span>
              </div>

              <button
                type="submit"
                className="w-full py-3 mt-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                <span>Submit {planName} Inquiry</span>
              </button>

              <p className="text-[10px] text-slate-500 text-center pt-1">
                By submitting, you request a personalized demo and onboarding consultation. Additional usage billed separately.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
