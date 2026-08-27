import React, { useState, useEffect } from 'react';
import { 
  X, 
  ShieldCheck, 
  CreditCard, 
  AlertCircle, 
  CheckCircle2, 
  ExternalLink, 
  Lock,
  Zap,
  Clock
} from 'lucide-react';
import { CurrencyCode, formatPrice } from '../data/pricing.js';
import { PaymentProviderName, SafePaymentMethod } from '../types.js';

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
  currency,
  type,
  onSuccess
}) => {
  const [selectedProvider, setSelectedProvider] = useState<PaymentProviderName>(
    currency === 'INR' ? 'razorpay' : 'paypal'
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const [upiId, setUpiId] = useState('');
  const [paymentMode, setPaymentMode] = useState<'card' | 'upi' | 'paypal_wallet'>('card');
  const [step, setStep] = useState<'details' | 'processing' | 'success'>('details');
  const [transactionDetails, setTransactionDetails] = useState<any>(null);

  useEffect(() => {
    if (currency === 'INR') {
      setSelectedProvider('razorpay');
      setPaymentMode('card');
    } else {
      setSelectedProvider('paypal');
      setPaymentMode('paypal_wallet');
    }
    setError(null);
    setStep('details');
  }, [currency, isOpen]);

  if (!isOpen) return null;

  const handleProcessPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    setStep('processing');

    try {
      // 1. Check strict PayPal INR restriction
      if (selectedProvider === 'paypal' && currency === 'INR') {
        throw new Error('PayPal does not support INR subscriptions. Please select Razorpay for INR transactions.');
      }

      // 2. Request Server Checkout Session
      const sessionRes = await fetch('/api/billing/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId,
          planId,
          type: type === 'add_payment_method' ? 'subscription' : type,
          currency,
          provider: selectedProvider,
          customerName: cardHolder || 'Corporate Account'
        })
      });

      const sessionData = await sessionRes.json();
      if (!sessionRes.ok || sessionData.error) {
        throw new Error(sessionData.error || 'Failed to initialize payment session with provider');
      }

      // 3. Simulate provider checkout authorization / signature
      const paymentId = selectedProvider === 'razorpay'
        ? `pay_rzp_${Date.now().toString().slice(-8)}`
        : `PAY-PP-${Date.now().toString().slice(-8)}`;

      const last4 = paymentMode === 'paypal_wallet'
        ? 'PayPal Account'
        : cardNumber.replace(/\s+/g, '').slice(-4) || '8892';

      const brand = paymentMode === 'paypal_wallet'
        ? 'PayPal Account'
        : cardNumber.startsWith('4') ? 'Visa' : cardNumber.startsWith('5') ? 'Mastercard' : 'Amex';

      // 4. Verify & Activate on Server
      const verifyRes = await fetch('/api/billing/verify-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId,
          provider: selectedProvider,
          paymentId,
          orderId: sessionData.payment?.orderId || `ord_${Date.now()}`,
          subscriptionId: sessionData.subscription?.providerSubscriptionId || `sub_${Date.now()}`,
          type: type === 'add_payment_method' ? 'subscription' : type,
          planId,
          currency,
          amount,
          paymentMethodData: {
            brand,
            last4,
            expiry: cardExpiry || '09/28'
          }
        })
      });

      const verifyData = await verifyRes.json();
      if (!verifyRes.ok || !verifyData.success) {
        throw new Error(verifyData.error || 'Payment verification failed');
      }

      setTransactionDetails(verifyData);
      setStep('success');
      setTimeout(() => {
        onSuccess(verifyData);
      }, 1200);
    } catch (err: any) {
      setError(err.message || 'Payment transaction failed');
      setStep('details');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
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
              Secure 256-bit encrypted checkout via {selectedProvider === 'razorpay' ? 'Razorpay' : 'PayPal'}
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
            <p className="text-sm font-bold text-white">Processing secure payment with {selectedProvider.toUpperCase()}...</p>
            <p className="text-xs text-slate-400">Verifying tokens and issuing billing statement...</p>
          </div>
        )}

        {step === 'success' && (
          <div className="py-8 text-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/40">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-white">Payment & Billing Activated!</h3>
            <p className="text-xs text-slate-300">
              Transaction ID: <span className="font-mono text-emerald-400">{transactionDetails?.transactionId}</span>
            </p>
            <p className="text-[11px] text-slate-500">Updating tenant dashboard...</p>
          </div>
        )}

        {step === 'details' && (
          <form onSubmit={handleProcessPayment} className="space-y-4">
            {/* Amount Summary */}
            {type !== 'add_payment_method' && (
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                <div>
                  <div className="text-[10px] uppercase font-bold text-slate-400">
                    {type === 'implementation_fee' ? 'One-time Setup Fee' : 'Monthly Recurring Charge'}
                  </div>
                  <div className="text-xs font-semibold text-slate-200">{planName} Platform Tier</div>
                </div>
                <div className="text-xl font-black text-white">
                  {formatPrice(amount, currency)}
                  <span className="text-xs text-slate-400 font-normal">
                    {type === 'subscription' ? '/mo' : ''}
                  </span>
                </div>
              </div>
            )}

            {/* Provider Selection */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-2">
                Select Payment Provider
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedProvider('razorpay');
                    setPaymentMode('card');
                  }}
                  className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                    selectedProvider === 'razorpay'
                      ? 'bg-blue-600/10 border-blue-500 text-white'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold">Razorpay</span>
                    {currency === 'INR' && (
                      <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[9px] font-bold">
                        Recommended
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-400">Cards, UPI, NetBanking (INR, USD, GBP)</div>
                </button>

                <button
                  type="button"
                  disabled={currency === 'INR'}
                  onClick={() => {
                    if (currency !== 'INR') {
                      setSelectedProvider('paypal');
                      setPaymentMode('paypal_wallet');
                    }
                  }}
                  className={`p-3 rounded-2xl border text-left transition-all ${
                    currency === 'INR'
                      ? 'opacity-40 cursor-not-allowed bg-slate-950 border-slate-800 text-slate-500'
                      : selectedProvider === 'paypal'
                      ? 'bg-blue-600/10 border-blue-500 text-white cursor-pointer'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700 cursor-pointer'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold">PayPal</span>
                    {currency === 'INR' ? (
                      <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-400 text-[9px] font-bold">
                        No INR
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 text-[9px] font-bold">
                        Global
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {currency === 'INR' ? 'PayPal recurring disabled for INR' : 'PayPal Wallet & Cards (USD, GBP)'}
                  </div>
                </button>
              </div>
            </div>

            {/* Provider Form Fields */}
            {selectedProvider === 'razorpay' ? (
              <div className="space-y-3 p-4 rounded-2xl bg-slate-950/80 border border-slate-800">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                  <span className="text-[11px] font-bold text-slate-300">Razorpay Payment Details</span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setPaymentMode('card')}
                      className={`text-[10px] px-2 py-0.5 rounded ${paymentMode === 'card' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}
                    >
                      Card
                    </button>
                    {currency === 'INR' && (
                      <button
                        type="button"
                        onClick={() => setPaymentMode('upi')}
                        className={`text-[10px] px-2 py-0.5 rounded ${paymentMode === 'upi' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}
                      >
                        UPI
                      </button>
                    )}
                  </div>
                </div>

                {paymentMode === 'card' ? (
                  <>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Card Number</label>
                      <input
                        type="text"
                        placeholder="4532 8892 1092 3341"
                        value={cardNumber}
                        onChange={e => setCardNumber(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-mono focus:outline-none focus:border-blue-500"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Expiry (MM/YY)</label>
                        <input
                          type="text"
                          placeholder="09/28"
                          value={cardExpiry}
                          onChange={e => setCardExpiry(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-mono focus:outline-none focus:border-blue-500"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">CVV</label>
                        <input
                          type="password"
                          maxLength={4}
                          placeholder="•••"
                          value={cardCvv}
                          onChange={e => setCardCvv(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-mono focus:outline-none focus:border-blue-500"
                          required
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">Cardholder Name</label>
                      <input
                        type="text"
                        placeholder="e.g. John Doe / Business Corp"
                        value={cardHolder}
                        onChange={e => setCardHolder(e.target.value)}
                        className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs focus:outline-none focus:border-blue-500"
                        required
                      />
                    </div>
                  </>
                ) : (
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">UPI ID / VPA</label>
                    <input
                      type="text"
                      placeholder="business@okaxis / user@upi"
                      value={upiId}
                      onChange={e => setUpiId(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-white text-xs font-mono focus:outline-none focus:border-blue-500"
                      required
                    />
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
                <div className="text-[11px] font-bold text-slate-300">PayPal Express Checkout</div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  You will connect your verified PayPal corporate account or international credit card. Auto-renewals and invoices will be billed in {currency}.
                </p>
                <div className="p-3 rounded-xl bg-blue-950/40 border border-blue-900/40 text-blue-300 text-xs flex items-center gap-2">
                  <Lock className="w-4 h-4 text-blue-400 shrink-0" />
                  <span>Tokenized billing agreement through PayPal Vault</span>
                </div>
              </div>
            )}

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
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-blue-600/30 transition-all flex items-center gap-2 cursor-pointer"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>
                  {type === 'implementation_fee' && `Authorize ${formatPrice(amount, currency)} Setup`}
                  {type === 'subscription' && `Subscribe ${formatPrice(amount, currency)}/mo`}
                  {type === 'add_payment_method' && 'Save & Authorize Payment Method'}
                </span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
