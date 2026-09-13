import React from 'react';
import { 
  X, 
  Sparkles, 
  CheckCircle2, 
  ArrowRight, 
  Lock, 
  ShieldCheck,
  Zap,
  TrendingUp
} from 'lucide-react';
import { CurrencyCode, formatPrice, getPlanConfig } from '../data/pricing';

interface PlanUpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  featureName?: string;
  requiredPlanName?: string;
  currency?: CurrencyCode;
  onUpgradeClick?: () => void;
  currentPlanId?: string;
  featureReason?: string;
  targetPlanId?: string;
  onSelectPlan?: (newPlan: any) => void;
}

export const PlanUpgradeModal: React.FC<PlanUpgradeModalProps> = ({
  isOpen,
  onClose,
  featureName,
  requiredPlanName = 'AI RevenueOS Enterprise',
  currency = 'USD',
  onUpgradeClick,
  currentPlanId,
  featureReason,
  targetPlanId,
  onSelectPlan
}) => {
  if (!isOpen) return null;

  const targetPlanKey = (targetPlanId || 'enterprise').toLowerCase();
  const enterpriseConfig = getPlanConfig(targetPlanKey as any) || getPlanConfig('enterprise');
  const pricing = enterpriseConfig.pricing[currency] || enterpriseConfig.pricing.USD;
  const displayFeatureName = featureReason || featureName || 'Advanced Feature';
  const displayRequiredPlan = enterpriseConfig.name || requiredPlanName;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden">
        {/* Background glow */}
        <div className="absolute top-0 right-0 w-72 h-72 bg-blue-600/15 blur-3xl pointer-events-none rounded-full" />

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/30 text-blue-400 flex items-center justify-center mx-auto mb-3 shadow-inner">
            <Lock className="w-6 h-6" />
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Enterprise Feature Gate</span>
          </div>

          <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            Unlock {displayFeatureName}
          </h3>
          <p className="text-xs text-slate-300 mt-1.5 leading-relaxed max-w-sm mx-auto">
            <span className="font-semibold text-white">{displayFeatureName}</span> is included in the <span className="text-blue-400 font-bold">{displayRequiredPlan}</span> tier.
          </p>
        </div>

        {/* Value Box */}
        <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-3 mb-6">
          <div className="flex items-start gap-2.5 text-xs text-slate-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>Autonomous customer re-engagement & database reactivation engine.</span>
          </div>
          <div className="flex items-start gap-2.5 text-xs text-slate-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>Expanded 2,500 Voice Minutes + 2,500 SMS & WhatsApp channels.</span>
          </div>
          <div className="flex items-start gap-2.5 text-xs text-slate-300">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <span>Priority Enterprise SLA & Continuous AI Prompt Optimization.</span>
          </div>
        </div>

        {/* Pricing Summary */}
        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-blue-950/40 border border-blue-500/30 mb-6">
          <div>
            <div className="text-[10px] uppercase font-bold text-blue-300">Platform Fee</div>
            <div className="text-lg font-black text-white">
              {formatPrice(pricing.monthlyPrice, currency as CurrencyCode)} <span className="text-xs font-normal text-slate-400">/ mo</span>
            </div>
          </div>
          <div className="text-right text-[11px] text-slate-400">
            <div>+ {formatPrice(pricing.setupPrice, currency as CurrencyCode)} setup</div>
            <div className="text-emerald-400 font-semibold">Managed AI Operations</div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => {
              if (onSelectPlan) {
                onSelectPlan(targetPlanKey);
              }
              if (onUpgradeClick) {
                onUpgradeClick();
              }
              onClose();
            }}
            className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-blue-600/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Upgrade to {enterpriseConfig.name}</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <button
            onClick={onClose}
            className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-all cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
