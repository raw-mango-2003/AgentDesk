export interface SiteDesignConfig {
  version: 1;
  site: {
    name: string;
    publicDomain: string;
    logoUrl: string;
  };
  site: {
    name: 'AgentDesk',
    publicDomain: '',
    logoUrl: ''
  },
  brand: {
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    backgroundColor: string;
    textColor: string;
  };
  typography: {
    headingFont: string;
    bodyFont: string;
    baseSize: number;
    headingWeight: number;
  };
  homepage: {
    heroHeadline: string;
    heroSubheadline: string;
    showPosterProcess: boolean;
    showBenefits: boolean;
    showIntegrations: boolean;
    showPricing: boolean;
    showFaq: boolean;
    sectionOrder: string[];
  };
}

export const DEFAULT_SITE_DESIGN: SiteDesignConfig = {
  version: 1,
  brand: {
    primaryColor: '#2563EB',
    secondaryColor: '#0F172A',
    accentColor: '#7C3AED',
    backgroundColor: '#020617',
    textColor: '#F8FAFC'
  },
  typography: {
    headingFont: 'Inter',
    bodyFont: 'Inter',
    baseSize: 16,
    headingWeight: 700
  },
  homepage: {
    heroHeadline: 'Your AI employee for the moments that matter.',
    heroSubheadline: 'Respond, qualify, follow up and hand off customer conversations without adding another full-time employee.',
    showPosterProcess: false,
    showBenefits: true,
    showIntegrations: true,
    showPricing: true,
    showFaq: true,
    sectionOrder: ['hero', 'benefits', 'integrations', 'pricing', 'faq']
  }
};
