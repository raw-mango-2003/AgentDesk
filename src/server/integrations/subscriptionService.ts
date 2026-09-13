import { ISubscriptionService } from './interfaces.js';
import { serverBusinessesStore } from '../tenantRegistry.js';

export class SubscriptionService implements ISubscriptionService {
  constructor() {}

  public async createSubscription(
    planId: string,
    customerEmail: string,
    tenantId: string
  ): Promise<{ success: boolean; subscriptionId?: string; error?: string }> {
    const subId = `sub_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const tenant = serverBusinessesStore.get(tenantId);
    if (tenant) {
      tenant.subscriptionState = 'ACTIVE';
      tenant.planStatus = 'ACTIVE';
      tenant.plan = planId;
    }

    return {
      success: true,
      subscriptionId: subId
    };
  }

  public async cancelSubscription(subscriptionId: string): Promise<{ success: boolean; error?: string }> {
    for (const tenant of serverBusinessesStore.values()) {
      if (tenant.subscriptionState === 'ACTIVE') {
        tenant.subscriptionState = 'CANCELLED';
        return { success: true };
      }
    }
    return { success: true };
  }

  public async pauseSubscription(subscriptionId: string): Promise<{ success: boolean; error?: string }> {
    for (const tenant of serverBusinessesStore.values()) {
      tenant.subscriptionState = 'PAUSED';
      return { success: true };
    }
    return { success: true };
  }

  public async resumeSubscription(subscriptionId: string): Promise<{ success: boolean; error?: string }> {
    for (const tenant of serverBusinessesStore.values()) {
      tenant.subscriptionState = 'ACTIVE';
      return { success: true };
    }
    return { success: true };
  }

  public async handleWebhookEvent(event: string, payload: any): Promise<{ handled: boolean; action?: string; tenantId?: string }> {
    const entity = payload.subscription?.entity || payload.payment?.entity || {};
    const notes = entity.notes || {};
    const tenantId = notes.tenantId || notes.businessId;

    switch (event) {
      case 'subscription.authenticated':
      case 'subscription.activated': {
        if (tenantId) {
          const tenant = serverBusinessesStore.get(tenantId);
          if (tenant) {
            tenant.subscriptionState = 'ACTIVE';
            tenant.planStatus = 'ACTIVE';
          }
        }
        return { handled: true, action: 'activated', tenantId };
      }

      case 'subscription.charged': {
        if (tenantId) {
          const tenant = serverBusinessesStore.get(tenantId);
          if (tenant) {
            tenant.subscriptionState = 'ACTIVE';
          }
        }
        return { handled: true, action: 'charged', tenantId };
      }

      case 'subscription.cancelled': {
        if (tenantId) {
          const tenant = serverBusinessesStore.get(tenantId);
          if (tenant) {
            tenant.subscriptionState = 'CANCELLED';
          }
        }
        return { handled: true, action: 'cancelled', tenantId };
      }

      case 'subscription.paused': {
        if (tenantId) {
          const tenant = serverBusinessesStore.get(tenantId);
          if (tenant) {
            tenant.subscriptionState = 'PAUSED';
          }
        }
        return { handled: true, action: 'paused', tenantId };
      }

      case 'subscription.resumed': {
        if (tenantId) {
          const tenant = serverBusinessesStore.get(tenantId);
          if (tenant) {
            tenant.subscriptionState = 'ACTIVE';
          }
        }
        return { handled: true, action: 'resumed', tenantId };
      }

      default:
        return { handled: false };
    }
  }
}
