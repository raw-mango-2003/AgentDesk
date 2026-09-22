import React, { lazy, Suspense } from 'react';
import { CurrencyCode } from '../types';

const AgentDeskCheckout = lazy(() => import('./AgentDeskCheckout').then(module => ({ default: module.AgentDeskCheckout })));

export interface AgentDeskCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  planId: string;
  initialCurrency?: CurrencyCode;
  onWorkspaceCreatedAndActivated?: (tenantId: string) => void;
}

export const AgentDeskCheckoutModal: React.FC<AgentDeskCheckoutModalProps> = ({
  isOpen,
  onClose,
  planId,
  initialCurrency,
  onWorkspaceCreatedAndActivated
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto animate-fadeIn">
      <div className="relative w-full max-w-2xl my-auto">
        <Suspense fallback={<div className="min-h-[420px] flex items-center justify-center rounded-2xl bg-slate-950 border border-slate-800"><div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" /></div>}>
          <AgentDeskCheckout
          initialPlanId={planId}
          initialCurrency={initialCurrency}
          isModal={true}
          onClose={onClose}
          onSuccess={(provisioned) => {
            if (onWorkspaceCreatedAndActivated) {
              onWorkspaceCreatedAndActivated(provisioned.tenantId);
            }
          }}
          />
        </Suspense>
      </div>
    </div>
  );
};
