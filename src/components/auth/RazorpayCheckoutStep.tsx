import React from 'react';
import { CurrencyCode } from '../../types';
import { AgentDeskCheckout } from '../AgentDeskCheckout';

export interface RazorpayCheckoutStepProps {
  planId: string;
  currency?: CurrencyCode;
  businessName?: string;
  tenantId?: string;
  fullName?: string;
  email?: string;
  phone?: string;
  onChangePlan?: () => void;
  onPaymentSuccess: (provisioned: { tenantId: string; businessName: string; planName: string }) => void;
  onError?: (error: string) => void;
}

export const RazorpayCheckoutStep: React.FC<RazorpayCheckoutStepProps> = ({
  planId,
  onPaymentSuccess
}) => {
  return (
    <div className="w-full max-w-2xl mx-auto py-6">
      <AgentDeskCheckout
        initialPlanId={planId || 'starter'}
        isModal={false}
        onSuccess={(provisioned) => {
          onPaymentSuccess({
            tenantId: provisioned.tenantId,
            businessName: provisioned.businessName,
            planName: provisioned.planName
          });
        }}
      />
    </div>
  );
};
