import React, { useState } from 'react';
import { 
  Calculator, 
  TrendingUp, 
  DollarSign, 
  Users, 
  PhoneMissed, 
  Sparkles, 
  ArrowRight, 
  CheckCircle2, 
  HelpCircle, 
  Percent 
} from 'lucide-react';
import { CurrencyCode, CURRENCIES, formatPrice } from '../data/pricing';
import { convertFromUSD, formatCurrencyAmount } from '../lib/currency';

interface ROICalculatorProps {
  currency: CurrencyCode;
  onBookDemo?: () => void;
}

export const ROICalculator: React.FC<ROICalculatorProps> = ({
  currency,
  onBookDemo
}) => {
  // Inputs with sensible defaults
  const [monthlyLeads, setMonthlyLeads] = useState<number>(150);
  const [avgCustomerValue, setAvgCustomerValue] = useState<number>(
    currency === 'INR' ? 75000 : currency === 'GBP' ? 1400 : 1800
  );
  const [currentConversionRate, setCurrentConversionRate] = useState<number>(8); // 8%
  const [conversionLift, setConversionLift] = useState<number>(35); // 35% improvement
  const [missedCallsPerMonth, setMissedCallsPerMonth] = useState<number>(45);
  const [missedCallRecoveryRate, setMissedCallRecoveryRate] = useState<number>(40); // 40% recovered

  // Synchronize default customer value if currency changes
  React.useEffect(() => {
    if (currency === 'INR') {
      setAvgCustomerValue(75000);
    } else if (currency === 'GBP') {
      setAvgCustomerValue(1400);
    } else {
      setAvgCustomerValue(1800);
    }
  }, [currency]);

  // Calculations
  const currentMonthlyCustomers = (monthlyLeads * currentConversionRate) / 100;
  const currentMonthlyRevenue = currentMonthlyCustomers * avgCustomerValue;

  // New conversion rate after AI RevenueOS
  const newConversionRate = currentConversionRate * (1 + conversionLift / 100);
  const improvedMonthlyCustomers = (monthlyLeads * newConversionRate) / 100;
  const directLeadsAddedCustomers = Math.max(0, improvedMonthlyCustomers - currentMonthlyCustomers);

  // Missed call recovery calculation
  const recoveredCallsAsLeads = (missedCallsPerMonth * missedCallRecoveryRate) / 100;
  const recoveredCallCustomers = (recoveredCallsAsLeads * (newConversionRate / 100));

  // Total additional customers and revenue
  const totalAdditionalCustomers = Math.round((directLeadsAddedCustomers + recoveredCallCustomers) * 10) / 10;
  const potentialAdditionalMonthlyRevenue = Math.round(totalAdditionalCustomers * avgCustomerValue);
  const potentialAnnualRevenue = potentialAdditionalMonthlyRevenue * 12;

  // AI RevenueOS Enterprise Monthly Cost
  const monthlyCost = convertFromUSD(2497, currency);
  const netMonthlyImpact = potentialAdditionalMonthlyRevenue - monthlyCost;
  const estimatedRoiPercent = monthlyCost > 0 
    ? Math.max(0, Math.round(((potentialAdditionalMonthlyRevenue - monthlyCost) / monthlyCost) * 100))
    : 0;

  const symbol = CURRENCIES[currency]?.symbol || '$';

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl relative overflow-hidden">
      {/* Background radial gradient */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 blur-3xl pointer-events-none rounded-full" />

      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8 border-b border-slate-800 pb-6 relative z-10">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold mb-2">
            <Calculator className="w-3.5 h-3.5" />
            <span>Interactive ROI Simulator</span>
          </div>
          <h3 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Calculate Your AI RevenueOS Impact
          </h3>
          <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-xl">
            Simulate how 24/7 instantaneous AI reception, missed call text-backs, and multi-touch lead follow-ups compound into top-line revenue.
          </p>
        </div>

        <div className="px-4 py-2 rounded-2xl bg-slate-800/80 border border-slate-700 text-xs font-semibold text-slate-300 flex items-center gap-2">
          <span>Benchmarked against</span>
          <span className="text-blue-400 font-bold">Enterprise Plan</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 relative z-10">
        {/* Left Column: Interactive Sliders & Inputs */}
        <div className="lg:col-span-7 space-y-6">
          {/* Input 1: Monthly Leads */}
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80">
            <div className="flex justify-between items-center mb-2">
              <label className="text-xs font-bold text-slate-200 flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-400" />
                <span>Monthly Inbound Inquiries / Leads</span>
              </label>
              <span className="text-sm font-black text-blue-400 bg-blue-950/80 px-2.5 py-0.5 rounded-lg border border-blue-800/60">
                {monthlyLeads.toLocaleString()} leads
              </span>
            </div>
            <input
              type="range"
              min="20"
              max="1500"
              step="10"
              value={monthlyLeads}
              onChange={e => setMonthlyLeads(Number(e.target.value))}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-blue-500"
            />
            <div className="flex justify-between text-[10px] text-slate-500 mt-1">
              <span>20</span>
              <span>500</span>
              <span>1,500+</span>
            </div>
          </div>

          {/* Input 2: Average Customer Lifetime Value / Deal Size */}
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80">
            <div className="flex justify-between items-center mb-2">
              <label className="text-xs font-bold text-slate-200 flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-emerald-400" />
                <span>Average Value per Closed Customer</span>
              </label>
              <div className="flex items-center gap-1">
                <span className="text-xs text-slate-400">{symbol}</span>
                <input
                  type="number"
                  value={avgCustomerValue}
                  onChange={e => setAvgCustomerValue(Math.max(1, Number(e.target.value)))}
                  className="w-28 bg-slate-900 text-sm font-black text-emerald-400 px-2.5 py-1 rounded-lg border border-emerald-800/60 text-right focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
            <input
              type="range"
              min={currency === 'INR' ? 10000 : 250}
              max={currency === 'INR' ? 500000 : 15000}
              step={currency === 'INR' ? 5000 : 100}
              value={avgCustomerValue}
              onChange={e => setAvgCustomerValue(Number(e.target.value))}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
          </div>

          {/* Grid of 2 inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Input 3: Current Conversion Rate */}
            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80">
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-bold text-slate-200">Current Lead Conversion</label>
                <span className="text-xs font-bold text-purple-400">{currentConversionRate}%</span>
              </div>
              <input
                type="range"
                min="2"
                max="30"
                step="1"
                value={currentConversionRate}
                onChange={e => setCurrentConversionRate(Number(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-purple-500"
              />
            </div>

            {/* Input 4: Expected Lift from Instant AI Follow-up */}
            <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80">
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-bold text-slate-200">Expected Conversion Lift</label>
                <span className="text-xs font-bold text-indigo-400">+{conversionLift}%</span>
              </div>
              <input
                type="range"
                min="10"
                max="80"
                step="5"
                value={conversionLift}
                onChange={e => setConversionLift(Number(e.target.value))}
                className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              />
            </div>
          </div>

          {/* Input 5: Missed Calls per Month */}
          <div className="p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80">
            <div className="flex justify-between items-center mb-2">
              <label className="text-xs font-bold text-slate-200 flex items-center gap-2">
                <PhoneMissed className="w-4 h-4 text-rose-400" />
                <span>Estimated Unanswered / After-Hours Calls / Mo</span>
              </label>
              <span className="text-xs font-bold text-rose-400 bg-rose-950/80 px-2 py-0.5 rounded-lg border border-rose-800/60">
                {missedCallsPerMonth} calls
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="200"
              step="5"
              value={missedCallsPerMonth}
              onChange={e => setMissedCallsPerMonth(Number(e.target.value))}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-rose-500"
            />
            <div className="text-[11px] text-slate-400 mt-2 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-blue-400" />
              <span>AI RevenueOS text-backs missed callers within 5 seconds with 40% recovery benchmark.</span>
            </div>
          </div>
        </div>

        {/* Right Column: Calculated Impact Breakdown */}
        <div className="lg:col-span-5 flex flex-col justify-between p-6 sm:p-8 rounded-2xl bg-gradient-to-b from-blue-950/40 via-slate-900 to-slate-950 border border-blue-500/30 shadow-xl">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-blue-400 mb-1">
              Estimated Monthly Return
            </div>
            
            {/* Big Revenue Number */}
            <div className="text-3xl sm:text-4xl font-black text-white tracking-tight mb-1">
              +{formatPrice(potentialAdditionalMonthlyRevenue, currency)}
              <span className="text-xs text-slate-400 font-normal"> / mo</span>
            </div>
            <div className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5 mb-6">
              <TrendingUp className="w-4 h-4" />
              <span>+{formatPrice(potentialAnnualRevenue, currency)} projected annual run-rate</span>
            </div>

            {/* Impact Metric Cards */}
            <div className="space-y-3 mb-6">
              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
                <span className="text-xs text-slate-300">New Closed Clients / Mo</span>
                <span className="text-sm font-bold text-white">+{totalAdditionalCustomers} clients</span>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between">
                <span className="text-xs text-slate-300">AI RevenueOS Platform Cost</span>
                <span className="text-xs font-semibold text-slate-400">{formatPrice(monthlyCost, currency)} / mo</span>
              </div>

              <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-300">Net Profit Impact / Mo</span>
                <span className="text-sm font-black text-emerald-400">+{formatPrice(netMonthlyImpact, currency)}</span>
              </div>

              <div className="p-3 rounded-xl bg-blue-950/40 border border-blue-500/30 flex items-center justify-between">
                <span className="text-xs font-bold text-blue-300">Estimated ROI Multiple</span>
                <span className="text-sm font-black text-blue-400">{estimatedRoiPercent}% ROI</span>
              </div>
            </div>
          </div>

          <div>
            <button
              onClick={onBookDemo}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-blue-600/25 transition-all flex items-center justify-center gap-2 group cursor-pointer"
            >
              <span>Schedule Architecture Demo</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>

            <div className="text-[10px] text-slate-500 text-center mt-3">
              Calculations are conservative simulations based on industry lead-response benchmarks.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
