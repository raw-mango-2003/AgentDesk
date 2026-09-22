import { EmailTemplateName } from './interfaces.js';

export interface RenderedEmail {
  subject: string;
  html: string;
  text: string;
}

export function sanitizeHtml(str: any): string {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export const OFFICIAL_SUPPORT_EMAIL = 'hello.agentdesktech@gmail.com';

function baseLayout(title: string, contentHtml: string, appUrl: string = 'https://agentdesk.ai'): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${sanitizeHtml(title)}</title>
  <style>
    body { margin: 0; padding: 0; background-color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f8fafc; }
    .wrapper { width: 100%; max-width: 600px; margin: 0 auto; background-color: #1e293b; border: 1px solid #334155; border-radius: 12px; overflow: hidden; }
    .header { background-color: #090d16; padding: 24px 32px; border-bottom: 1px solid #334155; text-align: left; }
    .logo { font-size: 20px; font-weight: 800; color: #38bdf8; letter-spacing: -0.5px; text-decoration: none; }
    .content { padding: 32px; font-size: 15px; line-height: 1.6; color: #cbd5e1; }
    .content h1 { color: #ffffff; font-size: 20px; margin-top: 0; margin-bottom: 16px; }
    .content p { margin: 0 0 16px 0; }
    .btn-container { margin: 28px 0; text-align: center; }
    .btn { display: inline-block; background-color: #2563eb; color: #ffffff !important; padding: 12px 28px; border-radius: 8px; font-weight: 600; text-decoration: none; font-size: 14px; }
    .info-box { background-color: #0f172a; border: 1px solid #334155; border-radius: 8px; padding: 16px; margin: 20px 0; font-size: 14px; }
    .security-notice { font-size: 12px; color: #94a3b8; border-top: 1px solid #334155; margin-top: 32px; padding-top: 16px; }
    .footer { background-color: #090d16; padding: 20px 32px; font-size: 12px; color: #64748b; text-align: center; border-top: 1px solid #1e293b; }
    .footer a { color: #38bdf8; text-decoration: none; }
  </style>
</head>
<body>
  <div style="padding: 24px 12px;">
    <div class="wrapper">
      <div class="header">
        <span class="logo">AgentDesk</span>
      </div>
      <div class="content">
        ${contentHtml}
        <div class="security-notice">
          <strong>Security Notice:</strong> AgentDesk will never ask for your private password or full payment secrets over email. If you did not request this action, please secure your account immediately or contact <a href="mailto:${OFFICIAL_SUPPORT_EMAIL}" style="color: #38bdf8;">${OFFICIAL_SUPPORT_EMAIL}</a>.
        </div>
      </div>
      <div class="footer">
        &copy; ${new Date().getFullYear()} AgentDesk Technologies Inc. All rights reserved.<br>
        Official Support & Notifications: <a href="mailto:${OFFICIAL_SUPPORT_EMAIL}">${OFFICIAL_SUPPORT_EMAIL}</a><br>
        <a href="${appUrl}">agentdesk.ai</a> &bull; Enterprise AI Revenue & Operations Platform
      </div>
    </div>
  </div>
</body>
</html>`;
}

export function renderEmailTemplate(
  template: EmailTemplateName,
  data: Record<string, any>,
  appUrl: string = 'https://agentdesk.ai'
): RenderedEmail {
  const name = data.name || data.customerName || 'AgentDesk Member';
  const tenantName = data.businessName || data.tenantName || 'your business';

  switch (template) {
    // ------------------------------------------------------------------------
    // AUTHENTICATION TEMPLATES
    // ------------------------------------------------------------------------
    case 'verify_email': {
      const verifyUrl = data.verifyUrl || `${appUrl}/verify-email?token=${data.token}`;
      return {
        subject: 'Verify your AgentDesk email address',
        html: baseLayout('Verify your email', `
          <h1>Verify your email address</h1>
          <p>Hello ${name},</p>
          <p>Thank you for creating an account with AgentDesk. Please confirm your email address by clicking the button below:</p>
          <div class="btn-container">
            <a href="${verifyUrl}" class="btn">Verify Email Address</a>
          </div>
          <p>This verification link will expire in 24 hours. Alternatively, copy and paste this link into your browser:</p>
          <div class="info-box" style="word-break: break-all;">${verifyUrl}</div>
        `, appUrl),
        text: `Hello ${name},\n\nPlease verify your email for AgentDesk by visiting:\n${verifyUrl}\n\nThis link will expire in 24 hours.`
      };
    }

    case 'welcome': {
      const loginUrl = `${appUrl}/login`;
      return {
        subject: 'Welcome to AgentDesk — AI Revenue & Operations Platform',
        html: baseLayout('Welcome to AgentDesk', `
          <h1>Welcome to AgentDesk, ${name}!</h1>
          <p>Your workspace is active and your AI Receptionist & Revenue Engine is ready for deployment.</p>
          <div class="info-box">
            <strong>Workspace:</strong> ${tenantName}<br>
            <strong>Plan:</strong> ${data.plan || 'Growth Plan'}<br>
            <strong>Primary Login:</strong> ${data.email}
          </div>
          <div class="btn-container">
            <a href="${loginUrl}" class="btn">Go to Dashboard</a>
          </div>
          <p>Next steps: Configure your business hours, train your knowledge base, and embed your AI agent snippet.</p>
        `, appUrl),
        text: `Welcome to AgentDesk, ${name}!\n\nYour workspace (${tenantName}) is active. Sign in here: ${loginUrl}`
      };
    }

    case 'password_reset': {
      const resetUrl = data.resetUrl || `${appUrl}/reset-password?token=${data.token}`;
      return {
        subject: 'Reset your AgentDesk password',
        html: baseLayout('Password Reset Request', `
          <h1>Password Reset Request</h1>
          <p>Hello ${name},</p>
          <p>We received a request to reset the password associated with your account (${data.email}).</p>
          <div class="btn-container">
            <a href="${resetUrl}" class="btn">Reset My Password</a>
          </div>
          <p>This single-use link will expire in <strong>1 hour</strong>. If you did not initiate this request, you can safely disregard this email—your account remains secure.</p>
          <div class="info-box" style="word-break: break-all;">${resetUrl}</div>
        `, appUrl),
        text: `Hello ${name},\n\nReset your AgentDesk password here: ${resetUrl}\nThis single-use link expires in 1 hour.`
      };
    }

    case 'password_changed': {
      return {
        subject: 'Security Alert: Your AgentDesk password was changed',
        html: baseLayout('Password Changed', `
          <h1>Your password has been changed</h1>
          <p>Hello ${name},</p>
          <p>The password for your AgentDesk account (${data.email}) was successfully updated on <strong>${new Date().toUTCString()}</strong>.</p>
          <p>All previous active sessions have been terminated for your security.</p>
          <p>If you did not perform this change, contact platform security immediately at <a href="mailto:security@agentdesk.ai" style="color: #38bdf8;">security@agentdesk.ai</a>.</p>
        `, appUrl),
        text: `Hello ${name},\n\nYour AgentDesk password was successfully updated on ${new Date().toUTCString()}.\nIf you did not make this change, contact security@agentdesk.ai immediately.`
      };
    }

    case 'email_changed': {
      return {
        subject: 'Security Alert: Your AgentDesk account email was changed',
        html: baseLayout('Email Address Changed', `
          <h1>Account Email Updated</h1>
          <p>Hello ${name},</p>
          <p>The email address for your AgentDesk account has been changed from <strong>${data.oldEmail}</strong> to <strong>${data.newEmail}</strong>.</p>
          <p>All future notifications and login sessions will utilize your new email address.</p>
        `, appUrl),
        text: `Hello ${name},\n\nYour AgentDesk login email was changed from ${data.oldEmail} to ${data.newEmail}.`
      };
    }

    case 'new_login':
    case 'new_device_login': {
      return {
        subject: 'New login detected on your AgentDesk account',
        html: baseLayout('New Login Detected', `
          <h1>New Login Detected</h1>
          <p>Hello ${name},</p>
          <p>A new login session was established for your account (${data.email}):</p>
          <div class="info-box">
            <strong>Time:</strong> ${new Date().toUTCString()}<br>
            <strong>IP Address:</strong> ${data.ip || 'Unknown'}<br>
            <strong>Device / Browser:</strong> ${data.userAgent || 'Web Browser'}
          </div>
          <p>If this was you, you can ignore this message. If you do not recognize this activity, please revoke active sessions in your Security Settings.</p>
        `, appUrl),
        text: `Hello ${name},\n\nNew login detected for ${data.email} from IP: ${data.ip || 'Unknown'} at ${new Date().toUTCString()}.`
      };
    }

    case 'suspicious_login': {
      return {
        subject: 'URGENT: Suspicious login attempt blocked',
        html: baseLayout('Suspicious Login Attempt', `
          <h1 style="color: #f87171;">Suspicious Login Attempt Detected</h1>
          <p>Hello ${name},</p>
          <p>We detected an anomalous login attempt from an unverified location or multiple failed password attempts.</p>
          <div class="info-box">
            <strong>Attempt IP:</strong> ${data.ip || 'Unknown'}<br>
            <strong>Timestamp:</strong> ${new Date().toUTCString()}
          </div>
          <p>As a precaution, two-factor challenge or temporary lockout has been triggered.</p>
        `, appUrl),
        text: `Suspicious login attempt detected on your account from IP ${data.ip || 'Unknown'}. Please review your security settings.`
      };
    }

    case 'account_locked': {
      return {
        subject: 'Security Alert: Your AgentDesk account has been temporarily locked',
        html: baseLayout('Account Locked', `
          <h1 style="color: #f87171;">Account Temporarily Locked</h1>
          <p>Hello ${name},</p>
          <p>Due to multiple consecutive failed sign-in attempts, your account has been locked for 15 minutes to prevent unauthorized access.</p>
          <p>You can wait for the lockout window to expire, or use the password reset link to unlock your account immediately.</p>
        `, appUrl),
        text: `Your AgentDesk account has been temporarily locked due to repeated failed login attempts.`
      };
    }

    case 'account_unlocked': {
      return {
        subject: 'Your AgentDesk account has been unlocked',
        html: baseLayout('Account Unlocked', `
          <h1>Account Unlocked</h1>
          <p>Hello ${name},</p>
          <p>Your AgentDesk account has been restored and unlocked. You may now sign in using your credentials.</p>
        `, appUrl),
        text: `Your AgentDesk account has been unlocked. You may now sign in.`
      };
    }

    case 'session_revoked': {
      return {
        subject: 'Security Notice: Session Revoked',
        html: baseLayout('Session Revoked', `
          <h1>Session Terminated</h1>
          <p>Hello ${name},</p>
          <p>One or more of your active AgentDesk sessions were revoked from your security management dashboard.</p>
        `, appUrl),
        text: `One or more of your active AgentDesk sessions were revoked.`
      };
    }

    case 'new_lead_received': {
      const requirement = data.requirement || data.message || 'No requirement provided';
      const dashboardUrl = data.dashboardUrl || appUrl + '/dashboard/leads';
      return {
        subject: 'New Lead Received: ' + name,
        html: baseLayout('New Lead Received', `
          <h1>New customer enquiry received</h1>
          <p>A visitor has submitted their details through your AgentDesk AI receptionist.</p>
          <div class="info-box">
            <strong>Name:</strong> ${sanitizeHtml(name)}<br>
            <strong>Email:</strong> ${sanitizeHtml(data.leadEmail || data.email || 'Not provided')}<br>
            <strong>Phone:</strong> ${sanitizeHtml(data.leadPhone || data.phone || 'Not provided')}<br>
            <strong>Lead Score:</strong> ${sanitizeHtml(data.score ?? 'Not scored')}<br>
            <strong>Source:</strong> ${sanitizeHtml(data.source || 'Website Chat')}<br>
            <strong>Requirement:</strong> ${sanitizeHtml(requirement)}
          </div>
          <div class="btn-container"><a href="${dashboardUrl}" class="btn">View Lead in AgentDesk</a></div>
        `, appUrl),
        text: 'New customer enquiry received. Name: ' + name + '. Email: ' + (data.leadEmail || data.email || 'Not provided') + '. Phone: ' + (data.leadPhone || data.phone || 'Not provided') + '. Lead score: ' + (data.score ?? 'Not scored') + '. Requirement: ' + requirement + '. View: ' + dashboardUrl
      };
    }

    // ------------------------------------------------------------------------
    // BUSINESS OWNER TEMPLATES
    // ------------------------------------------------------------------------
    case 'business_account_created':
    case 'business_account_setup':
    case 'temporary_credential_setup': {
      const setupUrl = data.setupUrl || (data.token ? `${appUrl}/setup-account?token=${data.token}` : `${appUrl}/login`);
      return {
        subject: `Welcome to AgentDesk — Setup your workspace for ${tenantName}`,
        html: baseLayout('Workspace Setup', `
          <h1>Welcome to AgentDesk</h1>
          <p>Hello ${name},</p>
          <p>Your administrator has provisioned a dedicated business workspace for <strong>${tenantName}</strong>.</p>
          <div class="info-box">
            <strong>Workspace ID:</strong> ${data.tenantId || 'Active'}<br>
            <strong>Login Email:</strong> ${data.email}<br>
            ${data.temporaryPassword ? `<strong>Temporary Password:</strong> <code style="color: #fde047; font-size: 15px;">${data.temporaryPassword}</code><br><span style="font-size: 11px; color: #94a3b8;">(You will be required to choose a new password upon first sign in.)</span>` : ''}
          </div>
          <div class="btn-container">
            <a href="${setupUrl}" class="btn">Access Your Workspace</a>
          </div>
          <p>Please secure your credentials promptly.</p>
        `, appUrl),
        text: `Welcome to AgentDesk!\n\nYour workspace (${tenantName}) is ready.\nLogin: ${data.email}\nSetup link: ${setupUrl}`
      };
    }

    case 'first_login': {
      return {
        subject: `First login confirmed for ${tenantName}`,
        html: baseLayout('First Login Confirmed', `
          <h1>Welcome aboard, ${name}!</h1>
          <p>You have successfully logged in and completed first-time setup for <strong>${tenantName}</strong>.</p>
          <p>Our AI specialists and live dashboards are now ready to capture leads and handle operations.</p>
        `, appUrl),
        text: `First login confirmed for ${tenantName}. Welcome to AgentDesk!`
      };
    }

    case 'business_owner_invited': {
      const inviteUrl = data.inviteUrl || `${appUrl}/login`;
      return {
        subject: `You've been invited to manage ${tenantName} on AgentDesk`,
        html: baseLayout('Workspace Invitation', `
          <h1>You have been invited</h1>
          <p>Hello ${name},</p>
          <p>You have been invited to join the workspace for <strong>${tenantName}</strong> as a <strong>${data.role || 'Business Administrator'}</strong>.</p>
          <div class="btn-container">
            <a href="${inviteUrl}" class="btn">Accept Invitation</a>
          </div>
        `, appUrl),
        text: `You have been invited to manage ${tenantName} on AgentDesk.\nAccept here: ${inviteUrl}`
      };
    }

    case 'business_owner_role_changed': {
      return {
        subject: `Your AgentDesk role has been updated for ${tenantName}`,
        html: baseLayout('Role Updated', `
          <h1>Role Permission Updated</h1>
          <p>Hello ${name},</p>
          <p>Your permission level in <strong>${tenantName}</strong> has been updated to <strong>${data.newRole || 'BUSINESS_ADMIN'}</strong>.</p>
        `, appUrl),
        text: `Your role for ${tenantName} was updated to ${data.newRole}.`
      };
    }

    case 'business_owner_removed': {
      return {
        subject: `Notice: Access to ${tenantName} on AgentDesk has been revoked`,
        html: baseLayout('Access Revoked', `
          <h1>Workspace Access Removed</h1>
          <p>Hello ${name},</p>
          <p>Your user profile has been unlinked from <strong>${tenantName}</strong> by an administrator.</p>
        `, appUrl),
        text: `Your access to ${tenantName} on AgentDesk has been revoked.`
      };
    }

    // ------------------------------------------------------------------------
    // PAYMENTS TEMPLATES
    // ------------------------------------------------------------------------
    case 'payment_successful':
    case 'payment_receipt': {
      return {
        subject: `Payment Receipt: ${data.currency || '$'}${data.amount} — AgentDesk`,
        html: baseLayout('Payment Receipt', `
          <h1>Payment Successful</h1>
          <p>Hello ${name},</p>
          <p>Thank you for your business. We have successfully processed your payment for <strong>${tenantName}</strong>.</p>
          <div class="info-box">
            <strong>Payment ID:</strong> ${data.paymentId || 'N/A'}<br>
            <strong>Order ID:</strong> ${data.orderId || 'N/A'}<br>
            <strong>Amount Paid:</strong> ${data.currency || 'USD'} ${data.amount}<br>
            <strong>Date:</strong> ${new Date().toUTCString()}<br>
            <strong>Plan / Item:</strong> ${data.planName || data.description || 'AgentDesk Subscription'}
          </div>
          <p>Your account features are fully active and quota limits updated.</p>
        `, appUrl),
        text: `Payment Receipt\nAmount: ${data.currency} ${data.amount}\nPayment ID: ${data.paymentId}\nWorkspace: ${tenantName}`
      };
    }

    case 'payment_initiated': {
      return {
        subject: `Checkout Initiated for ${tenantName}`,
        html: baseLayout('Payment Initiated', `
          <h1>Payment Order Generated</h1>
          <p>Hello ${name},</p>
          <p>An order of ${data.currency} ${data.amount} has been initiated for <strong>${tenantName}</strong>. Please complete checkout to activate services.</p>
        `, appUrl),
        text: `Checkout initiated for ${tenantName}: ${data.currency} ${data.amount}.`
      };
    }

    case 'payment_failed': {
      const retryUrl = `${appUrl}/dashboard`;
      return {
        subject: `Action Required: Payment failed for ${tenantName}`,
        html: baseLayout('Payment Failed', `
          <h1 style="color: #f87171;">Payment Unsuccessful</h1>
          <p>Hello ${name},</p>
          <p>We were unable to process your payment of <strong>${data.currency || 'USD'} ${data.amount}</strong> for <strong>${tenantName}</strong>.</p>
          <div class="info-box">
            <strong>Reason:</strong> ${data.failureReason || 'Card declined or payment session expired.'}<br>
            <strong>Attempt Date:</strong> ${new Date().toUTCString()}
          </div>
          <div class="btn-container">
            <a href="${retryUrl}" class="btn">Update Payment Method</a>
          </div>
          <p>Please update your billing details to maintain uninterrupted AI service availability.</p>
        `, appUrl),
        text: `Payment failed for ${tenantName}: ${data.currency} ${data.amount}. Reason: ${data.failureReason}. Please update billing at ${retryUrl}.`
      };
    }

    case 'payment_cancelled': {
      return {
        subject: `Payment cancelled for ${tenantName}`,
        html: baseLayout('Payment Cancelled', `
          <h1>Payment Cancelled</h1>
          <p>Hello ${name},</p>
          <p>The checkout session for <strong>${tenantName}</strong> was cancelled. No charges were incurred.</p>
        `, appUrl),
        text: `Payment session cancelled for ${tenantName}. No charges were made.`
      };
    }

    case 'payment_refund': {
      return {
        subject: `Refund Processed: ${data.currency} ${data.amount} — AgentDesk`,
        html: baseLayout('Payment Refund', `
          <h1>Refund Confirmation</h1>
          <p>Hello ${name},</p>
          <p>A refund of <strong>${data.currency} ${data.amount}</strong> has been issued for transaction <strong>${data.paymentId}</strong>.</p>
          <p>It may take 5–10 business days for the funds to reflect in your bank or card account.</p>
        `, appUrl),
        text: `Refund processed: ${data.currency} ${data.amount} for payment ${data.paymentId}.`
      };
    }

    case 'invoice_generated': {
      return {
        subject: `New Invoice #${data.invoiceNumber || 'INV-001'} for ${tenantName}`,
        html: baseLayout('Invoice Generated', `
          <h1>New Invoice Available</h1>
          <p>Hello ${name},</p>
          <p>Invoice <strong>#${data.invoiceNumber || 'INV-001'}</strong> for <strong>${data.currency} ${data.amount}</strong> has been generated for ${tenantName}.</p>
        `, appUrl),
        text: `New invoice #${data.invoiceNumber} for ${tenantName}: ${data.currency} ${data.amount}.`
      };
    }

    // ------------------------------------------------------------------------
    // SUBSCRIPTION TEMPLATES
    // ------------------------------------------------------------------------
    case 'subscription_activated': {
      return {
        subject: `Subscription Activated: ${data.planName || 'Growth Plan'} — AgentDesk`,
        html: baseLayout('Subscription Activated', `
          <h1>Your Subscription is Live!</h1>
          <p>Hello ${name},</p>
          <p>Your subscription to the <strong>${data.planName || 'Growth Plan'}</strong> for <strong>${tenantName}</strong> is now active.</p>
          <div class="info-box">
            <strong>Billing Cycle:</strong> Monthly<br>
            <strong>Next Renewal:</strong> ${data.nextBillingDate || '30 days from today'}<br>
            <strong>Included AI Quotas:</strong> Active
          </div>
        `, appUrl),
        text: `Subscription activated for ${tenantName}: ${data.planName}. Next renewal: ${data.nextBillingDate}.`
      };
    }

    case 'subscription_renewal': {
      return {
        subject: `Upcoming Subscription Renewal: ${tenantName}`,
        html: baseLayout('Subscription Renewal', `
          <h1>Upcoming Renewal Notice</h1>
          <p>Hello ${name},</p>
          <p>Your AgentDesk subscription for <strong>${tenantName}</strong> is scheduled to renew on <strong>${data.renewalDate || 'in 3 days'}</strong>.</p>
        `, appUrl),
        text: `Subscription renewal notice for ${tenantName}. Renewal date: ${data.renewalDate}.`
      };
    }

    case 'subscription_payment_successful': {
      return {
        subject: `Subscription payment received — ${tenantName}`,
        html: baseLayout('Subscription Payment', `
          <h1>Subscription Renewed Successfully</h1>
          <p>Hello ${name},</p>
          <p>We received your recurring payment of <strong>${data.currency} ${data.amount}</strong> for ${tenantName}.</p>
        `, appUrl),
        text: `Subscription renewed for ${tenantName}: ${data.currency} ${data.amount}.`
      };
    }

    case 'subscription_payment_failed':
    case 'subscription_past_due': {
      return {
        subject: `URGENT: Subscription past due for ${tenantName}`,
        html: baseLayout('Subscription Past Due', `
          <h1 style="color: #f87171;">Subscription Payment Past Due</h1>
          <p>Hello ${name},</p>
          <p>We were unable to charge your payment method for the current billing cycle of <strong>${tenantName}</strong>.</p>
          <p>Please update your payment method to avoid service interruption for your AI agents.</p>
        `, appUrl),
        text: `URGENT: Subscription payment past due for ${tenantName}. Please update your payment method.`
      };
    }

    case 'subscription_cancelled': {
      return {
        subject: `Subscription Cancelled: ${tenantName}`,
        html: baseLayout('Subscription Cancelled', `
          <h1>Subscription Cancellation Confirmed</h1>
          <p>Hello ${name},</p>
          <p>Your subscription for <strong>${tenantName}</strong> has been cancelled. Your workspace will remain accessible until <strong>${data.accessUntil || 'the end of the current billing cycle'}</strong>.</p>
        `, appUrl),
        text: `Subscription cancelled for ${tenantName}. Access active until ${data.accessUntil}.`
      };
    }

    case 'subscription_paused': {
      return {
        subject: `Subscription Paused: ${tenantName}`,
        html: baseLayout('Subscription Paused', `
          <h1>Subscription Paused</h1>
          <p>Hello ${name},</p>
          <p>Your subscription for <strong>${tenantName}</strong> has been paused. You can resume at any time from your Billing Dashboard.</p>
        `, appUrl),
        text: `Subscription paused for ${tenantName}.`
      };
    }

    case 'subscription_resumed': {
      return {
        subject: `Subscription Resumed: ${tenantName}`,
        html: baseLayout('Subscription Resumed', `
          <h1>Subscription Resumed</h1>
          <p>Hello ${name},</p>
          <p>Your subscription for <strong>${tenantName}</strong> is once again active. All agent services and integrations are restored.</p>
        `, appUrl),
        text: `Subscription resumed for ${tenantName}.`
      };
    }

    case 'subscription_expired': {
      return {
        subject: `Subscription Expired: ${tenantName}`,
        html: baseLayout('Subscription Expired', `
          <h1>Subscription Expired</h1>
          <p>Hello ${name},</p>
          <p>Your subscription period for <strong>${tenantName}</strong> has concluded. Renew anytime to restore full automation capabilities.</p>
        `, appUrl),
        text: `Subscription expired for ${tenantName}. Renew to restore features.`
      };
    }

    case 'subscription_upgrade': {
      return {
        subject: `Plan Upgraded to ${data.newPlan || 'Enterprise'} — ${tenantName}`,
        html: baseLayout('Plan Upgraded', `
          <h1>Plan Upgrade Successful</h1>
          <p>Hello ${name},</p>
          <p>Your workspace <strong>${tenantName}</strong> has been upgraded to <strong>${data.newPlan || 'Enterprise Plan'}</strong>.</p>
        `, appUrl),
        text: `Plan upgraded to ${data.newPlan} for ${tenantName}.`
      };
    }

    case 'subscription_downgrade': {
      return {
        subject: `Plan Change Notice: ${tenantName}`,
        html: baseLayout('Plan Change', `
          <h1>Plan Downgrade Scheduled</h1>
          <p>Hello ${name},</p>
          <p>Your workspace <strong>${tenantName}</strong> has been scheduled to transition to the <strong>${data.newPlan}</strong> plan at the end of the billing period.</p>
        `, appUrl),
        text: `Plan downgrade scheduled to ${data.newPlan} for ${tenantName}.`
      };
    }

    // ------------------------------------------------------------------------
    // ACCOUNT & SECURITY TEMPLATES
    // ------------------------------------------------------------------------
    case 'account_suspended': {
      return {
        subject: `URGENT: Workspace suspended for ${tenantName}`,
        html: baseLayout('Account Suspended', `
          <h1 style="color: #f87171;">Workspace Suspended</h1>
          <p>Hello ${name},</p>
          <p>Your workspace <strong>${tenantName}</strong> has been suspended. Reason: <strong>${data.reason || 'Policy violation or outstanding billing balance.'}</strong></p>
          <p>Please contact <a href="mailto:support@agentdesk.ai" style="color: #38bdf8;">support@agentdesk.ai</a> to resolve this matter.</p>
        `, appUrl),
        text: `Workspace ${tenantName} suspended. Reason: ${data.reason}. Contact support@agentdesk.ai.`
      };
    }

    case 'account_restored': {
      return {
        subject: `Workspace Restored: ${tenantName}`,
        html: baseLayout('Account Restored', `
          <h1>Workspace Restored</h1>
          <p>Hello ${name},</p>
          <p>Your workspace <strong>${tenantName}</strong> has been reactivated. All services are running normally.</p>
        `, appUrl),
        text: `Workspace ${tenantName} restored. All services active.`
      };
    }

    case 'account_deleted': {
      return {
        subject: `Account Deletion Confirmation — AgentDesk`,
        html: baseLayout('Account Deleted', `
          <h1>Account Deleted</h1>
          <p>Hello ${name},</p>
          <p>Your AgentDesk user account and associated personal identifiers have been deleted in compliance with data privacy standards.</p>
        `, appUrl),
        text: `Your AgentDesk user account has been deleted.`
      };
    }

    case 'account_deletion_requested': {
      return {
        subject: `Account Deletion Requested — Action Required`,
        html: baseLayout('Account Deletion Requested', `
          <h1>Account Deletion Pending</h1>
          <p>Hello ${name},</p>
          <p>A request has been initiated to permanently delete your account (${data.email}).</p>
          <p>A grace period of <strong>7 days</strong> applies. If you did not make this request, cancel immediately from your Security Settings.</p>
        `, appUrl),
        text: `Account deletion requested for ${data.email}. 7 day grace period applies.`
      };
    }

    case 'account_export_ready': {
      const downloadUrl = data.downloadUrl || `${appUrl}/dashboard`;
      return {
        subject: `Your AgentDesk Data Export is Ready`,
        html: baseLayout('Data Export Ready', `
          <h1>Data Export Package Ready</h1>
          <p>Hello ${name},</p>
          <p>Your requested archive for <strong>${tenantName}</strong> has been generated successfully.</p>
          <div class="btn-container">
            <a href="${downloadUrl}" class="btn">Download Export Package</a>
          </div>
          <p>This secure download link is valid for <strong>24 hours</strong>.</p>
        `, appUrl),
        text: `Your AgentDesk data export for ${tenantName} is ready for download: ${downloadUrl} (valid for 24 hours).`
      };
    }

    case '2fa_enabled': {
      return {
        subject: `Security Alert: Two-Factor Authentication Enabled`,
        html: baseLayout('2FA Enabled', `
          <h1>Two-Factor Authentication Active</h1>
          <p>Hello ${name},</p>
          <p>Two-factor authentication (SMS / OTP) was successfully enabled on your account (${data.email}) on ${new Date().toUTCString()}.</p>
        `, appUrl),
        text: `2FA has been successfully enabled on your account ${data.email}.`
      };
    }

    case '2fa_disabled': {
      return {
        subject: `Security Warning: Two-Factor Authentication Disabled`,
        html: baseLayout('2FA Disabled', `
          <h1 style="color: #f87171;">Two-Factor Authentication Disabled</h1>
          <p>Hello ${name},</p>
          <p>Two-factor authentication was disabled on your account (${data.email}) on ${new Date().toUTCString()}.</p>
          <p>If you did not authorized this change, please reset your password immediately.</p>
        `, appUrl),
        text: `Two-factor authentication was disabled on your account ${data.email}.`
      };
    }

    case 'recovery_method_changed': {
      return {
        subject: `Security Alert: Account recovery method updated`,
        html: baseLayout('Recovery Method Updated', `
          <h1>Recovery Method Changed</h1>
          <p>Hello ${name},</p>
          <p>Your backup phone or secondary contact details were updated on ${new Date().toUTCString()}.</p>
        `, appUrl),
        text: `Your account recovery details were updated on ${new Date().toUTCString()}.`
      };
    }

    case 'api_key_created': {
      return {
        subject: `Security Notice: New API Key generated for ${tenantName}`,
        html: baseLayout('API Key Created', `
          <h1>API Key Created</h1>
          <p>Hello ${name},</p>
          <p>A new API key was generated for workspace <strong>${tenantName}</strong> with prefix <code>${data.keyPrefix || 'agt_live_...'}</code>.</p>
        `, appUrl),
        text: `New API key created for ${tenantName}: prefix ${data.keyPrefix}.`
      };
    }

    case 'api_key_revoked': {
      return {
        subject: `Security Notice: API Key Revoked for ${tenantName}`,
        html: baseLayout('API Key Revoked', `
          <h1>API Key Revoked</h1>
          <p>Hello ${name},</p>
          <p>An API key with prefix <code>${data.keyPrefix || 'agt_...'}</code> was revoked and can no longer access workspace endpoints.</p>
        `, appUrl),
        text: `API key revoked for ${tenantName}: prefix ${data.keyPrefix}.`
      };
    }

    case 'admin_credential_changed': {
      return {
        subject: `Security Alert: Platform Administrator Credential Changed`,
        html: baseLayout('Admin Credential Changed', `
          <h1 style="color: #fde047;">Platform Admin Credential Changed</h1>
          <p>Hello Administrator,</p>
          <p>The root Platform Administrator password or primary contact was modified on ${new Date().toUTCString()} from IP: ${data.ip || 'Unknown'}.</p>
        `, appUrl),
        text: `Platform Administrator credential was updated on ${new Date().toUTCString()} from IP ${data.ip}.`
      };
    }

    default: {
      return {
        subject: `Notification from AgentDesk: ${template}`,
        html: baseLayout('AgentDesk Notification', `
          <h1>AgentDesk Notification</h1>
          <p>Hello ${name},</p>
          <p>${data.message || 'You have a new update regarding your AgentDesk workspace.'}</p>
        `, appUrl),
        text: `Notification from AgentDesk: ${data.message || template}`
      };
    }
  }
}
