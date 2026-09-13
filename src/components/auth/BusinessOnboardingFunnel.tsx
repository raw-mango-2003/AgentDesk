import React, { useState } from 'react';
import { 
  Bot, 
  ArrowRight, 
  Check, 
  ShieldCheck, 
  AlertCircle, 
  CreditCard, 
  Building2, 
  Sparkles, 
  CheckCircle2, 
  Lock, 
  Zap, 
  ChevronRight,
  ArrowLeft,
  DollarSign
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { 
  PRICING_PLANS, 
  CURRENCIES, 
  CurrencyCode, 
  PlanConfig, 
  getPlanPricing, 
  formatPrice, 
  formatCurrencyAmount,
  getRecommendedCurrency 
} from '../../data/pricing';
import { RazorpayCheckoutStep } from './RazorpayCheckoutStep';

interface BusinessOnboardingFunnelProps {
  onCompleted: (tenantId: string) => void;
  onCancel: () => void;
  onNavigateLogin: () => void;
}

type OnboardingStep = 'account' | 'business' | 'plan' | 'payment' | 'activation';

export const BusinessOnboardingFunnel: React.FC<BusinessOnboardingFunnelProps> = ({
  onCompleted,
  onCancel,
  onNavigateLogin
}) => {
  const { signupBusiness, saveBusinessDetails, refreshAuth, currentUser } = useAuth();

  const [step, setStep] = useState<OnboardingStep>(currentUser ? 'business' : 'account');
  const [currency, setCurrency] = useState<CurrencyCode>(getRecommendedCurrency());
  
  // 1. Account Details
  const [fullName, setFullName] = useState(currentUser?.displayName || '');
  const [email, setEmail] = useState(currentUser?.email || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // 2. Business Details
  const [businessName, setBusinessName] = useState('');
  const [industry, setIndustry] = useState('Professional Services');
  const [teamSize, setTeamSize] = useState('1-10');
  const [phone, setPhone] = useState('');
  const [website, setWebsite] = useState('');

  // 3. Plan Selection
  const [selectedPlanId, setSelectedPlanId] = useState<string>('starter');
  const [tenantId, setTenantId] = useState<string>('');

  // Status & Errors
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [provisionedData, setProvisionedData] = useState<{
    tenantId: string;
    businessName: string;
    planName: string;
  } | null>(null);

  const selectedPlan = PRICING_PLANS.find(p => p.id === selectedPlanId) || PRICING_PLANS[0];
  const pricing = getPlanPricing(selectedPlan, currency);

  // Step 1: Create Account
  const handleAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    setLoading(true);
    const res = await signupBusiness(fullName, email, password, confirmPassword);
    setLoading(false);

    if (!res.success) {
      setError(res.error || 'Failed to create account. Please check your details.');
      return;
    }

    setStep('business');
  };

  // Step 2: Save Business Details
  const handleBusinessSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!businessName.trim()) {
      setError('Business Name is required.');
      return;
    }

    setLoading(true);
    const res = await saveBusinessDetails({
      businessName,
      industry,
      teamSize,
      phone,
      website
    });
    setLoading(false);

    if (!res.success || !res.tenantId) {
      setError(res.error || 'Failed to save business details.');
      return;
    }

    setTenantId(res.tenantId);
    setStep('plan');
  };

  // Step 3: Choose Plan
  const handlePlanSelect = (planId: string) => {
    setSelectedPlanId(planId);
    setStep('payment');
  };

  const handlePaymentSuccess = async (provisioned: { tenantId: string; businessName: string; planName: string }) => {
    await refreshAuth();
    setProvisionedData(provisioned);
    setStep('activation');
  };

  const stepsHeader = [
    { key: 'account', label: '1. Account' },
    { key: 'business', label: '2. Business' },
    { key: 'plan', label: '3. Plan' },
    { key: 'payment', label: '4. Payment' },
    { key: 'activation', label: '5. Launch' }
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-10 px-4 sm:px-6 lg:px-8 font-sans selection:bg-blue-600 selection:text-white relative">
      <div className="max-w-3xl mx-auto">
        {/* Navigation bar top */}
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <span className="font-extrabold text-white text-base tracking-tight">AgentDesk</span>
              <span className="text-xs text-blue-400 font-semibold ml-2">Business Onboarding</span>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <span className="text-slate-400">Already registered?</span>
            <button
              onClick={onNavigateLogin}
              className="text-blue-400 hover:text-blue-300 font-bold transition-colors cursor-pointer"
            >
              Sign In
            </button>
            <button
              onClick={onCancel}
              className="text-slate-500 hover:text-slate-300 transition-colors ml-2 cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>

        {/* Step indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {stepsHeader.map((s, idx) => {
              const isCurrent = step === s.key;
              const isDone = 
                (step === 'business' && idx < 1) ||
                (step === 'plan' && idx < 2) ||
                (step === 'payment' && idx < 3) ||
                (step === 'activation' && idx < 4);

              return (
                <div key={s.key} className="flex items-center gap-2">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    isDone 
                      ? 'bg-emerald-500 text-white' 
                      : isCurrent 
                      ? 'bg-blue-600 text-white ring-4 ring-blue-600/20' 
                      : 'bg-slate-800 text-slate-400'
                  }`}>
                    {isDone ? <Check className="w-3.5 h-3.5" /> : idx + 1}
                  </div>
                  <span className={`text-xs font-medium hidden sm:inline ${
                    isCurrent ? 'text-white font-bold' : isDone ? 'text-slate-300' : 'text-slate-500'
                  }`}>
                    {s.label.split('. ')[1]}
                  </span>
                  {idx < stepsHeader.length - 1 && (
                    <div className="w-6 sm:w-12 h-0.5 bg-slate-800 ml-2" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start gap-3 animate-fadeIn">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="leading-relaxed">{error}</div>
          </div>
        )}

        {/* STEP 1: CREATE ACCOUNT */}
        {step === 'account' && (
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl">
            <div className="mb-6">
              <h2 className="text-2xl font-black text-white">Create your AgentDesk account</h2>
              <p className="text-xs text-slate-400 mt-1">
                Start your 30-day workspace setup. We'll configure your dedicated AI Receptionist & CRM.
              </p>
            </div>

            <form onSubmit={handleAccountSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. John Miller"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Work Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="john@company.com"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
                <p className="text-[10px] text-slate-500 mt-1">This will be your administrative login ID.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Password</label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Min. 8 characters"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Confirm Password</label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat password"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-4 py-3.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {loading ? 'Creating Account...' : (
                  <>
                    <span>Continue to Business Details</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* STEP 2: BUSINESS DETAILS */}
        {step === 'business' && (
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl">
            <div className="mb-6">
              <h2 className="text-2xl font-black text-white">Business Details</h2>
              <p className="text-xs text-slate-400 mt-1">
                Tell us about your organization to personalize your AI Receptionist and multi-tenant partition.
              </p>
            </div>

            <form onSubmit={handleBusinessSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Business or Company Name *</label>
                <input
                  type="text"
                  required
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="e.g. Apex Legal & Consulting"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Industry</label>
                  <select
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="Professional Services">Professional Services</option>
                    <option value="Healthcare & Clinics">Healthcare & Clinics</option>
                    <option value="Home Services & Contractors">Home Services & Contractors</option>
                    <option value="Real Estate & Property">Real Estate & Property</option>
                    <option value="Financial & Legal">Financial & Legal</option>
                    <option value="Education & Admissions">Education & Admissions</option>
                    <option value="Hospitality & Retail">Hospitality & Retail</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Team Size</label>
                  <select
                    value={teamSize}
                    onChange={(e) => setTeamSize(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="1-10">1-10 Employees</option>
                    <option value="11-50">11-50 Employees</option>
                    <option value="51-200">51-200 Employees</option>
                    <option value="200+">200+ Employees</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Support Phone Number</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+1 (555) 234-5678"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Website URL (Optional)</label>
                  <input
                    type="url"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="https://company.com"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-xl text-xs text-slate-400">
                <span className="font-semibold text-slate-300">Security Note:</span> Your workspace partition will be created in <code className="text-amber-400">ONBOARDING_PENDING</code> state. It is activated immediately after verified plan confirmation.
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-4 py-3.5 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {loading ? 'Recording Details...' : (
                  <>
                    <span>Proceed to Plan Selection</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        )}

        {/* STEP 3: PLAN SELECTION */}
        {step === 'plan' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black text-white">Select an AgentDesk Plan</h2>
                <p className="text-xs text-slate-400 mt-1">
                  Choose the operations tier that fits your inbound call and website lead volume.
                </p>
              </div>

              {/* Currency Selector */}
              <div className="inline-flex bg-slate-900 border border-slate-800 rounded-xl p-1 self-start sm:self-auto">
                {(Object.keys(CURRENCIES) as CurrencyCode[]).map((c) => (
                  <button
                    key={c}
                    onClick={() => setCurrency(c)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      currency === c 
                        ? 'bg-blue-600 text-white shadow-xs' 
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {c} ({CURRENCIES[c].symbol})
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {PRICING_PLANS.filter(p => p.id !== 'enterprise').map((plan) => {
                const pPrice = getPlanPricing(plan, currency);
                const isSelected = selectedPlanId === plan.id;

                return (
                  <div
                    key={plan.id}
                    onClick={() => setSelectedPlanId(plan.id)}
                    className={`bg-slate-900/90 border rounded-3xl p-6 transition-all cursor-pointer relative flex flex-col justify-between ${
                      isSelected 
                        ? 'border-blue-500 ring-2 ring-blue-500/20 shadow-xl shadow-blue-600/10' 
                        : 'border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {plan.isPopular && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-[10px] font-black uppercase px-3 py-0.5 rounded-full shadow-sm">
                        Most Popular
                      </div>
                    )}

                    <div>
                      <h3 className="text-lg font-black text-white">{plan.name}</h3>
                      <p className="text-xs text-slate-400 mt-1 min-h-[32px]">{plan.tagline}</p>

                      <div className="my-4 pt-4 border-t border-slate-800">
                        <div className="flex items-baseline gap-1">
                          <span className="text-3xl font-black text-white">
                            {formatPrice(pPrice.monthlyPrice, currency)}
                          </span>
                          <span className="text-xs text-slate-400">/mo</span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-1">
                          + {formatPrice(pPrice.setupPrice, currency)} one-time setup
                        </div>
                      </div>

                      <div className="space-y-2 text-xs text-slate-300 mb-6">
                        <div className="font-semibold text-slate-400 uppercase text-[10px] tracking-wider mb-2">
                          Usage Limits
                        </div>
                        <div className="flex items-center gap-2">
                          <Check className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                          <span>{typeof plan.usageLimits.voiceMinutes === 'number' ? plan.usageLimits.voiceMinutes.toLocaleString() : plan.usageLimits.voiceMinutes} voice minutes/mo</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Check className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                          <span>{plan.usageLimits.knowledgeDocuments} knowledge articles</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Check className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                          <span>{plan.usageLimits.teamMembers} team seats</span>
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handlePlanSelect(plan.id)}
                      className={`w-full py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                        isSelected 
                          ? 'bg-blue-600 text-white shadow-md' 
                          : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                      }`}
                    >
                      {isSelected ? 'Proceed with this Plan' : 'Select Plan'}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP 4: PRODUCTION-GRADE RAZORPAY CHECKOUT */}
        {step === 'payment' && (
          <RazorpayCheckoutStep
            planId={selectedPlan.id}
            currency={currency}
            businessName={businessName}
            tenantId={tenantId}
            fullName={fullName}
            email={email}
            phone={phone}
            onChangePlan={() => setStep('plan')}
            onPaymentSuccess={handlePaymentSuccess}
            onError={(err) => setError(err)}
          />
        )}

        {/* STEP 5: ACTIVATION & SUCCESS LAUNCH */}
        {step === 'activation' && provisionedData && (
          <div className="bg-slate-900/90 border border-emerald-500/30 rounded-3xl p-8 shadow-2xl text-center">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/10">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <div className="inline-block px-3 py-1 rounded-full bg-emerald-950 border border-emerald-800 text-emerald-300 text-[11px] font-bold uppercase tracking-wider mb-2">
              Tenant Active • Verified
            </div>

            <h2 className="text-3xl font-black text-white">
              Welcome to AgentDesk!
            </h2>
            <p className="text-sm text-slate-300 mt-2 max-w-md mx-auto">
              Workspace <strong className="text-white">{provisionedData.businessName}</strong> ({provisionedData.tenantId}) is provisioned on the <strong className="text-blue-400">{provisionedData.planName}</strong> plan.
            </p>

            <div className="my-6 max-w-md mx-auto p-4 bg-slate-950 rounded-2xl border border-slate-800 text-left text-xs space-y-2 text-slate-300">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Account Owner:</span>
                <span className="font-semibold text-white">{fullName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Role Assigned:</span>
                <span className="font-semibold text-emerald-400">BUSINESS_ADMIN</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Workspace Status:</span>
                <span className="font-semibold text-emerald-400">ACTIVE</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">AI Receptionist:</span>
                <span className="font-semibold text-white">Online & Ready</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onCompleted(provisionedData.tenantId)}
              className="py-4 px-8 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black text-sm shadow-xl shadow-blue-600/30 transition-all inline-flex items-center gap-2 cursor-pointer"
            >
              <span>Launch Business Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
