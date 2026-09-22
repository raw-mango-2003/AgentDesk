import React from 'react';

type LegalDocumentId = 'terms' | 'privacy' | 'refunds' | 'acceptable-use' | 'cookies';

type LegalSection = {
  title: string;
  paragraphs?: string[];
  bullets?: string[];
};

type LegalDocument = {
  title: string;
  description: string;
  sections: LegalSection[];
};

const EFFECTIVE_DATE = 'September 23, 2026';

const documents: Record<LegalDocumentId, LegalDocument> = {
  terms: {
    title: 'Terms of Use',
    description: 'The terms that govern access to and use of AgentDesk, including subscriptions, AI features, integrations, billing and account responsibilities.',
    sections: [
      {
        title: '1. Agreement and service',
        paragraphs: [
          'These Terms of Use govern your access to AgentDesk, an AI customer operations platform operated under the AgentDesk Technologies name. By creating an account, purchasing a plan, accessing the platform, or using an AgentDesk widget or service, you agree to these Terms and any order form or service-specific terms that expressly apply to your subscription.',
          'AgentDesk provides software and managed AI operations for customer conversations, lead capture, qualification, follow-up, CRM workflows, appointments, knowledge management, integrations, billing and related operational functions. Some capabilities depend on configuration, plan limits, third-party providers or availability.'
        ]
      },
      {
        title: '2. Accounts and eligibility',
        paragraphs: [
          'You must provide accurate account and billing information and keep it current. You are responsible for protecting your credentials and for activity performed through your account. Accounts may be subject to email verification, role-based access, session controls, password requirements and two-factor authentication.',
          'You must not create an account for an organization you are not authorized to represent. Business administrators are responsible for ensuring that their users are authorized to access the relevant tenant workspace.'
        ]
      },
      {
        title: '3. AI services and customer responsibility',
        paragraphs: [
          'AgentDesk uses automated systems, including deterministic workflows and configured AI providers, to generate responses, classify conversations, retrieve knowledge and assist with operational tasks. AI output can be incomplete, inaccurate or inappropriate for a particular situation.',
          'You are responsible for reviewing and supervising AI-generated communications and for deciding when a human should take over. AgentDesk is not a substitute for professional legal, medical, financial, safety or other regulated advice. You must not configure the service to make high-impact decisions about people without appropriate human review and lawful safeguards.'
        ]
      },
      {
        title: '4. Your content and customer data',
        paragraphs: [
          'You retain responsibility for the information, documents, knowledge, customer records, messages and other content that you submit to AgentDesk. You represent that you have the rights and permissions necessary for AgentDesk to process that content to provide the service.',
          'You are responsible for configuring public widgets, messaging channels, recordings, notifications and integrations in compliance with applicable law and the permissions of the people whose information is processed.'
        ]
      },
      {
        title: '5. Plans, fees and billing',
        paragraphs: [
          'AgentDesk may charge a one-time implementation or setup fee and a recurring platform and managed AI operations fee. The applicable plan, currency, setup fee, recurring fee, taxes, discounts and payment terms are the amounts shown at checkout or in your applicable order form.',
          'Prices and usage limits are server-authoritative. You authorize AgentDesk and its payment provider to process charges you have agreed to. Additional usage or provider charges apply only where your plan, order form or applicable service configuration expressly permits them.'
        ]
      },
      {
        title: '6. Cancellation and refunds',
        paragraphs: [
          'Cancellation and refund rights are governed by the Refund & Cancellation Policy displayed on this website and by any more specific written order or service agreement. Mandatory rights under applicable law are not excluded by this section.'
        ]
      },
      {
        title: '7. Third-party services',
        paragraphs: [
          'AgentDesk can connect to third-party services such as payment providers, Google services, email delivery, SMS, WhatsApp, CRM and AI providers. Your use of those services may also be subject to the third party’s terms and privacy practices. AgentDesk does not control third-party availability or policies.'
        ]
      },
      {
        title: '8. Acceptable use',
        paragraphs: [
          'You must use AgentDesk lawfully and in accordance with the Acceptable Use Policy. You must not attempt to bypass security controls, quotas, tenant isolation, payment verification, access controls or provider restrictions.'
        ]
      },
      {
        title: '9. Intellectual property',
        paragraphs: [
          'AgentDesk and its software, interfaces, documentation, branding and underlying technology are owned by or licensed to AgentDesk Technologies and are protected by applicable intellectual property laws. These Terms grant you a limited, non-exclusive, non-transferable right to use the service during your subscription.',
          'You retain rights in your submitted content. You grant AgentDesk the limited rights needed to host, process, transmit, secure and otherwise operate on that content solely to provide and improve the service as described in the Privacy Policy and your agreement.'
        ]
      },
      {
        title: '10. Security and availability',
        paragraphs: [
          'AgentDesk uses security controls including authenticated sessions, role-based authorization, tenant isolation, CSRF protection, rate limiting, encrypted integration credentials and server-side payment verification. No online service can guarantee absolute security or uninterrupted availability.',
          'We may suspend or restrict access when reasonably necessary to protect the service, users, third parties or the security of the platform, including in response to abuse, suspected compromise, non-payment or unlawful activity.'
        ]
      },
      {
        title: '11. Disclaimers and limitation of liability',
        paragraphs: [
          'To the maximum extent permitted by applicable law, the service is provided on an as-available basis and AgentDesk does not warrant that every AI response, integration, automation or workflow will be uninterrupted, error-free or suitable for every purpose.',
          'Nothing in these Terms excludes or limits liability that cannot lawfully be excluded or limited. Any remaining limitation of liability should be interpreted subject to mandatory consumer and other applicable legal protections.'
        ]
      },
      {
        title: '12. Changes and termination',
        paragraphs: [
          'We may update these Terms when the service, law or business operations materially change. The updated version will be posted with a new effective date. Continued use after an update becomes effective constitutes acceptance to the extent permitted by law.',
          'We may terminate or suspend an account for material breach, unlawful use, abuse, security risk or non-payment, subject to applicable law and any contractual notice or cure rights.'
        ]
      },
      {
        title: '13. Contact and governing terms',
        paragraphs: [
          'For legal or account requests, use the support or contact channel provided in your AgentDesk account, order confirmation or service agreement. Where a signed order form or service agreement contains specific governing-law, dispute, service-level or commercial terms, those terms control to the extent of a conflict.'
        ]
      }
    ]
  },
  privacy: {
    title: 'Privacy Policy',
    description: 'How AgentDesk collects, uses, protects and discloses personal information handled through the website, accounts and AI customer-operations platform.',
    sections: [
      {
        title: '1. Scope',
        paragraphs: [
          'This Privacy Policy describes how AgentDesk Technologies handles personal information in connection with the AgentDesk website, account system, customer workspaces, public AI widgets, billing, integrations and related services.',
          'AgentDesk is designed as a multi-tenant platform. Tenant data is intended to remain isolated by authenticated tenant context and role-based access controls.'
        ]
      },
      {
        title: '2. Information we may process',
        bullets: [
          'Account information such as name, email address, phone number, organization details, credentials and verification status.',
          'Billing information such as plan, currency, invoices, payment status, transaction identifiers and tax information supplied during checkout. Payment card details are handled by the applicable payment provider rather than stored by AgentDesk as raw card data.',
          'Customer-operation data such as conversations, leads, contact records, appointments, knowledge items, CRM records, follow-up activity and AI usage.',
          'Integration data and credentials required to connect services you choose, including OAuth state, provider identifiers and encrypted credentials.',
          'Security and operational data such as session information, audit events, delivery logs, error telemetry and request metadata.',
          'Information you voluntarily submit through forms, support requests, demos, widgets and other interactions.'
        ]
      },
      {
        title: '3. How we use information',
        bullets: [
          'Provide, authenticate, secure and maintain AgentDesk.',
          'Operate AI conversations, knowledge retrieval, lead capture and configured automations.',
          'Process subscriptions, payments, invoices, provisioning and usage limits.',
          'Connect and synchronize third-party integrations requested by the customer.',
          'Detect abuse, protect tenant isolation, troubleshoot failures and maintain auditability.',
          'Communicate about accounts, transactions, service changes and support requests.',
          'Comply with applicable legal obligations and enforce contractual rights.'
        ]
      },
      {
        title: '4. AI and customer content',
        paragraphs: [
          'AgentDesk may process customer-provided knowledge and conversation content to generate or validate responses and operate configured workflows. Depending on your configuration, selected content may be transmitted to an AI provider or another connected service.',
          'AgentDesk should not be used as the sole decision-maker for high-impact decisions involving legal rights, employment, credit, housing, healthcare or other regulated matters. Customers are responsible for appropriate human oversight and lawful configuration.'
        ]
      },
      {
        title: '5. Cookies and similar technologies',
        paragraphs: [
          'AgentDesk uses necessary browser storage and cookies to support authentication, CSRF protection, security, preferences and reliable operation. Optional analytics or marketing technologies, if enabled for a particular deployment, should be disclosed and managed in accordance with applicable requirements. See the Cookie Policy for additional detail.'
        ]
      },
      {
        title: '6. Sharing and service providers',
        paragraphs: [
          'We may disclose information to service providers that help operate AgentDesk, such as hosting and database providers, payment processors, AI providers, email and messaging providers, CRM providers, security and monitoring providers, and other integrations selected by the customer.',
          'We may also disclose information when required by law, to protect rights or safety, to investigate abuse or security incidents, or as part of a corporate transaction, subject to applicable law.'
        ]
      },
      {
        title: '7. Security',
        paragraphs: [
          'The platform architecture includes signed sessions, HttpOnly cookies, CSRF controls, role and tenant authorization, encrypted integration credentials, server-side payment verification, audit logging and production PostgreSQL persistence. Security controls reduce risk but cannot eliminate every security threat.'
        ]
      },
      {
        title: '8. Retention',
        paragraphs: [
          'We retain information for as long as reasonably necessary to provide the service, maintain security and records, meet contractual requirements, resolve disputes and comply with applicable law. Specific retention periods may depend on the data type, customer configuration and legal requirements.'
        ]
      },
      {
        title: '9. Your rights',
        paragraphs: [
          'Depending on your location and applicable law, you may have rights to access, correct, delete, restrict or object to certain processing, obtain a copy of certain information, withdraw consent where processing is based on consent, and raise a complaint with the relevant authority.',
          'Business customers may also have contractual responsibilities to respond to requests from people whose data they control. AgentDesk can provide reasonable assistance where required by the applicable agreement.'
        ]
      },
      {
        title: '10. International processing',
        paragraphs: [
          'AgentDesk may process information in countries other than the country where you or your customers are located, including through selected cloud, AI, payment and integration providers. Appropriate contractual or other safeguards should be used where required by applicable law.'
        ]
      },
      {
        title: '11. Children',
        paragraphs: [
          'AgentDesk is a business operations service and is not intended for children to create accounts or use the service independently. Customers must not use AgentDesk to knowingly collect children’s personal information in violation of applicable law.'
        ]
      },
      {
        title: '12. Updates and contact',
        paragraphs: [
          'We may update this Privacy Policy when our processing practices, service or legal obligations change. For privacy requests, use the support or contact channel provided in your AgentDesk account, order confirmation or service agreement.'
        ]
      }
    ]
  },
  refunds: {
    title: 'Refund & Cancellation Policy',
    description: 'The default commercial policy for AgentDesk setup fees, recurring subscriptions, cancellations, failed payments and eligible refunds.',
    sections: [
      {
        title: '1. Subscription cancellation',
        paragraphs: [
          'You may request cancellation through the account, billing or support channel available for your subscription. Unless a written order or applicable law requires otherwise, cancellation takes effect at the end of the current paid subscription period and stops the next recurring charge.'
        ]
      },
      {
        title: '2. Setup and implementation fees',
        paragraphs: [
          'AgentDesk may charge a one-time implementation or setup fee for business discovery, knowledge configuration, agent configuration, workflow setup, integration work and onboarding. Unless your order form states otherwise, setup fees are non-refundable once implementation work has begun because those services are performed specifically for your organization.'
        ]
      },
      {
        title: '3. Recurring subscription refunds',
        paragraphs: [
          'Recurring subscription charges are generally non-refundable after the billing period begins, except where a refund is required by applicable law, an applicable written agreement, a duplicate or unauthorized charge is confirmed, or AgentDesk agrees to a refund in a particular case.'
        ]
      },
      {
        title: '4. Service issues',
        paragraphs: [
          'If the service materially fails to provide a purchased feature or you are charged incorrectly, contact support promptly with your account and transaction details. We may investigate the issue and, where appropriate, provide a correction, service credit or refund consistent with the applicable agreement and law.'
        ]
      },
      {
        title: '5. Failed payments and suspension',
        paragraphs: [
          'If a recurring payment fails, AgentDesk may retry the payment, notify the account owner and restrict paid functionality after reasonable notice. Access may be restored after successful payment, subject to the subscription status and any applicable reinstatement conditions.'
        ]
      },
      {
        title: '6. Promotional or zero-value checkouts',
        paragraphs: [
          'Promotional checkouts are valid only when a server-authorized promotional code makes the order eligible. A zero-value checkout is not evidence that a paid fee has been permanently waived unless the promotion expressly states its duration and terms.'
        ]
      },
      {
        title: '7. Chargebacks',
        paragraphs: [
          'If you believe a charge is incorrect, contact AgentDesk before initiating a chargeback where reasonably possible so the issue can be investigated. This does not limit any rights you have under applicable payment or consumer-protection law.'
        ]
      },
      {
        title: '8. Mandatory rights',
        paragraphs: [
          'Nothing in this policy removes or restricts a refund, cancellation or other consumer right that cannot lawfully be waived. Where a signed service agreement contains a different commercial policy, that agreement controls.'
        ]
      },
      {
        title: '9. Contact',
        paragraphs: [
          'For a refund or cancellation request, use the support or contact channel provided in your AgentDesk account, order confirmation or service agreement and include the organization name, account email, transaction reference and reason for the request.'
        ]
      }
    ]
  },
  'acceptable-use': {
    title: 'Acceptable Use Policy',
    description: 'Rules for safe, lawful and responsible use of AgentDesk AI, messaging, voice, CRM, automation and integration capabilities.',
    sections: [
      {
        title: '1. Lawful use',
        paragraphs: [
          'You may use AgentDesk only for lawful business purposes and in compliance with applicable privacy, consumer-protection, communications, intellectual-property, marketing and sector-specific requirements.'
        ]
      },
      {
        title: '2. Prohibited conduct',
        bullets: [
          'Fraud, phishing, impersonation, scams or deceptive customer communications.',
          'Spam, unlawful bulk messaging, abusive calling, unlawful robocalling or communications sent without required permissions.',
          'Unauthorized access, credential theft, malware, exploitation, denial-of-service activity or attempts to bypass security controls.',
          'Circumventing tenant isolation, usage quotas, plan restrictions, payment verification or provider safeguards.',
          'Uploading content that unlawfully infringes intellectual property, privacy or other rights.',
          'Using AI outputs as the sole basis for high-impact decisions where applicable law requires human review or other safeguards.',
          'Using AgentDesk to generate or distribute unlawful, threatening, discriminatory or abusive content.',
          'Using integrations to access data or accounts without the required authorization.'
        ]
      },
      {
        title: '3. Messaging and voice responsibility',
        paragraphs: [
          'If you use SMS, WhatsApp, email or voice capabilities, you are responsible for obtaining required consent, identifying the sender where required, honoring opt-outs and complying with applicable carrier, platform and communications rules. AgentDesk may restrict traffic that presents an abuse or compliance risk.'
        ]
      },
      {
        title: '4. Customer data',
        paragraphs: [
          'You must have an appropriate legal basis and necessary permissions to submit customer information, recordings, transcripts, contact details, documents and other personal information to AgentDesk. Do not upload data you are not authorized to process.'
        ]
      },
      {
        title: '5. AI safeguards',
        paragraphs: [
          'Do not configure AgentDesk to present AI-generated content as verified human advice when it has not been reviewed. Where a workflow could materially affect a person, configure an appropriate human escalation path and validate the underlying knowledge.'
        ]
      },
      {
        title: '6. Enforcement',
        paragraphs: [
          'AgentDesk may investigate suspected abuse and may throttle, suspend or terminate access when reasonably necessary to protect the service, users, providers or the public, subject to applicable law and contractual rights.'
        ]
      }
    ]
  },
  cookies: {
    title: 'Cookie Policy',
    description: 'How AgentDesk uses cookies and browser storage to keep accounts secure and the application functional.',
    sections: [
      {
        title: '1. What cookies do',
        paragraphs: [
          'Cookies and similar browser technologies allow a website to remember a browser, maintain a secure session and support functionality across requests. AgentDesk uses these technologies primarily for security and application operation.'
        ]
      },
      {
        title: '2. Necessary cookies and storage',
        bullets: [
          'Authentication session cookies used to maintain a signed account session.',
          'CSRF protection cookies used together with the CSRF request header for protected state-changing operations.',
          'Short-lived browser or session storage used to preserve checkout form progress and user-selected preferences during an active session.',
          'Security and reliability technologies required to detect abuse and keep the service functioning.'
        ]
      },
      {
        title: '3. Optional technologies',
        paragraphs: [
          'If optional analytics, advertising or similar technologies are enabled in a particular AgentDesk deployment, the applicable notice and consent controls will be provided where required. Third-party integrations may also set their own cookies when you interact with their services.'
        ]
      },
      {
        title: '4. Managing cookies',
        paragraphs: [
          'You can control or delete cookies through your browser settings. Blocking necessary cookies may prevent login, secure account actions or other parts of AgentDesk from working correctly.'
        ]
      },
      {
        title: '5. Updates',
        paragraphs: [
          'We may update this Cookie Policy when technologies or legal requirements change. The effective date at the top of this page identifies the current version.'
        ]
      }
    ]
  }
};

const order: LegalDocumentId[] = ['terms', 'privacy', 'refunds', 'acceptable-use', 'cookies'];

export const LegalPage: React.FC<{ documentId: LegalDocumentId; onBack?: () => void }> = ({ documentId, onBack }) => {
  const document = documents[documentId] || documents.terms;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <main className="max-w-5xl mx-auto px-4 sm:px-8 py-12 sm:py-16">
        <div className="mb-10">
          <button
            type="button"
            onClick={onBack}
            className="text-xs text-blue-400 hover:text-blue-300 underline underline-offset-4 mb-5 cursor-pointer"
          >
            Back to AgentDesk
          </button>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-2xl bg-blue-600/15 border border-blue-500/30 flex items-center justify-center">
              <span className="text-blue-300 font-black">A</span>
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-widest text-slate-500">AgentDesk Technologies</div>
              <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">{document.title}</h1>
            </div>
          </div>
          <p className="text-sm sm:text-base text-slate-400 leading-relaxed max-w-3xl">{document.description}</p>
          <div className="mt-4 text-[11px] text-slate-500">Effective date: {EFFECTIVE_DATE}</div>
        </div>

        <div className="grid lg:grid-cols-[220px_1fr] gap-8">
          <aside className="lg:sticky lg:top-6 lg:self-start rounded-2xl border border-slate-800 bg-slate-900/60 p-3">
            <div className="text-[10px] font-black uppercase tracking-widest text-slate-500 px-2 py-2">Legal</div>
            <nav className="space-y-1">
              {order.map(id => (
                <a
                  key={id}
                  href={`/${id === 'terms' ? 'terms' : id === 'privacy' ? 'privacy' : id === 'refunds' ? 'refund-policy' : id === 'acceptable-use' ? 'acceptable-use' : 'cookie-policy'}`}
                  className={`block px-2.5 py-2 rounded-lg text-xs font-semibold transition-colors ${
                    id === documentId ? 'bg-blue-600/15 text-blue-300 border border-blue-500/20' : 'text-slate-400 hover:text-white hover:bg-slate-800'
                  }`}
                >
                  {documents[id].title}
                </a>
              ))}
            </nav>
          </aside>

          <article className="space-y-8">
            {document.sections.map(section => (
              <section key={section.title} className="rounded-2xl border border-slate-800 bg-slate-900/45 p-5 sm:p-7">
                <h2 className="text-base sm:text-lg font-bold text-white">{section.title}</h2>
                {section.paragraphs?.map((paragraph, index) => (
                  <p key={index} className="mt-3 text-sm leading-7 text-slate-300">{paragraph}</p>
                ))}
                {section.bullets && (
                  <ul className="mt-3 space-y-2 list-disc pl-5 text-sm leading-7 text-slate-300">
                    {section.bullets.map((bullet, index) => <li key={index}>{bullet}</li>)}
                  </ul>
                )}
              </section>
            ))}
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-5 text-xs leading-6 text-slate-400">
              These policies are intended as website-ready business terms based on the current AgentDesk product and security architecture. They should be reviewed by qualified counsel for the jurisdictions in which AgentDesk operates before being treated as final legal advice or a substitute for a negotiated customer agreement.
            </div>
          </article>
        </div>
      </main>
    </div>
  );
};
