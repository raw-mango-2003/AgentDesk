import React from 'react';
import { AgentDeskCheckout } from './AgentDeskCheckout';
import { CurrencyCode } from '../types';

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
      </div>
    </div>
  );
};
