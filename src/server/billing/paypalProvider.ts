import {
  PaymentProvider, PaymentProviderName, CreateCustomerParams, ProviderCustomer,
  CreatePaymentParams, ProviderPayment, VerifyPaymentParams, VerifyPaymentResult,
  CreateSubscriptionParams, ProviderSubscription, CreateInvoiceParams, ProviderInvoice,
  SafePaymentMethod, WebhookResult, ProviderHealthReport
} from './paymentProvider.js';
import { CurrencyCode } from '../../types.js';

type PayPalOrder = {
  id: string; status?: string; links?: Array<{ rel: string; href: string }>;
  purchase_units?: Array<{ amount?: { currency_code?: string; value?: string }; payments?: { captures?: Array<{ id?: string; status?: string; amount?: { currency_code?: string; value?: string } }> } }>;
};

export class PayPalProvider implements PaymentProvider {
  public name: PaymentProviderName = 'paypal';
  private clientId(): string { return (process.env.PAYPAL_CLIENT_ID || '').trim(); }
  private clientSecret(): string { return (process.env.PAYPAL_CLIENT_SECRET || '').trim(); }
  private baseUrl(): string { return (process.env.PAYPAL_MODE || 'live').toLowerCase() === 'sandbox' ? 'https://api-m.sandbox.paypal.com' : 'https://api-m.paypal.com'; }
  public isConfigured(): boolean { return Boolean(this.clientId() && this.clientSecret()); }
  public getPublicKey(): string { return this.clientId(); }
  public supportsCurrency(currency: CurrencyCode): boolean { return ['USD','GBP'].includes(String(currency).toUpperCase()) && this.isConfigured(); }
  public supportsRecurring(_currency: CurrencyCode): boolean { return false; }
  private async token(): Promise<string> {
    if (!this.isConfigured()) throw new Error('PayPal Live credentials are not configured.');
    const response = await fetch(`${this.baseUrl()}/v1/oauth2/token`, { method:'POST', headers:{ Authorization:`Basic ${Buffer.from(`${this.clientId()}${':'}${this.clientSecret()}`).toString('base64')}`, 'Content-Type':'application/x-www-form-urlencoded' }, body:'grant_type=client_credentials' });
    const data:any = await response.json().catch(()=>({}));
    if (!response.ok || !data.access_token) throw new Error('PayPal authentication failed.');
    return data.access_token;
  }
  private async api(path:string, init:RequestInit = {}):Promise<any> {
    const token = await this.token();
    const response = await fetch(`${this.baseUrl()}${path}`, { ...init, headers:{ Authorization:`Bearer ${token}`, 'Content-Type':'application/json', ...(init.headers || {}) } });
    const data:any = await response.json().catch(()=>({}));
    if (!response.ok) throw new Error(data.message || `PayPal request failed (${response.status}).`);
    return data;
  }
  public async createCustomer(params:CreateCustomerParams):Promise<ProviderCustomer> { return { id:params.email, email:params.email, name:params.name, phone:params.phone, provider:'paypal', createdAt:new Date().toISOString() }; }
  public async createPayment(params:CreatePaymentParams):Promise<ProviderPayment> {
    if (!this.supportsCurrency(params.currency)) throw new Error('PayPal supports configured USD and GBP checkout only.');
    const origin = (process.env.PUBLIC_APP_URL || process.env.APP_URL || '').replace(/\/$/,'');
    if (!origin) throw new Error('PUBLIC_APP_URL must be configured for PayPal return URLs.');
    const order = await this.api('/v2/checkout/orders', { method:'POST', headers:{ 'PayPal-Request-Id': `agentdesk-${params.businessId}-${Date.now()}` }, body:JSON.stringify({
      intent:'CAPTURE',
      purchase_units:[{ reference_id:params.businessId, custom_id:params.businessId, description:params.description.slice(0,127), amount:{ currency_code:params.currency, value:Number(params.amount).toFixed(2) }, invoice_id:`AD-${params.businessId}-${Date.now()}` }],
      application_context:{ brand_name:'AgentDesk', user_action:'PAY_NOW', return_url:`${origin}/?paypal=success`, cancel_url:`${origin}/?paypal=cancel` }
    }) }) as PayPalOrder;
    const approval = order.links?.find(link=>link.rel==='approve')?.href;
    if (!order.id || !approval) throw new Error('PayPal did not return an approval URL.');
    return { id:order.id, orderId:order.id, provider:'paypal', amount:params.amount, currency:params.currency, status:'pending', checkoutUrl:approval, raw:order };
  }
  public async verifyPayment(params:VerifyPaymentParams):Promise<VerifyPaymentResult> {
    const orderId = params.orderId || params.paymentId || '';
    if (!orderId) return { verified:false, paymentId:'', transactionId:'', status:'failed', message:'PayPal order ID is required.' };
    try {
      let order = await this.api(`/v2/checkout/orders/${encodeURIComponent(orderId)}`) as PayPalOrder;
      if (order.status !== 'COMPLETED') order = await this.api(`/v2/checkout/orders/${encodeURIComponent(orderId)}/capture`, { method:'POST', body:'{}' }) as PayPalOrder;
      const unit = order.purchase_units?.[0];
      const capture = unit?.payments?.captures?.find(item=>item.status==='COMPLETED');
      const actualCurrency = capture?.amount?.currency_code || unit?.amount?.currency_code;
      const actualAmount = Number(capture?.amount?.value || unit?.amount?.value);
      if (order.status !== 'COMPLETED' || !capture || actualCurrency !== params.currency || !Number.isFinite(actualAmount) || Math.round(actualAmount*100)!==Math.round(Number(params.amount)*100)) {
        return { verified:false, paymentId:capture?.id || orderId, transactionId:`PAY-PAYPAL-${orderId}`, status:'failed', message:'PayPal capture status, amount, or currency did not match the authorized checkout.' };
      }
      return { verified:true, paymentId:capture.id || orderId, transactionId:`PAY-PAYPAL-${capture.id || orderId}`, status:'paid', message:'PayPal order capture, amount, and currency verified.', raw:order };
    } catch {
      return { verified:false, paymentId:orderId, transactionId:`PAY-PAYPAL-${orderId}`, status:'failed', message:'PayPal payment verification failed on the server.' };
    }
  }
  public async handleWebhook(body:any, headers:Record<string,string|string[]|undefined>):Promise<WebhookResult> {
    const webhookId=(process.env.PAYPAL_WEBHOOK_ID||'').trim();
    if (!webhookId) return { handled:false, event:body?.event_type||'unknown', message:'PAYPAL_WEBHOOK_ID is not configured.' };
    const get=(name:string)=>{ const v=headers[name]; return Array.isArray(v)?v[0]:v; };
    try {
      const verification=await this.api('/v1/notifications/verify-webhook-signature',{method:'POST',body:JSON.stringify({
        auth_algo:get('paypal-auth-algo'), cert_url:get('paypal-cert-url'), transmission_id:get('paypal-transmission-id'),
        transmission_sig:get('paypal-transmission-sig'), transmission_time:get('paypal-transmission-time'),
        webhook_id:webhookId, webhook_event:body
      })});
      if (verification.verification_status!=='SUCCESS') return { handled:false, event:body?.event_type||'unknown', message:'PayPal webhook signature verification failed.' };
      const event=String(body?.event_type||'unknown');
      const resource=body?.resource||{};
      return { handled:true, event, paymentId:resource.id, status:event==='PAYMENT.CAPTURE.COMPLETED'?'paid':undefined, message:'Verified PayPal webhook received.' };
    } catch { return { handled:false, event:body?.event_type||'unknown', message:'PayPal webhook verification failed.' }; }
  }
  public async checkHealth():Promise<ProviderHealthReport> {
    const lastChecked=new Date().toISOString();
    if (!this.isConfigured()) return { provider:'paypal', status:'Configuration Required', isConfigured:false, message:'Set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET.', environment:(process.env.PAYPAL_MODE||'live'), lastChecked };
    try { await this.token(); return { provider:'paypal', status:'Connected', isConfigured:true, message:'PayPal API authentication succeeded.', environment:(process.env.PAYPAL_MODE||'live'), lastChecked }; }
    catch { return { provider:'paypal', status:'Authentication Failed', isConfigured:true, message:'PayPal API authentication failed.', environment:(process.env.PAYPAL_MODE||'live'), lastChecked }; }
  }
  private unsupported():never { throw new Error('This PayPal operation is not supported by the current one-time checkout integration.'); }
  public async createSubscription(_p:CreateSubscriptionParams):Promise<ProviderSubscription>{ return this.unsupported(); }
  public async getSubscription(_id:string):Promise<ProviderSubscription>{ return this.unsupported(); }
  public async updateSubscription(_id:string,_plan:string,_price?:number):Promise<ProviderSubscription>{ return this.unsupported(); }
  public async pauseSubscription(_id:string):Promise<ProviderSubscription>{ return this.unsupported(); }
  public async resumeSubscription(_id:string):Promise<ProviderSubscription>{ return this.unsupported(); }
  public async cancelSubscription(_id:string,_now?:boolean):Promise<ProviderSubscription>{ return this.unsupported(); }
  public async listPaymentMethods(_customerId:string,_businessId:string):Promise<SafePaymentMethod[]>{ return []; }
  public async setPrimaryPaymentMethod(_businessId:string,_paymentMethodId:string):Promise<boolean>{ return this.unsupported(); }
  public async removePaymentMethod(_businessId:string,_paymentMethodId:string):Promise<boolean>{ return this.unsupported(); }
  public async createInvoice(_p:CreateInvoiceParams):Promise<ProviderInvoice>{ return this.unsupported(); }
  public async getInvoice(_id:string):Promise<ProviderInvoice>{ return this.unsupported(); }
}
