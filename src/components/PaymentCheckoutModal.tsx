import React, { useState, useEffect } from 'react';
import { 
  X, 
  ShieldCheck, 
  AlertCircle, 
  CheckCircle2, 
  Lock,
  Loader2,
  QrCode,
  CreditCard,
  Building
} from 'lucide-react';
import { CurrencyCode, formatPrice } from '../data/pricing.js';

interface PaymentCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  businessId: string;
  planId: string;
  planName: string;
  amount: number;
  currency: CurrencyCode;
  type: 'implementation_fee' | 'subscription' | 'add_payment_method';
  onSuccess: (result: any) => void;
}

export const PaymentCheckoutModal: React.FC<PaymentCheckoutModalProps> = ({
  isOpen,
  onClose,
  businessId,
  planId,
  planName,
  amount,
  currency = 'INR',
  type,
  onSuccess
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'details' | 'processing' | 'success'>('details');
  const [transactionDetails, setTransactionDetails] = useState<any>(null);

  useEffect(() => {
    setError(null);
    setStep('details');
  }, [isOpen, currency]);

  if (!isOpen) return null;

  const ensureRazorpayLoaded = (): Promise<boolean> => {
    return new Promise((resolve) => {
      if (typeof (window as any).Razorpay === 'function') {
        resolve(true);
        return;
      }
      const existing = document.querySelector('script[src*="checkout.razorpay.com"]');
      if (existing) {
        existing.addEventListener('load', () => resolve(true));
        setTimeout(() => resolve(typeof (window as any).Razorpay === 'function'), 1500);
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const getPaymentErrorMessage = (payload: any, fallback: string): string => {
    const candidates = [
      payload,
      payload?.error,
      payload?.message,
      payload?.description,
      payload?.error?.message,
      payload?.error?.description,
      payload?.error?.error,
      payload?.details
    ];

    for (const candidate of candidates) {
      if (typeof candidate === 'string' && candidate.trim()) {
        const message = candidate.trim();
        if (message !== '[object Object]') return message;
      }
    }

    return fallback;
  };

  const handleProcessPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // 1. Request Server Checkout Session
      const sessionRes = await fetch('/api/billing/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId,
          planId,
          type: type === 'add_payment_method' ? 'subscription' : type,
          currency,
          provider: 'razorpay'
        })
      });

      const sessionData = await sessionRes.json();
      if (!sessionRes.ok || !sessionData.orderId) {
        throw new Error(
          getPaymentErrorMessage(
            sessionData,
            'Payment service temporarily unavailable. Please try again.'
          )
        );
      }

      const orderId = sessionData.orderId;
      const rzpKey = sessionData.keyId || sessionData.payment?.raw?.key || '';

      const rzpReady = await ensureRazorpayLoaded();
      if (!rzpReady || typeof (window as any).Razorpay !== 'function') {
        throw new Error('Razorpay SDK failed to load. Please check your connection.');
      }

      const options = {
        key: rzpKey,
        amount: Math.round(Number(sessionData.amount ?? amount) * 100),
        currency: sessionData.currency || currency,
        name: 'AgentDesk',
        description: type === 'implementation_fee' 
          ? `${planName} Implementation Setup Fee` 
          : `${planName} Monthly Subscription`,
        order_id: orderId,
        theme: {
          color: '#2563EB'
        },
        modal: {
          ondismiss: () => {
            setLoading(false);
            setStep('details');
          }
        },
        handler: async (response: {
          razorpay_payment_id: string;
          razorpay_order_id: string;
          razorpay_signature: string;
        }) => {
          try {
            setStep('processing');
            const verifyRes = await fetch('/api/billing/verify-payment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                businessId,
                provider: 'razorpay',
                paymentId: response.razorpay_payment_id,
                orderId: response.razorpay_order_id || orderId,
                signature: response.razorpay_signature,
                type: type === 'add_payment_method' ? 'subscription' : type,
                planId,
                currency,
                amount
              })
            });

            const verifyData = await verifyRes.json();
            if (!verifyRes.ok || !verifyData.success) {
              throw new Error(
                getPaymentErrorMessage(
                  verifyData,
                  'Payment verification failed on server. Please try again.'
                )
              );
            }

            setTransactionDetails(verifyData);
            setStep('success');
            setTimeout(() => {
              onSuccess(verifyData);
            }, 1200);
          } catch (err: any) {
            setError(err.message || 'Payment verification failed');
            setStep('details');
          } finally {
            setLoading(false);
          }
        }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', (resp: any) => {
        setError(resp.error?.description || 'Payment was declined.');
        setStep('details');
        setLoading(false);
      });
      rzp.open();
    } catch (err: any) {
      setError(err.message || 'Payment transaction failed');
      setStep('details');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-lg rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl p-6 sm:p-8 text-white">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 mb-5 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <h2 className="text-lg font-black tracking-tight">
                {type === 'implementation_fee' && 'Pay Implementation Setup Fee'}
                {type === 'subscription' && `Subscribe to ${planName} Plan`}
                {type === 'add_payment_method' && 'Add Verified Payment Method'}
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Secure payment powered by Razorpay
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="p-3 mb-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {step === 'processing' && (
          <div className="py-12 text-center space-y-4">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-sm font-bold text-white">Verifying payment with Razorpay...</p>
            <p className="text-xs text-slate-400">Securing workspace activation and transaction logs...</p>
          </div>
        )}

        {step === 'success' && (
          <div className="py-8 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/40">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-white">Payment Verified & Activated!</h3>
            <p className="text-xs text-slate-300">
              Transaction ID: <span className="font-mono text-emerald-400">{transactionDetails?.transactionId || 'Verified'}</span>
            </p>
            <p className="text-[11px] text-slate-500">Updating tenant dashboard...</p>
          </div>
        )}

        {step === 'details' && (
          <form onSubmit={handleProcessPayment} className="space-y-5">
            {/* Amount Summary */}
            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
              <div>
                <div className="text-[10px] uppercase font-bold text-slate-400">
                  {type === 'implementation_fee' ? 'One-time Setup Fee' : 'Monthly Recurring Charge'}
                </div>
                <div className="text-xs font-semibold text-slate-200">{planName} Tier</div>
              </div>
              <div className="text-xl font-black text-white">
                {formatPrice(amount, currency)}
                <span className="text-xs text-slate-400 font-normal">
                  {type === 'subscription' ? '/mo' : ''}
                </span>
              </div>
            </div>

            {/* Razorpay Features Callout */}
            <div className="p-4 rounded-2xl bg-blue-950/30 border border-blue-800/40 space-y-2">
              <div className="text-xs font-bold text-white flex items-center justify-between">
                <span>Supported Payment Methods in Razorpay</span>
                <span className="text-[10px] text-blue-300 font-mono">
                  {currency} ({currency === 'INR' ? '₹' : currency === 'GBP' ? '£' : '$'})
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-[11px] text-slate-300 pt-1">
                <div className="flex items-center gap-1.5 bg-slate-900/60 p-2 rounded-xl border border-slate-800">
                  <QrCode className="w-3.5 h-3.5 text-blue-400" />
                  <span>Instant UPI QR</span>
                </div>
                <div className="flex items-center gap-1.5 bg-slate-900/60 p-2 rounded-xl border border-slate-800">
                  <CreditCard className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Cards / RuPay</span>
                </div>
                <div className="flex items-center gap-1.5 bg-slate-900/60 p-2 rounded-xl border border-slate-800">
                  <Building className="w-3.5 h-3.5 text-emerald-400" />
                  <span>NetBanking</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-blue-600/30 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Connecting to Razorpay...</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-3.5 h-3.5" />
                    <span>Pay {formatPrice(amount, currency)} with Razorpay</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
